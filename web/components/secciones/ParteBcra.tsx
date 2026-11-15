"use client";
// Parte diario del Banco Central (/bcra/, docs/specs/parte-diario-bcra.md): una fila por variable con su último dato, su fecha, sus
// comparaciones y un gráfico chico; al tocarla se despliega el gráfico grande debajo de la fila. Compartir: imagen, texto para pegar en redes y link.
import { useEffect, useMemo, useRef, useState } from "react";
import { useDiario } from "../useDiario";
import { Cargando, Modal } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { CabeceraDato } from "../sistema/CabeceraDato";
import { CompartirHoja } from "../sistema/CompartirHoja";
import { Delta } from "../sistema/Delta";
import { IconoBanco } from "./BloqueParte";
import { FilaChips } from "../sistema/FilaChips";
import { Sparkline } from "../Sparkline";
import { GraficoDiario } from "../GraficoDiario";
import { PanelParte } from "../PanelParte";
import {
  aclaracionFila, cambiosDe, claveDePeriodo, diaDeIso, esClaveDiario, esPeriodoDiario, extremosTramo, fmtDia, inicioTramo, isoDeDia, limitesSerie, lineaCompras, netoTxt, PERIODO_DEFECTO, PERIODOS_DIARIO, rangoDeUrl, rangoTxt, recorte, resumenRuedas, textoParte, variableDe,
  type ClaveDiario, type Diario, type Parte, type PeriodoDiario, type PeriodoElegido, type RangoDiario, type ResumenVariable, type SerieDiaria,
} from "@/lib/diario";
import { MESES, nf0 } from "@/lib/formato";
import { useParams } from "@/lib/url";

const RUTA = "/bcra/";

/** "2026-11-12T12:50:08-03:00" → "12-nov, 12:50" (la hora ya viene en hora argentina). */
function actualizadoTxt(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(iso);
  return m ? `${m[3]}-${MESES[+m[2] - 1]}, ${m[4]}` : null;
}

export function ParteBcra() {
  const { datos, parte, error } = useDiario();
  if (error) return <div className="parte-error"><p className="error" role="alert">{error}</p><p className="note">El resto del sitio sigue funcionando. Probá de nuevo en un rato.</p></div>;
  if (!datos || !parte) return <Cargando texto="Cargando el parte…" />;
  return <Cuerpo datos={datos} parte={parte} />;
}

function Cuerpo({ datos, parte }: { datos: Diario; parte: Parte }) {
  const [p, set, montado] = useParams();
  const [imagen, setImagen] = useState(false);
  const claveUrl = montado && esClaveDiario(p.get("v")) ? (p.get("v") as ClaveDiario) : null;
  const periodo = esPeriodoDiario(p.get("per")) ? (p.get("per") as PeriodoDiario) : PERIODO_DEFECTO;
  // Rango de fechas elegido (`pd`, `ph`): si hay `pd`, gana sobre `per`.
  const pd = montado ? p.get("pd") : null, ph = montado ? p.get("ph") : null;
  const rango = useMemo(() => rangoDeUrl(pd, ph), [pd, ph]);
  const elegido: PeriodoElegido = rango ?? periodo;
  const texto = useMemo(() => textoParte(parte), [parte]);
  const titulo = `Parte del Banco Central del ${parte.fechaTxt}`;
  const act = actualizadoTxt(parte.actualizado);
  const principal = variableDe(parte, "reservas") ?? parte.variables[0];

  // Una sola fila abierta a la vez. `montada` es la que está en el árbol (sigue ahí mientras se cierra con animación); `desplegada`, si está abierta.
  const [montada, setMontada] = useState<ClaveDiario | null>(null);
  const [desplegada, setDesplegada] = useState(false);
  const llevada = useRef(false);
  useEffect(() => {
    if (claveUrl && parte.variables.some((v) => v.clave === claveUrl)) {
      setMontada(claveUrl);
      setDesplegada(false);   // de una variable a otra: la nueva también entra con su animación
      const id = setTimeout(() => setDesplegada(true), 16);   // un cuadro después de montar, para que la transición arranque desde cerrado
      return () => clearTimeout(id);
    }
    setDesplegada(false);
    const t = setTimeout(() => setMontada(null), 260);
    return () => clearTimeout(t);
  }, [claveUrl, parte]);
  // Link compartido (`v` al cargar): se lleva la fila a la vista una sola vez; al tocar una fila la página no se mueve.
  useEffect(() => {
    if (llevada.current || !claveUrl || montada !== claveUrl) return;
    llevada.current = true;
    document.getElementById(`parte-fila-${claveUrl}`)?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [claveUrl, montada]);
  // Al cerrar el gráfico (con "Cerrar", tocando la fila o con Atrás) la página queda en la fila que se abrió (R23): con el panel ya plegado,
  // si la fila no se ve entera se la lleva a la vista con suavidad; si ya está a la vista, no se mueve.
  const abierta = useRef<ClaveDiario | null>(null);
  useEffect(() => {
    if (claveUrl) { abierta.current = claveUrl; return; }
    const c = abierta.current;
    if (!c) return;
    abierta.current = null;
    const id = setTimeout(() => {
      const el = document.getElementById(`parte-fila-${c}`);
      if (!el) return;
      const r = el.getBoundingClientRect(), tope = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      if (r.top >= tope && r.bottom <= window.innerHeight) return;
      const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: r.top < tope ? "start" : "nearest", behavior: quieto ? "auto" : "smooth" });
    }, 300);   // un poco más que lo que tarda en plegarse el panel (--d-2)
    return () => clearTimeout(id);
  }, [claveUrl]);
  const alternar = (c: ClaveDiario) => { llevada.current = true; set(claveUrl === c ? { v: null, per: null, pd: null, ph: null } : { v: c }); };

  return (
    <section className="parte">
      <p className="bcra-vivo"><IconoBanco /><span>En vivo · Banco Central</span></p>
      <CabeceraDato nivel={2} titulo={principal.nombre} cifra={principal.valorCorto} unidad={principal.unidad}
        fecha={principal.atrasada ? `Último dato: ${principal.fechaTxt}` : principal.fechaTxt}
        deltas={cambiosDe(principal)} frase={principal.frases[0]} info={principal.que} />

      <Capitulo titulo="Todas las variables" bajada={`Datos del ${parte.fechaTxt}. Cada dato lleva su fecha: algunos se publican con unos días de atraso. Tocá una para ver su gráfico.`}
        acciones={<CompartirHoja href={RUTA} titulo={titulo} onImagen={() => setImagen(true)} texto={texto} />}>
        <ul className="parte-v-lista">
          {parte.variables.map((v) => {
            const serie = datos.series[v.clave];
            const esta = montada === v.clave && !!serie;
            return (
              <li key={v.clave} id={`parte-fila-${v.clave}`} className="parte-item">
                <Fila v={v} abierta={esta && desplegada} onAlternar={() => alternar(v.clave)} />
                {esta && (
                  <div id={`parte-panel-${v.clave}`} className="bcra-panel" data-abierto={desplegada} role="region" aria-label={`Gráfico de ${v.nombre}`}>
                    <div className="bcra-panel-in">
                      <Panel v={v} serie={serie!} periodo={elegido} rango={rango}
                        onPeriodo={(x) => set({ per: x === PERIODO_DEFECTO ? null : x, pd: null, ph: null })}
                        onRango={(d, h) => set({ pd: d, ph: h, per: null })}
                        onCerrar={() => set({ v: null, per: null, pd: null, ph: null })} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Capitulo>

      <details className="parte-mide">
        <summary>Cómo se mide</summary>
        <p className="note">Fuente: BCRA (Banco Central de la República Argentina), estadísticas monetarias.{act ? ` Última actualización del sitio: ${act}.` : ""} Las diferencias se calculan con los valores como se muestran.</p>
      </details>

      {imagen && <PanelParte parte={parte} href={RUTA} onCerrar={() => setImagen(false)} />}
    </section>
  );
}

/** Lo que se despliega debajo de una fila: período (atajos o fechas elegidas), gráfico, (compras) resumen de ruedas debajo del gráfico, extremos, comparaciones y frases. */
function Panel({ v, serie, periodo, rango, onPeriodo, onRango, onCerrar }: {
  v: ResumenVariable; serie: SerieDiaria; periodo: PeriodoElegido; rango: RangoDiario | null;
  onPeriodo: (p: string) => void; onRango: (desde: string, hasta: string) => void; onCerrar: () => void;
}) {
  const [fechas, setFechas] = useState(false);
  return (
    <div className="bcra-panel-cuerpo">
      <p className="bcra-que">{v.que}. En {v.unidad}, datos diarios.</p>
      <div className="bcra-periodo">
        <FilaChips opciones={PERIODOS_DIARIO} valor={rango ? "" : (periodo as PeriodoDiario)} etiqueta="Período del gráfico" onElegir={onPeriodo} />
        <button type="button" className="bcra-fechas" aria-pressed={!!rango} aria-haspopup="dialog" onClick={() => setFechas(true)}>
          {rango ? rangoTxt(rango, serie) : "Elegir fechas"}
        </button>
      </div>
      <GraficoDiario clave={v.clave} serie={serie} periodo={periodo} etiqueta={v.nombre} />
      {v.clave === "compras" && <Ruedas serie={serie} periodo={periodo} />}
      <Extremos v={v} serie={serie} periodo={periodo} />
      {v.filas.length > 0 && (
        <ul className="parte-v-comp">
          {v.filas.map((f) => (
            <li key={f.rotulo} aria-label={`${f.rotulo}, ${f.nota}: ${f.valor}${f.sub ? ", " + f.sub : ""}`}>
              <span className="parte-v-rot">{f.rotulo}<small>{f.nota}</small></span>
              <span className={`parte-v-val var-${f.cls}`}>{f.valor}{f.sub && <small>{f.sub}</small>}</span>
            </li>
          ))}
        </ul>
      )}
      {v.frases.length > 0 && <ul className="parte-v-frases">{v.frases.map((t) => <li key={t}>{t}</li>)}</ul>}
      <button type="button" className="parte-cerrar" onClick={onCerrar}>Cerrar el gráfico</button>
      {fechas && <ModalFechas serie={serie} periodo={periodo} onCerrar={() => setFechas(false)} onAplicar={(d, h) => { setFechas(false); onRango(d, h); }} />}
    </div>
  );
}

/** Ventana "Elegir fechas": Desde y Hasta (campos de fecha limitados a las fechas con datos de la variable). Arranca con el tramo que se ve. */
function ModalFechas({ serie, periodo, onCerrar, onAplicar }: { serie: SerieDiaria; periodo: PeriodoElegido; onCerrar: () => void; onAplicar: (desde: string, hasta: string) => void }) {
  const { min, max } = limitesSerie(serie);
  const tramo = recorte(serie.clave, serie, periodo);
  const [desde, setDesde] = useState(isoDeDia(tramo.dias[0]));
  const [hasta, setHasta] = useState(isoDeDia(tramo.dias[tramo.dias.length - 1]));
  const a = diaDeIso(desde), b = diaDeIso(hasta);
  const datos = `Hay datos del ${fmtDia(min, true)} al ${fmtDia(max, true)}.`;
  const error = a === null || b === null ? "Elegí las dos fechas." : a < min || b > max || a > max || b < min ? datos : a > b ? "Desde tiene que ser anterior o igual a Hasta." : "";
  return (
    <Modal titulo="Elegir fechas" onCerrar={onCerrar}>
      <form className="bcra-form-fechas" onSubmit={(ev) => { ev.preventDefault(); if (!error) onAplicar(desde, hasta); }}>
        <div className="bcra-campo">
          <label htmlFor="bcra-desde">Desde</label>
          <input id="bcra-desde" type="date" value={desde} min={isoDeDia(min)} max={isoDeDia(max)} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="bcra-campo">
          <label htmlFor="bcra-hasta">Hasta</label>
          <input id="bcra-hasta" type="date" value={hasta} min={isoDeDia(min)} max={isoDeDia(max)} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <p className="note bcra-nota" role="status">{error || `${datos} El gráfico y el resumen siguen este rango.`}</p>
        <button type="submit" className="btn primario" disabled={!!error}>Aplicar</button>
      </form>
    </Modal>
  );
}

/** Resumen de ruedas del período elegido (compras del Banco Central), debajo del gráfico. */
function Ruedas({ serie, periodo }: { serie: SerieDiaria; periodo: PeriodoElegido }) {
  const k = claveDePeriodo(periodo);
  const r = useMemo(() => resumenRuedas(serie, periodo), [serie, k]); // eslint-disable-line react-hooks/exhaustive-deps
  const celdas: [string, string, string | null, string?][] = [
    ["Ruedas compradoras", nf0.format(r.compra.n), r.compra.n ? `US$ ${nf0.format(r.compra.total)} millones` : null],
    ["Sin intervención", nf0.format(r.sinOperar), null],
    ["Ruedas vendedoras", nf0.format(r.venta.n), r.venta.n ? `US$ ${nf0.format(r.venta.total)} millones` : null],
    ["Neto del período", `US$ ${netoTxt(r.neto)} millones`, null, r.neto > 0 ? "bueno" : r.neto < 0 ? "malo" : "neutro"],
    ["Promedio por rueda", r.promedio === null ? "—" : `US$ ${netoTxt(r.promedio)} millones`, `${nf0.format(r.ruedas)} ${r.ruedas === 1 ? "rueda" : "ruedas"}`, r.promedio ? (r.promedio > 0 ? "bueno" : "malo") : "neutro"],
  ];
  return (
    <dl className="bcra-ruedas" aria-label={`Ruedas del ${fmtDia(r.desde, true)} al ${fmtDia(r.hasta, true)}`}>
      {celdas.map(([rot, val, sub, cls]) => (
        <div key={rot}><dt>{rot}</dt><dd className={cls ? `var-${cls}` : undefined}>{val}{sub && <small>{sub}</small>}</dd></div>
      ))}
    </dl>
  );
}

/** El valor más alto y el más bajo del período elegido. */
function Extremos({ v, serie, periodo }: { v: ResumenVariable; serie: SerieDiaria; periodo: PeriodoElegido }) {
  const k = claveDePeriodo(periodo);
  const e = useMemo(() => extremosTramo(v.clave, recorte(v.clave, serie, periodo)), [v.clave, serie, k]); // eslint-disable-line react-hooks/exhaustive-deps
  const i = useMemo(() => inicioTramo(v.clave, recorte(v.clave, serie, periodo)), [v.clave, serie, k]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = i.cambio;
  return (
    <dl className="parte-extremos">
      <div><dt>Más alto del período</dt><dd>{e.alto.valor}<small>{e.alto.fecha}</small></dd></div>
      <div><dt>Más bajo del período</dt><dd>{e.bajo.valor}<small>{e.bajo.fecha}</small></dd></div>
      <div><dt>Al inicio del período</dt><dd>{i.valor}<small>{i.fecha}</small></dd></div>
      {c && (
        <div><dt>Variación desde el inicio</dt>
          <dd><Delta texto={c.texto} tono={c.tono} dir={c.dir} contra={c.contra} etiqueta={c.etiqueta} />{c.pct && <small>{c.pct}</small>}</dd></div>
      )}
    </dl>
  );
}

/** Una variable: toda la fila se toca y despliega su gráfico debajo. A la izquierda nombre, cifra grande, fecha y un renglón chico con las dos variaciones
 *  (con flecha, sin repetir la unidad); a la derecha el minigráfico, del alto de la fila. */
function Fila({ v, abierta, onAlternar }: { v: ResumenVariable; abierta: boolean; onAlternar: () => void }) {
  const colorValor = v.tipo === "flujo" && v.cls !== "neutro" ? ` var-${v.cls}` : "";
  const cambios = cambiosDe(v, true);
  const extra = v.clave === "compras" ? lineaCompras(v) : "";
  return (
    <button type="button" className="parte-v" aria-expanded={abierta} aria-controls={abierta ? `parte-panel-${v.clave}` : undefined} aria-label={`${abierta ? "Cerrar" : "Ver"} el gráfico de ${v.nombre}`} onClick={onAlternar}>
      <span className="parte-v-txt">
        <span className="parte-v-nombre">{v.nombre}</span>
        <span className="parte-v-cifra">
          {v.etiqueta && <span className={`parte-v-etq var-${v.cls}`}>{v.etiqueta}</span>}
          <b className={`parte-v-valor${colorValor}`}>{v.valor}</b>
        </span>
        <span className="parte-v-fecha">{[aclaracionFila(v.clave), v.atrasada ? `último dato: ${v.fechaTxt}` : v.fechaTxt].filter(Boolean).join(" · ")}</span>
        {cambios.length > 0 && <span className="parte-v-cambios">{cambios.map((c) => <Delta key={c.contra} texto={c.texto} tono={c.tono} dir={c.dir} contra={c.contra} etiqueta={c.etiqueta} />)}</span>}
        {extra && <span className="parte-v-extra">{extra}</span>}
      </span>
      <span className="parte-v-spark"><Sparkline v={v.spark} desde={0} /></span>
    </button>
  );
}
