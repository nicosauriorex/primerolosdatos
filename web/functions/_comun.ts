// Código común de las funciones de /api/compartir. No exporta onRequest*, así que no es una ruta.
// No guarda IP, user agent, cookies ni encabezados.

export interface Env {
  DB: D1Database;
  /** Secreto de Turnstile (variable secreta de Pages; en local, web/.dev.vars). */
  TURNSTILE_SECRET?: string;
  /** Archivos estáticos del sitio (para leer /datos/predicciones.json). */
  ASSETS: Fetcher;
}

export const MAX_BYTES = 2048;

export const ACCIONES = [
  "imagen_compartida",
  "imagen_descargada",
  "imagen_copiada",
  "link_compartido",
  "link_copiado",
  "texto",
  "tabla",
] as const;

export const PORQUES = ["bueno", "malo", "mejoro", "empeoro", "curiosidad", "otro"] as const;

export const FORMATOS = ["1x1", "4x5", "16x9"] as const;

export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function respuesta(estado: number, texto?: string): Response {
  const headers: Record<string, string> = { "cache-control": "no-store" };
  if (texto) headers["content-type"] = "text/plain; charset=utf-8";
  return new Response(texto ?? null, { status: estado, headers });
}

export function origenPermitido(origen: string | null): boolean {
  if (!origen) return false;
  if (origen === "https://primerolosdatos.com.ar" || origen === "http://localhost:8788") return true;
  return /^https:\/\/([a-z0-9-]+\.)*duelo-de-datos\.pages\.dev$/.test(origen);
}

export function metodoNoPermitido(permitido = "POST"): Response {
  return new Response("Método no permitido", {
    status: 405,
    headers: { allow: permitido,"content-type": "text/plain; charset=utf-8" },
  });
}

/** Valida origen y tamaño y devuelve el JSON, o la Response de error. */
export async function leerCuerpo(
  request: Request,
): Promise<{ cuerpo: Record<string, unknown> } | { error: Response }> {
  if (!origenPermitido(request.headers.get("Origin"))) return { error: respuesta(403, "Origen no permitido") };
  const largo = Number(request.headers.get("content-length"));
  if (Number.isFinite(largo) && largo > MAX_BYTES) return { error: respuesta(413, "Cuerpo demasiado grande") };
  const texto = await request.text();
  if (new TextEncoder().encode(texto).length > MAX_BYTES) return { error: respuesta(413, "Cuerpo demasiado grande") };
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { error: respuesta(400, "JSON inválido") };
  }
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return { error: respuesta(400, "Cuerpo inválido") };
  return { cuerpo: datos as Record<string, unknown> };
}

/** UTC redondeado a la hora hacia abajo: AAAA-MM-DDTHH:00Z */
export function horaRedondeada(fecha: Date): string {
  return fecha.toISOString().slice(0, 13) + ":00Z";
}

// ---- Predicciones (bloque 9c) ----

export const MIN_PARA_MEDIANA = 10;

export interface RondaPrediccion {
  id: string;
  abre: string;
  cierra: string | null;
  real: number | null;
}

/** Lee /datos/predicciones.json de los estáticos del sitio. null si no se pudo leer. */
export async function leerRondas(env: Env, request: Request): Promise<RondaPrediccion[] | null> {
  try {
    const r = await env.ASSETS.fetch(new URL("/datos/predicciones.json", request.url));
    if (!r.ok) return null;
    const j = (await r.json()) as { rondas?: RondaPrediccion[] };
    return Array.isArray(j.rondas) ? j.rondas : null;
  } catch {
    return null;
  }
}

/** Abierta: sin dato real, ya abrió y todavía no cerró (cierra null = sigue abierta). */
export function rondaAbierta(r: RondaPrediccion, ahora: number): boolean {
  if (r.real !== null && r.real !== undefined) return false;
  if (Date.parse(r.abre) > ahora) return false;
  return r.cierra === null || ahora < Date.parse(r.cierra);
}

export async function verificarTurnstile(secreto: string, token: string): Promise<boolean> {
  try {
    const form = new FormData();
    form.append("secret", secreto);
    form.append("response", token); // sin remoteip: no mandamos la IP
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    if (!r.ok) return false;
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}

function percentil(orden: number[], p: number): number {
  const pos = (orden.length - 1) * p;
  const i = Math.floor(pos);
  const f = pos - i;
  const v = i + 1 < orden.length ? orden[i] + (orden[i + 1] - orden[i]) * f : orden[i];
  return Math.round(v * 10) / 10;
}

export interface ResumenRonda {
  ronda: string;
  n: number;
  mediana?: number;
  p25?: number;
  p75?: number;
  histograma?: [number, number][];
}

/** Resumen de una ronda a partir de los valores ordenados de menor a mayor. Con n < 10, solo ronda y n. */
export function resumir(ronda: string, orden: number[]): ResumenRonda {
  const n = orden.length;
  if (n < MIN_PARA_MEDIANA) return { ronda, n };
  const cuenta = new Map<number, number>();
  for (const v of orden) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  return {
    ronda,
    n,
    mediana: percentil(orden, 0.5),
    p25: percentil(orden, 0.25),
    p75: percentil(orden, 0.75),
    histograma: [...cuenta.entries()],
  };
}

export async function resumenDeRonda(env: Env, ronda: string): Promise<ResumenRonda> {
  const { results } = await env.DB.prepare("SELECT valor FROM predicciones WHERE ronda = ? ORDER BY valor")
    .bind(ronda)
    .all<{ valor: number }>();
  return resumir(
    ronda,
    results.map((f) => f.valor),
  );
}
