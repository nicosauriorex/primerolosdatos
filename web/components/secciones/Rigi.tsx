"use client";
// RIGI (/rigi/, docs/specs/datos-calientes-3.md, fase 2): tres cifras (proyectos aprobados, inversión comprometida y lo ingresado según el Banco Central),
// el total por sector y la tabla de proyectos con link a la norma que aprobó cada uno. Todas las cuentas salen de lib/rigi.ts.
// Sin rigi.json la página dice que no hay datos.
import { useMemo } from "react";
import { useRigi } from "../useRigi";
import { Cargando } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { ListaBarras, type FilaBarra } from "../sistema/ListaBarras";
import { FilaChips } from "../sistema/FilaChips";
import { MESES, nf0 } from "@/lib/formato";
import {
  alternarOrden, difNeto, escribirOrden, fechaMonitor, leerOrden, ordenar, porSector, totalMonto, txtFecha, txtHasta, txtMonto, txtUsd, ultimaCon,
  type ClaveOrden, type PendienteRigi, type Rigi, type TotalRigi,
} from "@/lib/rigi";
import { useParams } from "@/lib/url";

/** "2026-11-17" → "17-nov-2026". */
const actualizadoTxt = (iso: string | null): string | null => {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  return m ? `${+m[3]}-${MESES[+m[2] - 1]}-${m[1]}` : null;
};

export function RigiPagina() {
  const { estado, datos } = useRigi();
  if (estado === "cargando") return <Cargando texto="Cargando el RIGI…" />;
  if (!datos) {
    return (
      <section className="rigi">
        <Capitulo titulo="Todavía no hay datos del RIGI">
          <p className="note" role="status">No hay datos de los proyectos del RIGI cargados en este momento. El resto del sitio sigue funcionando; probá de nuevo más tarde.</p>
        </Capitulo>
      </section>
    );
  }
  return <Cuerpo r={datos} />;
}

function Cuerpo({ r }: { r: Rigi }) {
  const total = useMemo(() => totalMonto(r), [r]);
  const sectores = useMemo(() => porSector(r), [r]);
  const n = r.proyectos.length;
  const sinNorma = r.proyectos.filter((p) => !p.fecha).length;
  const ing = r.ingresado;
  const act = actualizadoTxt(r.actualizado);
  const filasSector: FilaBarra[] = sectores.map((s) => ({
    id: s.sector, nombre: s.sector, valor: s.monto, texto: txtUsd(s.monto),
    sub: `${nf0.format(s.proyectos)} ${s.proyectos === 1 ? "proyecto" : "proyectos"} · ${!total ? "0 %" : (s.monto / total) * 100 < 0.5 ? "menos del 1 %" : `${nf0.format((s.monto / total) * 100)} %`} del total`,
  }));
  return (
    <section className="rigi">
      <dl className="rigi-cifras" aria-label="El RIGI en tres cifras">
        <div>
          <dt>Proyectos aprobados</dt>
          <dd className="rigi-num">{nf0.format(n)}</dd>
          <dd className="rigi-sub">
            Régimen de Incentivo para Grandes Inversiones
            {sinNorma > 0 && <> · {nf0.format(sinNorma)} sin resolución encontrada (figura en la lista oficial)</>}
          </dd>
        </div>
        <div>
          <dt>Inversión comprometida</dt>
          <dd className="rigi-num">{txtUsd(total)}</dd>
          <dd className="rigi-sub">Suma de lo que anunciaron los proyectos aprobados: es lo previsto, no lo invertido</dd>
        </div>
        <div>
          <dt>Ingresado según el Banco Central</dt>
          <dd className="rigi-num">{ing && ing.neto != null ? txtUsd(ing.neto) : "Sin dato"}</dd>
          <dd className="rigi-sub">
            {ing ? <>Neto, hasta {txtHasta(ing.hasta)}. </> : null}
            No hay una serie oficial de lo efectivamente invertido por los proyectos.
            {ing?.url ? <> <a href={ing.url} target="_blank" rel="noopener noreferrer">Ver la fuente</a></> : null}
          </dd>
        </div>
      </dl>
      {ing && <Ingresado i={ing} />}
      {r.totales.length > 0 && <Totales r={r} />}

      <Capitulo titulo="Inversión comprometida por sector" bajada="Lo que anunciaron los proyectos aprobados, sumado por sector. Cada barra, sobre el sector más grande." id="sectores">
        <ListaBarras filas={filasSector} etiqueta="Inversión comprometida por sector, en millones de dólares" />
      </Capitulo>

      <Proyectos r={r} />

      <details>
        <summary>Fuente y cómo leer estos datos</summary>
        <ul className="method">
          {r.fuente && <li><b>Fuente</b>: {r.fuente.url ? <a href={r.fuente.url} target="_blank" rel="noopener noreferrer">{r.fuente.texto}</a> : r.fuente.texto}.</li>}
          <li><b>Monto</b>: millones de dólares que declara cada proyecto, tal como figura en la planilla oficial. Es inversión anunciada: no dice cuánto se invirtió hasta hoy.</li>
          <li><b>Aprobado</b>: fecha de la norma que aprobó el proyecto. «Sin fecha» quiere decir que no pudimos ubicar la norma.</li>
          {r.nota && <li>{r.nota}</li>}
          {act && <li>Última actualización de esta página: {act}.</li>}
        </ul>
      </details>
    </section>
  );
}

/** Lo ingresado según el BCRA: bruto, egresos y neto con su texto y fuente. Si la resta no da el neto publicado, lo dice. */
function Ingresado({ i }: { i: NonNullable<Rigi["ingresado"]> }) {
  const dif = difNeto(i);
  return (
    <details>
      <summary>Qué es lo ingresado según el Banco Central</summary>
      <ul className="method">
        {i.bruto != null && <li><b>Ingresos brutos</b>: {txtUsd(i.bruto)}.</li>}
        {i.egresos != null && <li><b>Egresos</b>: {txtUsd(i.egresos)}.</li>}
        {i.neto != null && <li><b>Neto</b>: {txtUsd(i.neto)}, hasta {txtHasta(i.hasta)}.</li>}
        {dif != null && <li>La resta de ingresos brutos menos egresos da {txtUsd(dif)}, no {txtUsd(i.neto!)}: se muestra el neto tal como lo publicó la fuente.</li>}
        {i.texto && <li>{i.texto}</li>}
      </ul>
    </details>
  );
}

/** Una línea de «Presentados y en evaluación»: la fuente con su link y la fecha de la foto. */
function Fuente({ t }: { t: TotalRigi }) {
  return <>{t.url ? <a href={t.url} target="_blank" rel="noopener noreferrer">{t.fuente}</a> : t.fuente}, {txtFecha(t.fecha)}</>;
}
const conMonto = (n: number, monto: number | null, uno: string, varios: string) =>
  `${nf0.format(n)} ${n === 1 ? uno : varios}${monto != null ? ` por ${txtUsd(monto)}` : " (monto sin informar)"}`;

/** Totales: la foto más reciente con proyectos en evaluación y, debajo, las otras fotos, cada una con su fecha y su fuente. */
function Totales({ r }: { r: Rigi }) {
  const ev = ultimaCon(r, "evaluacion"), ap = ultimaCon(r, "aprobados"), pr = ultimaCon(r, "presentados");
  // Fotos anteriores: las que no se usaron arriba (una sola vez cada cosa). Los aprobados de arriba salen de la lista oficial cuando la hay.
  const usadas = new Set([ev, pr, r.proyectos.length ? undefined : ap]);
  const otras = r.totales.filter((t) => !usadas.has(t)).reverse();
  return (
    <Capitulo titulo="Presentados y en evaluación" bajada="Lo que el Gobierno informa en total. Cada número lleva su fecha y su fuente: no son de la misma foto." id="totales">
      <ul className="method">
        {ev?.evaluacion && (
          <li>
            <b>{conMonto(ev.evaluacion.n, ev.evaluacion.monto, "proyecto en evaluación", "proyectos en evaluación")}</b> (<Fuente t={ev} />).
            {ev.evaluacion.empleos != null && <> Empleos que prometen: {nf0.format(ev.evaluacion.empleos)}.</>}
          </li>
        )}
        {/* Aprobados: la lista oficial con nombres (planilla del Ministerio) es exacta; una foto de totales solo si no hay lista. */}
        {r.proyectos.length > 0
          ? <li>Aprobados: {conMonto(r.proyectos.length, totalMonto(r), "proyecto", "proyectos")} (planilla oficial del Ministerio de Economía{r.actualizado ? `, ${txtFecha(r.actualizado)}` : ""}; lista completa abajo).</li>
          : ap?.aprobados && <li>Aprobados: {conMonto(ap.aprobados.n, ap.aprobados.monto, "proyecto", "proyectos")} (<Fuente t={ap} />).</li>}
        {pr?.presentados && <li>Presentados: {conMonto(pr.presentados.n, pr.presentados.monto, "proyecto", "proyectos")} (<Fuente t={pr} />).</li>}
      </ul>
      {otras.length > 0 && (
        <>
          <p className="rigi-sub">Fotos anteriores:</p>
          <ul className="method">
            {otras.map((t) => (
              <li key={`${t.fecha}-${t.fuente}`}>
                <Fuente t={t} />:{" "}
                {[
                  t.evaluacion && `en evaluación ${nf0.format(t.evaluacion.n)}${t.evaluacion.monto != null ? ` (${txtUsd(t.evaluacion.monto)})` : ""}`,
                  t.aprobados && `aprobados ${nf0.format(t.aprobados.n)}${t.aprobados.monto != null ? ` (${txtUsd(t.aprobados.monto)})` : ""}`,
                  t.presentados && `presentados ${nf0.format(t.presentados.n)}${t.presentados.monto != null ? ` (${txtUsd(t.presentados.monto)})` : ""}`,
                ].filter(Boolean).join(", ")}.
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="rigi-sub">Una declaración pública citada por la prensa es aproximada. Las fotos de distintas fechas no se suman ni se comparan entre sí.</p>
    </Capitulo>
  );
}

/** Aprobados (la tabla de siempre) o En evaluación (lista no oficial), según el parámetro `e` de la URL. */
function Proyectos({ r }: { r: Rigi }) {
  const [p, set, montado] = useParams();
  const hayLista = r.pendientes.length > 0;
  const vista = hayLista && montado && p.get("e") === "evaluacion" ? "evaluacion" : "aprobados";
  const nEval = r.pendientes.filter((x) => x.estado === "evaluacion").length;
  return (
    <Capitulo
      titulo={vista === "evaluacion" ? "Proyectos en evaluación" : "Proyectos aprobados"}
      bajada={vista === "evaluacion" ? "Tocá «Monto» o «Presentado» para ordenar." : "Tocá «Monto» o «Aprobado» para ordenar. En «Aprobado», el link lleva a la norma."}
      id="proyectos"
    >
      {hayLista && (
        <FilaChips
          etiqueta="Qué proyectos ver" valor={vista} onElegir={(v) => set({ e: v === "evaluacion" ? "evaluacion" : null })}
          opciones={[["aprobados", `Aprobados (${nf0.format(r.proyectos.length)})`], ["evaluacion", `En evaluación (${nf0.format(nEval)})`]]}
        />
      )}
      {vista === "evaluacion" ? <Evaluacion r={r} /> : <Tabla r={r} />}
    </Capitulo>
  );
}

function Evaluacion({ r }: { r: Rigi }) {
  const [p, set, montado] = useParams();
  const orden = leerOrden(montado ? p.get("o") : null);
  const lista = useMemo(() => r.pendientes.filter((x) => x.estado === "evaluacion"), [r]);
  const rechazados = useMemo(() => r.pendientes.filter((x) => x.estado === "rechazado"), [r]);
  const filas = useMemo(() => ordenar(lista, orden), [lista, orden]);
  const fp = r.fuentePendientes, fm = fechaMonitor(r), ev = ultimaCon(r, "evaluacion");
  const suma = lista.reduce((a, x) => a + x.monto, 0);
  const th = (clave: ClaveOrden, titulo: string) => (
    <th scope="col" className="rigi-num-col" aria-sort={orden.clave === clave ? (orden.asc ? "ascending" : "descending") : "none"}>
      <button type="button" className="th-orden cg-th" onClick={() => set({ o: escribirOrden(alternarOrden(orden, clave)) })}>
        {titulo}{orden.clave === clave ? (orden.asc ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );
  return (
    <>
      <p className="note" role="note">
        <b>Lista no oficial</b>: {fp?.texto ? "Monitor RIGI (DESIP-IIEP)" : "fuente sin informar"}, {fm.descarga ? "descargada el" : "al"} {txtFecha(fm.iso)}.{" "}
        {ev?.evaluacion ? <>El Gobierno solo publica el total: {conMonto(ev.evaluacion.n, ev.evaluacion.monto, "proyecto", "proyectos")}. </> : null}
        Esta lista tiene {conMonto(lista.length, suma, "proyecto", "proyectos")}.
        {fp?.url ? <> <a href={fp.url} target="_blank" rel="noopener noreferrer">Ver el monitor</a>.</> : null}
        {r.notaPendientes ? <> {r.notaPendientes}</> : null}
      </p>
      <div className="tablewrap rigi-tabla" role="region" aria-label="Proyectos del RIGI en evaluación (lista no oficial)" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">Proyecto</th>
              <th scope="col">Provincias</th>
              <th scope="col">Sector</th>
              {th("monto", "Monto (millones de US$)")}
              {th("fecha", "Presentado")}
              <th scope="col">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((x, i) => (
              <tr key={`${x.nombre}-${i}`}>
                <th scope="row"><span className="rigi-nombre">{x.nombre}</span><small>{x.empresa}</small></th>
                <td>{x.provincias.length ? x.provincias.join(", ") : "–"}</td>
                <td>{x.sector}</td>
                <td className="rigi-num-col">{txtMonto(x.monto)}</td>
                <td className="rigi-num-col">{txtFecha(x.fecha)}</td>
                <td>{x.url ? <a href={x.url} target="_blank" rel="noopener noreferrer" aria-label={`Fuente de ${x.nombre}`}>fuente</a> : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rechazados.length > 0 && (
        <>
          <h3 className="rigi-sub">Rechazados</h3>
          <ul className="method">{rechazados.map((x, i) => <li key={`${x.nombre}-${i}`}><Rechazado x={x} /></li>)}</ul>
        </>
      )}
    </>
  );
}

/** «Mariana, Litio Minera Argentina (Salta), US$ 273 millones: rechazado». Sin fecha de rechazo en el archivo, no se inventa una. */
function Rechazado({ x }: { x: PendienteRigi }) {
  const prov = x.provincias.length ? ` (${x.provincias.join(", ")})` : "";
  const txt = `${x.nombre}, ${x.empresa}${prov}, ${txtUsd(x.monto)}: rechazado${x.fechaRechazo ? ` el ${txtFecha(x.fechaRechazo)}` : ""}`;
  return <>{txt}{x.url ? <> <a href={x.url} target="_blank" rel="noopener noreferrer">fuente</a></> : null}</>;
}

function Tabla({ r }: { r: Rigi }) {
  const [p, set, montado] = useParams();
  const orden = leerOrden(montado ? p.get("o") : null);
  const filas = useMemo(() => ordenar(r.proyectos, orden), [r, orden]);
  const th = (clave: ClaveOrden, titulo: string) => (
    <th scope="col" className="rigi-num-col" aria-sort={orden.clave === clave ? (orden.asc ? "ascending" : "descending") : "none"}>
      <button type="button" className="th-orden cg-th" onClick={() => set({ o: escribirOrden(alternarOrden(orden, clave)) })}>
        {titulo}{orden.clave === clave ? (orden.asc ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );
  return (
    <div className="tablewrap rigi-tabla" role="region" aria-label="Proyectos aprobados del RIGI" tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th scope="col">Proyecto</th>
            <th scope="col">Provincias</th>
            <th scope="col">Sector</th>
            {th("monto", "Monto (millones de US$)")}
            {th("fecha", "Aprobado")}
          </tr>
        </thead>
        <tbody>
          {filas.map((x, i) => (
            <tr key={`${x.nombre}-${i}`}>
              <th scope="row"><span className="rigi-nombre">{x.nombre}</span><small>{x.empresa}</small></th>
              <td>{x.provincias.length ? x.provincias.join(", ") : "–"}</td>
              <td>{x.sector}</td>
              <td className="rigi-num-col">{txtMonto(x.monto)}</td>
              <td className="rigi-num-col">
                {x.norma
                  ? <a href={x.norma} target="_blank" rel="noopener noreferrer" aria-label={`Norma que aprobó ${x.nombre}, ${txtFecha(x.fecha)}`}>{txtFecha(x.fecha)}</a>
                  : txtFecha(x.fecha)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
