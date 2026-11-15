"use client";
// Parte diario del Banco Central (/bcra/, docs/specs/parte-diario-bcra.md): una fila por variable con su último dato, su fecha, sus
// comparaciones y un gráfico chico; al tocarla se despliega el gráfico grande debajo de la fila. Compartir: imagen, texto para pegar en redes y link.
import { useEffect, useMemo, useRef, useState } from "react";
import { useDiario } from "../useDiario";
import { Cargando } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { CabeceraDato } from "../sistema/CabeceraDato";
import { CompartirHoja } from "../sistema/CompartirHoja";
import { Delta } from "../sistema/Delta";
import { FilaChips } from "../sistema/FilaChips";
import { Sparkline } from "../Sparkline";
import { GraficoDiario } from "../GraficoDiario";
import { PanelParte } from "../PanelParte";
import {
  aclaracionFila, cambiosDe, esClaveDiario, esPeriodoDiario, extremosTramo, fmtDia, lineaCompras, netoTxt, PERIODO_DEFECTO, PERIODOS_DIARIO, recorte, resumenRuedas, textoParte, variableDe,
  type ClaveDiario, type Diario, type Parte, type PeriodoDiario, type ResumenVariable, type SerieDiaria,
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
  const alternar = (c: ClaveDiario) => { llevada.current = true; set(claveUrl === c ? { v: null, per: null } : { v: c }); };

  return (
    <section className="parte">
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
                      <Panel v={v} serie={serie!} periodo={periodo} onPeriodo={(x) => set({ per: x === PERIODO_DEFECTO ? null : x })} onCerrar={() => set({ v: null, per: null })} />
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

/** Lo que se despliega debajo de una fila: (compras) resumen de ruedas, períodos, gráfico, extremos, comparaciones y frases. */
function Panel({ v, serie, periodo, onPeriodo, onCerrar }: { v: ResumenVariable; serie: SerieDiaria; periodo: PeriodoDiario; onPeriodo: (p: string) => void; onCerrar: () => void }) {
  return (
    <div className="bcra-panel-cuerpo">
      <p className="bcra-que">{v.que}. En {v.unidad}, datos diarios.</p>
      <FilaChips opciones={PERIODOS_DIARIO} valor={periodo} etiqueta="Período del gráfico" onElegir={onPeriodo} />
      {v.clave === "compras" && <Ruedas serie={serie} periodo={periodo} />}
      <GraficoDiario clave={v.clave} serie={serie} periodo={periodo} etiqueta={v.nombre} />
      <Extremos v={v} serie={serie} periodo={periodo} />
      {v.filas.length > 0 && v.clave !== "compras" && (
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
    </div>
  );
}

/** Resumen de ruedas del período elegido (compras del Banco Central). */
function Ruedas({ serie, periodo }: { serie: SerieDiaria; periodo: PeriodoDiario }) {
  const r = useMemo(() => resumenRuedas(serie, periodo), [serie, periodo]);
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
function Extremos({ v, serie, periodo }: { v: ResumenVariable; serie: SerieDiaria; periodo: PeriodoDiario }) {
  const e = useMemo(() => extremosTramo(v.clave, recorte(v.clave, serie, periodo)), [v.clave, serie, periodo]);
  return (
    <dl className="parte-extremos">
      <div><dt>Más alto del período</dt><dd>{e.alto.valor}<small>{e.alto.fecha}</small></dd></div>
      <div><dt>Más bajo del período</dt><dd>{e.bajo.valor}<small>{e.bajo.fecha}</small></dd></div>
    </dl>
  );
}

/** Una variable: toda la fila se toca y despliega su gráfico debajo. Nombre, cifra y fecha a la izquierda; cambios y minigráfico a la derecha. */
function Fila({ v, abierta, onAlternar }: { v: ResumenVariable; abierta: boolean; onAlternar: () => void }) {
  const colorValor = v.tipo === "flujo" && v.cls !== "neutro" ? ` var-${v.cls}` : "";
  const cambios = cambiosDe(v);
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
        {extra && <span className="parte-v-extra">{extra}</span>}
      </span>
      <span className="parte-v-der">
        {cambios.length > 0 && <span className="parte-v-cambios">{cambios.map((c) => <Delta key={c.contra} texto={c.texto} tono={c.tono} dir={c.dir} contra={c.contra} />)}</span>}
        <span className="parte-v-spark"><Sparkline v={v.spark} desde={0} /></span>
      </span>
    </button>
  );
}
