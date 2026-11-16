// Novedades y calendario (docs/specs/novedades-calendario.md): lo que salió en los últimos días y cuándo sale lo próximo.
// El pipeline arma `novedades.json` (publicaciones y fechas); acá se lee, se valida y se calcula lo que se muestra: nombre, período legible,
// cifra, cambio y contexto, con las mismas funciones que la ficha del dato (`cabeceraFicha`) para que la cifra sea la de la ficha.
import { DATOS_FIJOS } from "./datos-fijos";
import { cabeceraFicha, historicoFicha, MESES_LARGOS, vistaCompartirFicha } from "./ficha";
import { fechaDeDato } from "./formato";
import { frecuenciaOrigen } from "./historico";
import { fuentePublica } from "./fuente-publica";
import { tituloVariable, type VistaImg } from "./imagen-datos";
import { medidaInicial, type Config, type DesdePref } from "./config";
import { fuentesCalc, medDefaultDe, type Expr, type Motor, type SerieMeta } from "./motor";
import { hrefDato } from "./temas";
import type { DeltaProps } from "@/components/sistema/Delta";

// ------------------------------------------------------------ Datos (formato de `novedades.json`)
export interface Publicacion { fecha: string; periodo: string; fuente: string; principal: string; series: string[] }
export interface ProximaFecha { fecha: string; hora: string | null; informe: string | null; periodo: string; principal: string; series: string[]; estimado: boolean }
export interface Novedades { generado: string; publicaciones: Publicacion[]; calendario: ProximaFecha[]; indecSinDatos: number }

/** Cuántas publicaciones y fechas muestra el bloque de la portada. */
export const MAX_PORTADA = 3;
export const LINK_CALENDARIO_INDEC = "https://www.indec.gob.ar/indec/web/Calendario-Fecha-0";

const esTexto = (x: unknown): x is string => typeof x === "string" && x.length > 0;
const esFecha = (x: unknown): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);
const esPeriodo = (x: unknown): x is string => typeof x === "string" && /^\d{4}-\d{2}$/.test(x);
const listaTexto = (x: unknown): string[] => (Array.isArray(x) ? x.filter(esTexto) : []);

/** Valida lo que llegó del archivo; lo que no tiene la forma esperada se descarta (la página nunca se rompe por un renglón raro). Null si no es un objeto. */
export function decodificar(c: unknown): Novedades | null {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  const publicaciones: Publicacion[] = [];
  for (const x of Array.isArray(o.publicaciones) ? o.publicaciones : []) {
    const r = x as Record<string, unknown> | null;
    if (!r || !esFecha(r.fecha) || !esPeriodo(r.periodo) || !esTexto(r.principal)) continue;
    const series = listaTexto(r.series);
    publicaciones.push({ fecha: r.fecha, periodo: r.periodo, fuente: esTexto(r.fuente) ? r.fuente : "", principal: r.principal, series: series.length ? series : [r.principal] });
  }
  const calendario: ProximaFecha[] = [];
  for (const x of Array.isArray(o.calendario) ? o.calendario : []) {
    const r = x as Record<string, unknown> | null;
    if (!r || !esFecha(r.fecha) || !esPeriodo(r.periodo) || !esTexto(r.principal)) continue;
    const series = listaTexto(r.series);
    calendario.push({
      fecha: r.fecha, hora: esTexto(r.hora) ? r.hora : null, informe: esTexto(r.informe) ? r.informe : null, periodo: r.periodo,
      principal: r.principal, series: series.length ? series : [r.principal], estimado: r.estimado === true,
    });
  }
  // el archivo ya viene ordenado; se ordena de nuevo por las dudas (publicaciones: la más reciente primero; calendario: por fecha y hora)
  publicaciones.sort((a, b) => b.fecha.localeCompare(a.fecha));
  calendario.sort((a, b) => a.fecha.localeCompare(b.fecha) || Number(a.estimado) - Number(b.estimado) || (a.hora ?? "99").localeCompare(b.hora ?? "99"));
  return { generado: typeof o.generado === "string" ? o.generado : "", publicaciones, calendario, indecSinDatos: typeof o.indec_sin_datos === "number" ? o.indec_sin_datos : 0 };
}

/** Los renglones del calendario cuyo período ya figura en "Lo último que salió" no se muestran (el calendario de hoy puede seguir diciendo "16:00" cuando el dato ya entró). */
export function calendarioVisible(n: Novedades): ProximaFecha[] {
  return n.calendario.filter((c) => !n.publicaciones.some((p) => p.periodo === c.periodo && (p.principal === c.principal || p.series.some((s) => c.series.includes(s)))));
}

/** Las series cuyos datos hacen falta para mostrar estas publicaciones y fechas (los principales). */
export const idsPrincipales = (pubs: Publicacion[], prox: ProximaFecha[]): string[] => [...new Set([...pubs.map((p) => p.principal), ...prox.map((c) => c.principal)])];

// ------------------------------------------------------------ Fechas y períodos
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const partes = (f: string): [number, number, number] => { const [a, m, d] = f.split("-").map(Number); return [a, m, d]; };

/** "2026-11-17" → "lunes 17 de noviembre" (con el año si no es el del archivo). */
export function fechaLarga(f: string, anioRef?: number): string {
  const [a, m, d] = partes(f), dia = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  return `${dia} ${d} de ${MESES_LARGOS[m - 1]}${anioRef != null && a !== anioRef ? ` de ${a}` : ""}`;
}
/** El año del archivo (para no repetirlo en las fechas del año en curso). */
export const anioDe = (n: Novedades): number => { const a = Number(n.generado.slice(0, 4)); return a > 2000 ? a : new Date().getFullYear(); };
/** Título de un día del calendario: la fecha completa si es del calendario oficial, o "Alrededor del día 3 de diciembre" si es una estimación (sin día de la semana: no es una fecha cierta). */
export function etiquetaDia(f: string, estimado: boolean, anioRef?: number): string {
  if (!estimado) return fechaLarga(f, anioRef);
  const [a, m, d] = partes(f);
  return `Alrededor del día ${d} de ${MESES_LARGOS[m - 1]}${anioRef != null && a !== anioRef ? ` de ${a}` : ""}`;
}

const ROMANOS = ["I", "II", "III", "IV"];
/** "2026-10" → "octubre 2026"; si la serie es trimestral, "III trimestre 2026" (el período es el último mes del trimestre); si es anual, "2025". */
export function periodoLegible(periodo: string, frec?: string): string {
  const [a, m] = partes(periodo + "-01");
  if (frec === "A") return String(a);
  if (frec === "T") return `${ROMANOS[Math.floor((m - 1) / 3)]} trimestre ${a}`;
  return `${MESES_LARGOS[m - 1]} ${a}`;
}

// ------------------------------------------------------------ Qué se muestra de cada dato
/** La variable con que se muestra una serie: la del dato fijo si lo es (la misma de su ficha) y, si no, la medida inicial de la configuración. */
export function exprDeSerie(id: string, metas: SerieMeta[], config: Pick<Config, "medida" | "dolar">): Expr | null {
  const fijo = DATOS_FIJOS.find((d) => d.e.id === id);
  if (fijo) return fijo.e;
  const meta = metas.find((s) => s.id === id);
  return meta ? { id, med: medidaInicial(meta.tipo, medDefaultDe(meta), config), rel: null, modo: "compra", esc: "" } : null;
}
/** A dónde lleva "Ver": la ficha del dato (la página fija /dato/<slug>/ si la tiene, igual que en Fuentes). */
export const hrefFicha = (e: Expr): string => hrefDato(e);

export interface DatoNovedad {
  e: Expr; nombre: string; periodoTxt: string;
  /** La cifra de la ficha; null si no hay dato. */
  cifra: string | null;
  /** Mes del dato de la cifra, solo si no es el período de la publicación (por ejemplo, ya salió otro más nuevo). */
  cifraDe?: string;
  /** Cambio contra el período anterior, con signo (el primero de la cabecera de la ficha). */
  delta: DeltaProps | null;
  /** Frase de contexto de la ficha ("El valor más bajo desde…"), si la hay. */
  contexto?: string;
  href: string;
  /** Texto para copiar al compartir. */
  texto: string;
  /** La imagen que se comparte (la misma de la cabecera de la ficha). */
  vista: VistaImg | null;
}

/** Nombre y período de un dato sin sus cifras (mientras no están cargados los datos, o si la serie no se puede calcular). */
export function periodoDe(m: Motor | null, e: Expr, periodo: string): string {
  const frec = m && m.SER[e.id] ? frecuenciaOrigen(m.calc(e).v) : undefined;
  return periodoLegible(periodo, frec);
}

/** Todo lo de un renglón de novedades: el nombre público con la medida, el período legible, y la cifra, el cambio y el contexto de la ficha.
 *  Null si la serie no está cargada o no se puede calcular. */
export function datoNovedad(m: Motor, e: Expr, periodo: string, desdeCfg: DesdePref): DatoNovedad | null {
  if (!m.SER[e.id] || (e.rel && !m.SER[e.rel])) return null;
  const c = m.calc(e), frec = frecuenciaOrigen(c.v);
  const nombre = tituloVariable(m, e, c), cab = cabeceraFicha(m, e, desdeCfg);
  const mesPub = fechaDeDato(periodo + "-01", frec);
  const fuente = fuentesCalc(c).map(fuentePublica).join("; ");
  const periodoTxt = periodoLegible(periodo, frec);
  const { E } = historicoFicha(m, c, desdeCfg);
  return {
    e, nombre, periodoTxt, cifra: cab?.cifra ?? null, cifraDe: cab && cab.fecha !== mesPub ? cab.fecha : undefined,
    delta: cab?.deltas[0] ?? null, contexto: cab?.frase, href: hrefFicha(e),
    texto: cab ? `${nombre}: ${cab.cifra} en ${cab.fecha}. Fuente: ${fuente}.` : `${nombre}, ${periodoTxt}. Fuente: ${fuente}.`,
    vista: cab ? vistaCompartirFicha(e, E, cab) : null,
  };
}

// ------------------------------------------------------------ Agrupar
export interface DiaPublicaciones { fecha: string; items: Publicacion[] }
/** Publicaciones agrupadas por día, el más reciente primero (las publicaciones ya vienen en ese orden). */
export function agruparPorDia(pubs: Publicacion[]): DiaPublicaciones[] {
  const out: DiaPublicaciones[] = [];
  for (const p of pubs) {
    const ult = out[out.length - 1];
    if (ult && ult.fecha === p.fecha) ult.items.push(p); else out.push({ fecha: p.fecha, items: [p] });
  }
  return out;
}
export interface DiaCalendario { fecha: string; estimado: boolean; items: ProximaFecha[] }
/** Fechas próximas agrupadas por día, la más cercana primero; las estimadas de un día van en su propio grupo, después de las del calendario oficial. */
export function agruparCalendario(prox: ProximaFecha[]): DiaCalendario[] {
  const out: DiaCalendario[] = [];
  for (const c of prox) {
    const ult = out[out.length - 1];
    if (ult && ult.fecha === c.fecha && ult.estimado === c.estimado) ult.items.push(c); else out.push({ fecha: c.fecha, estimado: c.estimado, items: [c] });
  }
  return out;
}

/** Las series de una publicación que no son la principal y están en el catálogo (para "y N datos más"). */
export const restoDe = (pub: Pick<Publicacion, "principal" | "series">, metas: SerieMeta[]): SerieMeta[] =>
  pub.series.filter((id) => id !== pub.principal).map((id) => metas.find((s) => s.id === id)).filter((s): s is SerieMeta => !!s);
