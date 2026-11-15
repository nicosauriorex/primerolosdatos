// Íconos de los temas y de las secciones de la portada (tanda 8, B3): mismo estilo que `components/Iconos.tsx`
// (20 × 20, trazo de 2 px, sin relleno, heredan el color). Se dibujan chicos o grandes con CSS (`.icono { width; height }`).
import type { ReactNode } from "react";

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg className="icono icono-fino" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">{children}</svg>
  );
}

/** Ícono de cada tema, por su `slug` (web/lib/temas.ts). */
const TEMAS_ICONO: Record<string, ReactNode> = {
  // precios: etiqueta de precio
  precios: <><path d="M3 3h7l7 7-7 7-7-7z" /><circle cx="6.8" cy="6.8" r="1" /></>,
  // salarios: billete
  salarios: <><rect x="2" y="5" width="16" height="10" /><circle cx="10" cy="10" r="2.5" /><path d="M5 10h.01M15 10h.01" /></>,
  // dólar: signo de dólar
  dolar: <><circle cx="10" cy="10" r="8" /><path d="M12.5 7.5C12 6.6 11.1 6.2 10 6.2c-1.4 0-2.4.7-2.4 1.8s1 1.6 2.4 2c1.4.4 2.4.9 2.4 2s-1 1.8-2.4 1.8c-1.1 0-2-.4-2.5-1.3M10 4v2.2M10 13.8V16" /></>,
  // actividad: fábrica
  actividad: <><path d="M2 17V9l5 3V9l5 3V4h4v13z" /><path d="M5 15h2M9 15h2M13 15h1" /></>,
  // empleo y pobreza: personas
  empleo: <><circle cx="7" cy="6" r="2.5" /><path d="M2 17v-2a3.5 3.5 0 0 1 3.5-3.5h3A3.5 3.5 0 0 1 12 15v2" /><circle cx="14" cy="7" r="2" /><path d="M14.5 11.3A3 3 0 0 1 18 14.2V17" /></>,
  // comercio exterior: barco
  externo: <><path d="M2 12h16l-3 5H5z" /><path d="M10 3v9M10 4l5 6h-5" /></>,
  // cuentas públicas: edificio público
  fiscal: <><path d="M10 2.5 2.5 7h15z" /><path d="M4.5 9.5v5.5M8 9.5v5.5M12 9.5v5.5M15.5 9.5v5.5M2.5 17.5h15" /></>,
  // dinero, tasas y mercados: velas
  finanzas: <><path d="M5 3v14M3 7h4v6H3zM14 4v13M12 8h4v5h-4z" /></>,
  // opinión pública: globo de diálogo
  opinion: <><path d="M3 4h14v10H9l-4 3v-3H3z" /></>,
};

/** Ícono de cada sección, por su carpeta (web/lib/secciones.ts). */
const SECCIONES_ICONO: Record<string, ReactNode> = {
  mandato: <><path d="M3 4.5h14v12.5H3zM3 8.5h14M6.5 2v4M13.5 2v4M6 12h.01M10 12h.01M14 12h.01" /></>,
  herencia: <><path d="M3 9h14v8H3zM2 6h16v3H2zM10 6v11" /><path d="M10 6C8 3 5 3.5 6 5.5M10 6c2-3 5-2.5 4-.5" /></>,
  ranking: <><path d="M2 17.5h16M7 17V8h6v9M2 17v-4h5M13 17v-6h5v6" /></>,
  elecciones: <><path d="M3 10h14v7H3zM8 13.5h4M6.5 7.5V3h7v4.5" /></>,
  congreso: <><path d="M2 17.5h16M3 10.5h14M5.5 10.5v7M10 10.5v7M14.5 10.5v7M6.5 10.5a3.5 3.5 0 0 1 7 0M10 7V4" /></>,
  contexto: <><circle cx="10" cy="10" r="8" /><path d="M2 10h16M10 2c-3 3-3 13 0 16M10 2c3 3 3 13 0 16" /></>,
  // subpestañas de "El mundo y la Argentina": precios = etiqueta de precio, otros países = globo, lo esperado = diana, viento = líneas de viento
  "contexto-precios": TEMAS_ICONO.precios,
  "contexto-paises": <><circle cx="10" cy="10" r="8" /><path d="M2 10h16M10 2c-3 3-3 13 0 16M10 2c3 3 3 13 0 16" /></>,
  "contexto-esperado": <><circle cx="10" cy="10" r="8" /><circle cx="10" cy="10" r="4.5" /><circle cx="10" cy="10" r="1" /></>,
  "contexto-viento": <><path d="M2 7h9.5a2.5 2.5 0 1 0-2.5-2.5M2 11.5h13a2.5 2.5 0 1 1-2.5 2.5M2 15.5h6" /></>,
  gasto: <><circle cx="10" cy="10" r="8" /><circle cx="10" cy="10" r="3.5" /><path d="M10 2v4.5M16.9 14l-3.9-2.25M3.1 14l3.9-2.25" /></>,
  provincias: <><path d="M10 18s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z" /><circle cx="10" cy="8" r="2" /></>,
  universidades: <><path d="M1 8l9-4 9 4-9 4z" /><path d="M5 10v4c2 2 8 2 10 0v-4M18 8v5" /></>,
  semaforo: <><rect x="5" y="1.5" width="10" height="17" /><circle cx="10" cy="5.8" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="10" cy="14.2" r="1.6" /></>,
  // mismo dibujo que `IconoBanco` (BloqueParte.tsx)
  bcra: <><path d="M2 8 10 3l8 5zM4 10v5M8 10v5M12 10v5M16 10v5M2 17.5h16" /></>,
  plantillas: <><path d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" /></>,
  fuentes: <><path d="M5 2h7l4 4v12H5zM12 2v4h4M8 10h5M8 14h5" /></>,
};

/** Ícono del tema `slug`. */
export const IconoTema = ({ slug }: { slug: string }) => <Icono>{TEMAS_ICONO[slug] ?? TEMAS_ICONO.fiscal}</Icono>;

// Por presidente: persona con la banda presidencial cruzada; Histórico: línea que sube y baja. Trazo fino como el resto (antes
// usaban los íconos del menú, de trazo 2, y en el mosaico se veían gruesos).
const PRESIDENTE_ICONO = <><circle cx="10" cy="5.5" r="3" /><path d="M3.5 18c0-4 2.9-6.5 6.5-6.5s6.5 2.5 6.5 6.5" /><path d="M6.5 12.6 13.5 18" /></>;
const HISTORICO_ICONO = <><path d="M2 15l4.5-5 3.5 3 6-7.5" /><path d="M13 5.5h3v3" /><path d="M2 18h16" /></>;

/** Ícono de la sección `carpeta`. */
export function IconoSeccion({ carpeta }: { carpeta: string }) {
  if (carpeta === "presidentes") return <Icono>{PRESIDENTE_ICONO}</Icono>;
  if (carpeta === "historico") return <Icono>{HISTORICO_ICONO}</Icono>;
  return <Icono>{SECCIONES_ICONO[carpeta] ?? SECCIONES_ICONO.fuentes}</Icono>;
}
