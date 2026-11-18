// RIGI (/rigi/): proyectos aprobados del Régimen de Incentivo para Grandes Inversiones. Sin imagen propia en esta tanda: usa la del sitio.
import type { Metadata } from "next";
import { RigiPagina } from "@/components/secciones/Rigi";
import { IMAGEN_SITIO, NOMBRE_SITIO, SITIO_URL, metaCompartir } from "@/lib/previas";

const TITULO = "RIGI: grandes inversiones aprobadas y en evaluación";
const DESCRIPCION = "Los proyectos aprobados y en evaluación del Régimen de Incentivo para Grandes Inversiones: cuánto prevén invertir, por sector y por proyecto, y lo que informó el Banco Central que ingresó.";

export function generateMetadata(): Metadata {
  const url = `${SITIO_URL}/rigi/`;
  return {
    title: TITULO, description: DESCRIPCION, alternates: { canonical: url },
    ...metaCompartir({ url, imagen: `${SITIO_URL}${IMAGEN_SITIO}`, alt: NOMBRE_SITIO, titulo: TITULO, descripcion: DESCRIPCION }),
  };
}

export default function Pagina() {
  return <RigiPagina />;
}
