import type { Metadata } from "next";
import { ContextoEsperado } from "@/components/secciones/Contexto";

export const metadata: Metadata = { title: "El mundo y la Argentina: Lo esperado", description: "Lo que el FMI proyectaba cada abril contra lo que terminó pasando, para la Argentina y otros países, por presidente." };
export default function Pagina() {
  return <ContextoEsperado />;
}
