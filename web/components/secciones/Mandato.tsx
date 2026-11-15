"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useSeccion } from "../useSeccion";
import { Cargando, Selector, Seg, alternar } from "../ui";
import { FilaVariable } from "../Variables";
import { VentanaConfig } from "./VentanaConfig";
import { BotonCompartir } from "../PanelCompartir";
import { IconoCompartir } from "../Iconos";
import { Capitulo } from "../sistema/Capitulo";
import { CompartirHoja } from "../sistema/CompartirHoja";
import { Grafico, type Fila, type SerieG } from "../Grafico";
import { CeldaPresMandato, LineaInicio, useBase } from "./comunes";
import { fmtMes } from "@/lib/formato";
import { baseIdx, calcularMandato, celdasHitos, crearPres, nombreCorto, TITULOS_MANDATO as TITULOS, type CeldaHito, type ModoMandato } from "@/lib/estadisticas";
import type { Expr } from "@/lib/motor";
import { MODO_MANDATO_DEF, PRES_MANDATO_DEF } from "@/lib/ficha";
import { decExpr, enteroEn, encExpr, lista, unoDe, useParams } from "@/lib/url";
import { vcolor } from "../util";

// "indice" ya no se ofrece (es la misma curva que la variación): los links viejos con ese modo abren en Variación %
const MODOS: [string, string][] = [["teorico", "Mismo punto de partida"], ["var", "Variación %"], ["valor", "Valor del período"]];
const AYUDA: Record<string, string> = {
  teorico: "La misma curva que la variación, partiendo de un mismo valor.",
  var: "Cuánto subió desde el mes 0.",
  valor: "El dato tal cual, sin transformar.",
};
const DEF_PRES = PRES_MANDATO_DEF.join(",");
/** Valor por defecto de la página sin parámetros (E2.3): dólar blue en pesos corrientes. Un link con parámetros sigue mostrando lo mismo que antes (dólar oficial). */
const E_BLUE: Expr = { id: "fx_blue", med: "corr", rel: null, modo: "compra" };
const CLAVES_VISTA = ["mv", "mmo", "mp", "anc", "md", "mh", "mbd"];
const HITOS = [6, 12, 24, 36, 48];

export function Mandato() {
  const [p, set0, montado] = useParams();
  // ¿La página se abrió sin parámetros? Se fija una sola vez: después, cualquier cambio escribe también la variable en la URL, así el link compartido muestra lo mismo.
  const sinParams = useRef<boolean | null>(null);
  if (montado && sinParams.current === null) sinParams.current = !CLAVES_VISTA.some((k) => p.has(k));
  const defecto = sinParams.current ?? true;
  const set = (c: Record<string, string | null | undefined>) => set0(defecto && !p.has("mv") && !("mv" in c) ? { mv: encExpr(E_BLUE), ...c } : c);
  const [resSel, setResSel] = useState<string | null | undefined>(undefined);   // undefined = el de por defecto (Milei, solo sin parámetros)
  const info = useBase(p, set0, montado), b = info.b;
  const e0 = decExprSeguro(p.get("mv"));
  const sec = useSeccion(e0 ? [e0.id, ...(e0.rel ? [e0.rel] : [])] : [defecto ? E_BLUE.id : "fx_oficial"]);
  const { motor: m, metas, version } = sec;
  const eExiste = (id: string) => metas.some((x) => x.id === id);
  const eB: Expr = (montado && decExpr(p.get("mv"), eExiste)) || (defecto ? E_BLUE : { id: "fx_oficial", med: "corr", rel: null, modo: "compra" });
  const PRES = useMemo(() => (m ? crearPres(m.F) : []), [m]);
  const PRES_T0 = useMemo(() => (m ? PRES.filter((x) => m.idxDe(x.ini) > 0) : []), [m, PRES]);

  // animación: mes actual y si avanza; cualquier cambio de filtro la corta
  const [anim, setAnim] = useState<{ t: number; play: boolean } | null>(null);
  const [valorFinal, setValorFinal] = useState(false);   // opción de la imagen: el valor de cada presidente en el último mes visible
  const clave = p.toString() + JSON.stringify(b);
  useEffect(() => { setAnim(null); }, [clave]);

  const modoUrl = unoDe(p.get("mmo"), ["teorico", "var", "indice", "valor"] as const, MODO_MANDATO_DEF);   // "indice" (links viejos) = Variación %
  const modo: ModoMandato = modoUrl === "indice" ? "var" : modoUrl;
  const selIds = new Set(lista(p.has("mp") ? p.get("mp") : DEF_PRES).filter((id) => PRES_T0.some((x) => x.id === id)));
  const banda = unoDe(p.get("mbd"), ["no", "si"] as const, "no");
  const hitosVista = unoDe(p.get("mhv"), ["barras", "tabla"] as const, "barras");

  const D = useMemo(() => {
    if (!m || sec.ocupado) return null;
    const r = calcularMandato(m, PRES, PRES_T0, { expr: eB, modo, banda: banda === "si", b, presIds: selIds, anc: p.get("anc"), md: p.get("md"), mh: p.get("mh") });
    if (!r) return null;
    const series: SerieG[] = r.pres.map((x) => ({ key: x.id, name: x.n, short: nombreCorto(x.n), color: x.color, dash: x.dash, band: !!r.bnd }));
    const opts = {
      xVals: r.rows.map((f) => f.t as number), endLabels: true, log: r.usarLog, refLine: r.ref, fmtAxis: r.fmtAxis, fmtTip: r.fmtTip, fmtAxis2: null, label: r.c.corto,
      xLabel: (f: Fila) => (f.t % r.paso === 0 ? (f.t === 0 ? "Mes 0" : String(f.t)) : ""),
      tipTitle: (f: Fila) => `Mes ${f.t}`,
      tipSub: (f: Fila, se: SerieG) => (f["_f_" + se.key] ? ` <small style="color:var(--text-muted)">${fmtMes(f["_f_" + se.key])}</small>` : ""),
    };
    return { ...r, series, opts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, version, sec.ocupado, eB.id, eB.med, eB.rel, eB.modo, eB.esc, modo, banda, b, p, PRES_T0]);

  const modoEf: ModoMandato = D ? D.modo : modo;   // con una tasa, "mismo punto de partida" se muestra como valor del período
  const maxAnim = D ? D.rows.length - 1 : 0;
  const ms = Math.round(Math.max(6000 / Math.max(1, maxAnim), Math.min(150, 12000 / Math.max(1, maxAnim))));
  const play = !!anim?.play;
  useEffect(() => {
    if (!play) return;
    // si el sistema pide reducir el movimiento (también si cambió con la animación andando), no avanza sola
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setAnim(null); return; }
    const id = window.setInterval(() => {
      setAnim((a) => (!a || !a.play ? a : a.t + 1 >= maxAnim ? { t: maxAnim, play: false } : { t: a.t + 1, play: true }));
    }, ms);
    return () => window.clearInterval(id);
  }, [play, ms, maxAnim]);
  const animar = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setAnim(null); return; }
    setAnim({ t: 0, play: true });
  };
  // el cuadro actual nunca pasa del último mes visible: al achicar "Hasta" con la animación terminada, anim.t queda fuera de rango hasta que el efecto de arriba la corta
  const cuadro = anim ? Math.max(0, Math.min(anim.t, maxAnim)) : 0;
  const rowsVista = D && anim ? D.rows.map((r, i) => (i <= cuadro ? r : { t: r.t })) : D?.rows;

  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!m || !montado) return <Cargando />;
  const errs = Object.values(sec.errores);
  const resEf = D && (resSel === undefined ? (defecto && selIds.has("milei") ? "milei" : null) : resSel);
  const resaltar = D && resEf && D.pres.some((x) => x.id === resEf) ? resEf : null;
  const hitosDe = D ? celdasHitos(D.todas, D.pres, D.pres.map((x) => x.i1 - baseIdx(m.F, x, b)), HITOS, D.c) : [];

  return (
    <section>
      <p className="sub">Cada línea arranca en el mes 0 de un presidente y sigue mes a mes durante su mandato.</p>
      <LineaInicio info={info} F={m.F} />
      <div className="mand-barra" role="group" aria-label="Configuración del gráfico">
        <VentanaConfig etiqueta={D ? D.c.corto : "Variable"} titulo="Variable">
          <FilaVariable e={eB} onChange={(e) => e && set({ mv: encExpr(e) })} />
        </VentanaConfig>
        <VentanaConfig etiqueta="Cómo mostrar" titulo="Cómo mostrar">
          <div className="modos" role="radiogroup" aria-label="Cómo mostrar">
            {MODOS.filter(([k]) => !(D?.c.pct && k === "teorico")).map(([k, t]) => (
              <div key={k} className="modo">
                <label className="radio"><input type="radio" name="mmo" checked={modoEf === k} onChange={() => set({ mmo: k === "teorico" ? null : k })} /> {t}</label>
                <p className="note">{AYUDA[k]}</p>
                {k === "teorico" && modoEf === "teorico" && D && (
                  <div className="sangria"><label>Partiendo de</label>
                    <Selector etiqueta="Partiendo de" valor={D.anc} opciones={D.ancOpc.map((o) => [o[0], o[1]] as [string, string])} onElegir={(v) => set({ anc: v === "milei" ? null : v })} /></div>
                )}
                {k === "teorico" && modoEf === "teorico" && D && <p className="note">{`Ejemplo: si con Milei el dato arrancó en 1.000 (${D.c.unidad}) y en el mes 20 de CFK 2 había subido 50 %, CFK 2 marca 1.500 en el mes 20.`}</p>}
              </div>
            ))}
          </div>
          <div className="controls"><label>Rango del mes</label><Seg valor={banda} opciones={[["no", "Solo promedio"], ["si", "Promedio + mín/máx"]]} onElegir={(v) => set({ mbd: v === "no" ? null : v })} /></div>
        </VentanaConfig>
        <VentanaConfig etiqueta="Presidentes" titulo="Presidentes">
          <div className="controls"><Seg valor={selIds} opciones={PRES_T0.map((x) => [x.id, x.n] as [string, string])} onElegir={(v) => set({ mp: [...alternar(selIds, v)].join(",") })} /></div>
        </VentanaConfig>
      </div>
      {!D ? (errs.length ? null : <Cargando />) : (
        <>
          <Capitulo id="mand-grafico" titulo={`${D.c.corto}: ${TITULOS[modoEf]} por mes de mandato`}
            acciones={<BotonCompartir className="compartir" titulo={`Primero los Datos: ${D.c.corto} por mes de mandato`} href={() => window.location.href} deshabilitado={D.pres.length === 0}
              title="Armar una imagen de este gráfico para compartir" aria-label="Compartir como imagen: meses de mandato"
              crearVista={() => ({ tipo: "mandato", expr: eB, modo: modoEf, presIds: D.pres.map((x) => x.id), anc: p.get("anc"), md: p.get("md"), mh: p.get("mh"), valorFinal, base: b })}><IconoCompartir />Compartir</BotonCompartir>}>
            <div className="anim-barra">
              {!anim ? <button type="button" className="btn" onClick={animar}>▶ Animar</button>
                : anim.play ? <button type="button" className="btn" onClick={() => setAnim({ ...anim, play: false })}>⏸ Pausa</button>
                : <><button type="button" className="btn" onClick={() => setAnim(cuadro >= maxAnim ? { t: 0, play: true } : { t: cuadro, play: true })}>▶ Seguir</button>
                  <button type="button" className="btn" onClick={() => setAnim({ t: 0, play: true })}>↺ Reiniciar</button></>}
              {anim && <span className="lbl" role="status">Mes {D.rows[cuadro]?.t as number}</span>}
            </div>
            {/* la leyenda es tocable: resalta la línea del presidente (y la vuelve a sacar al tocarla de nuevo) */}
            <div className="pres-leyenda" role="group" aria-label="Resaltar un presidente">
              {D.pres.map((x) => (
                <button key={x.id} type="button" className="pres-leyenda-item" style={vcolor(x.color)} aria-pressed={resaltar === x.id}
                  onClick={() => setResSel(resaltar === x.id ? null : x.id)}>{x.n}</button>
              ))}
            </div>
            {/* tocar el gráfico pausa la animación */}
            <div onPointerDown={() => { if (play) setAnim((a) => (a ? { ...a, play: false } : a)); }}><Grafico rows={rowsVista || D.rows} series={D.series} opts={{ ...D.opts, resaltar }} /></div>
            <div className="controls mand-meses">
              <label>Meses</label><label htmlFor="mm_desde">desde</label>
              <input type="range" id="mm_desde" min={0} max={D.maxMes - 1} step={1} value={D.desde} onChange={(ev) => { const d = +ev.target.value; set({ md: d ? String(d) : null, mh: d >= D.hasta ? String(d + 1) : undefined }); }} />
              <label htmlFor="mm_hasta">hasta</label>
              <input type="range" id="mm_hasta" min={1} max={D.maxMes} step={1} value={D.hasta} onChange={(ev) => { const h = +ev.target.value; set({ mh: h === D.maxMes ? null : String(h), md: D.desde >= h ? String(h - 1) : undefined }); }} />
              <span className="lbl">mes {D.desde} a {D.hasta}{D.hasta === D.maxMes && D.desde === 0 ? " (todo)" : ""}</span>
            </div>
            <label className="comp-marca mand-valor"><input type="checkbox" checked={valorFinal} onChange={(ev) => setValorFinal(ev.target.checked)} /> Mostrar el valor de cada presidente en el último mes visible (en la imagen para compartir)</label>
            <details className="contexto-plegado">
              <summary>Cómo se calcula</summary>
              <p className="note">{D.nota}</p>
            </details>
          </Capitulo>
          <Capitulo id="mand-hitos" titulo="Resumen por hitos" bajada={`Mismo cálculo que el gráfico (${TITULOS[modoEf]}) en meses clave y al final de cada mandato.`}
            acciones={<CompartirHoja href={window.location.pathname + window.location.search} titulo="Resumen por hitos"
              texto={`${D.c.corto}: resumen por hitos de cada mandato, en ${hitosVista === "tabla" ? "tabla" : "barras"}.`} />}>
            <div className="controls">
              <Seg valor={hitosVista} opciones={[["barras", "Barras"], ["tabla", "Tabla"]]} onElegir={(v) => set({ mhv: v === "barras" ? null : v })} />
            </div>
            {hitosVista === "barras" ? <BarrasHitos D={D} hitosDe={hitosDe} /> : (
              <>
                <div className="tablewrap fija"><table className="pres-hm-tabla">
                  <thead><tr><th>Presidente</th><th>Mes 0</th>{HITOS.map((x) => <th key={x}>Mes {x}</th>)}<th>Final</th></tr></thead>
                  <tbody>{D.pres.map((x, k) => {
                    const fin = x.i1 - baseIdx(m.F, x, b), fila = hitosDe[k];
                    const celda = (t: number, extra?: React.ReactNode) => <CeldaMapa ce={fila.find((q) => q.t === t)} txt={D.cel(x, t)} extra={extra} />;
                    return <tr key={x.id}><CeldaPresMandato x={x} F={m.F} />{celda(0)}{HITOS.map((h) => h <= fin ? <Fragment key={h}>{celda(h)}</Fragment> : <td key={h} />)}{celda(fin, <small>mes {fin}</small>)}</tr>;
                  })}</tbody>
                </table></div>
                <p className="note">{D.c.dir ? "Color: cómo cambió desde el mes 0. Verde = mejoró y rojo = empeoró (también está escrito); más intenso = el cambio más grande de ese hito entre presidentes." : "Sin verde ni rojo: subir o bajar no es ni bueno ni malo en sí mismo. Más intenso = el cambio más grande de ese hito."}</p>
              </>
            )}
          </Capitulo>
        </>
      )}
    </section>
  );
  function decExprSeguro(s: string | null): Expr | null { return decExpr(s, () => true); }
}

/** Celda del mapa de calor: la cifra escrita sobre un fondo verde (mejoró) o rojo (empeoró) más o menos intenso; sin tono, sin color. */
function CeldaMapa({ ce, txt, extra }: { ce: CeldaHito | undefined; txt: string; extra?: React.ReactNode }) {
  const tono = ce?.tono ?? null, pct = Math.round(10 + 50 * (ce?.frac ?? 0));
  const fondo = tono ? `color-mix(in srgb, var(${tono === "bueno" ? "--bueno" : "--malo"}) ${pct}%, transparent)` : undefined;
  return (
    <td className={`pres-hm${tono ? ` pres-hm-${tono}` : ""}`} style={fondo ? { background: fondo } : undefined}>
      {txt}{extra}{tono ? <span className="sr-solo"> ({tono === "bueno" ? "mejoró" : "empeoró"} desde el mes 0)</span> : null}
    </td>
  );
}

/** Barras agrupadas por hito, un color por presidente. Misma escala para todos; logarítmica si el gráfico la usa. */
function BarrasHitos({ D, hitosDe }: { D: { pres: { id: string; n: string; color: string }[]; usarLog: boolean; fmtTip: (v: number) => string; c: { corto: string } }; hitosDe: CeldaHito[][] }) {
  const ts = [0, ...HITOS, -1];   // -1 = el final de cada mandato
  const vals = hitosDe.flat().map((q) => q.valor).filter((v): v is number => v != null);
  if (!vals.length) return <p className="note">No hay datos para dibujar las barras.</p>;
  const log = D.usarLog && vals.every((v) => v > 0);
  const f = (v: number) => (log ? Math.log(v) : v);
  const fs = vals.map(f), lo = Math.min(...fs), hi = Math.max(...fs);
  const base = log ? lo - 0.15 * (hi - lo || 1) : Math.min(0, lo), tope = log ? hi : Math.max(0, hi);
  const rango = tope - base || 1, y = (v: number) => ((tope - v) / rango) * 100;
  const grupos = ts.map((t) => ({
    t, rot: t === 0 ? "Mes 0" : t < 0 ? "Final" : `Mes ${t}`,
    barras: D.pres.map((x, k) => ({ x, ce: t < 0 ? hitosDe[k][hitosDe[k].length - 1] : hitosDe[k].find((q) => q.t === t) })).filter((q) => q.ce && q.ce.valor != null),
  })).filter((g) => g.barras.length);
  return (
    <div className="pres-barras-marco">
      <div className="pres-barras" role="img" aria-label={`${D.c.corto}: barras por hito de cada mandato. Las cifras están en la vista Tabla.`}>
        {grupos.map((g) => (
          <div key={g.t} className="pres-barras-grupo">
            <div className="pres-barras-area">
              {g.barras.map(({ x, ce }) => {
                const v = (ce as CeldaHito).valor as number, arriba = log ? y(f(v)) : y(Math.max(v, 0)), abajo = log ? 100 : y(Math.min(v, 0));
                return <span key={x.id} className="pres-barra" style={{ ...vcolor(x.color), top: `${arriba}%`, height: `max(2px, ${abajo - arriba}%)` }} title={`${x.n}, ${g.rot.toLowerCase()}: ${D.fmtTip(v)}`} />;
              })}
            </div>
            <span className="pres-barras-rot">{g.rot}</span>
          </div>
        ))}
      </div>
      <div className="pres-barras-ref" aria-hidden="true">{D.pres.map((x) => <span key={x.id} style={vcolor(x.color)}>{x.n}</span>)}</div>
    </div>
  );
}
