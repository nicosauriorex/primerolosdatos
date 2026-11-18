// Imagen de compartir del "Resumen por hitos" de /mandato/ (docs/specs/imagenes-y-lupa.md, 1.3).
// No calcula: recibe lo mismo que dibuja la tabla de la pantalla (`celdasHitos`, `D.cel`) y arma el lienzo "grilla" de imagen.ts.
// Se dibuja siempre la tabla, aunque en pantalla se vean las barras.
import type { DatosImagen, FilaGrillaImg } from "./imagen";
import type { FormatoImg } from "./config";
import { baseIdx, finIdx, oracionInicio, type Pres, type BaseCfg, type CeldaHito, type ModoMandato } from "./estadisticas";
import { fuenteLegible, limpiarComentario, notaInflacion, slug } from "./imagen-datos";
import { fuentesCalc, type Motor } from "./motor";

/** Lo que usa de `calcularMandato`: los presidentes visibles, el cálculo de la variable y cómo se escribe cada celda. */
interface MandatoHitos {
  c: Parameters<typeof fuentesCalc>[0] & { corto: string; unidad: string; pct: boolean; entero?: boolean };
  modo: ModoMandato;
  teo: boolean;
  ancla: number | null;
  ancTxt: string;
  pres: Pres[];
  cel: (x: Pres, t: number) => string;
}

export function armarImagenHitos(m: Motor, D: MandatoHitos, hitosDe: CeldaHito[][], hitos: number[], b: BaseCfg, formato: FormatoImg, comentario = ""): DatosImagen {
  const enc = ["Mes 0", ...hitos.map((h) => `Mes ${h}`), "Final"];
  const filas: FilaGrillaImg[] = D.pres.map((x, k) => {
    const fin = finIdx(m.F, x, b) - baseIdx(m.F, x, b), fila = hitosDe[k];
    const celda = (t: number, extra = "") => {
      const ce = fila.find((q) => q.t === t), txt = D.cel(x, t);
      return { texto: txt + extra, cls: txt === "–" ? "neutro" as const : ce?.tono ?? "neutro" as const, calor: ce?.tono ? ce.frac : 0 };
    };
    const vacio = { texto: "—", cls: "neutro" as const, calor: 0 };   // el mandato no llegó a ese hito
    return {
      // el mes del final va una sola vez, en el período de la fila («55 meses»), no repetido en la celda
      id: x.id, nombre: x.n, periodo: `${fin} ${fin === 1 ? "mes" : "meses"}`,
      celdas: [celda(0), ...hitos.map((h) => (h <= fin ? celda(h) : vacio)), celda(fin)].map((c) => (c.texto === "–" ? vacio : c)),
    };
  });
  const titulo = `${D.c.corto}: resumen por hitos de cada mandato`;
  const ult = m.F[m.F.length - 1];
  const hayDir = D.pres.some((_, k) => hitosDe[k].some((q) => q.tono));
  return {
    formato, titulo, cifra: null, leyenda: null, x: [], series: [], fmtEje: (v) => String(v), fmtEje2: null, franjas: [], presidentes: null,
    frases: [{ texto: hayDir
      ? "Cómo cambió cada dato desde el mes 0. Verde: cambió en el sentido favorable para ese dato; rojo: en el contrario. Más intenso: el cambio más grande de ese hito entre presidentes."
      : "Sin verde ni rojo: para este dato, subir o bajar no tiene un sentido favorable ni contrario.", cls: "neutro" }],
    inicioTxt: oracionInicio(b), comentario: limpiarComentario(comentario),
    // como la imagen del gráfico (imagen-presidentes.ts): la unidad del dato y, con mismo punto de partida, desde qué valor arrancan todos
    unidad: `${D.modo === "var" && !D.c.pct ? "Variación en %, desde el mes 0" : D.c.unidad} · meses desde el inicio de cada mandato`,
    fuente: "Fuente: " + fuentesCalc(D.c).map(fuenteLegible).join("; "),
    nota: [D.teo ? `Mismo punto de partida: todos arrancan desde ${m.fmtC(D.c, D.ancla)} (${D.ancTxt}).` : "", notaInflacion([D.c], false)].filter(Boolean).join(" "),
    fecha: new Date().toLocaleDateString("es-AR"), archivo: `primerolosdatos-${slug(titulo)}-${ult.slice(0, 7)}`,
    lienzo: { tipo: "grilla", columnas: enc.map((nombre) => ({ nombre, metrica: "" })), filas, calor: hayDir },
    armado: true,
  };
}
