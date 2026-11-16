"use client";
// Novedades y calendario (/novedades/, docs/specs/novedades-calendario.md y docs/specs/ajustes-tanda-13.md): dos pestañas, «Novedades» (lo que salió en los últimos
// días, agrupado por día) y «Calendario» (las próximas fechas), cada una con la grilla del mes arriba y la línea cronológica debajo. La pestaña va en la URL (?vista=calendario).
// Cada publicación muestra la cifra, el cambio y el contexto de la ficha (lib/novedades.ts usa las mismas funciones que la ficha), con "Ver" y "Compartir";
// cada fecha próxima, con "Ver" y "Agendar" (Google Calendar o .ics).
// El archivo lo arma el pipeline (aparte del catálogo); si falta o falla, la página lo dice y el resto del sitio sigue.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useNovedades, useDatosNovedades } from "../useNovedades";
import { Cargando, Desplegable, Modal, Seg, useCerrarModal } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { Delta } from "../sistema/Delta";
import { Compartir } from "../FichaDato";
import { rondaAbierta, RUTA_PREDICCIONES, usePredicciones } from "@/lib/predicciones";
import { MESES } from "@/lib/formato";
import { useParams } from "@/lib/url";
import { bajarIcs, linkGoogleCalendar } from "@/lib/agenda";
import type { Expr, SerieMeta } from "@/lib/motor";
import {
  agruparCalendario, agruparPorDia, agruparSeries, anioDe, calendarioVisible, conteoPorDia, eventoDeFecha, grillaMes, hoyArg, hrefFicha, LINK_CALENDARIO_INDEC,
  mesDe, nombreIcs, periodoDe, rangoMeses, restoDe, resumenResto, sumarMes, textoDiaGrilla, tituloDia, tituloMes,
  type ConteoDia, type DatoNovedad, type Novedades as DatosNovedades, type Publicacion, type ProximaFecha,
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

/** Id del título de un día de la lista (a donde baja la grilla). */
const idDia = (fecha: string, prox: boolean, est = false) => (prox ? `nov-p-${fecha}-${est ? "e" : "o"}` : `nov-d-${fecha}`);

function Cuerpo({ datos }: { datos: DatosNovedades }) {
  const proximas = useMemo(() => calendarioVisible(datos), [datos]);
  const { listo, dato, expr, meta, metas } = useDatosNovedades(datos.publicaciones, proximas);
  const [params, set] = useParams();
  const anio = anioDe(datos);
  const dias = useMemo(() => agruparPorDia(datos.publicaciones), [datos]), fechas = useMemo(() => agruparCalendario(proximas), [proximas]);
  const act = actualizadoTxt(datos.generado);
  const abierta = rondaAbierta(usePredicciones().datos);   // «Predecí» en el renglón del IPC mientras hay una ronda abierta
  const hoy = useMemo(() => hoyArg(), []);
  const vista = params.get("vista") === "calendario" ? "calendario" : "novedades";
  // Días abiertos (punto 9): al entrar, el más reciente de Novedades y el más próximo del Calendario; los ids de las dos pestañas no se pisan.
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set([dias[0] ? idDia(dias[0].fecha, false) : "", fechas[0] ? idDia(fechas[0].fecha, true, fechas[0].estimado) : ""]));
  const [destino, setDestino] = useState<string | null>(null);
  const alternar = (id: string) => setAbiertos((a) => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const irA = (id: string) => { setAbiertos((a) => (a.has(id) ? a : new Set(a).add(id))); setDestino(id); };
  useEffect(() => {
    if (!destino) return;
    document.getElementById(destino)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    setDestino(null);
  }, [destino]);
  const nombreDe = (x: { principal: string; periodo: string }) => dato(x.principal, x.periodo)?.nombre ?? meta(x.principal)?.n ?? x.principal;
  const resumenDe = (items: { principal: string; periodo: string }[]) => `${items.length} ${items.length === 1 ? "publicación" : "publicaciones"}: ${items.map(nombreDe).join(", ")}`;
  if (!listo) return <Cargando texto="Cargando las novedades…" />;

  return (
    <section className="nov">
      <div className="nov-vista">
        <Seg etiqueta="Qué ver" valor={vista} opciones={[["novedades", "Novedades"], ["calendario", "Calendario"]]} onElegir={(v) => set({ vista: v === "calendario" ? v : null })} />
      </div>

      {vista === "novedades" ? (
        <Capitulo id="nov-ultimo" titulo="Lo último que salió" bajada="Los datos oficiales que se publicaron en los últimos 45 días, con la cifra y cuánto cambió contra el período anterior.">
          <ZonaCalendario key="nov" items={datos.publicaciones} prox={false} hoy={hoy} verbo="salieron" idDe={(f) => idDia(f, false)} onIr={irA} dato={dato} expr={expr} meta={meta} />
          {dias.length === 0 ? <p className="note">En los últimos 45 días no se registró ningún dato nuevo.</p> : dias.map((d) => (
            <DiaTitulado key={d.fecha} id={idDia(d.fecha, false)} fecha={d.fecha} estimado={false} anio={anio} resumen={resumenDe(d.items)} abierto={abiertos.has(idDia(d.fecha, false))} onAlternar={alternar}>
              <ul className="nov-lista">
                {d.items.map((p) => <li key={`${p.principal}|${p.periodo}`}><FilaPublicacion p={p} d={dato(p.principal, p.periodo)} resto={restoDe(p, metas)} expr={expr} nombreMeta={meta(p.principal)?.n} /></li>)}
              </ul>
            </DiaTitulado>
          ))}
        </Capitulo>
      ) : (
        <Capitulo id="nov-proximo" titulo="Lo próximo" bajada="Las fechas en que se publican los próximos datos de los próximos 45 días.">
          <ZonaCalendario key="cal" items={proximas} prox hoy={hoy} verbo="salen" idDe={(f) => idDia(f, true, !fechas.some((d) => d.fecha === f && !d.estimado))} onIr={irA} dato={dato} expr={expr} meta={meta} />
          {fechas.length === 0 ? <p className="note">No hay próximas fechas cargadas.</p> : fechas.map((d) => (
            <DiaTitulado key={`${d.fecha}|${d.estimado}`} id={idDia(d.fecha, true, d.estimado)} fecha={d.fecha} estimado={d.estimado} anio={anio} resumen={resumenDe(d.items)} abierto={abiertos.has(idDia(d.fecha, true, d.estimado))} onAlternar={alternar}>
              <ul className="nov-lista">
                {d.items.map((c) => <li key={`${c.principal}|${c.periodo}|${c.hora ?? ""}`}><FilaProxima predecir={abierta != null && c.principal === "ipc_empalme" && c.periodo === abierta.periodo} c={c} d={dato(c.principal, c.periodo)} expr={expr} nombreMeta={meta(c.principal)?.n} /></li>)}
              </ul>
            </DiaTitulado>
          ))}
        </Capitulo>
      )}

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

/** Un día de la lista, como desplegable grande: el título es el botón (número grande, otro fondo que los renglones: R31) y solo queda fijo arriba cuando está abierto. */
function DiaTitulado({ id, fecha, estimado, anio, resumen, abierto, onAlternar, children }: { id: string; fecha: string; estimado: boolean; anio: number; resumen: string; abierto: boolean; onAlternar: (id: string) => void; children: ReactNode }) {
  const t = tituloDia(fecha, estimado, anio);
  return (
    <section className={`nov-dia${abierto ? " nov-dia-abierto" : ""}`} id={id}>
      <h3 className="nov-dia-titulo">
        <button type="button" className="nov-dia-btn" aria-expanded={abierto} aria-controls={`${id}-c`} aria-label={`${t.completo}: ${resumen}`} onClick={() => onAlternar(id)}>
          <span className="nov-dia-num" aria-hidden="true">{t.num}</span>
          <span className="nov-dia-texto" aria-hidden="true">
            <span className="nov-dia-resto">{t.resto}</span>
            {!abierto && <span className="nov-dia-resumen">{resumen}</span>}
          </span>
          <svg className="nov-dia-flecha" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </h3>
      <div id={`${id}-c`} hidden={!abierto}>{abierto && children}</div>
    </section>
  );
}

/** ¿La pantalla es de computadora (≥ 900 px)? Ahí el resumen del día va en un panel al lado de la grilla; debajo, en una ventana. Empieza en falso hasta medir. */
function useAncho900(): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)"), f = () => setV(mq.matches);
    f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return v;
}

type ItemDia = { fecha: string; principal: string; periodo: string; estimado?: boolean; hora?: string | null };
type PropsZona = {
  items: ItemDia[]; prox: boolean; hoy: string; verbo: string; idDe: (f: string) => string; onIr: (id: string) => void;
  dato: (principal: string, periodo: string) => DatoNovedad | null | undefined; expr: (id: string) => Expr | null; meta: (id: string) => { n?: string } | null | undefined;
};
/** Grilla chica del mes + resumen del día elegido: panel a la derecha desde 900 px, ventana debajo (tocar un día con algo). */
function ZonaCalendario({ items, prox, hoy, verbo, idDe, onIr, dato, expr, meta }: PropsZona) {
  const ancho = useAncho900();
  const [elegido, setElegido] = useState(items[0]?.fecha ?? "");   // el primero ya viene en el orden de la pestaña: el más reciente o el más próximo
  const [ventana, setVentana] = useState<string | null>(null);
  // Al pasar a 900 px o más, la ventana se cierra (manda el panel); si no, reaparecería sola al volver a achicar.
  useEffect(() => { if (ancho) setVentana(null); }, [ancho]);
  if (!items.length) return null;
  const tocar = (f: string) => { if (ancho) setElegido(f); else setVentana(f); };
  const resumen = (f: string, enModal: boolean) => <ResumenDia fecha={f} items={items.filter((x) => x.fecha === f)} prox={prox} enModal={enModal} idDe={idDe} onIr={onIr} dato={dato} expr={expr} meta={meta} />;
  return (
    <div className="nov-zona">
      <GrillaMes items={items} hoy={hoy} verbo={verbo} marcada={ancho ? elegido : null} onElegir={tocar} />
      {ancho && elegido && <aside className="nov-panel" aria-label="Resumen del día elegido">{resumen(elegido, false)}</aside>}
      {!ancho && ventana && (
        <Modal titulo="Resumen del día" cabecera={tituloResumen(ventana, items)} onCerrar={() => setVentana(null)}>
          {resumen(ventana, true)}
        </Modal>
      )}
    </div>
  );
}

const MAX_RESUMEN = 6;
/** «13 de noviembre · 11 publicaciones» (las estimadas, marcadas). */
const tituloResumen = (f: string, items: ItemDia[]) => textoDiaGrilla(f, conteoPorDia(items.filter((x) => x.fecha === f)).get(f)).replace(": ", " · ");

/** Resumen de un día: un renglón por publicación (cifra y cambio, u hora) con «Ver», y el paso a ese día en la lista. */
function ResumenDia({ fecha, items, prox, enModal, idDe, onIr, dato, expr, meta }: Omit<PropsZona, "hoy" | "verbo"> & { fecha: string; enModal: boolean }) {
  const cerrarModal = useCerrarModal();
  // En el panel (al lado de la grilla) van todas: la lista se desliza por dentro y el panel no pasa del alto de la grilla. En la ventana, las primeras.
  const visibles = enModal ? items.slice(0, MAX_RESUMEN) : items, mas = items.length - visibles.length;
  const ir = () => { const id = idDe(fecha); if (enModal) cerrarModal(() => onIr(id)); else onIr(id); };
  return (
    <div className="nov-res">
      {!enModal && <h3 className="nov-res-tit">{tituloResumen(fecha, items)}</h3>}
      <ul className="nov-res-lista">
        {visibles.map((x) => {
          const d = dato(x.principal, x.periodo) ?? null, e = d?.e ?? expr(x.principal), href = d?.href ?? (e ? hrefFicha(e) : null);
          const nombre = d?.nombre ?? meta(x.principal)?.n ?? x.principal, periodo = d?.periodoTxt ?? periodoDe(null, { id: x.principal }, x.periodo);
          return (
            <li key={`${x.principal}|${x.periodo}|${x.hora ?? ""}`} className="nov-res-fila">
              <p className="nov-res-dato"><b>{nombre}</b><span className="nov-periodo"> · {periodo}</span></p>
              <div className="nov-cifra nov-res-cifra">
                {prox ? (x.estimado ? <span className="nov-etiqueta">Estimado</span> : x.hora ? <b className="nov-hora">{x.hora}</b> : null) : d ? <Cifra d={d} /> : <span className="nov-nota">Sin cifra</span>}
              </div>
              {href && <Link prefetch={false} href={href} className="chip-c nov-res-ver" aria-label={`Ver ${nombre}`}>Ver</Link>}
            </li>
          );
        })}
      </ul>
      {mas > 0 && <p className="nov-nota nov-res-mas">y {mas} más</p>}
      <button type="button" className="chip-c nov-res-ir" onClick={ir}>Ir al día en la lista ↓</button>
    </div>
  );
}

const DIAS_SEM = ["L", "M", "M", "J", "V", "S", "D"];
/** Grilla compacta del mes (lunes a domingo) con la cantidad de publicaciones de cada día; tocar un día con algo lo elige. */
function GrillaMes({ items, hoy, verbo, marcada, onElegir }: { items: { fecha: string; estimado?: boolean }[]; hoy: string; verbo: string; marcada: string | null; onElegir: (f: string) => void }) {
  const conteo = useMemo(() => conteoPorDia(items), [items]);
  const rango = useMemo(() => rangoMeses(items.map((x) => x.fecha)), [items]);
  const [mes, setMes] = useState(rango?.inicial ?? mesDe(hoy));
  if (!rango) return null;
  const variosMeses = rango.min !== rango.max;   // las flechas solo aparecen si hay a dónde ir
  return (
    <div className="nov-cal" role="group" aria-label={`Calendario de ${tituloMes(mes)}: lo que ${verbo}`}>
      <div className="nov-cal-cab">
        {variosMeses && <button type="button" className="chip-c" aria-label="Mes anterior" disabled={mes <= rango.min} onClick={() => setMes(sumarMes(mes, -1))}>‹</button>}
        <b className="nov-cal-mes" aria-live="polite">{tituloMes(mes)}</b>
        {variosMeses && <button type="button" className="chip-c" aria-label="Mes siguiente" disabled={mes >= rango.max} onClick={() => setMes(sumarMes(mes, 1))}>›</button>}
      </div>
      <div className="nov-cal-grilla">
        {DIAS_SEM.map((d, i) => <span key={i} className="nov-cal-sem" aria-hidden="true">{d}</span>)}
        {grillaMes(mes).flat().map((f, i) => f ? <CeldaDia key={f} f={f} c={conteo.get(f)} hoy={f === hoy} elegida={f === marcada} onElegir={onElegir} /> : <span key={`v${i}`} className="nov-gd nov-gd-fuera" />)}
      </div>
    </div>
  );
}

/** Un día de la grilla: botón si tiene algo (con el numerito de publicaciones; el de las estimadas, en contorno), celda quieta si no. */
function CeldaDia({ f, c, hoy, elegida, onElegir }: { f: string; c: ConteoDia | undefined; hoy: boolean; elegida: boolean; onElegir: (f: string) => void }) {
  const hay = !!c && (c.oficiales > 0 || c.estimadas > 0);
  const cuerpo = (
    <>
      <span className="nov-gd-num">{Number(f.slice(8))}</span>
      {c && c.oficiales > 0 && <span className="nov-bola" aria-hidden="true">{c.oficiales}</span>}
      {c && c.estimadas > 0 && <span className="nov-bola nov-bola-est" aria-hidden="true">{c.estimadas}</span>}
    </>
  );
  const clase = `nov-gd${hoy ? " nov-gd-hoy" : ""}${hay ? " nov-gd-con" : ""}${elegida ? " nov-gd-elegida" : ""}`;
  const etiqueta = `${textoDiaGrilla(f, c)}${hoy ? " (hoy)" : ""}`;
  return hay
    ? <button type="button" className={clase} aria-label={etiqueta} aria-current={hoy ? "date" : undefined} aria-pressed={elegida} onClick={() => onElegir(f)}>{cuerpo}</button>
    : <span className={clase} role="img" aria-label={etiqueta} aria-current={hoy ? "date" : undefined}>{cuerpo}</span>;
}

/** «y 431 datos más: …»: las series de la publicación agrupadas por subcategoría, en una caja que se desliza por dentro (los títulos de grupo quedan fijos arriba de la caja). */
function SeriesResto({ resto, expr }: { resto: SerieMeta[]; expr: (id: string) => Expr | null }) {
  const grupos = useMemo(() => agruparSeries(resto), [resto]);
  return (
    <details className="nov-mas">
      <summary>{resumenResto(grupos, resto.length)}</summary>
      <div className="nov-caja" tabIndex={0} role="region" aria-label="Datos de esta publicación">
        {grupos.map((g) => <GrupoSeries key={g.nombre} nombre={g.nombre} series={g.series} expr={expr} />)}
      </div>
    </details>
  );
}
function GrupoSeries({ nombre, series, expr }: { nombre: string; series: SerieMeta[]; expr: (id: string) => Expr | null }) {
  return (
    <div className="nov-grupo">
      <p className="nov-grupo-cab"><b>{nombre}</b> <span className="nov-grupo-n">{series.length === 1 ? "1 dato" : `${series.length} datos`}</span></p>
      <ul className="nov-series">
        {series.map((s) => { const x = expr(s.id); return <li key={s.id}>{x ? <Link prefetch={false} href={hrefFicha(x)}>{s.n}</Link> : s.n}</li>; })}
      </ul>
    </div>
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
      </div>
      <div className="nov-cifra">{d ? <Cifra d={d} /> : <span className="nov-nota">Sin cifra</span>}</div>
      <div className="nov-acciones">
        {href && <Link prefetch={false} href={href} className="chip-c" aria-label={`Ver ${nombre}`}>Ver</Link>}
        {d && <Compartir titulo={d.nombre} href={d.href} texto={d.texto} vista={d.vista ? () => d.vista : undefined} />}
      </div>
      {resto.length > 0 && <div className="nov-resto"><SeriesResto resto={resto} expr={expr} /></div>}
    </div>
  );
}

function FilaProxima({ c, d, expr, nombreMeta, predecir }: { predecir: boolean; c: ProximaFecha; d: DatoNovedad | null; expr: (id: string) => Expr | null; nombreMeta?: string }) {
  const nombre = d?.nombre ?? nombreMeta ?? c.principal, periodo = d?.periodoTxt ?? periodoDe(null, { id: c.principal }, c.periodo);
  const e = d?.e ?? expr(c.principal), href = d?.href ?? (e ? hrefFicha(e) : null);
  return (
    <div className="nov-fila nov-fila-prox">
      <div className="nov-dato">
        <p className="nov-titulo"><b>{nombre}</b><span className="nov-periodo"> · {periodo}</span></p>
      </div>
      <div className="nov-cifra">{c.estimado ? <span className="nov-etiqueta">Estimado</span> : c.hora ? <b className="nov-hora">{c.hora}</b> : null}</div>
      <div className="nov-acciones">
        {href && <Link prefetch={false} href={href} className="chip-c" aria-label={`Ver ${nombre}`}>Ver</Link>}
        {href && <Agendar c={c} nombre={nombre} periodo={periodo} href={href} />}
        {predecir && <Link prefetch={false} href={RUTA_PREDICCIONES} className="chip-c" aria-label={`Predecí la inflación de ${periodo}`}>Predecí</Link>}
      </div>
    </div>
  );
}

/** «Agendar»: Google Calendar o un archivo .ics (se arma en el navegador). El evento es a la hora del calendario, o de día completo si es una estimación. */
function Agendar({ c, nombre, periodo, href }: { c: ProximaFecha; nombre: string; periodo: string; href: string }) {
  const ev = eventoDeFecha(c, nombre, periodo, href);
  return (
    <Desplegable className="nov-agendar" etiqueta="Agendar">
      {(cerrar) => (
        <div className="nov-agendar-op">
          <a className="nov-agendar-item" href={linkGoogleCalendar(ev)} target="_blank" rel="noopener noreferrer" onClick={() => cerrar()}>Google Calendar</a>
          <button type="button" className="nov-agendar-item" onClick={() => { bajarIcs(ev, nombreIcs(c, href)); cerrar(); }}>Bajar evento (.ics)</button>
        </div>
      )}
    </Desplegable>
  );
}
