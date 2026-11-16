"use client";
// Bloque "Novedades" de la portada (docs/specs/novedades-calendario.md): las 3 publicaciones más recientes y las 3 próximas fechas, con link a /novedades/.
// Baja novedades.json recién cuando el bloque está por entrar en pantalla; sin el archivo (o vacío) no aparece nada.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useNovedades, useDatosNovedades } from "../useNovedades";
import { Capitulo } from "../sistema/Capitulo";
import { Delta } from "../sistema/Delta";
import { anioDe, calendarioVisible, etiquetaDia, fechaLarga, hrefFicha, MAX_PORTADA, periodoDe, type DatoNovedad, type Novedades, type ProximaFecha, type Publicacion } from "@/lib/novedades";

export function BloqueNovedades() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const { datos } = useNovedades(visible);   // si falla, el bloque no aparece: la página /novedades/ explica el problema
  const hayAlgo = !!datos && (datos.publicaciones.length > 0 || datos.calendario.length > 0);
  return <div ref={ref}>{datos && hayAlgo && <Bloque datos={datos} />}</div>;
}

function Bloque({ datos }: { datos: Novedades }) {
  const ultimas = useMemo(() => datos.publicaciones.slice(0, MAX_PORTADA), [datos]);
  const proximas = useMemo(() => calendarioVisible(datos).slice(0, MAX_PORTADA), [datos]);
  const { listo, dato, expr, meta } = useDatosNovedades(ultimas, proximas);
  const anio = anioDe(datos);
  if (!listo) return null;
  return (
    <div className="bloque ancho">
      <Capitulo id="novedades" titulo="Novedades" bajada="Los últimos datos oficiales que salieron y las próximas fechas de publicación.">
        <div className="nov-portada">
          <section aria-labelledby="nov-pt-ultimo">
            <h3 className="nov-portada-sub" id="nov-pt-ultimo">Lo último que salió</h3>
            {ultimas.length ? (
              <ul className="nov-lista">
                {ultimas.map((p) => <li key={`${p.principal}|${p.periodo}`}><FilaUltima p={p} d={dato(p.principal, p.periodo)} nombre={meta(p.principal)?.n} href={(() => { const e = expr(p.principal); return e ? hrefFicha(e) : null; })()} anio={anio} /></li>)}
              </ul>
            ) : <p className="note">En los últimos 45 días no se registró ningún dato nuevo.</p>}
          </section>
          <section aria-labelledby="nov-pt-proximo">
            <h3 className="nov-portada-sub" id="nov-pt-proximo">Lo próximo</h3>
            {proximas.length ? (
              <ul className="nov-lista">
                {proximas.map((c) => <li key={`${c.principal}|${c.periodo}|${c.fecha}`}><FilaProxima c={c} d={dato(c.principal, c.periodo)} nombre={meta(c.principal)?.n} href={(() => { const e = expr(c.principal); return e ? hrefFicha(e) : null; })()} anio={anio} /></li>)}
              </ul>
            ) : <p className="note">No hay próximas fechas cargadas.</p>}
          </section>
        </div>
        <p className="ver-todos"><Link prefetch={false} href="/novedades/" className="btn">Ver todas las novedades y el calendario</Link></p>
      </Capitulo>
    </div>
  );
}

function FilaUltima({ p, d, nombre, href, anio }: { p: Publicacion; d: DatoNovedad | null; nombre?: string; href: string | null; anio: number }) {
  const titulo = d?.nombre ?? nombre ?? p.principal, periodo = d?.periodoTxt ?? periodoDe(null, { id: p.principal }, p.periodo);
  const cuerpo = (
    <>
      <span className="nov-dato">
        <span className="nov-titulo"><b>{titulo}</b><span className="nov-periodo"> · {periodo}</span></span>
        <small className="nov-nota">{fechaLarga(p.fecha, anio)}</small>
      </span>
      {d && (
        <span className="nov-cifra">
          <b className="nov-num">{d.cifra ?? "–"}</b>
          {d.delta && <Delta texto={d.delta.texto} tono={d.delta.tono} dir={d.delta.dir} contra={d.delta.contra} etiqueta={d.delta.etiqueta} />}
        </span>
      )}
    </>
  );
  return href ? <Link prefetch={false} href={href} className="nov-fila nov-fila-link" aria-label={`Ver ${titulo}, ${periodo}`}>{cuerpo}</Link> : <div className="nov-fila">{cuerpo}</div>;
}

function FilaProxima({ c, d, nombre, href, anio }: { c: ProximaFecha; d: DatoNovedad | null; nombre?: string; href: string | null; anio: number }) {
  const titulo = d?.nombre ?? nombre ?? c.principal, periodo = d?.periodoTxt ?? periodoDe(null, { id: c.principal }, c.periodo);
  const cuerpo = (
    <>
      <span className="nov-dato">
        <span className="nov-titulo"><b>{titulo}</b><span className="nov-periodo"> · {periodo}</span></span>
        <small className="nov-nota">{etiquetaDia(c.fecha, c.estimado, anio)}{c.hora ? ` · ${c.hora}` : ""}</small>
      </span>
      {c.estimado && <span className="nov-cifra"><span className="nov-etiqueta">Estimado</span></span>}
    </>
  );
  return href ? <Link prefetch={false} href={href} className="nov-fila nov-fila-link" aria-label={`Ver ${titulo}, ${periodo}`}>{cuerpo}</Link> : <div className="nov-fila">{cuerpo}</div>;
}
