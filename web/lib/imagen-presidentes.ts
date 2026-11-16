// Datos de la imagen de compartir para las secciones de presidentes (Por presidente, Meses de mandato y Ranking). No dibuja: eso es `imagen.ts`.
// Usa los mismos cálculos que la página (statsMandato, claseVariacion, calcularMandato, rankingPresidentes) para que den lo mismo.
import {
  baseIdx, baseTxt, oracionInicio, calcularMandato, claseVariacion, crearPres, rankingPresidentes, statsMandato, nivelComparable, TITULOS_MANDATO, nombreCorto, varNum,
  type BaseCfg, type CritRk, type IndRk, type ModoMandato,
} from "./estadisticas";
import type { DatosImagen, FilaBarra, FilaGrillaImg, FilaMes, FilaRank, FilaVariable, FilaVela } from "./imagen";
import type { FormatoImg } from "./config";
import { fuenteLegible, fuentesTxt, limpiarComentario, notaInflacion, slug, tituloVariable } from "./imagen-datos";
import { fmtMes, lastIdx, ok, r1 } from "./formato";
import type { Expr, Motor } from "./motor";
import { fuentesCalc } from "./motor";
import { grupoDe } from "./catalogo";
import { datosDesde, variacionMostrada } from "./tablas";
import { BASE_HERENCIA, GRUPOS_HERENCIA, tablaHerencia } from "./herencia";
import { filasEstimaciones, filasInforme, type DatoInforme, type FilaInforme, type ReservasNetas } from "./herencia-informes";
import { mesesIguales } from "./ficha";
import { GRILLA_DATOS, grillaPresidentes } from "./presidentes";
import { datoFijoPorSlug } from "./datos-fijos";
import { idsHerencia } from "./herencia";
import { armarImagenElec, esVistaElec, type VistaElec } from "./imagen-elecciones";
import { armarImagenCtx, esVistaCtx, type VistaCtx } from "./imagen-contexto";

/** Lo que muestra una sección de presidentes y, por lo tanto, lo que lleva la imagen. Todo viene tal como está en pantalla. */
export type VistaPres =
  // presIds en el orden en que está la tabla. `metrica`: "prom" = promedio del mandato; "var" (o nada) = cierre − inicio (en p.p. si el dato es una tasa)
  | { tipo: "barras"; expr: Expr; presIds: string[]; base: BaseCfg; metrica?: "prom" | "var" }
  | { tipo: "velas"; expr: Expr; presIds: string[]; base: BaseCfg }                   // las mismas velas que la pantalla
  | { tipo: "variables"; presId: string; exprs: Expr[]; base: BaseCfg }
  // resaltados: ids de presidentes que la pantalla muestra con línea gruesa (los demás, atenuados); vacío o sin esto = todos iguales
  | { tipo: "mandato"; expr: Expr; modo: ModoMandato; presIds: string[]; anc: string | null; md: string | null; mh: string | null; valorFinal?: boolean; resaltados?: string[]; base: BaseCfg }
  | { tipo: "ranking"; crit: CritRk; inds: IndRk[]; usaVars: boolean; base: BaseCfg }
  | { tipo: "herencia"; presId: string; ids: string[]; base: BaseCfg; informes?: DatoInforme[]; rn?: ReservasNetas | null } // ids: series de la tabla que están en el catálogo (base fija T-1); informes: datos cargados a mano (fase 2)
  | { tipo: "grilla"; calor: boolean; base: BaseCfg }   // "Todos los presidentes, de un vistazo": una fila por presidente, una columna por dato clave
  | { tipo: "meses"; expr: Expr; desde: number; hasta: number }   // el mismo mes en cada año, de `desde` a `hasta` (años); no es de presidentes, pero se arma igual
  | VistaElec   // Elecciones (V7): llevan los números ya calculados por la página; ver imagen-elecciones.ts
  | VistaCtx;   // Contexto (precios contra el mundo): idem; ver imagen-contexto.ts
export interface OpcionesPres { formato: FormatoImg; comentario: string }

export const esVistaPres = (v: unknown): v is VistaPres => !!v && typeof v === "object" && "tipo" in v;
/** Ids de series que hay que tener cargadas para armar la imagen. */
export const idsDeVistaPres = (v: VistaPres): string[] =>
  esVistaElec(v) || esVistaCtx(v) ? []
  : v.tipo === "grilla" ? [...new Set(GRILLA_DATOS.flatMap((d) => { const f = datoFijoPorSlug(d.slug); return f ? (f.e.rel ? [f.e.id, f.e.rel] : [f.e.id]) : []; }))]
  : v.tipo === "barras" || v.tipo === "velas" || v.tipo === "mandato" || v.tipo === "meses" ? (v.expr.rel ? [v.expr.id, v.expr.rel] : [v.expr.id])
    : v.tipo === "variables" ? v.exprs.flatMap((e) => (e.rel ? [e.id, e.rel] : [e.id]))
      : v.tipo === "herencia" ? v.ids
      : v.inds.flatMap((i) => (i.ind.rel ? [i.ind.id, i.ind.rel] : [i.ind.id]));

const CRIT_NOMBRE: Record<CritRk, string> = {
  mejora: "Mejora (cuánto cambió cada indicador del inicio al cierre del mandato)",
  nivel: "Nivel promedio (el promedio de cada indicador durante el mandato)",
  ambos: "Ambos (el promedio de la mejora y del nivel promedio)",
};
const neutro = (texto: string) => ({ texto, cls: "neutro" as const });

/** Marca de datos parciales de un mandato: la serie empieza después del inicio, o termina antes del cierre de un mandato ya cerrado. */
function notaParcial(F: string[], st: ReturnType<typeof statsMandato>, bi: number, i1: number): string | null {
  const desde = st.iniI != null && st.iniI > bi, hasta = st.finI != null && st.finI < i1 - 2 && i1 !== F.length - 1;
  if (desde && hasta) return `datos de ${fmtMes(F[st.iniI as number])} a ${fmtMes(F[st.finI as number])}`;
  return desde ? `datos desde ${fmtMes(F[st.iniI as number])}` : hasta ? `datos hasta ${fmtMes(F[st.finI as number])}` : null;
}

function esqueleto(m: Motor, o: OpcionesPres, base: BaseCfg | null, titulo: string, ultimo: string): DatosImagen {
  return {
    formato: o.formato, titulo, cifra: null, frases: [], leyenda: null, x: [], series: [], fmtEje: (v) => String(v), fmtEje2: null, franjas: [], presidentes: null,
    inicioTxt: base ? oracionInicio(base) : null, comentario: limpiarComentario(o.comentario), unidad: "", fuente: "", nota: "",
    fecha: new Date().toLocaleDateString("es-AR"), archivo: `primerolosdatos-${slug(titulo)}-${ultimo.slice(0, 7)}`,
  };
}

/** Datos de la imagen. Null si faltan datos cargados o no hay nada que dibujar. */
export function armarImagenPres(m: Motor, v: VistaPres, o: OpcionesPres): DatosImagen | null {
  if (esVistaElec(v)) return armarImagenElec(v, o);
  if (esVistaCtx(v)) return armarImagenCtx(v, o);
  if (idsDeVistaPres(v).some((id) => !m.SER[id])) return null;
  if (v.tipo === "meses") return imagenMeses(m, v, o);
  if (v.tipo === "grilla") return imagenGrilla(m, v, o);
  const F = m.F, PRES = crearPres(F), b = v.base;

  if (v.tipo === "barras") {
    const c = m.calc(v.expr), titulo = tituloVariable(m, v.expr, c);
    const filas: FilaBarra[] = [], sin: string[] = [];
    v.presIds.forEach((id) => {
      const p = PRES.find((x) => x.id === id); if (!p) return;
      const st = statsMandato(F, c.v, p, b);
      if (!st.n || st.iniI === st.finI) { sin.push(p.n); return; }
      const ini = st.ini as number, fin = st.fin as number;
      const prom = v.metrica === "prom";   // promedio del mandato: sin color de mejora o empeora
      if (prom && !ok(st.prom)) { sin.push(p.n); return; }
      // cierre − inicio: en una tasa, la barra mide la diferencia de los valores como se muestran (la misma cuenta que el texto en p.p.)
      const dif = c.pct ? r1(r1(fin) - r1(ini)) : varNum(c, st);
      filas.push({
        id: p.id, nombre: p.n, valor: prom ? (st.prom as number) : dif, variacion: prom ? m.fmtC(c, st.prom as number) : variacionMostrada(m, c, ini, fin),
        cls: prom ? "neutro" : claseVariacion(c.dir, c.pct, ini, fin),
        ini: m.fmtC(c, ini), fin: m.fmtC(c, fin), nota: notaParcial(F, st, baseIdx(F, p, b), p.i1),
      });
    });
    if (!filas.length) return null;
    const d = esqueleto(m, o, b, titulo, F[lastIdx(c.v)] ?? F[F.length - 1]);
    // palabras neutras (D-012): el color se explica por lo que hizo el dato, según qué dirección es favorable para ese dato
    const color = !c.dir ? "Sin colores: para este dato no se califica si subir o bajar es favorable." : c.dir > 0 ? "Verde: subió; rojo: bajó." : "Verde: bajó; rojo: subió.";
    const cuenta = c.pct ? "Diferencia entre el valor del cierre y el del inicio de cada mandato, en puntos porcentuales." : "Del inicio al cierre de cada mandato.";
    d.frases = [neutro(v.metrica === "prom" ? "Promedio de todos los meses de cada mandato." : `${cuenta} ${color}`)];
    d.lienzo = {
      tipo: "barras", filas, sinDatos: sin,
      ...(v.metrica === "prom" ? { enc: { nombre: "Presidente", valor: "Promedio del mandato" } } : c.pct ? { enc: { nombre: "Presidente", valor: "Cierre − inicio (p.p.)" } } : {}),
    };
    d.unidad = c.unidad; d.fuente = "Fuente: " + fuentesCalc(c).map(fuenteLegible).join("; "); d.nota = notaInflacion([c], false);
    return d;
  }

  if (v.tipo === "velas") {
    // mismas reglas que la vista Velas de la pantalla: solo presidentes con datos y, en pesos corrientes, no hay escala común (no se dibuja)
    const c = m.calc(v.expr);
    if (!nivelComparable(m, v.expr)) return null;
    const titulo = tituloVariable(m, v.expr, c);
    const filas: FilaVela[] = [], sin: string[] = [];
    v.presIds.forEach((id) => {
      const p = PRES.find((x) => x.id === id); if (!p) return;
      const st = statsMandato(F, c.v, p, b);
      if (!st.n || st.ini == null || st.fin == null || st.min == null || st.max == null) { sin.push(p.n); return; }
      filas.push({
        id: p.id, nombre: p.n, periodo: `${fmtMes(F[st.iniI as number])} a ${fmtMes(F[st.finI as number])}`, ini: st.ini, fin: st.fin, min: st.min, max: st.max,
        iniTxt: m.fmtC(c, st.ini), finTxt: m.fmtC(c, st.fin), minTxt: m.fmtC(c, st.min), maxTxt: m.fmtC(c, st.max),
        variacion: varNum(c, st) == null ? "–" : variacionMostrada(m, c, st.ini, st.fin).replace(/^-/, "−"), cls: claseVariacion(c.dir, c.pct, st.ini, st.fin), nota: datosDesde(F, c.v, p),
      });
    });
    if (!filas.length) return null;
    const d = esqueleto(m, o, b, titulo, F[lastIdx(c.v)] ?? F[F.length - 1]);
    const color = !c.dir ? "Sin colores: para este dato no se califica si subir o bajar es favorable." : c.dir > 0 ? "Verde: subió; rojo: bajó." : "Verde: bajó; rojo: subió.";
    d.frases = [neutro(`Una vela por mandato: la línea fina va del mínimo al máximo; el cuerpo, del valor de inicio al de cierre. ${color} Misma escala para todos (${m.fmtC(c, Math.min(...filas.map((f) => f.min)))} a ${m.fmtC(c, Math.max(...filas.map((f) => f.max)))}).`)];
    d.lienzo = { tipo: "velas", filas, sinDatos: sin };
    d.unidad = c.unidad; d.fuente = "Fuente: " + fuentesCalc(c).map(fuenteLegible).join("; "); d.nota = notaInflacion([c], false);
    return d;
  }

  if (v.tipo === "variables") {
    const p = PRES.find((x) => x.id === v.presId);
    if (!p || !v.exprs.length) return null;
    const bi = baseIdx(F, p, b), calcs = v.exprs.map((e) => m.calc(e));
    const filas: FilaVariable[] = calcs.map((c): FilaVariable => {
      const st = statsMandato(F, c.v, p, b), sinDatos = !st.n || st.iniI === st.finI;
      const nombre = c.corto, unidad = c.unidad;
      if (sinDatos) return { nombre, unidad, ini: null, fin: null, variacion: null, cls: "neutro", nota: null, spark: [] };
      const ini = st.ini as number, fin = st.fin as number, desde = ok(c.v[bi]) ? bi : (st.iniI as number);
      return {
        nombre, unidad, ini: m.fmtC(c, ini), fin: m.fmtC(c, fin), variacion: variacionMostrada(m, c, ini, fin), cls: claseVariacion(c.dir, c.pct, ini, fin),
        nota: notaParcial(F, st, bi, p.i1), spark: c.v.slice(desde, p.i1 + 1),
      };
    });
    // con un solo presidente se dice el mes exacto (no la oración general del inicio de mandato)
    const fin = Math.min(p.i1, F.length - 1);
    const d = esqueleto(m, o, b, `${p.n}: de ${fmtMes(F[bi])} (mes inicial) ${p.i1 < F.length - 1 ? `a ${fmtMes(F[fin])} (fin del mandato)` : "a hoy (último dato de cada variable)"}`, F[fin]);
    d.inicioTxt = null;
    d.frases = [neutro("Si los datos de una variable no cubren todo el período, la fila lo indica.")];
    d.lienzo = { tipo: "variables", filas, presId: p.id };
    d.unidad = "Valor al inicio y al cierre, y variación en % (en puntos si el dato ya es un porcentaje)";
    d.armado = true;   // R22: las variables las eligió quien comparte
    const f = fuentesTxt(calcs.flatMap(fuentesCalc));
    d.fuente = f.fuente; d.fuenteCorta = f.fuenteCorta; d.nota = notaInflacion(calcs, false);
    return d;
  }

  if (v.tipo === "herencia") return imagenHerencia(m, v, o);

  if (v.tipo === "mandato") {
    const PRES_T0 = PRES.filter((x) => m.idxDe(x.ini) > 0);
    const D = calcularMandato(m, PRES, PRES_T0, { expr: v.expr, modo: v.modo, banda: false, b, presIds: new Set(v.presIds), anc: v.anc, md: v.md, mh: v.mh });
    if (!D || !D.pres.length || !D.rows.length) return null;
    const titulo = `${D.c.corto}: ${TITULOS_MANDATO[D.modo]} por mes de mandato`;
    const d = esqueleto(m, o, b, titulo, F[lastIdx(D.c.v)] ?? F[F.length - 1]);
    // la explicación va en letra chica y en dos renglones como máximo: el eje y la unidad (pie) y, si es teórico, el valor de partida (junto a la fuente)
    const recorte = D.desde > 0 || D.hasta < D.maxMes ? ` (meses ${D.desde} a ${D.hasta})` : "";
    d.frases = [];
    d.x = D.rows.map((r) => r.t as number);
    const res = new Set((v.resaltados ?? []).filter((id) => D.pres.some((x) => x.id === id)));   // ninguno elegido = todos iguales
    d.series = D.pres.map((x) => {
      // con la opción, cada línea lleva el valor del último mes visible de ese presidente (el último con dato)
      let ult: number | null = null;
      for (let i = D.rows.length - 1; i >= 0 && ult == null; i--) { const y = D.rows[i][x.id]; if (ok(y)) ult = y as number; }
      return {
        nombre: x.n, color: 0, axis: 0 as const, presId: x.id, ...(res.size ? { resalte: res.has(x.id) ? "fuerte" as const : "tenue" as const } : {}), etiqueta: v.valorFinal && ult != null ? `${nombreCorto(x.n)} ${D.fmtTip(ult)}` : x.n,
        trazo: D.teo ? "largo" as const : x.dash ? "corto" as const : "continuo" as const,
        v: D.rows.map((r) => (ok(r[x.id]) ? (r[x.id] as number) : null)),
      };
    });
    d.fmtEje = D.fmtAxis; d.ejeX = "mes"; d.log = D.usarLog; d.refLinea = D.ref; d.armado = true;
    const unidadDato = D.modo === "var" && !D.c.pct ? "variación en %, desde el mes 0" : D.c.unidad;
    d.unidad = `Eje horizontal: meses desde el inicio de cada mandato${recorte} · ${unidadDato}`;
    d.fuente = "Fuente: " + fuentesCalc(D.c).map(fuenteLegible).join("; ");
    d.nota = [D.teo ? `Punteadas: mismo punto de partida, desde ${m.fmtC(D.c, D.ancla)} (${D.ancTxt}).` : "", notaInflacion([D.c], false)].filter(Boolean).join(" ");
    return d;
  }

  // ranking
  const res = rankingPresidentes(m, F, PRES, v.inds, v.crit, b);
  if (!res.filas.length) return null;
  const d = esqueleto(m, o, b, "Ranking de presidentes", F[F.length - 1]);
  const nombres = v.inds.map((i) => i.nombre), n = v.inds.length;
  const grupos = [...new Set(v.inds.map((i) => i.grupo))];
  const gruposVars = [...new Set(v.inds.map((i) => grupoDe(m.SER[i.ind.id])))];
  const incluye = v.usaVars ? (n > 6 ? `${n} variables de ${gruposVars.length} ${gruposVars.length === 1 ? "grupo" : "grupos"}: ${gruposVars.join(", ")}` : `${n} ${n === 1 ? "variable" : "variables"}: ${nombres.join(", ")}`) : `${grupos.length} ${grupos.length === 1 ? "grupo" : "grupos"}: ${grupos.join(", ")}`;
  d.frases = [neutro(`Criterio: ${CRIT_NOMBRE[v.crit]}.`), neutro(`Incluye ${incluye}.`), neutro("Puntaje armado con los indicadores elegidos por quien comparte.")];
  // el mismo aviso que muestra la página
  d.frases.push(neutro(`Menem, De la Rúa y Duhalde se evalúan con pocos indicadores (muchos datos empiezan en 2003, 2012 o 2016); Milei, con un mandato en curso; el contexto internacional y la herencia de cada uno no entran en el número.${res.incompletas && v.usaVars ? " Algunas variables no tienen datos para todos los presidentes." : ""}`));
  const filas: FilaRank[] = res.filas.map((f, k) => ({ puesto: k + 1, id: f.p.id, nombre: f.p.n, score: f.score as number, indicadores: f.items.length }));
  d.lienzo = { tipo: "ranking", filas, sinDatos: PRES.filter((p) => !res.filas.some((f) => f.p.id === p.id)).map((p) => p.n) };
  d.unidad = "Puntaje de 0 (el peor) a 100 (el mejor), por presidente";
  const f = fuentesTxt(res.filas.flatMap((fl) => fl.items.flatMap((i) => fuentesCalc(i.c))));
  d.fuente = f.fuente; d.fuenteCorta = f.fuenteCorta;
  d.armado = true;   // R22: el ranking depende de los criterios y variables que eligió quien comparte
  return d;
}


/** "Todos los presidentes, de un vistazo" (pedido 12): la grilla de la pantalla (`grillaPresidentes`, la misma función) como imagen.
 *  Cada celda lleva el tono (verde o rojo) y la intensidad `calor` de 0 a 1, como `fondoCalor` de la pantalla. */
function imagenGrilla(m: Motor, v: Extract<VistaPres, { tipo: "grilla" }>, o: OpcionesPres): DatosImagen | null {
  const g = grillaPresidentes(m, v.base, m.SER);
  if (!g.filas.length || !g.columnas.length) return null;
  const filas: FilaGrillaImg[] = g.filas.map((f) => ({
    id: f.pres.id, nombre: f.pres.corto, periodo: f.periodo,
    celdas: f.celdas.map((c) => ({
      texto: c.texto + (c.desde ? "*" : ""), cls: c.tono ?? "neutro",
      calor: c.calor ?? 0,
    })),
  }));
  const titulo = "Todos los presidentes, de un vistazo";
  const d = esqueleto(m, o, v.base, titulo, m.F[m.F.length - 1]);
  const notas = g.columnas.flatMap((col, j) => {
    const anios = g.filas.map((f) => f.celdas[j].desde).filter((a): a is string => !!a);
    return anios.length ? [`${col.nombre}: datos desde ${anios.reduce((a, b) => (a < b ? a : b))}`] : [];
  });
  d.frases = [neutro(v.calor
    ? "Cómo cambió cada dato en cada mandato. Más intenso: más lejos del medio entre los presidentes; verde: subió o bajó en el sentido favorable para ese dato; rojo: en el contrario."
    : "Cómo cambió cada dato en cada mandato. Verde: cambió en el sentido favorable para ese dato; rojo: en el contrario. Inflación: verde si quedó por debajo de la mediana de los presidentes.")];
  d.lienzo = { tipo: "grilla", columnas: g.columnas.map((c) => ({ nombre: c.nombre, metrica: c.metrica })), filas, calor: v.calor };
  d.unidad = `Cambio de cada dato en el mandato${notas.length ? ` · * ${notas.join(" · ")}` : ""}`;
  const fuentes = g.columnas.flatMap((c) => { const f = datoFijoPorSlug(c.slug); return f && m.SER[f.e.id] ? [m.SER[f.e.id].fuente] : []; });
  const fu = fuentesTxt(fuentes);
  d.fuente = fu.fuente; d.fuenteCorta = fu.fuenteCorta;
  return d;
}

/** "¿Cómo fue <mes> en otros años?" (pedido 13): las columnas del mismo mes en cada año entre `desde` y `hasta`, con la frase de la ficha.
 *  Los datos salen de `mesesIguales` (lib/ficha.ts), los mismos de la página. */
function imagenMeses(m: Motor, v: Extract<VistaPres, { tipo: "meses" }>, o: OpcionesPres): DatosImagen | null {
  const r = mesesIguales(m, v.expr, { desde: v.desde, hasta: v.hasta });
  if (!r || !r.filas.length) return null;
  const c = m.calc(v.expr);
  const filas: FilaMes[] = r.filas.map((f) => ({ anio: f.anio, valor: f.valor, texto: f.texto, actual: f.actual, ref: f.ref }));
  if (!filas.some((f) => f.actual)) filas[filas.length - 1].actual = true;   // el último año elegido va destacado
  const ult = filas[filas.length - 1].anio;
  const titulo = `${tituloVariable(m, v.expr, c)}: ${r.mes} de cada año`;
  const d = esqueleto(m, o, null, titulo, ult);
  d.archivo = `primerolosdatos-${slug(titulo)}-${ult}`;
  d.frases = [neutro(r.frase)];
  d.lienzo = { tipo: "meses", filas };
  d.unidad = `${r.mes[0].toUpperCase()}${r.mes.slice(1)} de cada año, de ${filas[0].anio} a ${ult} · ${c.unidad}`;
  d.fuente = "Fuente: " + fuentesCalc(c).map(fuenteLegible).join("; "); d.nota = notaInflacion([c], false);
  return d;
}

/** Herencia de un presidente (docs/specs/herencia.md): el dibujo de "un presidente, varias variables" con los rótulos Recibió y Entregó (u Hoy).
 *  Los valores, meses y cambios salen de `tablaHerencia`, los mismos de la página. Las filas sin ningún dato no van. */
function imagenHerencia(m: Motor, v: Extract<VistaPres, { tipo: "herencia" }>, o: OpcionesPres): DatosImagen | null {
  const t = tablaHerencia(m, v.presId);
  if (!t) return null;
  const conDato = t.filas.filter((f) => f.c && (f.recibio || f.entrego));
  if (!conDato.length) return null;
  const F = m.F, p = t.pres;
  const filasSerie = conDato.map((f): FilaVariable & { grupo: string } => {
    const c = f.c!, desde = f.recibio?.i ?? f.entrego!.i, hasta = f.entrego?.i ?? f.recibio!.i;
    // los meses de los datos van debajo del cambio (pueden ser de varios meses antes del traspaso en series trimestrales o semestrales)
    const corto = (t: string) => t.replace("la serie empieza en", "serie desde").replace("la serie termina en", "serie hasta");
    const nota = f.recibio && f.entrego ? `${f.recibio.mes} → ${f.entrego.mes}` : f.recibio ? `${f.recibio.mes} → sin dato (${corto(f.sinEntrego)})` : `sin dato (${corto(f.sinRecibio)}) → ${f.entrego!.mes}`;
    return {
      grupo: f.grupo, nombre: f.nombre, unidad: f.unidad, ini: f.recibio?.txt ?? "–", fin: f.entrego?.txt ?? "–", variacion: f.cambio, cls: f.cls, nota,
      spark: c.v.slice(desde, hasta + 1),
    };
  });
  // datos de informes (fase 2): sin recorrido (son dos datos sueltos) y con el mes de cada uno; sin color, como en la página
  const inf = filasInforme(v.informes ?? [], crearPres(m.F), t.k);
  // los datos de texto (cepo, acuerdo con el FMI) no entran en una columna de números: van como frases, completos
  const textos = inf.filter((f) => f.def.tipo === "texto").map((f) =>
    neutro(`${f.def.nombre}: recibió «${f.recibio?.txt ?? "sin dato"}»; ${t.enCurso ? "hoy" : "entregó"} «${f.entrego?.txt ?? "sin dato"}».`));
  const aFila = (f: FilaInforme, marca: string): FilaVariable & { grupo: string } => ({
    grupo: f.def.grupo, nombre: f.def.nombre, unidad: `${f.def.unidad} (${marca})`, ini: f.recibio?.txt ?? "–", fin: f.entrego?.txt ?? "–",
    variacion: f.cambio, cls: "neutro", nota: `${f.recibio?.mes ?? "sin dato"} → ${f.entrego?.mes ?? "sin dato"}`, spark: [],
  });
  const filasInf = inf.filter((f) => f.def.tipo !== "texto").map((f) => aFila(f, "dato de informe"));
  // estimaciones (fase 3): al final, con quién estima en la unidad
  const filasEst = filasEstimaciones(v.informes ?? [], v.rn ?? null, crearPres(m.F), t.k).map((f) => aFila(f, `estimación: ${f.def.quien}`));
  const filas: FilaVariable[] = [...GRUPOS_HERENCIA.flatMap((g) => [...filasSerie, ...filasInf].filter((x) => x.grupo === g)), ...filasEst].map(({ grupo: _g, ...x }) => x);
  const fin = Math.min(p.i1, F.length - 1);
  const d = esqueleto(m, o, BASE_HERENCIA, `Herencia de ${p.n}: lo que recibió${t.mesT1 ? ` (${t.mesT1})` : ""} y ${t.enCurso ? "el último dato" : `lo que entregó (${fmtMes(F[fin])})`}`, F[fin]);
  d.inicioTxt = null;
  const sin = t.filas.length - conDato.length;
  d.frases = [neutro(`Recibió: último dato en o antes del mes anterior a asumir. ${t.enCurso ? "Hoy: último dato publicado" : "Entregó: último dato del mandato"}.${sin ? ` ${sin} ${sin === 1 ? "variable no tiene" : "variables no tienen"} datos para este período.` : ""}`), ...textos];
  d.lienzo = { tipo: "variables", filas, presId: p.id, enc: { ini: "Recibió", fin: t.enCurso ? "Hoy" : "Entregó", vr: "Cambio", sp: "Recorrido", sinDato: "sin dato" } };
  d.unidad = "Cambio en % (en puntos si el dato ya es un porcentaje). Debajo, los meses de los dos datos";
  const calcs = conDato.map((f) => f.c!);
  const fu = fuentesTxt([...calcs.flatMap(fuentesCalc), ...new Set(inf.flatMap((f) => [f.recibio, f.entrego]).flatMap((x) => (x ? [`${x.dato.organismo} (informes)`] : [])))]);
  d.fuente = fu.fuente; d.fuenteCorta = fu.fuenteCorta; d.nota = notaInflacion(calcs, false);
  // R22: con variables elegidas (la lista no es la completa de la herencia) la imagen lo dice
  d.armado = idsHerencia().filter((id) => !!m.SER[id]).some((id) => !v.ids.includes(id));
  return d;
}
