// Precios en el mundo (bloque 6c): niveles de precios por rubro, Argentina contra el mundo y otros países, en dólares.
// Una sola fuente de verdad para el bloque de Contexto, las plantillas y el recuadro del mandato.
// Los datos medidos (ICP, Banco Mundial; mundo = 100) y el IPC de otros países vienen de precios_mundo.json;
// el IPC por rubro y el dólar de la Argentina salen del catálogo (no se duplican).
import type { Motor } from "./motor";
import { PRES_DEF, type Pres } from "./estadisticas";
import { fmtMes, nf0, ok, r1 } from "./formato";

export interface RubroPM { n: string; icp: string; arg: string; tipo: "d" | "p"; nota: string }
export interface DatosPM {
  rubros: Record<string, RubroPM>;
  paises: Record<string, string>;
  medido: Record<string, Record<string, Record<string, number>>>;   // año -> rubro -> país -> nivel (mundo = 100)
  fechas: string[];                                                  // "2017-01"…
  ipc: Record<string, Record<string, (number | null)[]>>;           // rubro -> país -> índice mensual
  tc: Record<string, (number | null)[]>;                             // país -> moneda local por US$
  sin_datos: Record<string, string>;
  notas_pais: Record<string, string>;
  fuente: string;
}
export type Dolar = "oficial" | "blue";
export const DOLARES: [Dolar, string][] = [["oficial", "Oficial"], ["blue", "Blue"]];

/** Rubros que ve el usuario: id, nombre y serie del IPC argentino. Tiene que coincidir con RUBROS de pipeline/precios_mundo.py
 *  (acá se repite solo para poder armar plantillas y pedir los datos antes de bajar precios_mundo.json). */
export const PM_RUBROS: [string, string, string][] = [
  ["total", "Consumo total de los hogares", "ipc_nacional_0_ipc"],
  ["01", "Alimentos y bebidas no alcohólicas", "ipc_nacional_01_coicop"],
  ["02", "Bebidas alcohólicas y tabaco", "ipc_nacional_02_coicop"],
  ["03", "Ropa y calzado", "ipc_nacional_03_coicop"],
  ["04", "Vivienda, agua, electricidad y gas", "ipc_nacional_04_coicop"],
  ["05", "Equipamiento del hogar", "ipc_nacional_05_coicop"],
  ["06", "Salud", "ipc_nacional_06_coicop"],
  ["07", "Transporte", "ipc_nacional_07_coicop"],
  ["08", "Comunicación", "ipc_nacional_08_coicop"],
  ["09", "Recreación y cultura", "ipc_nacional_09_coicop"],
  ["10", "Educación", "ipc_nacional_10_coicop"],
  ["11", "Restaurantes y hoteles", "ipc_nacional_11_coicop"],
  ["12", "Bienes y servicios varios", "ipc_nacional_12_coicop"],
  ["carne", "Carne", "ipc_gba_01_1_2_coicop"],
  ["pan", "Pan y cereales", "ipc_gba_01_1_1_coicop"],
  ["leche", "Leche, quesos y huevos", "ipc_gba_01_1_4_coicop"],
  ["frutas", "Frutas", "ipc_gba_01_1_6_coicop"],
  ["verduras", "Verduras", "ipc_gba_01_1_7_coicop"],
];
/** Series del catálogo que hay que cargar para este bloque. */
export const IDS_PM = [...PM_RUBROS.map((r) => r[2]), "fx_oficial", "fx_blue"];

export const ARG = "ARG", MUNDO = "USA";
export const PAISES_DEF = ["USA", "EA", "BRA", "CHL"];
const MIN_MESES = 6;   // meses mínimos para promediar un año

type Serie = (number | null)[];
/** Lo que se toma de la Argentina (alineado a `fechas`). */
export interface ArgPM { ipc: (rid: string) => Serie | null; tc: (d: Dolar) => Serie | null }

export function argDesdeMotor(m: Motor, d: DatosPM): ArgPM {
  const idx = d.fechas.map((f) => m.F.indexOf(f));
  const alinear = (id: string | undefined): Serie | null => {
    const s = id ? m.SER[id] : undefined;
    return s ? idx.map((i) => (i >= 0 ? s.vals[i] : null)) : null;
  };
  return { ipc: (rid) => alinear(d.rubros[rid]?.arg), tc: (dol) => alinear(dol === "blue" && m.SER.fx_blue ? "fx_blue" : "fx_oficial") };   // sin serie de blue, se usa el oficial
}

const anioDe = (f: string) => +f.slice(0, 4);
/** Promedio de un año calendario (null si hay menos de MIN_MESES meses con dato). */
function promAnio(s: Serie | null | undefined, fechas: string[], anio: number): number | null {
  if (!s) return null;
  let suma = 0, n = 0;
  fechas.forEach((f, i) => { const v = s[i]; if (anioDe(f) === anio && ok(v)) { suma += v; n++; } });
  return n >= MIN_MESES ? suma / n : null;
}
export const aniosMedidos = (d: DatosPM) => Object.keys(d.medido).map(Number).sort((a, b) => a - b);

/** Cómo se mueve "el mundo": el IPC del rubro en EE.UU.; donde se termina (la OCDE lo corta antes) o no existe, sigue con el IPC general de EE.UU. */
function mundoSerie(d: DatosPM, rubro: Serie | null): Serie | null {
  const gral = d.ipc.total?.[MUNDO] ?? null;
  if (!rubro) return gral;
  if (!gral) return rubro;
  let u = -1;
  rubro.forEach((v, i) => { if (ok(v)) u = i; });
  if (u < 0 || !ok(gral[u])) return rubro;
  return rubro.map((v, i) => (i <= u ? v : ok(gral[i]) ? (rubro[u] as number) * ((gral[i] as number) / (gral[u] as number)) : null));
}

export interface Niveles {
  est: Serie;                           // nivel estimado mes a mes (mundo = 100)
  med: Record<number, number>;          // nivel medido por año (ya expresado en el dólar elegido)
  estimable: boolean;                   // hay IPC del rubro (y tipo de cambio) para estimar
  mundoGeneral: boolean;                // el mundo se movió con el IPC general de EE.UU. porque no hay IPC de este rubro
}

/** Nivel de precios de un país en un rubro, medido y estimado. Con Argentina, `dolar` elige el tipo de cambio. */
export function niveles(d: DatosPM, rid: string, pais: string, arg: ArgPM, dolar: Dolar): Niveles {
  const N = d.fechas.length;
  const esArg = pais === ARG;
  const ipc = esArg ? arg.ipc(rid) : d.ipc[rid]?.[pais] ?? null;
  const tc = esArg ? arg.tc(dolar) : d.tc[pais] ?? null;
  const tcOf = esArg ? arg.tc("oficial") : null;
  const usaR = d.ipc[rid]?.[MUNDO] ?? null;
  const mundoGeneral = !usaR;   // (solo avisa cuando no hay IPC del rubro en EE.UU.)
  const mundo = mundoSerie(d, usaR);
  const med: Record<number, number> = {};
  for (const a of aniosMedidos(d)) {
    let v: number | undefined = d.medido[a]?.[rid]?.[pais];
    if (v == null) continue;
    if (esArg && dolar === "blue") {                       // nivel_blue = nivel_oficial × TC_oficial / TC_blue del año
      const o = promAnio(tcOf, d.fechas, a), b = promAnio(tc, d.fechas, a);
      if (o == null || b == null) continue;
      v = (v * o) / b;
    }
    med[a] = v;
  }
  const est: Serie = new Array(N).fill(null);
  const estimable = !!ipc && !!tc;
  if (estimable) {
    const anios = Object.keys(med).map(Number).sort((a, b) => a - b);
    d.fechas.forEach((f, i) => {
      const y = anioDe(f);
      const a = [...anios].reverse().find((x) => x <= y);               // medición más reciente que no sea posterior: no se proyecta hacia atrás
      if (a == null) return;
      const iBase = promAnio(ipc, d.fechas, a), tBase = promAnio(tc, d.fechas, a), wBase = mundo ? promAnio(mundo, d.fechas, a) : 1;
      const x = ipc![i], t = tc![i], w = mundo ? mundo[i] : 1;
      if (iBase == null || tBase == null || wBase == null || !ok(x) || !ok(t) || !ok(w) || t <= 0 || w <= 0) return;
      est[i] = med[a] * (x / iBase) / (t / tBase) / (w / wBase);
    });
  }
  return { est, med, estimable, mundoGeneral };
}

export interface ResumenRubro { rid: string; n: string; tipo: "d" | "p"; nivel: number; fecha: string; modo: "medido" | "estimado" }
/** Último nivel de la Argentina en un rubro: estimado si se puede, si no el último medido. Si `hasta` está, no pasa de ese mes. */
export function ultimoArg(d: DatosPM, rid: string, arg: ArgPM, dolar: Dolar, hasta?: string): ResumenRubro | null {
  const r = d.rubros[rid];
  if (!r) return null;
  const nv = niveles(d, rid, ARG, arg, dolar);
  for (let i = d.fechas.length - 1; i >= 0; i--) {
    if (hasta && d.fechas[i] > hasta) continue;
    if (ok(nv.est[i])) return { rid, n: r.n, tipo: r.tipo, nivel: nv.est[i] as number, fecha: d.fechas[i], modo: "estimado" };
  }
  const anios = Object.keys(nv.med).map(Number).filter((a) => !hasta || `${a}-12` <= hasta).sort((a, b) => b - a);
  return anios.length ? { rid, n: r.n, tipo: r.tipo, nivel: nv.med[anios[0]], fecha: String(anios[0]), modo: "medido" } : null;
}

/** Todos los rubros ordenados de más caro a más barato (las divisiones por un lado y los productos por otro). */
export function tablaRubros(d: DatosPM, arg: ArgPM, dolar: Dolar): { divisiones: ResumenRubro[]; productos: ResumenRubro[] } {
  const todos = Object.keys(d.rubros).map((rid) => ultimoArg(d, rid, arg, dolar)).filter((x): x is ResumenRubro => x != null);
  const orden = (a: ResumenRubro, b: ResumenRubro) => b.nivel - a.nivel;
  return { divisiones: todos.filter((x) => x.tipo === "d").sort(orden), productos: todos.filter((x) => x.tipo === "p").sort(orden) };
}

/** Para el recuadro del mandato: rubro más caro y más barato (divisiones, sin el total) en el último mes del mandato, con el dólar oficial. */
export function extremosMandato(m: Motor, d: DatosPM, pres: Pres): { fecha: string; caro: ResumenRubro; barato: ResumenRubro } | null {
  const fin = m.F[pres.i1];
  if (!fin || fin < d.fechas[0]) return null;
  const arg = argDesdeMotor(m, d);
  const filas = Object.keys(d.rubros).filter((r) => d.rubros[r].tipo === "d" && r !== "total")
    .map((r) => ultimoArg(d, r, arg, "oficial", fin)).filter((x): x is ResumenRubro => x != null && x.modo === "estimado");
  if (filas.length < 2) return null;
  filas.sort((a, b) => b.nivel - a.nivel);
  return { fecha: fin, caro: filas[0], barato: filas[filas.length - 1] };
}

// ---- Cómo se dice cada rubro en la frase del capítulo de precios (la base de RUBRO_DICHO, más abajo).
interface PregRubro { rid: string; dicho: string; caro: string; barato: string }
const PREG_RUBROS: PregRubro[] = [
  { rid: "carne", dicho: "la carne", caro: "cara", barato: "barata" },
  { rid: "pan", dicho: "el pan y los cereales", caro: "caros", barato: "baratos" },
  { rid: "leche", dicho: "la leche, los quesos y los huevos", caro: "caros", barato: "baratos" },
  { rid: "frutas", dicho: "la fruta", caro: "cara", barato: "barata" },
  { rid: "verduras", dicho: "la verdura", caro: "cara", barato: "barata" },
  { rid: "01", dicho: "la comida", caro: "cara", barato: "barata" },
  { rid: "03", dicho: "la ropa", caro: "cara", barato: "barata" },
  { rid: "04", dicho: "la vivienda y los servicios", caro: "caros", barato: "baratos" },
  { rid: "06", dicho: "la salud", caro: "cara", barato: "barata" },
  { rid: "07", dicho: "el transporte", caro: "caro", barato: "barato" },
  { rid: "11", dicho: "comer afuera", caro: "caro", barato: "barato" },
  { rid: "total", dicho: "vivir", caro: "caro", barato: "barato" },
];
/** Países de "la región" (sin el país de referencia cuando es uno de ellos). */
export const REGION = ["BRA", "CHL", "MEX", "COL"];
const difPct = (a: number, o: number): number => Math.round((r1(a) / r1(o) - 1) * 100) || 0;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// ---- Remodelación de Contexto (docs/specs/remodelacion-contexto-precios.md): período, país de referencia y frase, con una sola cuenta.
export type Periodo = { tipo: "hoy" } | { tipo: "anio"; anio: number } | { tipo: "pres"; id: string; i0: string; i1: string; cierre?: boolean };   // cierre: el último mes con dato del mandato en vez del promedio
   // i0/i1: "AAAA-MM" recortados a d.fechas
export interface OpcionPeriodo { id: string; n: string; grupo: "Hoy" | "Un año" | "Presidente"; nota?: string }   // id = valor del parámetro pqa

const PRES_PERIODO = ["macri", "af", "milei"];   // los que tienen al menos MIN_MESES meses con datos (los datos empiezan en 2017-01)
/** Meses (de `d.fechas`) de un mandato, recortados a los datos: null si hay menos de MIN_MESES. */
function rangoPres(d: DatosPM, F: string[], p: Pres): { i0: string; i1: string; recortado: boolean } | null {
  const ini = p.ini, fin = F[Math.min(p.i1, F.length - 1)];   // desde el mes en que asumió (no el mes antes, que usan las tablas de mandatos)
  if (!ini || !fin || !d.fechas.length) return null;
  const i0 = ini > d.fechas[0] ? ini : d.fechas[0], i1 = fin < d.fechas[d.fechas.length - 1] ? fin : d.fechas[d.fechas.length - 1];
  const n = d.fechas.filter((f) => f >= i0 && f <= i1).length;
  return n >= MIN_MESES ? { i0, i1, recortado: ini < d.fechas[0] } : null;
}
/** Años con al menos MIN_MESES meses de datos (los mismos que promedia `promAnio`). */
function aniosConDatos(d: DatosPM): number[] {
  const n: Record<number, number> = {};
  d.fechas.forEach((f) => { n[anioDe(f)] = (n[anioDe(f)] ?? 0) + 1; });
  return Object.keys(n).map(Number).filter((a) => n[a] >= MIN_MESES).sort((a, b) => a - b);
}

/** Las opciones de la píldora "Período": Hoy, cada año con datos (de menor a mayor) y los presidentes con al menos 6 meses dentro de los datos. */
export function opcionesPeriodo(d: DatosPM, PRES: Pres[], F: string[]): OpcionPeriodo[] {
  const out: OpcionPeriodo[] = [{ id: "", n: "Hoy", grupo: "Hoy" }];
  const ult = d.fechas[d.fechas.length - 1];
  aniosConDatos(d).forEach((a) => out.push({ id: String(a), n: String(a), grupo: "Un año", ...(ult && anioDe(ult) === a && !ult.endsWith("-12") ? { nota: `hasta ${fmtMes(ult)}` } : {}) }));
  PRES_PERIODO.forEach((id) => {
    const p = PRES.find((x) => x.id === id), r = p ? rangoPres(d, F, p) : null;
    if (p && r) out.push({ id: `p-${id}`, n: p.n, grupo: "Presidente", ...(r.recortado ? { nota: `desde ${fmtMes(d.fechas[0])}` } : {}) });
  });
  return out;
}

/** El período de un valor de `pqa` ("" hoy, "2021" un año, "p-<id>" un presidente). Inválido o sin datos → hoy. */
export function periodoDe(id: string | null, d: DatosPM, PRES: Pres[], F: string[]): Periodo {
  const hoy: Periodo = { tipo: "hoy" };
  if (!id) return hoy;
  if (/^\d{4}$/.test(id)) return aniosConDatos(d).includes(+id) ? { tipo: "anio", anio: +id } : hoy;
  if (id.startsWith("p-") && PRES_PERIODO.includes(id.slice(2))) {
    const p = PRES.find((x) => x.id === id.slice(2)), r = p ? rangoPres(d, F, p) : null;
    return p && r ? { tipo: "pres", id: p.id, i0: r.i0, i1: r.i1 } : hoy;
  }
  return hoy;
}

/** Cómo se dice cada rubro en una oración y su concordancia ("la carne está 47 % más barata"). Los 18 rubros de PM_RUBROS. */
export const RUBRO_DICHO: Record<string, { dicho: string; caro: string; barato: string }> = (() => {
  const extra: Record<string, { dicho: string; caro: string; barato: string }> = {
    "02": { dicho: "las bebidas alcohólicas y el tabaco", caro: "caros", barato: "baratos" },
    "05": { dicho: "el equipamiento del hogar", caro: "caro", barato: "barato" },
    "08": { dicho: "la comunicación", caro: "cara", barato: "barata" },
    "09": { dicho: "la recreación y la cultura", caro: "caras", barato: "baratas" },
    "10": { dicho: "la educación", caro: "cara", barato: "barata" },
    "12": { dicho: "los bienes y servicios varios", caro: "caros", barato: "baratos" },
  };
  const out: Record<string, { dicho: string; caro: string; barato: string }> = {};
  PM_RUBROS.forEach(([rid, nombre]) => {
    const p = PREG_RUBROS.find((x) => x.rid === rid);
    out[rid] = p ? { dicho: p.dicho, caro: p.caro, barato: p.barato } : extra[rid] ?? { dicho: nombre.toLowerCase(), caro: "caro", barato: "barato" };
  });
  return out;
})();

/** Cómo se dice un país o grupo en una oración ("la Argentina", "la zona euro", "Brasil", "el mundo", "la región"). */
export const DICHO_PAIS = (d: DatosPM, ent: string): string =>
  ent === ARG ? "la Argentina" : ent === "EA" ? "la zona euro" : ent === "mundo" ? "el mundo" : ent === "region" ? "la región" : d.paises[ent] ?? ent;

/** Países que se pueden elegir como referencia en un rubro: la Argentina y los que tienen estimado mes a mes. */
export function referencias(d: DatosPM, arg: ArgPM, rid: string, dolar: Dolar): string[] {
  if (!d.rubros[rid]) return [ARG];
  const sin = new Set(Object.keys(d.sin_datos));
  return [ARG, ...Object.keys(d.paises).filter((c) => c !== ARG && !sin.has(c) && niveles(d, rid, c, arg, dolar).est.some((v) => ok(v)))];
}

/** El país de referencia contra una entrada (país, "mundo" o "region") en un mes (estimado), un promedio o un año medido. */
export interface FilaPrecio {
  ent: string; nombre: string; nivelRef: number; nivelOtro: number;
  dif: number;                 // % entero = (nivelRef / nivelOtro − 1) × 100 con los niveles a un decimal (como difPct)
  fecha: string;               // texto ya listo: "oct-26", "2021", "medido en 2021", "promedio dic-19 a nov-23"
  modo: "estimado" | "medido"; entran?: string[];
  cierre?: { dif: number; fecha: string };   // solo Por presidente: la diferencia en el último mes con dato del mandato (el promedio puede no parecerse al cierre)
}
type FilaInt = FilaPrecio & { iso: string };   // iso: "2026-10" o "2021" (para elegir el último mes de la frase)

/** Toma los meses válidos del período: el último (hoy) o el promedio (año o mandato, mínimo MIN_MESES meses). */
function agregar(idx: number[], hoy: boolean, valido: (i: number) => boolean, vr: (i: number) => number, vo: (i: number) => number): { nr: number; no: number; ult: number; meses: number[] } | null {
  const v = idx.filter(valido);
  if (hoy) { if (!v.length) return null; const i = v[v.length - 1]; return { nr: vr(i), no: vo(i), ult: i, meses: [i] }; }
  if (v.length < MIN_MESES) return null;
  const prom = (f: (i: number) => number) => v.reduce((s, i) => s + f(i), 0) / v.length;
  return { nr: prom(vr), no: prom(vo), ult: v[v.length - 1], meses: v };
}

function comparar(d: DatosPM, arg: ArgPM, rid: string, ref: string, periodo: Periodo, dolar: Dolar): { filas: FilaInt[]; soloMedido: FilaInt[]; fechaTxt: string } {
  const filas: FilaInt[] = [], soloMedido: FilaInt[] = [];
  if (!d.rubros[rid] || !d.paises[ref]) return { filas, soloMedido, fechaTxt: "" };
  const hoy = periodo.tipo === "hoy" || (periodo.tipo === "pres" && !!periodo.cierre);
  const idx = d.fechas.map((_, i) => i).filter((i) => periodo.tipo === "hoy" || (periodo.tipo === "anio" ? anioDe(d.fechas[i]) === periodo.anio : periodo.tipo === "pres" && d.fechas[i] >= periodo.i0 && d.fechas[i] <= periodo.i1));
  const a = niveles(d, rid, ref, arg, dolar);
  const sin = new Set(Object.keys(d.sin_datos));
  const nv: Record<string, Niveles> = {};
  const de = (c: string) => (nv[c] ??= niveles(d, rid, c, arg, dolar));
  const rangoTxt = periodo.tipo === "pres" ? `${fmtMes(periodo.i0)} a ${fmtMes(periodo.i1)}` : "";
  // En un mandato, el rango que dice es el de los meses que entraron en el promedio (la zona euro, por ejemplo, termina antes)
  const textoFecha = (ult: number, meses?: number[]) => (hoy ? fmtMes(d.fechas[ult]) : periodo.tipo === "anio" ? `promedio ${periodo.anio}` : meses?.length ? `promedio ${fmtMes(d.fechas[meses[0]])} a ${fmtMes(d.fechas[ult])}` : `promedio ${rangoTxt}`);
  const mk = (ent: string, nombre: string, g: { nr: number; no: number; ult: number; meses?: number[] }, extra: Partial<FilaPrecio> = {}): FilaInt =>
    ({ ent, nombre, nivelRef: g.nr, nivelOtro: g.no, dif: difPct(g.nr, g.no), fecha: textoFecha(g.ult, g.meses), iso: hoy ? d.fechas[g.ult] : textoFecha(g.ult, g.meses), modo: "estimado", ...extra });
  // Países con estimado (con la Argentina si la referencia es otra)
  for (const c of Object.keys(d.paises)) {
    if (c === ref || sin.has(c)) continue;
    const o = de(c).est;
    const g = agregar(idx, hoy, (i) => ok(a.est[i]) && ok(o[i]), (i) => a.est[i] as number, (i) => o[i] as number);
    if (g) filas.push(mk(c, d.paises[c], g));
  }
  // El mundo: nivel 100
  const gM = agregar(idx, hoy, (i) => ok(a.est[i]), (i) => a.est[i] as number, () => 100);
  if (gM) filas.push(mk("mundo", "El mundo", gM));
  // La región (sin el país de referencia): todos los países con estimado; si no alcanza, los meses en que al menos dos lo tienen
  const reg = REGION.filter((c) => c !== ref && d.paises[c] && !sin.has(c));
  if (reg.length) {
    const ests = reg.map((c) => de(c).est);
    const media = (i: number) => { const h = ests.map((e) => e[i]).filter(ok); return h.reduce((s, v) => s + v, 0) / h.length; };
    let g = agregar(idx, hoy, (i) => ok(a.est[i]) && ests.every((e) => ok(e[i])), (i) => a.est[i] as number, media);
    let entran = reg;
    if (!g && reg.length >= 2) {
      g = agregar(idx, hoy, (i) => ok(a.est[i]) && ests.filter((e) => ok(e[i])).length >= 2, (i) => a.est[i] as number, media);
      if (g) { const meses = g.meses; entran = reg.filter((_c, k) => meses.some((i) => ok(ests[k][i]))); }
    }
    if (g) filas.push(mk("region", "La región", g, { entran }));
  }
  // Sin estimado en el período: el año medido más reciente que cae en el período (hoy: el último) y en que también hay nivel del país de referencia
  const conEst = new Set(filas.map((f) => f.ent));
  const [y0, y1] = periodo.tipo === "anio" ? [periodo.anio, periodo.anio] : periodo.tipo === "pres" ? [anioDe(periodo.i0), anioDe(periodo.i1)] : [-Infinity, Infinity];
  for (const c of Object.keys(d.paises)) {
    if (c === ref || conEst.has(c)) continue;
    const anios = aniosMedidos(d).filter((y) => y >= y0 && y <= y1 && a.med[y] != null && d.medido[y]?.[rid]?.[c] != null).sort((x, y) => y - x);
    if (!anios.length) continue;
    const y = anios[0], o = d.medido[y][rid][c];
    soloMedido.push({ ent: c, nombre: d.paises[c], nivelRef: a.med[y], nivelOtro: o, dif: difPct(a.med[y], o), fecha: `medido en ${y}`, iso: String(y), modo: "medido" });
  }
  const orden = (x: FilaInt, y: FilaInt) => x.dif - y.dif || x.nombre.localeCompare(y.nombre, "es");
  const ultimo = filas.length ? filas.map((f) => f.iso).reduce((m, x) => (x > m ? x : m)) : "";
  const fechaTxt = !filas.length ? "" : periodo.tipo === "hoy" ? `estimado ${fmtMes(ultimo)}` : periodo.tipo === "anio" ? `promedio ${periodo.anio}` : `promedio de ${PRES_DEF.find((p) => p.id === periodo.id)?.n ?? periodo.id}, ${rangoTxt}`;
  return { filas: filas.sort(orden), soloMedido: soloMedido.sort(orden), fechaTxt };
}

/** El país de referencia contra cada país con estimado, el mundo y la región, en un período; aparte, los países solo medidos que caen en el período.
 *  Todo con el dólar elegido (afecta a la Argentina). */
export function compararPrecios(d: DatosPM, arg: ArgPM, rid: string, ref: string, periodo: Periodo, dolar: Dolar): { filas: FilaPrecio[]; soloMedido: FilaPrecio[]; fechaTxt: string } {
  const r = comparar(d, arg, rid, ref, periodo, dolar);
  const limpia = ({ iso: _iso, ...f }: FilaInt): FilaPrecio => f;
  return { filas: r.filas.map(limpia), soloMedido: r.soloMedido.map(limpia), fechaTxt: r.fechaTxt };
}

/** "La carne está 47 % más barata en la Argentina que en la zona euro (estimado oct-26, dólar oficial)." Sin adjetivos de juicio. */
export function frasePrecios(d: DatosPM, rid: string, ref: string, fila: FilaPrecio, fechaTxt: string, dolar: Dolar): string {
  const rub = RUBRO_DICHO[rid] ?? { dicho: (d.rubros[rid]?.n ?? rid).toLowerCase(), caro: "caro", barato: "barato" };
  const n = Math.abs(fila.dif), igual = n < 1, nn = nf0.format(n);
  const adj = fila.dif < 0 ? rub.barato : rub.caro, plural = rub.caro.endsWith("s");
  const en = DICHO_PAIS(d, ref), que = `que en ${DICHO_PAIS(d, fila.ent)}`;
  const cuerpo = rid === "total"
    ? (igual ? `Vivir en ${en} cuesta lo mismo ${que}` : `Vivir en ${en} es ${nn} % más ${adj} ${que}`)
    : (igual ? `${cap(rub.dicho)} ${plural ? "cuestan" : "cuesta"} lo mismo en ${en} ${que}` : `${cap(rub.dicho)} ${plural ? "están" : "está"} ${nn} % más ${adj} en ${en} ${que}`);
  // la fecha propia de la fila manda en "hoy" (cada país puede tener otro último mes) y en lo medido
  const cuando = fila.modo === "medido" ? fila.fecha : fechaTxt.startsWith("estimado") ? `estimado ${fila.fecha}` : fechaTxt;
  const conArg = ref === ARG || fila.ent === ARG;
  return `${cuerpo} (${cuando}${conArg ? `, dólar ${dolar}` : ""}).`;
}

/** Segunda vuelta: todos los rubros, el país de referencia contra una entrada (país, "mundo" o "region"), en un período.
 *  ent = id del rubro, nombre = nombre del rubro; solo los rubros con dato. Misma cuenta que `compararPrecios`. */
export function compararPorRubro(d: DatosPM, arg: ArgPM, ref: string, contra: string, periodo: Periodo, dolar: Dolar): { filas: FilaPrecio[]; fechaTxt: string } {
  const filas: FilaPrecio[] = [];
  let fechaTxt = "";
  for (const rid of Object.keys(d.rubros)) {
    const r = compararPrecios(d, arg, rid, ref, periodo, dolar);
    const f = [...r.filas, ...r.soloMedido].find((x) => x.ent === contra);
    if (!f) continue;
    filas.push({ ...f, ent: rid, nombre: d.rubros[rid].n });
    if (!fechaTxt && f.modo === "estimado") fechaTxt = r.fechaTxt;
  }
  return { filas, fechaTxt };
}

/** Segunda vuelta: un rubro y un país de referencia contra `contra`, el promedio de cada mandato (Macri, Alberto Fernández, Milei) en orden cronológico.
 *  ent = id del presidente, nombre = nombre, fecha = "ene-17 a nov-19". Sin fila si no hay dato. */
export function compararPorPresidente(d: DatosPM, arg: ArgPM, rid: string, ref: string, contra: string, PRES: Pres[], F: string[], dolar: Dolar): FilaPrecio[] {
  const out: FilaPrecio[] = [];
  for (const op of opcionesPeriodo(d, PRES, F)) {
    if (op.grupo !== "Presidente") continue;
    const per = periodoDe(op.id, d, PRES, F);
    if (per.tipo !== "pres") continue;
    const r = compararPrecios(d, arg, rid, ref, per, dolar);
    const f = [...r.filas, ...r.soloMedido].find((x) => x.ent === contra);
    if (!f) continue;
    const p = PRES.find((x) => x.id === per.id);
    const rc = compararPrecios(d, arg, rid, ref, { ...per, cierre: true }, dolar);
    const fc = rc.filas.find((x) => x.ent === contra);
    out.push({ ...f, ent: per.id, nombre: p?.n ?? per.id, ...(fc && f.modo === "estimado" ? { cierre: { dif: fc.dif, fecha: fc.fecha } } : {}) });
  }
  return out;
}
