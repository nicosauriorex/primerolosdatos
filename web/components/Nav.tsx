"use client";
// Barra fina de todas las páginas (logo, el mismo menú de 5 opciones que la barra de abajo del celular, y configuración), subsecciones de Presidentes y cabecera de página con "Volver".
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotonConfig } from "./ConfigProvider";
import { useDeslizable } from "./Movimiento";
import { IconoAbajo, IconoVolver } from "./Iconos";
import { BarraInferior, ITEMS_MENU } from "./sistema/BarraInferior";
import { BuscadorGlobal } from "./sistema/BuscadorGlobal";
import { Hoja } from "./sistema/Hoja";
import { MenuMas } from "./sistema/MenuMas";
import { IconoSeccion } from "./sistema/iconosTemas";
import { ORGANISMOS } from "@/lib/fuentes";

/** Subsecciones de Presidentes: [carpeta, ancla, nombre]. Las URLs son las de siempre. */
const SUBSECCIONES: [string, string, string][] = [
  ["presidentes", "", "Por presidente"], ["mandato", "", "Meses de mandato"], ["herencia", "", "Herencia"], ["ranking", "", "Ranking"],
  ["elecciones", "", "Elecciones"], ["congreso", "", "Congreso"],
];
// Curiosidades ya no está en el menú, pero la página sigue en la misma URL y cuenta como parte de Presidentes.
const GRUPO_PRES = new Set([...SUBSECCIONES.map((s) => s[0]), "curiosidades"]);
const TITULOS: Record<string, string> = {
  historico: "Histórico", presidentes: "Por presidente", ranking: "Ranking de presidentes", mandato: "Meses de mandato", herencia: "Herencia",
  curiosidades: "Curiosidades", congreso: "Gobierno y Congreso", elecciones: "Elecciones", contexto: "Contexto internacional", bcra: "Parte del Banco Central", semaforo: "Semáforo de actividad", gasto: "En qué gasta la Nación", universidades: "Cuánto reciben las universidades", provincias: "Las provincias", plantillas: "Gráficos listos", fuentes: "Fuentes",
};
/** Páginas donde aparece "Volver" si se llegó desde otra página del sitio. */
/** Páginas cuyo título de sección no es el h1: lo es el nombre del dato que muestran (la página pone su propio h1). */
const SIN_H1 = new Set(["historico"]);
const CON_VOLVER = new Set(["historico", "tema", "dato", "bcra", "semaforo", "gasto", "universidades", "provincias", ...GRUPO_PRES]);

const carpetaDe = (ruta: string) => ruta.split("/")[1] ?? "";

/** Ancla actual de la URL. Next no dispara `hashchange` al navegar, así que también se relee cuando cambia la ruta o se toca un link del menú. */
function useAncla(ruta: string): [string, (h: string) => void] {
  const [ancla, setAncla] = useState("");
  useEffect(() => {
    const leer = () => setAncla(window.location.hash);
    leer();
    window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, [ruta]);
  return [ancla, setAncla];
}

function LinksPresidentes({ carpeta, ancla, onIr }: { carpeta: string; ancla: string; onIr: (h: string) => void }) {
  return (
    <>
      {SUBSECCIONES.map(([c, h, n]) => {
        const actual = carpeta === c;
        return <Link key={c + h} prefetch={false} href={`/${c}/${h}`} aria-current={actual ? "page" : undefined} onClick={() => onIr(h)}><span className="nav-sec-ico"><IconoSeccion carpeta={c} /></span>{n}</Link>;
      })}
    </>
  );
}

export function Barra() {
  const ruta = usePathname() || "/";
  const carpeta = carpetaDe(ruta);
  const enPres = GRUPO_PRES.has(carpeta);
  const [ancla, setAncla] = useAncla(ruta);
  const [cerrado, setCerrado] = useState(false);   // el menú desplegable se cierra al elegir y vuelve a estar disponible al sacar el mouse
  const fila = useRef<HTMLElement>(null);
  useDeslizable(fila, false, enPres);
  const actual = actualInferior(ruta);
  return (
    <header className="barra">
      <div className="barra-fila">
        <Link href="/" prefetch={false} className="marca">Primero los Datos</Link>
        {/* R9 (tanda 8): las mismas opciones, nombres, íconos y orden que la barra de abajo del celular (`ITEMS_MENU`). */}
        <nav className="tabs" aria-label="Secciones">
          {ITEMS_MENU.map((it) => {
            const Ico = it.icono;
            const contenido = <><Ico className="tab-ico" /><span>{it.texto}</span>{it.id === "presidentes" && <IconoAbajo />}</>;
            if (!it.href) {
              return <button key={it.id} type="button" className="tab-btn" aria-haspopup="dialog" aria-keyshortcuts={it.id === "buscar" ? "/" : undefined}
                onClick={it.id === "buscar" ? abrirBuscador : abrirMas}>{contenido}</button>;
            }
            const activo = actual === it.id;
            const link = (
              <Link key={it.id} prefetch={false} href={it.href} aria-current={activo ? "page" : undefined} aria-haspopup={it.id === "presidentes" ? "true" : undefined}
                onClick={() => { if (it.id === "presidentes") setAncla(""); }}>{contenido}</Link>
            );
            if (it.id !== "presidentes") return link;
            return (
              <div key={it.id} className={`con-menu${cerrado ? " cerrado" : ""}`} onMouseLeave={() => setCerrado(false)} onFocus={() => setCerrado(false)}
                onKeyDown={(ev) => { if (ev.key === "Escape") (document.activeElement as HTMLElement | null)?.blur(); }}>
                {link}
                <div className="submenu" onClick={() => { setCerrado(true); (document.activeElement as HTMLElement | null)?.blur(); }}>
                  <LinksPresidentes carpeta={carpeta} ancla={ancla} onIr={setAncla} />
                </div>
              </div>
            );
          })}
        </nav>
        <BotonConfig />
      </div>
      {enPres && (
        <nav className="subtabs" aria-label="Presidentes" ref={fila}>
          <LinksPresidentes carpeta={carpeta} ancla={ancla} onIr={setAncla} />
        </nav>
      )}
    </header>
  );
}

/** El buscador global se abre desde la barra de arriba (computadora), la barra de abajo (celular) o la tecla "/": un evento lo avisa. */
const EVENTO_BUSCAR = "pld:buscar";
const abrirBuscador = () => window.dispatchEvent(new Event(EVENTO_BUSCAR));
/** "Más" (la hoja con todas las secciones) se abre igual desde la barra de arriba y la de abajo. */
const EVENTO_MAS = "pld:mas";
const abrirMas = () => window.dispatchEvent(new Event(EVENTO_MAS));

/** Qué marca la barra inferior: Inicio en la portada y los temas, Histórico en el Histórico y las fichas, Presidentes en todo su grupo. */
function actualInferior(ruta: string): string {
  const c = carpetaDe(ruta);
  if (ruta === "/" || c === "tema") return "inicio";
  if (c === "historico" || c === "dato") return "historico";
  if (GRUPO_PRES.has(c)) return "presidentes";
  return "otra";
}

/** Al abrir otra página, arriba de todo (R8 de la tanda 7): Next deja la ventana donde estaba si el comienzo de la página destino
 *  "ya se ve" o mientras carga, y el título quedaba fuera de pantalla. Atrás/Adelante (popstate) y los links con #ancla no se tocan. */
function useArribaAlCambiarDePagina(ruta: string) {
  const previa = useRef(ruta);
  // Solo cuenta el popstate que cambia de página (Atrás/Adelante entre páginas): al dispararse, `location` ya es la de destino.
  // Cerrar una capa con Atrás también dispara popstate, pero en la misma ruta: no deja marca y el próximo link sube igual.
  const porHistorial = useRef(false);
  useEffect(() => {
    const f = () => { if (window.location.pathname !== previa.current) porHistorial.current = true; };
    window.addEventListener("popstate", f);
    return () => window.removeEventListener("popstate", f);
  }, []);
  useEffect(() => {
    if (previa.current === ruta) return;
    previa.current = ruta;
    const atras = porHistorial.current;
    porHistorial.current = false;
    if (atras) return;
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [ruta]);
}

/** Navegación del celular (barra inferior, D-023) y buscador global. Va dentro de `DatosProvider`: el buscador usa los datos. */
export function NavegacionGlobal() {
  const ruta = usePathname() || "/";
  useArribaAlCambiarDePagina(ruta);
  const [buscar, setBuscar] = useState(false);
  const [mas, setMas] = useState(false);
  useEffect(() => {
    const abrir = () => { setMas(false); setBuscar(true); };
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key !== "/" || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const t = ev.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;   // escribiendo en un campo: "/" es una letra más
      if (document.querySelector('[role="dialog"]')) return;   // con una ventana abierta, no se abre otra encima
      ev.preventDefault(); abrir();
    };
    const abrirLaHoja = () => { setBuscar(false); setMas(true); };
    window.addEventListener(EVENTO_BUSCAR, abrir);
    window.addEventListener(EVENTO_MAS, abrirLaHoja);
    document.addEventListener("keydown", tecla);
    return () => { window.removeEventListener(EVENTO_BUSCAR, abrir); window.removeEventListener(EVENTO_MAS, abrirLaHoja); document.removeEventListener("keydown", tecla); };
  }, []);
  return (
    <>
      <BarraInferior actual={actualInferior(ruta)} onBuscar={() => setBuscar(true)} onMas={abrirMas} />
      <BuscadorGlobal abierto={buscar} onCerrar={() => setBuscar(false)} />
      <Hoja titulo="Más secciones" abierta={mas} onCerrar={() => setMas(false)}><MenuMas actual={carpetaDe(ruta)} /></Hoja>
    </>
  );
}

/** Pie general con las fuentes. En la portada no va: ya está el bloque "Todo tiene fuente". El render estático de "/" sale sin pie. */
export function PieSitio() {
  const ruta = usePathname() || "/";
  if (ruta === "/") return null;
  return (
    <footer className="pie">
      <div className="ancho">
        <p className="pie-fuentes"><b>Fuentes principales:</b> {ORGANISMOS.join(" · ")} y otras.</p>
        <Link prefetch={false} href="/fuentes/" className="btn">Ver las fuentes</Link>
      </div>
    </footer>
  );
}

/** ¿Hay una página anterior del sitio en el historial de esta pestaña? (API de navegación; si no existe, se cuentan las páginas visitadas). */
let visitadas: string[] = [];
function hayAnterior(ruta: string): boolean {
  const nav = (window as unknown as { navigation?: { currentEntry?: { index: number } | null } }).navigation;
  if (nav?.currentEntry) return nav.currentEntry.index > 0;
  if (visitadas[visitadas.length - 2] === ruta) visitadas = visitadas.slice(0, -1);        // se volvió atrás
  else if (visitadas[visitadas.length - 1] !== ruta) visitadas = [...visitadas, ruta];
  return visitadas.length > 1;
}

/** Cabecera de las páginas internas: "← Volver" (si se llegó desde otra página del sitio) y el título de la sección. */
export function CabeceraPagina() {
  const ruta = usePathname() || "/";
  const carpeta = carpetaDe(ruta);
  const [volver, setVolver] = useState(false);
  useEffect(() => { setVolver(CON_VOLVER.has(carpeta) && hayAnterior(ruta)); }, [ruta, carpeta]);
  if (ruta === "/") return null;
  const titulo = TITULOS[carpeta];
  if (!titulo && !volver) return null;
  return (
    <div className="cab-pagina">
      {volver && <button type="button" className="volver-atras" onClick={() => window.history.back()}><IconoVolver />Volver</button>}
      {titulo && (SIN_H1.has(carpeta) ? <p className="cab-sobre">{titulo}</p> : <h1>{titulo}</h1>)}
    </div>
  );
}
