import { ACCIONES, FORMATOS, UUID_V4, horaRedondeada, leerCuerpo, metodoNoPermitido, respuesta, type Env } from "../_comun";

/** null si falta o está vacío, undefined si es inválido. */
function textoOpcional(v: unknown, max: number): string | null | undefined {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || v.length > max) return undefined;
  return v;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return respuesta(503, "Base sin configurar"); // publicado antes de crear la base (ver wrangler.toml)
  const r = await leerCuerpo(request);
  if ("error" in r) return r.error;
  const c = r.cuerpo;

  if (typeof c.id !== "string" || !UUID_V4.test(c.id)) return respuesta(400, "id inválido");
  if (typeof c.accion !== "string" || !(ACCIONES as readonly string[]).includes(c.accion))
    return respuesta(400, "accion inválida");
  if (
    typeof c.ruta !== "string" ||
    !c.ruta.startsWith("/") ||
    c.ruta.length > 120 ||
    c.ruta.includes("?") ||
    c.ruta.includes("#")
  )
    return respuesta(400, "ruta inválida");
  const vista = textoOpcional(c.vista, 500);
  if (vista === undefined) return respuesta(400, "vista inválida");
  const dato = textoOpcional(c.dato, 80);
  if (dato === undefined) return respuesta(400, "dato inválido");
  let formato: string | null = null;
  if (c.formato !== undefined && c.formato !== null) {
    if (typeof c.formato !== "string" || !(FORMATOS as readonly string[]).includes(c.formato))
      return respuesta(400, "formato inválido");
    formato = c.formato;
  }
  if (typeof c.celular !== "boolean") return respuesta(400, "celular inválido");

  await env.DB.prepare(
    "INSERT OR IGNORE INTO compartidos (id, creado, accion, ruta, vista, dato, formato, celular) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(c.id, horaRedondeada(new Date()), c.accion, c.ruta, vista, dato, formato, c.celular ? 1 : 0)
    .run();
  return respuesta(204);
};

export const onRequest: PagesFunction<Env> = async () => metodoNoPermitido();
