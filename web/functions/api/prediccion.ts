import {
  UUID_V4,
  horaRedondeada,
  leerCuerpo,
  leerRondas,
  metodoNoPermitido,
  rondaAbierta,
  respuesta,
  resumenDeRonda,
  verificarTurnstile,
  type Env,
} from "../_comun";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return respuesta(503, "Base sin configurar");
  const r = await leerCuerpo(request);
  if ("error" in r) return r.error;
  const c = r.cuerpo;

  if (typeof c.ronda !== "string" || c.ronda.length > 40) return respuesta(400, "ronda inválida");
  if (typeof c.votante !== "string" || !UUID_V4.test(c.votante)) return respuesta(400, "votante inválido");
  if (typeof c.valor !== "number" || !Number.isFinite(c.valor)) return respuesta(400, "valor inválido");
  const valor = Math.round(c.valor * 10) / 10;
  if (valor < -5 || valor > 30) return respuesta(400, "Valor fuera de rango");
  if (typeof c.token !== "string" || c.token.length === 0 || c.token.length > 2048) return respuesta(400, "token inválido");
  if (typeof c.celular !== "boolean") return respuesta(400, "celular inválido");

  if (!env.TURNSTILE_SECRET) return respuesta(503, "Verificación sin configurar");

  const rondas = await leerRondas(env, request);
  if (!rondas) return respuesta(503, "Rondas no disponibles");
  const ronda = rondas.find((x) => x.id === c.ronda);
  if (!ronda) return respuesta(400, "Ronda desconocida");
  const ahora = Date.now();
  if (ronda.cierra !== null && ahora >= Date.parse(ronda.cierra)) return respuesta(409, "La ronda ya cerró");
  if (!rondaAbierta(ronda, ahora)) return respuesta(400, "Ronda desconocida"); // ya tiene dato real o todavía no abrió

  if (!(await verificarTurnstile(env.TURNSTILE_SECRET, c.token))) return respuesta(403, "Verificación fallida");

  const hora = horaRedondeada(new Date(ahora));
  await env.DB.prepare(
    `INSERT INTO predicciones (ronda, votante, valor, creado, cambiado, celular) VALUES (?, ?, ?, ?, NULL, ?)
     ON CONFLICT (ronda, votante) DO UPDATE SET valor = excluded.valor, cambiado = ?`,
  )
    .bind(ronda.id, c.votante, valor, hora, c.celular ? 1 : 0, hora)
    .run();

  return new Response(JSON.stringify(await resumenDeRonda(env, ronda.id)), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
};

export const onRequest: PagesFunction<Env> = async () => metodoNoPermitido("POST");
