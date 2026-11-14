"use client";
// De dónde salen los datos (/fuentes/): la respuesta (cuántas series y de cuántos organismos), la lista por organismo con su sitio oficial
// y sus series, y los detalles técnicos plegados al final. Las cuentas y los textos están en lib/fuentes.ts.
import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useDatos } from "../DatosProvider";
import { Cargando } from "../ui";
import { CabeceraDato } from "../sistema/CabeceraDato";
import { Capitulo } from "../sistema/Capitulo";
import { FUENTES_HTML } from "@/lib/fuentes";
import { agruparPorOrganismo, fraseFuentes, hrefSerie, type GrupoOrganismo } from "@/lib/fuentes-organismos";
import { nf0 } from "@/lib/formato";

export function Fuentes() {
  const { listo, motor, metas, errorGeneral } = useDatos();
  const grupos = useMemo(() => agruparPorOrganismo(metas), [metas]);
  if (errorGeneral) return <p className="error" role="alert">{errorGeneral}</p>;
  if (!listo || !motor) return <Cargando />;
  const r = fraseFuentes(grupos, motor.F);
  return (
    <section className="fue">
      <CabeceraDato nivel={2} titulo="De dónde salen los datos" cifra={r.cifra} unidad="series" fecha={r.fecha} deltas={[]} frase={r.frase} />
      <Capitulo id="organismos" titulo="Por organismo" bajada="Tocá un organismo para ver sus series; cada una lleva a su gráfico.">
        <ul className="fue-lista">
          {grupos.map((g) => <Organismo key={g.nombre} g={g} />)}
        </ul>
      </Capitulo>
      <details className="fue-mas">
        <summary>Detalles técnicos</summary>
        <ul className="method" dangerouslySetInnerHTML={{ __html: FUENTES_HTML }} />
      </details>
    </section>
  );
}

/** Una fila: el nombre y la cantidad de series (abre y cierra la lista) y, aparte, el sitio oficial. Las series se arman recién al abrir. */
function Organismo({ g }: { g: GrupoOrganismo }) {
  const [abierto, setAbierto] = useState(false);
  const id = useId();
  const n = g.series.length;
  return (
    <li className="fue-org">
      <div className="fue-org-cab">
        <button type="button" className="fue-org-boton" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto(!abierto)}>
          <span className="fue-org-nombre">{g.nombre}</span>
          <span className="fue-org-n">{nf0.format(n)} {n === 1 ? "serie" : "series"}</span>
          <span className="fue-org-flecha" aria-hidden="true">{abierto ? "−" : "+"}</span>
        </button>
        {g.link && <a className="fue-org-link" href={g.link} target="_blank" rel="noopener noreferrer" aria-label={`Sitio oficial de ${g.nombre} (se abre en otra pestaña)`}>Sitio oficial ↗</a>}
      </div>
      <div id={id} hidden={!abierto}>
        {abierto && (
          <ul className="fue-series">
            {g.series.map((s) => <li key={s.id}><Link prefetch={false} href={hrefSerie(s.id)}>{s.n}</Link></li>)}
          </ul>
        )}
      </div>
    </li>
  );
}
