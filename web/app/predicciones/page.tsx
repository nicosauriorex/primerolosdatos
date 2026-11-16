// Predicciones (/predicciones/): cuánto cree la gente que va a dar la inflación del mes, contra el REM y el dato real. El contenido cambia con cada ronda
// (lo arma el pipeline): el título y la descripción son fijos y la imagen para las redes, la del sitio.
import type { Metadata } from "next";
import { Predicciones } from "@/components/secciones/Predicciones";
import { IMAGEN_SITIO, NOMBRE_SITIO, SITIO_URL, metaCompartir } from "@/lib/previas";

const TITULO = "Predicciones de inflación";
const DESCRIPCION = "Decí cuánto creés que va a dar la inflación del mes y compará con lo que espera la gente, lo que esperan los analistas del REM y el dato real del INDEC.";

export function generateMetadata(): Metadata {
  const url = `${SITIO_URL}/predicciones/`;
  return { title: TITULO, description: DESCRIPCION, alternates: { canonical: url }, ...metaCompartir({ url, imagen: `${SITIO_URL}${IMAGEN_SITIO}`, alt: NOMBRE_SITIO, titulo: TITULO, descripcion: DESCRIPCION }) };
}

export default function Pagina() {
  return <Predicciones />;
}
