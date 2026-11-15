// Íconos de los temas y de las secciones de la portada (tanda 8, B3): mismo estilo que `components/Iconos.tsx`
// (20 × 20, trazo de 2 px, sin relleno, heredan el color). Se dibujan chicos o grandes con CSS (`.icono { width; height }`).
import type { ReactNode } from "react";
import { IconoHistorico, IconoPresidentes } from "./iconos";

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg className="icono" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"
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
  mandato: <><path d="M3 3v14h14" /><path d="M3 15l5-6 3 3 6-7M3 15l5-1 4-5 5 1" /></>,
  herencia: <><path d="M3 9h14v8H3zM2 6h16v3H2zM10 6v11" /><path d="M10 6C8 3 5 3.5 6 5.5M10 6c2-3 5-2.5 4-.5" /></>,
  ranking: <><path d="M2 17.5h16M7 17V8h6v9M2 17v-4h5M13 17v-6h5v6" /></>,
  elecciones: <><path d="M3 10h14v7H3zM8 13.5h4M6.5 7.5V3h7v4.5" /></>,
  congreso: <><path d="M2 17.5h16M4 17v-6h12v6M6 11V8h8v3M10 8V4" /></>,
  contexto: <><circle cx="10" cy="10" r="8" /><path d="M2 10h16M10 2c-3 3-3 13 0 16M10 2c3 3 3 13 0 16" /></>,
  gasto: <><circle cx="10" cy="10" r="7.5" /><path d="M10 2.5V10l5.3 5.3" /></>,
  provincias: <><path d="M10 18s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z" /><circle cx="10" cy="8" r="2" /></>,
  universidades: <><path d="M1 8l9-4 9 4-9 4z" /><path d="M5 10v4c2 2 8 2 10 0v-4M18 8v5" /></>,
  semaforo: <><rect x="6" y="2" width="8" height="16" /><circle cx="10" cy="6" r="1.2" /><circle cx="10" cy="10" r="1.2" /><circle cx="10" cy="14" r="1.2" /></>,
  bcra: <><circle cx="10" cy="10" r="8" /><path d="M10 5v5l3.5 2" /></>,
  plantillas: <><path d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" /></>,
  fuentes: <><path d="M5 2h7l4 4v12H5zM12 2v4h4M8 10h5M8 14h5" /></>,
};

/** Ícono del tema `slug`. */
export const IconoTema = ({ slug }: { slug: string }) => <Icono>{TEMAS_ICONO[slug] ?? TEMAS_ICONO.fiscal}</Icono>;

/** Ícono de la sección `carpeta` (Por presidente e Histórico usan los mismos del menú). */
export function IconoSeccion({ carpeta }: { carpeta: string }) {
  if (carpeta === "presidentes") return <IconoPresidentes />;
  if (carpeta === "historico") return <IconoHistorico />;
  return <Icono>{SECCIONES_ICONO[carpeta] ?? SECCIONES_ICONO.fuentes}</Icono>;
}
