import type { Metadata } from "next";
import { ContextoViento } from "@/components/secciones/Contexto";

export const metadata: Metadata = { title: "El mundo y la Argentina: Viento", description: "Si el contexto externo soplaba a favor o en contra en cada mandato: precios de exportación, tasa de EE.UU., Brasil y China." };
export default function Pagina() {
  return <ContextoViento />;
}
