"use client";
// Cuánto cobra cada provincia de Ingresos Brutos (docs/specs/provincias.md, fase 3): la alícuota teórica de la ley por actividad, de las 24 jurisdicciones.
// Va debajo de la tabla de las cuentas. Los cálculos están en lib/provinciasAlicuotas.ts; acá solo se dibuja.
// Estado en la URL: ib_act (actividad), ib_anio y ib_orden (desc | asc); el valor por defecto no se escribe. La ventana de aperturas es un estado local (cierra con la cruz, Atrás y Escape).
// Si el archivo falta o no valida, el bloque no aparece.
import { HojaListo } from "./comunes";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useProvinciasAlicuotas } from "../useProvincias";
import { Modal } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { BarraVista } from "../sistema/BarraVista";
import { Hoja } from "../sistema/Hoja";
import { InfoPunto } from "../sistema/InfoPunto";
import { ListaBarras, type FilaBarra } from "../sistema/ListaBarras";
import { fechaLarga } from "@/lib/gasto";
import { conPunto, type Contexto } from "@/lib/provincias";
import {
  ORDEN_A_DEFECTO, ORDENES_A, actividadDefecto, actividadValida, anioDefectoA, anioValidoA, armarVistaA, esOrdenA, fraseAlicuotas, opcionesActividadA, opcionesAnioA,
  type DatosAlicuotas, type FilaA, type OrdenA, type VistaA,
} from "@/lib/provinciasAlicuotas";

type Cambiar = (x: Record<string, string | null | undefined>) => void;

/** Una elección de la hoja de ajustes: lista de botones (uno marcado), cada uno de 44 px. Las usan las tres vistas de Provincias. */
export function OpcionesHoja({ etiqueta, valor, opciones, onElegir, columna }: {
  etiqueta: string; valor: string; opciones: [string, string][]; onElegir: (v: string) => void; columna?: boolean;
}) {
  return (
    <div className={`prov-ops${columna ? " prov-ops-col" : ""}`} role="group" aria-label={etiqueta}>
      {opciones.map(([v, t]) => <button key={v} type="button" className="prov-op" aria-pressed={v === valor} onClick={() => onElegir(v)}>{t}</button>)}
    </div>
  );
}
/** Al abrir una provincia: lleva el foco y la vista a su título (el detalle se abre en el lugar, no en una ventana). `clave` cambia con la provincia abierta. */
export function useFocoDetalle(clave: string | null) {
  useEffect(() => {
    if (!clave) return;
    const el = document.getElementById("prov-det-t");
    if (!el) return;
    el.tabIndex = -1;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "start" });
  }, [clave]);
}
export function SeccionHoja({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <div className="prov-hoja-sec"><h3>{titulo}</h3>{children}</div>;
}

export function Alicuotas({ c, p, set }: { c: Contexto; p: URLSearchParams; set: Cambiar }) {
  const { datos } = useProvinciasAlicuotas(c.d.generado);
  if (!datos) return null;
  return <Cuerpo d={datos} c={c} p={p} set={set} />;
}

function Cuerpo({ d, c, p, set }: { d: DatosAlicuotas; c: Contexto; p: URLSearchParams; set: Cambiar }) {
  const [abierta, setAbierta] = useState<FilaA | null>(null);
  const [hoja, setHoja] = useState(false);
  const defA = actividadDefecto(d), defAnio = anioDefectoA(d);
  const actividad = actividadValida(d, p.get("ib_act")) ?? defA;
  const anio = anioValidoA(d, p.get("ib_anio")) ?? defAnio;
  const orden: OrdenA = esOrdenA(p.get("ib_orden")) ? (p.get("ib_orden") as OrdenA) : ORDEN_A_DEFECTO;
  const v = useMemo(() => armarVistaA(d, c, { actividad, anio, orden }), [d, c, actividad, anio, orden]);
  const frase = v && !v.vacia ? fraseAlicuotas(v) : null;
  const items = [
    { clave: "actividad", texto: actividad.n },
    { clave: "anio", texto: String(anio) },
    { clave: "orden", texto: ORDENES_A.find((o) => o[0] === orden)![1] },
  ];
  const filas: FilaBarra[] = v ? v.filas.map((f) => ({
    id: f.id, nombre: f.n, valor: f.num, texto: f.txt,
    sub: [f.dif, f.aperturas.length ? `con ${f.aperturas.length} ${f.aperturas.length === 1 ? "apertura" : "aperturas"}` : null].filter(Boolean).join(" · ") || undefined,
    onClick: f.aperturas.length ? () => setAbierta(f) : undefined, flecha: f.aperturas.length > 0,
    aria: f.aperturas.length ? `${f.n}: ${f.txt}. Tiene ${f.aperturas.length} ${f.aperturas.length === 1 ? "apertura" : "aperturas"}. Ver aperturas` : undefined,
  })) : [];
  return (
    <Capitulo id="pc-ib" titulo="Cuánto cobra cada provincia de Ingresos Brutos">
      {frase && <p className="prov-respuesta">{frase}</p>}
      <BarraVista items={items} onAbrir={() => setHoja(true)} />
      <HojaListo titulo="Ajustes: Ingresos Brutos" abierta={hoja} onCerrar={() => setHoja(false)}>
        {(cerrar) => (
          <div className="prov-hoja">
            <SeccionHoja titulo="Actividad"><OpcionesHoja columna etiqueta="Actividad" valor={actividad.slug} opciones={opcionesActividadA(d)} onElegir={(s) => set({ ib_act: s === defA.slug ? null : s })} /></SeccionHoja>
            <SeccionHoja titulo="Año"><OpcionesHoja etiqueta="Año" valor={String(anio)} opciones={opcionesAnioA(d)} onElegir={(a) => set({ ib_anio: Number(a) === defAnio ? null : a })} /></SeccionHoja>
            <SeccionHoja titulo="Orden"><OpcionesHoja etiqueta="Orden" valor={orden} opciones={ORDENES_A} onElegir={(o) => set({ ib_orden: o === ORDEN_A_DEFECTO ? null : o })} /></SeccionHoja>
          </div>
        )}
      </HojaListo>
      <div className="prov-linea-nota">
        <p className="note">{v ? `${v.actividad.n}, ${v.anio}. Alícuota teórica de la ley, no lo que se paga en promedio.` : `No hay datos de ${anio}.`}</p>
        <InfoPunto etiqueta="Cómo leer las alícuotas">
          <p>La alícuota es la que fija la ley de cada provincia para esa actividad (<b>teórica</b>): no es lo que se paga en promedio. Para eso, mirá el indicador “Ingresos Brutos sobre la recaudación propia”.</p>
          <p>{d.aviso ? `Aviso de la Dirección Nacional de Asuntos Provinciales: ${conPunto(d.aviso)}` : "Los datos de la Dirección Nacional de Asuntos Provinciales son provisorios, en desarrollo."}</p>
          <p>Ordenado por alícuota, de {orden === "desc" ? "mayor a menor" : "menor a mayor"}; las que no son un número van al final. La diferencia con el tope es en puntos porcentuales (p.p.), con los valores que se ven; queda vacía si la alícuota o el tope no son un número. Exenciones: fuera de alcance (no hay base oficial).</p>
        </InfoPunto>
      </div>
      {v && (v.vacia
        ? <p className="note" role="status">La planilla de {anio} no trae alícuotas para “{actividad.n}”. Probá con otro año u otra actividad.</p>
        : <>
          <ListaBarras etiqueta={`Alícuota general de Ingresos Brutos: ${v.actividad.n}, ${v.anio}`} filas={filas} />
          <p className="prov-tope"><span>Tope del Consenso Fiscal</span><b>{v.tope}</b></p>
        </>)}
      <PieA d={d} anio={anio} />
      {abierta && v && <Aperturas f={abierta} v={v} onCerrar={() => setAbierta(null)} />}
    </Capitulo>
  );
}

/** Las aperturas de una provincia (por tamaño del contribuyente o por subactividad), como texto. */
function Aperturas({ f, v, onCerrar }: { f: FilaA; v: VistaA; onCerrar: () => void }) {
  return (
    <Modal titulo={`${f.n}: aperturas`} cabecera={`${f.n}: aperturas`} onCerrar={onCerrar} ancho>
      <div className="prov-detalle">
        <p className="note">{v.actividad.n}, {v.anio}. Alícuota general: <b>{f.txt}</b>. Son las alícuotas teóricas que la planilla separa por tamaño del contribuyente o por subactividad.</p>
        <dl className="pc-ib-aper">
          {f.aperturas.map((a) => (<div key={a.n}><dt>{a.n}</dt><dd>{a.txt}</dd></div>))}
        </dl>
      </div>
    </Modal>
  );
}

function PieA({ d, anio }: { d: DatosAlicuotas; anio: number }) {
  const f = d.fuentes[String(anio)] ?? Object.values(d.fuentes)[0];
  const gen = fechaLarga(d.generado || null);
  return (
    <p className="note pc-ib-pie">
      Fuente: {d.fuente ? conPunto(d.fuente) : "Dirección Nacional de Asuntos Provinciales."}
      {f?.pagina && <> <a href={f.pagina} target="_blank" rel="noopener noreferrer">Página de la Dirección Nacional de Asuntos Provinciales</a>.</>}
      {gen ? ` Archivo armado el ${gen}.` : ""}
    </p>
  );
}
