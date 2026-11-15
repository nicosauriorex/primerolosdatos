// Íconos del sistema (D-023): mismo estilo que `components/Iconos.tsx` (20 × 20, trazo de 2 px, sin relleno, heredan el color).
// Sube y Baja son flechas ↑/↓ (Delta las dibuja con un trazo más grueso, ver `.delta-marca` en globals.css).
import type { ReactNode } from "react";

function Icono({ children, className = "", relleno = false }: { children: ReactNode; className?: string; relleno?: boolean }) {
  return (
    <svg className={`icono ${className}`.trim()} viewBox="0 0 20 20" width="20" height="20"
      fill={relleno ? "currentColor" : "none"} stroke={relleno ? "none" : "currentColor"} strokeWidth="2"
      strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">{children}</svg>
  );
}
type P = { className?: string };

export const IconoInicio = ({ className }: P) => <Icono className={className}><path d="M3 9.5 10 3l7 6.5M5 8.5V17h10V8.5M8.5 17v-5h3v5" /></Icono>;
export const IconoBuscar = ({ className }: P) => <Icono className={className}><circle cx="8.5" cy="8.5" r="5.5" /><path d="m12.5 12.5 4.5 4.5" /></Icono>;
export const IconoHistorico = ({ className }: P) => <Icono className={className}><path d="M3 15l4-5 3 3 7-8" /></Icono>;
export const IconoPresidentes = ({ className }: P) => <Icono className={className}><path d="M2 17h16M5 17v-6h3v6M8.5 17V4h3v13M12 17V9h3v8" /></Icono>;
export const IconoMundo = ({ className }: P) => <Icono className={className}><circle cx="10" cy="10" r="7.5" /><path d="M2.5 10h15M10 2.5c-3 3-3 12 0 15M10 2.5c3 3 3 12 0 15" /></Icono>;
export const IconoMas = ({ className }: P) => <Icono className={className}><path d="M3 5h14M3 10h14M3 15h14" /></Icono>;
export const IconoInfo = ({ className }: P) => <Icono className={className}><circle cx="10" cy="10" r="8" /><path d="M10 9v5.5M10 5.8v.2" /></Icono>;
export const IconoSube = ({ className }: P) => <Icono className={className}><path d="M10 17V4M4.5 9.5 10 4l5.5 5.5" /></Icono>;
export const IconoBaja = ({ className }: P) => <Icono className={className}><path d="M10 3v13M4.5 10.5 10 16l5.5-5.5" /></Icono>;
export const IconoChevronAbajo = ({ className }: P) => <Icono className={className}><path d="m4 8 6 6 6-6" /></Icono>;
export const IconoIgual = ({ className }: P) => <Icono className={className}><path d="M3 10h14" /></Icono>;
export const IconoCopiar = ({ className }: P) => <Icono className={className}><path d="M7 7h10v10H7zM13 7V3H3v10h4" /></Icono>;
export const IconoImagen = ({ className }: P) => <Icono className={className}><path d="M3 4h14v12H3zM3 14l4-4 3 3 3-3 4 4" /><path d="M13.5 7.5v.01" /></Icono>;
export const IconoTexto = ({ className }: P) => <Icono className={className}><path d="M3 5h14M3 10h14M3 15h9" /></Icono>;
export const IconoCerrar = ({ className }: P) => <Icono className={className}><path d="M5 5l10 10M15 5 5 15" /></Icono>;
// Tanda 8: íconos que usan varias partes (expandir, estrella de "Mis variables", alerta, repetir).
export const IconoExpandir = ({ className }: P) => <Icono className={className}><path d="M12 3h5v5M8 17H3v-5M17 3l-5.5 5.5M3 17l5.5-5.5" /></Icono>;
export const IconoEstrella = ({ className, llena = false }: P & { llena?: boolean }) => (
  <Icono className={className} relleno={llena}><path d="M10 2.5l2.3 4.9 5.2.7-3.8 3.7.9 5.2L10 14.4l-4.6 2.6.9-5.2L2.5 8.1l5.2-.7z" /></Icono>
);
export const IconoAlerta = ({ className }: P) => <Icono className={className}><path d="M10 3 18 17H2zM10 8v4.5M10 14.6v.01" /></Icono>;
export const IconoRepetir = ({ className }: P) => <Icono className={className}><path d="M16 10a6 6 0 1 1-2-4.5M16 3v4h-4" /></Icono>;
export const IconoTilde = ({ className }: P) => <Icono className={className}><path d="m4 10.5 4 4 8-9" /></Icono>;
