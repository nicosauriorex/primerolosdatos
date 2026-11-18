"use client";
// Página de un tema: explicación, principales, la ficha del dato elegido, todos los datos y plantillas.
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSeccion } from "../useSeccion";
import { Cargando, Plegable } from "../ui";
import { BotonInfo } from "../Variables";
import { CardValor } from "../CardValor";
import { FichaDato } from "../FichaDato";
import { useConfig } from "../ConfigProvider";
import { useBase } from "./comunes";
import { Tarjeta } from "./Plantillas";
import { medidaInicial } from "@/lib/config";
import { tituloVariable } from "@/lib/imagen-datos";
import { medDefaultDe, type Expr, type SerieMeta } from "@/lib/motor";
import { crearPlantillas, evaluar, plantillaSuelta, plantillasDeTema, type Evaluada } from "@/lib/plantillas";
import { catListado, esNivelGeneralIpc, listables, ordenarListado } from "@/lib/regiones";
import { NOMBRE_OTROS_PAISES, esOtroPais, hrefHistorico, idsDe, principalesDe, seriesDe, subgrupoDe, type Principal, type Tema } from "@/lib/temas";
import { decExpr, encExpr, enteroEn, unoDe, useParams } from "@/lib/url";

const PESTANAS: ["principales" | "todos", string][] = [["principales", "Principales"], ["todos", "Todos los datos"]];
const POR_NIVEL = 30;   // más series que esto en un bloque: se despliegan por niveles (región, rubro…)
const MAX_PLANTILLAS = 8;
/** Temas que enlazan al parte diario del Banco Central (/bcra/). */
const TEMAS_CON_PARTE = new Set(["dolar", "finanzas"]);
/** Temas que enlazan al semáforo de actividad (/semaforo/). */
const TEMAS_CON_SEMAFORO = new Set(["actividad"]);
/** Temas que enlazan al panel del RIGI (/rigi/). */
const TEMAS_CON_RIGI = new Set(["externo"]);
/** Temas que enlazan a la página de tarifas y subsidios (/tarifas/). */
const TEMAS_CON_TARIFAS = new Set(["fiscal"]);

function Texto({ t }: { t: Tema }) {
  const [largo, setLargo] = useState(false);
  return (
    <div className="texto-tema">
      <p>{t.corto}{" "}<button type="button" className="ver-mas" aria-expanded={largo} onClick={() => setLargo(!largo)}>{largo ? "ver menos" : "ver más"}</button></p>
      {largo && <div className="info-larga" dangerouslySetInnerHTML={{ __html: t.largo }} />}
    </div>
  );
}

/** Lista de series; si son muchas, se abre por niveles según la categoría (sin el nivel de región). Los hijos se dibujan recién al abrir.
 *  Cada serie es un renglón tocable (nombre, unidad chica y ⓘ): tocarlo la pone en la ficha del dato (`onElegir`); la elegida queda marcada. */
function Series({ series, nivel, onElegir, elegida, cat }: { series: SerieMeta[]; nivel: number; onElegir: (s: SerieMeta) => void; elegida: string | null; cat: (s: SerieMeta) => string[] }) {
  const grupos = useMemo(() => {
    const m = new Map<string, SerieMeta[]>(), sueltas: SerieMeta[] = [];
    if (series.length > POR_NIVEL) series.forEach((s) => { const k = cat(s)[nivel]; if (k) { if (!m.has(k)) m.set(k, []); m.get(k)!.push(s); } else sueltas.push(s); });
    return { m, sueltas: m.size ? sueltas : series };
  }, [series, nivel, cat]);
  return (
    <ul className="lista-series e1-series">
      {[...grupos.m].map(([k, ss]) => <Desplegado key={k} titulo={k} cuenta={ss.length} chico><Series series={ss} nivel={nivel + 1} onElegir={onElegir} elegida={elegida} cat={cat} /></Desplegado>)}
      {grupos.sueltas.map((s) => (
        <li key={s.id} className="e1-serie">
          <button type="button" className="e1-serie-btn" aria-pressed={s.id === elegida} onClick={() => onElegir(s)}>
            <span className="e1-serie-nombre">{s.n}</span>
            {s.u ? <small className="e1-serie-unidad">{s.u}</small> : null}
          </button>
          <BotonInfo id={s.id} />
        </li>
      ))}
    </ul>
  );
}
/** Bloque plegable sin caja (renglón con chevron, R1) que abre con animación (R2). Lo de adentro se dibuja la primera vez que se abre y queda. */
function Desplegado({ titulo, cuenta, children, chico = false }: { titulo: string; cuenta: number; children: React.ReactNode; chico?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [visto, setVisto] = useState(false);
  return (
    <li className="subgrupo">
      <Plegable nivel={chico ? "chico" : "renglon"} abierto={abierto} onCambiar={(a) => { setAbierto(a); if (a) setVisto(true); }}
        resumen={<span className="e1-bloque-res"><span>{titulo}</span><span className="cuenta">{cuenta} {cuenta === 1 ? "serie" : "series"}</span></span>}>
        {visto ? children : null}
      </Plegable>
    </li>
  );
}

/** Columnas de la grilla de principales para que llene el ancho sin dejar una tarjeta suelta: en pantalla ancha 2 a 4 por fila; en tablet 1 a 3; en celular 1 (el CSS). */
const columnasAncho = (n: number): number => (n <= 4 ? n : n % 3 === 0 || n === 5 ? 3 : 4);
const columnasMedio = (n: number): number => (n <= 3 ? n : n % 2 === 0 ? 2 : 3);

export function TemaPagina({ t }: { t: Tema }) {
  const [p, set, montado] = useParams();
  const { config } = useConfig();
  const base = useSeccion([]);
  const { listo, metas, motor: m, errorGeneral, version } = base;
  const S = useMemo(() => Object.fromEntries(metas.map((s) => [s.id, s])), [metas, listo]);   // eslint-disable-line react-hooks/exhaustive-deps
  const principales = useMemo(() => (listo ? principalesDe(t, S) : []), [listo, t, S]);
  // Para las tarjetas se bajan los datos de los principales; la ficha pide los de su variable.
  const sec = useSeccion(principales.flatMap(idsDe));
  const info = useBase("fichas", p, set, montado);
  const fichaRef = useRef<HTMLElement>(null), tituloFicha = useRef<HTMLHeadingElement>(null);
  const plantillas = useMemo(() => (listo ? crearPlantillas(metas) : []), [listo, metas]);
  const delTemaTodas = useMemo(() => seriesDe(t, metas), [t, metas]);
  const catDe = useMemo(() => (s: SerieMeta) => catListado(s, delTemaTodas), [delTemaTodas]);
  // Una por rubro o producto, sin las series ocultas ni el IPC nivel general (es lo mismo que "Inflación"), con el orden de las listas (rubros por código, productos por categoría).
  const series = useMemo(() => ordenarListado(listables(delTemaTodas).filter((s) => !esNivelGeneralIpc(s.id) && !esOtroPais(s)), catDe), [delTemaTodas, catDe]);
  // Series de otros países (CPI-U de EEUU…): fuera de los indicadores de la Argentina, en un bloque propio al final
  const otrosPaises = useMemo(() => listables(delTemaTodas).filter(esOtroPais), [delTemaTodas]);
  const subgrupos = useMemo(() => {
    const mapa = new Map<string, SerieMeta[]>();
    series.forEach((s) => { const k = subgrupoDe(t, s); if (!mapa.has(k)) mapa.set(k, []); mapa.get(k)!.push(s); });
    return [...mapa].sort((a, b) => Number(a[0] === "Generales") - Number(b[0] === "Generales"));
  }, [series, t]);
  const delTema = useMemo(() => plantillasDeTema(plantillas, S, t), [plantillas, S, t]);
  const [aviso, setAviso] = useState<string | null>(null);

  const tarjetas = useMemo(() => {
    if (!m || sec.ocupado) return [];
    return principales.map((pr) => {
      const ev = evaluar(m, plantillaSuelta("t-" + pr.id, pr.nombre, pr));
      return ev ? { pr, ev } : null;
    }).filter(Boolean) as { pr: Principal; ev: Evaluada }[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, sec.ocupado, principales, version]);

  if (errorGeneral) return <p className="error" role="alert">{errorGeneral}</p>;
  if (!listo || !m || !montado) return <Cargando />;

  const exprSerie = (s: SerieMeta): Expr => ({ id: s.id, med: medidaInicial(s.tipo, medDefaultDe(s), config), rel: null, modo: "compra", esc: "" });
  /** Series de otros países: se abren en variación interanual, no como índice. */
  const exprOtroPais = (s: SerieMeta): Expr => ({ id: s.id, med: "via", rel: null, modo: "compra", esc: "" });
  // Variable de la ficha del dato. Se guarda en la URL: `dv` (la variable, igual que `v` de Histórico). Un link viejo con `pt`
  // (posición entre los principales, de la tabla por presidente de antes) abre ese principal. Sin ninguno, el primer principal.
  const existe = (id: string) => metas.some((s) => s.id === id);
  // `elegida` es un objeto nuevo en cada render: la ficha compara por su contenido (encExpr), no por referencia.
  const elegida: Expr | undefined = decExpr(p.get("dv"), existe) ?? principales[enteroEn(p.get("pt"), 0, Math.max(0, principales.length - 1), 0)];
  const clave = elegida ? encExpr(elegida) : "";
  const principalElegido = principales.find((pr) => encExpr(pr) === clave);
  const elegir = (x: Expr) => {
    const k = encExpr(x);
    set({ dv: principales[0] && encExpr(principales[0]) === k ? null : k, pt: null });
    // Lleva la vista hasta la ficha (sin animación si se pidió reducir el movimiento) y deja ahí el foco, para el teclado y los lectores de pantalla.
    window.setTimeout(() => {
      const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      fichaRef.current?.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "start" });
      tituloFicha.current?.focus({ preventScroll: true });
    }, 0);
  };
  // Nombre de la ficha: el del principal (como en su tarjeta) o el nombre público con la medida.
  const nombreFicha = !elegida ? "" : principalElegido ? principalElegido.nombre
    : m.SER[elegida.id] && (!elegida.rel || m.SER[elegida.rel]) ? tituloVariable(m, elegida, m.calc(elegida)) : metas.find((s) => s.id === elegida.id)?.n ?? "";

  const vista = unoDe(p.get("tv"), ["principales", "todos"] as const, "principales");
  const cambiarVista = (v: "principales" | "todos") => set({ tv: v === "todos" ? "todos" : null });
  /** Flechas y Inicio/Fin entre pestañas; el foco acompaña a la elegida. */
  const teclaPestanas = (ev: React.KeyboardEvent) => {
    const k = ev.key, i = PESTANAS.findIndex(([x]) => x === vista);
    const j = k === "ArrowRight" ? (i + 1) % PESTANAS.length : k === "ArrowLeft" ? (i + PESTANAS.length - 1) % PESTANAS.length : k === "Home" ? 0 : k === "End" ? PESTANAS.length - 1 : -1;
    if (j < 0) return;
    ev.preventDefault(); cambiarVista(PESTANAS[j][0]);
    window.setTimeout(() => document.getElementById(`tema-tab-${PESTANAS[j][0]}`)?.focus(), 0);
  };

  return (
    <section className="tema-pagina">
      <div className="cab-tema">
        <h1 className="titulo-tema">{t.nombre}</h1>
        <Texto t={t} />
        {TEMAS_CON_PARTE.has(t.slug) && <Link prefetch={false} href="/bcra/" className="enlace-parte">Parte del Banco Central: los datos de cada día</Link>}
        {TEMAS_CON_SEMAFORO.has(t.slug) && <Link prefetch={false} href="/semaforo/" className="enlace-parte">Semáforo de actividad: qué indicadores subieron cada mes</Link>}
        {TEMAS_CON_TARIFAS.has(t.slug) && <Link prefetch={false} href="/tarifas/" className="enlace-parte">Tarifas y subsidios: quién paga la energía</Link>}
        {TEMAS_CON_RIGI.has(t.slug) && <Link prefetch={false} href="/rigi/" className="enlace-parte">RIGI: los proyectos de grandes inversiones aprobados</Link>}
      </div>

      <div className="e1-pestanas" role="tablist" aria-label={`Datos de ${t.nombre}`} onKeyDown={teclaPestanas}>
        {PESTANAS.map(([k, txt]) => (
          <button key={k} type="button" role="tab" id={`tema-tab-${k}`} aria-selected={vista === k} aria-controls={`tema-panel-${k}`} tabIndex={vista === k ? 0 : -1}
            onClick={() => cambiarVista(k)}>{txt}</button>
        ))}
      </div>

      {vista === "principales" ? (
        <div role="tabpanel" id="tema-panel-principales" aria-labelledby="tema-tab-principales" className="e1-panel">
          {tarjetas.length > 0 && (
            <>
              {tarjetas.length > 1 && <p className="note">Tocá uno para verlo abajo: cómo viene, cómo le fue con cada presidente y mes a mes desde que asumió.</p>}
              <div className="principales" style={{ ["--n" as string]: tarjetas.length, ["--c-med" as string]: columnasMedio(tarjetas.length), ["--c-ancho" as string]: columnasAncho(tarjetas.length) }}>
                {tarjetas.map(({ pr, ev }) => (
                  <CardValor key={pr.nombre} titulo={pr.nombre} ev={ev} href={hrefHistorico(pr)} motor={m} onElegir={() => elegir(pr)} elegido={pr === principalElegido} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div role="tabpanel" id="tema-panel-todos" aria-labelledby="tema-tab-todos" className="e1-panel">
          <p className="note">{series.length + otrosPaises.length} series. Abrí un bloque para ver sus series y tocá una para verla abajo, igual que los principales.</p>
          <ul className="lista-series raiz e1-bloques">
            {subgrupos.map(([nombre, ss]) => (
              <Desplegado key={nombre} titulo={nombre} cuenta={ss.length}>
                <Series series={ss} nivel={2} onElegir={(s) => elegir(exprSerie(s))} elegida={principalElegido ? null : elegida?.id ?? null} cat={catDe} />
              </Desplegado>
            ))}
            {otrosPaises.length > 0 && (
              <Desplegado titulo={NOMBRE_OTROS_PAISES} cuenta={otrosPaises.length}>
                <Series series={otrosPaises} nivel={2} onElegir={(s) => elegir(exprOtroPais(s))} elegida={principalElegido ? null : elegida?.id ?? null} cat={catDe} />
              </Desplegado>
            )}
          </ul>
        </div>
      )}

      {elegida && (
        <section aria-labelledby="ficha-tema-titulo" className="ficha-tema" ref={fichaRef}>
          <FichaDato e={elegida} info={info} p={p} set={set} onComoVerlo={(x) => set({ dv: encExpr(x) })} nivel={3} titulo={nombreFicha} tituloRef={tituloFicha} tituloId="ficha-tema-titulo" />
        </section>
      )}

      {delTema.length > 0 && (
        <section aria-label="Gráficos listos del tema">
          <h2>Gráficos listos del tema</h2>
          {aviso && <p className="aviso-link" role="status">{aviso}</p>}
          <div className="curios">{delTema.slice(0, MAX_PLANTILLAS).map((pl) => (
            <Tarjeta key={pl.id} pl={pl} onAviso={(a) => { setAviso(a); if (a) setTimeout(() => setAviso(null), 4000); }} />
          ))}</div>
          <p className="acciones-vista"><Link prefetch={false} className="btn" href={`/plantillas/?${new URLSearchParams({ q: t.q }).toString()}`}>Ver todos los gráficos listos</Link></p>
        </section>
      )}
    </section>
  );
}
