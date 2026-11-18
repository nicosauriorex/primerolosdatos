"use client";
import { useMemo, useState } from "react";
import { useSeccion } from "../useSeccion";
import { Cargando, alternar } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { Hoja } from "../sistema/Hoja";
import { InfoPunto } from "../sistema/InfoPunto";
import { BotonCompartir } from "../PanelCompartir";
import { IconoCompartir } from "../Iconos";
import { BotonInfo } from "../Variables";
import { CeldaVar, LineaInicio, Valor, useBase, HojaListo } from "./comunes";
import { BarraResumen, Pildoras } from "./Ranking";
import { PALETA } from "../util";
import { fmtMes, fmtNum, nf0, nf1, nf2, norm, ok } from "@/lib/formato";
import { CORTES_R, crearElec, crearPres, estimarVoto, METRICA_E, pearson, ultimoGlobalDe, valorElec, valorHoy } from "@/lib/estadisticas";
import { textoBusqueda } from "@/lib/catalogo";
import type { Calculo, Expr, Serie } from "@/lib/motor";
import { enteroEn, lista, unoDe, useParams } from "@/lib/url";
import { filaCorr, graficoDisp, niceTicks, type VistaElec } from "@/lib/imagen-elecciones";

const fmtR = (r: number) => (r > 0 ? "+" : "") + nf2.format(r);
const MAX_DISP_IMG = 4;   // gráficos de dispersión que entran en la imagen
const MAX_CORR_IMG = 12;  // variables de la imagen de correlación
const esDetalle = (s: Serie) => ((s.cat[1] || "").startsWith("IPC INDEC") && s.cat[2] !== "Nacional") || ((s.cat[1] || "").startsWith("Precios promedio") && s.cat[2] !== "GBA");

interface Corr { s: Serie; ind: Expr; c: Calculo; pts: { e: ReturnType<typeof crearElec>[number]; x: number }[]; r: number; b: number; a: number; n: number }

interface Hoy { x: number; est: number; fuera: boolean }
interface Caja { x0: number; y0: number; x1: number; y1: number }
const choca = (a: Caja, b: Caja) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
/** Etiqueta ya ubicada: líneas de texto, su caja, hacia dónde se alinea el texto y, si no hubo lugar libre, de dónde sale la línea de puntos. */
interface Ubicada { lineas: string[]; caja: Caja; ancla: "start" | "middle" | "end"; guia?: { x: number; y: number } }

/** R15: prueba derecha (arriba), derecha, arriba, izquierda y abajo del punto y elige la primera caja libre (sin tapar puntos, la recta ni otras etiquetas);
 *  si ninguna está libre, la lleva al borde superior unida al punto con una línea fina de puntos. */
function ubicar(ax: number, ay: number, lineas: string[], ancho: number, area: Caja, ocupado: Caja[]): Ubicada {
  const w = ancho, h = lineas.length * 10;
  const cands: [Caja, Ubicada["ancla"]][] = [
    [{ x0: ax + 6, y0: ay - 3 - h, x1: ax + 6 + w, y1: ay - 3 }, "start"],
    [{ x0: ax + 7, y0: ay - h / 2, x1: ax + 7 + w, y1: ay + h / 2 }, "start"],
    [{ x0: ax - w / 2, y0: ay - 7 - h, x1: ax + w / 2, y1: ay - 7 }, "middle"],
    [{ x0: ax - 7 - w, y0: ay - h / 2, x1: ax - 7, y1: ay + h / 2 }, "end"],
    [{ x0: ax - w / 2, y0: ay + 7, x1: ax + w / 2, y1: ay + 7 + h }, "middle"],
  ];
  for (const [c, ancla] of cands) {
    if (c.x0 < area.x0 || c.x1 > area.x1 || c.y0 < area.y0 || c.y1 > area.y1) continue;
    if (!ocupado.some((o) => choca(c, o))) return { lineas, caja: c, ancla };
  }
  // sin lugar libre: borde superior, corriendo hacia la derecha hasta encontrar hueco
  let x0 = Math.max(area.x0, Math.min(ax - w / 2, area.x1 - w));
  const y0 = area.y0 - 4;
  let caja: Caja = { x0, y0, x1: x0 + w, y1: y0 + h };
  for (let k = 0; k < 40 && ocupado.some((o) => choca(caja, o)) && caja.x1 + 4 <= area.x1; k++) { x0 += 4; caja = { x0, y0, x1: x0 + w, y1: y0 + h }; }
  return { lineas, caja, ancla: "middle", guia: { x: ax, y: ay } };
}

function Dispersion({ o, color, metrica, hoy }: { o: Corr; color: string; metrica: string; hoy: Hoy | null }) {
  const W = 260, H = 170, mg = { l: 34, r: 8, t: 12, b: 22 };
  const xs = o.pts.map((q) => q.x), ys = o.pts.map((q) => q.e.v);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  const px = (x1 - x0) * 0.08 || 1; x0 -= px; x1 += px;
  if (hoy) { x0 = Math.min(x0, hoy.x - px); x1 = Math.max(x1, hoy.x + px); }
  const y0 = Math.max(0, Math.min(...ys, hoy ? hoy.est : Infinity) - 4), y1 = Math.max(...ys, hoy ? hoy.est : -Infinity) + 4;
  const X = (v: number) => mg.l + (v - x0) / (x1 - x0) * (W - mg.l - mg.r), Y = (v: number) => H - mg.b - (v - y0) / (y1 - y0) * (H - mg.t - mg.b);

  // Etiquetas (R15): primero lo que ya ocupa lugar (puntos, recta, marcador de hoy), después "Hoy" y por último el año de cada elección
  const area: Caja = { x0: mg.l, y0: mg.t, x1: W - 2, y1: H - mg.b };
  const ocupado: Caja[] = o.pts.map((q) => ({ x0: X(q.x) - 4.5, y0: Y(q.e.v) - 4.5, x1: X(q.x) + 4.5, y1: Y(q.e.v) + 4.5 }));
  for (let k = 0; k <= 40; k++) {   // la recta de ajuste, en tramos chicos
    const xv = x0 + (x1 - x0) * k / 40, cx = X(xv), cy = Y(o.a + o.b * xv);
    ocupado.push({ x0: cx - 2, y0: cy - 2, x1: cx + 2, y1: cy + 2 });
  }
  let etHoy: Ubicada | null = null;
  if (hoy) {
    const hx = X(hoy.x), hy = Y(hoy.est);
    ocupado.push({ x0: hx - 6, y0: hy - 7, x1: hx + 6, y1: hy + 7 }, { x0: mg.l, y0: hy - 1.5, x1: hx, y1: hy + 1.5 });
    const lineas = hoy.fuera ? [`Hoy ${nf0.format(hoy.est)} %`, "extrapolado"] : [`Hoy ${nf0.format(hoy.est)} %`];
    etHoy = ubicar(hx, hy, lineas, Math.max(...lineas.map((l) => l.length)) * 5.4, area, ocupado);
    ocupado.push(etHoy.caja);
  }
  const etAnio = o.pts.map((q) => {
    const u = ubicar(X(q.x), Y(q.e.v), [q.e.anio.slice(2)], 11, area, ocupado);
    ocupado.push(u.caja);
    return u;
  });
  const texto = (u: Ubicada, estilo: React.CSSProperties) => {
    const tx = u.ancla === "start" ? u.caja.x0 : u.ancla === "end" ? u.caja.x1 : (u.caja.x0 + u.caja.x1) / 2;
    return (
      <>
        {u.guia && <line x1={u.guia.x} y1={u.guia.y} x2={(u.caja.x0 + u.caja.x1) / 2} y2={u.caja.y1} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="1 2" />}
        <text textAnchor={u.ancla} style={estilo}>
          {u.lineas.map((l, i) => <tspan key={i} x={tx} y={u.caja.y0 + 7.5 + i * 10}>{l}</tspan>)}
        </text>
      </>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Dispersión: ${o.s.n}`}>
      {niceTicks(y0, y1, 3).filter((v) => v >= y0 && v <= y1).map((v) => (
        <g key={"y" + v}><line x1={mg.l} x2={W - mg.r} y1={Y(v)} y2={Y(v)} stroke="var(--grid)" /><text x={mg.l - 4} y={Y(v) + 3} textAnchor="end" style={{ fontSize: 9 }}>{nf0.format(v)}%</text></g>
      ))}
      {niceTicks(x0, x1, 3).filter((v) => v >= x0 && v <= x1).map((v) => (
        <text key={"x" + v} x={X(v)} y={H - 8} textAnchor="middle" style={{ fontSize: 9 }}>{o.c.pct || metrica !== "nivel" ? nf0.format(v) : fmtNum(v)}</text>
      ))}
      <line x1={X(x0)} x2={X(x1)} y1={Y(o.a + o.b * x0)} y2={Y(o.a + o.b * x1)} stroke={`var(${color})`} strokeOpacity=".55" strokeDasharray="4 3" />
      {hoy && etHoy && (
        <g>
          <line x1={mg.l} x2={X(hoy.x)} y1={Y(hoy.est)} y2={Y(hoy.est)} stroke="var(--series-2)" strokeWidth="1" strokeDasharray="2 2" />
          <path d={`M${mg.l - 4},${Y(hoy.est)} l5,-3.5 v7 z`} fill="var(--series-2)"><title>{`Valor estimado hoy: ${nf1.format(hoy.est)}%`}</title></path>
          <path d={`M${X(hoy.x)},${Y(hoy.est) - 6} l5.5,6 l-5.5,6 l-5.5,-6 z`} fill="var(--series-2)" stroke="var(--surface-1)" strokeWidth="1">
            <title>{`Hoy: ${o.s.n} ${nf1.format(hoy.x)} → ${nf1.format(hoy.est)}% estimado por la recta${hoy.fuera ? " (fuera de lo visto antes)" : ""}`}</title>
          </path>
          {texto(etHoy, { fontSize: 9, fontWeight: 700, fill: "var(--text-primary)" })}
        </g>
      )}
      {o.pts.map((q, k) => {
        const cx = X(q.x), cy = Y(q.e.v);
        return (
          <g key={q.e.f}>
            <circle cx={cx} cy={cy} r="3.5" fill={q.e.tipo === "pres" ? `var(${color})` : "var(--surface-1)"} stroke={`var(${color})`} strokeWidth="1.5">
              <title>{`${q.e.anio} ${q.e.tipo === "pres" ? "presidencial" : "legislativa"}: ${q.e.of} ${nf1.format(q.e.v)}% · ${o.s.n}: ${nf1.format(q.x)}`}</title>
            </circle>
            {texto(etAnio[k], { fontSize: 9, fill: "var(--text-secondary)" })}
          </g>
        );
      })}
    </svg>
  );
}

export function Elecciones() {
  const [p, set, montado] = useParams();
  const sec = useSeccion("todo");
  const info = useBase("elecciones", p, set, montado), b = info.b;
  const { motor: m, version } = sec;
  const [ord, setOrd] = useState<{ k: string; d: number }>({ k: "abs", d: -1 });
  const [buscar, setBuscar] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [hoja, setHoja] = useState(false);
  const [hojaTipos, setHojaTipos] = useState(false);
  const [hojaMedir, setHojaMedir] = useState(false);
  const PRES = useMemo(() => (m ? crearPres(m.F) : []), [m]);
  const ELEC = useMemo(() => (m ? crearElec(m.F) : []), [m]);
  const tipos = new Set(lista(p.has("et") ? p.get("et") : "pres,leg").filter((t) => t === "pres" || t === "leg"));
  const corte = Number(unoDe(p.get("elr"), ["0.3", "0.4", "0.5", "0.6", "0.7", "0.8"] as const, "0.6"));
  const metrica = unoDe(p.get("em"), ["var12", "nivel", "mandato"] as const, "var12");
  const minN = enteroEn(p.get("emn"), 4, 16, 6);
  const conIpc = unoDe(p.get("eipc"), ["no", "si"] as const, "no");
  const clave = [...tipos].sort().join() + metrica + JSON.stringify(b);

  const todas = useMemo<Corr[]>(() => {
    if (!m || sec.ocupado) return [];
    const base = m.base();
    const elec = ELEC.filter((e) => tipos.has(e.tipo) && e.i > 0);
    const res: Corr[] = [];
    Object.values(m.SER).forEach((s) => {
      if (s.id === "poblacion" || s.id === "pib_nom_anual") return;
      // el IPC se sigue midiendo en interanual acá, como antes de que "Inflación" pasara a abrir en mensual: el cálculo no cambia
      const ind: Expr = { id: s.id, med: s.id === "ipc_empalme" ? "via" : m.medDefault(s), rel: null, modo: "compra", esc: s.agg && base.PIB_AN && s.tipo !== "none" ? "pib" : "" };
      const c = m.calc(ind);
      const pts = elec.map((e) => ({ e, x: valorElec(m, m.F, PRES, metrica, b, c, e, ind) })).filter((q) => ok(q.x)) as Corr["pts"];
      if (pts.length < 4) return;
      const pr = pearson(pts.map((q) => q.x), pts.map((q) => q.e.v));
      if (!pr) return;
      res.push({ s, ind, c, pts, ...pr, n: pts.length });
    });
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, sec.ocupado, version, clave, ELEC, PRES]);

  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!m || !montado) return <Cargando />;
  if (sec.ocupado) return <Cargando />;

  const toks = norm(buscar.trim()) ? norm(buscar.trim()).split(/\s+/) : [];
  const filas = todas.filter((o) => o.n >= minN && (conIpc === "si" || !esDetalle(o.s)) && (!toks.length || toks.every((k) => textoBusqueda(o.s).includes(k))));
  const val = (o: Corr) => (ord.k === "abs" ? Math.abs(o.r) : ord.k === "r" ? o.r : o.n);
  filas.sort((a, c) => (val(a) - val(c)) * ord.d);
  const el = ELEC.filter((e) => tipos.has(e.tipo));
  const elegidos = sel.length ? sel.map((id) => todas.find((o) => o.s.id === id)).filter(Boolean) as Corr[] : filas.slice().sort((a, c) => Math.abs(c.r) - Math.abs(a.r)).slice(0, 12);
  const th = (k: string, t: string) => (
    <th aria-sort={ord.k === k ? (ord.d > 0 ? "ascending" : "descending") : "none"}>
      <button type="button" className="elec-th" onClick={() => setOrd(ord.k === k ? { k, d: -ord.d } : { k, d: -1 })}>{t}{ord.k === k ? (ord.d > 0 ? " ▲" : " ▼") : ""}</button>
    </th>
  );
  const sinDetalle = todas.filter((o) => !esDetalle(o.s));
  const voto = estimarVoto(m, m.F, PRES, metrica, b, sinDetalle, corte);
  const ultG = ultimoGlobalDe(sinDetalle);
  const hoyDe = (o: Corr): Hoy | null => {
    const x = valorHoy(m, m.F, PRES, metrica, b, o, ultG);
    if (!ok(x)) return null;
    const xs = o.pts.map((q) => q.x);
    return { x, est: Math.max(0, Math.min(100, o.a + o.b * x)), fuera: x < Math.min(...xs) || x > Math.max(...xs) };
  };
  const ultima = el.length ? el[el.length - 1] : null;
  const textoRel = (o: Corr) => `Cuanto ${metrica === "nivel" ? "más alto" : "más subió"} → ${o.r > 0 ? "más" : "menos"} votos al oficialismo`;

  const rta = voto ? fraseVoto(voto, corte) : null;
  // R11: Compartir con imagen en el título de cada capítulo con datos (V7); el link lleva al capítulo. La vista lleva lo que se ve, ya calculado.
  const hrefCap = (id: string) => () => `${window.location.pathname}${window.location.search}#${id}`;
  const medirTxt = METRICA_E[metrica][0].toLowerCase();
  const vistaHoy = (): VistaElec | null => (rta ? {
    tipo: "elec-hoy", cifra: rta.cifra, rotulo: rta.rotulo, frases: rta.frases, medir: medirTxt,
    referencia: ultima ? `Como referencia, el último resultado real del oficialismo fue ${nf1.format(ultima.v)} % (${ultima.of}, ${fmtMes(ultima.f)}).` : null,
  } : null);
  const vistaDisp = (): VistaElec | null => (elegidos.length ? {
    tipo: "elec-dispersion", graficos: elegidos.slice(0, MAX_DISP_IMG).map((o) => graficoDisp(o, metrica, hoyDe(o))), total: elegidos.length, elegidas: sel.length > 0, medir: medirTxt,
  } : null);
  const vistaCorr = (): VistaElec | null => {
    const top = filas.slice().sort((a, c) => Math.abs(c.r) - Math.abs(a.r));
    return top.length ? { tipo: "elec-correlacion", filas: top.slice(0, MAX_CORR_IMG).map(filaCorr), total: top.length, medir: medirTxt } : null;
  };
  const tiposTxt = tipos.size === 2 ? "Presidenciales y legislativas" : tipos.has("pres") ? "Presidenciales" : tipos.has("leg") ? "Legislativas" : "Ninguna elección";
  const resumen = [tiposTxt, `Medir: ${METRICA_E[metrica][0].toLowerCase()}`, `|r| ≥ ${nf1.format(corte)}`, `${filas.length} variables · mín. ${minN} elecciones`, conIpc === "si" ? "Con detalle regional" : "Sin detalle regional"].join(" · ");

  return (
    <section>
      <Capitulo id="elec-hoy" titulo="¿Qué dicen los datos sobre el voto al oficialismo hoy?"
        bajada="Cada variable se compara con el % que sacó el oficialismo nacional en cada elección desde 1995."
        acciones={<>
          <InfoPunto etiqueta="Cómo leer estos números">
            <p>Para cada variable se calcula su valor en cada elección ({METRICA_E[metrica][1]}) y se lo compara con el % que sacó el oficialismo nacional. <b>r</b> es la correlación: +1 = se mueven juntos, −1 = al revés, 0 = nada que ver. Con tan pocas elecciones ({el.length}), una correlación alta puede ser casualidad; con menos de 8 puntos, |r| por debajo de ~0,7 no dice mucho. Los montos de toda la economía se miden como % del PIB y los montos en pesos, en pesos reales.</p>
          </InfoPunto>
          {voto && rta && <BotonCompartir className="compartir" titulo="Primero los Datos: voto al oficialismo hoy" href={hrefCap("elec-hoy")} crearVista={vistaHoy}><IconoCompartir />Compartir</BotonCompartir>}
        </>}>
        {!voto ? <p className="note">Con las elecciones y la medida elegidas no hay suficientes variables para estimar nada (hacen falta al menos 3 con 8 elecciones o más).</p> : (
          <>
            {rta && rta.cifra && (
              <p className="elec-cifra"><span className="elec-num">{rta.cifra}</span><span className="elec-rot">{rta.rotulo}</span></p>
            )}
            {rta && rta.frases.map((f) => <p key={f} className="elec-frase">{f}</p>)}
            {ultima && <p className="elec-frase">Como referencia, el último resultado real del oficialismo fue <b>{nf1.format(ultima.v)} %</b> ({ultima.of}, {fmtMes(ultima.f)}).</p>}
          </>
        )}
        <p className="elec-aviso">
          <span><b>Ejercicio estadístico, no un pronóstico.</b> Se basa en pocas elecciones y una relación entre dos datos no prueba que uno cause el otro.</span>
          <InfoPunto etiqueta="Más sobre este ejercicio">
            <p><b>Ejercicio estadístico, no un pronóstico.</b> Se basa en pocas elecciones y una relación entre dos datos no prueba que uno cause el otro.</p>
            <p>Lo que dice el resultado <b>no es una encuesta ni un pronóstico</b>: son cuentas simples con pocas elecciones, que muestran qué pasó en el pasado cuando la economía estaba como hoy, no qué va a pasar. Una relación fuerte puede ser casualidad.</p>
          </InfoPunto>
        </p>
        <BarraResumen resumen={resumen} onAjustes={() => setHoja(true)}
          extras={<>
            <button type="button" className="vistabar-ajustes" aria-haspopup="dialog" onClick={() => setHojaTipos(true)}>Elecciones</button>
            <button type="button" className="vistabar-ajustes" aria-haspopup="dialog" onClick={() => setHojaMedir(true)}>Medir</button>
          </>} />
        <HojaListo titulo="Elecciones" abierta={hojaTipos} onCerrar={() => setHojaTipos(false)}>
          {() => (
            <div className="elec-hoja">
              <Pildoras titulo="Elecciones" valor={tipos} onElegir={(v) => { const n = alternar(tipos, v); set({ et: n.size === 2 ? null : [...n].join(",") }); }}
                onTodos={() => set({ et: null })}
                opciones={[["pres", "Presidenciales"], ["leg", "Legislativas"]]} />
            </div>
          )}
        </HojaListo>
        <HojaListo titulo="Medir" abierta={hojaMedir} onCerrar={() => setHojaMedir(false)}>
          {() => (
            <div className="elec-hoja">
              <Opciones titulo="Medir" forma="lista" valor={metrica} onElegir={(v) => set({ em: v === "var12" ? null : v })}
                opciones={Object.entries(METRICA_E).map(([k, v]) => [k, v[0]] as [string, string])} />
              {metrica === "mandato" && <LineaInicio info={info} F={m.F} />}
            </div>
          )}
        </HojaListo>
        <HojaListo titulo="Ajustes" abierta={hoja} onCerrar={() => setHoja(false)}>
          {() => (
            <div className="elec-hoja">
              <Opciones titulo="Relación mínima (|r|)" forma="seis" valor={String(corte)} onElegir={(v) => set({ elr: v === "0.6" ? null : v })}
                opciones={CORTES_R.map((r) => [String(r), nf1.format(r)] as [string, string])} />
              <div className="elec-grupo">
                <label className="elec-rotulo" htmlFor="e_minn">Mínimo de elecciones</label>
                <input id="e_minn" type="number" className="elec-num-n" min={4} max={16} value={minN} onChange={(ev) => set({ emn: String(Math.max(4, Math.min(16, +ev.target.value || 6))) })} />
              </div>
              <Opciones titulo="Detalle regional de precios" forma="lista" valor={conIpc} onElegir={(v) => set({ eipc: v === "no" ? null : v })}
                opciones={[["no", "Sin detalle regional de precios"], ["si", "Con todo"]]} />
            </div>
          )}
        </HojaListo>
        {voto && (
          <>
            <details className="elec-mas">
              <summary>Cómo se calcula</summary>
              <p className="note">Para cada variable se ajustó una recta y se la evaluó en el valor de hoy, medido igual que en las elecciones ({METRICA_E[metrica][0].toLowerCase()}). Se usan las variables con al menos 8 elecciones; las de relación fuerte van primero y resaltadas.</p>
              <p className="note"><b>Cómo se pondera:</b> el número ponderado promedia las estimaciones de todas las variables, y cada una pesa según su r² (&quot;cuánto del voto acompaña a la variable&quot;: 0 % = nada, 100 % = todo). Ojo: muchas variables miden casi lo mismo (varios salarios, por ejemplo), y eso hace que ese tema pese más de lo que correspondería.</p>
            </details>
            <details className="elec-mas">
              <summary>Ver las {voto.vars.length} variables detrás del número</summary>
              <div className="tablewrap alto fija"><table>
                <thead><tr><th>Variable</th><th>r</th><th>Peso</th><th>Valor de hoy</th><th>% estimado</th></tr></thead>
                <tbody>{voto.vars.map((v) => (
                  <tr key={v.o.s.id} className={v.fuerte ? "fila-fuerte" : ""}>
                    <CeldaVar nombre={v.o.s.n} unidad={v.o.c.unidad} extra={v.fuera ? <small title="El valor de hoy está fuera del rango que tuvo esta variable en las elecciones: es una extrapolación">fuera de lo visto antes</small> : null} />
                    <Valor tono={null}>{fmtR(v.o.r)}</Valor>
                    <td>{nf1.format(v.peso * 100)} %</td>
                    <td>{metrica === "nivel" ? v.o.c.pct ? nf1.format(v.hoy) + " %" : fmtNum(v.hoy) : (v.hoy > 0 ? "+" : "") + nf1.format(v.hoy) + (v.o.c.pct ? " pp" : " %")}</td>
                    <td>{nf1.format(v.est)} %</td>
                  </tr>
                ))}</tbody>
              </table></div>
            </details>
          </>
        )}
      </Capitulo>

      <Capitulo id="elec-dispersion" titulo="Gráficos de dispersión"
        bajada={`${sel.length ? `${elegidos.length} variables elegidas.` : "Las 12 de correlación más fuerte (elegí otras con \"+ graficar\")."} Lleno = presidencial, vacío = legislativa; rombo = hoy.`}
        acciones={<>
          {sel.length > 0 && <button type="button" className="btn elec-vuelta" onClick={() => setSel([])}>Volver a las 12 más fuertes</button>}
          {elegidos.length > 0 && <BotonCompartir className="compartir" titulo="Primero los Datos: gráficos de dispersión" href={hrefCap("elec-dispersion")} crearVista={vistaDisp}><IconoCompartir />Compartir</BotonCompartir>}
        </>}>
        <div className="elec-disps">
          {elegidos.map((o, k) => (
            <div className="elec-disp" key={o.s.id}><div className="elec-disp-k">{o.s.n}</div><div className="elec-disp-d">r = {fmtR(o.r)} · {o.n} elecciones</div>
              <Dispersion o={o} color={PALETA[k % 8]} metrica={metrica} hoy={hoyDe(o)} />
              {!hoyDe(o) && <div className="elec-disp-d">Sin dato actual: la serie no tiene datos recientes.</div>}
              <div className="elec-disp-d">eje X: {metrica === "nivel" ? o.c.unidad : o.c.pct ? "cambio en puntos" : "cambio %"} · eje Y: % del oficialismo</div></div>
          ))}
        </div>
      </Capitulo>

      <Capitulo id="elec-correlacion" titulo="Correlación de cada variable con el voto al oficialismo"
        bajada={`${filas.length} variables${filas.length > 300 ? " (se muestran las primeras 300)" : ""}. Tocá un encabezado para ordenar.`}
        acciones={filas.length > 0 ? <BotonCompartir className="compartir" titulo="Primero los Datos: correlación con el voto" href={hrefCap("elec-correlacion")} crearVista={vistaCorr}><IconoCompartir />Compartir</BotonCompartir> : undefined}>
        <input type="search" className="elec-buscar" aria-label="Buscar variable" placeholder="Buscar variable: salario, inflación, dólar…" value={buscar} onChange={(ev) => setBuscar(ev.target.value)} />
        <div className="tablewrap alto fija elec-corr"><table>
          <thead><tr><th>Variable</th>{th("r", "r")}{th("abs", "Fuerza |r|")}{th("n", "Elecciones")}<th style={{ textAlign: "left" }}>Qué dice</th><th>Gráfico</th><th><span className="sr-solo">Qué es la variable</span></th></tr></thead>
          <tbody>
            {filas.slice(0, 300).map((o) => {
              const on = sel.includes(o.s.id);
              return (
                <tr key={o.s.id}><CeldaVar nombre={o.s.n} />
                  <Valor tono={null}>{fmtR(o.r)}</Valor>
                  <td><span className="barrita" style={{ ["--w" as string]: `${Math.round(Math.abs(o.r) * 100)}%` }} />{nf0.format(o.r * o.r * 100)} %<small>r²</small></td>
                  <td>{o.n}</td><td className="unidad">{textoRel(o)}</td>
                  <td><button type="button" className={`btn elec-graficar${on ? " on" : ""}`} aria-pressed={on} onClick={() => setSel(on ? sel.filter((x) => x !== o.s.id) : [...sel, o.s.id])}>{on ? "✓ en gráficos" : "+ graficar"}</button></td>
                  <td className="elec-info-col"><BotonInfo id={o.s.id} /></td></tr>
              );
            })}
            {!filas.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)" }}>Nada para mostrar.</td></tr>}
          </tbody>
        </table></div>
      </Capitulo>

      <details className="elec-mas elec-usadas"><summary>Ver las elecciones usadas</summary>
        <p className="note">Presidenciales: primera vuelta. Legislativas: diputados nacionales, total del país; son aproximadas porque las alianzas cambian de nombre entre provincias. En 2003 el &quot;oficialismo&quot; es Kirchner, el candidato que apoyó Duhalde.</p>
        <div className="tablewrap fija"><table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th style={{ textAlign: "left" }}>Oficialismo</th><th>% de votos</th><th>Resultado</th></tr></thead>
          <tbody>{ELEC.map((e) => <tr key={e.f}><td>{fmtMes(e.f)}</td><td>{e.tipo === "pres" ? "Presidencial (1ª vuelta)" : "Legislativa (diputados, aprox.)"}</td><td className="unidad">{e.of}</td><td>{nf1.format(e.v)} %</td><td>{e.gano ? "Ganó" : "Perdió"}</td></tr>)}</tbody>
        </table></div></details>
    </section>
  );
}

/** Un grupo de opciones de la hoja de ajustes: botones de 44 px que se marcan. `forma` fija cuántas van por renglón para que nunca se parta un grupo. */
function Opciones({ titulo, opciones, valor, onElegir, forma }: {
  titulo: string; opciones: [string, string][]; valor: string | Set<string>; onElegir: (v: string) => void; forma: "dos" | "seis" | "lista";
}) {
  const activo = (v: string) => (valor instanceof Set ? valor.has(v) : valor === v);
  return (
    <div className="elec-grupo" role="group" aria-label={titulo}>
      <span className="elec-rotulo">{titulo}</span>
      <div className="elec-opcs" data-forma={forma}>
        {opciones.map(([v, t]) => <button key={v} type="button" className="elec-opc" aria-pressed={activo(v)} onClick={() => onElegir(v)}>{t}</button>)}
      </div>
    </div>
  );
}

/** Frases de la respuesta, solo con lo que ya calcula `estimarVoto` y los valores redondeados que se ven. */
function fraseVoto(voto: NonNullable<ReturnType<typeof estimarVoto>>, corte: number): { cifra: string | null; rotulo: string; frases: string[] } {
  const frases: string[] = [];
  const fuerte = voto.fuerte
    ? `Con las ${voto.fuertes} variables de relación fuerte (|r| ≥ ${nf1.format(corte)}), la cuenta da entre ${nf0.format(voto.fuerte.min)} % y ${nf0.format(voto.fuerte.max)} %, con una mediana de ${nf0.format(voto.fuerte.mediana)} %.`
    : `Con relación fuerte (|r| ≥ ${nf1.format(corte)}) no alcanza: hay ${voto.fuertes} variable${voto.fuertes === 1 ? "" : "s"} y hacen falta al menos 3.`;
  frases.push(fuerte);
  if (voto.ponderada != null) return { cifra: `${nf1.format(voto.ponderada)} %`, rotulo: "con todas las variables, ponderadas por r²", frases };
  frases.push("La cuenta ponderada de todas las variables no se muestra: ninguna acompaña al voto (la suma de r² es muy baja).");
  return voto.fuerte ? { cifra: `${nf0.format(voto.fuerte.mediana)} %`, rotulo: "mediana de las variables de relación fuerte", frases } : { cifra: null, rotulo: "", frases };
}
