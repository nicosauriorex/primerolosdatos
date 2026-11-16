// Datos de la imagen de compartir de "Precios contra el mundo" (/contexto/). No dibuja: eso es `imagen.ts` (lienzo "barras").
// La página ya tiene todo calculado (compararPrecios, frasePrecios): la vista lleva esas filas y acá solo se arman los textos, para que la imagen muestre lo mismo.
import type { ColumnaGrillaImg, DatosImagen, FilaBarra, FilaGrillaImg } from "./imagen";
import type { FormatoImg } from "./config";
import { limpiarComentario, slug } from "./imagen-datos";
import { nf0, nf1 } from "./formato";
import type { Dolar, FilaPrecio } from "./preciosMundo";

export interface OpcionesCtx { formato: FormatoImg; comentario: string }

/** Una línea de la vista `ctx-lineas`: `color` es el índice en `PALETA` (components/util.ts); `v` va alineado con `x`. */
export interface SerieCtx { id: string; nombre: string; color: number; v: (number | null)[] }

export type VistaCtx =
  | { tipo: "ctx-precios"; titulo: string; frase: string; filas: FilaPrecio[]; soloMedido: FilaPrecio[]; refNombre: string; dolar: Dolar; fuente: string;
    /** Encabezado de la columna de nombres (por defecto "País"). */ enc?: string;
    /** Contra quién se compara cuando las filas no son países (por rubro, por presidente): "la zona euro". */ contraDicho?: string;
    /** "valor" (por defecto): las filas con estimado se ordenan de la diferencia más alta a la más baja, como en la pantalla; "fijo": se dejan como vienen (presidentes en orden cronológico). */ orden?: "valor" | "fijo" }
  // Gráfico de líneas genérico (R27): `x` = año * 12 + mes0 (un punto por año: mes 0; por mes: el mes), `resaltados` = ids de series con línea gruesa (las demás, tenues; vacío = todas iguales).
  | { tipo: "ctx-lineas"; titulo: string; frase: string | null; x: number[]; series: SerieCtx[]; resaltados?: string[]; unidad: string; fuente: string; decimales: 0 | 1; log?: boolean; refLinea?: number | null };

export const esVistaCtx = (v: unknown): v is VistaCtx => !!v && typeof v === "object" && "tipo" in v && typeof (v as { tipo: unknown }).tipo === "string" && (v as { tipo: string }).tipo.startsWith("ctx-");

/** "−47 %" / "+12 %" / "0 %", con el signo menos tipográfico. */
const variacion = (dif: number): string => (dif === 0 ? "0 %" : `${dif < 0 ? "−" : "+"}${nf0.format(Math.abs(dif))} %`);

/** Una fila de la imagen: verde si el país de referencia es más barato que el de la fila, rojo si es más caro (palabras neutras, sin mejor/peor). */
const aFila = (f: FilaPrecio): FilaBarra => ({
  id: f.ent, nombre: f.nombre, valor: f.dif, variacion: variacion(f.dif), cls: f.dif < 0 ? "bueno" : f.dif > 0 ? "malo" : "neutro",
  ini: null, fin: null, nota: f.dif < 0 ? "más barato" : f.dif > 0 ? "más caro" : "igual", detalle: f.fecha,
});

/** Líneas por país: mismos países, colores, escala y referencia que la pantalla; los resaltados con línea gruesa y el resto tenue (ninguno = todos iguales). Sin palabras de veredicto (D-012). */
function imagenLineas(v: Extract<VistaCtx, { tipo: "ctx-lineas" }>, o: OpcionesCtx): DatosImagen | null {
  const conDatos = v.series.filter((s) => s.v.some((n) => n != null));
  if (!conDatos.length || v.x.length < 2) return null;
  const res = new Set((v.resaltados ?? []).filter((id) => conDatos.some((s) => s.id === id)));
  const nf = v.decimales === 1 ? nf1 : nf0;
  return {
    formato: o.formato, titulo: v.titulo, cifra: null, frases: v.frase ? [{ texto: v.frase, cls: "neutro" }] : [], leyenda: null, x: v.x,
    series: conDatos.map((s) => ({ nombre: s.nombre, color: s.color, axis: 0 as const, etiqueta: s.nombre, v: s.v, ...(res.size ? { resalte: res.has(s.id) ? "fuerte" as const : "tenue" as const } : {}) })),
    fmtEje: (n) => nf.format(n), fmtEje2: null, franjas: [], presidentes: null, inicioTxt: null, comentario: limpiarComentario(o.comentario), fuente: v.fuente, nota: "",
    unidad: v.unidad, fecha: new Date().toLocaleDateString("es-AR"), archivo: `primerolosdatos-${slug(v.titulo)}`,
    log: v.log, refLinea: v.refLinea ?? null, marcaUltimo: true, armado: true,
  };
}

/** Tabla «Por presidente» de /contexto/esperado/ y /contexto/viento/: la pantalla ya calculó cada celda (texto y tono) y acá solo se arma la grilla. */
export interface GrillaCtx {
  titulo: string; frase: string; unidad: string; fuente: string; nota?: string;
  /** Versión corta de la fuente, para cuando la larga no entra (la de `fuentesTxt`). */ fuenteCorta?: string;
  columnas: ColumnaGrillaImg[]; filas: FilaGrillaImg[]; calor: boolean;
}

/** Imagen de una tabla por presidente (lienzo `grilla`). Null si no hay filas ni columnas. Palabras neutras: el color se explica con la frase (D-012). */
export function armarImagenGrilla(g: GrillaCtx, formato: FormatoImg, comentario = ""): DatosImagen | null {
  if (!g.filas.length || !g.columnas.length) return null;
  return {
    formato, titulo: g.titulo, cifra: null, frases: [{ texto: g.frase, cls: "neutro" }], leyenda: null, x: [], series: [], fmtEje: (n) => String(n), fmtEje2: null, franjas: [],
    inicioTxt: null, comentario: limpiarComentario(comentario), fuente: g.fuente, ...(g.fuenteCorta ? { fuenteCorta: g.fuenteCorta } : {}), nota: g.nota ?? "", unidad: g.unidad,
    fecha: new Date().toLocaleDateString("es-AR"), archivo: `primerolosdatos-${slug(g.titulo)}`,
    lienzo: { tipo: "grilla", columnas: g.columnas, filas: g.filas, calor: g.calor },
  };
}

/** Datos de la imagen. Null si no hay nada que dibujar. */
export function armarImagenCtx(v: VistaCtx, o: OpcionesCtx): DatosImagen | null {
  if (v.tipo === "ctx-lineas") return imagenLineas(v, o);
  const base = v.orden === "fijo" ? v.filas : [...v.filas].sort((a, b) => b.dif - a.dif || a.nombre.localeCompare(b.nombre, "es"));
  const filas = [...base, ...v.soloMedido].map(aFila);   // los solo medidos al final, con su "medido en 2021"
  if (!filas.length) return null;
  return {
    formato: o.formato, titulo: v.titulo, cifra: null, frases: [{ texto: v.frase, cls: "neutro" }], leyenda: null, x: [], series: [], fmtEje: (n) => String(n), fmtEje2: null, franjas: [], presidentes: null,
    inicioTxt: null, comentario: limpiarComentario(o.comentario), fuente: v.fuente, nota: "",
    unidad: `Nivel de precios en dólares (dólar ${v.dolar} para la Argentina); ${v.contraDicho ? `diferencia de ${v.refNombre} contra ${v.contraDicho}` : "diferencia del país de referencia contra cada país"}`,
    fecha: new Date().toLocaleDateString("es-AR"), archivo: `primerolosdatos-${slug(v.titulo)}`,
    lienzo: { tipo: "barras", filas, sinDatos: [], enc: { nombre: v.enc ?? "País", valor: v.contraDicho ? `${v.refNombre} contra ${v.contraDicho}` : `${v.refNombre} contra cada país` } },
  };
}
