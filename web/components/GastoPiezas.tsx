"use client";
// Piezas que comparten las dos vistas de /gasto/ (año completo y "Cómo viene el año"): migas, opciones de la hoja de ajustes,
// encabezado de la lista y el enlace con flecha. Remodelación 3.5 (docs/specs/remodelacion-herramientas.md, G).
import Link from "next/link";
import type { ReactNode } from "react";
import { IconoDerecha } from "./Iconos";
import { InfoPunto } from "./sistema/InfoPunto";

/** Migas en una línea que se desliza de costado (la página no se mueve). El último nivel es el que está abierto. */
export function Migas({ raiz, ruta, onIr }: { raiz: string; ruta: string[]; onIr: (r: string[]) => void }) {
  if (!ruta.length) return null;
  return (
    <nav className="gas-camino" aria-label="Niveles abiertos">
      <button type="button" onClick={() => onIr([])}>{raiz}</button>
      {ruta.map((n, i) => (
        <span key={i} className="gas-camino-paso">
          <span aria-hidden="true">›</span>
          {i < ruta.length - 1 ? <button type="button" onClick={() => onIr(ruta.slice(0, i + 1))}>{n}</button> : <span className="gas-camino-actual" aria-current="page">{n}</span>}
        </span>
      ))}
    </nav>
  );
}

/** Lista de botones de una elección (en la hoja de ajustes): se parten en renglones, ninguno queda cortado. */
export function Opciones({ etiqueta, valor, opciones, onElegir }: { etiqueta: string; valor: string; opciones: [string, string][]; onElegir: (v: string) => void }) {
  return (
    <div className="gas-opc" role="group" aria-label={etiqueta}>
      {opciones.map(([v, t]) => <button key={v} type="button" aria-pressed={v === valor} onClick={() => onElegir(v)}>{t}</button>)}
    </div>
  );
}

/** Un grupo de la hoja de ajustes: rótulo y sus opciones. */
export function GrupoAjuste({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return <div className="gas-ajuste"><p className="gas-ajuste-rotulo">{rotulo}</p>{children}</div>;
}

/** Encabezado de la lista: nivel (con su ⓘ) a la izquierda y qué dice cada fila a la derecha. */
export function CabLista({ nivel, derecha, info }: { nivel: string; derecha: string; info?: ReactNode }) {
  return (
    <div className="gas-lcab">
      <span className="gas-lcab-n">{nivel}{info ? <InfoPunto etiqueta="Cómo leer esta lista">{info}</InfoPunto> : null}</span>
      <span className="gas-lcab-d">{derecha}</span>
    </div>
  );
}

/** Link como una línea con flecha, de 44 px. */
export function EnlaceFlecha({ href, children }: { href: string; children: ReactNode }) {
  return <Link prefetch={false} href={href} className="gas-enlace"><span>{children}</span><IconoDerecha /></Link>;
}
