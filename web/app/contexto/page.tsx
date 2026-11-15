import type { Metadata } from "next";
import { ContextoPrecios } from "@/components/secciones/Contexto";

export const metadata: Metadata = { title: "El mundo y la Argentina: Precios", description: "Cuánto cuestan los precios de la Argentina contra los del mundo, por rubro, por región y por presidente." };
export default function Pagina() {
  return <ContextoPrecios />;
}
