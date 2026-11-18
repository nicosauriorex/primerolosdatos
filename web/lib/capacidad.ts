// Capacidad de gobierno (bloque 6d): bancas propias y aliadas, leyes del Ejecutivo, DNU y vetos por presidente.
// Una sola fuente de verdad para la sección de Presidentes, el recuadro del mandato y las plantillas.
// Los datos vienen de capacidad.json (cargados a mano en datos/manual/, D-009). No se aplica la configuración de inicio (T±N): un DNU es de quien lo firmó.
import { PRES_DEF } from "./estadisticas";
import { fmtMes, nf0, nf1, ok, r1 } from "./formato";
import type { DatosImagen, FilaBarra } from "./imagen";
import type { FormatoImg } from "./config";

export type Camara = "dip" | "sen";
export interface Banca { fecha: string; camara: Camara; pres: string; propios: number; aliados: number; total: number; nota?: string }
export interface Bloque { b: string; n: number; rol: "propio" | "aliado" | "otro" }
export interface DatosCap {
  bancas: Banca[];
  bloques: Record<string, Bloque[]>;                                  // "AAAA-MM-DD|cam" -> bloques del corte
  leyes: Record<string, { enviadas: number; aprobadas: number; aprox?: "enviadas" | "aprobadas" | "ambas"; nota?: string }>;   // aprox: cifras repartidas por días entre mandatos (se muestran con «≈»)
  dnu: Record<string, Record<string, number>>;                        // presidente -> año -> cantidad
  vetos: Record<string, Record<string, { t: number | null; p: number | null; i: number }>>;   // t y p null = sin fuente de totales: solo se conocen los insistidos
  ultima_carga: string | null;
  fuentes: Record<"bancas" | "leyes" | "dnu" | "vetos", string[]>;
  notas: Record<string, string>;
}
export type Indicador = "bancas" | "leyes" | "apoyo" | "dnu" | "vetos";
export const INDICADORES: [Indicador, string][] = [["bancas", "Bancas"], ["leyes", "Leyes"], ["apoyo", "Leyes por apoyo"], ["dnu", "DNU"], ["vetos", "Vetos"]];
export const CAMARAS: [Camara, string][] = [["dip", "Diputados"], ["sen", "Senado"]];

/** Meses "AAAA-MM" entre dos fechas (inclusive el primero, sin el último). */
const meses = (a: string, b: string) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));
/** Último mes con dato del mandato en curso (para "hasta <mes-año>"): lo da el motor (F). */
export interface Mandato { id: string; n: string; ini: string; fin: string | null; anios: number; enCurso: boolean }

/** Mandatos desde PRES_DEF. `ultimo` = último mes con datos ("AAAA-MM"); el mandato en curso se cuenta hasta ahí. */
export function mandatos(ultimo: string): Mandato[] {
  return PRES_DEF.map((p, k) => {
    const sig = PRES_DEF[k + 1];
    const fin = sig ? sig.ini : null;
    const dur = meses(p.ini, fin ?? ultimo) + (fin ? 0 : 1);
    return { id: p.id, n: p.n, ini: p.ini, fin, anios: Math.max(dur, 1) / 12, enCurso: !sig };
  });
}

const pct = (n: number, t: number) => (t > 0 ? (n / t) * 100 : null);
export const bancasDe = (d: DatosCap, pres: string, cam: Camara) => d.bancas.filter((b) => b.pres === pres && b.camara === cam);
export const pctOficialismo = (b: Banca) => pct(b.propios + b.aliados, b.total);
export const pctPropios = (b: Banca) => pct(b.propios, b.total);
export const pctAliados = (b: Banca) => pct(b.aliados, b.total);

export interface ResBancas { alEmpezar: number | null; fechaInicio: string | null; promedio: number | null; cortes: number }
/** % propios + aliados al empezar (corte de la asunción, el primero del mandato) y promedio de todos los cortes. */
export function resumenBancas(d: DatosCap, pres: string, cam: Camara): ResBancas {
  const bs = bancasDe(d, pres, cam);
  if (!bs.length) return { alEmpezar: null, fechaInicio: null, promedio: null, cortes: 0 };
  const ps = bs.map((b) => pctOficialismo(b) as number);
  return { alEmpezar: ps[0], fechaInicio: bs[0].fecha, promedio: ps.reduce((a, c) => a + c, 0) / ps.length, cortes: bs.length };
}

export interface ResLeyes { enviadas: number; aprobadas: number; pct: number | null; aprox?: "enviadas" | "aprobadas" | "ambas" }
/** Qué cifras de leyes son aproximadas: enviadas, aprobadas y el porcentaje (aproximado si cualquiera de las dos lo es). */
export const aproxLeyes = (l: Pick<ResLeyes, "aprox">) => ({ env: l.aprox === "enviadas" || l.aprox === "ambas", apr: l.aprox === "aprobadas" || l.aprox === "ambas", pct: !!l.aprox });
/** "≈389 de ≈627 (≈62 %)": «≈» delante de cada cifra aproximada. Con `sinPct` omite el porcentaje. */
export function textoLeyes(l: ResLeyes, sinPct = false): string {
  const a = aproxLeyes(l), s = (b: boolean) => (b ? "≈" : "");
  const base = `${s(a.apr)}${nf0.format(l.aprobadas)} de ${s(a.env)}${nf0.format(l.enviadas)}`;
  return sinPct || !ok(l.pct) ? base : `${base} (${s(a.pct)}${nf0.format(l.pct)} %)`;
}
export function resumenLeyes(d: DatosCap, pres: string): ResLeyes | null {
  const l = d.leyes[pres];
  return l ? { ...l, pct: pct(l.aprobadas, l.enviadas) } : null;
}

export interface ResApoyo { pctLeyes: number; pctBancas: number; veces: number; aprox: boolean }
/** Leyes por apoyo: % de leyes del Ejecutivo aprobadas ÷ % de bancas propias y aliadas en Diputados (promedio del mandato).
 *  Las cuentas cierran: ambos porcentajes se redondean a enteros como se muestran y el cociente se redondea a un decimal. null = falta leyes o bancas. */
export function resumenApoyo(d: DatosCap, pres: string): ResApoyo | null {
  const l = resumenLeyes(d, pres), b = resumenBancas(d, pres, "dip");
  if (!l || !ok(l.pct) || !ok(b.promedio)) return null;
  const pctLeyes = Math.round(l.pct), pctBancas = Math.round(b.promedio);
  if (pctBancas <= 0) return null;
  return { pctLeyes, pctBancas, veces: r1(pctLeyes / pctBancas), aprox: !!l.aprox };
}

export interface ResDnu { total: number; porAnio: number | null; anios: number }
export function resumenDnu(d: DatosCap, pres: string, m: Mandato): ResDnu | null {
  const x = d.dnu[pres];
  if (!x) return null;
  const total = Object.values(x).reduce((a, c) => a + c, 0);
  return { total, porAnio: total / m.anios, anios: Object.keys(x).length };
}

export interface ResVetos { totales: number | null; parciales: number | null; total: number | null; insistidos: number; porAnio: number | null; insistidosPorAnio: number }
/** Totales y parciales solo si hay dato de todos los años cargados; los insistidos se muestran siempre. */
export function resumenVetos(d: DatosCap, pres: string, m: Mandato): ResVetos | null {
  const x = d.vetos[pres];
  if (!x) return null;
  const v = Object.values(x);
  const insistidos = v.reduce((a, c) => a + c.i, 0);
  const completo = v.every((c) => c.t != null && c.p != null);
  const totales = completo ? v.reduce((a, c) => a + (c.t as number), 0) : null, parciales = completo ? v.reduce((a, c) => a + (c.p as number), 0) : null;
  const total = totales != null && parciales != null ? totales + parciales : null;
  return { totales, parciales, total, insistidos, porAnio: total != null ? total / m.anios : null, insistidosPorAnio: insistidos / m.anios };
}

/** Valor que se dibuja en la barra del celular para cada indicador (null = sin dato). */
export function valorIndicador(d: DatosCap, pres: string, m: Mandato, ind: Indicador): { v: number; txt: string } | null {
  const nf = (x: number, dec = 0) => (dec ? nf1 : nf0).format(x);
  if (ind === "bancas") {
    const r = resumenBancas(d, pres, "dip");
    return ok(r.alEmpezar) ? { v: r.alEmpezar as number, txt: `${nf(r.alEmpezar as number)} %` } : null;
  }
  if (ind === "leyes") {
    const r = resumenLeyes(d, pres);
    return r && ok(r.pct) ? { v: r.pct as number, txt: textoLeyes(r) } : null;
  }
  if (ind === "apoyo") {
    const r = resumenApoyo(d, pres);
    return r ? { v: r.veces, txt: `${r.aprox ? "≈" : ""}${nf(r.veces, 1)} veces` } : null;
  }
  if (ind === "dnu") {
    const r = resumenDnu(d, pres, m);
    return r && ok(r.porAnio) ? { v: r.porAnio, txt: `${nf(r.total)} (${nf(r.porAnio, 1)} por año)` } : null;
  }
  const r = resumenVetos(d, pres, m);
  if (!r) return null;
  return ok(r.porAnio) ? { v: r.porAnio, txt: `${nf(r.total as number)} (${nf(r.porAnio, 1)} por año)` } : { v: r.insistidosPorAnio, txt: `${nf(r.insistidos)} insistidos (${nf(r.insistidosPorAnio, 1)} por año)` };
}

/** Línea del recuadro "Contexto del mandato"; null si no hay ningún dato del presidente. */
export function lineaContexto(d: DatosCap, pres: string, m: Mandato): string | null {
  const nf = (x: number) => nf0.format(x);
  const partes: string[] = [];
  const dip = resumenBancas(d, pres, "dip"), sen = resumenBancas(d, pres, "sen");
  if (ok(dip.alEmpezar) && ok(sen.alEmpezar)) partes.push(`${nf(dip.alEmpezar as number)} % de Diputados y ${nf(sen.alEmpezar as number)} % del Senado propios o aliados al empezar`);
  else if (ok(dip.alEmpezar)) partes.push(`${nf(dip.alEmpezar as number)} % de Diputados propios o aliados al empezar`);
  else if (ok(sen.alEmpezar)) partes.push(`${nf(sen.alEmpezar as number)} % del Senado propios o aliados al empezar`);
  const l = resumenLeyes(d, pres);
  if (l) partes.push(`${textoLeyes(l, true)} leyes del Ejecutivo aprobadas`);
  const n = resumenDnu(d, pres, m);
  if (n) partes.push(`${nf(n.total)} DNU`);
  const v = resumenVetos(d, pres, m);
  if (v) partes.push(v.total != null ? `${nf(v.total)} vetos` : `${nf(v.insistidos)} vetos insistidos por el Congreso`);
  return partes.length ? `En el Congreso: ${partes.join("; ")}.` : null;
}

export const hayDatos = (d: DatosCap, pres: string) =>
  d.bancas.some((b) => b.pres === pres) || !!d.leyes[pres] || !!d.dnu[pres] || !!d.vetos[pres];

/** Quórum = mitad más uno del total de la cámara, en porcentaje. */
export const quorumPct = (total: number) => (Math.floor(total / 2) + 1) / total * 100;

// ---- Qué indicadores tienen datos cargados (página de Congreso)
/** ¿Algún presidente tiene dato de este indicador? Los vetos con solo insistidos cuentan como dato. */
export const presConDato = (d: DatosCap, ind: Indicador, M: Mandato[]): Mandato[] => M.filter((m) => valorIndicador(d, m.id, m, ind) != null);
export const indicadorTieneDatos = (d: DatosCap, ind: Indicador, M: Mandato[]) => presConDato(d, ind, M).length > 0;
/** Primer indicador con datos cargados (si no hay ninguno, "bancas"). */
export const primerIndicadorConDatos = (d: DatosCap, M: Mandato[]): Indicador =>
  INDICADORES.map((x) => x[0]).find((i) => indicadorTieneDatos(d, i, M)) ?? "bancas";
/** "Qué hay cargado": una oración con los indicadores y presidentes que tienen datos. */
export function queHayCargado(d: DatosCap, M: Mandato[]): string {
  const nombres: Record<Indicador, string> = { bancas: "bancas", leyes: "leyes del Ejecutivo", apoyo: "leyes por apoyo", dnu: "DNU", vetos: "vetos" };
  const con: string[] = [], sin: string[] = [];
  INDICADORES.forEach(([i]) => {
    const ps = presConDato(d, i, M);
    if (!ps.length) { sin.push(nombres[i]); return; }
    const de = ps.length === M.length ? "todos los presidentes" : ps.length <= 4 ? ps.map((x) => x.n).join(", ") : `${ps.length} de ${M.length} presidentes`;
    const parcial = i === "vetos" && ps.some((x) => resumenVetos(d, x.id, x)?.total == null);
    con.push(`${i === "vetos" && parcial ? "vetos insistidos" : nombres[i]} (${de})`);
  });
  return `Hay cargado: ${con.length ? con.join("; ") : "nada todavía"}.${sin.length ? ` Todavía sin datos: ${sin.join(" y ")}.` : ""}`;
}

// ---- Frase-respuesta de la página de Congreso (spec 3.5, C1). Solo hechos (D-012); todo sale de los datos, con los valores redondeados que se muestran.
/** Mes anterior a "AAAA-MM" (el mandato termina el mes antes de que asuma el siguiente). */
const mesAnterior = (f: string) => { const a = +f.slice(0, 4), m = +f.slice(5, 7); return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`; };
/** "dic 2023 a hoy" o "may 2003 a may 2007". */
export const periodoMandato = (m: Mandato) => (m.enCurso ? `${fmtMes(m.ini)} a hoy` : `${fmtMes(m.ini)} a ${fmtMes(mesAnterior(m.fin as string))}`);

export interface FraseCap { titulo: string; cifra: string; unidad?: string; fecha: string; frase: string }
/** Puesto de `mio` entre `todos` de mayor a menor, con los valores ya redondeados como se muestran (los iguales comparten puesto). */
const puestoDe = (todos: number[], mio: number) => 1 + todos.filter((v) => v > mio).length;

/** Qué dice el indicador elegido del gobierno `pres`; null si no tiene dato. `M` = todos los mandatos (para ubicarlo entre los gobiernos con dato). */
export function fraseCapacidad(d: DatosCap, ind: Indicador, pres: Mandato, M: Mandato[]): FraseCap | null {
  const nf = (x: number) => nf0.format(x);
  const tiene = pres.enCurso ? "tiene" : "tuvo", firmo = pres.enCurso ? "firmó hasta hoy" : "firmó";
  const per = periodoMandato(pres);
  if (ind === "bancas") {
    const bd = bancasDe(d, pres.id, "dip"), bs = bancasDe(d, pres.id, "sen");
    const ld = bd[bd.length - 1], ls = bs[bs.length - 1];
    if (!ld && !ls) return null;
    const trozo = (b: Banca, cam: string) => `${nf(b.propios)} bancas propias de ${nf(b.total)} en ${cam} (${nf(Math.round(pctPropios(b) as number))} %)`;
    const partes: string[] = [];
    if (ld) partes.push(trozo(ld, "Diputados"));
    if (ls) partes.push(trozo(ls, "el Senado"));
    const ali: string[] = [];
    if (ld && ld.aliados > 0) ali.push(`${nf(Math.round(pctOficialismo(ld) as number))} % de Diputados`);
    if (ls && ls.aliados > 0) ali.push(`${nf(Math.round(pctOficialismo(ls) as number))} % del Senado`);
    const b0 = (ld ?? ls) as Banca;
    return {
      titulo: `Bancas propias${ld ? " en Diputados" : " en el Senado"}`, cifra: `${nf(Math.round(pctPropios(b0) as number))} %`, fecha: `corte de ${fmtMes(b0.fecha.slice(0, 7))}`,
      frase: `${pres.n} ${tiene} ${partes.join(" y ")}, en el último corte cargado.${ali.length ? ` Sumando las aliadas, ${ali.join(" y ")}.` : ""}`,
    };
  }
  if (ind === "leyes") {
    const l = resumenLeyes(d, pres.id);
    if (!l || !ok(l.pct)) return null;
    const todos = M.map((m) => resumenLeyes(d, m.id)?.pct).filter(ok).map((v) => Math.round(v));
    const k = puestoDe(todos, Math.round(l.pct));
    const a = aproxLeyes(l), s = (b: boolean) => (b ? "≈" : "");
    const mezcla = a.pct || M.some((m) => resumenLeyes(d, m.id)?.aprox);
    return {
      titulo: "Leyes del Ejecutivo aprobadas", cifra: `${s(a.pct)}${nf(Math.round(l.pct))} %`, fecha: per,
      frase: `${pres.n}: ${s(a.apr)}${nf(l.aprobadas)} de las ${s(a.env)}${nf(l.enviadas)} leyes que envió el Ejecutivo se aprobaron (${s(a.pct)}${nf(Math.round(l.pct))} %).${a.pct ? " Cifras aproximadas: los informes cuentan por período parlamentario y se repartieron por días entre mandatos." : ""} Entre los ${todos.length} gobiernos con dato, puesto ${k} de mayor a menor porcentaje${mezcla ? " (el orden mezcla cifras aproximadas)" : ""}.`,
    };
  }
  if (ind === "apoyo") {
    const a = resumenApoyo(d, pres.id);
    if (!a) return null;
    const todos = M.map((m) => resumenApoyo(d, m.id)?.veces).filter(ok);
    const k = puestoDe(todos, a.veces);
    const ap = (b: boolean) => (b ? "≈" : "");
    const mezcla = a.aprox || M.some((m) => resumenApoyo(d, m.id)?.aprox);
    return {
      titulo: "Leyes por apoyo", cifra: `${ap(a.aprox)}${nf1.format(a.veces)}`, unidad: "veces", fecha: per,
      frase: `${pres.n}: se aprobó el ${ap(a.aprox)}${nf(a.pctLeyes)} % de las leyes del Ejecutivo con un ${nf(a.pctBancas)} % de bancas propias y aliadas en Diputados (promedio del mandato), ${ap(a.aprox)}${nf1.format(a.veces)} veces.${a.aprox ? " Cifra aproximada: las leyes del Ejecutivo se repartieron por días entre mandatos." : ""} Entre los ${todos.length} gobiernos con dato, puesto ${k} de mayor a menor${mezcla ? " (el orden mezcla cifras aproximadas)" : ""}.`,
    };
  }
  if (ind === "dnu") {
    const n = resumenDnu(d, pres.id, pres);
    if (!n || !ok(n.porAnio)) return null;
    const todos = M.map((m) => resumenDnu(d, m.id, m)?.porAnio).filter(ok).map(r1);
    const k = puestoDe(todos, r1(n.porAnio));
    return {
      titulo: "DNU por año de mandato", cifra: nf1.format(n.porAnio), unidad: "DNU por año", fecha: per,
      frase: `${pres.n} ${firmo} ${nf(n.total)} DNU, ${nf1.format(n.porAnio)} por año. Entre los ${todos.length} gobiernos con dato, puesto ${k} de mayor a menor por año.`,
    };
  }
  const v = resumenVetos(d, pres.id, pres);
  if (!v) return null;
  const conTotal = v.total != null && ok(v.porAnio);
  const val = (x: ResVetos | null) => (x ? (conTotal ? (x.total != null ? x.porAnio : null) : (x.total == null ? x.insistidosPorAnio : null)) : null);
  const todos = M.map((m) => val(resumenVetos(d, m.id, m))).filter(ok).map(r1);
  const mio = r1((conTotal ? v.porAnio : v.insistidosPorAnio) as number);
  const k = puestoDe(todos, mio);
  const dif = `Entre los ${todos.length} gobiernos con este dato, puesto ${k} de mayor a menor por año.`;
  return conTotal ? {
    titulo: "Vetos por año de mandato", cifra: nf1.format(v.porAnio as number), unidad: "vetos por año", fecha: per,
    frase: `${pres.n} registra ${nf(v.total as number)} vetos, ${nf1.format(v.porAnio as number)} por año; el Congreso insistió en ${nf(v.insistidos)}. ${dif}`,
  } : {
    titulo: "Vetos insistidos por año de mandato", cifra: nf1.format(v.insistidosPorAnio), unidad: "vetos insistidos por año", fecha: per,
    frase: `${pres.n}: el Congreso insistió en ${nf(v.insistidos)} vetos, ${nf1.format(v.insistidosPorAnio)} por año (todavía falta cargar el total de vetos). ${dif}`,
  };
}

/** Imagen compartible de /congreso/: el indicador elegido, una fila por gobierno y en el mismo orden que la pantalla (los mismos valores y textos: no se recalcula nada).
 *  `columnas`: lo que ya armó la pantalla (id, nombre, valor, txt corto, texto completo). Sin ningún dato devuelve null (no hay imagen). */
export function armarImagenCongreso(
  o: { indicador: string; nota: string; linea?: { v: number; txt: string }; columnas: { id: string; nombre: string; valor: number | null; txt: string; texto: string }[]; fuente: string },
  formato: FormatoImg, hoy: Date = new Date(),
): DatosImagen | null {
  const con = o.columnas.filter((c) => c.valor != null);
  if (!con.length) return null;
  const filas: FilaBarra[] = con.map((c) => ({
    id: c.id, nombre: c.nombre, valor: Math.max(0, c.valor as number), variacion: c.txt, cls: "neutro", ini: null, fin: null, nota: null,
    detalle: c.texto !== c.txt ? c.texto : " ",
  }));
  const ref = o.linea ? ` Referencia: ${o.linea.v === 1 ? "1,0" : nf0.format(o.linea.v) + " %"} = ${o.linea.txt}.` : "";
  const titulo = `${o.indicador} por gobierno`;
  return {
    formato, titulo, temporalidad: "En orden cronológico, un gobierno por fila", cifra: null,
    frases: [{ texto: `${o.nota}${ref}`, cls: "neutro" }],
    leyenda: null, x: [], series: [], fmtEje: (x) => String(x), fmtEje2: null, franjas: [], inicioTxt: null,
    comentario: "", unidad: o.indicador, fuente: `Fuente: ${o.fuente}`, nota: "Números crudos, sin puntaje",
    fecha: hoy.toLocaleDateString("es-AR"),
    archivo: `primerolosdatos-congreso-${o.indicador.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    lienzo: { tipo: "barras", filas, sinDatos: o.columnas.filter((c) => c.valor == null).map((c) => c.nombre), enc: { nombre: "Gobierno", valor: o.indicador }, sinTope: true,
      ref: o.linea ? { v: o.linea.v, txt: `${o.linea.v === 1 ? "1,0" : nf0.format(o.linea.v) + " %"} = ${o.linea.txt}` } : undefined },
    marcaUltimo: false,
  };
}
