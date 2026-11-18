// Marcas de una serie: puntos sueltos de otra fuente (p. ej. los de la UCA sobre la pobreza de Di Tella) que el gráfico dibuja sin
// que sean parte de la serie. Solo se dibujan con la serie en valores tal cual y por mes; no entran en cálculos, medidas, tablas ni descargas.
import type { Fila, SerieG } from "@/components/Grafico";
import type { Calculo, MarcaSerie } from "./motor";

/** ¿El cálculo es la serie tal cual (sin variación, base 100, dólares, por habitante, contra otra serie ni promedio móvil)? Solo entonces valen las marcas. */
export const valorTalCual = (c: Calculo): boolean => !c.rel && c.unidad === c.serie.u && c.corto === c.serie.n;

/** Meses de las marcas que el gráfico tiene que alcanzar (`filasGrafico`, opción `incluir`): solo cuando las marcas se dibujan. */
export const mesesMarcas = (c: Calculo, freq = "M"): string[] =>
  c.serie.marcas && freq === "M" && valorTalCual(c) ? c.serie.marcas.map((mk) => mk.f) : [];

/** Nombre de quien aporta las marcas: «ODSA-UCA, …» → «UCA». */
export function origenMarcas(marcas: MarcaSerie[]): string {
  const f = marcas[0]?.fuente.split(",")[0].replace(/^ODSA-/, "").trim();
  return f || "Otra fuente";
}

/** Agrega a las filas los valores de las marcas (columnas `<key>_msim` y `<key>_mmed`, con su texto en `_t_…` y su etiqueta en `_e_…`) y devuelve las
 *  series de solo puntos que las dibujan: rojo (`--malo`) para las simulaciones y círculo hueco del color de la serie para las mediciones.
 *  Con otra frecuencia que la mensual, o sin la serie en valores tal cual, no hace nada. Las series devueltas llevan `marca: true`: las tablas las dejan afuera. */
export function marcasEnGrafico(c: Calculo, rows: Fila[], key: string, colorSerie: string, fmt: (v: number) => string, freq = "M"): SerieG[] {
  const marcas = c.serie.marcas;
  if (!marcas || freq !== "M" || !valorTalCual(c)) return [];
  const org = origenMarcas(marcas), nombre = `${org} (puntos sueltos)`;
  const out: SerieG[] = [];
  (["simulacion", "medicion"] as const).forEach((tipo) => {
    const k = key + (tipo === "simulacion" ? "_msim" : "_mmed");
    let hay = false;
    marcas.filter((mk) => mk.tipo === tipo).forEach((mk) => {
      const r = rows.find((x) => x.fecha === mk.f);
      if (!r) return;
      r[k] = mk.v; r["_t_" + k] = mk.t;
      if (tipo === "simulacion") r["_e_" + k] = `${fmt(mk.v)} · ${org}, simulación`;
      hay = true;
    });
    if (hay) out.push({ key: k, name: nombre, color: tipo === "simulacion" ? "--malo" : colorSerie, fmt, puntos: 8, hueco: tipo === "medicion", marca: true });
  });
  return out;
}
