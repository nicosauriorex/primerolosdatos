// Ranking de presidentes: el orden de los presidentes en cada indicador y la frase-respuesta de la página.
// Funciones puras (sin React). Una sola fuente de verdad: la tabla "Indicador por indicador" y la frase usan el mismo orden.
import { nf0 } from "./formato";
import type { CritRk, Pres, TablaInd } from "./estadisticas";

export type DesRk = NonNullable<TablaInd["des"][number]>;
export interface PuestoPres { k: number; d: DesRk; score: number }
export interface OrdenIndicador { t: TablaInd; orden: PuestoPres[] }

/** Para cada indicador con datos de al menos dos presidentes, los presidentes del primero al último según el criterio. */
export function ordenPorIndicador(tablas: TablaInd[], crit: CritRk): OrdenIndicador[] {
  return tablas.map((t) => {
    const orden = t.des.map((d, k) => (d && d.puesto ? { k, d, score: crit === "ambos" ? (d.puesto.mejora[2] + d.puesto.nivel[2]) / 2 : d.puesto[crit][2] } : null))
      .filter((x): x is PuestoPres => !!x).sort((a, c) => c.score - a.score);
    return { t, orden };
  }).filter((f) => f.orden.length >= 2);
}

const CRIT_ROT: Record<CritRk, string> = { mejora: "Mejora", nivel: "Nivel promedio", ambos: "Mejora y nivel promedio" };
export interface FraseRanking { titulo: string; cifra: string; unidad: string; fecha: string; frase: string }

/** "Con los <n> indicadores elegidos, el que más mejoró fue <X>, en <k> de <n>": cuenta en cuántos indicadores quedó primero cada presidente.
 *  `elegidos` = indicadores pedidos; si algunos no tienen datos de dos presidentes, la frase lo dice. Con empate, nombra a todos los que empatan. */
export function fraseRanking(tablas: TablaInd[], PRES: Pres[], crit: CritRk, elegidos: number): FraseRanking | null {
  const filas = ordenPorIndicador(tablas, crit);
  const n = filas.length;
  if (!n) return null;
  const primeros = new Map<number, number>();
  filas.forEach((f) => primeros.set(f.orden[0].k, (primeros.get(f.orden[0].k) ?? 0) + 1));
  const tope = Math.max(...primeros.values());
  const lideres = [...primeros.entries()].filter(([, c]) => c === tope).map(([k]) => PRES[k].corto ?? PRES[k].n).sort();
  const nombres = lideres.length === 1 ? lideres[0] : lideres.slice(0, -1).join(", ") + " y " + lideres[lideres.length - 1];
  const sobre = n === 1 ? "el indicador elegido" : `los ${nf0.format(n)} indicadores elegidos`;
  const resto = n < elegidos ? " que tienen datos de al menos dos presidentes" : "";
  const cuenta = `${nf0.format(tope)} de ${nf0.format(n)}`;
  const quien = crit === "mejora" ? "el que más mejoró" : crit === "nivel" ? "el que quedó primero por nivel promedio" : "el que quedó primero por mejora y nivel promedio";
  const frase = lideres.length === 1
    ? `Con ${sobre}${resto}, ${quien} fue ${nombres}, primero en ${cuenta}.`
    : `Con ${sobre}${resto}, hubo un empate en ${quien}: ${nombres}, primeros en ${cuenta} cada uno.`;
  return { titulo: `Primero en más indicadores: ${nombres}`, cifra: cuenta, unidad: "indicadores en primer lugar", fecha: CRIT_ROT[crit], frase };
}
