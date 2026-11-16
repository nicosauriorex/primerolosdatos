"use client";
// Predicciones de la inflación mensual (docs/specs/predicciones.md): tipos del JSON que arma el pipeline (`predicciones.json`, fuera del hash),
// estado de cada ronda, diferencias con signo (D-012: sin "ganó" ni "acertó"), error medio absoluto, lo guardado en el navegador y las llamadas
// a `/api/prediccion` y `/api/predicciones` (solo en los mismos hosts que `conteo.ts`).
import { useEffect, useState } from "react";
import { mandaAlServidor } from "./conteo";
import { nf1, r1, restaLimpia } from "./formato";

// ------------------------------------------------------------ Datos (formato de `predicciones.json`)
export interface Rem { mediana: number; n: number; relevamiento: string }
export interface Ronda { id: string; serie: string; periodo: string; abre: string | null; cierra: string | null; rem: Rem | null; real: number | null }
export interface Predicciones { generado: string; rondas: Ronda[] }
/** Resumen de lo que predijo la gente; sin `mediana` si hay menos de `MIN_MEDIANA` predicciones. */
export interface Resumen { ronda: string; n: number; mediana?: number; p25?: number; p75?: number; histograma?: [number, number][] }
export interface FilaGente { ronda: string; n: number; mediana?: number }

export const MIN_MEDIANA = 10;
export const VALOR_MIN = -5;
export const VALOR_MAX = 30;
export const RUTA_PREDICCIONES = "/predicciones/";

const num = (x: unknown): x is number => typeof x === "number" && isFinite(x);
const esPeriodo = (x: unknown): x is string => typeof x === "string" && /^\d{4}-\d{2}$/.test(x);

/** Valida lo que llegó del archivo; lo que no tiene la forma esperada se descarta. Null si no es un objeto. */
export function decodificar(c: unknown): Predicciones | null {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  const rondas: Ronda[] = [];
  for (const x of Array.isArray(o.rondas) ? o.rondas : []) {
    const r = x as Record<string, unknown> | null;
    if (!r || typeof r.id !== "string" || !esPeriodo(r.periodo)) continue;
    const rem = r.rem as Record<string, unknown> | null | undefined;
    rondas.push({
      id: r.id, serie: typeof r.serie === "string" ? r.serie : "ipc_empalme", periodo: r.periodo,
      abre: typeof r.abre === "string" ? r.abre : null, cierra: typeof r.cierra === "string" ? r.cierra : null,
      rem: rem && num(rem.mediana) ? { mediana: rem.mediana, n: num(rem.n) ? rem.n : 0, relevamiento: typeof rem.relevamiento === "string" ? rem.relevamiento : "" } : null,
      real: num(r.real) ? r.real : null,
    });
  }
  return { generado: typeof o.generado === "string" ? o.generado : "", rondas };
}

// ------------------------------------------------------------ Estado de la ronda
export type EstadoRonda = "abierta" | "esperando" | "resultado";
/** Con dato real: resultado. Sin dato: abierta hasta la hora de cierre (sin hora, abierta) y, pasada, esperando que el pipeline traiga el dato. */
export function estadoRonda(r: Ronda, ahora: number = Date.now()): EstadoRonda {
  if (r.real != null) return "resultado";
  const t = r.cierra ? Date.parse(r.cierra) : NaN;
  return isFinite(t) && ahora >= t ? "esperando" : "abierta";
}
/** La ronda abierta (como máximo una). */
export const rondaAbierta = (d: Predicciones | null | undefined, ahora?: number): Ronda | null => d?.rondas.find((r) => estadoRonda(r, ahora) === "abierta") ?? null;
/** Las rondas ya cerradas (esperando el dato o con resultado), de la más nueva a la más vieja. */
export const rondasCerradas = (d: Predicciones, ahora?: number): Ronda[] => d.rondas.filter((r) => estadoRonda(r, ahora) !== "abierta").sort((a, b) => b.periodo.localeCompare(a.periodo));

// ------------------------------------------------------------ Cuentas (con los valores redondeados que se muestran)
/** Diferencia `a − b` con los dos redondeados a un decimal, como se ven. */
export const dif = (a: number, b: number): number => restaLimpia(r1(a), r1(b));
/** "+0,2" / "−0,3" / "0,0" (nunca "-0,0"). */
export function difConSigno(d: number): string {
  if (d === 0) return "0,0";
  return `${d > 0 ? "+" : "−"}${nf1.format(Math.abs(d))}`;
}
/** "0,2 p.p. más" / "0,3 p.p. menos" / "igual": cuánto más o menos que el dato real era lo que se esperaba. */
export function difPalabras(esperado: number, real: number): string {
  const d = dif(esperado, real);
  return d === 0 ? "igual" : `${nf1.format(Math.abs(d))} p.p. ${d > 0 ? "más" : "menos"}`;
}
/** Error medio absoluto en p.p. de varias (esperado, real). Null si no hay ninguna. */
export function errorMedio(pares: { esperado: number; real: number }[]): number | null {
  if (!pares.length) return null;
  return r1(pares.reduce((s, p) => s + Math.abs(dif(p.esperado, p.real)), 0) / pares.length);
}

/** El valor que escribió el usuario (coma o punto) o null si no sirve; lo mismo que rechaza el servidor. Se redondea a un decimal. */
export function leerValor(texto: string): { valor: number } | { error: string } {
  const t = texto.trim().replace(/\s/g, "").replace("−", "-").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return { error: "Escribí un número, por ejemplo 2,1." };
  const v = Math.round(Number(t) * 10) / 10;
  if (!(v >= VALOR_MIN && v <= VALOR_MAX)) return { error: "Poné un valor entre −5 y 30." };
  return { valor: v || 0 };
}

// ------------------------------------------------------------ Lo guardado en el navegador
export const CLAVE_PREDICCIONES = "pld:predicciones";
export interface Guardado { votante: string; valor: number | null; visto: boolean }
type Almacen = Record<string, Guardado>;
let memoria: Almacen = {}; // copia de la sesión: sin almacenamiento se puede predecir igual, pero no se recuerda

export function leerGuardado(): Almacen {
  try {
    const t = localStorage.getItem(CLAVE_PREDICCIONES);
    if (t != null) {
      const raw = JSON.parse(t) as unknown, out: Almacen = {};
      if (raw && typeof raw === "object") for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        const o = v as Record<string, unknown> | null;
        if (o && typeof o.votante === "string") out[k] = { votante: o.votante, valor: num(o.valor) ? o.valor : null, visto: o.visto === true };
      }
      memoria = out;
    }
  } catch { /* almacenamiento no disponible: se usa la copia de la sesión */ }
  return memoria;
}
/** El votante de la ronda (se crea si no hay): un UUID por ronda, que no une rondas entre sí. */
export function votanteDe(ronda: string): string {
  const g = leerGuardado()[ronda];
  if (g) return g.votante;
  let id: string;
  try { id = crypto.randomUUID(); } catch { id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); }); }
  return id;
}
/** Guarda lo de una ronda. Devuelve false si el navegador no dejó escribir (la copia de la sesión queda igual). */
export function guardarRonda(ronda: string, g: Guardado): boolean {
  memoria = { ...leerGuardado(), [ronda]: g };
  try { localStorage.setItem(CLAVE_PREDICCIONES, JSON.stringify(memoria)); return true; } catch { return false; }
}

// ------------------------------------------------------------ Turnstile
/** Clave de prueba de Cloudflare que siempre pasa (solo en localhost). */
export const TURNSTILE_PRUEBA = "1x00000000000000000000AA";
/** Clave pública del widget de producción. Pendiente: crear el widget en Cloudflare y pegarla acá (requisito 15 de docs/specs/predicciones.md). */
export const TURNSTILE_SITEKEY = "PENDIENTE-turnstile";
/** La clave que corresponde a este host; null si todavía no está cargada la de producción (el formulario dice que no está disponible). */
export function claveTurnstile(): string | null {
  if (window.location.hostname === "localhost") return TURNSTILE_PRUEBA;
  return TURNSTILE_SITEKEY.startsWith("PENDIENTE") ? null : TURNSTILE_SITEKEY;
}
/** ¿Esta página puede mandar y pedir predicciones? Mismos hosts que `conteo.ts` y, además, con clave de Turnstile. */
export const prediccionesDisponibles = (): boolean => mandaAlServidor() && claveTurnstile() != null;

// ------------------------------------------------------------ Llamadas al servidor
export type ErrorEnvio = "cerrada" | "verificacion" | "no_disponible" | "invalido" | "red";
export type RespuestaEnvio = { ok: true; resumen: Resumen } | { ok: false; error: ErrorEnvio; texto?: string };

function resumenDe(x: unknown): Resumen | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.ronda !== "string" || !num(o.n)) return null;
  const hist = Array.isArray(o.histograma)
    ? o.histograma.filter((h): h is [number, number] => Array.isArray(h) && num(h[0]) && num(h[1])).map((h): [number, number] => [h[0], h[1]]).sort((a, b) => a[0] - b[0]) : undefined;
  return { ronda: o.ronda, n: o.n, mediana: num(o.mediana) ? o.mediana : undefined, p25: num(o.p25) ? o.p25 : undefined, p75: num(o.p75) ? o.p75 : undefined, histograma: hist };
}

export async function enviarPrediccion(e: { ronda: string; votante: string; valor: number; token: string }): Promise<RespuestaEnvio> {
  if (!mandaAlServidor()) return { ok: false, error: "no_disponible" };
  try {
    const r = await fetch("/api/prediccion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...e, celular: window.innerWidth < 768 }) });
    if (r.ok) { const s = resumenDe(await r.json().catch(() => null)); return s ? { ok: true, resumen: s } : { ok: false, error: "no_disponible" }; }
    if (r.status === 409) return { ok: false, error: "cerrada" };
    if (r.status === 403) return { ok: false, error: "verificacion" };
    if (r.status === 400) return { ok: false, error: "invalido", texto: (await r.text().catch(() => "")).slice(0, 120) };
    return { ok: false, error: "no_disponible" };
  } catch { return { ok: false, error: "red" }; }
}

/** Resumen de una ronda; null si no hay servicio o falló. */
export async function pedirResumen(ronda: string): Promise<Resumen | null> {
  if (!mandaAlServidor()) return null;
  try {
    const r = await fetch(`/api/predicciones?ronda=${encodeURIComponent(ronda)}`);
    return r.ok ? resumenDe(await r.json().catch(() => null)) : null;
  } catch { return null; }
}

/** Rondas con predicciones (para la historia); null si no hay servicio o falló. */
export async function pedirLista(): Promise<FilaGente[] | null> {
  if (!mandaAlServidor()) return null;
  try {
    const r = await fetch("/api/predicciones");
    if (!r.ok) return null;
    const j = (await r.json().catch(() => null)) as unknown;
    if (!Array.isArray(j)) return null;
    return j.filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && typeof (x as Record<string, unknown>).ronda === "string" && num((x as Record<string, unknown>).n))
      .map((x) => ({ ronda: x.ronda as string, n: x.n as number, mediana: num(x.mediana) ? x.mediana : undefined }));
  } catch { return null; }
}

// ------------------------------------------------------------ Carga de predicciones.json
let promesa: Promise<Predicciones> | null = null;
function bajar(): Promise<Predicciones> {
  if (!promesa) {
    promesa = fetch("/datos/predicciones.json", { cache: "no-cache" })
      // Sin archivo (404: todavía no lo armó la corrida) es lo mismo que sin rondas.
      .then((r) => { if (r.status === 404) return { generado: "", rondas: [] }; if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<unknown>; })
      .then((c) => { const d = decodificar(c); if (!d) throw new Error("el archivo no tiene el formato esperado"); return d; })
      .catch((e) => { promesa = null; throw e; });
  }
  return promesa;
}

/** `datos` es null mientras carga o si falló (`error` trae el mensaje). Se baja una vez y se comparte entre la página, Novedades y la ficha. */
export function usePredicciones(activo = true): { datos: Predicciones | null; error: string | null } {
  const [estado, setEstado] = useState<{ datos: Predicciones | null; error: string | null }>({ datos: null, error: null });
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    bajar().then((datos) => { if (vivo) setEstado({ datos, error: null }); })
      .catch((e: Error) => { if (vivo) setEstado({ datos: null, error: `No se pudieron cargar las predicciones (${e.message}).` }); });
    return () => { vivo = false; };
  }, [activo]);
  return estado;
}
