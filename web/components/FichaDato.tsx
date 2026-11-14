"use client";
// Ficha del dato: una variable contada en capítulos cortos, cada uno con su pregunta (docs/specs/remodelacion-fichas.md):
// Ahora (cifra, cambios y "Ver también"), ¿Cómo viene? (el gráfico con su período), ¿Cómo fue <mes> en otros años?,
// ¿Cómo le fue con cada presidente? (tabla o velas), Mes a mes desde que asumió, Gráficos listos y, plegado al final, Cómo se mide.
// Cada capítulo tiene su Compartir (imagen, link y texto) y, si corresponde, "Abrir completo" con la variable ya cargada en esa sección.
// La usan la página de cada tema y la ruta /dato/.
import { useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSeccion } from "./useSeccion";
import { useConfig } from "./ConfigProvider";
import { useDeslizable } from "./Movimiento";
import { Cargando } from "./ui";
import { Grafico, type Fila, type OpcionesG, type SerieG } from "./Grafico";
import { Velas } from "./Velas";
import { PanelCompartir, type VistaCompartir } from "./PanelCompartir";
import { IconoIr } from "./Iconos";
import { PALETA, vcolor } from "./util";
import { LineaInicio, type InicioMandato } from "./secciones/comunes";
import { CabeceraDato } from "./sistema/CabeceraDato";
import { Capitulo } from "./sistema/Capitulo";
import { CompartirHoja } from "./sistema/CompartirHoja";
import { FilaChips } from "./sistema/FilaChips";
import { AjustesTabla, TablaMandatos } from "./sistema/TablaMandatos";
import { GraficosListos } from "./GraficosListos";
import { BarrasMes } from "./sistema/BarrasMes";
import { unoDe } from "@/lib/url";
import { baseDeConfig } from "@/lib/config";
import { AYUDA_T, PRES_DEF, baseTxt, crearPres, etiqueta, franjasPres, nivelComparable, nombreCorto, statsMandato } from "@/lib/estadisticas";
import { fmtMes } from "@/lib/formato";
import { frecuenciaOrigen, textoTemporalidad } from "@/lib/historico";
import { datoFijoDe, hrefFijo } from "@/lib/datos-fijos";
import { fmtEjeDe, notaInflacion, tituloVariable } from "@/lib/imagen-datos";
import { fuentePublica } from "@/lib/fuente-publica";
import type { Expr, Motor, SerieMeta } from "@/lib/motor";
import { hrefDato, hrefHistorico, idsDe } from "@/lib/temas";
import {
  cabeceraFicha, filasMandatosFicha, historicoFicha, hrefMandatoDe, hrefPresidentesDe, mandatoFicha, mesesIguales, paramsInicio, periodosFicha,
  relacionadasDe, sinMandatoTxt, velasDe, type CabeceraFicha, type PeriodoFicha,
} from "@/lib/ficha";

type SetFn = (cambios: Record<string, string | null | undefined>) => void;
type Nivel = 2 | 3;
/** Link que dan Compartir y "Copiar link": si la variable es un dato fijo, su página propia (/dato/<slug>/, con vista previa en redes)
 *  con lo que se está viendo (período, vista, presidente resaltado, inicio de mandato); si no, la sección con la variable. */
const linkCompartir = (e: Expr, seccion: string, extra: Record<string, string> = {}): string => {
  const fijo = datoFijoDe(e);
  return fijo ? hrefFijo(fijo.slug, extra) : seccion;
};
const absoluto = (href: string) => new URL(href, window.location.origin).href;

/** La ficha de una variable. `p`/`set` son los de la página (el período del gráfico va en `fper`; la vista Tabla o Velas, en `pvista`).
 *  `info`: inicio de mandato de la página (`useBase`). `pd`: presidente que se resalta en la tabla y se suma a Meses de mandato.
 *  `nivel`: el de los títulos de los capítulos (2 en /dato/, 3 en los temas); el título del dato va un nivel más arriba.
 *  `titulo`: el nombre que se muestra (si no llega, el nombre público con la medida). `tituloRef`/`tituloId`: para enfocar el título. */
export function FichaDato({ e, info, p, set, pd = null, nivel = 3, titulo, tituloRef, tituloId }: {
  e: Expr; info: InicioMandato; p: URLSearchParams; set: SetFn; pd?: string | null; nivel?: Nivel; titulo?: string; tituloRef?: Ref<HTMLHeadingElement>; tituloId?: string;
}) {
  const ids = useMemo(() => idsDe(e), [e]);
  const sec = useSeccion(ids);
  const { motor: m, version, metas } = sec;
  const error = sec.archivos.some((a) => sec.errores[a]);
  if (!m || sec.ocupado || !m.SER[e.id] || (e.rel && !m.SER[e.rel])) {
    // Mientras carga, el título ya está (así el foco y el desplazamiento de la página del tema tienen adónde ir)
    const nombre = titulo ?? metas.find((s) => s.id === e.id)?.n ?? "";
    const H = nivel === 2 ? "h1" : "h2";
    return (
      <div className="fi">
        {nombre && <header className="cabdato" data-nivel={nivel === 2 ? 1 : 2}><div className="cabdato-titulo"><H ref={tituloRef} id={tituloId} tabIndex={tituloRef ? -1 : undefined}>{nombre}</H></div></header>}
        {error && !sec.ocupado
          ? <p className="error" role="alert">Los datos de esta variable no se pudieron cargar. Probá de nuevo más tarde o recargá la página.</p>
          : <Cargando />}
      </div>
    );
  }
  return <Ficha m={m} version={version} metas={metas} e={e} info={info} p={p} set={set} pd={pd} nivel={nivel} titulo={titulo} tituloRef={tituloRef} tituloId={tituloId} />;
}

function Ficha({ m, version, metas, e, info, p, set, pd, nivel, titulo, tituloRef, tituloId }: {
  m: Motor; version: number; metas: SerieMeta[]; e: Expr; info: InicioMandato; p: URLSearchParams; set: SetFn; pd: string | null; nivel: Nivel;
  titulo?: string; tituloRef?: Ref<HTMLHeadingElement>; tituloId?: string;
}) {
  const kE = `${e.id}~${e.med}~${e.rel}~${e.modo}~${e.esc}`;
  const S = useMemo(() => Object.fromEntries(metas.map((s) => [s.id, s])), [metas]);
  const c = m.calc(e);
  const nombre = titulo ?? tituloVariable(m, e, c);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cab = useMemo(() => cabeceraFicha(m, e), [m, version, kE]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rel = useMemo(() => relacionadasDe(e, S, nivel === 3), [kE, S, nivel]);
  const inicio = paramsInicio(p);
  const b = info.b;
  const PRES = useMemo(() => crearPres(m.F), [m]);
  // Meses de mandato se calcula acá: su nota de cálculo va en "Cómo se mide"
  const mandato = useMemo(() => {
    const PRES_T0 = PRES.filter((x) => m.idxDe(x.ini) > 0);
    return mandatoFicha(m, PRES, PRES_T0, e, b, pd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, version, kE, b, pd, PRES]);
  const fuente = fuentePublica(c.serie.fuente);
  const V = useViene(m, e, version, p);   // el período del gráfico: lo usan el capítulo "¿Cómo viene?" y el Compartir de la cabecera
  const hrefV = hrefHistorico(e, V.per ? { d: V.D.E.desde, h: V.D.E.hasta } : {});
  const textoV = cab ? `${nombre}: ${cab.cifra} en ${cab.fecha}. Fuente: ${fuente}.` : undefined;

  return (
    <div className="fi">
      <CabeceraDato titulo={nombre} nivel={nivel === 2 ? 1 : 2} tituloRef={tituloRef} tituloId={tituloId}
        cifra={cab?.cifra ?? "–"} fecha={cab ? `${cab.fecha}${cab.ultimoDisponible ? " · Último dato disponible" : ""}` : ""}
        deltas={cab?.deltas ?? []} secundarias={cab?.secundarias} frase={cab?.frase}
        fuente={fuente} mesDato={cab?.fecha}
        accion={<Compartir variante="principal" titulo={nombre} href={linkCompartir(e, hrefV, V.per ? { fper: V.per } : {})} texto={textoV}
          vista={() => ({ exprs: [e], modo: "valor", eje: "propia", desde: V.D.E.desde, hasta: V.D.E.hasta, meses: V.D.E.meses, freq: "M", ag: "promedio",
            // la imagen lleva las mismas frases de contexto que la cabecera (F4): la que se ve, o ninguna si la cabecera no muestra
            frases: cab?.fraseClave ? [cab.fraseClave] : [], fraseFija: cab?.frase })} />}
        info={<>{c.serie.desc ? <p>{c.serie.desc}</p> : null}<p>Fuente: {fuente}.</p></>} />
      {rel.length > 0 && <VerTambien rel={rel} />}
      <CapViene m={m} e={e} nivel={nivel} set={set} V={V} />
      <CapMeses m={m} e={e} version={version} nivel={nivel} nombre={nombre} />
      <CapPresidentes m={m} e={e} info={info} nivel={nivel} pd={pd} inicio={inicio} nombre={nombre}
        velas={unoDe(p.get("pvista"), ["tabla", "velas"] as const, "tabla") === "velas"} onVista={(v) => set({ pvista: v ? "velas" : null })} />
      <CapMandato m={m} e={e} D={mandato} nivel={nivel} pd={pd} inicio={inicio} b={b} />
      <GraficosListos m={m} e={e} metas={metas} nivel={nivel} nombre={S[e.id]?.n ?? c.nombre} />
      <details className="fi-metodo">
        <summary>Cómo se mide</summary>
        <div className="fi-metodo-cuerpo">
          <p>Unidad: {c.unidad}. Fuente: {fuente}.</p>
          {notaInflacion([c], false) && <p>{notaInflacion([c], false)}</p>}
          <p>Mes 0 de cada presidente: {baseTxt(b)}. {AYUDA_T}</p>
          {mandato && <p>Mes a mes desde que asumió: {mandato.nota.replace(`Mes 0 = ${baseTxt(b)}.`, "").trim()}</p>}
        </div>
      </details>
    </div>
  );
}

/** "Ver también": links a variables relacionadas, en una fila que se desliza de costado (como los chips). */
function VerTambien({ rel }: { rel: { nombre: string; href: string }[] }) {
  const fila = useRef<HTMLElement>(null);
  useDeslizable(fila, false, rel.length);
  return (
    <div className="fi-ver">
      <span className="fi-ver-rot" aria-hidden="true">Ver también</span>
      <nav ref={fila} className="chips" aria-label="Ver también">
        {rel.map((r) => <Link key={r.href} prefetch={false} href={r.href}><span className="chips-cuerpo">{r.nombre}</span></Link>)}
      </nav>
    </div>
  );
}

/** Compartir: la hoja con imagen (si hay `vista`), link y texto; la imagen abre el panel de siempre. Principal (cabecera del dato, con texto) o de ícono (capítulos). */
function Compartir({ href, titulo, texto, vista, variante = "icono" }: {
  href: string; titulo: string; texto?: string; vista?: () => VistaCompartir | null; variante?: "icono" | "principal";
}) {
  const [abierto, setAbierto] = useState<VistaCompartir | null>(null);
  return (
    <>
      <CompartirHoja variante={variante} href={href} titulo={titulo} texto={texto} onImagen={vista ? () => { const v = vista(); if (v) setAbierto(v); } : undefined} />
      {abierto && createPortal(<PanelCompartir vista={abierto} href={absoluto(href)} titulo={titulo} onCerrar={() => setAbierto(null)} />, document.body)}
    </>
  );
}
function Acciones({ compartir, href, donde }: { compartir: ReactNode; href?: string; donde: string }) {
  return (
    <>
      {compartir}
      {href && <Link prefetch={false} className="btn fi-abrir" href={href} aria-label={`Abrir completo en ${donde}`}>Abrir completo<IconoIr /></Link>}
    </>
  );
}

// ------------------------------------------------------------ ¿Cómo viene? El gráfico de la serie, con su período
/** El período del gráfico de la ficha (`fper` en la URL) y lo que dibuja. Lo comparten el capítulo y el Compartir de la cabecera. */
function useViene(m: Motor, e: Expr, version: number, p: URLSearchParams) {
  const { config } = useConfig();
  const kE = `${e.id}~${e.med}~${e.rel}~${e.modo}~${e.esc}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const opciones = useMemo(() => periodosFicha(m, m.calc(e), config.desde), [m, version, kE, config.desde]);
  // sin `fper` en la URL queda el período de fábrica (el primero de la lista, "" = Desde 2003 o el que corresponda)
  const per = unoDe(p.get("fper"), opciones.map((o) => o[0]), "" as PeriodoFicha);
  const D = useMemo(() => {
    const c = m.calc(e);
    const { E, rows } = historicoFicha(m, c, config.desde, per);
    const fmt = (v: number) => m.fmtC(c, v);
    const series: SerieG[] = [{ key: "s0", name: c.corto, color: PALETA[0], fmt }];
    const opts: OpcionesG = { fmtAxis: fmtEjeDe(c), fmtTip: fmt, tipTitle: etiqueta, label: c.corto,
      marcas: [{ key: "s0", color: PALETA[0], fmt, tipos: new Set(["ult", "max", "min"]) }] };
    const temporal = textoTemporalidad({ freq: "M", ag: "promedio", meses: E.meses, suma: !!c.flujo, origen: frecuenciaOrigen(c.v) });
    return { c, E, rows, series, opts, temporal };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, version, kE, config.desde, per]);
  return { opciones, per, D };
}
type Viene = ReturnType<typeof useViene>;

function CapViene({ m, e, nivel, set, V }: { m: Motor; e: Expr; nivel: Nivel; set: SetFn; V: Viene }) {
  const { config } = useConfig();
  const { opciones, per, D } = V;
  const franjas = useMemo(() => (config.franjas ? franjasPres(m.F, baseDeConfig(config, PRES_DEF.map((x) => x.id))) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.franjas, m, config.t0, JSON.stringify(config.t0p)]);
  const opts = useMemo(() => (franjas ? { ...D.opts, franjas } : D.opts), [D.opts, franjas]);
  const { c, E } = D;
  const href = hrefHistorico(e, per ? { d: E.desde, h: E.hasta } : {});
  // El Compartir de este capítulo está en la cabecera del dato (junto a la cifra): acá solo "Abrir completo"
  return (
    <Capitulo id="fi-viene" nivel={nivel} titulo="¿Cómo viene?" acciones={<Acciones donde="Histórico" href={href} compartir={null} />}>
      {opciones.length > 1 && <FilaChips etiqueta="Período" opciones={opciones} valor={per} onElegir={(v) => set({ fper: v || null })} />}
      <div className="fi-grafico"><Grafico rows={D.rows} series={D.series} opts={opts} /></div>
      <p className="fi-nota">{D.temporal.replace(/\.?$/, ".")} Unidad: {c.unidad}.</p>
    </Capitulo>
  );
}

// ------------------------------------------------------------ ¿Cómo fue <mes> en otros años?
function CapMeses({ m, e, version, nivel, nombre }: { m: Motor; e: Expr; version: number; nivel: Nivel; nombre: string }) {
  const kE = `${e.id}~${e.med}~${e.rel}~${e.modo}~${e.esc}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mi = useMemo(() => mesesIguales(m, e), [m, version, kE]);
  if (!mi) return null;
  return (
    <Capitulo id="fi-meses" nivel={nivel} titulo={`¿Cómo fue ${mi.mes} en otros años?`}
      acciones={<Compartir titulo={`${nombre}: ${mi.mes} de cada año`} href={linkCompartir(e, hrefDato(e))} texto={`${nombre}. ${mi.frase}`} />}>
      <BarrasMes filas={mi.filas} etiqueta={`${nombre}: ${mi.mes} de cada año, de ${mi.filas[0].anio} a ${mi.filas[mi.filas.length - 1].anio}`} />
      <p className="fi-frase">{mi.frase}</p>
    </Capitulo>
  );
}

// ------------------------------------------------------------ ¿Cómo le fue con cada presidente? Tabla o velas
function CapPresidentes({ m, e, info, nivel, pd, inicio, velas: enVelas, onVista, nombre }: {
  m: Motor; e: Expr; info: InicioMandato; nivel: Nivel; pd: string | null; inicio: Record<string, string>; velas: boolean; onVista: (velas: boolean) => void; nombre: string;
}) {
  const F = m.F, c = m.calc(e);
  const [sumadas, setSumadas] = useState<string[]>([]);   // columnas que se suman en "Ajustes de la tabla" (en la ficha no van en el link)
  const T = filasMandatosFicha(m, e, info.b);
  const titulo = "¿Cómo le fue con cada presidente?";
  if (!T.filas.length) {
    return <Capitulo id="fi-pres" nivel={nivel} titulo={titulo}><p className="note">Este dato no tiene valores en ningún mandato desde 1989.</p></Capitulo>;
  }
  const todas = crearPres(F).map((x) => ({ x, st: statsMandato(F, c.v, x, info.b) }));
  const niv = nivelComparable(m, e);
  const { velas, sin } = velasDe(m, c, todas);   // como Por presidente: los que no tienen datos se listan al pie de las velas
  const sinVelas = enVelas && (!niv || velas.length === 0);
  const href = hrefPresidentesDe(e, enVelas, inicio);
  const ids = T.filas.map((f) => f.id);
  const bajada = T.tasa ? "Inicio y cierre de cada mandato y el promedio de todos sus meses." : "Del inicio al cierre de cada mandato.";
  return (
    <Capitulo id="fi-pres" nivel={nivel} titulo={titulo} bajada={bajada} acciones={
      <Acciones donde="Por presidente" href={href} compartir={<>
        <AjustesTabla vista={enVelas ? "velas" : "tabla"} onVista={(v) => onVista(v === "velas")} columnas={T.columnas} extras={T.extras ?? []}
          elegidas={sumadas} onElegidas={setSumadas} />
        <Compartir titulo={`${c.corto} por presidente${enVelas ? " (velas)" : ""}`}
          href={linkCompartir(e, href, { ...inicio, ...(enVelas ? { pvista: "velas" } : {}), ...(pd ? { pd } : {}) })}
          vista={sinVelas ? undefined : () => (enVelas
            ? { tipo: "velas", expr: e, presIds: ids, base: info.b }
            : { tipo: "barras", expr: e, presIds: ids, base: info.b, ...(T.tasa ? { metrica: "prom" as const } : {}) })} /></>} />}>
      <LineaInicio info={info} F={F} />
      <div className="fi-pres-cuerpo">
        {!enVelas ? (
          <TablaMandatos etiqueta={`${nombre} por presidente`} filas={T.filas} columnas={T.columnas} visibles={T.visibles} extras={T.extras} elegidas={sumadas} resaltar={pd ?? undefined} />
        ) : !niv ? (
          <p className="note">En montos corrientes los valores de épocas distintas no se pueden poner en una misma escala (hay inflación de por medio). Elegí una medida real o un índice en &quot;Abrir completo&quot;, o mirá la vista Tabla, que compara las variaciones.</p>
        ) : velas.length ? (
          <Velas velas={velas} sinDatos={sin} unidad={c.unidad} minEscala={m.fmtC(c, Math.min(...velas.map((v) => v.min)))} maxEscala={m.fmtC(c, Math.max(...velas.map((v) => v.max)))} />
        ) : <p className="note">Ningún presidente tiene datos completos de esta variable.</p>}
      </div>
      <p className="fi-nota">Unidad: {c.unidad}.</p>
    </Capitulo>
  );
}

// ------------------------------------------------------------ Mes a mes, desde que asumió (Meses de mandato con sus valores por defecto)
type DatosMandato = NonNullable<ReturnType<typeof mandatoFicha>>;
function CapMandato({ m, e, D, nivel, pd, inicio, b }: { m: Motor; e: Expr; D: DatosMandato | null; nivel: Nivel; pd: string | null; inicio: Record<string, string>; b: InicioMandato["b"] }) {
  const G = useMemo(() => {
    if (!D) return null;
    const series: SerieG[] = D.pres.map((x) => ({ key: x.id, name: x.n, short: nombreCorto(x.n), color: x.color, dash: x.dash }));
    const opts: OpcionesG = {
      xVals: D.rows.map((f) => f.t as number), endLabels: true, log: D.usarLog, refLine: D.ref, fmtAxis: D.fmtAxis, fmtTip: D.fmtTip, fmtAxis2: null, label: D.c.corto,
      xLabel: (f: Fila) => (f.t % D.paso === 0 ? (f.t === 0 ? "Mes 0" : String(f.t)) : ""),
      tipTitle: (f: Fila) => `Mes ${f.t}`,
      tipSub: (f: Fila, se: SerieG) => (f["_f_" + se.key] ? ` <small style="color:var(--text-muted)">${fmtMes(f["_f_" + se.key])}</small>` : ""),
    };
    return { series, opts };
  }, [D]);
  const titulo = "Mes a mes, desde que asumió";
  if (!D || !G) {
    const c = m.calc(e);
    return <Capitulo id="fi-mandato" nivel={nivel} titulo={titulo}><p className="note">{sinMandatoTxt(m, c, frecuenciaOrigen(c.v))}</p></Capitulo>;
  }
  const href = hrefMandatoDe(e, { mp: D.mp, anc: D.ancParam }, inicio);
  const bajada = D.modo === "teorico"
    ? `Si todos arrancaran en el mismo punto: cada presidente parte del valor del mes 0 de Milei y sigue con sus propias variaciones. Unidad: ${D.c.unidad}.`
    : "El valor de cada mes, contado desde el mes 0 de cada presidente.";
  return (
    <Capitulo id="fi-mandato" nivel={nivel} titulo={titulo} bajada={bajada} acciones={
      <Acciones donde="Meses de mandato" href={href} compartir={
        <Compartir titulo={`${D.c.corto} por mes de mandato`} href={linkCompartir(e, href, { ...inicio, ...(pd ? { pd } : {}) })}
          vista={() => ({ tipo: "mandato", expr: e, modo: D.modo, presIds: D.pres.map((x) => x.id), anc: D.ancParam, md: null, mh: null, base: b })} />} />}>
      <div className="legend">{D.pres.map((x) => <span key={x.id} style={vcolor(x.color)}>{x.n}</span>)}</div>
      <div className="fi-grafico"><Grafico rows={D.rows} series={G.series} opts={G.opts} /></div>
      {D.modo !== "teorico" && <p className="fi-nota">Unidad: {D.c.unidad}.</p>}
    </Capitulo>
  );
}
