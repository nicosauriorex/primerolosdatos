"use client";
// Novedades y calendario (/novedades/, docs/specs/novedades-calendario.md): lo que salió en los últimos días, agrupado por día, y las próximas fechas.
// Cada publicación muestra la cifra, el cambio y el contexto de la ficha (lib/novedades.ts usa las mismas funciones que la ficha), con "Ver" y "Compartir".
// El archivo lo arma el pipeline (aparte del catálogo); si falta o falla, la página lo dice y el resto del sitio sigue.
import { useMemo } from "react";
import Link from "next/link";
import { useNovedades, useDatosNovedades } from "../useNovedades";
import { Cargando } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { Delta } from "../sistema/Delta";
import { Compartir } from "../FichaDato";
import { MESES } from "@/lib/formato";
import type { Expr, SerieMeta } from "@/lib/motor";
import {
  agruparCalendario, agruparPorDia, anioDe, calendarioVisible, etiquetaDia, fechaLarga, hrefFicha, LINK_CALENDARIO_INDEC, periodoDe, restoDe,
  type DatoNovedad, type Novedades as DatosNovedades, type Publicacion, type ProximaFecha,
} from "@/lib/novedades";

/** "2026-11-16T17:20" → "16-nov, 17:20" (la hora ya viene en hora argentina). */
function actualizadoTxt(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(iso);
  return m ? `${m[3]}-${MESES[+m[2] - 1]}, ${m[4]}` : null;
}

export function Novedades() {
  const { datos, error } = useNovedades();
  if (error) return <div className="nov-error"><p className="error" role="alert">{error}</p><p className="note">El resto del sitio sigue funcionando. Probá de nuevo en un rato.</p></div>;
  if (!datos) return <Cargando texto="Cargando las novedades…" />;
  if (!datos.publicaciones.length && !datos.calendario.length) return <p className="note nov-vacio">Todavía no hay novedades registradas.</p>;
  return <Cuerpo datos={datos} />;
}

function Cuerpo({ datos }: { datos: DatosNovedades }) {
  const proximas = useMemo(() => calendarioVisible(datos), [datos]);
  const { listo, dato, expr, meta, metas } = useDatosNovedades(datos.publicaciones, proximas);
  const anio = anioDe(datos);
  const dias = agruparPorDia(datos.publicaciones), fechas = agruparCalendario(proximas);
  const act = actualizadoTxt(datos.generado);
  if (!listo) return <Cargando texto="Cargando las novedades…" />;

  return (
    <section className="nov">
      <Capitulo id="nov-ultimo" titulo="Lo último que salió" bajada="Los datos oficiales que se publicaron en los últimos 45 días, con la cifra y cuánto cambió contra el período anterior.">
        {dias.length === 0 ? <p className="note">En los últimos 45 días no se registró ningún dato nuevo.</p> : dias.map((d) => (
          <section key={d.fecha} className="nov-dia" aria-labelledby={`nov-d-${d.fecha}`}>
            <h3 className="nov-dia-titulo" id={`nov-d-${d.fecha}`}>{fechaLarga(d.fecha, anio)}</h3>
            <ul className="nov-lista">
              {d.items.map((p) => <li key={`${p.principal}|${p.periodo}`}><FilaPublicacion p={p} d={dato(p.principal, p.periodo)} resto={restoDe(p, metas)} expr={expr} nombreMeta={meta(p.principal)?.n} /></li>)}
            </ul>
          </section>
        ))}
      </Capitulo>

      <Capitulo id="nov-proximo" titulo="Lo próximo" bajada="Las fechas en que se publican los próximos datos de los próximos 45 días.">
        {fechas.length === 0 ? <p className="note">No hay próximas fechas cargadas.</p> : fechas.map((d) => (
          <section key={`${d.fecha}|${d.estimado}`} className="nov-dia" aria-labelledby={`nov-p-${d.fecha}-${d.estimado ? "e" : "o"}`}>
            <h3 className="nov-dia-titulo" id={`nov-p-${d.fecha}-${d.estimado ? "e" : "o"}`}>{etiquetaDia(d.fecha, d.estimado, anio)}</h3>
            <ul className="nov-lista">
              {d.items.map((c) => <li key={`${c.principal}|${c.periodo}|${c.hora ?? ""}`}><FilaProxima c={c} d={dato(c.principal, c.periodo)} expr={expr} nombreMeta={meta(c.principal)?.n} /></li>)}
            </ul>
          </section>
        ))}
      </Capitulo>

      <section className="nov-pie" aria-label="De dónde sale cada cosa">
        <h2 className="nov-pie-titulo">De dónde sale cada cosa</h2>
        <p className="note">
          Lo que salió se registra cada vez que el sitio baja los datos y encuentra un período nuevo en una fuente oficial.
          Las fechas con hora salen del <a href={LINK_CALENDARIO_INDEC} target="_blank" rel="noopener noreferrer">calendario oficial del INDEC</a>.
          Las que dicen «estimado» se calculan según los días del mes en que entraron los datos antes: pueden correrse.
        </p>
        {datos.indecSinDatos > 0 && (
          <p className="note">{datos.indecSinDatos === 1 ? "1 informe del INDEC de esas fechas no tiene datos en este sitio." : `${datos.indecSinDatos} informes del INDEC de esas fechas no tienen datos en este sitio.`}</p>
        )}
        {act && <p className="note">Última actualización: {act}.</p>}
      </section>
    </section>
  );
}

/** Cifra, cambio y mes del dato (si no es el de la publicación). */
function Cifra({ d }: { d: DatoNovedad }) {
  const dl = d.delta;
  return (
    <>
      <b className="nov-num">{d.cifra ?? "–"}</b>
      {dl && <Delta texto={dl.texto} tono={dl.tono} dir={dl.dir} contra={dl.contra} etiqueta={dl.etiqueta} />}
      {d.cifraDe && <small className="nov-nota">dato de {d.cifraDe}</small>}
    </>
  );
}

function FilaPublicacion({ p, d, resto, expr, nombreMeta }: { p: Publicacion; d: DatoNovedad | null; resto: SerieMeta[]; expr: (id: string) => Expr | null; nombreMeta?: string }) {
  const nombre = d?.nombre ?? nombreMeta ?? p.principal, periodo = d?.periodoTxt ?? periodoDe(null, { id: p.principal }, p.periodo);
  const e = d?.e ?? expr(p.principal), href = d?.href ?? (e ? hrefFicha(e) : null);
  return (
    <div className="nov-fila">
      <div className="nov-dato">
        <p className="nov-titulo"><b>{nombre}</b><span className="nov-periodo"> · {periodo}</span></p>
        {d?.contexto && <p className="nov-ctx">{d.contexto}</p>}
        {resto.length > 0 && (
          <details className="nov-mas">
            <summary>y {resto.length === 1 ? "1 dato más" : `${resto.length} datos más`}</summary>
            <ul>
              {resto.map((s) => { const x = expr(s.id); return <li key={s.id}>{x ? <Link prefetch={false} href={hrefFicha(x)}>{s.n}</Link> : s.n}</li>; })}
            </ul>
          </details>
        )}
      </div>
      <div className="nov-cifra">{d ? <Cifra d={d} /> : <span className="nov-nota">Sin cifra</span>}</div>
      <div className="nov-acciones">
        {href && <Link prefetch={false} href={href} className="chip-c" aria-label={`Ver ${nombre}`}>Ver</Link>}
        {d && <Compartir titulo={d.nombre} href={d.href} texto={d.texto} vista={d.vista ? () => d.vista : undefined} />}
      </div>
    </div>
  );
}

function FilaProxima({ c, d, expr, nombreMeta }: { c: ProximaFecha; d: DatoNovedad | null; expr: (id: string) => Expr | null; nombreMeta?: string }) {
  const nombre = d?.nombre ?? nombreMeta ?? c.principal, periodo = d?.periodoTxt ?? periodoDe(null, { id: c.principal }, c.periodo);
  const e = d?.e ?? expr(c.principal), href = d?.href ?? (e ? hrefFicha(e) : null);
  return (
    <div className="nov-fila nov-fila-prox">
      <div className="nov-dato">
        <p className="nov-titulo"><b>{nombre}</b><span className="nov-periodo"> · {periodo}</span></p>
      </div>
      <div className="nov-cifra">{c.estimado ? <span className="nov-etiqueta">Estimado</span> : c.hora ? <b className="nov-hora">{c.hora}</b> : null}</div>
      <div className="nov-acciones">{href && <Link prefetch={false} href={href} className="chip-c" aria-label={`Ver ${nombre}`}>Ver</Link>}</div>
    </div>
  );
}
