// Datos de la imagen de compartir de "Precios contra el mundo" (/contexto/). No dibuja: eso es `imagen.ts` (lienzo "barras").
// La página ya tiene todo calculado (compararPrecios, frasePrecios): la vista lleva esas filas y acá solo se arman los textos, para que la imagen muestre lo mismo.
import type { DatosImagen, FilaBarra } from "./imagen";
import type { FormatoImg } from "./config";
import { limpiarComentario, slug } from "./imagen-datos";
import { nf0 } from "./formato";
import type { Dolar, FilaPrecio } from "./preciosMundo";

export interface OpcionesCtx { formato: FormatoImg; comentario: string }

export type VistaCtx = { tipo: "ctx-precios"; titulo: string; frase: string; filas: FilaPrecio[]; soloMedido: FilaPrecio[]; refNombre: string; dolar: Dolar; fuente: string;
  /** Encabezado de la columna de nombres (por defecto "País"). */ enc?: string;
  /** Contra quién se compara cuando las filas no son países (por rubro, por presidente): "la zona euro". */ contraDicho?: string;
  /** "valor" (por defecto): las filas con estimado se ordenan de la diferencia más alta a la más baja, como en la pantalla; "fijo": se dejan como vienen (presidentes en orden cronológico). */ orden?: "valor" | "fijo" };

export const esVistaCtx = (v: unknown): v is VistaCtx => !!v && typeof v === "object" && "tipo" in v && typeof (v as { tipo: unknown }).tipo === "string" && (v as { tipo: string }).tipo.startsWith("ctx-");

/** "−47 %" / "+12 %" / "0 %", con el signo menos tipográfico. */
const variacion = (dif: number): string => (dif === 0 ? "0 %" : `${dif < 0 ? "−" : "+"}${nf0.format(Math.abs(dif))} %`);

/** Una fila de la imagen: verde si el país de referencia es más barato que el de la fila, rojo si es más caro (palabras neutras, sin mejor/peor). */
const aFila = (f: FilaPrecio): FilaBarra => ({
  id: f.ent, nombre: f.nombre, valor: f.dif, variacion: variacion(f.dif), cls: f.dif < 0 ? "bueno" : f.dif > 0 ? "malo" : "neutro",
  ini: null, fin: null, nota: f.dif < 0 ? "más barato" : f.dif > 0 ? "más caro" : "igual", detalle: f.fecha,
});

/** Datos de la imagen. Null si no hay nada que dibujar. */
export function armarImagenCtx(v: VistaCtx, o: OpcionesCtx): DatosImagen | null {
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
