// Novedades y calendario (/novedades/): lo que salió en los últimos días y cuándo sale lo próximo. El contenido cambia todos los días (lo arma el pipeline):
// el título y la descripción son fijos y la imagen para las redes, la del sitio.
import type { Metadata } from "next";
import { Novedades } from "@/components/secciones/Novedades";
import { IMAGEN_SITIO, NOMBRE_SITIO, SITIO_URL, metaCompartir } from "@/lib/previas";

const TITULO = "Novedades y calendario";
const DESCRIPCION = "Qué datos oficiales salieron en los últimos días, con su cifra y cuánto cambió, y cuándo sale el próximo. Fuentes oficiales.";

export function generateMetadata(): Metadata {
  const url = `${SITIO_URL}/novedades/`;
  return { title: TITULO, description: DESCRIPCION, alternates: { canonical: url }, ...metaCompartir({ url, imagen: `${SITIO_URL}${IMAGEN_SITIO}`, alt: NOMBRE_SITIO, titulo: TITULO, descripcion: DESCRIPCION }) };
}

export default function Pagina() {
  return <Novedades />;
}
