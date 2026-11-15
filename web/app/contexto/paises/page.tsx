import type { Metadata } from "next";
import { ContextoPaises } from "@/components/secciones/Contexto";

export const metadata: Metadata = { title: "El mundo y la Argentina: Otros países", description: "La Argentina contra otros países en crecimiento, inflación, desempleo y más, promedio por presidente (datos anuales del FMI)." };
export default function Pagina() {
  return <ContextoPaises />;
}
