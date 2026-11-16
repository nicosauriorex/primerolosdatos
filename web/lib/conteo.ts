// Conteo de los compartir (docs/specs/contar-compartir.md). Anota en segundo plano cada acción de compartir que salió bien y avisa a la tira
// «¿Por qué lo compartís?». Nunca lanza ni escribe en la consola: si el servicio falla, compartir funciona igual.
import { leer } from "./config";

export type AccionCompartir = "imagen_compartida" | "imagen_descargada" | "imagen_copiada" | "link_compartido" | "link_copiado" | "texto" | "tabla";
export type Porque = "bueno" | "malo" | "mejoro" | "empeoro" | "curiosidad" | "otro";
/** Evento de `window` que avisa que se compartió algo; `detail` es `{ id }`. */
export const EVENTO_COMPARTIDO = "pld:compartido";

const RUTA_COMPARTIR = "/api/compartir";
const RUTA_PORQUE = "/api/compartir/porque";

/** Solo se manda desde el sitio publicado, sus vistas previas y `wrangler pages dev` (puerto 8788). */
function mandaAlServidor(): boolean {
  const { hostname, port } = window.location;
  return hostname === "primerolosdatos.com.ar" || hostname.endsWith(".duelo-de-datos.pages.dev") || (hostname === "localhost" && port === "8788");
}

function enviar(ruta: string, cuerpo: unknown): void {
  try {
    void fetch(ruta, { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) }).catch(() => {});
  } catch { /* sin red o bloqueado: no pasa nada */ }
}

/** Query de un link (con o sin `?`), sin el `?`. Si no es un link válido, cae a vacío. */
function consultaDe(href: string): string {
  try { return new URL(href, window.location.href).search.replace(/^\?/, ""); } catch { return ""; }
}

export function contarCompartir(e: { accion: AccionCompartir; dato?: string; formato?: string; href?: string }): void {
  try {
    const id = crypto.randomUUID();
    if (mandaAlServidor()) {
      const vista = (e.href ? consultaDe(e.href) : window.location.search.replace(/^\?/, "")) || undefined;
      enviar(RUTA_COMPARTIR, {
        // Recortados a los topes del servidor (120 / 500 / 80): una vista muy larga se guarda cortada en vez de perderse.
        id, accion: e.accion, ruta: window.location.pathname.slice(0, 120), vista: vista?.slice(0, 500), dato: e.dato?.slice(0, 80) || undefined,
        formato: e.formato || undefined,
        celular: window.innerWidth < 768,
      });
    }
    let pregunta = false;
    try { pregunta = leer().config.preguntarPorque; } catch { /* sin configuración: no pregunta */ }
    if (pregunta) window.dispatchEvent(new CustomEvent(EVENTO_COMPARTIDO, { detail: { id } }));
  } catch { /* nunca molesta a quien comparte */ }
}

export function contarPorque(id: string, porque: Porque): void {
  try {
    if (mandaAlServidor()) enviar(RUTA_PORQUE, { id, porque });
  } catch { /* igual que arriba */ }
}
