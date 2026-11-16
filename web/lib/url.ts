"use client";
// Estado en la URL (query string): se lee al abrir y se escribe con replaceState.
// Un parámetro inválido se ignora y cae al valor por defecto.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Expr } from "./motor";
import { ALIAS_ID } from "./nombres";

export const encExpr = (e: Expr): string => [e.id, e.med ?? "", e.rel ?? "", e.modo ?? "", e.esc ?? ""].join("~");
export function decExpr(s: string | null | undefined, existe: (id: string) => boolean): Expr | null {
  if (!s) return null;
  const [id0, med0, rel0, modo, esc] = s.split("~");
  const alias = ALIAS_ID[id0];     // `inflacion` e `inflacion_ia` ya no se listan: se leen como `ipc_empalme` mensual / interanual
  const id = alias ? alias.id : id0;
  if (!id || !existe(id)) return null;
  const rel = ALIAS_ID[rel0]?.id ?? rel0;
  // `vac` (acumulada en el año) se retiró: se lee como interanual. Un link viejo a `ipc_empalme` sin medida era interanual (hoy el defecto es mensual).
  const med = alias ? alias.med : med0 === "vac" ? "via" : med0 || (id === "ipc_empalme" ? "via" : undefined);
  return { id, med, rel: rel && existe(rel) ? rel : null, modo: modo || "compra", esc: esc || "" };
}
/** Traduce los ids viejos (`inflacion`, `inflacion_ia`) de una lista de expresiones de URL ("a~b~c,d~e") sin descartar nada. */
export function migrarListaExpr(s: string): string {
  return s.split(",").map((x) => {
    const t = x.split("~"), a = ALIAS_ID[t[0]];
    if (a) { t[0] = a.id; t[1] = a.med; }
    if (t[2] && ALIAS_ID[t[2]]) t[2] = ALIAS_ID[t[2]].id;
    return t.join("~");
  }).join(",");
}
export const lista = (s: string | null | undefined): string[] => (s ? s.split(",").filter(Boolean) : []);
export const enteroEn = (s: string | null | undefined, min: number, max: number, def: number): number => {
  const n = s == null || s === "" ? NaN : Number(s);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : def;
};
export const unoDe = <T extends string>(s: string | null | undefined, validos: readonly T[], def: T): T =>
  s != null && (validos as readonly string[]).includes(s) ? (s as T) : def;   // sin el parámetro, siempre `def` (antes devolvía null si "" era válido)

/** Marca en `window` mientras se procesa un Atrás que cierra una capa (la pone `instalarAtras` en components/ui.tsx). */
export const CIERRA_CAPA = "__pldCierraCapa";
/** Función en `window` que dice cuántas capas hay abiertas o por cerrar (la publica `instalarAtras`). */
export const CAPAS_ABIERTAS = "__pldCapasAbiertas";
const EVENTO_PUSH = "pd-pushstate";
/** Avisa (una sola vez por página) cada vez que alguien hace `history.pushState`, como hace el `Link` de Next al navegar. */
function ponerEscuchaPush() {
  const h = window.history as History & { __pdAviso?: boolean };
  if (h.__pdAviso) return;
  h.__pdAviso = true;
  const original = h.pushState.bind(h);
  h.pushState = (...args: Parameters<History["pushState"]>) => {
    original(...args);
    window.dispatchEvent(new Event(EVENTO_PUSH));
  };
}

/** Devuelve [params, escribir, montado]. `montado` es false hasta leer la URL real (evita desajustes de hidratación). */
export function useParams(): [URLSearchParams, (cambios: Record<string, string | null | undefined>) => void, boolean] {
  const [params, setParams] = useState(() => new URLSearchParams(""));
  const [montado, setMontado] = useState(false);
  const actual = useRef(params);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    actual.current = p; setParams(p); setMontado(true);
    // Un link a la misma ruta con otro query string (navegación del cliente de Next, o Atrás/Adelante) no remonta la página:
    // se vuelve a leer la URL cuando cambia, y un link nuevo (pushState) deja la página arriba de todo.
    const ruta = window.location.pathname;
    const releer = (nuevo: boolean) => {
      if (window.location.pathname !== ruta) return;   // un link a otra ruta: esta página se va, no relee el query ajeno
      const np = new URLSearchParams(window.location.search);
      if (np.toString() === actual.current.toString()) return;   // sin cambios (p. ej. la hoja que apila su propio estado)
      actual.current = np; setParams(np);
      if (nuevo) window.scrollTo(0, 0);
    };
    // Al cerrar una ventana (un Atrás que consume una capa, ver `instalarAtras` en components/ui.tsx) la URL de la entrada de abajo
    // puede ser la de antes: mandan los filtros que tiene la página, que se vuelven a escribir. Un Atrás de verdad (sin capas) relee.
    const reescribir = () => {
      if (window.location.pathname !== ruta) return;
      const q = actual.current.toString();
      if (window.location.search.replace(/^\?/, "") !== q) window.history.replaceState(null, "", window.location.pathname + (q ? "?" + q : "") + window.location.hash);
    };
    // ¿Este Atrás cierra una capa? Si el `popstate` de ui.tsx ya corrió, dejó la marca `CIERRA_CAPA`; si todavía no, la capa
    // sigue contada en `CAPAS_ABIERTAS`.
    const cierraCapa = () => {
      const w = window as unknown as Record<string, unknown>;
      const capas = w[CAPAS_ABIERTAS] as (() => number) | undefined;
      return !!w[CIERRA_CAPA] || (!!capas && capas() > 0);
    };
    const alPush = () => releer(true), alPop = () => (cierraCapa() ? reescribir() : releer(false));
    ponerEscuchaPush();
    window.addEventListener(EVENTO_PUSH, alPush);
    window.addEventListener("popstate", alPop);
    window.addEventListener("pld-releer-url", reescribir);   // EVENTO_RELEER de ui.tsx: después de cerrar una capa, se reescriben los filtros
    return () => { window.removeEventListener(EVENTO_PUSH, alPush); window.removeEventListener("popstate", alPop); window.removeEventListener("pld-releer-url", reescribir); };
  }, []);
  const escribir = useCallback((cambios: Record<string, string | null | undefined>) => {
    const p = new URLSearchParams(actual.current);
    for (const [k, v] of Object.entries(cambios)) { if (v == null || v === "") p.delete(k); else p.set(k, v); }
    actual.current = p;
    const q = p.toString();
    window.history.replaceState(null, "", window.location.pathname + (q ? "?" + q : "") + window.location.hash);
    setParams(p);
  }, []);
  return [params, escribir, montado];
}
