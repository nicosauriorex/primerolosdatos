"use client";
// Parte diario del Banco Central (/bcra/, docs/specs/parte-diario-bcra.md): una tarjeta por variable con su último dato, su fecha, sus
// comparaciones y un gráfico chico; al tocarla se abre el gráfico grande. Compartir: imagen, texto para pegar en redes y link.
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
  aclaracionFila, cambiosDe, esClaveDiario, esPeriodoDiario, extremosTramo, PERIODO_DEFECTO, PERIODOS_DIARIO, recorte, textoParte, variableDe,
  type Diario, type Parte, type PeriodoDiario, type ResumenVariable,
} from "@/lib/diario";
import { MESES } from "@/lib/formato";
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
  const abierta = montado && esClaveDiario(p.get("v")) ? parte.variables.find((v) => v.clave === p.get("v")) ?? null : null;
  const periodo = esPeriodoDiario(p.get("per")) ? (p.get("per") as PeriodoDiario) : PERIODO_DEFECTO;
  const texto = useMemo(() => textoParte(parte), [parte]);
  const titulo = `Parte del Banco Central del ${parte.fechaTxt}`;
  const act = actualizadoTxt(parte.actualizado);
  const principal = variableDe(parte, "reservas") ?? parte.variables[0];
  const capAbierto = useRef<HTMLElement>(null);
  const claveAbierta = abierta?.clave;
  useEffect(() => { if (claveAbierta) capAbierto.current?.scrollIntoView({ block: "start", behavior: "auto" }); }, [claveAbierta]);

  return (
    <section className="parte">
      <CabeceraDato nivel={2} titulo={principal.nombre} cifra={principal.valorCorto} unidad={principal.unidad}
        fecha={principal.atrasada ? `Último dato: ${principal.fechaTxt}` : principal.fechaTxt}
        deltas={cambiosDe(principal)} frase={principal.frases[0]} info={principal.que} />

      {abierta && datos.series[abierta.clave] && (
        <section className="parte-abierta" ref={capAbierto}>
          <Capitulo titulo={abierta.nombre} bajada={`${abierta.que}. En ${abierta.unidad}, datos diarios.`}
            acciones={<button type="button" className="parte-cerrar" onClick={() => set({ v: null, per: null })}>Cerrar el gráfico</button>}>
            <FilaChips opciones={PERIODOS_DIARIO} valor={periodo} etiqueta="Período del gráfico" onElegir={(x) => set({ per: x === PERIODO_DEFECTO ? null : x })} />
            <GraficoDiario clave={abierta.clave} serie={datos.series[abierta.clave]!} periodo={periodo} etiqueta={abierta.nombre} />
            <Extremos v={abierta} datos={datos} periodo={periodo} />
            {abierta.filas.length > 0 && (
              <ul className="parte-v-comp">
                {abierta.filas.map((f) => (
                  <li key={f.rotulo} aria-label={`${f.rotulo}, ${f.nota}: ${f.valor}${f.sub ? ", " + f.sub : ""}`}>
                    <span className="parte-v-rot">{f.rotulo}<small>{f.nota}</small></span>
                    <span className={`parte-v-val var-${f.cls}`}>{f.valor}{f.sub && <small>{f.sub}</small>}</span>
                  </li>
                ))}
              </ul>
            )}
            {abierta.frases.length > 0 && <ul className="parte-v-frases">{abierta.frases.map((t) => <li key={t}>{t}</li>)}</ul>}
          </Capitulo>
        </section>
      )}

      <Capitulo titulo="Todas las variables" bajada={`Datos del ${parte.fechaTxt}. Cada dato lleva su fecha: algunos se publican con unos días de atraso.`}
        acciones={<CompartirHoja href={RUTA} titulo={titulo} onImagen={() => setImagen(true)} texto={texto} />}>
        <ul className="parte-v-lista">
          {parte.variables.map((v) => <li key={v.clave}><Fila v={v} onAbrir={() => set({ v: v.clave })} /></li>)}
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

/** El valor más alto y el más bajo del período elegido. */
function Extremos({ v, datos, periodo }: { v: ResumenVariable; datos: Diario; periodo: PeriodoDiario }) {
  const e = useMemo(() => extremosTramo(v.clave, recorte(v.clave, datos.series[v.clave]!, periodo)), [v.clave, datos, periodo]);
  return (
    <dl className="parte-extremos">
      <div><dt>Más alto del período</dt><dd>{e.alto.valor}<small>{e.alto.fecha}</small></dd></div>
      <div><dt>Más bajo del período</dt><dd>{e.bajo.valor}<small>{e.bajo.fecha}</small></dd></div>
    </dl>
  );
}

/** Una variable: toda la fila se toca y abre su gráfico. Nombre, cifra y fecha a la izquierda; cambios y minigráfico a la derecha. */
function Fila({ v, onAbrir }: { v: ResumenVariable; onAbrir: () => void }) {
  const colorValor = v.tipo === "flujo" && v.cls !== "neutro" ? ` var-${v.cls}` : "";
  const cambios = cambiosDe(v);
  return (
    <button type="button" className="parte-v" aria-label={`Ver el gráfico de ${v.nombre}`} onClick={onAbrir}>
      <span className="parte-v-txt">
        <span className="parte-v-nombre">{v.nombre}</span>
        <span className="parte-v-cifra">
          {v.etiqueta && <span className={`parte-v-etq var-${v.cls}`}>{v.etiqueta}</span>}
          <b className={`parte-v-valor${colorValor}`}>{v.valor}</b>
        </span>
        <span className="parte-v-fecha">{[aclaracionFila(v.clave), v.atrasada ? `último dato: ${v.fechaTxt}` : v.fechaTxt].filter(Boolean).join(" · ")}</span>
      </span>
      <span className="parte-v-der">
        {cambios.length > 0 && <span className="parte-v-cambios">{cambios.map((c) => <Delta key={c.contra} texto={c.texto} tono={c.tono} dir={c.dir} contra={c.contra} />)}</span>}
        <span className="parte-v-spark"><Sparkline v={v.spark} desde={0} /></span>
      </span>
    </button>
  );
}
