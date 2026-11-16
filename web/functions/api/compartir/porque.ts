import { PORQUES, UUID_V4, horaRedondeada, leerCuerpo, metodoNoPermitido, respuesta, type Env } from "../../_comun";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return respuesta(503, "Base sin configurar"); // publicado antes de crear la base (ver wrangler.toml)
  const r = await leerCuerpo(request);
  if ("error" in r) return r.error;
  const c = r.cuerpo;

  if (typeof c.id !== "string" || !UUID_V4.test(c.id)) return respuesta(400, "id inválido");
  if (typeof c.porque !== "string" || !(PORQUES as readonly string[]).includes(c.porque))
    return respuesta(400, "porque inválido");

  // `creado` está redondeado a la hora hacia abajo: se compara contra la hora de hace 2 horas, también redondeada
  // (tolera hasta 1 hora de más, nunca rechaza una respuesta dentro de las 2 horas).
  const limite = horaRedondeada(new Date(Date.now() - 2 * 60 * 60 * 1000));
  await env.DB.prepare("UPDATE compartidos SET porque = ? WHERE id = ? AND porque IS NULL AND creado >= ?")
    .bind(c.porque, c.id, limite)
    .run();
  return respuesta(204);
};

export const onRequest: PagesFunction<Env> = async () => metodoNoPermitido();
