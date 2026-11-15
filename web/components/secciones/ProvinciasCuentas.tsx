"use client";
// Las cuentas de cada provincia (/provincias/?vista=cuentas, docs/specs/provincias.md, fase 2): un indicador de las cuentas de los gobiernos provinciales,
// de las 24 jurisdicciones, y el detalle de cada una. Todas las cuentas están en lib/provinciasCuentas.ts; acá solo se dibuja.
// Estado en la URL: vista=cuentas, ind (id del indicador), anio, orden (desc | asc) y prov (provincia abierta).
// El bloque de alícuotas de Ingresos Brutos (fase 3, ProvinciasAlicuotas.tsx) usa ib_act, ib_anio e ib_orden.
import { HojaListo } from "./comunes";
import { useCallback, useMemo, useState } from "react";
import { useProvinciasCuentas } from "../useProvincias";
import { Cargando } from "../ui";
import { PanelGasto } from "../PanelGasto";
import { Alicuotas, OpcionesHoja, SeccionHoja, useFocoDetalle } from "./ProvinciasAlicuotas";
import { Capitulo } from "../sistema/Capitulo";
import { CabeceraDato } from "../sistema/CabeceraDato";
import { BarraVista } from "../sistema/BarraVista";
import { Hoja } from "../sistema/Hoja";
import { InfoPunto } from "../sistema/InfoPunto";
import { CompartirHoja } from "../sistema/CompartirHoja";
import { ListaBarras, type FilaBarra } from "../sistema/ListaBarras";
import { MosaicoProvincias } from "../sistema/MosaicoProvincias";
import { fechaLarga } from "@/lib/gasto";
import { extremoTxt } from "@/lib/universidades";
import { conPunto, valorCorto, type Contexto } from "@/lib/provincias";
import {
  CON_SIGNO, FUENTE_C, IND_DEFECTO, NOTA_CAJA, anioParcial, avisoPeriodoC, etiquetaPeriodo, fraseCuentas, gruposIndicador, rangoMeses, crearCtxParcial, indicadorOfrecido, ORDEN_C_DEFECTO, ORDENES_C, TITULO_C, anioDefectoC, anioValidoC, armarDetalleC, armarImagenC, armarVistaC, buscarProvC, crearCtxC, esIndicador, esOrdenC,
  hrefC, indicadorDe, opcionesAnioC, tituloC,
  type CtxC, type DatosCuentas, type DetalleC, type EvoC, type IdInd, type OrdenC, type VistaC,
} from "@/lib/provinciasCuentas";

type Cambiar = (x: Record<string, string | null | undefined>) => void;

export function Cuentas({ c, p, set, montado }: { c: Contexto; p: URLSearchParams; set: Cambiar; montado: boolean }) {
  const { datos, cargando, error } = useProvinciasCuentas(true, c.d.generado);
  if (error) return (
    <div>
      <p className="error" role="alert">{error}</p>
      <p className="note">Todavía no está el archivo con las cuentas de las provincias, o no se pudo leer. El gasto de la Nación en cada provincia sigue disponible en la otra vista de esta página.</p>
    </div>
  );
  if (cargando || !datos) return <Cargando texto="Cargando las cuentas de cada provincia…" />;
  return <CuerpoC d={datos} c={c} p={p} set={set} montado={montado} />;
}

function CuerpoC({ d, c, p, set, montado }: { d: DatosCuentas; c: Contexto; p: URLSearchParams; set: Cambiar; montado: boolean }) {
  const x0 = useMemo(() => crearCtxC(d, c), [d, c]);
  const xp = useMemo(() => crearCtxParcial(x0), [x0]);
  const [imagen, setImagen] = useState(false);
  const [hoja, setHoja] = useState(false);
  const def = anioDefectoC(x0);
  const anio = anioValidoC(x0, p.get("anio")) ?? def;
  // Con "anio" = el año en curso se usa el contexto del período parcial (acumulado, contra el mismo período del año anterior).
  const x = xp && anio === anioParcial(x0) ? xp : x0;
  const ind: IdInd = esIndicador(p.get("ind")) && indicadorOfrecido(x, p.get("ind") as IdInd) ? (p.get("ind") as IdInd) : IND_DEFECTO;
  const orden: OrdenC = esOrdenC(p.get("orden")) ? (p.get("orden") as OrdenC) : ORDEN_C_DEFECTO;
  const abierta = montado ? buscarProvC(x, p.get("prov")) : null;
  const I = indicadorDe(ind);
  const vista = useMemo(() => armarVistaC(x, { anio, ind, orden }), [x, anio, ind, orden]);
  const href = hrefC({ anio, ind, orden }, def);
  const titulo = vista ? tituloC(vista) : TITULO_C;
  const armarImg = useCallback((f: Parameters<typeof armarImagenC>[1]) => armarImagenC(vista!, f), [vista]);
  const resp = vista ? fraseCuentas(vista) : null;
  const items = [
    { clave: "ind", texto: I.n },
    ...(I.fijo ? [] : [{ clave: "anio", texto: etiquetaPeriodo(x, anio) }]),
    { clave: "orden", texto: ORDENES_C.find((o) => o[0] === orden)![1] },
  ];

  return (
    <>
      {vista && resp ? (
        <CabeceraDato nivel={2} titulo={I.n} cifra={resp.cifra} unidad={resp.unidad} fecha={I.fijo ? `al ${fechaLarga(d.deudaFecha) ?? "último dato"}` : vista.etq} deltas={[]} frase={resp.frase}
          info={<><p>Cuentas del <b>gobierno de cada provincia</b>, sin municipios ni empresas provinciales. Ejecución <b>provisoria</b>. Es la Administración Pública No Financiera de cada provincia, según la Dirección Nacional de Asuntos Provinciales. La Ciudad de Buenos Aires recibe coparticipación desde 2003, con un régimen distinto.</p>
            <p>{I.explica}{I.fijo ? ` Último dato publicado: ${fechaLarga(d.deudaFecha) ?? "sin fecha"}.` : ""} No hay puntaje combinado: cada indicador se mira por separado y sin decir qué provincia está mejor o peor.</p></>} />
      ) : <p className="sub">Cuánto gasta, cuánto recauda, cuánto recibe de la Nación y cuánto debe el gobierno de cada provincia.</p>}
      <Capitulo id="prov-ranking" titulo="Provincia por provincia"
        acciones={vista ? <CompartirHoja href={href} titulo={titulo} onImagen={() => setImagen(true)} texto={resp ? `${resp.frase} Fuente: ${FUENTE_C}.` : undefined} /> : undefined}>
        <BarraVista items={items} onAbrir={() => setHoja(true)} />
        <HojaListo titulo="Ajustes: cuentas de las provincias" abierta={hoja} onCerrar={() => setHoja(false)}>
          {(cerrar) => (
            <div className="prov-hoja">
              {gruposIndicador(x).map(([g, ops]) => (
                <SeccionHoja key={g} titulo={g}><OpcionesHoja columna etiqueta={g} valor={ind} opciones={ops} onElegir={(v) => set({ ind: v === IND_DEFECTO ? null : v })} /></SeccionHoja>
              ))}
              {!I.fijo && <SeccionHoja titulo="Año"><OpcionesHoja etiqueta="Año" valor={String(anio)} opciones={opcionesAnioC(x0)} onElegir={(a) => set({ anio: Number(a) === def ? null : a })} /></SeccionHoja>}
              <SeccionHoja titulo="Orden"><OpcionesHoja etiqueta="Orden" valor={orden} opciones={ORDENES_C} onElegir={(v) => set({ orden: v === ORDEN_C_DEFECTO ? null : v })} /></SeccionHoja>
            </div>
          )}
        </HojaListo>
        {!I.fijo && avisoPeriodoC(x) && <p className="note" role="status">{avisoPeriodoC(x)}</p>}
        {!vista ? <p className="note">No hay datos de {etiquetaPeriodo(x, anio)} para este indicador{I.id === "gasto_hab" || I.id === "recaud_hab" || I.fijo ? " (hace falta la población de la provincia en ese año)" : ""}.</p>
          : <Ranking v={vista} resaltar={abierta?.id ?? null} onAbrir={(id) => set({ prov: id })} />}
      </Capitulo>
      {abierta && <DetalleCuentas x={x} xEvo={x0} id={abierta.id} anio={anio} ind={ind} orden={orden} def={def} onCerrar={() => set({ prov: null })} />}
      <Alicuotas c={c} p={p} set={set} />
      <Pie d={d} parcial={!!x.per} />
      {imagen && vista && <PanelGasto armar={armarImg} titulo={titulo} href={href} onCerrar={() => setImagen(false)} />}
    </>
  );
}

/** Mosaico y ranking de las 24 jurisdicciones con el indicador elegido. Mismo orden de colores que la lista. */
function Ranking({ v, resaltar, onAbrir }: { v: VistaC; resaltar: string | null; onAbrir: (id: string) => void }) {
  const signo = CON_SIGNO.includes(v.ind.id);
  const celdas = v.filas.map((f) => ({ id: f.id, nombre: f.n, valor: f.valor, texto: f.txt, corto: valorCorto(f.txt) }));
  const filas: FilaBarra[] = v.filas.map((f) => ({
    id: f.id, nombre: `${f.pos != null ? `${f.pos}. ` : ""}${f.n}${f.caja ? " †" : ""}`, valor: f.valor, texto: f.txt,
    sub: f.variTxt && v.encVari ? `${v.encVari}: ${f.variTxt}` : undefined, onClick: () => onAbrir(f.id), flecha: true,
    aria: `${f.n}${f.pos != null ? `, puesto ${f.pos}` : ""}: ${f.txt}${f.caja ? ", con caja de jubilaciones propia" : ""}. Ver sus cuentas`,
  }));
  return (
    <>
      <div className="prov-linea-nota">
        <p className="note">{v.unidad}. {v.ind.fijo ? "No depende del año elegido. " : ""}Ordenado de {v.orden === "desc" ? "mayor a menor" : "menor a mayor"}.</p>
        <InfoPunto etiqueta="Cómo leer este ranking">
          <p>{v.ind.formula}.</p>
          {v.aviso && <p>{v.aviso}</p>}
          {v.encVari && <p>{v.ind.tipo === "pesos" ? `La variación es real (descontada la inflación) contra ${v.etqAnt}.` : `La variación es la diferencia contra ${v.etqAnt}${v.ind.tipo === "pct" ? ", en puntos porcentuales" : ""}.`} Un guion es que falta el dato de ese año.</p>}
          {v.sinCuentas && <p>{v.sinCuentas}</p>}
          {v.conCaja > 0 && <p>† {NOTA_CAJA} En {v.etq}: {v.conCaja} de las 24.</p>}
        </InfoPunto>
      </div>
      <div className="prov-par">
        <MosaicoProvincias celdas={celdas} resaltar={resaltar} onElegir={onAbrir} etiqueta={`${v.ind.n}: las 24 jurisdicciones`} />
        <div className="prov-par-lista">
          <ListaBarras etiqueta={`${v.ind.n}, ${v.etq}`} filas={filas} divergente={signo} resaltar={resaltar ?? undefined} />
          <p className="prov-tope"><span>Las 24 juntas</span><b>{v.juntas.txt}{v.juntas.variTxt ? ` · ${v.juntas.variTxt}` : ""}</b></p>
        </div>
      </div>
    </>
  );
}

/** Detalle de una provincia: sus cuentas del año, el gasto por finalidad y la evolución del indicador. Se abre en el lugar, debajo del ranking. */
function DetalleCuentas({ x, xEvo, id, anio, ind, orden, def, onCerrar }: { x: CtxC; xEvo: CtxC; id: string; anio: number; ind: IdInd; orden: OrdenC; def: number; onCerrar: () => void }) {
  const det = useMemo(() => armarDetalleC(x, id, anio, ind, xEvo), [x, xEvo, id, anio, ind]);
  const I = indicadorDe(ind);
  useFocoDetalle(det ? id : null);
  if (!det) return null;
  const href = hrefC({ anio, ind, orden }, def, id);
  const frase = `${det.n}: ${det.valorTxt ?? "sin dato"} (${I.n.toLowerCase()}${I.fijo ? "" : ` en ${det.etq}`}).`;
  const fin: FilaBarra[] = (det.finalidades ?? []).map((b) => ({ id: b.n, nombre: b.n, valor: b.ancho, texto: b.txt, sub: b.parte }));
  return (
    <Capitulo id="prov-det" titulo={`${det.n}: cuentas de ${det.etq}`}
      acciones={<>
        <CompartirHoja href={href} titulo={`${det.n}: ${tituloC({ anio, ind: I, etq: det.etq })}`} texto={frase} />
        <button type="button" className="prov-volver" onClick={onCerrar}>Volver al mapa</button>
      </>}>
      <p className="prov-cifras">
        <b>{det.valorTxt ?? "Sin dato"}</b><span> {I.n.toLowerCase()}{I.fijo ? "" : ` en ${det.etq}`}</span>
        {det.variTxt && <span> · {det.variTxt}{I.tipo === "pesos" ? " real" : ""} vs {det.etqAnt}</span>}
        {det.caja && <InfoPunto etiqueta="Caja de jubilaciones propia"><p>† {NOTA_CAJA}</p></InfoPunto>}
      </p>
      {det.cuentas ? <TablaCuentas cu={det.cuentas} etq={det.etq} /> : <p className="note">No hay cuentas de {det.n} para {det.etq}.</p>}
      {det.finalidades && (
        <Capitulo nivel={3} titulo={`En qué gastó, por finalidad (${det.etq})`}>
          <div className="prov-linea-nota">
            <p className="note">Total {det.finTotal}, en pesos de {x.p.def.ref}.</p>
            {det.finNota && <InfoPunto etiqueta="Nota sobre las finalidades"><p>{det.finNota}</p></InfoPunto>}
          </div>
          <ListaBarras etiqueta={`Gasto por finalidad de ${det.n}`} filas={fin} max={1} />
        </Capitulo>
      )}
      {det.evo ? <Evolucion evo={det.evo} anio={anio} nombre={det.n} titulo={I.n} nota={det.evoNota} /> : <p className="note">{I.n} no depende del año: es el último dato publicado, así que no tiene evolución.</p>}
    </Capitulo>
  );
}

function TablaCuentas({ cu, etq }: { cu: NonNullable<DetalleC["cuentas"]>; etq: string }) {
  const bloque = (titulo: string, filas: typeof cu.ingresos) => (
    <>
      <tr className="pc-cab"><th scope="rowgroup" colSpan={2}>{titulo}</th></tr>
      {filas.map((f, k) => (
        <tr key={f.n} className={!f.sub && k === filas.length - 1 ? "pc-total" : undefined}>
          <th scope="row" className={f.sub ? "pc-sub" : undefined}>{f.n}</th><td>{f.txt}</td>
        </tr>
      ))}
    </>
  );
  return (
    <div className="pc-cuentas">
      <p className="note">{cu.unidad}. Las filas suman el total que se ve; “Otros” es lo que falta para llegar al total.</p>
      <div className="tablewrap">
        <table>
          <caption className="pc-leyenda">Ingresos, gastos y resultado de {etq}</caption>
          <tbody>
            {bloque("Ingresos", cu.ingresos)}
            {bloque("Gastos", cu.gastos)}
            <tr className="pc-total"><th scope="row">{cu.resultado.n}</th><td>{cu.resultado.txt}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Gráfico chico de columnas del indicador, una por año (las barras de resultado negativo van más claras), y la tabla año por año. */
function Evolucion({ evo, anio, nombre, titulo, nota }: { evo: EvoC; anio: number; nombre: string; titulo: string; nota: string | null }) {
  return (
    <figure className="uni-evo-fig prov-evo">
      <figcaption className="uni-evo-tit">{nombre}: {titulo.toLowerCase()}, de {evo.puntos[0]?.anio} a {evo.puntos[evo.puntos.length - 1]?.anio}</figcaption>
      <ol className="uni-evo">
        {evo.puntos.map((pt) => {
          const txt = pt.txt ? `${pt.anio}: ${pt.txt}` : `${pt.anio}: sin dato`;
          return (
            <li key={pt.anio}>
              <div className="uni-evo-btn uni-evo-quieta" role="img" aria-label={txt} title={txt}>
                <span className="uni-evo-col"><span className={`uni-evo-barra${pt.neg ? " pc-evo-neg" : ""}${pt.anio === anio ? " uni-evo-elegida" : ""}`} style={{ height: `${(pt.alto * 100).toFixed(1)}%` }} /></span>
                <span className="uni-evo-anio">{String(pt.anio).slice(2)}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {evo.primero && evo.ultimo && evo.primero !== evo.ultimo && <p className="uni-evo-ext"><span>{extremoTxt(evo.primero)}</span><span>{extremoTxt(evo.ultimo)}</span></p>}
      {nota && <p className="note">{nota}</p>}
      {evo.hayNegativos && <p className="note">Las barras más claras son valores negativos (el largo es el valor sin el signo).</p>}
      <details className="ctx-mas">
        <summary>Ver año por año</summary>
        <div className="tablewrap">
          <table>
            <thead><tr><th scope="col">Año</th><th scope="col">{titulo}</th><th scope="col">Variación</th></tr></thead>
            <tbody>{evo.filas.map((f) => <tr key={f.anio}><th scope="row">{f.anio}</th><td>{f.txt ?? "–"}</td><td>{f.vari ?? "–"}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function Pie({ d, parcial }: { d: DatosCuentas; parcial: boolean }) {
  const gen = fechaLarga(d.generado || null);
  const fuentes = Object.entries(d.fuentes);
  return (
    <details className="ctx-mas">
      <summary>Cómo se mide</summary>
      <ul className="method">
        <li><b>Qué incluye</b>: ingresos y gastos del gobierno de cada provincia (Administración Pública No Financiera), con ejecución provisoria. No incluye municipios ni empresas provinciales.</li>
        <li><b>Pesos de hoy</b>: el monto de cada año ajustado por inflación con el IPC (el IPC del último mes publicado sobre el IPC promedio de ese año). <b>Por habitante</b>: dividido la población de la provincia en ese año (proyección del INDEC con base censo 2010).</li>
        <li><b>Caja de jubilaciones propia</b>: se marca a las provincias cuyas prestaciones de la seguridad social son el 5 % o más de su gasto total en el año elegido.</li>
        <li><b>Deuda</b>: stock al {fechaLarga(d.deudaFecha) ?? "último dato publicado"}, sin deuda flotante. No depende del año elegido.</li>
        {fuentes.map(([k, f]) => <li key={k}><b>Fuente ({k})</b>: {[f.archivo, f.pagina, f.fecha && `bajado el ${fechaLarga(f.fecha) ?? f.fecha}`].filter(Boolean).join(", ") || "sin detalle"}.</li>)}
        {parcial && d.parcial && <li><b>Período parcial</b>: lo acumulado de {rangoMeses(d.parcial.meses)} de {d.parcial.anios[d.parcial.anios.length - 1]}, comparado con el mismo período de {d.parcial.anios[d.parcial.anios.length - 1] - 1}. Los pesos de hoy usan la inflación promedio de esos meses. Sin empleados públicos ni sueldo medio: no hay dato trimestral.</li>}
        {d.fuente && <li><b>Fuente</b>: {conPunto(d.fuente)}{gen ? ` Archivo armado el ${gen}.` : ""}</li>}
      </ul>
    </details>
  );
}
