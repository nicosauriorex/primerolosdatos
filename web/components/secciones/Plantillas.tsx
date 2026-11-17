"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useDatos } from "../DatosProvider";
import { Cargando } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { FilaChips } from "../sistema/FilaChips";
import { Lamina } from "../sistema/Lamina";
import { IconoBuscar } from "../sistema/iconos";
import { Sparkline } from "../Sparkline";
import { BotonCompartir } from "../PanelCompartir";
import { useConfig } from "../ConfigProvider";
import { vistaDeParams } from "@/lib/imagen-datos";
import { IconoCompartir } from "../Iconos";
import { avisoCompartir, compartir } from "@/lib/compartir";
import { contarCompartir } from "@/lib/conteo";
import { useMisPlantillas } from "@/lib/misPlantillas";
import { GRUPOS, crearPlantillas, evaluar, filtrar, hrefPlantilla, plantillaPropia, type Plantilla } from "@/lib/plantillas";
import { unoDe, useParams } from "@/lib/url";

const POR_GRUPO = 8;   // 2 columnas en el celular y 4 en la computadora: 8 llena filas enteras en las dos

interface PropsTarjeta { pl: Plantilla; onAviso: (t: string | null) => void; onRenombrar?: (pl: Plantilla) => void; onBorrar?: (pl: Plantilla) => void }
/** Los datos se piden recién cuando la tarjeta entra en pantalla; mientras tanto ocupa el mismo alto. */
export const Tarjeta = memo(function Tarjeta({ pl, onAviso, onRenombrar, onBorrar }: PropsTarjeta) {
  const { motor, cargar, archivosDe, version, metas } = useDatos();
  const { config } = useConfig();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [terminado, setTerminado] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const clave = pl.ids.join("|");
  useEffect(() => {
    if (!visible) return;
    let vivo = true;
    setTerminado(false);
    cargar(archivosDe(pl.ids)).then(() => { if (vivo) setTerminado(true); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, clave]);
  const ev = useMemo(() => (visible && motor ? evaluar(motor, pl) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, motor, pl, version]);
  const href = hrefPlantilla(pl, ev?.vista);
  const desde = motor ? motor.idxDe("2003-01") : 0;
  return (
    <div className="plantilla" ref={ref}>
      <Link prefetch={false} href={href} className="plantilla-link" aria-label={`${pl.href ? "Abrir en la sección" : "Abrir en Histórico"}: ${pl.titulo}`}>
        <div className="k" title={pl.titulo}>{pl.titulo}{pl.propia && pl.fecha ? <small> · guardada el {new Date(pl.fecha).toLocaleDateString("es-AR")} {new Date(pl.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</small> : null}</div>
        {ev ? (
          <>
            <div className="v">{ev.val}<small>{ev.fecha}</small></div>
            <div className={`d${ev.cls ? " var-" + ev.cls : ""}`}>{ev.texto}</div>
            <Sparkline v={ev.v} desde={desde} cls={ev.cls} />
          </>
        ) : (
          <div className="d">{pl.href ? pl.desc : visible && terminado ? "Sin vista previa" : " "}</div>
        )}
      </Link>
      {pl.href || !pl.e ? (
        // las que abren otra sección (Precios en el mundo, Congreso) no tienen imagen: se comparte el link
        <button type="button" className="btn comp" title="Copiar el link de este gráfico" aria-label={`Compartir: ${pl.titulo}`}
          onClick={async () => {
            const r = await compartir(href, pl.titulo);
            if (r === "compartido" || r === "copiado") contarCompartir({ accion: r === "compartido" ? "link_compartido" : "link_copiado", dato: pl.id, href });
            onAviso(avisoCompartir(r));
          }}><IconoCompartir /></button>
      ) : (
        <BotonCompartir className="btn comp" title="Compartir este gráfico como imagen" aria-label={`Compartir: ${pl.titulo}`} titulo={pl.titulo} href={href}
          crearVista={() => (motor ? vistaDeParams(motor, new URLSearchParams(ev?.vista ?? pl.vista), (id) => metas.some((x) => x.id === id), config.desde, pl.titulo) : null)}>
          <IconoCompartir /></BotonCompartir>
      )}
      {pl.propia && (
        <div className="acciones-plantilla">
          <button type="button" className="enlace" onClick={() => onRenombrar?.(pl)}>Renombrar</button>
          <button type="button" className="enlace" onClick={() => onBorrar?.(pl)}>Borrar</button>
        </div>
      )}
    </div>
  );
});

/** Una plantilla como lámina (la misma de la ficha y de Histórico). Los datos se piden recién cuando entra en pantalla; mientras tanto ocupa su lugar.
 *  Las guardadas por la persona (`pl.propia`) llevan debajo "Renombrar" y "Borrar". Sin botón de compartir: la lámina entera es un link y el compartir está en el gráfico abierto. */
const LaminaViva = memo(function LaminaViva({ pl, onRenombrar, onBorrar }: { pl: Plantilla; onRenombrar: (pl: Plantilla) => void; onBorrar: (pl: Plantilla) => void }) {
  const { motor, cargar, archivosDe, version } = useDatos();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [terminado, setTerminado] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const clave = pl.ids.join("|");
  useEffect(() => {
    if (!visible) return;
    let vivo = true;
    setTerminado(false);
    cargar(archivosDe(pl.ids)).then(() => { if (vivo) setTerminado(true); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, clave]);
  const ev = useMemo(() => (visible && motor ? evaluar(motor, pl) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, motor, pl, version]);
  const href = hrefPlantilla(pl, ev?.vista);
  const guardada = pl.propia && pl.fecha ? `Guardado el ${new Date(pl.fecha).toLocaleDateString("es-AR")} ${new Date(pl.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` : null;
  return (
    <div className="pl-item" ref={ref}>
      {ev && motor ? (
        <Lamina titulo={pl.titulo} cifra={ev.val} fecha={ev.fecha} v={ev.v} desde={motor.idxDe("2003-01")} tono={ev.cls} href={href} />
      ) : (
        <Link prefetch={false} href={href} className="lamina pl-hueco" aria-label={`${pl.href ? "Abrir en la sección" : "Abrir en Histórico"}: ${pl.titulo}`}>
          <span className="lamina-titulo">{pl.titulo}</span>
          <span className="pl-hueco-txt">{pl.href ? pl.desc : visible && terminado ? "Sin vista previa" : " "}</span>
        </Link>
      )}
      {pl.propia && (
        <div className="pl-acciones">
          {guardada && <span className="pl-guardada">{guardada}</span>}
          <button type="button" className="enlace" onClick={() => onRenombrar(pl)}>Renombrar</button>
          <button type="button" className="enlace" onClick={() => onBorrar(pl)}>Borrar</button>
        </div>
      )}
    </div>
  );
});

export function Plantillas() {
  const [p, set, montado] = useParams();
  const { listo, metas, errorGeneral } = useDatos();
  const mis = useMisPlantillas();
  const [texto, setTexto] = useState("");
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- el texto del buscador se toma de la URL una sola vez, al montar; después manda lo que se escribe
  useEffect(() => { if (montado) setTexto(p.get("q") ?? ""); }, [montado]);

  const S = useMemo(() => Object.fromEntries(metas.map((s) => [s.id, s])), [metas, listo]);   // eslint-disable-line react-hooks/exhaustive-deps
  const generales = useMemo(() => (listo ? crearPlantillas(metas) : []), [listo, metas]);
  const propias = useMemo(() => mis.lista.map((x) => plantillaPropia(x, S)).reverse(), [mis.lista, S]);
  const q = montado ? (p.get("q") ?? "") : "";

  if (errorGeneral) return <p className="error" role="alert">{errorGeneral}</p>;
  if (!listo || !montado) return <Cargando />;

  const buscando = q.trim().length >= 2;
  const mostrar = (a: string | null) => { setAviso(a); if (a) setTimeout(() => setAviso(null), 4000); };
  const renombrar = (pl: Plantilla) => {
    const n = window.prompt("Nuevo nombre del gráfico (hasta 60 caracteres)", pl.titulo);
    if (n == null) return;
    mostrar(mis.renombrar(pl.id, n).aviso ?? null);
  };
  const borrar = (pl: Plantilla) => {
    if (!window.confirm(`¿Borrar el gráfico "${pl.titulo}"? No se puede deshacer.`)) return;
    mostrar(mis.borrar(pl.id).aviso ?? null);
  };
  const lamina = (pl: Plantilla) => <LaminaViva key={pl.id} pl={pl} onRenombrar={renombrar} onBorrar={borrar} />;

  // Los grupos salen de GRUPOS (los propios y los generales); solo se ofrecen los que tienen algo.
  const itemsDe = (g: string) => [...propias.filter((x) => x.grupo === g), ...generales.filter((x) => x.grupo === g)];
  const grupos = GRUPOS.filter((g) => itemsDe(g).length > 0);
  const g = unoDe(p.get("g"), ["todos", ...grupos] as string[], "todos");
  const eligeGrupo = (v: string) => set({ g: v === "todos" ? null : v });
  const conFiltro = g !== "todos";

  let cuerpo: React.ReactNode;
  if (buscando) {
    const res = [...filtrar(propias, q, S), ...filtrar(generales.filter((x) => x.curada), q, S), ...filtrar(generales.filter((x) => !x.curada), q, S)]
      .filter((x) => !conFiltro || x.grupo === g);
    cuerpo = res.length ? (
      <>
        <p className="note" role="status">{res.length} {res.length === 1 ? "gráfico" : "gráficos"}</p>
        <div className="pl-grilla">{res.map(lamina)}</div>
      </>
    ) : (
      <p className="note" role="status">No hay gráficos con &quot;{q.trim()}&quot;{conFiltro ? ` en ${g}` : ""}. Probá con otra palabra{conFiltro ? ", con otro grupo" : ""} o armá el gráfico en <Link prefetch={false} href="/historico/">Histórico</Link>.</p>
    );
  } else {
    cuerpo = (
      <>
        {(conFiltro ? [g] : grupos).map((gr, i) => {
          const items = itemsDe(gr);
          if (!items.length) return null;
          const propios = items.some((x) => x.propia);
          const todo = conFiltro || abiertos.has(gr), vis = todo ? items : items.slice(0, POR_GRUPO);
          return (
            <Capitulo key={gr} id={`pl-g${i}`} titulo={gr} bajada={propios ? "Guardados solo en este navegador." : undefined}>
              <div className="pl-grilla">{vis.map(lamina)}</div>
              {!conFiltro && items.length > POR_GRUPO && (
                <p className="pl-mas"><button type="button" className="btn" aria-expanded={todo} onClick={() => setAbiertos((a) => { const n = new Set(a); if (n.has(gr)) n.delete(gr); else n.add(gr); return n; })}>
                  {todo ? "Ver menos" : `Ver los ${items.length}`}</button></p>
              )}
            </Capitulo>
          );
        })}
      </>
    );
  }
  return (
    <section>
      <p className="sub">Gráficos ya armados: tocá uno para abrirlo en Histórico (o en Contexto, los de «En el mundo») y seguir desde ahí.</p>
      <div className="pl-buscar">
        <IconoBuscar />
        <input type="search" value={texto} aria-label="Buscar gráficos" placeholder="Buscá: asado, dólar, salario, alquiler…"
          onChange={(ev) => { setTexto(ev.target.value); set({ q: ev.target.value || null }); }} />
      </div>
      <FilaChips etiqueta="Grupo de gráficos" valor={g} opciones={[["todos", "Todos"], ...grupos.map((x) => [x, x] as [string, string])]} onElegir={eligeGrupo} />
      {aviso && <p className="pl-aviso" role="status">{aviso}</p>}
      {cuerpo}
    </section>
  );
}
