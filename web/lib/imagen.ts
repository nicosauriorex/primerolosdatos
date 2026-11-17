// Dibujo de la imagen para compartir, en un canvas. Recibe datos ya calculados (`DatosImagen`) y una paleta ya leída: no toca la página.
// Siempre con el aspecto oscuro de la marca. Los textos largos bajan de tamaño hasta un mínimo y después se cortan con puntos suspensivos.
import { fmtMes, nf0 } from "./formato";
import { nombreCorto } from "./estadisticas";
import type { FormatoImg } from "./config";
import type { Frase } from "./contexto-dato";

export const FORMATOS: Record<FormatoImg, { w: number; h: number }> = {
  "1x1": { w: 1080, h: 1080 }, "4x5": { w: 1080, h: 1350 }, "16x9": { w: 1600, h: 900 },
};

export interface Paleta {
  familia: string;
  fondo: string; superficie: string; barra: string; sobreBarra: string; borde: string; tinta: string; tintaSec: string; tintaTenue: string;
  grilla: string; eje: string; cero: string; acento: string; sobreAcento: string; accion: string; bueno: string; malo: string;
  series: string[];                 // en el orden de PALETA de components/util.ts
  pres: Record<string, string>;     // color de cada presidente (id → color)
  /** Fondos de las celdas del semáforo de actividad (intensidad 1 a 4) y el color del texto que va encima de cada uno. */
  fondosBueno: string[]; fondosMalo: string[]; sobreBueno: string[]; sobreMalo: string[];
}
export interface SerieImg {
  nombre: string; color: number; axis: 0 | 1; v: (number | null)[];
  presId?: string;                   // si es de un presidente, se dibuja con su color
  etiqueta?: string;                 // nombre escrito al final de la línea
  trazo?: "continuo" | "corto" | "largo";
  resalte?: "fuerte" | "tenue";    // presidente resaltado (línea gruesa) o atenuado (el resto, cuando hay resaltados), igual que en pantalla
}
type Cls = "bueno" | "malo" | "neutro";
/** Un dato de una tarjeta: su rótulo, su valor y, si aplica, un mes o período. */
export interface TarjetaDato { rotulo: string; valor: string; cls: Cls; sub?: string | null }
/** Una tarjeta: de un presidente (con `id`, para su color) o del período. `nota`: "desde dic-15" si el mandato cae solo en parte. */
export interface TarjetaImg { id?: string; nombre: string; nota?: string | null; datos: TarjetaDato[] }
export interface LineaRef { tipo: "prom" | "med" | "ult"; valor: number; texto: string }
export interface MarcaExt { tipo: "max" | "min"; x: number; valor: number; texto: string }
/** Una fila de "una variable, todos los presidentes". */
export interface FilaBarra {
  id: string; nombre: string; valor: number | null; variacion: string | null; cls: Cls; ini: string | null; fin: string | null; nota: string | null;
  detalle?: string;                  // segundo renglón propio (si está, reemplaza a "inicio → fin"); lo usa el gasto de la Nación
}
/** Una fila de "un presidente, varias variables". */
export interface FilaVariable { nombre: string; unidad: string; ini: string | null; fin: string | null; variacion: string | null; cls: Cls; nota: string | null; spark: (number | null)[] }
/** Títulos de las columnas de las filas con variables, si no son los de un mandato (el parte diario del Banco Central usa otros). */
export interface EncVariables { ini: string; fin: string; sp: string; sinDato: string; vr?: string }
/** Una vela de "una variable, todos los presidentes": valores numéricos (para el dibujo) y ya formateados (para el texto). */
export interface FilaVela { id: string; nombre: string; periodo: string; ini: number; fin: number; min: number; max: number; iniTxt: string; finTxt: string; minTxt: string; maxTxt: string; variacion: string; cls: Cls; nota: string | null }
export interface FilaRank { puesto: number; id: string; nombre: string; score: number; indicadores: number }
/** Una columna de "el mismo mes en cada año": `actual` va en celeste; `ref` (el año de "el más bajo/alto desde…") en ámbar. */
export interface FilaMes { anio: string; valor: number; texto: string; actual: boolean; ref: boolean }
/** Grilla "Todos los presidentes, de un vistazo": una fila por presidente y una columna por dato clave. `cls` es el lado (verde o rojo) y `calor` (0 a 1) la intensidad. */
export interface ColumnaGrillaImg { nombre: string; metrica: string }
export interface CeldaGrillaImg { texto: string; cls: Cls; calor: number }
export interface FilaGrillaImg { id: string; nombre: string; periodo: string; celdas: CeldaGrillaImg[] }
/** Elecciones (V7). Todo viene calculado: la imagen solo dibuja. */
export interface GraficoDisp {
  nombre: string; sub: string; ejeX: string; ejeY: string;
  x0: number; x1: number; y0: number; y1: number;           // rangos de los ejes
  xTicks: { v: number; t: string }[]; yTicks: { v: number; t: string }[];
  pts: { x: number; y: number; etq: string; pres: boolean }[];   // pres: presidencial (lleno); si no, legislativa (vacío)
  recta: { a: number; b: number } | null;                   // y = a + b·x
  hoy: { x: number; y: number; txt: string; extra: string | null } | null;
}
export interface FilaCorr { nombre: string; r: number; rTxt: string; detalle: string }
/** Contenido de la imagen cuando no es un gráfico de líneas. */
export type Lienzo =
  | { tipo: "hoy"; cifra: string | null; rotulo: string; frases: string[]; referencia: string | null }
  | { tipo: "dispersion"; graficos: GraficoDisp[] }
  | { tipo: "correlacion"; filas: FilaCorr[] }
  | { tipo: "barras"; filas: FilaBarra[]; sinDatos: string[]; enc?: { nombre: string; valor: string }; sinTope?: boolean; ref?: { v: number; txt: string }; sinTitulo?: string }
  | { tipo: "variables"; filas: FilaVariable[]; presId: string; enc?: EncVariables }
  | { tipo: "velas"; filas: FilaVela[]; sinDatos: string[] }
  | { tipo: "ranking"; filas: FilaRank[]; sinDatos: string[] }
  | { tipo: "meses"; filas: FilaMes[] }
  | { tipo: "grilla"; columnas: ColumnaGrillaImg[]; filas: FilaGrillaImg[]; calor: boolean };

/** Una comparación que va al lado de la cifra grande: «Mes anterior (sep-26)» y «1,9 % · +0,3 p.p.». */
export interface ComparacionImg { rotulo: string; fecha: string; valor: string; variacion: string }

export interface DatosImagen {
  formato: FormatoImg;
  titulo: string;
  cifra: { valor: string; mes: string; aviso: boolean } | null;
  frases: Frase[];
  leyenda: { nombre: string; valor: string; color: number }[] | null;   // varias variables: nombre y último valor de cada una
  x: number[];                       // mes de cada punto (años * 12 + mes)
  series: SerieImg[];
  fmtEje: (v: number) => string; fmtEje2: ((v: number) => string) | null;
  franjas: { ini: number; fin: number; id: string; nombre: string }[];
  inicioTxt: string | null;
  presidentes?: null;                // sin uso (lo dejaron las imágenes de presidentes); las tarjetas van en `tarjetas`
  tarjetas?: { tipo: "pres" | "gen"; items: TarjetaImg[] };
  comparaciones?: ComparacionImg[];  // al lado de la cifra grande (o debajo si no entran)
  lineasRef?: LineaRef[];            // líneas horizontales con nombre y valor
  marcasExt?: MarcaExt[];            // máximo y mínimo marcados sobre la serie
  marcaUltimo?: boolean;             // marcar el último dato de cada serie (por defecto sí)
  temporalidad?: string | null;      // línea bajo el título: "Datos mensuales", …
  comentario: string;
  unidad: string; fuente: string; nota: string; fecha: string;
  archivo: string;                   // nombre del archivo, sin extensión
  lienzo?: Lienzo;                   // si está, se dibuja esto en lugar del gráfico de líneas
  ejeX?: "fecha" | "mes";            // "mes": el eje X son meses de mandato (0, 6, 12…)
  log?: boolean;                     // eje Y logarítmico
  refLinea?: number | null;          // línea horizontal de referencia
  fuenteCorta?: string;              // si la fuente no entra en dos renglones, esta
  cero?: boolean;                    // línea del cero (R20): se dibuja si los valores la cruzan, salvo que sea false
  armado?: boolean;                  // vista armada a gusto (R22): el pie dice "Armado en primerolosdatos.com.ar · armá el tuyo"
}

export const SITIO = "primerolosdatos.com.ar";
const ETQ_COMENTARIO = "Comentario de quien comparte";
const px = (n: number) => Math.round(n);

type Ctx = CanvasRenderingContext2D;
/** Un canvas donde dibujar: el de la página o uno compatible (el de @napi-rs/canvas en scripts/generar-previas.ts). */
export interface LienzoCanvas { width: number; height: number; getContext(tipo: "2d"): Ctx | null }
export const fuenteDe = (pal: Paleta, peso: number, tam: number) => `${peso} ${px(tam)}px ${pal.familia}`;

/** Carga las fuentes de la marca antes de dibujar (si no, el canvas usa la de reserva). */
export async function esperarFuentes(familia: string): Promise<void> {
  try {
    await Promise.all([400, 600, 800, 900].map((p) => document.fonts.load(`${p} 32px ${familia}`)));
    await document.fonts.ready;
  } catch { /* sin API de fuentes: se dibuja con lo que haya */ }
}

function partir(ctx: Ctx, texto: string, ancho: number): string[] {
  const out: string[] = [];
  let linea = "";
  for (const w of texto.split(/\s+/).filter(Boolean)) {
    const prueba = linea ? linea + " " + w : w;
    if (linea && ctx.measureText(prueba).width > ancho) { out.push(linea); linea = w; } else linea = prueba;
  }
  if (linea) out.push(linea);
  return out;
}
function recortarPuntos(ctx: Ctx, s: string, ancho: number): string {
  if (ctx.measureText(s).width <= ancho) return s;
  let t = s;
  while (t.length > 1 && ctx.measureText(t.trimEnd() + "…").width > ancho) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}
export interface Ajustado { lineas: string[]; tam: number; cortado?: boolean }
/** Entra en `ancho` y `lineas` renglones bajando el tamaño de `max` a `min`; si no entra ni al mínimo, corta el último renglón con puntos suspensivos. */
export function ajustar(ctx: Ctx, pal: Paleta, texto: string, o: { peso: number; max: number; min: number; ancho: number; lineas: number }): Ajustado {
  const limpio = texto.replace(/\s+/g, " ").trim();
  for (let t = px(o.max); t >= px(o.min); t -= 2) {
    ctx.font = fuenteDe(pal, o.peso, t);
    const ls = partir(ctx, limpio, o.ancho);
    if (ls.length <= o.lineas && ls.every((l) => ctx.measureText(l).width <= o.ancho)) return { lineas: ls, tam: t };
  }
  const t = px(o.min);
  ctx.font = fuenteDe(pal, o.peso, t);
  const ls = partir(ctx, limpio, o.ancho);
  const cortadas = ls.slice(0, o.lineas);
  if (ls.length > o.lineas) cortadas[o.lineas - 1] = [cortadas[o.lineas - 1], ...ls.slice(o.lineas)].join(" ");
  return { lineas: cortadas.map((l) => recortarPuntos(ctx, l, o.ancho)), tam: t, cortado: true };
}
export const alto = (a: Ajustado, inter = 1.18) => a.lineas.length * a.tam * inter;
export function texto(ctx: Ctx, pal: Paleta, a: Ajustado, peso: number, x: number, y: number, color: string, inter = 1.18, alinear: CanvasTextAlign = "left") {
  ctx.font = fuenteDe(pal, peso, a.tam); ctx.fillStyle = color; ctx.textAlign = alinear; ctx.textBaseline = "top";
  a.lineas.forEach((l, k) => ctx.fillText(l, x, y + k * a.tam * inter));
}
const colorFrase = (pal: Paleta, f: Frase) => (f.cls === "bueno" ? pal.bueno : f.cls === "malo" ? pal.malo : pal.tintaSec);
const colorCls = (pal: Paleta, c: "bueno" | "malo" | "neutro") => (c === "bueno" ? pal.bueno : c === "malo" ? pal.malo : pal.tintaSec);

// ---------------------------------------------------------------- gráfico
function ticksY(min: number, max: number, n: number): number[] {
  const span = max - min || Math.abs(max) || 1, raw = span / Math.max(1, n), mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
  const paso = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag, out: number[] = [];
  for (let v = Math.ceil(min / paso - 1e-9) * paso; v <= max + paso * 1e-9; v += paso) out.push(+v.toFixed(10));
  return out;
}
function ticksLog(min: number, max: number): number[] {
  const out: number[] = [];
  for (const mult of [[1, 2, 5], [1, 2, 3, 4, 5, 6, 7, 8, 9]]) {
    out.length = 0;
    for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) for (const k of mult) { const v = k * Math.pow(10, e); if (v >= min && v <= max) out.push(v); }
    if (out.length >= 3) break;
  }
  return out;
}
interface Rect { x: number; y: number; w: number; h: number }
const DASH = { continuo: [] as number[], corto: [10, 8], largo: [22, 12] };

/** Nombres de las franjas de mandatos, todos del mismo tamaño: enteros si entran todos; si no, el nombre corto en todos los que lo tengan;
 *  los que aun así no entran van girados en vertical. Devuelve los rectángulos ocupados (para que nada se les superponga). */
function nombresFranjas(ctx: Ctx, pal: Paleta, bandas: { nombre: string; x0: number; x1: number }[], y: number, hMax: number, fs: number): Rect[] {
  const tam = px(fs * 0.82), ocupados: Rect[] = [];
  ctx.fillStyle = pal.tintaSec; ctx.font = fuenteDe(pal, 700, tam);
  const entra = (t: string, b: { x0: number; x1: number }) => ctx.measureText(t).width + 10 < b.x1 - b.x0;
  const enteros = bandas.map((b) => b.nombre.toUpperCase()), cortos = bandas.map((b) => nombreCorto(b.nombre).toUpperCase());
  const textos = bandas.every((b, k) => entra(enteros[k], b)) ? enteros : cortos;
  bandas.forEach((b, k) => {
    const t = textos[k], cx = (b.x0 + b.x1) / 2, w = ctx.measureText(t).width;
    if (entra(t, b)) {
      ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(t, cx, y + 6);
      ocupados.push({ x: cx - w / 2 - 3, y: y + 3, w: w + 6, h: tam * 1.2 + 6 });
      return;
    }
    if (b.x1 - b.x0 < tam + 4) return;
    const v = recortarPuntos(ctx, t, hMax - 16), wv = ctx.measureText(v).width;
    ctx.save(); ctx.translate(cx, y + 8 + wv); ctx.rotate(-Math.PI / 2); ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(v, 0, 0); ctx.restore();
    ocupados.push({ x: cx - tam / 2 - 2, y: y + 6, w: tam + 4, h: wv + 6 });
  });
  return ocupados;
}

/** Ubica etiquetas sin que se pisen entre sí ni con la serie, los marcadores o los nombres de las franjas. Cada etiqueta trae sus lugares posibles, de
 *  más a menos preferido; si ninguno queda libre, se toma el que menos se pisa. Siempre dentro del gráfico. */
interface Etq { w: number; h: number; cands: Rect[] }
function ubicarEtiquetas(items: Etq[], area: Rect, trazos: [number, number][][], ocupados: Rect[], grosor: number): Rect[] {
  const puestos: Rect[] = [];
  const cruza = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const tocaTrazo = (r: Rect) => trazos.some((t) => t.some((q, i) => {
    if (i === 0) return false;
    const p = t[i - 1], largo = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(largo / 4));
    for (let k = 0; k <= n; k++) {
      const x = p[0] + ((q[0] - p[0]) * k) / n, y = p[1] + ((q[1] - p[1]) * k) / n;
      if (x > r.x - grosor && x < r.x + r.w + grosor && y > r.y - grosor && y < r.y + r.h + grosor) return true;
    }
    return false;
  }));
  const dentro = (r: Rect): Rect => ({ ...r, x: Math.max(area.x, Math.min(area.x + area.w - r.w, r.x)), y: Math.max(area.y, Math.min(area.y + area.h - r.h, r.y)) });
  items.forEach((it) => {
    let mejor: Rect | null = null, puntaje = Infinity;
    for (const c0 of it.cands) {
      const c = dentro(c0);
      const p = (tocaTrazo(c) ? 3 : 0) + puestos.filter((o) => cruza(c, o)).length * 2 + ocupados.filter((o) => cruza(c, o)).length * 2;
      if (p < puntaje) { puntaje = p; mejor = c; if (p === 0) break; }
    }
    const r = mejor ?? dentro(it.cands[0]);
    puestos.push(r);
  });
  return puestos;
}

function grafico(ctx: Ctx, r: Rect, d: DatosImagen, pal: Paleta, esc: number) {
  const fs = px(22 * esc), pad = px(14 * esc);
  ctx.fillStyle = pal.superficie; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = pal.borde; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  const vis = d.series.map((s, k) => ({ s, k })).filter(({ s }) => s.v.some((x) => x != null));
  if (!vis.length || !d.x.length) return;
  const log = !!d.log, modoMes = d.ejeX === "mes";
  const rango = (axis: number) => {
    let mn = Infinity, mx = -Infinity;
    vis.filter(({ s }) => s.axis === axis).forEach(({ s }) => s.v.forEach((x) => { if (x != null && (!log || x > 0)) { mn = Math.min(mn, x); mx = Math.max(mx, x); } }));
    if (!isFinite(mn)) return null;
    if (log) return { mn: mn / 1.2, mx: mx * 1.25 };
    const sp = (mx - mn) || Math.abs(mx) * 0.1 || 1;
    return { mn: mn - sp * 0.08, mx: mx + sp * 0.08 };
  };
  const R0 = rango(0), R1 = rango(1);
  const x0 = Math.min(...d.x), x1 = Math.max(...d.x) === x0 ? x0 + 1 : Math.max(...d.x);
  ctx.font = fuenteDe(pal, 600, fs);
  const marcasY = (R: { mn: number; mx: number }, n: number) => (log ? ticksLog(R.mn, R.mx) : ticksY(R.mn, R.mx, n));
  const ancho = (fmt: (v: number) => string, R: { mn: number; mx: number }) => Math.max(...marcasY(R, 4).map((t) => ctx.measureText(fmt(t)).width), 0);
  // nombres al final de cada línea: enteros si caben en un quinto del ancho; si no, abreviados
  const conEtq = vis.filter(({ s }) => s.etiqueta);
  ctx.font = fuenteDe(pal, 800, px(fs * 0.95));
  const wEtq = (f: (t: string) => string) => Math.max(0, ...conEtq.map(({ s }) => ctx.measureText(f(s.etiqueta!)).width));
  const abrevia = wEtq((t) => t) > r.w * 0.2;
  const nomEtq = (t: string) => (abrevia ? nombreCorto(t) : t);
  const reservaEtq = conEtq.length ? wEtq(nomEtq) + pad * 1.4 : 0;
  ctx.font = fuenteDe(pal, 600, fs);
  const izq = pad + (R0 ? ancho(d.fmtEje, R0) : 0) + pad, der = Math.max(R1 && d.fmtEje2 ? ancho(d.fmtEje2, R1) + pad * 2 : pad * 1.6, reservaEtq);
  const pl = { x: r.x + izq, y: r.y + pad, w: r.w - izq - der, h: r.h - pad * 2 - fs - px(10 * esc) };
  const X = (n: number) => pl.x + ((n - x0) / (x1 - x0)) * pl.w;
  const Yde = (R: { mn: number; mx: number }) => (log
    ? (v: number) => pl.y + pl.h - ((Math.log(Math.max(v, R.mn)) - Math.log(R.mn)) / (Math.log(R.mx) - Math.log(R.mn))) * pl.h
    : (v: number) => pl.y + pl.h - ((v - R.mn) / (R.mx - R.mn)) * pl.h);

  ctx.save();
  ctx.beginPath(); ctx.rect(r.x + 2, r.y + 2, r.w - 4, r.h - 4); ctx.clip();
  // franjas de mandatos
  const bandas: { nombre: string; x0: number; x1: number }[] = [];
  d.franjas.forEach((f) => {
    const a = Math.max(f.ini, x0), b = Math.min(f.fin, x1);
    if (b <= a) return;
    ctx.globalAlpha = 0.2; ctx.fillStyle = pal.pres[f.id] ?? pal.eje; ctx.fillRect(X(a), pl.y, X(b) - X(a), pl.h);
    ctx.globalAlpha = 1;
    bandas.push({ nombre: f.nombre, x0: X(a), x1: X(b) });
  });
  const ocupados = nombresFranjas(ctx, pal, bandas, pl.y, pl.h, fs);
  // grilla y eje Y izquierdo
  ctx.textBaseline = "middle"; ctx.font = fuenteDe(pal, 600, fs);
  const nTicks = Math.max(2, Math.round(pl.h / (70 * esc)));
  if (R0) {
    const Y = Yde(R0);
    marcasY(R0, nTicks).forEach((t) => {
      const y = Y(t); if (y < pl.y - 1 || y > pl.y + pl.h + 1) return;
      ctx.strokeStyle = pal.grilla; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pl.x, y); ctx.lineTo(pl.x + pl.w, y); ctx.stroke();
      ctx.fillStyle = pal.tintaTenue; ctx.textAlign = "right"; ctx.fillText(d.fmtEje(t), pl.x - pad * 0.6, y);
    });
    if (d.cero !== false && !log && R0.mn < 0 && R0.mx > 0) {   // R20: la línea del cero, de un color propio más fuerte que la grilla
      const y = Y(0);
      ctx.strokeStyle = pal.cero; ctx.lineWidth = px(3 * esc); ctx.beginPath(); ctx.moveTo(pl.x, y); ctx.lineTo(pl.x + pl.w, y); ctx.stroke();
    }
    if (d.refLinea != null && (!log || d.refLinea > 0)) {
      const y = Y(d.refLinea);
      if (y >= pl.y && y <= pl.y + pl.h) { ctx.strokeStyle = pal.tintaTenue; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(pl.x, y); ctx.lineTo(pl.x + pl.w, y); ctx.stroke(); ctx.setLineDash([]); }
    }
  }
  if (R1 && d.fmtEje2) {
    const Y = Yde(R1), col = pal.series[vis.find(({ s }) => s.axis === 1)!.s.color];
    marcasY(R1, nTicks).forEach((t) => {
      const y = Y(t); if (y < pl.y - 1 || y > pl.y + pl.h + 1) return;
      ctx.fillStyle = col; ctx.textAlign = "left"; ctx.fillText(d.fmtEje2!(t), pl.x + pl.w + pad * 0.6, y);
    });
  }
  // eje X: años, meses o meses de mandato
  const span = x1 - x0, marcas: { n: number; t: string }[] = [];
  if (modoMes) {
    const porMes = pl.w / span;
    const paso = [1, 2, 3, 6, 12, 24, 48].find((p) => porMes * p >= 70 * esc) ?? 48;
    for (let n = Math.ceil(x0); n <= x1; n++) if (n % paso === 0) marcas.push({ n, t: n === 0 ? "Mes 0" : String(n) });
  } else if (span > 36) {
    const porAnio = (pl.w * 12) / span;
    const paso = [1, 2, 5, 10, 20].find((p) => porAnio * p >= 90 * esc) ?? 20;
    for (let a = Math.ceil(x0 / 12); a * 12 <= x1; a++) if (a % paso === 0) marcas.push({ n: a * 12, t: String(a) });
  } else {
    const porMes = pl.w / span;
    const paso = [1, 2, 3, 6, 12].find((p) => porMes * p >= 100 * esc) ?? 12;
    for (let n = Math.ceil(x0); n <= x1; n++) if (n % paso === 0) marcas.push({ n, t: fmtMes(`${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`) });
  }
  ctx.textBaseline = "top"; ctx.font = fuenteDe(pal, 600, fs);
  marcas.forEach(({ n, t }) => {
    const x = X(n), w = ctx.measureText(t).width;
    ctx.strokeStyle = pal.eje; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, pl.y + pl.h); ctx.lineTo(x, pl.y + pl.h + 6); ctx.stroke();
    ctx.fillStyle = pal.tintaTenue; ctx.textAlign = "center";
    ctx.fillText(t, Math.max(r.x + w / 2 + 4, Math.min(r.x + r.w - w / 2 - 4, x)), pl.y + pl.h + 9);
  });
  ctx.strokeStyle = pal.eje; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pl.x, pl.y + pl.h); ctx.lineTo(pl.x + pl.w, pl.y + pl.h); ctx.stroke();
  // líneas de referencia (promedio, mediana, último dato), debajo de la serie
  const refs = R0 ? (d.lineasRef ?? []).filter((l) => !log || l.valor > 0) : [];
  const COLOR_REF = { prom: pal.tinta, med: pal.tintaSec, ult: pal.accion };
  const DASH_REF = { prom: [22, 12], med: [10, 8], ult: [3, 8] };
  if (R0) {
    const Y = Yde(R0);
    refs.forEach((l) => {
      const y = Y(l.valor); if (y < pl.y || y > pl.y + pl.h) return;
      ctx.strokeStyle = COLOR_REF[l.tipo]; ctx.lineWidth = px(3 * esc); ctx.setLineDash(DASH_REF[l.tipo].map((n) => n * esc)); ctx.lineCap = "butt";
      ctx.beginPath(); ctx.moveTo(pl.x, y); ctx.lineTo(pl.x + pl.w, y); ctx.stroke(); ctx.setLineDash([]);
    });
  }
  // líneas, con corte donde falta el dato, y el último punto marcado
  const trazos: [number, number][][] = [];
  const puntas: { s: SerieImg; x: number; y: number; col: string }[] = [];
  ctx.save();
  ctx.beginPath(); ctx.rect(pl.x - 2, pl.y - 6, pl.w + 4, pl.h + 12); ctx.clip();
  // los presidentes resaltados se dibujan al final (arriba), con línea gruesa; los atenuados, finos y con poca opacidad
  [...vis].sort((a, b) => (a.s.resalte === "fuerte" ? 1 : 0) - (b.s.resalte === "fuerte" ? 1 : 0)).forEach(({ s }) => {
    const R = s.axis === 1 && R1 ? R1 : R0!, Y = Yde(R), col = s.presId ? (pal.pres[s.presId] ?? pal.acento) : (pal.series[s.color] ?? pal.acento);
    ctx.globalAlpha = s.resalte === "tenue" ? 0.3 : 1;
    ctx.strokeStyle = col; ctx.lineWidth = px((s.resalte === "fuerte" ? 7.5 : s.resalte === "tenue" ? 3.5 : 4.5) * esc); ctx.lineJoin = "round"; ctx.lineCap = s.trazo && s.trazo !== "continuo" ? "butt" : "round";
    ctx.setLineDash(DASH[s.trazo ?? "continuo"].map((n) => n * esc));
    let abierto = false, ultimo = null as [number, number] | null, tramo: [number, number][] = [];
    ctx.beginPath();
    s.v.forEach((v, i) => {
      if (v == null || (log && v <= 0)) { abierto = false; return; }
      const xx = X(d.x[i]), yy = Y(v);
      if (abierto) ctx.lineTo(xx, yy); else { ctx.moveTo(xx, yy); abierto = true; tramo = []; trazos.push(tramo); }
      tramo.push([xx, yy]);
      ultimo = [xx, yy];
    });
    ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (ultimo) {
      const [ux, uy] = ultimo;
      if (d.marcaUltimo !== false && s.resalte !== "tenue") {
        ctx.fillStyle = col; ctx.strokeStyle = pal.superficie; ctx.lineWidth = px(3 * esc);
        ctx.beginPath(); ctx.arc(ux, uy, px(9 * esc), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ocupados.push({ x: ux - 11 * esc, y: uy - 11 * esc, w: 22 * esc, h: 22 * esc });
      }
      puntas.push({ s, x: ux, y: uy, col });
    }
  });
  const extremos = R0 ? (d.marcasExt ?? []).filter((e) => !log || e.valor > 0) : [];
  if (R0) {
    const Y = Yde(R0), rr = px(9 * esc);
    extremos.forEach((e) => {
      const ex = X(e.x), ey = Y(e.valor);
      ctx.fillStyle = pal.tinta; ctx.strokeStyle = pal.superficie; ctx.lineWidth = px(3 * esc);
      ctx.beginPath(); ctx.arc(ex, ey, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ocupados.push({ x: ex - rr - 2, y: ey - rr - 2, w: 2 * rr + 4, h: 2 * rr + 4 });
    });
  }
  ctx.restore();
  // etiquetas de las líneas de referencia y de los extremos
  if (R0 && (refs.length || extremos.length)) {
    const Y = Yde(R0), ft = px(fs * 0.95), h = ft * 1.35, rr = px(9 * esc);
    ctx.font = fuenteDe(pal, 800, ft);
    const pasos = 10, items: (Etq & { texto: string; col: string })[] = [];
    refs.forEach((l) => {
      const y = Y(l.valor), w = ctx.measureText(l.texto).width + 14, cands: Rect[] = [];
      if (y < pl.y || y > pl.y + pl.h) return;
      for (let k = 0; k <= pasos; k++) {
        const x = pl.x + pl.w - w - ((pl.w - w) * k) / pasos;
        cands.push({ x, y: y - h - 3, w, h }, { x, y: y + 3, w, h });
      }
      items.push({ w, h, cands, texto: l.texto, col: COLOR_REF[l.tipo] });
    });
    extremos.forEach((e) => {
      const ex = X(e.x), ey = Y(e.valor), w = ctx.measureText(e.texto).width + 14, arriba = e.tipo === "max", cands: Rect[] = [];
      const vy = [arriba ? ey - rr - 4 - h : ey + rr + 4, arriba ? ey + rr + 4 : ey - rr - 4 - h];
      [0, 1].forEach((i) => [0.5, 0, 1].forEach((f) => cands.push({ x: ex - w * f, y: vy[i], w, h })));
      cands.push({ x: ex + rr + 6, y: ey - h / 2, w, h }, { x: ex - rr - 6 - w, y: ey - h / 2, w, h });
      items.push({ w, h, cands, texto: e.texto, col: pal.tinta });
    });
    const lugares = ubicarEtiquetas(items, pl, trazos, ocupados, px(4.5 * esc) / 2 + 2);
    items.forEach((it, k) => {
      const r = lugares[k];
      ctx.globalAlpha = 0.88; ctx.fillStyle = pal.superficie; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.globalAlpha = 1;
      ctx.fillStyle = it.col; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(it.texto, r.x + 7, r.y + r.h / 2 + 1);
    });
  }
  // nombre al final de cada línea (sin pisarse entre sí)
  if (conEtq.length) {
    const ft = px(fs * 0.95), alto = ft * 1.25;
    ctx.font = fuenteDe(pal, 800, ft); ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const items = puntas.filter((p) => p.s.etiqueta && p.s.resalte !== "tenue").map((p) => {
      const t = nomEtq(p.s.etiqueta!), w = ctx.measureText(t).width;
      return { t, w, x: Math.min(p.x + px(14 * esc), r.x + r.w - w - 6), y: p.y, col: p.col };
    }).sort((a, b) => a.y - b.y);
    const colocados: typeof items = [];
    items.forEach((it) => {
      colocados.forEach((o) => { if (it.x < o.x + o.w + 4 && o.x < it.x + it.w + 4 && Math.abs(it.y - o.y) < alto) it.y = o.y + alto; });
      it.y = Math.min(it.y, pl.y + pl.h - alto / 2);
      colocados.push(it);
    });
    items.forEach((it) => {
      ctx.globalAlpha = 0.85; ctx.fillStyle = pal.superficie; ctx.fillRect(it.x - 4, it.y - alto / 2, it.w + 8, alto); ctx.globalAlpha = 1;
      ctx.fillStyle = it.col; ctx.fillText(it.t, it.x, it.y + 1);
    });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- filas: una variable entre presidentes, un presidente con varias variables, ranking
type LienzoDe<T extends Lienzo["tipo"]> = Extract<Lienzo, { tipo: T }>;
const MIN_FILA = { barras: 44, variables: 50, velas: 64, ranking: 42, correlacion: 54 } as const;   // alto mínimo legible de una fila (en px del lienzo)
const MAX_FILA = { barras: 150, variables: 118, velas: 120, ranking: 96, correlacion: 84 } as const;
const ALTO_ENC = 32;      // renglón de encabezados de columnas
const ALTO_SIN = 36;      // renglón "Sin datos: …"
const sinDatosDe = (l: Lienzo): string[] => (l.tipo === "barras" || l.tipo === "velas" || l.tipo === "ranking" ? l.sinDatos : []);
const MIN_ELEC = { hoy: { vertical: 380, horizontal: 280 }, dispersion: { vertical: 560, horizontal: 300 } } as const;   // alto mínimo de las imágenes de Elecciones
const MIN_GRILLA = 40, ALTO_ENC_GRILLA = 54;   // alto mínimo de una fila de la grilla de presidentes y de su encabezado (dos renglones)
const MIN_MESES = { vertical: 360, horizontal: 300 } as const;   // alto mínimo de las columnas de "el mismo mes en cada año"

/** Alto mínimo del contenido: con él se elige la escala de texto con la que todo entra. En horizontal las filas pueden ir en dos columnas. */
function minLienzo(l: Lienzo, horiz: boolean): number {
  if (l.tipo === "meses") return horiz ? MIN_MESES.horizontal : MIN_MESES.vertical;
  if (l.tipo === "grilla") return l.filas.length * MIN_GRILLA + ALTO_ENC_GRILLA + 16;
  if (l.tipo === "hoy" || l.tipo === "dispersion") return MIN_ELEC[l.tipo][horiz ? "horizontal" : "vertical"];
  const n = l.filas.length;
  return (horiz ? Math.ceil(n / 2) : n) * MIN_FILA[l.tipo] + ALTO_ENC + (sinDatosDe(l).length ? ALTO_SIN : 0) + 16;
}

/** Reparte las filas: una columna; en horizontal, si no entran con el alto mínimo, dos columnas (primero la de la izquierda). */
function rejilla(r: Rect, n: number, tipo: keyof typeof MIN_FILA, horiz: boolean) {
  const gap = 32, h = r.h - ALTO_ENC;
  const cols = horiz && n > 1 && h / n < MIN_FILA[tipo] ? 2 : 1, per = Math.ceil(n / cols);
  return { cols, per, gap, cw: (r.w - gap * (cols - 1)) / cols, rowH: Math.min(h / per, MAX_FILA[tipo]), y0: r.y + ALTO_ENC };
}
const tamFila = (rowH: number, esc: number) => { const f1 = Math.max(15, Math.min(30 * Math.max(esc, 0.9), rowH * 0.4)); return { f1, f2: Math.max(12, f1 * 0.74) }; };

/** Mayor tamaño (hasta `max`) con el que todos los textos entran en `ancho`: así una columna de números se ve pareja. */
function tamComun(ctx: Ctx, pal: Paleta, textos: string[], o: { peso: number; max: number; min: number; ancho: number }): number {
  for (let t = px(o.max); t > px(o.min); t--) {
    ctx.font = fuenteDe(pal, o.peso, t);
    if (textos.every((x) => ctx.measureText(x).width <= o.ancho)) return t;
  }
  return px(o.min);
}
function encabezado(ctx: Ctx, pal: Paleta, esc: number, y: number, items: { t: string; x: number; w: number; alinear?: CanvasTextAlign }[]) {
  const a = (t: string, w: number) => ajustar(ctx, pal, t.toUpperCase(), { peso: 800, max: 15 * Math.max(esc, 0.9), min: 11, ancho: w, lineas: 1 });
  items.forEach((it) => { const aj = a(it.t, it.w); texto(ctx, pal, aj, 800, it.alinear === "right" ? it.x + it.w : it.x, y, pal.tintaTenue, 1.2, it.alinear ?? "left"); });
}
function separador(ctx: Ctx, pal: Paleta, x: number, y: number, w: number) {
  ctx.fillStyle = pal.grilla; ctx.fillRect(x, y, w, 2);
}
function minigrafico(ctx: Ctx, v: (number | null)[], x: number, y: number, w: number, h: number, color: string, fondo: string) {
  const vals = v.filter((a): a is number => a != null);
  if (vals.length < 2) return;
  const mn = Math.min(...vals), mx = Math.max(...vals), sp = mx - mn || 1;
  const X = (i: number) => x + (i / (v.length - 1)) * w, Y = (a: number) => y + h - ((a - mn) / sp) * h;
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round";
  // los datos trimestrales o anuales tienen huecos entre puntos: se unen igual
  let abierto = false, ult: [number, number] | null = null;
  ctx.beginPath();
  v.forEach((a, i) => { if (a == null) return; if (abierto) ctx.lineTo(X(i), Y(a)); else { ctx.moveTo(X(i), Y(a)); abierto = true; } ult = [X(i), Y(a)]; });
  ctx.stroke();
  if (ult) { ctx.fillStyle = color; ctx.strokeStyle = fondo; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ult[0], ult[1], 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}

function filasBarras(ctx: Ctx, r: Rect, L: LienzoDe<"barras">, pal: Paleta, esc: number, horiz: boolean, cero: boolean) {
  const n = L.filas.length, g = rejilla(r, n, "barras", horiz), { f1, f2 } = tamFila(g.rowH, esc), pad = 14;
  // escala común: un tope para que un valor enorme no aplaste al resto (la barra se corta y el número va completo)
  const abs = L.filas.flatMap((f) => (f.valor == null ? [] : [Math.abs(f.valor)])).sort((a, b) => a - b);
  const maxAbs = abs[abs.length - 1] ?? 0, q = abs[Math.floor(0.75 * (abs.length - 1))] ?? 0;
  const tope = !L.sinTope && abs.length >= 5 && q > 0 && maxAbs > q * 3 ? q * 3 : maxAbs;
  // la línea de referencia (ej. 50 % = mayoría) entra en la escala aunque ninguna barra la alcance
  const pos = Math.min(Math.max(tope, L.ref?.v ?? 0), Math.max(0, L.ref?.v ?? 0, ...L.filas.map((f) => f.valor ?? 0))), neg = Math.min(tope, Math.max(0, ...L.filas.map((f) => -(f.valor ?? 0))));
  const iw = g.cw - 8 - pad * 2, wA = iw * 0.4, wBar = iw * 0.26, wV = iw * 0.32;
  const segundo = (f: FilaBarra) => f.detalle ?? (f.ini != null && f.fin != null ? `${f.ini} → ${f.fin}` : "sin datos");
  const tamR = tamComun(ctx, pal, L.filas.map(segundo), { peso: 600, max: f2, min: 10, ancho: wA });
  // los nombres, todos del mismo tamaño (el que hace entrar al más largo, sin bajar de 0,8 del normal; si aun así no entra, ese se achica solo)
  const tamN = tamComun(ctx, pal, L.filas.map((f) => f.nombre), { peso: 800, max: f1, min: Math.max(12, f1 * 0.8), ancho: wA });
  const tamV = tamComun(ctx, pal, L.filas.map((f) => f.variacion ?? "–"), { peso: 900, max: f1 * 1.15, min: 12, ancho: wV });
  const geom = (cx: number) => { const left = cx + 8 + pad; return { left, xBar: left + wA + iw * 0.02, xV: left + iw - wV, v: left + iw }; };
  for (let c = 0; c < g.cols; c++) {
    const cx = r.x + c * (g.cw + g.gap), q0 = geom(cx);
    encabezado(ctx, pal, esc, r.y + 9, [{ t: L.enc?.nombre ?? "Presidente", x: q0.left, w: wA }, { t: L.enc?.valor ?? "Variación en el mandato", x: q0.xBar, w: wBar + wV + iw * 0.02, alinear: "left" }]);
    const unidad = pos + neg > 0 ? wBar / (pos + neg) : 0, x0 = q0.xBar + neg * unidad;
    if (neg > 0) { ctx.fillStyle = cero ? pal.cero : pal.eje; ctx.fillRect(x0 - 1, g.y0, 3, g.rowH * g.per); }
  }
  L.filas.forEach((f, k) => {
    const c = Math.floor(k / g.per), i = k % g.per, cx = r.x + c * (g.cw + g.gap), y = g.y0 + i * g.rowH, q0 = geom(cx);
    if (i > 0) separador(ctx, pal, cx + pad, y, g.cw - pad * 2);
    ctx.fillStyle = pal.pres[f.id] ?? pal.eje; ctx.fillRect(cx + 8, y + 7, 6, g.rowH - 14);
    const color = f.cls === "neutro" ? pal.acento : colorCls(pal, f.cls);
    const aN = ajustar(ctx, pal, f.nombre, { peso: 800, max: tamN, min: 12, ancho: wA, lineas: 1 });
    const aR = ajustar(ctx, pal, segundo(f), { peso: 600, max: tamR, min: tamR, ancho: wA, lineas: 1 });
    const yt = y + (g.rowH - alto(aN, 1.2) - alto(aR, 1.2)) / 2;
    texto(ctx, pal, aN, 800, q0.left, yt, pal.tinta, 1.2); texto(ctx, pal, aR, 600, q0.left, yt + alto(aN, 1.2), pal.tintaSec, 1.2);
    // barra
    const unidad = pos + neg > 0 ? wBar / (pos + neg) : 0, x0 = q0.xBar + neg * unidad, v = f.valor;
    if (v != null && unidad > 0) {
      const largo = Math.max(3, Math.min(Math.abs(v), tope) * unidad), bh = Math.min(g.rowH * 0.4, 30), by = y + (g.rowH - bh) / 2;
      const bx = v >= 0 ? x0 : x0 - largo;
      ctx.fillStyle = color; ctx.fillRect(bx, by, largo, bh);
      if (Math.abs(v) > tope) {   // cortada: dos marcas en el extremo
        const ex = v >= 0 ? bx + largo - 12 : bx + 12;
        ctx.strokeStyle = pal.superficie; ctx.lineWidth = 3;
        [0, 8].forEach((o) => { ctx.beginPath(); ctx.moveTo(ex + o - 4, by + bh + 2); ctx.lineTo(ex + o + 4, by - 2); ctx.stroke(); });
      }
    }
    // variación con signo y, si hace falta, la marca de datos parciales
    const aV = ajustar(ctx, pal, f.variacion ?? "–", { peso: 900, max: tamV, min: tamV, ancho: wV, lineas: 1 });
    const aNota = f.nota ? ajustar(ctx, pal, f.nota, { peso: 600, max: f2, min: 10, ancho: wV, lineas: 1 }) : null;
    const yv = y + (g.rowH - alto(aV, 1.2) - (aNota ? alto(aNota, 1.2) : 0)) / 2;
    texto(ctx, pal, aV, 900, q0.v, yv, f.variacion ? color : pal.tintaTenue, 1.2, "right");
    if (aNota) texto(ctx, pal, aNota, 600, q0.v, yv + alto(aV, 1.2), pal.tintaTenue, 1.2, "right");
  });
  // línea de referencia punteada sobre las barras, con su nombre arriba (la misma que dice la frase: «Referencia: 50 % = mayoría»)
  if (L.ref && pos + neg > 0) {
    for (let c = 0; c < g.cols; c++) {
      const filasCol = Math.min(g.per, n - c * g.per);
      if (filasCol <= 0) continue;
      const q0 = geom(r.x + c * (g.cw + g.gap)), xr = q0.xBar + (neg + L.ref.v) * (wBar / (pos + neg));
      ctx.save(); ctx.strokeStyle = pal.tintaSec; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(xr, g.y0 + 4); ctx.lineTo(xr, g.y0 + g.rowH * filasCol - 4); ctx.stroke(); ctx.restore();
      const aRef = ajustar(ctx, pal, L.ref.txt, { peso: 700, max: f2, min: 10, ancho: wV, lineas: 1 });
      // el rótulo va centrado sobre la línea, pero nunca encima del encabezado de la columna («Bancas», «Alícuota»)
      ctx.font = fuenteDe(pal, 800, 15 * Math.max(esc, 0.9));
      const finEnc = q0.xBar + ctx.measureText((L.enc?.valor ?? "Variación en el mandato").toUpperCase()).width + 12;
      ctx.font = fuenteDe(pal, 700, aRef.tam);
      const medio = Math.max(xr, finEnc + ctx.measureText(aRef.lineas[0] ?? "").width / 2);
      texto(ctx, pal, aRef, 700, medio, r.y + 9, pal.tintaSec, 1.2, "center");
    }
  }
}

function filasVariables(ctx: Ctx, r: Rect, L: LienzoDe<"variables">, pal: Paleta, esc: number, horiz: boolean) {
  const n = L.filas.length, g = rejilla(r, n, "variables", horiz), { f1, f2 } = tamFila(g.rowH, esc), pad = 14;
  const iw = g.cw - pad * 2, fr = { nom: 0.31, ini: 0.15, fin: 0.15, vr: 0.2, sp: 0.19 };
  const col = (cx: number) => { const x = cx + pad; return { nom: x, ini: x + iw * fr.nom, fin: x + iw * (fr.nom + fr.ini), vr: x + iw * (fr.nom + fr.ini + fr.fin), sp: x + iw * (1 - fr.sp) }; };
  const color = pal.pres[L.presId] ?? pal.acento;
  // tamaños comunes: nombres y columnas de números parejos entre filas
  const wNom = iw * fr.nom - 10, dosOk = g.rowH >= 60, tam2 = Math.min(f1, (g.rowH - 8) / (2 * 1.2 + (f2 / f1) * 1.2));
  const tamNom = Math.min(...L.filas.map((f) => {
    let a = ajustar(ctx, pal, f.nombre, { peso: 800, max: f1, min: f1 * 0.8, ancho: wNom, lineas: 1 });
    if (a.cortado) a = dosOk ? ajustar(ctx, pal, f.nombre, { peso: 800, max: tam2, min: Math.min(tam2, 13), ancho: wNom, lineas: 2 }) : ajustar(ctx, pal, f.nombre, { peso: 800, max: f1, min: 13, ancho: wNom, lineas: 1 });
    return a.tam;
  }));
  const con = L.filas.filter((f) => f.ini != null && f.fin != null);
  const tamIni = tamComun(ctx, pal, con.map((f) => f.ini!), { peso: 600, max: f1 * 0.95, min: 11, ancho: iw * fr.ini - 8 });
  const tamFin = tamComun(ctx, pal, con.map((f) => f.fin!), { peso: 600, max: f1 * 0.95, min: 11, ancho: iw * fr.fin - 8 });
  const tamVar = tamComun(ctx, pal, con.map((f) => f.variacion ?? "–"), { peso: 900, max: f1 * 1.05, min: 11, ancho: iw * fr.vr - 8 });
  for (let c = 0; c < g.cols; c++) {
    const q = col(r.x + c * (g.cw + g.gap));
    encabezado(ctx, pal, esc, r.y + 9, [
      { t: "Variable", x: q.nom, w: iw * fr.nom }, { t: L.enc?.ini ?? "Inicio", x: q.ini, w: iw * fr.ini - 8, alinear: "right" }, { t: L.enc?.fin ?? "Cierre", x: q.fin, w: iw * fr.fin - 8, alinear: "right" },
      { t: L.enc?.vr ?? "Variación", x: q.vr, w: iw * fr.vr - 8, alinear: "right" }, { t: L.enc?.sp ?? "Mandato", x: q.sp + 8, w: iw * fr.sp - 8 },
    ]);
  }
  L.filas.forEach((f, k) => {
    const c = Math.floor(k / g.per), i = k % g.per, cx = r.x + c * (g.cw + g.gap), y = g.y0 + i * g.rowH, q = col(cx);
    if (i > 0) separador(ctx, pal, cx + pad, y, g.cw - pad * 2);
    // el nombre va en un renglón; si para eso habría que achicarlo mucho y la fila es alta, en dos renglones (con un tamaño que deje lugar a la unidad)
    // la fila reserva el alto de su nombre (hasta dos renglones, cortado con "…") más el renglón de la unidad; si el nombre y la unidad no entran juntos, va solo el nombre
    const hMax = g.rowH - 8;
    let aN = ajustar(ctx, pal, f.nombre, { peso: 800, max: tamNom, min: tamNom, ancho: wNom, lineas: dosOk ? 2 : 1 });
    if (alto(aN, 1.2) > hMax) aN = ajustar(ctx, pal, f.nombre, { peso: 800, max: tamNom, min: tamNom, ancho: wNom, lineas: 1 });
    let aU: Ajustado | null = f.unidad ? ajustar(ctx, pal, f.unidad, { peso: 400, max: f2, min: 10, ancho: iw * fr.nom - 10, lineas: 1 }) : null;
    if (aU && alto(aN, 1.2) + alto(aU, 1.2) > hMax) aU = null;
    const yt = y + (g.rowH - alto(aN, 1.2) - (aU ? alto(aU, 1.2) : 0)) / 2;
    texto(ctx, pal, aN, 800, q.nom, yt, pal.tinta, 1.2); if (aU) texto(ctx, pal, aU, 400, q.nom, yt + alto(aN, 1.2), pal.tintaTenue, 1.2);
    if (f.ini == null || f.fin == null) {
      const aS = ajustar(ctx, pal, L.enc?.sinDato ?? "sin datos en este mandato", { peso: 600, max: f1, min: 11, ancho: iw * (1 - fr.nom) - 8, lineas: 1 });
      texto(ctx, pal, aS, 600, q.ini, y + (g.rowH - alto(aS, 1.2)) / 2, pal.tintaTenue, 1.2);
      return;
    }
    const cel = (txt: string, x: number, w: number, peso: number, tinta: string, tam: number) => {
      const a = ajustar(ctx, pal, txt, { peso, max: tam, min: tam, ancho: w - 8, lineas: 1 });
      texto(ctx, pal, a, peso, x + w - 8, y + (g.rowH - alto(a, 1.2)) / 2, tinta, 1.2, "right");
    };
    cel(f.ini, q.ini, iw * fr.ini, 600, pal.tintaSec, tamIni); cel(f.fin, q.fin, iw * fr.fin, 600, pal.tinta, tamFin);
    const colorV = f.cls === "neutro" ? pal.tinta : colorCls(pal, f.cls);
    const aV = ajustar(ctx, pal, f.variacion ?? "–", { peso: 900, max: tamVar, min: tamVar, ancho: iw * fr.vr - 8, lineas: 1 });
    let aNota: Ajustado | null = f.nota ? ajustar(ctx, pal, f.nota, { peso: 600, max: f2, min: 10, ancho: iw * fr.vr - 8, lineas: 1 }) : null;
    if (aNota && alto(aV, 1.2) + alto(aNota, 1.2) > hMax) aNota = null;   // como la unidad: si la nota no entra bajo la variación, va solo la variación
    const yv = y + (g.rowH - alto(aV, 1.2) - (aNota ? alto(aNota, 1.2) : 0)) / 2;
    texto(ctx, pal, aV, 900, q.vr + iw * fr.vr - 8, yv, colorV, 1.2, "right");
    if (aNota) texto(ctx, pal, aNota, 600, q.vr + iw * fr.vr - 8, yv + alto(aV, 1.2), pal.tintaTenue, 1.2, "right");
    const sh = Math.min(g.rowH * 0.5, 40);
    minigrafico(ctx, f.spark, q.sp + 12, y + (g.rowH - sh) / 2, iw * fr.sp - 24, sh, color, pal.superficie);
  });
}

function filasVelas(ctx: Ctx, r: Rect, L: LienzoDe<"velas">, pal: Paleta, esc: number, horiz: boolean, cero: boolean) {
  const n = L.filas.length, g = rejilla(r, n, "velas", horiz), { f1, f2 } = tamFila(g.rowH, esc), pad = 14;
  const iw = g.cw - pad * 2 - 8, fr = { nom: 0.3, vela: 0.46, vr: 0.24 };
  const col = (cx: number) => { const x = cx + 8 + pad; return { nom: x, vela: x + iw * fr.nom, vr: x + iw * (fr.nom + fr.vela) }; };
  // misma escala para todas las velas, como en pantalla
  const lo = Math.min(...L.filas.map((f) => f.min)), hi = Math.max(...L.filas.map((f) => f.max)), rango = hi > lo ? hi - lo : 1;
  const wV = iw * fr.vela - 16, wVar = iw * fr.vr;
  const tamVar = tamComun(ctx, pal, L.filas.map((f) => f.variacion), { peso: 900, max: f1 * 1.1, min: 12, ancho: wVar });
  for (let c = 0; c < g.cols; c++) {
    const q = col(r.x + c * (g.cw + g.gap));
    encabezado(ctx, pal, esc, r.y + 9, [{ t: "Presidente", x: q.nom, w: iw * fr.nom }, { t: "Mínimo, inicio, cierre y máximo", x: q.vela, w: wV }, { t: "Variación", x: q.vr, w: wVar, alinear: "right" }]);
  }
  L.filas.forEach((f, k) => {
    const c = Math.floor(k / g.per), i = k % g.per, cx = r.x + c * (g.cw + g.gap), y = g.y0 + i * g.rowH, q = col(cx);
    if (i > 0) separador(ctx, pal, cx + pad, y, g.cw - pad * 2);
    ctx.fillStyle = pal.pres[f.id] ?? pal.eje; ctx.fillRect(cx + 8, y + 7, 6, g.rowH - 14);
    const color = f.cls === "neutro" ? pal.acento : colorCls(pal, f.cls);
    // nombre y período
    const aN = ajustar(ctx, pal, f.nombre, { peso: 800, max: f1, min: 12, ancho: iw * fr.nom - 10, lineas: 1 });
    const aP = ajustar(ctx, pal, f.periodo, { peso: 600, max: f2, min: 10, ancho: iw * fr.nom - 10, lineas: 1 });
    const yt = y + (g.rowH - alto(aN, 1.2) - alto(aP, 1.2)) / 2;
    texto(ctx, pal, aN, 800, q.nom + 6, yt, pal.tinta, 1.2); texto(ctx, pal, aP, 600, q.nom + 6, yt + alto(aN, 1.2), pal.tintaSec, 1.2);
    // la vela y, debajo, sus cuatro valores
    const aV = ajustar(ctx, pal, `Mín. ${f.minTxt} · Inicio ${f.iniTxt} · Cierre ${f.finTxt} · Máx. ${f.maxTxt}`, { peso: 600, max: f2, min: 10, ancho: wV, lineas: 1 });
    const hTxt = alto(aV, 1.2), hVela = Math.min(g.rowH - hTxt - 12, 34), yVela = y + (g.rowH - hVela - hTxt - 4) / 2, yc = yVela + hVela / 2;
    const X = (v: number) => q.vela + ((v - lo) / rango) * wV;
    if (lo < 0 && hi > 0) { ctx.fillStyle = cero ? pal.cero : pal.eje; ctx.fillRect(X(0) - 1, yVela, 3, hVela); }
    ctx.fillStyle = pal.tintaTenue; ctx.fillRect(X(f.min), yc - 1.5, Math.max(2, X(f.max) - X(f.min)), 3);
    ctx.fillRect(X(f.min) - 1.5, yc - hVela * 0.3, 3, hVela * 0.6); ctx.fillRect(X(f.max) - 1.5, yc - hVela * 0.3, 3, hVela * 0.6);
    const xa = Math.min(X(f.ini), X(f.fin)), wa = Math.max(Math.abs(X(f.fin) - X(f.ini)), 4);
    ctx.fillStyle = color; ctx.fillRect(xa, yVela + hVela * 0.1, wa, hVela * 0.8);
    texto(ctx, pal, aV, 600, q.vela, yVela + hVela + 4, pal.tintaSec, 1.2);
    // variación con signo y, si hace falta, la marca de datos parciales
    const aVr = ajustar(ctx, pal, f.variacion, { peso: 900, max: tamVar, min: tamVar, ancho: wVar, lineas: 1 });
    const aNota = f.nota ? ajustar(ctx, pal, f.nota, { peso: 600, max: f2, min: 10, ancho: wVar, lineas: 1 }) : null;
    const yv = y + (g.rowH - alto(aVr, 1.2) - (aNota ? alto(aNota, 1.2) : 0)) / 2;
    texto(ctx, pal, aVr, 900, q.vr + wVar, yv, f.cls === "neutro" ? pal.tinta : color, 1.2, "right");
    if (aNota) texto(ctx, pal, aNota, 600, q.vr + wVar, yv + alto(aVr, 1.2), pal.tintaTenue, 1.2, "right");
  });
}

function filasRanking(ctx: Ctx, r: Rect, L: LienzoDe<"ranking">, pal: Paleta, esc: number, horiz: boolean) {
  const n = L.filas.length, g = rejilla(r, n, "ranking", horiz), { f1, f2 } = tamFila(g.rowH, esc), pad = 14;
  const iw = g.cw - pad * 2, fr = { pu: 0.08, nom: 0.3, bar: 0.34, sc: 0.1, ind: 0.18 };
  const col = (cx: number) => { const x = cx + pad; return { pu: x, nom: x + iw * fr.pu, bar: x + iw * (fr.pu + fr.nom), sc: x + iw * (fr.pu + fr.nom + fr.bar), ind: x + iw * (1 - fr.ind) }; };
  for (let c = 0; c < g.cols; c++) {
    const q = col(r.x + c * (g.cw + g.gap));
    encabezado(ctx, pal, esc, r.y + 9, [{ t: "#", x: q.pu, w: iw * fr.pu }, { t: "Presidente", x: q.nom, w: iw * fr.nom }, { t: "Puntaje de 0 a 100", x: q.bar, w: iw * (fr.bar + fr.sc) },
      { t: "Indicadores", x: q.ind, w: iw * fr.ind, alinear: "right" }]);
  }
  L.filas.forEach((f, k) => {
    const c = Math.floor(k / g.per), i = k % g.per, cx = r.x + c * (g.cw + g.gap), y = g.y0 + i * g.rowH, q = col(cx), color = pal.pres[f.id] ?? pal.acento;
    if (i > 0) separador(ctx, pal, cx + pad, y, g.cw - pad * 2);
    const mid = (a: Ajustado) => y + (g.rowH - alto(a, 1.2)) / 2;
    const aP = ajustar(ctx, pal, String(f.puesto), { peso: 900, max: f1 * 1.2, min: 12, ancho: iw * fr.pu - 4, lineas: 1 });
    texto(ctx, pal, aP, 900, q.pu, mid(aP), pal.tinta, 1.2);
    ctx.fillStyle = color; ctx.fillRect(q.nom - 2, y + 8, 6, g.rowH - 16);
    const aN = ajustar(ctx, pal, f.nombre, { peso: 800, max: f1, min: 12, ancho: iw * fr.nom - 16, lineas: 1 });
    texto(ctx, pal, aN, 800, q.nom + 12, mid(aN), pal.tinta, 1.2);
    const wb = iw * fr.bar - 12, bh = Math.min(g.rowH * 0.42, 28), by = y + (g.rowH - bh) / 2;
    ctx.fillStyle = pal.grilla; ctx.fillRect(q.bar, by, wb, bh);
    ctx.fillStyle = color; ctx.fillRect(q.bar, by, Math.max(3, (wb * Math.max(0, Math.min(100, f.score))) / 100), bh);
    const aS = ajustar(ctx, pal, nf0.format(f.score), { peso: 900, max: f1 * 1.1, min: 12, ancho: iw * fr.sc - 4, lineas: 1 });
    texto(ctx, pal, aS, 900, q.sc, mid(aS), pal.tinta, 1.2);
    const aI = ajustar(ctx, pal, `${f.indicadores} ${f.indicadores === 1 ? "indicador" : "indicadores"}`, { peso: 600, max: f2 * 1.1, min: 10, ancho: iw * fr.ind, lineas: 1 });
    texto(ctx, pal, aI, 600, q.ind + iw * fr.ind, mid(aI), pal.tintaSec, 1.2, "right");
  });
}

/** El contenido de la imagen cuando no es un gráfico de líneas: el marco, las filas y la línea de "Sin datos". */
function lienzoFilas(ctx: Ctx, r: Rect, d: DatosImagen, pal: Paleta, esc: number, horiz: boolean) {
  const L = d.lienzo!;
  const cero = d.cero !== false;
  if (L.tipo === "meses") { columnasMeses(ctx, r, L, pal, esc, cero); return; }
  if (L.tipo === "grilla") { tablaGrilla(ctx, r, L, pal, esc); return; }
  if (L.tipo === "hoy") { tarjetaHoy(ctx, r, L, pal, esc); return; }
  if (L.tipo === "dispersion") { dispersiones(ctx, r, L, pal, esc, horiz); return; }
  const sin = sinDatosDe(L), hSin = sin.length ? ALTO_SIN : 0;
  const g = rejilla({ ...r, h: r.h - hSin }, L.filas.length, L.tipo, horiz);
  r = { ...r, h: Math.min(r.h, ALTO_ENC + g.per * g.rowH + hSin + 6) };   // el marco se ajusta a las filas: sin vacío debajo
  const caja = { x: r.x, y: r.y, w: r.w, h: r.h - hSin };
  ctx.fillStyle = pal.superficie; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = pal.borde; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x + 2, r.y + 2, r.w - 4, r.h - 4); ctx.clip();
  if (L.tipo === "barras") filasBarras(ctx, caja, L, pal, esc, horiz, cero);
  else if (L.tipo === "variables") filasVariables(ctx, caja, L, pal, esc, horiz);
  else if (L.tipo === "velas") filasVelas(ctx, caja, L, pal, esc, horiz, cero);
  else if (L.tipo === "correlacion") filasCorrelacion(ctx, caja, L, pal, esc, horiz);
  else filasRanking(ctx, caja, L, pal, esc, horiz);
  if (sin.length) {
    const a = ajustar(ctx, pal, `${(L.tipo === "barras" && L.sinTitulo) || "Sin datos"}: ${sin.join(", ")}`, { peso: 600, max: 22 * Math.max(esc, 0.9), min: 13, ancho: r.w - 40, lineas: 1 });
    texto(ctx, pal, a, 600, r.x + 20, r.y + r.h - hSin + (hSin - alto(a, 1.2)) / 2, pal.tintaSec, 1.2);
  }
  ctx.restore();
}

/** "Todos los presidentes, de un vistazo": una fila por presidente y una columna por dato clave, con el mismo texto de cada celda que la pantalla.
 *  Con `calor`, cada celda lleva un fondo verde (mejor lugar de la columna) o rojo (peor), más intenso cuanto más lejos del medio; el texto con signo se mantiene siempre. */
function tablaGrilla(ctx: Ctx, r: Rect, L: LienzoDe<"grilla">, pal: Paleta, esc: number) {
  const n = L.filas.length, nc = L.columnas.length;
  const pad = 14, hEnc = ALTO_ENC_GRILLA, rowH = Math.min((r.h - hEnc - 8) / Math.max(1, n), 96);
  const alt = Math.min(r.h, hEnc + n * rowH + 8);
  ctx.fillStyle = pal.superficie; ctx.fillRect(r.x, r.y, r.w, alt);
  ctx.strokeStyle = pal.borde; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, alt - 2);
  if (!n || !nc) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x + 2, r.y + 2, r.w - 4, alt - 4); ctx.clip();
  const iw = r.w - pad * 2, wNom = iw * 0.24, wc = (iw - wNom) / nc, x0 = r.x + pad;
  const { f1, f2 } = tamFila(rowH, esc);
  // encabezado de dos renglones: el dato y, debajo, qué se mide
  L.columnas.forEach((c, j) => {
    const cx = x0 + wNom + j * wc + wc / 2;
    const a1 = ajustar(ctx, pal, c.nombre.toUpperCase(), { peso: 800, max: 15 * Math.max(esc, 0.9), min: 10, ancho: wc - 8, lineas: 1 });
    const a2 = ajustar(ctx, pal, c.metrica.toLowerCase(), { peso: 600, max: 14 * Math.max(esc, 0.9), min: 10, ancho: wc - 8, lineas: 1 });
    texto(ctx, pal, a1, 800, cx, r.y + 8, pal.tintaTenue, 1.2, "center");
    texto(ctx, pal, a2, 600, cx, r.y + 8 + alto(a1, 1.2), pal.tintaTenue, 1.2, "center");
  });
  encabezado(ctx, pal, esc, r.y + 8, [{ t: "Presidente", x: x0 + 8, w: wNom - 8 }]);
  const textos = L.filas.flatMap((f) => f.celdas.map((c) => c.texto));
  const tamC = tamComun(ctx, pal, textos, { peso: 800, max: f1 * 1.05, min: 10, ancho: wc - 14 });
  L.filas.forEach((f, i) => {
    const y = r.y + hEnc + i * rowH;
    separador(ctx, pal, r.x + pad, y, iw);
    ctx.fillStyle = pal.pres[f.id] ?? pal.eje; ctx.fillRect(x0, y + 7, 6, rowH - 14);
    const dosOk = rowH >= 50;
    const aN = ajustar(ctx, pal, f.nombre, { peso: 800, max: f1, min: 11, ancho: wNom - 22, lineas: 1 });
    const aP = dosOk ? ajustar(ctx, pal, f.periodo, { peso: 600, max: f2, min: 10, ancho: wNom - 22, lineas: 1 }) : null;
    const yt = y + (rowH - alto(aN, 1.2) - (aP ? alto(aP, 1.2) : 0)) / 2;
    texto(ctx, pal, aN, 800, x0 + 16, yt, pal.tinta, 1.2); if (aP) texto(ctx, pal, aP, 600, x0 + 16, yt + alto(aN, 1.2), pal.tintaSec, 1.2);
    f.celdas.forEach((c, j) => {
      const cx = x0 + wNom + j * wc;
      if (L.calor && c.cls !== "neutro") {   // misma intensidad que la pantalla (fondoCalor): 10 % a 60 % según el lugar entre los presidentes
        ctx.globalAlpha = 0.1 + 0.5 * (c.calor ?? 0); ctx.fillStyle = c.cls === "bueno" ? pal.bueno : pal.malo;
        ctx.fillRect(cx + 3, y + 4, wc - 6, rowH - 8); ctx.globalAlpha = 1;
      }
      const a = ajustar(ctx, pal, c.texto, { peso: 800, max: tamC, min: tamC, ancho: wc - 10, lineas: 1 });
      const tinta = c.texto === "—" ? pal.tintaTenue : L.calor ? pal.tinta : c.cls === "neutro" ? pal.tinta : colorCls(pal, c.cls);
      texto(ctx, pal, a, 800, cx + wc / 2, y + (rowH - alto(a, 1.2)) / 2, tinta, 1.2, "center");
    });
  });
  ctx.restore();
}

/** "El mismo mes en cada año" (pedido 13): una columna por año, desde 0, como `components/sistema/BarrasMes.tsx`. El último año en celeste
 *  con su valor arriba; el de "el más bajo/alto desde…" en ámbar con su año y valor; los demás apagados. Primer y último año debajo. */
function columnasMeses(ctx: Ctx, r: Rect, L: LienzoDe<"meses">, pal: Paleta, esc: number, cero: boolean) {
  const N = L.filas.length;
  if (!N) return;
  ctx.fillStyle = pal.superficie; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = pal.borde; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  const pad = 24, fVal = px(Math.max(16, 28 * Math.max(esc, 0.9))), fAnio = px(Math.max(13, 20 * Math.max(esc, 0.9))), renglon = fVal * 1.25;
  const x0 = r.x + pad, x1 = r.x + r.w - pad;
  const fila1 = r.y + pad + fVal, fila2 = fila1 + renglon;   // dos renglones arriba para los rótulos: nunca tapan una columna
  const top = fila2 + 10, bottom = r.y + r.h - pad - fAnio * 1.5;
  const vals = L.filas.map((f) => f.valor);
  const mn = Math.min(0, ...vals);
  let mx = Math.max(0, ...vals);
  if (mx === mn) mx = mn + 1;
  const Y = (v: number) => top + ((mx - v) / (mx - mn)) * (bottom - top), y0 = Y(0);
  const banda = (x1 - x0) / N, bw = banda >= 6 ? banda * 0.7 : Math.max(1, banda - 1);
  const xCol = (i: number) => x0 + i * banda + (banda - bw) / 2;
  L.filas.forEach((f, i) => {
    const a = Y(f.valor), y = Math.min(a, y0), h = Math.max(2, Math.abs(a - y0));
    ctx.globalAlpha = f.actual || f.ref ? 1 : 0.45;
    ctx.fillStyle = f.actual ? pal.acento : f.ref ? pal.accion : pal.tintaTenue;
    ctx.fillRect(xCol(i), y, bw, h);
  });
  ctx.globalAlpha = 1;
  if (mn < 0) { ctx.fillStyle = cero ? pal.cero : pal.eje; ctx.fillRect(x0, y0 - (cero ? 1.5 : 0.5), x1 - x0, cero ? 3 : 1); }   // cruza el cero: línea propia (R20), salvo que se haya apagado
  else { ctx.fillStyle = pal.eje; ctx.fillRect(x0, y0 - 1, x1 - x0, 2); }
  // rótulos: arriba de las columnas que quedan debajo (sin taparlas); si el del año actual y el de referencia chocan, cada uno en su renglón
  ctx.textBaseline = "alphabetic";
  const rotulo = (i: number, t: string) => {
    ctx.font = fuenteDe(pal, 800, fVal);
    const w = Math.min(ctx.measureText(t).width, x1 - x0), cx = xCol(i) + bw / 2;
    const xa = Math.max(x0, Math.min(x1 - w, cx - w / 2));
    let tope = Infinity;
    L.filas.forEach((f, k) => { const a = x0 + k * banda, b = a + banda; if (b > xa && a < xa + w) tope = Math.min(tope, Y(f.valor), y0); });
    return { t, x: xa, w, y: Math.max(fila1, Math.min(top - 4, tope - 8)) };
  };
  const iAct = L.filas.findIndex((f) => f.actual), iRef = L.filas.findIndex((f) => f.ref);
  const act = iAct >= 0 ? rotulo(iAct, L.filas[iAct].texto) : null;
  const ref = iRef >= 0 ? rotulo(iRef, `${L.filas[iRef].anio}: ${L.filas[iRef].texto}`) : null;
  if (act && ref && act.x < ref.x + ref.w + 12 && ref.x < act.x + act.w + 12 && Math.abs(act.y - ref.y) < renglon) {
    if (ref.y <= act.y) { ref.y = fila1; act.y = Math.max(fila2, act.y); } else { act.y = fila1; ref.y = Math.max(fila2, ref.y); }
  }
  // si el rótulo quedó lejos de su columna (por otras más altas debajo del texto), una línea fina lo une con ella
  const guia = (i: number, y: number, color: string) => {
    const cx = xCol(i) + bw / 2, yb = Math.min(Y(L.filas[i].valor), y0) - 6;
    if (yb - (y + 8) < 14) return;
    ctx.fillStyle = color; ctx.globalAlpha = 0.6; ctx.fillRect(cx - 1, y + 8, 2, yb - (y + 8)); ctx.globalAlpha = 1;
  };
  if (ref) guia(iRef, ref.y, pal.accion);
  if (act) guia(iAct, act.y, pal.acento);
  ctx.font = fuenteDe(pal, 800, fVal); ctx.textAlign = "left";
  if (ref) { ctx.fillStyle = pal.accion; ctx.fillText(recortarPuntos(ctx, ref.t, x1 - x0), ref.x, ref.y); }
  if (act) { ctx.fillStyle = pal.acento; ctx.fillText(recortarPuntos(ctx, act.t, x1 - x0), act.x, act.y); }
  // años del primero y del último, debajo del eje
  ctx.font = fuenteDe(pal, 600, fAnio); ctx.fillStyle = pal.tintaSec;
  const yAnio = r.y + r.h - pad;
  ctx.textAlign = "left"; ctx.fillText(L.filas[0].anio, x0, yAnio);
  if (N > 1) { ctx.textAlign = "right"; ctx.fillText(L.filas[N - 1].anio, x1, yAnio); }
}

// ---------------------------------------------------------------- Elecciones (V7)
/** "Qué dicen los datos sobre el voto al oficialismo hoy": la cifra grande, lo que mide y las frases que la explican. */
function tarjetaHoy(ctx: Ctx, r: Rect, L: LienzoDe<"hoy">, pal: Paleta, esc: number) {
  const pad = 28, ancho = r.w - pad * 2, S = Math.max(esc, 0.9);
  const bloques: { a: Ajustado; peso: number; color: string; antes: number }[] = [];
  const poner = (t: string, peso: number, max: number, min: number, lineas: number, color: string, antes: number) => {
    const a = ajustar(ctx, pal, t, { peso, max, min, ancho, lineas }); bloques.push({ a, peso, color, antes });
  };
  if (L.cifra) {
    poner(L.cifra, 900, Math.min(170 * S, r.h * 0.3), 56, 1, pal.acento, 0);
    poner(L.rotulo, 600, 30 * S, 17, 2, pal.tintaSec, 6);
  }
  L.frases.forEach((f, k) => poner(f, 600, 26 * S, 16, 3, pal.tinta, k === 0 ? (L.cifra ? 26 : 0) : 12));
  if (L.referencia) poner(L.referencia, 600, 24 * S, 16, 3, pal.tintaSec, 18);
  const hCont = bloques.reduce((s, b) => s + b.antes + alto(b.a, 1.2), 0), alt = Math.min(r.h, hCont + pad * 2);
  ctx.fillStyle = pal.superficie; ctx.fillRect(r.x, r.y, r.w, alt);
  ctx.strokeStyle = pal.borde; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, alt - 2);
  ctx.fillStyle = pal.acento; ctx.fillRect(r.x, r.y, 8, alt);
  ctx.save(); ctx.beginPath(); ctx.rect(r.x + 2, r.y + 2, r.w - 4, alt - 4); ctx.clip();
  let y = r.y + pad;
  bloques.forEach((b) => { y += b.antes; texto(ctx, pal, b.a, b.peso, r.x + pad, y, b.color, 1.2); y += alto(b.a, 1.2); });
  ctx.restore();
}

interface CajaE { x0: number; y0: number; x1: number; y1: number }
const chocaE = (a: CajaE, b: CajaE) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
/** R15: prueba arriba a la derecha, derecha, arriba, izquierda y abajo del punto, y toma la primera caja libre dentro del área (sin tapar puntos, la recta ni otras etiquetas);
 *  si ninguna está libre, la lleva al borde de arriba del gráfico, corrida hasta un hueco, unida al punto con una línea fina de puntos. */
function ubicarEtq(ax: number, ay: number, w: number, h: number, area: CajaE, ocupado: CajaE[]): { caja: CajaE; ancla: CanvasTextAlign; guia: boolean } {
  const g = 9;
  const cands: [CajaE, CanvasTextAlign][] = [
    [{ x0: ax + g, y0: ay - 4 - h, x1: ax + g + w, y1: ay - 4 }, "left"],
    [{ x0: ax + g + 2, y0: ay - h / 2, x1: ax + g + 2 + w, y1: ay + h / 2 }, "left"],
    [{ x0: ax - w / 2, y0: ay - g - h, x1: ax + w / 2, y1: ay - g }, "center"],
    [{ x0: ax - g - 2 - w, y0: ay - h / 2, x1: ax - g - 2, y1: ay + h / 2 }, "right"],
    [{ x0: ax - w / 2, y0: ay + g, x1: ax + w / 2, y1: ay + g + h }, "center"],
  ];
  for (const [c, ancla] of cands) {
    if (c.x0 < area.x0 || c.x1 > area.x1 || c.y0 < area.y0 || c.y1 > area.y1) continue;
    if (!ocupado.some((o) => chocaE(c, o))) return { caja: c, ancla, guia: false };
  }
  let x0 = Math.max(area.x0, Math.min(ax - w / 2, area.x1 - w));
  let caja: CajaE = { x0, y0: area.y0, x1: x0 + w, y1: area.y0 + h };
  for (let k = 0; k < 80 && ocupado.some((o) => chocaE(caja, o)) && caja.x1 + 4 <= area.x1; k++) { x0 += 4; caja = { x0, y0: area.y0, x1: x0 + w, y1: area.y0 + h }; }
  return { caja, ancla: "center", guia: true };
}

/** Gráficos de dispersión: una cuadrícula de hasta 4 (2 × 2, o los 4 en fila en 16:9). Puntos llenos = presidencial, vacíos = legislativa; rombo = hoy; recta de ajuste punteada.
 *  Cada punto lleva su año; las etiquetas no se pisan (R15). Los ejes llevan su nombre. */
function dispersiones(ctx: Ctx, r: Rect, L: LienzoDe<"dispersion">, pal: Paleta, esc: number, horiz: boolean) {
  const n = L.graficos.length;
  if (!n) return;
  ctx.fillStyle = pal.superficie; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = pal.borde; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  const S = Math.max(esc, 0.9), pad = 22, gap = 26;
  const cols = horiz ? Math.min(n, 4) : Math.min(n, 2), rows = Math.ceil(n / cols);
  const cw = (r.w - pad * 2 - gap * (cols - 1)) / cols, ch = (r.h - pad * 2 - gap * (rows - 1)) / rows;
  const fT = px(Math.max(14, 20 * S)), fS = px(Math.max(12, 16 * S)), fTick = px(Math.max(12, 14 * S));
  L.graficos.forEach((G, k) => {
    const cx = r.x + pad + (k % cols) * (cw + gap), cy = r.y + pad + Math.floor(k / cols) * (ch + gap);
    ctx.save(); ctx.beginPath(); ctx.rect(cx - 4, cy - 4, cw + 8, ch + 8); ctx.clip();
    const aN = ajustar(ctx, pal, G.nombre, { peso: 800, max: fT, min: 12, ancho: cw, lineas: 1 });
    const aS = ajustar(ctx, pal, G.sub, { peso: 600, max: fS, min: 11, ancho: cw, lineas: 1 });
    texto(ctx, pal, aN, 800, cx, cy, pal.tinta, 1.2); texto(ctx, pal, aS, 600, cx, cy + alto(aN, 1.2), pal.tintaSec, 1.2);
    const head = alto(aN, 1.2) + alto(aS, 1.2) + 10;
    ctx.font = fuenteDe(pal, 600, fTick);
    const wYt = Math.max(0, ...G.yTicks.map((t) => ctx.measureText(t.t).width));
    const pl = { x0: cx + wYt + fTick * 1.3 + 12, x1: cx + cw - 10, y0: cy + head + 8, y1: cy + ch - fTick * 2.7 - 8 };
    if (pl.x1 - pl.x0 < 50 || pl.y1 - pl.y0 < 50) { ctx.restore(); return; }
    const X = (v: number) => pl.x0 + ((v - G.x0) / (G.x1 - G.x0 || 1)) * (pl.x1 - pl.x0), Y = (v: number) => pl.y1 - ((v - G.y0) / (G.y1 - G.y0 || 1)) * (pl.y1 - pl.y0);
    // rejilla y números de los ejes
    ctx.textBaseline = "middle"; ctx.textAlign = "right";
    G.yTicks.forEach((t) => { const y = Y(t.v); ctx.fillStyle = pal.grilla; ctx.fillRect(pl.x0, y - 0.5, pl.x1 - pl.x0, 1.5); ctx.font = fuenteDe(pal, 600, fTick); ctx.fillStyle = pal.tintaTenue; ctx.fillText(t.t, pl.x0 - 6, y); });
    ctx.textBaseline = "top"; ctx.textAlign = "center";
    G.xTicks.forEach((t) => { ctx.font = fuenteDe(pal, 600, fTick); ctx.fillStyle = pal.tintaTenue; ctx.fillText(t.t, Math.max(pl.x0 + 8, Math.min(pl.x1 - 8, X(t.v))), pl.y1 + 5); });
    ctx.fillStyle = pal.eje; ctx.fillRect(pl.x0 - 1, pl.y0, 2, pl.y1 - pl.y0); ctx.fillRect(pl.x0, pl.y1 - 1, pl.x1 - pl.x0, 2);
    // nombre de cada eje
    const aX = ajustar(ctx, pal, G.ejeX, { peso: 600, max: fTick, min: 10, ancho: pl.x1 - pl.x0, lineas: 1 });
    texto(ctx, pal, aX, 600, (pl.x0 + pl.x1) / 2, pl.y1 + 5 + fTick * 1.35, pal.tintaSec, 1.2, "center");
    const aY = ajustar(ctx, pal, G.ejeY, { peso: 600, max: fTick, min: 10, ancho: pl.y1 - pl.y0, lineas: 1 });
    ctx.save(); ctx.translate(cx, (pl.y0 + pl.y1) / 2); ctx.rotate(-Math.PI / 2); texto(ctx, pal, aY, 600, 0, 0, pal.tintaSec, 1.2, "center"); ctx.restore();
    // lo que ya ocupa lugar: puntos, recta y marcador de hoy
    const rp = 6.5, ocupado: CajaE[] = G.pts.map((q) => ({ x0: X(q.x) - rp - 1, y0: Y(q.y) - rp - 1, x1: X(q.x) + rp + 1, y1: Y(q.y) + rp + 1 }));
    ctx.save(); ctx.beginPath(); ctx.rect(pl.x0, pl.y0, pl.x1 - pl.x0, pl.y1 - pl.y0); ctx.clip();
    if (G.recta) {
      const { a, b } = G.recta;
      ctx.strokeStyle = pal.tintaSec; ctx.globalAlpha = 0.8; ctx.lineWidth = 2.5; ctx.setLineDash([9, 7]);
      ctx.beginPath(); ctx.moveTo(X(G.x0), Y(a + b * G.x0)); ctx.lineTo(X(G.x1), Y(a + b * G.x1)); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      for (let i = 0; i <= 60; i++) { const xv = G.x0 + ((G.x1 - G.x0) * i) / 60, qx = X(xv), qy = Y(a + b * xv); ocupado.push({ x0: qx - 3, y0: qy - 3, x1: qx + 3, y1: qy + 3 }); }
    }
    let etHoy: ReturnType<typeof ubicarEtq> | null = null, lineasHoy: string[] = [];
    const area: CajaE = { x0: pl.x0 + 2, y0: pl.y0 + 2, x1: pl.x1 - 2, y1: pl.y1 - 2 };
    ctx.font = fuenteDe(pal, 800, fTick);
    const hh = fTick * 1.2;
    if (G.hoy) {
      const hx = X(G.hoy.x), hy = Y(G.hoy.y);
      ocupado.push({ x0: hx - 10, y0: hy - 11, x1: hx + 10, y1: hy + 11 }, { x0: pl.x0, y0: hy - 2, x1: hx, y1: hy + 2 });
      lineasHoy = G.hoy.extra ? [G.hoy.txt, G.hoy.extra] : [G.hoy.txt];
      const w = Math.max(...lineasHoy.map((l) => ctx.measureText(l).width)) + 4;
      etHoy = ubicarEtq(hx, hy, w, hh * lineasHoy.length, area, ocupado);
      ocupado.push(etHoy.caja);
    }
    ctx.font = fuenteDe(pal, 600, fTick);
    const etqs = G.pts.map((q) => {
      const u = ubicarEtq(X(q.x), Y(q.y), ctx.measureText(q.etq).width + 2, hh, area, ocupado);
      ocupado.push(u.caja);
      return u;
    });
    const poner = (u: ReturnType<typeof ubicarEtq>, lineas: string[], ax: number, ay: number, peso: number, color: string) => {
      const tx = u.ancla === "left" ? u.caja.x0 : u.ancla === "right" ? u.caja.x1 : (u.caja.x0 + u.caja.x1) / 2;
      if (u.guia) { ctx.strokeStyle = pal.tintaTenue; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo((u.caja.x0 + u.caja.x1) / 2, u.caja.y1); ctx.stroke(); ctx.setLineDash([]); }
      ctx.font = fuenteDe(pal, peso, fTick); ctx.fillStyle = color; ctx.textAlign = u.ancla; ctx.textBaseline = "top";
      lineas.forEach((l, i) => ctx.fillText(l, tx, u.caja.y0 + i * hh));
    };
    if (G.hoy && etHoy) {
      const hx = X(G.hoy.x), hy = Y(G.hoy.y);
      ctx.strokeStyle = pal.accion; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(pl.x0, hy); ctx.lineTo(hx, hy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = pal.accion; ctx.strokeStyle = pal.superficie; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx, hy - 9); ctx.lineTo(hx + 8, hy); ctx.lineTo(hx, hy + 9); ctx.lineTo(hx - 8, hy); ctx.closePath(); ctx.fill(); ctx.stroke();
      poner(etHoy, lineasHoy, hx, hy, 800, pal.tinta);
    }
    G.pts.forEach((q, i) => {
      const px0 = X(q.x), py0 = Y(q.y);
      ctx.fillStyle = q.pres ? pal.acento : pal.superficie; ctx.strokeStyle = pal.acento; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(px0, py0, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      poner(etqs[i], [q.etq], px0, py0, 600, pal.tintaSec);
    });
    ctx.restore(); ctx.restore();
  });
}

/** Correlación de cada variable con el voto: una barra horizontal por variable desde el cero (a la derecha, positiva; a la izquierda, negativa) y su valor con signo.
 *  Los colores distinguen el signo (no si es favorable o no); el signo va siempre escrito. */
function filasCorrelacion(ctx: Ctx, r: Rect, L: LienzoDe<"correlacion">, pal: Paleta, esc: number, horiz: boolean) {
  const n = L.filas.length, g = rejilla(r, n, "correlacion", horiz), { f1, f2 } = tamFila(g.rowH, esc), pad = 14;
  const iw = g.cw - pad * 2, fr = { nom: 0.4, bar: 0.4, val: 0.2 };
  const col = (cx: number) => { const x = cx + pad; return { nom: x, bar: x + iw * fr.nom, val: x + iw }; };
  const wNom = iw * fr.nom - 14, wBar = iw * fr.bar - 16, wVal = iw * fr.val - 4;
  const tamVal = tamComun(ctx, pal, L.filas.map((f) => f.rTxt), { peso: 900, max: f1 * 1.15, min: 12, ancho: wVal });
  const tamNomC = Math.max(13, Math.min(f1, tamComun(ctx, pal, L.filas.map((f) => f.nombre), { peso: 800, max: f1, min: 13, ancho: wNom })));
  for (let c = 0; c < g.cols; c++) {
    const q = col(r.x + c * (g.cw + g.gap));
    encabezado(ctx, pal, esc, r.y + 9, [{ t: "Variable", x: q.nom, w: wNom }, { t: "Correlación (de −1 a +1)", x: q.bar, w: wBar }, { t: "r", x: q.val - wVal, w: wVal, alinear: "right" }]);
  }
  L.filas.forEach((f, k) => {
    const c = Math.floor(k / g.per), i = k % g.per, cx = r.x + c * (g.cw + g.gap), y = g.y0 + i * g.rowH, q = col(cx);
    if (i > 0) separador(ctx, pal, cx + pad, y, g.cw - pad * 2);
    // un solo tamaño para todos los nombres (que no salten de tamaño entre filas); el que no entra en un renglón baja a dos
    let aN = ajustar(ctx, pal, f.nombre, { peso: 800, max: tamNomC, min: tamNomC, ancho: wNom, lineas: 2 });
    if (aN.lineas.length > 1 && alto(aN, 1.2) > g.rowH - 8) aN = ajustar(ctx, pal, f.nombre, { peso: 800, max: tamNomC, min: tamNomC, ancho: wNom, lineas: 1 });
    let aD: Ajustado | null = ajustar(ctx, pal, f.detalle, { peso: 600, max: f2, min: 10, ancho: wNom, lineas: 1 });
    if (alto(aN, 1.2) + alto(aD, 1.2) > g.rowH - 6) aD = null;
    const yt = y + (g.rowH - alto(aN, 1.2) - (aD ? alto(aD, 1.2) : 0)) / 2;
    texto(ctx, pal, aN, 800, q.nom, yt, pal.tinta, 1.2); if (aD) texto(ctx, pal, aD, 600, q.nom, yt + alto(aN, 1.2), pal.tintaSec, 1.2);
    const bh = Math.min(g.rowH * 0.42, 28), by = y + (g.rowH - bh) / 2, xm = q.bar + wBar / 2, mitad = wBar / 2;
    ctx.fillStyle = pal.grilla; ctx.fillRect(q.bar, by, wBar, bh);
    const largo = Math.max(3, Math.min(1, Math.abs(f.r)) * mitad);
    ctx.fillStyle = f.r >= 0 ? pal.acento : pal.accion; ctx.fillRect(f.r >= 0 ? xm : xm - largo, by, largo, bh);
    ctx.fillStyle = pal.eje; ctx.fillRect(xm - 1, by - 4, 3, bh + 8);
    const aV = ajustar(ctx, pal, f.rTxt, { peso: 900, max: tamVal, min: tamVal, ancho: wVal, lineas: 1 });
    texto(ctx, pal, aV, 900, q.val, y + (g.rowH - alto(aV, 1.2)) / 2, pal.tinta, 1.2, "right");
  });
}

// ---------------------------------------------------------------- tarjetas
interface PlanTarjetas {
  tipo: "pres" | "gen"; items: TarjetaImg[]; nombres: string[]; filas: number; cols: number; gap: number; tw: number; cardH: number; alto: number;
  tamNom: number; tamNota: number; hayNota: boolean; tamRot: number; tamVal: number; tamSub: number; haySub: boolean;
}
const MIN_VAL = 15, MIN_ROT = 12;   // tamaños mínimos legibles (px del lienzo)

/** Mide las tarjetas: cuántas filas, qué nombres (enteros o cortos) y un solo tamaño de texto para todas. */
function planearTarjetas(ctx: Ctx, pal: Paleta, tj: NonNullable<DatosImagen["tarjetas"]>, ancho: number, St: (n: number) => number): PlanTarjetas {
  const items = tj.items, n = items.length, gap = St(8), gen = tj.tipo === "gen";
  const hayNota = items.some((t) => !!t.nota), haySub = items.some((t) => t.datos.some((x) => x.sub));
  const probar = (filas: number) => {
    const cols = Math.ceil(n / filas), tw = (ancho - gap * (cols - 1)) / cols, pw = tw - St(16);
    // nombres: todos del mismo tamaño, en un renglón; si alguno no entra, el nombre corto en todos
    let tamNom = px(St(gen ? 20 : 24)), nombres = items.map((t) => t.nombre), cabeTodo = true;
    if (!gen) {
      const cabe = (ns: string[], t: number) => { ctx.font = fuenteDe(pal, 800, t); return ns.every((x) => ctx.measureText(x).width <= pw); };
      const enteros = items.map((t) => t.nombre), cortos = items.map((t) => nombreCorto(t.nombre)), tMin = px(St(18));
      let t = px(St(24));
      while (t > tMin && !cabe(enteros, t)) t -= 2;
      if (cabe(enteros, t)) { nombres = enteros; tamNom = t; } else {
        nombres = cortos; t = px(St(24));
        while (t > px(St(15)) && !cabe(cortos, t)) t -= 2;
        tamNom = t;
      }
    }
    // datos: un solo tamaño de valor (y de rótulo, proporcional) con el que todos entran en el ancho
    let tamVal = px(St(gen ? 38 : 22)), entra = false;
    const tamMin = gen ? px(St(18)) : MIN_VAL;
    for (; tamVal >= tamMin; tamVal -= 1) {
      const tamRot = Math.max(MIN_ROT, px(tamVal * (gen ? 0.5 : 0.7)));
      entra = items.every((t) => t.datos.every((x) => {
        ctx.font = fuenteDe(pal, 900, tamVal); const wv = ctx.measureText(x.valor).width;
        if (gen) { ctx.font = fuenteDe(pal, 800, tamRot); return wv <= pw && ctx.measureText(x.rotulo.toUpperCase()).width <= pw; }
        ctx.font = fuenteDe(pal, 600, tamRot); return wv + ctx.measureText(x.rotulo).width + St(10) <= pw;
      }));
      if (entra) break;
    }
    if (!entra) tamVal = tamMin;
    const tamRot = Math.max(MIN_ROT, px(tamVal * (gen ? 0.5 : 0.7))), tamNota = px(St(15)), tamSub = Math.max(MIN_ROT, px(tamVal * 0.45));
    const k = Math.max(...items.map((t) => t.datos.length));
    const cardH = gen
      ? St(12) + tamRot * 1.25 + St(4) + tamVal * 1.15 + (haySub ? St(2) + tamSub * 1.25 : 0) + St(12)
      : St(8) + St(12) + tamNom * 1.2 + (hayNota ? tamNota * 1.25 : 0) + St(6) + k * (tamVal * 1.3 + St(4)) + St(8);
    return { filas, cols, tw, cardH, entra, tamNom, nombres, tamRot, tamVal, tamSub, tamNota, cabeTodo };
  };
  // más de 6 tarjetas: dos filas; con menos, una, salvo que el texto no entre ni al mínimo legible
  let r = probar(!gen && n > 6 ? 2 : 1);
  if (!r.entra && r.filas === 1 && n > 1 && !gen) r = probar(2);
  return {
    tipo: tj.tipo, items, nombres: r.nombres, filas: r.filas, cols: r.cols, gap, tw: r.tw, cardH: r.cardH, alto: r.filas * r.cardH + (r.filas - 1) * gap,
    tamNom: r.tamNom, tamNota: r.tamNota, hayNota, tamRot: r.tamRot, tamVal: r.tamVal, tamSub: r.tamSub, haySub,
  };
}

function dibujarTarjetas(ctx: Ctx, pal: Paleta, P: PlanTarjetas, x0: number, y0: number, St: (n: number) => number) {
  const gen = P.tipo === "gen", pad = St(8), pw = P.tw - St(16);
  P.items.forEach((t, k) => {
    const fila = Math.floor(k / P.cols), col = k % P.cols, tx = x0 + col * (P.tw + P.gap), ty = y0 + fila * (P.cardH + P.gap);
    ctx.fillStyle = pal.superficie; ctx.fillRect(tx, ty, P.tw, P.cardH);
    ctx.fillStyle = (t.id ? pal.pres[t.id] : null) ?? pal.acento; ctx.fillRect(tx, ty, P.tw, St(8));
    ctx.textBaseline = "top";
    if (!gen) {
      let yy = ty + St(8) + St(12);
      const aN = ajustar(ctx, pal, P.nombres[k], { peso: 800, max: P.tamNom, min: P.tamNom, ancho: pw, lineas: 1 });
      texto(ctx, pal, aN, 800, tx + pad, yy, pal.tinta, 1.2); yy += P.tamNom * 1.2;
      if (P.hayNota) {
        if (t.nota) texto(ctx, pal, ajustar(ctx, pal, t.nota, { peso: 600, max: P.tamNota, min: P.tamNota, ancho: pw, lineas: 1 }), 600, tx + pad, yy, pal.tintaTenue, 1.25);
        yy += P.tamNota * 1.25;
      }
      yy += St(6);
      t.datos.forEach((x) => {
        ctx.font = fuenteDe(pal, 600, P.tamRot); ctx.fillStyle = pal.tintaSec; ctx.textAlign = "left"; ctx.fillText(x.rotulo, tx + pad, yy + (P.tamVal - P.tamRot) * 0.75);
        ctx.font = fuenteDe(pal, 900, P.tamVal); ctx.fillStyle = x.cls === "neutro" ? pal.tinta : colorCls(pal, x.cls); ctx.textAlign = "right"; ctx.fillText(x.valor, tx + P.tw - pad, yy);
        yy += P.tamVal * 1.3 + St(4);
      });
    } else {
      const x = t.datos[0];
      let yy = ty + St(8) + St(12);
      ctx.font = fuenteDe(pal, 800, P.tamRot); ctx.fillStyle = pal.tintaTenue; ctx.textAlign = "left"; ctx.fillText(x.rotulo.toUpperCase(), tx + pad, yy); yy += P.tamRot * 1.25 + St(4);
      ctx.font = fuenteDe(pal, 900, P.tamVal); ctx.fillStyle = x.cls === "neutro" ? pal.tinta : colorCls(pal, x.cls); ctx.fillText(x.valor, tx + pad, yy); yy += P.tamVal * 1.15 + St(2);
      if (x.sub) texto(ctx, pal, ajustar(ctx, pal, x.sub, { peso: 600, max: P.tamSub, min: P.tamSub, ancho: pw, lineas: 1 }), 600, tx + pad, yy, pal.tintaSec, 1.25);
    }
  });
}

// ---------------------------------------------------------------- comparaciones al lado de la cifra
interface PlanComp { tamRot: number; tamVal: number; alto: number }
const textoComp = (c: ComparacionImg) => ({ rot: `${c.rotulo} (${c.fecha})`, val: `${c.valor} · ${c.variacion}` });

/** Mide el bloque de comparaciones para ponerlo al lado de la cifra: cada una, su rótulo (texto secundario) y debajo su valor y variación (peso fuerte).
 *  Devuelve null si no entra en `ancho` ni con el tamaño más chico. */
/** `altoMax`: el alto de la cifra grande; se elige el tamaño más grande que entre en el ancho libre y no la pase (con un poco de aire). */
function planearComparaciones(ctx: Ctx, pal: Paleta, comp: ComparacionImg[], ancho: number, S: (n: number) => number, altoMax = Infinity): PlanComp | null {
  if (ancho <= 0) return null;
  for (const [r, v] of [[26, 40], [24, 36], [22, 33], [20, 30]] as const) {
    const tamRot = px(S(r)), tamVal = px(S(v));
    if (tamRot < 13) break;
    let w = 0;
    for (const c of comp) {
      const t = textoComp(c);
      ctx.font = fuenteDe(pal, 600, tamRot); w = Math.max(w, ctx.measureText(t.rot).width);
      ctx.font = fuenteDe(pal, 800, tamVal); w = Math.max(w, ctx.measureText(t.val).width);
    }
    const alto = comp.length * (tamRot * 1.2 + tamVal * 1.2) + (comp.length - 1) * S(10);
    if (w <= ancho && (alto <= altoMax * 1.25 || r === 20)) return { tamRot, tamVal, alto };
  }
  return null;
}
function dibujarComparaciones(ctx: Ctx, pal: Paleta, comp: ComparacionImg[], p: PlanComp, x: number, y: number) {
  const gap = (p.alto - comp.length * (p.tamRot * 1.2 + p.tamVal * 1.2)) / Math.max(1, comp.length - 1);
  comp.forEach((c, k) => {
    const t = textoComp(c), yy = y + k * (p.tamRot * 1.2 + p.tamVal * 1.2 + gap);
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.font = fuenteDe(pal, 600, p.tamRot); ctx.fillStyle = pal.tintaSec; ctx.fillText(t.rot, x, yy);
    ctx.font = fuenteDe(pal, 800, p.tamVal); ctx.fillStyle = pal.tinta; ctx.fillText(t.val, x, yy + p.tamRot * 1.2);
  });
}
interface PlanCompBajo { tam: number; juntas: boolean; alto: number }
/** Si no entran al lado de la cifra: las dos en un renglón («Mes anterior (sep-26) 1,9 % · +0,3 p.p.   Hace un año …»); si tampoco, una por renglón. */
function planearComparacionesBajo(ctx: Ctx, pal: Paleta, comp: ComparacionImg[], ancho: number, S: (n: number) => number): PlanCompBajo {
  const gap = S(32), ancho1 = (tam: number, c: ComparacionImg) => { const t = textoComp(c); ctx.font = fuenteDe(pal, 600, tam); const a = ctx.measureText(t.rot + " ").width; ctx.font = fuenteDe(pal, 800, tam); return a + ctx.measureText(t.val).width; };
  for (let tam = px(S(26)); tam >= px(S(16)); tam -= 2) {
    const w = comp.reduce((s, c) => s + ancho1(tam, c), 0) + gap * (comp.length - 1);
    if (w <= ancho) return { tam, juntas: true, alto: tam * 1.25 };
  }
  let tam = px(S(24));
  while (tam > px(S(14)) && Math.max(...comp.map((c) => ancho1(tam, c))) > ancho) tam -= 2;
  return { tam, juntas: false, alto: comp.length * tam * 1.3 };
}
function dibujarComparacionesBajo(ctx: Ctx, pal: Paleta, comp: ComparacionImg[], p: PlanCompBajo, x: number, y: number) {
  let xx = x;
  comp.forEach((c, k) => {
    const t = textoComp(c), yy = p.juntas ? y : y + k * p.tam * 1.3;
    if (!p.juntas) xx = x;
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.font = fuenteDe(pal, 600, p.tam); ctx.fillStyle = pal.tintaSec; ctx.fillText(t.rot + " ", xx, yy); xx += ctx.measureText(t.rot + " ").width;
    ctx.font = fuenteDe(pal, 800, p.tam); ctx.fillStyle = pal.tinta; ctx.fillText(t.val, xx, yy); xx += ctx.measureText(t.val).width + px(p.tam * 1.2);
  });
}

// ---------------------------------------------------------------- composición
interface Resultado { holgura: number }
export const ALTO_MARCA = 64, MARGEN = 56;

/** Fondo y franja de la marca arriba (la misma en todas las imágenes). */
export function dibujarMarca(ctx: Ctx, pal: Paleta, W: number, H: number) {
  const m = MARGEN, hMarca = ALTO_MARCA;
  ctx.fillStyle = pal.fondo; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = pal.barra; ctx.fillRect(0, 0, W, hMarca);
  ctx.font = fuenteDe(pal, 900, 30); const tw = ctx.measureText("PRIMERO LOS DATOS").width, bw = m + tw + 56;
  ctx.fillStyle = pal.acento; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bw, 0); ctx.lineTo(bw - 20, hMarca); ctx.lineTo(0, hMarca); ctx.closePath(); ctx.fill();
  ctx.fillStyle = pal.sobreAcento; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("PRIMERO LOS DATOS", m, hMarca / 2 + 1);
  ctx.fillStyle = pal.acento; ctx.fillRect(0, hMarca, W, 4);
}

/** Compone toda la imagen. Con `pintar` en falso solo mide (para elegir la escala de texto con la que todo entra). */
function componer(ctx: Ctx, d: DatosImagen, pal: Paleta, esc: number, pintar: boolean, tam: { w: number; h: number }): Resultado {
  const { w: W, h: H } = tam, horiz = d.formato === "16x9";
  const filas = !!d.lienzo, lat = horiz && !filas;   // `lat`: texto a la izquierda y gráfico a la derecha
  const m = MARGEN, S = (n: number) => n * esc;
  const hMarca = ALTO_MARCA;
  if (pintar) dibujarMarca(ctx, pal, W, H);
  const wCol = lat ? 520 : W - 2 * m, xCol = m;
  const xGraf = lat ? m + wCol + 48 : m, wGraf = lat ? W - xGraf - m : W - 2 * m;

  // ----- pie (se mide primero: queda pegado abajo)
  const fPie = px(S(24)), minPie = px(S(17));
  const aUnidad = ajustar(ctx, pal, d.unidad, { peso: 600, max: fPie, min: minPie, ancho: W - 2 * m, lineas: 1 });
  const notaPie = d.nota ? ". " + d.nota : "";
  // toda imagen dice «Fuente:» antes de la fuente, aunque quien la arma pase solo el nombre
  const conFuente = (f: string) => (!f || /^fuentes?\b/i.test(f) ? f : `Fuente: ${f}`);
  let aFuente = ajustar(ctx, pal, `${conFuente(d.fuente)}${notaPie}`, { peso: 400, max: fPie, min: minPie, ancho: W - 2 * m, lineas: 2 });
  if (aFuente.cortado && d.fuenteCorta) aFuente = ajustar(ctx, pal, `${conFuente(d.fuenteCorta)}${notaPie}`, { peso: 400, max: fPie, min: minPie, ancho: W - 2 * m, lineas: 2 });
  const aInicio = d.inicioTxt ? ajustar(ctx, pal, d.inicioTxt, { peso: 600, max: fPie, min: minPie, ancho: W - 2 * m, lineas: 2 }) : null;
  const fBase = px(S(26));
  const hPie = alto(aUnidad, 1.25) + alto(aFuente, 1.25) + (aInicio ? alto(aInicio, 1.25) : 0) + fBase * 1.3 + S(30);
  const yPie = H - px(S(28)) - hPie;
  if (pintar) {
    ctx.fillStyle = pal.borde; ctx.fillRect(m, yPie, W - 2 * m, 2);
    let y = yPie + S(14);
    texto(ctx, pal, aUnidad, 600, m, y, pal.tintaSec, 1.25); y += alto(aUnidad, 1.25);
    texto(ctx, pal, aFuente, 400, m, y, pal.tintaTenue, 1.25); y += alto(aFuente, 1.25);
    if (aInicio) { texto(ctx, pal, aInicio, 600, m, y, pal.tintaSec, 1.25); y += alto(aInicio, 1.25); }
    y += S(6);
    ctx.font = fuenteDe(pal, 400, px(S(22))); ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillStyle = pal.tintaTenue; ctx.fillText(`Generado el ${d.fecha}`, W - m, y + 2);
    const wGen = ctx.measureText(`Generado el ${d.fecha}`).width;
    // R22: una vista armada a gusto lo dice, para que quien la recibe sepa que es una elección y pueda hacer la suya
    const aSitio = ajustar(ctx, pal, d.armado ? `Armado en ${SITIO} · armá el tuyo` : SITIO, { peso: 800, max: fBase, min: px(S(16)), ancho: W - 2 * m - wGen - S(24), lineas: 1 });
    texto(ctx, pal, aSitio, 800, m, y, pal.acento, 1.18);
  }

  // ----- texto de arriba (título, cifra, contexto)
  let y = hMarca + S(34);
  const aTit = ajustar(ctx, pal, d.titulo, { peso: 800, max: S(filas ? (horiz ? 42 : 46) : horiz ? 46 : 58), min: S(horiz ? 28 : 34), ancho: wCol, lineas: 2 });
  if (pintar) texto(ctx, pal, aTit, 800, xCol, y, pal.tinta, 1.12);
  y += alto(aTit, 1.12) + S(10);
  if (d.temporalidad) {
    const aTem = ajustar(ctx, pal, d.temporalidad, { peso: 600, max: S(horiz ? 24 : 26), min: S(16), ancho: wCol, lineas: 2 });
    if (pintar) texto(ctx, pal, aTem, 600, xCol, y, pal.tintaSec, 1.2);
    y += alto(aTem, 1.2);
  }
  y += S(6);
  if (d.cifra) {
    const aCifra = ajustar(ctx, pal, d.cifra.valor, { peso: 900, max: S(horiz ? 104 : 124), min: S(56), ancho: wCol, lineas: 1 });
    if (pintar) texto(ctx, pal, aCifra, 900, xCol, y, pal.acento, 1);
    // comparaciones (mes anterior, hace un año): al lado de la cifra si entran; si no, debajo de la fecha, en un renglón
    const comp = d.comparaciones?.length ? d.comparaciones : null;
    let hCifra = aCifra.tam * 1.0;
    let plan: PlanComp | null = null, debajo: PlanCompBajo | null = null;
    if (comp) {
      ctx.font = fuenteDe(pal, 900, aCifra.tam);
      const wCifra = ctx.measureText(aCifra.lineas[0] ?? "").width;
      plan = planearComparaciones(ctx, pal, comp, wCol - wCifra - S(36), S, hCifra);
      if (plan) {
        hCifra = Math.max(hCifra, plan.alto);
        if (pintar) dibujarComparaciones(ctx, pal, comp, plan, xCol + wCifra + S(36), y + (hCifra - plan.alto) / 2);
      } else debajo = planearComparacionesBajo(ctx, pal, comp, wCol, S);
    }
    y += hCifra + S(4);
    const mes = d.cifra.aviso ? `${d.cifra.mes} · Último dato disponible` : d.cifra.mes;
    const aMes = ajustar(ctx, pal, mes, { peso: 600, max: S(32), min: S(20), ancho: wCol, lineas: 1 });
    if (pintar) texto(ctx, pal, aMes, 600, xCol, y, pal.tintaSec, 1.2);
    y += alto(aMes, 1.2) + S(16);
    if (debajo && comp) {
      if (pintar) dibujarComparacionesBajo(ctx, pal, comp, debajo, xCol, y);
      y += debajo.alto + S(14);
    }
  }
  if (d.leyenda) {
    const fila = S(horiz ? 42 : 46);
    d.leyenda.forEach((l, k) => {
      const yy = y + k * fila;
      const aVal = ajustar(ctx, pal, l.valor, { peso: 800, max: S(32), min: S(18), ancho: wCol * 0.5, lineas: 1 });
      ctx.font = fuenteDe(pal, 800, aVal.tam);
      const wVal = Math.min(ctx.measureText(aVal.lineas[0] ?? "").width, wCol * 0.5);
      const aNom = ajustar(ctx, pal, l.nombre, { peso: 600, max: S(30), min: S(18), ancho: wCol - wVal - S(54), lineas: 1 });
      if (pintar) {
        ctx.fillStyle = pal.series[l.color] ?? pal.acento; ctx.beginPath(); ctx.arc(xCol + S(11), yy + fila * 0.42, S(9), 0, Math.PI * 2); ctx.fill();
        texto(ctx, pal, aNom, 600, xCol + S(34), yy + (fila - aNom.tam * 1.2) / 2 - S(3), pal.tinta, 1.2);
        texto(ctx, pal, aVal, 800, xCol + wCol, yy + (fila - aVal.tam * 1.2) / 2 - S(3), pal.tinta, 1.2, "right");
      }
    });
    y += d.leyenda.length * fila + S(10);
  }
  d.frases.forEach((f) => {
    const a = filas ? ajustar(ctx, pal, f.texto, { peso: 600, max: S(horiz ? 26 : 30), min: S(17), ancho: wCol, lineas: 2 })
      : ajustar(ctx, pal, f.texto, { peso: 600, max: S(horiz ? 32 : 36), min: S(22), ancho: wCol, lineas: d.ejeX === "mes" ? 4 : 2 });
    if (pintar) texto(ctx, pal, a, 600, xCol, y, colorFrase(pal, f), 1.2);
    y += alto(a, 1.2) + S(10);
  });
  const yFinTexto = y;

  // ----- comentario propio (una sola línea, con su etiqueta)
  let hCom = 0, aCom: Ajustado | null = null, aEtq: Ajustado | null = null;
  const wCom = lat ? wCol : wGraf;
  if (d.comentario) {
    aEtq = ajustar(ctx, pal, ETQ_COMENTARIO.toUpperCase(), { peso: 800, max: S(18), min: S(14), ancho: wCom - S(28), lineas: 1 });
    aCom = ajustar(ctx, pal, `“${d.comentario}”`, { peso: 600, max: S(32), min: S(18), ancho: wCom - S(28), lineas: 1 });
    hCom = alto(aEtq, 1.2) + alto(aCom, 1.25) + S(24);
  }
  const dibujarComentario = (x: number, yy: number) => {
    if (!aCom || !aEtq) return;
    ctx.fillStyle = pal.superficie; ctx.fillRect(x, yy, wCom, hCom);
    ctx.fillStyle = pal.accion; ctx.fillRect(x, yy, S(6), hCom);
    texto(ctx, pal, aEtq, 800, x + S(22), yy + S(10), pal.tintaTenue, 1.2);
    texto(ctx, pal, aCom, 600, x + S(22), yy + S(12) + alto(aEtq, 1.2), pal.tinta, 1.25);
  };

  // ----- tarjetas (por presidente o generales): su texto baja menos que el resto, para que se siga leyendo
  const St = (n: number) => n * Math.max(esc, 0.92);
  const plan = d.tarjetas?.items.length ? planearTarjetas(ctx, pal, d.tarjetas, wGraf, St) : null;
  const hPres = plan ? plan.alto : 0;

  // ----- región del gráfico
  const sep = S(18);
  let yGraf: number, hGraf: number, yPres: number, yComBajo = 0;
  if (lat) {
    const base = yPie - sep;
    hGraf = base - (hMarca + 4 + S(26)) - (hPres ? hPres + sep : 0);
    yGraf = hMarca + 4 + S(26);
    yPres = yGraf + hGraf + sep;
    if (aCom) yComBajo = yFinTexto + S(4);
  } else {
    const base = yPie - sep;
    yPres = base - hPres;
    const yComY = (hPres ? yPres - sep : base) - hCom;
    yComBajo = yComY;
    const tope = hCom ? yComY - sep : (hPres ? yPres - sep : base);
    yGraf = yFinTexto + S(6);
    hGraf = tope - yGraf;
  }
  const minGraf = d.lienzo ? minLienzo(d.lienzo, horiz) : plan ? Math.max(H / 3, S(horiz ? 260 : 250)) : S(horiz ? 260 : 250);
  const holgura = Math.min(hGraf - minGraf, lat && aCom ? yPie - sep - (yComBajo + hCom) : Infinity);
  if (!pintar) return { holgura };

  if (d.lienzo) lienzoFilas(ctx, { x: xGraf, y: yGraf, w: wGraf, h: hGraf }, d, pal, esc, horiz);
  else grafico(ctx, { x: xGraf, y: yGraf, w: wGraf, h: hGraf }, d, pal, esc);
  if (aCom) dibujarComentario(lat ? xCol : m, yComBajo);
  if (plan) dibujarTarjetas(ctx, pal, plan, lat ? xGraf : m, yPres, St);
  return { holgura };
}

/** Dibuja la imagen completa en el canvas, con el tamaño del formato. Baja el tamaño de los textos si hace falta para que todo entre.
 *  `tam`: otro tamaño para la misma composición del formato (la vista previa de los links usa la horizontal más baja, ver generar-previas.ts). */
export function dibujarImagen(canvas: LienzoCanvas, d: DatosImagen, pal: Paleta, tam: { w: number; h: number } = FORMATOS[d.formato]): void {
  const { w, h } = tam;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  let esc = 1;
  for (const e of [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.54]) {
    esc = e;
    ctx.save();
    const r = componer(ctx, d, pal, e, false, tam);
    ctx.restore();
    if (r.holgura >= 0) break;
  }
  ctx.save();
  componer(ctx, d, pal, esc, true, tam);
  ctx.restore();
}
