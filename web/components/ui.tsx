"use client";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconoAbajo } from "./Iconos";
import { CAPAS_ABIERTAS, CIERRA_CAPA } from "@/lib/url";

/** Grupo de botones. `valor` es un string (selección única) o un Set (múltiple).
 *  R12 (tanda 8): una sola opción = riel con la elegida en celeste; elección múltiple = píldoras sueltas separadas, la elegida con un ✓.
 *  Un riel que no entra en su renglón no se parte en dos: pasa solo a píldoras sueltas que bajan de renglón (y vuelve al riel si hay lugar). */
export function Seg({ opciones, valor, onElegir, id, etiqueta }: {
  opciones: [string, string][]; valor: string | Set<string>; onElegir: (v: string) => void; id?: string; etiqueta?: string;
}) {
  const multiple = valor instanceof Set;
  const activo = (v: string) => (valor instanceof Set ? valor.has(v) : valor === v);
  const riel = useRef<HTMLDivElement>(null);
  const [suelto, setSuelto] = useState(false);
  const natural = useRef(0);   // ancho del riel cuando se lo midió sin lugar: con el contenedor más ancho que esto, vuelve a riel
  const sueltoRef = useRef(false);
  sueltoRef.current = suelto;
  const clave = opciones.map((o) => o[1]).join("|");
  useEffect(() => {
    const el = riel.current;
    if (multiple || !el) return;
    natural.current = 0;
    const revisar = () => {
      if (!sueltoRef.current) {
        // no entra si se desborda o si el riel bajó de renglón (con flex-wrap no se desborda: crece en alto)
        const alto1 = (el.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
        const partido = alto1 > 0 && el.clientHeight > alto1 * 1.6;
        if (el.scrollWidth > el.clientWidth + 1 || partido) {
          const suma = Array.from(el.children).reduce((s, c) => s + (c as HTMLElement).offsetWidth, 0) + 12;
          natural.current = Math.max(el.scrollWidth, suma); setSuelto(true);
        }
      } else if (natural.current > 0 && (el.parentElement?.clientWidth ?? 0) >= natural.current) setSuelto(false);
    };
    sueltoRef.current = false; setSuelto(false);
    revisar();
    const ro = new ResizeObserver(revisar);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [multiple, clave]);
  const clases = `seg${multiple || suelto ? " seg-suelto" : ""}${multiple ? " seg-multi" : ""}`;
  return (
    <div ref={riel} className={clases} id={id} role="group" aria-label={etiqueta}>
      {opciones.map(([v, t]) => (
        <button key={v} type="button" aria-pressed={activo(v)} onClick={() => onElegir(v)}>{t}</button>
      ))}
    </div>
  );
}

/** Alterna un valor en un Set; `vacio` permite dejarlo sin elementos. */
export function alternar(set: Set<string>, v: string, vacio = false): Set<string> {
  const n = new Set(set);
  if (n.has(v)) { if (n.size > 1 || vacio) n.delete(v); } else n.add(v);
  return n;
}

/** Capas abiertas (ventanas, desplegables y selectores) en orden de apertura: Escape cierra solo la de arriba. */
const pilaModales: symbol[] = [];
/** Mientras `abierta` es true, esta capa está en la pila. Devuelve una función que dice si es la de arriba. */
export function useCapa(abierta: boolean): () => boolean {
  const yo = useRef(Symbol("capa"));
  useEffect(() => {
    if (!abierta) return;
    const id = yo.current;
    pilaModales.push(id);
    return () => { const k = pilaModales.indexOf(id); if (k >= 0) pilaModales.splice(k, 1); };
  }, [abierta]);
  return useCallback(() => pilaModales[pilaModales.length - 1] === yo.current, []);
}

// ---------------------------------------------------------------- botón Atrás del navegador
// Cada capa abierta agrega UNA entrada al historial (misma URL). Un único `popstate` global cierra la capa de arriba.
// - Cierre por Atrás: el navegador ya consumió la entrada; se llama a onCerrar.
// - Cierre por otro camino (cruz, Escape, clic afuera, elegir): al desmontar el efecto se consume la entrada con
//   `history.back()` y se anota en `silencio` para que ese `popstate` no cierre la capa de abajo.
// - `router.replace` de Next (filtros en la URL) reemplaza la entrada actual y perdería nuestra marca `__capa`:
//   se parchea `replaceState` una vez para conservarla. La marca también evita deshacer una navegación: si la
//   capa se desmonta porque se cambió de ruta (la entrada actual ya no es la suya), no se llama a `back()`.
// - Página abierta directo: el `pushState` crea la entrada, así Atrás cierra la capa y no sale del sitio.
// - StrictMode: el efecto corre dos veces; la profundidad (no un token) es la marca, así el `back()` diferido del
//   primer ciclo cae sobre una entrada equivalente a la del segundo.
interface EntradaAtras { profundidad: number; alCerrar: () => void; cerrando: boolean }
const pilaAtras: EntradaAtras[] = [];
let silencio = 0;
/** La URL más nueva escrita mientras hay capas abiertas (ver `llevarUrl`). */
let urlCapas: string | null = null;
/** Evento con el que, después de cerrar una capa, `useParams` vuelve a escribir sus filtros en la URL (ver el `popstate` de `instalarAtras`). */
export const EVENTO_RELEER = "pld-releer-url";

/** La URL que se repone después de un Atrás que cerró una capa (ver el `popstate` de `instalarAtras`). */
let pendiente: string | null = null;
/** Enlace que se tocó con capas abiertas y que se sigue cuando sus entradas del historial ya se consumieron. */
let irA: HTMLAnchorElement | null = null;
let atrasInstalado = false;

function instalarAtras() {
  if (atrasInstalado || typeof window === "undefined") return;
  atrasInstalado = true;
  // Para `useParams` (lib/url.ts): cuántas capas quedan por cerrar. Su `popstate` puede correr antes o después del de acá
  // (el orden de los avisos no está garantizado), así que pregunta esto en vez de esperar la marca `CIERRA_CAPA`.
  (window as unknown as Record<string, () => number>)[CAPAS_ABIERTAS] = () => pilaAtras.length + silencio;
  const original = window.history.replaceState;
  // Los filtros se guardan en la URL con `replaceState`. Si cambian con una capa abierta, quedan escritos en la entrada
  // de la capa; al volver a la entrada de abajo hay que llevarse esa URL, o el cambio se pierde del link.
  const llevarUrl = () => {
    if (!urlCapas) return;
    const quiero = new URL(urlCapas);
    if (quiero.pathname !== window.location.pathname) urlCapas = null;          // se cambió de página: no tocar
    else if (urlCapas !== window.location.href) original.call(window.history, window.history.state, "", urlCapas);
  };
  window.addEventListener("popstate", () => {
    // Este Atrás cierra una capa (no es una navegación): `useParams` no relee la URL (puede traer el link de antes, escrito por Next
    // o guardado en la entrada de la capa) sino que vuelve a escribir los filtros que tiene la página; ver `CIERRA_CAPA` en lib/url.ts.
    // Así lo elegido dentro de una ventana (por habitante, otra moneda, «en términos de») no se pierde al cerrarla (tanda 12).
    const cierra = silencio > 0 || pilaAtras.length > 0;
    if (cierra) {
      (window as unknown as Record<string, boolean>)[CIERRA_CAPA] = true;
      setTimeout(() => { (window as unknown as Record<string, boolean>)[CIERRA_CAPA] = false; window.dispatchEvent(new Event(EVENTO_RELEER)); }, 0);
    }
    llevarUrl();
    // Next puede volver a escribir su URL vieja en su propio `popstate` (después de este) y `useParams` la lee en ese momento:
    // en la vuelta siguiente del bucle se repone la URL de la capa y se avisa a `useParams` que la relea (sin subir la página).
    // Si mientras tanto `useParams` escribe un filtro nuevo (un Selector que elige al cerrarse), esa URL pasa a ser la que se repone
    // (ver `pendiente` en el `replaceState` de abajo); la de Next, que llega con su propio estado, no.
    pendiente = urlCapas;
    if (pendiente) setTimeout(() => {
      const quiero = pendiente; pendiente = null;
      if (!quiero || new URL(quiero).pathname !== window.location.pathname) return;
      if (window.location.href !== quiero) original.call(window.history, window.history.state, "", quiero);
      window.dispatchEvent(new Event(EVENTO_RELEER));
    }, 0);
    if (silencio > 0) silencio--;
    else { const e = pilaAtras.pop(); if (e) e.alCerrar(); }
    if (!pilaAtras.length && !silencio) urlCapas = null;
    if (irA && !silencio) { const a = irA; irA = null; a.click(); }   // ya sin capas en el historial: ahora sí, seguir el enlace
  }, true);   // en captura: corre antes que el `popstate` de Next, que si no vuelve a escribir la URL vieja
  // Un enlace del sitio tocado con capas abiertas (por ejemplo "Ir a la página del tema" dentro de una ventana): primero se
  // cierran las capas y se consumen sus entradas, y recién después se navega. Si no, quedaría una entrada de más en el
  // historial y desde la página nueva harían falta dos Atrás para volver.
  document.addEventListener("click", (ev) => {
    if (!pilaAtras.length || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const a = (ev.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || a.target === "_blank" || a.hasAttribute("download") || a.origin !== window.location.origin) return;
    if (a.pathname === window.location.pathname && a.search === window.location.search) return;   // solo un ancla de la misma página
    ev.preventDefault(); ev.stopPropagation();
    // El enlace puede desaparecer al cerrarse su ventana: se sigue una copia suelta, que Next no intercepta (carga la página de destino).
    const copia = document.createElement("a"); copia.href = a.href;
    const capas = pilaAtras.splice(0);
    irA = copia; silencio++;
    for (const c of capas.reverse()) c.alCerrar();
    window.history.go(-capas.length);
  }, true);
  // Una marca de capa que quedó en la entrada de la página (por un cierre desordenado, o porque el navegador la conserva al recargar)
  // hacía que el siguiente cierre volviera a una entrada "de capa" y descartara lo elegido (el «en términos de» que no se guardaba
  // al tocar Listo, tanda 12). Sin capas abiertas, la entrada actual no lleva marca.
  const sinMarca = (s: unknown): unknown => {
    if (!s || typeof s !== "object" || (s as { __capa?: number }).__capa === undefined) return s;
    const { __capa: _fuera, ...resto } = s as { __capa?: number };
    void _fuera;
    return resto;
  };
  if (!pilaAtras.length && (window.history.state as { __capa?: number } | null)?.__capa !== undefined) {
    original.call(window.history, sinMarca(window.history.state), "", window.location.href);
  }
  window.history.replaceState = function (this: History, estado: unknown, titulo: string, url?: string | URL | null) {
    const deFiltros = estado == null;   // `useParams` escribe con estado null; Next, con el suyo
    if (!pilaAtras.length) estado = sinMarca(estado);   // sin capas abiertas no se escribe ninguna marca (Next puede copiar un estado viejo que la trae)
    const actual = window.history.state as { __capa?: number } | null;
    // `useParams` escribe con estado null: también ahí se conserva la marca de la capa (solo con capas abiertas)
    if (pilaAtras.length && actual && actual.__capa !== undefined && (estado == null || (typeof estado === "object" && (estado as { __capa?: number }).__capa === undefined))) {
      estado = { ...((estado as object | null) ?? {}), __capa: actual.__capa };
    }
    const r = original.call(this, estado, titulo, url);
    // Solo cuenta si se escribió sobre la entrada de una capa. Next vuelve a escribir su URL "canónica" (la vieja) con su propio
    // `replaceState` justo después de un Atrás, ya parado en la entrada de abajo: eso no es un filtro nuevo y pisaba la URL guardada.
    if (pilaAtras.length && actual && actual.__capa !== undefined) urlCapas = window.location.href;
    if (pendiente && deFiltros) pendiente = window.location.href;
    return r;
  };
}

/** Mientras `abierta` es true, el botón Atrás del navegador cierra esta capa en vez de salir de la página.
 *  Devuelve `cerrar`: llamarla cierra la capa (consume la entrada del historial que se había agregado y después llama a onCerrar una sola vez). */
export function useAtras(abierta: boolean, onCerrar: () => void): () => void {
  const cb = useRef(onCerrar);
  cb.current = onCerrar;
  const entrada = useRef<EntradaAtras | null>(null);
  useEffect(() => {
    if (!abierta) return;
    instalarAtras();
    const e: EntradaAtras = { profundidad: pilaAtras.length + 1, alCerrar: () => cb.current(), cerrando: false };
    pilaAtras.push(e); entrada.current = e;
    const base = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
    window.history.pushState({ ...base, __capa: e.profundidad }, "", window.location.href);
    urlCapas = window.location.href;
    return () => {
      if (entrada.current === e) entrada.current = null;
      const k = pilaAtras.indexOf(e);
      if (k < 0) return;                       // ya la consumió el botón Atrás
      pilaAtras.splice(k, 1);
      const actual = window.history.state as { __capa?: number } | null;
      if (actual && actual.__capa === e.profundidad) { silencio++; window.history.back(); }
      else if (!pilaAtras.length && !silencio) urlCapas = null;
    };
  }, [abierta]);
  return useCallback(() => {
    const e = entrada.current;
    if (!e) { cb.current(); return; }
    if (e.cerrando) return;                    // doble clic: no consumir una entrada ajena
    e.cerrando = true;
    if (pilaAtras[pilaAtras.length - 1] === e) window.history.back();   // el popstate llama a onCerrar
    else cb.current();
  }, []);
}

/** Panel desplegable que se abre debajo del botón y EMPUJA el contenido (no flota encima).
 *  Se cierra con Escape, con un clic afuera, con su cruz o con Atrás. */
export function Desplegable({ etiqueta, children, abiertoInicial = false, className = "" }: {
  etiqueta: ReactNode; children: ReactNode | ((cerrar: (luego?: () => void) => void) => ReactNode); abiertoInicial?: boolean; className?: string;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  // `luego`: lo que hay que hacer recién cuando el panel ya se cerró y el historial volvió a su lugar (por ejemplo, cambiar la URL), como en `Modal`
  const luego = useRef<(() => void) | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const esLaDeArriba = useCapa(abierto);
  const cerrarAtras = useAtras(abierto, () => { setAbierto(false); const l = luego.current; luego.current = null; l?.(); });
  useEffect(() => {
    if (!abierto) return;
    const clic = (ev: MouseEvent) => { if (raiz.current && !raiz.current.contains(ev.target as Node)) setAbierto(false); };
    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape" && esLaDeArriba()) { setAbierto(false); boton.current?.focus(); } };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("mousedown", clic); document.removeEventListener("keydown", tecla); };
  }, [abierto, esLaDeArriba]);
  return (
    <div className={`desplegable ${className}`} ref={raiz}>
      <button ref={boton} type="button" className="btn drop" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}><span className="et">{etiqueta}</span></button>
      {abierto && (
        <div className="panel">
          <div className="panel-cruz"><button type="button" className="cruz-capa" aria-label="Cerrar" onClick={() => { cerrarAtras(); boton.current?.focus(); }}><IconoCruz /></button></div>
          {typeof children === "function" ? children((l) => { luego.current = l ?? null; cerrarAtras(); boton.current?.focus(); }) : children}
        </div>
      )}
    </div>
  );
}

function IconoCruz() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

/** Dentro de un `Modal`: cierra la ventana por el camino de "Atrás". `luego` se llama después de que la ventana se cerró
 *  (por ejemplo, para aplicar un cambio de URL recién cuando el historial ya volvió a su lugar). */
const CerrarModalCtx = createContext<(luego?: () => void) => void>(() => {});
export const useCerrarModal = () => useContext(CerrarModalCtx);

const FOCALES = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Foco de una ventana (mismo contrato que `Hoja`): al abrir guarda dónde estaba el foco y lo lleva a la ventana
 *  (salvo que algo de adentro ya lo tenga, como un `autoFocus`); Tab no sale de la ventana; al cerrar, el foco vuelve.
 *  Devuelve el manejador de `onKeyDown` para el contenedor `role="dialog"` (que necesita `tabIndex={-1}`).
 *  Con ventanas anidadas, solo atrapa el Tab la de arriba. */
export function useFocoVentana(panel: React.RefObject<HTMLElement | null>): (ev: React.KeyboardEvent) => void {
  // Se guarda en el primer render: en el efecto ya puede tenerlo un `autoFocus` de adentro.
  const [previo] = useState(() => (typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null));
  useEffect(() => {
    const p = panel.current;
    if (p && !p.contains(document.activeElement)) p.focus({ preventScroll: true });
    // Se devuelve un instante después y solo si la ventana ya no está: en desarrollo (StrictMode) el efecto se desmonta y
    // se vuelve a montar con la ventana en pie, y devolver el foco ahí pisaría el `autoFocus` de adentro.
    return () => queueMicrotask(() => { if ((!p || !p.isConnected) && previo && previo.isConnected) previo.focus({ preventScroll: true }); });
  }, [panel, previo]);
  return useCallback((ev: React.KeyboardEvent) => {
    const p = panel.current;
    if (ev.key !== "Tab" || !p || ev.defaultPrevented) return;
    if (ev.target instanceof Element && ev.target.closest('[aria-modal="true"]') !== p) return;   // es de una ventana de adentro
    const f = Array.from(p.querySelectorAll<HTMLElement>(FOCALES))
      .filter((e) => (e.offsetParent !== null || e === document.activeElement) && !e.closest("[inert]") && e.closest('[aria-modal="true"]') === p);
    if (!f.length) { ev.preventDefault(); p.focus(); return; }
    const primero = f[0], ultimo = f[f.length - 1], en = document.activeElement;
    if (ev.shiftKey && (en === primero || en === p)) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && en === ultimo) { ev.preventDefault(); primero.focus(); }
  }, [panel]);
}

/** Ventana modal con foco (`useFocoVentana`), cruz de cerrar (44 px), Escape, clic en el fondo y botón Atrás para cerrar. */
export function Modal({ titulo, cabecera, onCerrar, children, ancho }: { titulo: string; cabecera?: ReactNode; onCerrar: () => void; children: ReactNode; ancho?: boolean }) {
  const yo = useRef(Symbol("modal"));
  const panel = useRef<HTMLDivElement>(null);
  const atrapar = useFocoVentana(panel);
  const luego = useRef<(() => void) | null>(null);
  const alCerrar = useRef(onCerrar);
  alCerrar.current = onCerrar;
  const cerrarAtras = useAtras(true, useCallback(() => {
    alCerrar.current();
    const f = luego.current; luego.current = null;
    f?.();
  }, []));
  const cerrar = useCallback((fn?: () => void) => { if (fn) luego.current = fn; cerrarAtras(); }, [cerrarAtras]);
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;
  useEffect(() => {
    const id = yo.current;
    pilaModales.push(id);   // la ventana es una capa más; con un desplegable abierto encima, Escape no la toca
    const tecla = (ev: KeyboardEvent) => { if (ev.key === "Escape" && pilaModales[pilaModales.length - 1] === id) { ev.stopPropagation(); cerrarRef.current(); } };
    document.addEventListener("keydown", tecla, true);
    return () => { document.removeEventListener("keydown", tecla, true); const k = pilaModales.indexOf(id); if (k >= 0) pilaModales.splice(k, 1); };
  }, []);
  return (
    <div className="modal-fondo" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) cerrar(); }}>
      <div className="modal" ref={panel} tabIndex={-1} onKeyDown={atrapar} role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: "100%", ...(ancho ? { width: "min(760px,100%)" } : null) }}>
        <div className={`modal-cab${cabecera ? " con-tit" : ""}`}>
          {cabecera ? <h2 className="modal-tit">{cabecera}</h2> : null}
          <button type="button" className="cruz-capa modal-cruz" aria-label="Cerrar" onClick={() => cerrar()}><IconoCruz /></button>
        </div>
        <CerrarModalCtx.Provider value={cerrar}>{children}</CerrarModalCtx.Provider>
      </div>
    </div>
  );
}

export function Cargando({ texto = "Cargando datos…" }: { texto?: string }) {
  return <p className="note" role="status">{texto}</p>;
}

/** Desplegable propio (reemplaza al `<select>` nativo): mismo aspecto en todos los dispositivos.
 *  Enter / Espacio / flechas abren; flechas mueven; Enter elige; Escape cierra y devuelve el foco al botón. */
export function Selector({ etiqueta, valor, opciones, onElegir, className = "" }: {
  etiqueta: string; valor: string; opciones: [string, string][]; onElegir: (v: string) => void; className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; max: number } | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const id = useId();
  useCapa(abierto);   // para que Escape dentro de una ventana cierre solo la lista
  const luego = useRef<(() => void) | null>(null);
  // Atrás cierra la lista; al elegir, el cambio (que puede tocar la URL) se aplica recién cuando el historial ya volvió a su lugar
  const cerrarAtras = useAtras(abierto, useCallback(() => {
    setAbierto(false);
    const f = luego.current; luego.current = null;
    f?.();
  }, []));
  const idx = Math.max(0, opciones.findIndex((o) => o[0] === valor));

  const abrir = useCallback(() => {
    const r = boton.current?.getBoundingClientRect(); if (!r) return;
    const vh = window.innerHeight, abajo = vh - r.bottom - 8, arriba = r.top - 8, alto = Math.min(280, opciones.length * 32 + 10);
    const hacia = abajo >= alto || abajo >= arriba ? "abajo" : "arriba";
    const left = Math.max(4, Math.min(r.left, window.innerWidth - Math.max(r.width, 160) - 4));
    setPos(hacia === "abajo" ? { left, top: r.bottom + 4, width: r.width, max: Math.min(280, abajo - 4) } : { left, bottom: vh - r.top + 4, width: r.width, max: Math.min(280, arriba - 4) });
    setActivo(idx); setAbierto(true);
  }, [idx, opciones.length]);
  const cerrar = useCallback((foco = true) => { setAbierto(false); if (foco) boton.current?.focus(); }, []);
  const elegir = (i: number) => {
    const o = opciones[i];
    if (o) luego.current = () => onElegir(o[0]);
    cerrarAtras(); boton.current?.focus();
  };

  useEffect(() => {
    if (!abierto) return;
    lista.current?.focus({ preventScroll: true });
    const clic = (ev: MouseEvent) => { const t = ev.target as Node; if (!raiz.current?.contains(t) && !lista.current?.contains(t)) cerrar(false); };
    const scroll = (ev: Event) => { if (!lista.current?.contains(ev.target as Node)) cerrar(false); };
    const ancho0 = window.innerWidth;
    const redim = () => { if (window.innerWidth !== ancho0) cerrar(false); }; // la barra del navegador en celular cambia solo el alto
    document.addEventListener("mousedown", clic);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", redim);
    return () => { document.removeEventListener("mousedown", clic); window.removeEventListener("scroll", scroll, true); window.removeEventListener("resize", redim); };
  }, [abierto, cerrar]);
  useEffect(() => { if (abierto) lista.current?.querySelector<HTMLElement>(`[data-i="${activo}"]`)?.scrollIntoView({ block: "nearest" }); }, [abierto, activo]);

  const teclaBoton = (ev: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp"].includes(ev.key)) { ev.preventDefault(); abrir(); }
  };
  const teclaLista = (ev: React.KeyboardEvent) => {
    const n = opciones.length;
    if (ev.key === "ArrowDown") { ev.preventDefault(); setActivo((activo + 1) % n); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setActivo((activo + n - 1) % n); }
    else if (ev.key === "Home") { ev.preventDefault(); setActivo(0); }
    else if (ev.key === "End") { ev.preventDefault(); setActivo(n - 1); }
    else if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); elegir(activo); }
    else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); cerrar(); }
    else if (ev.key === "Tab") cerrar(false);
  };
  return (
    <div className={`sel ${className}`} ref={raiz}>
      <button ref={boton} type="button" className="btn sel-btn" aria-label={etiqueta} aria-haspopup="listbox" aria-expanded={abierto} aria-controls={abierto ? id : undefined}
        onClick={() => (abierto ? cerrar() : abrir())} onKeyDown={teclaBoton}><span className="et">{opciones[idx]?.[1] ?? ""}</span></button>
      {abierto && pos && (
        <ul ref={lista} id={id} className="sel-lista" role="listbox" tabIndex={-1} aria-label={etiqueta} aria-activedescendant={`${id}-${activo}`} onKeyDown={teclaLista}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width, maxHeight: pos.max, maxWidth: "calc(100vw - 8px)" }}>
          {opciones.map(([v, t], i) => (
            <li key={v} id={`${id}-${i}`} data-i={i} role="option" aria-selected={v === valor} className={i === activo ? "activo" : undefined}
              onMouseEnter={() => setActivo(i)} onClick={() => elegir(i)}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Plegable sin caja: un renglón con el resumen y un chevron que gira, una línea de 1 px abajo y una región que abre y cierra con
 *  animación de alto y opacidad (`grid-template-rows: 0fr → 1fr`; sin animar con "reducir movimiento").
 *  Controlado (`abierto` + `onCambiar`) o no controlado (`inicial`). Los hijos quedan montados; cerrado, `inert` los saca del foco.
 *  `nivel`: "renglon" (por defecto, texto normal), "chico" (renglón de 40 px, texto chico y gris). */
export function Plegable({ resumen, abierto, onCambiar, inicial = false, className, children, nivel }: {
  resumen: ReactNode; abierto?: boolean; onCambiar?: (a: boolean) => void; inicial?: boolean; className?: string; children: ReactNode; nivel?: "renglon" | "chico";
}) {
  const [interno, setInterno] = useState(inicial);
  const controlado = abierto !== undefined;
  const esta = controlado ? abierto : interno;
  const id = useId();
  const alternar = () => { const n = !esta; if (!controlado) setInterno(n); onCambiar?.(n); };
  return (
    <div className={`plegable plegable-nivel-${nivel ?? "renglon"}${className ? " " + className : ""}`} data-abierto={esta ? "true" : "false"}>
      <button type="button" className="plegable-cab" aria-expanded={esta} aria-controls={id} onClick={alternar}>
        <span className="plegable-resumen">{resumen}</span>
        <span className="plegable-chev" aria-hidden="true"><IconoAbajo /></span>
      </button>
      <div className="plegable-region" id={id} inert={!esta} aria-hidden={!esta}>
        <div className="plegable-interior">{children}</div>
      </div>
    </div>
  );
}
