"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSeccion } from "../useSeccion";
import { useContexto } from "../useContexto";
import { Cargando, Seg, Selector, alternar } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { FilaChips } from "../sistema/FilaChips";
import { Hoja } from "../sistema/Hoja";
import { InfoPunto } from "../sistema/InfoPunto";
import { CompartirHoja } from "../sistema/CompartirHoja";
import { Grafico, type Fila, type OpcionesG, type SerieG } from "../Grafico";
import { useConfig } from "../ConfigProvider";
import { baseDeConfig } from "@/lib/config";
import { PALETA, vcolor } from "../util";
import { BotonCompartir } from "../PanelCompartir";
import { IconoCompartir } from "../Iconos";
import { armarImagenGrilla, type GrillaCtx, type VistaCtx } from "@/lib/imagen-contexto";
import { fuentesTxt } from "@/lib/imagen-datos";
import type { DatosImagen } from "@/lib/imagen";
import type { FormatoImg } from "@/lib/config";
import { PanelGasto } from "../PanelGasto";
import { CeldaPres, FilaAjuste, HojaListo, Valor } from "./comunes";
import { columnaComparable, periodoMandato } from "@/lib/tablas";
import { nf0, nf1, ok, r1 } from "@/lib/formato";
import { PRES_DEF, crearPres, franjasPres, nombreCorto, type Pres } from "@/lib/estadisticas";
import {
  ARG, COMPARAR, ESPERADO, GRUPOS_CMP, GRUPOS_EXTRA, MARCA_TXT, PAISES, VEC, VECINOS, VIENTOS,
  aniosDe, crecimientoIndice, filasEsperado, fraseComparar, fraseEsperado, fraseViento, hrefBloque, nombreEnt, presParaViento, promedioAnios, serieAnual, serieComparar, sorpresaPres, textoAnios, ultimoCerrado, vientosPres,
  type DatosContexto, type DefInd, type DefViento, type Marca,
} from "@/lib/contexto";
import { lista, unoDe, useParams } from "@/lib/url";
import { IDS_PM } from "@/lib/preciosMundo";
import { PreciosMundo } from "./PreciosMundo";
import { BarraResumen, Pildoras } from "./Ranking";

const f1 = (v: number | null | undefined) => (ok(v) ? nf1.format(v) : "—");
const signo = (v: number) => { const r = Math.round(v * 10) / 10; return (r > 0 ? "+" : r < 0 ? "−" : "") + nf1.format(Math.abs(r)); };
/** Resta de dos valores como se muestran (con un decimal): 1,94 y 2,06 se ven 1,9 y 2,1, y la diferencia que se informa es 0,2. */
const difMostrada = (a: number | null | undefined, b: number | null | undefined): number | null => (ok(a) && ok(b) ? r1(r1(a) - r1(b)) : null);
/** Sorpresa de un año = real - proyectado, con los dos valores tal como se muestran en la fila; si falta alguno, la que trae la fila. */
const sorpresaMostrada = (real: number | null | undefined, proy: number | null | undefined, original: number | null | undefined) => difMostrada(real, proy) ?? original;
const resaltar = (on: boolean) => (on ? { background: "color-mix(in srgb, var(--series-1) 14%, transparent)" } : undefined);
const tonoSig = (v: number | null | undefined, dir: number) => (ok(v) && dir && v * dir !== 0 ? (v * dir > 0 ? "bueno" : "malo") as "bueno" | "malo" : null);
const nDe = (p: { n: number; de: number }) => (p.n < p.de ? <small>{p.n} de {p.de} años</small> : null);

/** Link viejo de /contexto/ -> la subpestaña que corresponde (misma consulta), o null si se queda. Los links viejos eran un solo capítulo largo. */
function destinoViejo(hash: string, search: string): string | null {
  const h = hash.replace(/^#/, "");
  const q = new URLSearchParams(search);
  const hacia = (r: string) => `/contexto/${r}/${search}`;
  if (h === "comparar") return hacia("paises");
  if (h === "esperado") return hacia("esperado");
  if (h === "viento") return hacia("viento");
  if (h) return null;   // #precios-mundo, #pregunta y cualquier otra ancla se quedan en Precios
  if ([...q.keys()].some((k) => k.startsWith("pq") || k.startsWith("pm"))) return null;
  if (["cpd", "cpb", "cpp"].some((k) => q.has(k))) return hacia("paises");
  if (q.has("cg") || q.has("cd")) return hacia("esperado");
  if (q.has("cpr")) return hacia("paises");
  return null;
}

/** Un link con ancla va al bloque una vez que llegaron los datos (los bloques no existen antes). */
function useIrAlAncla(listo: boolean) {
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (listo && h) document.getElementById(h)?.scrollIntoView();
  }, [listo]);
}

function PieFMI({ datos }: { datos: DatosContexto }) {
  const hasta = ultimoCerrado(datos);
  return (
    <div className="ctx-pie">
      <details className="ctx-mas">
        <summary>Cómo se mide</summary>
        <p className="note"><b>Cómo se asignan los años:</b> cada año calendario es del presidente que gobernó 6 meses o más de ese año (2003 es de Néstor Kirchner; 2015, de CFK 2; 2023, de Alberto Fernández; si son 6 y 6, como 1995, va para el que ya estaba al empezar el año).
        Si un presidente no tiene ningún año así, figura &quot;sin años completos&quot;. Los gráficos y los promedios usan los años cerrados (hasta {hasta}); los años siguientes son proyecciones del FMI y no se muestran.</p>
        <p className="note">«Vecinos» es el promedio simple de Brasil, Chile, Uruguay, Paraguay y Bolivia.</p>
      </details>
      <p className="note">Fuente: {datos.fuente}.</p>
    </div>
  );
}

const resaltaDe = (p: URLSearchParams) => (PRES_DEF.some((x) => x.id === p.get("cpr")) ? p.get("cpr") : null);

/** /contexto/: precios contra el mundo. */
export function ContextoPrecios() {
  const [p, set, montado] = useParams();
  const [decidido, setDecidido] = useState(false);   // antes de dibujar nada: un link viejo se manda a su subpestaña sin parpadeo
  useEffect(() => {
    const d = destinoViejo(window.location.hash, window.location.search);
    if (d) window.location.replace(d); else setDecidido(true);
  }, []);
  const sec = useSeccion(IDS_PM);
  const m = sec.motor;
  const PRES = useMemo(() => (m ? crearPres(m.F) : []), [m]);
  const yaDibujado = useRef(false);
  if (!decidido) return <Cargando />;
  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  // Solo la primera vez: si después vuelve a cargar (otro rubro, otro período) la página queda dibujada; si no, se achica y el navegador sube arriba de todo
  if (!m || !montado || (sec.ocupado && !yaDibujado.current)) return <Cargando />;
  yaDibujado.current = true;
  return (
    <section>
      <p className="sub">Cuánto cuestan los precios de la Argentina contra los del mundo, por rubro, por región y por presidente.</p>
      <PreciosMundo m={m} PRES={PRES} p={p} set={set} />
    </section>
  );
}

/** /contexto/paises/: la Argentina contra otros países. */
export function ContextoPaises() {
  const [p, set, montado] = useParams();
  const { datos, error } = useContexto();
  useIrAlAncla(!!datos && montado);
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!montado || !datos) return <Cargando />;
  return (
    <section>
      <p className="sub">Cómo le fue a la Argentina contra otros países en cada mandato: crecimiento, inflación, desempleo y más.</p>
      <Comparar datos={datos} p={p} set={set} resalta={resaltaDe(p)} />
      <PieFMI datos={datos} />
    </section>
  );
}

/** /contexto/esperado/: lo que el FMI esperaba y lo que pasó. */
export function ContextoEsperado() {
  const [p, set, montado] = useParams();
  const { datos, error } = useContexto();
  useIrAlAncla(!!datos && montado);
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!montado || !datos) return <Cargando />;
  const grupoId = unoDe(p.get("cg"), GRUPOS_CMP.map((g) => g[0]), "mundo");
  const grupo = GRUPOS_CMP.find((g) => g[0] === grupoId) as [string, string, string];
  return (
    <section>
      <p className="sub">Lo que el FMI esperaba cada abril y lo que terminó pasando, para la Argentina y para el resto, por presidente.</p>
      <Esperado datos={datos} grupoId={grupoId} grupo={grupo[2]} nombreGrupo={grupo[1]} p={p} set={set} resalta={resaltaDe(p)} />
      <PieFMI datos={datos} />
    </section>
  );
}

/** /contexto/viento/: viento de cola o de frente. */
export function ContextoViento() {
  const [p, , montado] = useParams();
  const sec = useSeccion(["ctx_soja", "ctx_maiz", "ctx_trigo", "ctx_petroleo", "ctx_fed", "ctx_terminos"]);
  const { datos, error } = useContexto();
  const m = sec.motor;
  const PRES = useMemo(() => (m ? crearPres(m.F) : []), [m]);
  useIrAlAncla(!!m && !sec.ocupado && !!datos && montado);
  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!m || !montado || sec.ocupado || !datos) return <Cargando />;
  return (
    <section>
      <p className="sub">Lo que pasaba afuera mientras gobernaba cada presidente: precios de lo que exporta la Argentina, tasas de EE.UU. y crecimiento de Brasil y China.</p>
      <Viento m={m} datos={datos} PRES={PRES} resalta={resaltaDe(p)} p={p} />
      <PieFMI datos={datos} />
    </section>
  );
}

type Setter = (c: Record<string, string | null | undefined>) => void;

/** Plegado que arma su contenido recién al abrirse (los gráficos miden su ancho al montarse: cerrados medirían cero). */
function Plegado({ resumen, children }: { resumen: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <details className="ctx-mas" onToggle={(e) => setAbierto((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>{resumen}</summary>
      {abierto && children}
    </details>
  );
}

function Leyenda({ items }: { items: { color: string; n: string; dash?: boolean }[] }) {
  return (
    <p className="note" style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
      {items.map((it) => (
        <span key={it.n}><span aria-hidden style={{ display: "inline-block", width: 18, borderTop: `3px ${it.dash ? "dashed" : "solid"} var(${it.color})`, verticalAlign: "middle", marginRight: 5 }} />{it.n}</span>
      ))}
    </p>
  );
}

// ------------------------------------------------------------------ lo esperado vs. lo que pasó
function Esperado({ datos, grupoId, grupo, nombreGrupo, p, set, resalta }: { datos: DatosContexto; grupoId: string; grupo: string; nombreGrupo: string; p: URLSearchParams; set: Setter; resalta: string | null }) {
  const def = ESPERADO.find((x) => x.id === p.get("cd")) ?? ESPERADO[0];
  const filas = useMemo(() => filasEsperado(datos, def.origen, grupo), [datos, def, grupo]);
  const hasta = ultimoCerrado(datos);
  const dir = def.dir;
  const nombre = grupo === VEC ? "los vecinos" : nombreGrupo === "Mundo" ? "el mundo" : nombreGrupo;
  const rows = filas.filter((f) => f.y >= 1995).map((f) => ({ fecha: `${f.y}-01`, per: String(f.y), pa: f.pArg, ra: f.rArg, pg: f.pGrp, rg: f.rGrp }));
  const series: SerieG[] = [
    { key: "pa", name: "Argentina: proyectado en abril", color: "--series-1", dash: true },
    { key: "ra", name: "Argentina: real", color: "--series-1" },
    { key: "pg", name: `${nombreGrupo}: proyectado en abril`, color: "--series-3", dash: true },
    { key: "rg", name: `${nombreGrupo}: real`, color: "--series-3" },
  ];
  const opts: OpcionesG = { height: 300, fmtAxis: (v) => nf1.format(v), fmtTip: (v) => nf1.format(v), tipTitle: (r) => String(r.per), zero: true, refLine: 0, maxGap: 13 };
  const iEst = datos.anios.indexOf(hasta + 1);
  const estA = iEst >= 0 ? serieAnual(datos, def.origen, ARG)[iEst] : null, estG = iEst >= 0 ? serieAnual(datos, def.origen, grupo)[iEst] : null;
  const porPres = useMemo(() => PRES_DEF.map((x) => {
    const anios = aniosDe(x.id, hasta);
    return { x, s: sorpresaPres(filas, anios), anios };
  }), [filas, hasta]);
  const frase = (s: number) => (Math.abs(s) < 0.05 ? "lo esperado" : `${nf1.format(Math.abs(s))} puntos ${s * dir >= 0 ? "mejor" : "peor"} de lo esperado`);
  const colS = useMemo(() => ({
    arg: columnaComparable(porPres.map((q) => q.s.sArg), dir, true),
    grp: columnaComparable(porPres.map((q) => q.s.sGrp), dir, true),
    dif: columnaComparable(porPres.map((q) => q.s.dif), dir, true),
  }), [porPres, dir]);
  const resp = fraseEsperado(datos, grupo, def.origen);
  const [imagen, setImagen] = useState(false);
  // la misma tabla «Por presidente» de la pantalla: mismo texto, mismo tono y misma intensidad (`frac`) de cada celda
  const armarImg = useCallback((formato: FormatoImg) => {
    const celda = (txt: string, tono: "bueno" | "malo" | null, frac: number) => ({ texto: txt, cls: tono ?? ("neutro" as const), calor: frac });
    const grilla: GrillaCtx = {
      titulo: `${def.n}: lo esperado y lo que pasó, por presidente`,
      frase: `Sorpresa = lo que pasó menos lo que el FMI esperaba en abril, promedio por año, en puntos. Más intenso: más lejos del medio entre los presidentes. ${dir > 0 ? "Verde: pasó más de lo esperado; rojo: pasó menos." : "Verde: pasó menos de lo esperado; rojo: pasó más."}`,
      unidad: `${def.n} (${def.u}): sorpresa promedio por año, en puntos, Argentina y ${nombre}`,
      fuente: `${datos.fuente}`,
      columnas: [{ nombre: "Argentina", metrica: "sorpresa" }, { nombre: nombreGrupo, metrica: "sorpresa" }, { nombre: "Diferencia", metrica: "Argentina − " + nombreGrupo }],
      filas: porPres.flatMap(({ x, s, anios }, k) => {
        if (!anios.length) return [];
        return [{
          id: x.id, nombre: nombreCorto(x.n), periodo: textoAnios(anios) + (s.n && s.n < anios.length ? ` · ${s.n} de ${anios.length} años` : ""),
          celdas: s.n ? [
            celda(ok(s.sArg) ? signo(s.sArg) : "—", colS.arg.tono[k], colS.arg.frac[k]),
            celda(ok(s.sGrp) ? signo(s.sGrp) : "—", colS.grp.tono[k], colS.grp.frac[k]),
            celda(ok(s.dif) ? signo(difMostrada(s.sArg, s.sGrp) ?? s.dif) : "—", colS.dif.tono[k], colS.dif.frac[k]),
          ] : [celda("—", null, 0), celda("—", null, 0), celda("—", null, 0)],
        }];
      }),
      calor: true,
    };
    return armarImagenGrilla(grilla, formato) as DatosImagen;
  }, [def, dir, nombre, nombreGrupo, datos.fuente, porPres, colS]);
  return (
    <Capitulo id="esperado" titulo="Lo esperado y lo que pasó"
      acciones={<CompartirHoja href={hrefBloque(p, "esperado")} titulo="Lo esperado y lo que pasó" onImagen={() => setImagen(true)} texto={resp ? `${resp} Fuente: ${datos.fuente}.` : undefined} />}>
      {resp && <p className="ctx-respuesta">{resp}</p>}
      <div className="ctx-fila"><span className="ctx-rotulo">Dato</span>
        <FilaChips etiqueta="Dato" valor={def.id} opciones={ESPERADO.map((x) => [x.id, x.n] as [string, string])} onElegir={(v) => set({ cd: v === "crec" ? null : v })} /></div>
      <div className="ctx-fila"><span className="ctx-rotulo">Comparar con</span>
        <FilaChips etiqueta="Grupo de comparación" valor={grupoId} opciones={GRUPOS_CMP.map((g) => [g[0], g[1]] as [string, string])} onElegir={(v) => set({ cg: v === "mundo" ? null : v })} /></div>
      <div className="ctx-titulo-graf">
        <h3>{def.n}: proyectado en abril y real</h3>
        <InfoPunto etiqueta="Cómo se mide lo esperado">
          <p>Cada año, lo que el FMI proyectaba en abril y lo que terminó pasando. «Sorpresa» = real − proyectado. Se usa siempre la última edición del FMI para lo que pasó y la de abril de cada año para lo esperado (el FMI corrige datos viejos en cada edición).</p>
          <p>Las proyecciones de abril que publica el FMI como base descargable llegan hasta la edición de 2022 y cubren crecimiento e inflación (no desempleo ni América Latina): los años sin proyección no tienen sorpresa y no entran en los promedios.</p>
          {ok(estA) && <p>{hasta + 1} (estimado, todavía sin dato real): la última proyección del FMI es {f1(estA)} para la Argentina y {f1(estG)} para {nombre}. No entra en las sorpresas.</p>}
        </InfoPunto>
      </div>
      <p className="note">{def.u}. Línea punteada: lo proyectado en abril.</p>
      <Grafico rows={rows} series={series} opts={opts} />
      <Leyenda items={series.map((s) => ({ color: s.color, n: s.name, dash: s.dash }))} />
      <div className="ctx-titulo-graf">
        <h3>Por presidente</h3>
        <InfoPunto etiqueta="Cómo leer la tabla">
          <p>La barra muestra la magnitud frente al mayor de la columna (a la derecha si es positiva, a la izquierda si es negativa) y las marcas “mejor” y “peor” señalan los extremos. {dir > 0 ? "Verde: mejor de lo esperado." : "Que salga más alto es peor: verde = más bajo de lo esperado."}</p>
        </InfoPunto>
      </div>
      <div className="tablewrap fija"><table>
        <thead><tr><th>Presidente</th><th>Sorpresa Argentina</th><th>Sorpresa {nombreGrupo}</th><th>Diferencia</th></tr></thead>
        <tbody>{porPres.map(({ x, s, anios }, k) => (
          <tr key={x.id} style={resaltar(resalta === x.id)}>
            <CeldaPres n={x.n} corto={nombreCorto(x.n)} periodo={anios.length ? textoAnios(anios) : "sin años completos"} sel={resalta === x.id} />
            {anios.length && s.n ? <>
              <Valor tono={colS.arg.tono[k]} f={colS.arg.frac[k]} modo="centro" neg={(s.sArg ?? 0) < 0} marca={colS.arg.marca[k]} sub={s.n < anios.length ? <small>{s.n} de {anios.length} años</small> : null}>{ok(s.sArg) ? signo(s.sArg) : "—"}</Valor>
              <Valor tono={colS.grp.tono[k]} f={colS.grp.frac[k]} modo="centro" neg={(s.sGrp ?? 0) < 0} marca={colS.grp.marca[k]}>{ok(s.sGrp) ? signo(s.sGrp) : "—"}</Valor>
              <Valor tono={colS.dif.tono[k]} f={colS.dif.frac[k]} modo="centro" neg={(s.dif ?? 0) < 0} marca={colS.dif.marca[k]}>{ok(s.dif) ? signo(difMostrada(s.sArg, s.sGrp) ?? s.dif) : "—"}</Valor>
            </> : <td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)" }}>{anios.length ? "sin proyección de abril para esos años" : "sin años completos"}</td>}
          </tr>
        ))}</tbody>
      </table></div>
      <p className="note" style={{ marginTop: "var(--e-2)" }}>Sorpresa promedio por año, en puntos.</p>
      <details className="ctx-mas">
        <summary>Presidente por presidente, en palabras</summary>
        <ul className="note" style={{ paddingLeft: 18 }}>
          {porPres.filter(({ s, anios }) => anios.length && ok(s.sArg) && ok(s.sGrp) && ok(s.dif)).map(({ x, s }) => (
            <li key={x.id}>Con {x.n}, la Argentina rindió {frase(s.sArg as number)} por año; {nombre}, {frase(s.sGrp as number)}. Diferencia: {signo(difMostrada(s.sArg, s.sGrp) ?? (s.dif as number))} puntos.</li>
          ))}
        </ul>
      </details>
      <details className="ctx-mas">
        <summary>Ver año por año</summary>
        <div className="tablewrap alto fija"><table>
          <thead><tr><th>Año</th><th>Arg. proyectado</th><th>Arg. real</th><th>Sorpresa Arg.</th><th>{nombreGrupo} proyectado</th><th>{nombreGrupo} real</th><th>Sorpresa {nombreGrupo}</th><th>Diferencia</th></tr></thead>
          <tbody>{filas.filter((f) => f.y >= 1995 && (f.pArg != null || f.rArg != null)).map((f) => (
            <tr key={f.y}><td>{f.y}{f.y > hasta ? <small>estimado</small> : null}</td><td>{f1(f.pArg)}</td><td>{f1(f.rArg)}</td><Valor tono={tonoSig(f.sArg, dir)}>{ok(f.sArg) ? signo(sorpresaMostrada(f.rArg, f.pArg, f.sArg) as number) : "—"}</Valor>
              <td>{f1(f.pGrp)}</td><td>{f1(f.rGrp)}</td><Valor tono={tonoSig(f.sGrp, dir)}>{ok(f.sGrp) ? signo(sorpresaMostrada(f.rGrp, f.pGrp, f.sGrp) as number) : "—"}</Valor><Valor tono={tonoSig(f.dif, dir)}>{ok(f.dif) ? signo(difMostrada(sorpresaMostrada(f.rArg, f.pArg, f.sArg), sorpresaMostrada(f.rGrp, f.pGrp, f.sGrp)) ?? f.dif) : "—"}</Valor></tr>
          ))}</tbody>
        </table></div>
      </details>
      {imagen && <PanelGasto armar={armarImg} titulo="Lo esperado y lo que pasó" href={hrefBloque(p, "esperado")} onCerrar={() => setImagen(false)} />}
    </Capitulo>
  );
}

// ------------------------------------------------------------------ la Argentina y otros países
const DEF_ENT = [...VECINOS, "WEOWORLD"];
function Comparar({ datos, p, set, resalta }: { datos: DatosContexto; p: URLSearchParams; set: Setter; resalta: string | null }) {
  const def = COMPARAR.find((x) => x.id === p.get("cpd")) ?? COMPARAR[0];
  const hasta = ultimoCerrado(datos);
  const grupos = [...GRUPOS_CMP.map((g) => g[2]), ...GRUPOS_EXTRA].filter((e) => e === VEC || datos.entidades[e]);
  const validas = new Set([...PAISES, ...grupos].filter((e) => e === VEC || datos.entidades[e]));
  const sel = (p.has("cpp") ? lista(p.get("cpp")) : DEF_ENT).filter((e) => validas.has(e) && e !== ARG);
  const ents = [ARG, ...sel];
  const baseP = p.get("cpb");
  const baseAnio = baseP === "valor" ? null : Math.max(datos.anios[0], Math.min(hasta, Math.round(Number(baseP) || 2000)));
  const base = baseAnio ?? datos.anios[0];
  const series = useMemo(() => Object.fromEntries(ents.map((e) => [e, serieComparar(datos, def, e, base)])), [datos, def, ents.join(","), base]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = datos.anios.map((y, i) => y > hasta ? null : ({ fecha: `${y}-01`, per: String(y), ...Object.fromEntries(ents.map((e) => [e, series[e][i]])) })).filter((r): r is NonNullable<typeof r> => r != null);
  const sinColor = Math.max(0, ents.length - PALETA.length);   // un color por país: si no alcanzan los de la paleta no se reciclan, se muestran solo los primeros
  const sg: SerieG[] = ents.slice(0, PALETA.length).map((e, k) => ({ key: e, name: nombreEnt(datos, e), color: PALETA[k] }));
  const valoresPos = rows.flatMap((r) => ents.map((e) => (r as Record<string, unknown>)[e] as number | null)).filter((v): v is number => ok(v) && v > 0).sort((a, b) => a - b);
  const mediana = valoresPos.length ? valoresPos[Math.floor(valoresPos.length / 2)] : 0;
  const todosPos = rows.every((r) => ents.every((e) => { const v = (r as Record<string, unknown>)[e] as number | null; return !ok(v) || v > 0; }));
  const log = def.id === "infl" && valoresPos.length > 0 && valoresPos[valoresPos.length - 1] > 10 * mediana;
  const esIdx = !!def.indice;
  const fmt = (v: number) => (esIdx ? nf1.format(v) : def.u.startsWith("US$") ? nf0.format(v) : nf1.format(v));
  const opts: OpcionesG = { height: 320, fmtAxis: fmt, fmtTip: fmt, tipTitle: (r) => String(r.per), log, zero: !esIdx && !log && def.id !== "pibpc", endLabels: false, maxGap: 13 };

  // tabla por presidente
  const filasP = PRES_DEF.map((x) => {
    const anios = aniosDe(x.id, hasta);
    const vals = Object.fromEntries(ents.map((e) => [e, esIdx ? crecimientoIndice(datos, series[e], anios) : promedioAnios(datos, series[e], anios)]));
    const arg = vals[ARG].v;
    const mejores = ents.filter((e) => ok(vals[e].v)).length;
    const puesto = ok(arg) ? 1 + ents.filter((e) => e !== ARG && ok(vals[e].v) && ((vals[e].v as number) - arg) * def.dir > 0).length : null;
    let pctIni: number | null = null, pctFin: number | null = null;
    if (def.id === "pibpc" && anios.length) {
      const otros = sel.map((e) => series[e]);
      const rel = (y: number) => { const i = datos.anios.indexOf(y); const a = series[ARG][i]; const o = otros.map((s) => s[i]).filter(ok) as number[]; return ok(a) && o.length ? (a / (o.reduce((s, v) => s + v, 0) / o.length)) * 100 : null; };
      pctIni = rel(anios[0]); pctFin = rel(anios[anios.length - 1]);
    }
    return { x, anios, vals, puesto, de: mejores, pctIni, pctFin };
  });
  const tonoPuesto = (pu: number | null, de: number) => { if (!pu || de < 2) return null; const sc = 1 - (2 * (pu - 1)) / (de - 1); return sc > 0 ? "bueno" as const : sc < 0 ? "malo" as const : null; };
  const [hoja, setHoja] = useState(false);
  const [hojaPaises, setHojaPaises] = useState(false);
  const resp = fraseComparar(datos);
  // R27: país resaltado (`cpx`); inválido o fuera del gráfico = ninguno
  const cpx = p.get("cpx");
  const pais = sg.some((s) => s.key === cpx) ? cpx : null;
  const unidadGraf = `${def.u}${esIdx ? (baseAnio == null ? ` · 100 = ${datos.anios[0]}` : ` · 100 = ${baseAnio}`) : ""}${log ? " · escala logarítmica" : ""}`;
  const vistaLineas = (): VistaCtx | null => (rows.length > 1 ? {
    tipo: "ctx-lineas", titulo: `${def.n}: la Argentina y otros países`, frase: `${def.n}, de ${datos.anios[0]} a ${hasta}.`,
    x: rows.map((r) => Number(r.per) * 12), series: sg.map((s, k) => ({ id: s.key, nombre: s.name, color: k, v: rows.map((r) => ((r as Record<string, unknown>)[s.key] as number | null) ?? null) })),
    ...(pais ? { resaltados: [pais] } : {}), unidad: unidadGraf, fuente: `Fuente: ${datos.fuente}`, decimales: !esIdx && def.u.startsWith("US$") ? 0 : 1, log,
  } : null);
  const resumen = [def.n, ...(esIdx ? [baseAnio == null ? "Valor" : `Base 100 desde ${baseAnio}`] : []), `Argentina y ${sel.length} más`].join(" · ");
  const sufijo = esIdx ? "Crecimiento acumulado en el mandato (%)" : `Promedio del mandato (${def.u})`;

  return (
    <Capitulo id="comparar" titulo="La Argentina y otros países"
      acciones={<CompartirHoja href={hrefBloque(p, "comparar")} titulo="La Argentina y otros países" texto={resp ? `${resp} Fuente: ${datos.fuente}.` : undefined} />}>
      {resp && <p className="ctx-respuesta">{resp}</p>}
      <BarraResumen resumen={resumen} onAjustes={() => setHoja(true)}
        extras={<button type="button" className="vistabar-ajustes" aria-haspopup="dialog" onClick={() => setHojaPaises(true)}>Países</button>} />
      <HojaListo titulo="Países" abierta={hojaPaises} onCerrar={() => setHojaPaises(false)}>
        {() => (
          <div className="ctx-hoja">
            <Pildoras titulo="Países para comparar" valor={new Set(sel)} opciones={[...PAISES.filter((e) => validas.has(e)), VEC, ...grupos.filter((g) => g !== VEC)].map((e) => [e, nombreEnt(datos, e)] as [string, string])}
              onElegir={(v) => set({ cpp: [...alternar(new Set(sel), v, true)].join(",") || "-" })} />
          </div>
        )}
      </HojaListo>
      <HojaListo titulo="Ajustes" abierta={hoja} onCerrar={() => setHoja(false)}>
        {(cerrar) => (
          <div className="ctx-hoja">
            <FilaAjuste rotulo="Dato">
              <Selector etiqueta="Dato" valor={def.id} opciones={COMPARAR.map((x) => [x.id, x.n] as [string, string])} onElegir={(v) => set({ cpd: v === "crec" ? null : v })} />
            </FilaAjuste>
            {esIdx && (
              <FilaAjuste rotulo="Ver como">
                <Seg valor={baseAnio == null ? "valor" : "base"} opciones={[["valor", "Valor"], ["base", "Base 100"]]} onElegir={(v) => set({ cpb: v === "valor" ? "valor" : null })} />
              </FilaAjuste>
            )}
            {esIdx && baseAnio != null && (
              <FilaAjuste rotulo="Año base">
                <Selector etiqueta="Año base" valor={String(baseAnio)} opciones={datos.anios.filter((y) => y <= hasta).map((y) => [String(y), `desde ${y}`] as [string, string])} onElegir={(v) => set({ cpb: v === "2000" ? null : v })} />
              </FilaAjuste>
            )}
          </div>
        )}
      </HojaListo>
      <div className="ctx-titulo-graf">
        <h3>{def.n}</h3>
        <InfoPunto etiqueta="Cómo se mide este dato">
          <p>Datos anuales del FMI, hasta {hasta}.</p>
          {esIdx && <p>{def.id === "pibr"
            ? "El PIB real de cada país se arma encadenando su crecimiento anual, así se ve cuánto creció cada uno sin importar su tamaño."
            : "PIB por habitante a precios constantes y paridad de poder adquisitivo (FMI), llevado a 100 en el año base."}
            {baseAnio == null ? ` En «Valor» el índice arranca en 100 en ${datos.anios[0]}.` : ` Todas las líneas valen 100 en ${baseAnio}.`}</p>}
          {log && <p>Escala logarítmica: la inflación de algunos años es mucho mayor que la del resto y aplastaría el gráfico.{todosPos ? "" : " En esta escala no se pueden dibujar los años con inflación cero o negativa."}</p>}
          {esIdx && <p>En la tabla, el crecimiento se mide del cierre del año anterior al mandato al último año.</p>}
        </InfoPunto>
      </div>
      <div className="ctx-titulo-graf">
        <p className="note" style={{ margin: 0, flex: 1, minWidth: 0 }}>{unidadGraf}</p>
        <BotonCompartir className="solo-icono" titulo="Primero los Datos: la Argentina y otros países" href={() => `${window.location.pathname}${window.location.search}#comparar`} crearVista={vistaLineas}
          deshabilitado={rows.length < 2} aria-label="Compartir el gráfico como imagen" title="Compartir este gráfico como imagen"><IconoCompartir /></BotonCompartir>
      </div>
      <Grafico rows={rows} series={sg} opts={{ ...opts, resaltar: pais }} />
      {/* R27: la leyenda es tocable; resalta la línea del país (otra vez la suelta) */}
      <div className="pres-leyenda" role="group" aria-label="Resaltar un país">
        {sg.map((s) => (
          <button key={s.key} type="button" className="pres-leyenda-item" style={vcolor(s.color)} aria-pressed={pais === s.key}
            onClick={() => set({ cpx: pais === s.key ? null : s.key })}>{s.name}</button>
        ))}
      </div>
      {sinColor > 0 && <p className="note" role="status">Se muestran con color los primeros {PALETA.length} países; sacá alguno en «Países» para ver el resto en el gráfico.</p>}
      <h3>Por presidente</h3>
      <div className="tablewrap fija"><table>
        <thead><tr><th>Presidente</th>{ents.map((e) => <th key={e}>{nombreEnt(datos, e)}</th>)}<th>Puesto de la Argentina</th>{def.id === "pibpc" && <th>Arg. como % del promedio (inicio → fin)</th>}</tr></thead>
        <tbody>{filasP.map(({ x, anios, vals, puesto, de, pctIni, pctFin }) => (
          <tr key={x.id} style={resaltar(resalta === x.id)}>
            <CeldaPres n={x.n} corto={nombreCorto(x.n)} periodo={anios.length ? textoAnios(anios) : "sin años completos"} sel={resalta === x.id} />
            {anios.length ? ents.map((e) => <td key={e} style={e === ARG ? { fontWeight: 600 } : undefined}>{f1(vals[e].v)}{nDe(vals[e])}</td>)
              : <td colSpan={ents.length} style={{ textAlign: "center", color: "var(--text-muted)" }}>sin años completos</td>}
            <Valor tono={tonoPuesto(puesto, de)}>{puesto ? `${puesto}º de ${de}` : "—"}</Valor>
            {def.id === "pibpc" && <td>{ok(pctIni) && ok(pctFin) ? `${nf0.format(pctIni)} % → ${nf0.format(pctFin)} %` : "—"}</td>}
          </tr>
        ))}</tbody>
      </table></div>
      <p className="note" style={{ marginTop: "var(--e-2)" }}>{sufijo}. Puesto 1 = el mejor entre los elegidos ({def.dir > 0 ? "más alto es mejor" : "más bajo es mejor"}).</p>
    </Capitulo>
  );
}

// ------------------------------------------------------------------ viento de cola o de frente
/** Gráfico mensual con la opción de pintar el período de cada presidente (arranca como diga la configuración global). */
function GraficoMensual({ rows, series, opts, F }: { rows: Fila[]; series: SerieG[]; opts: OpcionesG; F: string[] }) {
  const { config } = useConfig();
  const [local, setLocal] = useState<boolean | null>(null);
  const on = local ?? config.franjas;
  const kBase = `${config.t0}|${JSON.stringify(config.t0p)}`;
  const franjas = useMemo(() => (on ? franjasPres(F, baseDeConfig(config, PRES_DEF.map((x) => x.id))) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [on, F, kBase]);
  const o = useMemo(() => (franjas ? { ...opts, franjas } : opts), [opts, franjas]);
  return (
    <>
      <div className="controls"><button type="button" className="btn chico" aria-pressed={on} onClick={() => setLocal(!on)}>Presidentes: {on ? "sí" : "no"}</button></div>
      <Grafico rows={rows} series={series} opts={o} />
    </>
  );
}

/** Encabezados cortos de la imagen de Viento (la tabla de la pantalla usa el nombre entero). */
const CORTO_VIENTO: Record<string, string> = { petroleo: "Petróleo", tdi: "Términos", fed: "Fed", bra: "Brasil", chn: "China" };
const METRICA_VIENTO: Record<string, string> = { tdi: "de intercambio", fed: "tasa, % anual", bra: "crecim., % anual", chn: "crecim., % anual" };
const fmtV = (def: Omit<DefViento, "fmt">, v: number | null) => (ok(v) ? (def.u.includes("%") ? nf1.format(v) : nf0.format(v)) : "—");
const tonoMarca = (mk: Marca) => (mk === "favor" ? "bueno" as const : mk === "contra" ? "malo" as const : null);

function Viento({ m, datos, PRES, resalta, p }: { m: NonNullable<ReturnType<typeof useSeccion>["motor"]>; datos: DatosContexto; PRES: Pres[]; resalta: string | null; p: URLSearchParams }) {
  const hasta = ultimoCerrado(datos);
  const mensuales = VIENTOS.filter((v) => v.fuente === "mensual" && v.serie && m.SER[v.serie]);
  const porPres = useMemo(() => PRES.map((x) => ({ x, v: vientosPres(m, datos, x) })), [m, datos, PRES]);
  const rowsMes = (def: (typeof VIENTOS)[number]) => {
    const v = m.calc({ id: def.serie as string, med: def.med, rel: null }).v;
    return m.F.map((f, i) => ({ fecha: f, [def.id]: v[i] }));
  };
  const optsMes = (def: (typeof VIENTOS)[number]): OpcionesG => ({ height: 220, fmtAxis: (v) => fmtV(def, v), fmtTip: (v) => fmtV(def, v) + " " + def.u.replace("US$ de hoy", "US$ de hoy"), zero: def.id === "fed" });
  const rowsAnual = datos.anios.filter((y) => y <= hasta).map((y) => { const i = datos.anios.indexOf(y); return ({ fecha: `${y}-01`, per: String(y), bra: (datos.real.NGDP_RPCH?.BRA ?? [])[i] ?? null, chn: (datos.real.NGDP_RPCH?.CHN ?? [])[i] ?? null }); });
  const sgAnual: SerieG[] = [{ key: "bra", name: "Brasil", color: "--series-2" }, { key: "chn", name: "China", color: "--series-4" }];
  const resp = fraseViento(m, datos, presParaViento(m, datos, PRES));
  const [imagen, setImagen] = useState(false);
  // la misma tabla «Por presidente» de la pantalla: mismo promedio, mismo período y mismo tono (a favor / en contra) de cada celda
  const armarImg = useCallback((formato: FormatoImg) => {
    const grilla: GrillaCtx = {
      titulo: "Viento de cola o de frente: promedio del mandato, por presidente",
      frase: "Promedio del mandato contra el de toda la serie. Verde: a favor; rojo: en contra; sin color: sin marca. Que el contexto haya sido favorable no dice si se aprovechó bien; que haya sido desfavorable no explica todo lo que pasó.",
      unidad: "Precios en US$ de hoy (descontada la inflación de EE.UU.)",
      // la fuente de cada serie mensual y la del FMI para Brasil y China, sin repetir
      ...fuentesTxt([...VIENTOS.flatMap((d) => (d.serie && m.SER[d.serie] ? [m.SER[d.serie].fuente] : [])), datos.fuente]),
      // nombres cortos: la imagen tiene ocho columnas y los nombres largos se cortaban («CRECIMIENT…» dos veces)
      columnas: VIENTOS.map((d) => ({ nombre: CORTO_VIENTO[d.id] ?? d.n, metrica: METRICA_VIENTO[d.id] ?? d.u.replace("US$ de hoy por ", "US$ por ") })),
      filas: porPres.map(({ x, v }) => ({
        id: x.id, nombre: x.corto, periodo: periodoMandato(m.F, x),
        celdas: v.map((c) => c.mandato == null ? { texto: "—", cls: "neutro" as const, calor: 0 } : { texto: fmtV(c.def, c.mandato), cls: tonoMarca(c.marca) ?? ("neutro" as const), calor: 0 }),
      })),
      calor: false,
    };
    return armarImagenGrilla(grilla, formato) as DatosImagen;
  }, [m, datos.fuente, porPres]);
  return (
    <Capitulo id="viento" titulo="Viento de cola o de frente"
      acciones={<CompartirHoja href={hrefBloque(p, "viento")} titulo="Viento de cola o de frente" onImagen={() => setImagen(true)} texto={resp ? `${resp} Fuente: ${datos.fuente}.` : undefined} />}>
      {resp && <p className="ctx-respuesta">{resp}</p>}
      <p className="note">Lo que pasaba afuera y la Argentina no controlaba. Precios en dólares de hoy (descontada la inflación de EE.UU.).</p>
      <Plegado resumen={`Ver los ${mensuales.length + 1} gráficos`}>
      <div className="bloque-graf">
        {mensuales.map((def) => (
          <div key={def.id}>
            <h3>{def.n} <small style={{ fontWeight: 400, color: "var(--text-muted)" }}>{def.u}</small></h3>
            <GraficoMensual rows={rowsMes(def)} series={[{ key: def.id, name: def.n, color: "--series-1" }]} opts={optsMes(def)} F={m.F} />
          </div>
        ))}
        <div>
          <h3>Crecimiento de Brasil y China <small style={{ fontWeight: 400, color: "var(--text-muted)" }}>% anual</small></h3>
          <Grafico rows={rowsAnual} series={sgAnual} opts={{ height: 220, fmtAxis: (v) => nf1.format(v), fmtTip: (v) => nf1.format(v), tipTitle: (r) => String(r.per), zero: true, refLine: 0, maxGap: 13 }} />
          <Leyenda items={sgAnual.map((s) => ({ color: s.color, n: s.name }))} />
        </div>
      </div>
      </Plegado>
      <div className="ctx-titulo-graf">
        <h3>Por presidente</h3>
        <InfoPunto etiqueta="Cómo se marca a favor o en contra">
          <p>Promedio del mandato contra el de toda la serie. «A favor» o «en contra»: más de 10 % mejor o peor (en la tasa de la Fed y en el crecimiento de Brasil y China, más de 1 punto). El petróleo va sin marca porque no es ni bueno ni malo para todos. Brasil y China se promedian en los años cerrados (hasta {hasta}).</p>
        </InfoPunto>
      </div>
      <div className="tablewrap fija"><table>
        <thead><tr><th>Presidente</th>{VIENTOS.map((v) => <th key={v.id}>{v.n}</th>)}</tr></thead>
        <tbody>{porPres.map(({ x, v }) => (
          <tr key={x.id} style={resaltar(resalta === x.id)}>
            <CeldaPres n={x.n} corto={x.corto} periodo={periodoMandato(m.F, x)} sel={resalta === x.id} />
            {v.map((c) => c.mandato == null
              ? <td key={c.def.id} style={{ color: "var(--text-muted)", textAlign: "center" }}>sin datos</td>
              : <Valor key={c.def.id} tono={tonoMarca(c.marca)} sub={<small>{MARCA_TXT[c.marca] === "—" ? `prom. total ${fmtV(c.def, c.total)}` : `${MARCA_TXT[c.marca]} (prom. total ${fmtV(c.def, c.total)})`}</small>}>{fmtV(c.def, c.mandato)}</Valor>)}
          </tr>
        ))}</tbody>
      </table></div>
      <p className="note" style={{ marginTop: "var(--e-2)" }}>Promedio del mandato contra el de toda la serie.</p>
      <p className="note"><b>Que el contexto haya sido favorable no dice si se aprovechó bien; que haya sido desfavorable no explica todo lo que pasó.</b></p>
      {imagen && <PanelGasto armar={armarImg} titulo="Viento de cola o de frente" href={hrefBloque(p, "viento")} onCerrar={() => setImagen(false)} />}
    </Capitulo>
  );
}
