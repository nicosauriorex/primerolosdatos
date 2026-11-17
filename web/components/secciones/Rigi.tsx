"use client";
// RIGI (/rigi/, docs/specs/datos-calientes-3.md, fase 2): tres cifras (proyectos aprobados, inversión comprometida y lo ingresado según el Banco Central),
// el total por sector y la tabla de proyectos con link a la norma que aprobó cada uno. Todas las cuentas salen de lib/rigi.ts.
// Sin rigi.json la página dice que no hay datos.
import { useMemo } from "react";
import { useRigi } from "../useRigi";
import { Cargando } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { ListaBarras, type FilaBarra } from "../sistema/ListaBarras";
import { MESES, nf0 } from "@/lib/formato";
import {
  alternarOrden, difNeto, escribirOrden, leerOrden, ordenar, porSector, totalMonto, txtFecha, txtHasta, txtMonto, txtUsd,
  type ClaveOrden, type Rigi,
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

      <Capitulo titulo="Inversión comprometida por sector" bajada="Lo que anunciaron los proyectos aprobados, sumado por sector. Cada barra, sobre el sector más grande." id="sectores">
        <ListaBarras filas={filasSector} etiqueta="Inversión comprometida por sector, en millones de dólares" />
      </Capitulo>

      <Capitulo titulo="Proyectos aprobados" bajada="Tocá «Monto» o «Aprobado» para ordenar. En «Aprobado», el link lleva a la norma." id="proyectos">
        <Tabla r={r} />
      </Capitulo>

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
