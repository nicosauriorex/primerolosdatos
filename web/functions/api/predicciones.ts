import { MIN_PARA_MEDIANA, metodoNoPermitido, respuesta, resumenDeRonda, type Env } from "../_comun";

const RONDA = /^[a-z0-9_]+-\d{4}-\d{2}$/;

function json(cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" },
  });
}

// Público: origen libre, solo lectura, sin Turnstile.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return respuesta(503, "Base sin configurar");
  const ronda = new URL(request.url).searchParams.get("ronda");
  if (ronda === null) {
    const { results } = await env.DB.prepare(
      "SELECT ronda, COUNT(*) AS n FROM predicciones GROUP BY ronda ORDER BY ronda DESC",
    ).all<{ ronda: string; n: number }>();
    const lista = [];
    for (const f of results) {
      if (f.n < MIN_PARA_MEDIANA) {
        lista.push({ ronda: f.ronda, n: f.n });
      } else {
        const r = await resumenDeRonda(env, f.ronda);
        lista.push({ ronda: f.ronda, n: f.n, mediana: r.mediana });
      }
    }
    return json(lista);
  }
  if (!RONDA.test(ronda)) return respuesta(400, "ronda inválida");
  return json(await resumenDeRonda(env, ronda));
};

export const onRequest: PagesFunction<Env> = async () => metodoNoPermitido("GET");
