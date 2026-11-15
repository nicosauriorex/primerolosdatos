"use client";
// Presidentes × datos clave: una tabla de posiciones. Cada celda es el cambio principal de ese dato en ese mandato y lleva a la ficha del dato.
// Ver docs/specs/remodelacion-historico-presidentes.md (P3). Los cálculos están en `lib/presidentes.ts`.
import { useRef, type CSSProperties } from "react";
import Link from "next/link";
import { useDeslizable } from "@/components/Movimiento";
import type { Grilla } from "@/lib/presidentes";

/** Fondo del mapa de calor de una celda: verde (mejoró) o rojo (empeoró), más intenso cuanto más lejos de la referencia entre los presidentes. Mismo cálculo que `CeldaMapa` de Meses de mandato. */
export const fondoCalor = (tono: "bueno" | "malo" | null, calor?: number): string | undefined =>
  tono ? `color-mix(in srgb, var(${tono === "bueno" ? "--bueno" : "--malo"}) ${Math.round(10 + 50 * (calor ?? 0))}%, transparent)` : undefined;

export function GrillaPresidentes({ grilla, etiqueta = "Presidentes y datos clave", calor = true }: { grilla: Grilla; etiqueta?: string; calor?: boolean }) {
  const caja = useRef<HTMLDivElement>(null);
  useDeslizable(caja, false, grilla.columnas.length + grilla.filas.length);
  if (!grilla.filas.length || !grilla.columnas.length) return <p className="note">No hay datos para armar la grilla.</p>;
  // Una nota por columna que empieza después del inicio del mandato más viejo que tiene datos ("Desocupación: datos desde 2003")
  const notas = grilla.columnas.flatMap((col, j) => {
    const anios = grilla.filas.map((f) => f.celdas[j].desde).filter((a): a is string => !!a);
    return anios.length ? [`${col.nombre}: datos desde ${anios.reduce((a, b) => (a < b ? a : b))}`] : [];
  });
  return (
    <div className={`gp ${calor ? "gp-con-calor" : "gp-sin-calor"}`}>
      {/* El marco dibuja una sombra en el borde derecho mientras haya más columnas (`data-mas` lo marca `useDeslizable`); al llegar al final desaparece */}
      <div className="gp-marco">
      <div ref={caja} className="gp-desliza">
        <table className="gp-tabla">
          <caption className="gp-cap">{etiqueta}: cómo cambió cada dato en cada mandato</caption>
          <thead>
            <tr>
              <th scope="col" className="gp-th-pres">Presidente</th>
              {grilla.columnas.map((c) => (
                <th key={c.slug} scope="col" className="gp-th">
                  <span className="gp-dato">{c.nombre}</span>
                  <span className="gp-metrica">{c.metrica.toLowerCase()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grilla.filas.map((f) => (
              <tr key={f.pres.id} style={{ "--pc": `var(${f.pres.color})` } as CSSProperties}>
                <th scope="row" className="gp-th-fila">
                  <span className="gp-raya" aria-hidden="true" />
                  <span className="gp-quien">
                    <span className="gp-nombre">{f.pres.corto}</span>
                    <span className="gp-periodo">{f.periodo}</span>
                  </span>
                </th>
                {f.celdas.map((ce, j) => {
                  const col = grilla.columnas[j];
                  if (!ce.href) return <td key={col.slug} className="gp-celda gp-vacia"><span aria-label={`${col.nombre} con ${f.pres.n}: sin datos`}>—</span></td>;
                  return (
                    <td key={col.slug} className={`gp-celda${ce.tono ? ` gp-${ce.tono}` : ""}`} style={calor ? { background: fondoCalor(ce.tono, ce.calor) } : undefined}>
                      <Link prefetch={false} href={ce.href} className="gp-link" aria-label={`${col.nombre} con ${f.pres.n}: ${ce.texto}`}>
                        {ce.texto}{ce.desde ? <span className="gp-desde" aria-hidden="true">*</span> : null}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      {notas.length > 0 && <p className="gp-notas">* {notas.join(" · ")}</p>}
      <p className="gp-leyenda">Verde = mejoró y rojo = empeoró en el mandato; el signo también está escrito.{calor ? " Más intenso = más lejos entre los presidentes de esa columna." : ""} Inflación: verde si quedó por debajo de la mediana de los presidentes.</p>
    </div>
  );
}
