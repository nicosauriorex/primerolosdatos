// Código común de las funciones de /api/compartir. No exporta onRequest*, así que no es una ruta.
// No guarda IP, user agent, cookies ni encabezados.

export interface Env {
  DB: D1Database;
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

export function metodoNoPermitido(): Response {
  return new Response("Método no permitido", {
    status: 405,
    headers: { allow: "POST", "content-type": "text/plain; charset=utf-8" },
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
