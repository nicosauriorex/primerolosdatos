"use client";
// Navegación del celular (menos de 768 px): Inicio · Histórico · Presidentes · El mundo · Más.
// `ITEMS_MENU` es la única lista del menú principal: la barra de arriba (computadora) y esta usan los mismos nombres, íconos y orden (R9 de la tanda 8).
import Link from "next/link";
import type { ReactNode } from "react";
import { IconoHistorico, IconoInicio, IconoMas, IconoMundo, IconoPresidentes } from "./iconos";

export type IdMenu = "inicio" | "historico" | "presidentes" | "mundo" | "mas";
/** `href` ausente = botón que abre una capa (Más). Buscar ya no está acá: es la lupa de la barra de arriba. */
export const ITEMS_MENU: { id: IdMenu; texto: string; href?: string; icono: (p: { className?: string }) => ReactNode }[] = [
  { id: "inicio", texto: "Inicio", href: "/", icono: IconoInicio },
  { id: "historico", texto: "Histórico", href: "/historico/", icono: IconoHistorico },
  { id: "presidentes", texto: "Presidentes", href: "/presidentes/", icono: IconoPresidentes },
  { id: "mundo", texto: "El mundo", href: "/contexto/", icono: IconoMundo },
  { id: "mas", texto: "Más", icono: IconoMas },
];

export function BarraInferior({ actual, onMas, fijo = true }: { actual: string; onMas: () => void; fijo?: boolean }) {
  return (
    <nav className={`navinf${fijo ? " navinf-fijo" : ""}`} aria-label="Secciones principales">
      <ul>
        {ITEMS_MENU.map((it) => {
          const Ico = it.icono;
          const icono = <Ico className="navinf-ico" />;
          if (it.href) {
            const activo = it.id === "inicio" ? actual === "" || actual === "inicio" || actual === "/" : actual === it.id;
            return <li key={it.id}><Link prefetch={false} href={it.href} className="navinf-item" aria-current={activo ? "page" : undefined}>{icono}<span>{it.texto}</span></Link></li>;
          }
          return <li key={it.id}><button type="button" className="navinf-item" aria-haspopup="dialog" onClick={onMas}>{icono}<span>{it.texto}</span></button></li>;
        })}
      </ul>
    </nav>
  );
}
