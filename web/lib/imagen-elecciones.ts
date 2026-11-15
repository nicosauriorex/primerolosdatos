// Datos de la imagen de compartir de Elecciones (V7): la cifra de "hoy", los gráficos de dispersión y la correlación con el voto. No dibuja: eso es `imagen.ts`.
// La página ya tiene todo calculado (estimarVoto, pearson, la recta de cada variable): la vista lleva esos números y acá solo se arman los textos y los ejes
// con las mismas funciones que usa la pantalla (`niceTicks`), para que la imagen muestre lo mismo.
import type { DatosImagen, FilaCorr, GraficoDisp } from "./imagen";
import type { FormatoImg } from "./config";
import { limpiarComentario, slug } from "./imagen-datos";
import { nf0, nf2, fmtNum } from "./formato";

export interface OpcionesElec { formato: FormatoImg; comentario: string }

/** Lo mínimo que hace falta de una variable correlacionada con el voto (`Corr` de `components/secciones/Elecciones.tsx` lo cumple tal cual). */
export interface CorrElec {
  s: { n: string }; c: { pct: boolean; unidad: string }; r: number; a: number; b: number; n: number;
  pts: { x: number; e: { anio: string; v: number; tipo: string } }[];
}
export interface HoyElec { x: number; est: number; fuera: boolean }

export type VistaElec =
  | { tipo: "elec-hoy"; cifra: string | null; rotulo: string; frases: string[]; referencia: string | null; medir: string }
  | { tipo: "elec-dispersion"; graficos: GraficoDisp[]; total: number; elegidas: boolean; medir: string }
  | { tipo: "elec-correlacion"; filas: FilaCorr[]; total: number; medir: string };

export const esVistaElec = (v: unknown): v is VistaElec => !!v && typeof v === "object" && "tipo" in v && typeof (v as { tipo: unknown }).tipo === "string" && (v as { tipo: string }).tipo.startsWith("elec-");

/** r con signo, sin "−0,00": el signo sale del valor ya redondeado como se muestra. */
export const fmtR = (r: number) => { const t = nf2.format(Math.abs(r)), z = Number(t.replace(",", ".")) === 0; return (z ? "" : r > 0 ? "+" : "−") + t; };

/** Marcas "redondas" de un eje (la misma cuenta de la pantalla). */
export function niceTicks(min: number, max: number, n: number): number[] {
  const span = max - min || Math.abs(max) || 1, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => span / s <= n) || mag * 10;
  const t: number[] = []; let v = Math.floor(min / step) * step;
  t.push(v);
  while (v < max - 1e-9) { v += step; t.push(+v.toPrecision(12)); }
  return t;
}

/** Los rangos y marcas de un gráfico de dispersión, como los de la pantalla (`Dispersion`), más sus textos. */
export function graficoDisp(o: CorrElec, metrica: string, hoy: HoyElec | null): GraficoDisp {
  const xs = o.pts.map((q) => q.x), ys = o.pts.map((q) => q.e.v);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  const px = (x1 - x0) * 0.08 || 1; x0 -= px; x1 += px;
  if (hoy) { x0 = Math.min(x0, hoy.x - px); x1 = Math.max(x1, hoy.x + px); }
  const y0 = Math.max(0, Math.min(...ys, hoy ? hoy.est : Infinity) - 4), y1 = Math.max(...ys, hoy ? hoy.est : -Infinity) + 4;
  const fx = (v: number) => (o.c.pct || metrica !== "nivel" ? nf0.format(v) : fmtNum(v));
  return {
    nombre: o.s.n, sub: `r = ${fmtR(o.r)} · ${o.n} elecciones`,
    ejeX: metrica === "nivel" ? o.c.unidad : o.c.pct ? "Cambio en puntos" : "Cambio %", ejeY: "% de votos del oficialismo",
    x0, x1, y0, y1,
    xTicks: niceTicks(x0, x1, 3).filter((v) => v >= x0 && v <= x1).map((v) => ({ v, t: fx(v) })),
    yTicks: niceTicks(y0, y1, 3).filter((v) => v >= y0 && v <= y1).map((v) => ({ v, t: `${nf0.format(v)} %` })),
    pts: o.pts.map((q) => ({ x: q.x, y: q.e.v, etq: q.e.anio, pres: q.e.tipo === "pres" })),
    recta: { a: o.a, b: o.b },
    hoy: hoy ? { x: hoy.x, y: hoy.est, txt: `Hoy ${nf0.format(hoy.est)} %`, extra: hoy.fuera ? "extrapolado" : null } : null,
  };
}

/** Fila de la imagen de correlación para una variable. */
export const filaCorr = (o: CorrElec): FilaCorr => ({ nombre: o.s.n, r: o.r, rTxt: fmtR(o.r), detalle: `${o.n} elecciones · r² ${nf0.format(o.r * o.r * 100)} %` });

const neutro = (texto: string) => ({ texto, cls: "neutro" as const });
const AVISO = "Ejercicio estadístico, no un pronóstico: una relación entre dos datos no prueba que uno cause el otro.";

function esqueleto(o: OpcionesElec, titulo: string): DatosImagen {
  return {
    formato: o.formato, titulo, cifra: null, frases: [], leyenda: null, x: [], series: [], fmtEje: (v) => String(v), fmtEje2: null, franjas: [], presidentes: null,
    inicioTxt: null, comentario: limpiarComentario(o.comentario), unidad: "", fuente: "Fuente: Primero los Datos", nota: "",
    fecha: new Date().toLocaleDateString("es-AR"), archivo: `primerolosdatos-${slug(titulo)}`,
  };
}

/** Datos de la imagen. Null si no hay nada que dibujar. */
export function armarImagenElec(v: VistaElec, o: OpcionesElec): DatosImagen | null {
  if (v.tipo === "elec-hoy") {
    if (!v.cifra && !v.frases.length) return null;
    const d = esqueleto(o, "Qué dicen los datos sobre el voto al oficialismo hoy");
    d.frases = [neutro(AVISO)];
    d.lienzo = { tipo: "hoy", cifra: v.cifra, rotulo: v.rotulo, frases: v.frases, referencia: v.referencia };
    d.unidad = `Voto al oficialismo estimado con cada variable medida así: ${v.medir}`;
    d.fuente = `Fuentes: escrutinios oficiales publicados (voto al oficialismo nacional desde 1995, cargado a mano) y series oficiales de cada variable; detalle en primerolosdatos.com.ar/fuentes`;
    return d;
  }
  if (v.tipo === "elec-dispersion") {
    if (!v.graficos.length) return null;
    const d = esqueleto(o, "Voto al oficialismo y su relación con cada variable");
    d.frases = [neutro(`Cada punto es una elección: lleno = presidencial, vacío = legislativa; rombo = hoy; línea punteada = recta de ajuste.${v.total > v.graficos.length ? ` Se muestran ${v.graficos.length} de ${v.total}.` : ""}`)];
    d.lienzo = { tipo: "dispersion", graficos: v.graficos };
    d.unidad = `Eje horizontal: la variable (${v.medir}) · eje vertical: % de votos del oficialismo en esa elección`;
    d.fuente = "Fuentes: escrutinios oficiales publicados (voto al oficialismo nacional desde 1995, cargado a mano) y series oficiales de cada variable; detalle en primerolosdatos.com.ar/fuentes";
    d.armado = v.elegidas;
    return d;
  }
  if (!v.filas.length) return null;
  const d = esqueleto(o, "Correlación de cada variable con el voto al oficialismo");
  d.frases = [neutro(`Las ${v.filas.length} variables con relación más fuerte${v.total > v.filas.length ? ` (de ${v.total})` : ""}. +1: se mueven juntas; −1: en sentido contrario; 0: sin relación. Una correlación no prueba causa.`)];
  d.lienzo = { tipo: "correlacion", filas: v.filas };
  d.unidad = `Correlación (r) entre cada variable (${v.medir}) y el % de votos del oficialismo, en las elecciones nacionales desde 1995`;
  d.fuente = "Fuentes: escrutinios oficiales publicados (voto al oficialismo nacional desde 1995, cargado a mano) y series oficiales de cada variable; detalle en primerolosdatos.com.ar/fuentes";
  return d;
}
