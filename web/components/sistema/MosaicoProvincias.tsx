"use client";
// Mapa de mosaico de las 24 provincias: un cuadrado por jurisdicción, todos del mismo tamaño y ubicados más o menos como en el mapa.
// Se colorea por el puesto del valor en cinco tramos de un solo tono (recibir más no es mejor ni peor: sin verde ni rojo). Cada cuadrado es un botón.
// Recibe lo ya calculado y escrito; no hace cuentas más que ordenar para armar los tramos.
import { useMemo, type CSSProperties } from "react";

export type CeldaMosaico = {
  /** Código de INDEC de la jurisdicción ("02", "6", "94"…). */
  id: string; nombre: string; valor: number | null;
  /** El valor completo, como se lee en la lista (va en el aria-label y en la leyenda). */
  texto: string;
  /** El valor corto para el cuadrado ("1,2 M"); si falta, se usa `texto`. */
  corto?: string;
};

/** Ubicación fija (columna, fila, desde 0) y abreviatura de cada jurisdicción, por código de INDEC. */
const LUGAR: Record<number, { c: number; f: number; abr: string }> = {
  38: { c: 1, f: 0, abr: "JUJ" }, 66: { c: 2, f: 0, abr: "SAL" }, 34: { c: 3, f: 0, abr: "FOR" }, 54: { c: 4, f: 0, abr: "MIS" },
  10: { c: 1, f: 1, abr: "CAT" }, 90: { c: 2, f: 1, abr: "TUC" }, 22: { c: 3, f: 1, abr: "CHA" }, 18: { c: 4, f: 1, abr: "COR" },
  70: { c: 0, f: 2, abr: "SJU" }, 46: { c: 1, f: 2, abr: "LRI" }, 86: { c: 2, f: 2, abr: "SDE" }, 82: { c: 3, f: 2, abr: "SFE" }, 30: { c: 4, f: 2, abr: "ERI" },
  50: { c: 0, f: 3, abr: "MZA" }, 74: { c: 1, f: 3, abr: "SLU" }, 14: { c: 2, f: 3, abr: "CBA" }, 6: { c: 3, f: 3, abr: "BUE" }, 2: { c: 4, f: 3, abr: "CABA" },
  58: { c: 0, f: 4, abr: "NQN" }, 62: { c: 1, f: 4, abr: "RNE" }, 42: { c: 2, f: 4, abr: "LPA" },
  26: { c: 1, f: 5, abr: "CHU" }, 78: { c: 1, f: 6, abr: "SCR" }, 94: { c: 2, f: 7, abr: "TDF" },
};
const TRAMOS = 5;

export function MosaicoProvincias({ celdas, resaltar, onElegir, etiqueta }: {
  celdas: CeldaMosaico[]; resaltar?: string | null; onElegir: (id: string) => void; etiqueta: string;
}) {
  const { puestas, tramo, menor, mayor } = useMemo(() => {
    const puestas = celdas.filter((c) => LUGAR[Number(c.id)]).sort((a, b) => LUGAR[Number(a.id)].f - LUGAR[Number(b.id)].f || LUGAR[Number(a.id)].c - LUGAR[Number(b.id)].c);
    const con = puestas.filter((c) => c.valor != null).sort((a, b) => (b.valor as number) - (a.valor as number));
    const tramo = new Map<string, number>();
    con.forEach((c, i) => tramo.set(c.id, TRAMOS - Math.floor((i * TRAMOS) / con.length)));   // 5 = el tramo de los valores más altos
    return { puestas, tramo, mayor: con[0] ?? null, menor: con[con.length - 1] ?? null };
  }, [celdas]);
  const norm = (id: string) => String(Number(id));
  return (
    <div className="mosaico">
      <div className="mosaico-grilla" role="group" aria-label={etiqueta}>
        {puestas.map((c) => {
          const l = LUGAR[Number(c.id)], t = tramo.get(c.id) ?? 0;
          const estilo = { gridColumn: l.c + 1, gridRow: l.f + 1 } as CSSProperties;
          return (
            <button key={c.id} type="button" className={`mosaico-celda${norm(c.id) === (resaltar ? norm(resaltar) : "") ? " mosaico-res" : ""}`} data-tramo={t || undefined} style={estilo}
              aria-label={`${c.nombre}: ${c.valor == null ? "sin dato" : c.texto}`} aria-pressed={resaltar != null && norm(c.id) === norm(resaltar)} onClick={() => onElegir(c.id)}>
              <span className="mosaico-abr" aria-hidden="true">{l.abr}</span>
              <span className="mosaico-val" aria-hidden="true">{c.valor == null ? "sin dato" : c.corto ?? c.texto}</span>
            </button>
          );
        })}
      </div>
      {mayor && menor && (
        <div className="mosaico-leyenda" aria-hidden="true">
          <span className="mosaico-extremo">{menor.texto}</span>
          <span className="mosaico-escala">{[1, 2, 3, 4, 5].map((t) => <i key={t} data-tramo={t} />)}</span>
          <span className="mosaico-extremo">{mayor.texto}</span>
        </div>
      )}
      {mayor && menor && <p className="mosaico-nota">Más intenso, más alto. Cinco tramos según el puesto en el ranking, con casi la misma cantidad de provincias en cada uno.</p>}
    </div>
  );
}
