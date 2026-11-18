// Tarifas y subsidios (/tarifas/): quién paga la energía, facturas en AMBA, Córdoba y Santa Fe y tipos de subsidio. Sin imagen propia: usa la del sitio.
import type { Metadata } from "next";
import { TarifasPagina } from "@/components/secciones/Tarifas";
import { IMAGEN_SITIO, NOMBRE_SITIO, SITIO_URL, metaCompartir } from "@/lib/previas";

const TITULO = "Tarifas y subsidios: quién paga la energía";
const DESCRIPCION = "Cuánto se paga de luz, gas y agua en el AMBA, Córdoba y Santa Fe, con y sin subsidio, qué parte del costo pagan los usuarios y qué subsidios hay.";

export function generateMetadata(): Metadata {
  const url = `${SITIO_URL}/tarifas/`;
  return {
    title: TITULO, description: DESCRIPCION, alternates: { canonical: url },
    ...metaCompartir({ url, imagen: `${SITIO_URL}${IMAGEN_SITIO}`, alt: NOMBRE_SITIO, titulo: TITULO, descripcion: DESCRIPCION }),
  };
}

export default function Pagina() {
  return <TarifasPagina />;
}
