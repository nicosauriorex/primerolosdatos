// Precios en el mundo (bloque 6c): niveles de precios por rubro, Argentina contra el mundo y otros países, en dólares.
// Una sola fuente de verdad para el bloque de Contexto, las plantillas y el recuadro del mandato.
// Los datos medidos (ICP, Banco Mundial; mundo = 100) y el IPC de otros países vienen de precios_mundo.json;
// el IPC por rubro y el dólar de la Argentina salen del catálogo (no se duplican).
import type { Motor } from "./motor";
import type { Pres } from "./estadisticas";
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

// ---- La pregunta de Contexto: "¿Es más cara la carne en la Argentina que en la zona euro?"
// Misma cuenta (`niveles`) que la lista y el detalle del bloque de precios: ninguna cifra se escribe a mano.
/** Rubros que se pueden elegir en la pregunta. `dicho`: cómo se dice en la oración; `caro`/`barato`: concordancia; `producto`: precio promedio del INDEC (GBA) para los kilos por salario; `cosa`: qué se compra ("de asado"). */
export interface PregRubro { rid: string; dicho: string; caro: string; barato: string; producto?: string; cosa?: string }
export const PREG_RUBROS: PregRubro[] = [
  { rid: "carne", dicho: "la carne", caro: "cara", barato: "barata", producto: "pp_gba_asado", cosa: "de asado" },
  { rid: "pan", dicho: "el pan y los cereales", caro: "caros", barato: "baratos", producto: "pp_gba_pan_frances", cosa: "de pan" },
  { rid: "leche", dicho: "la leche, los quesos y los huevos", caro: "caros", barato: "baratos", producto: "pp_gba_leche_fresca_entera_sachet", cosa: "de leche" },
  { rid: "frutas", dicho: "la fruta", caro: "cara", barato: "barata", producto: "pp_gba_manzana_deliciosa", cosa: "de manzana" },
  { rid: "verduras", dicho: "la verdura", caro: "cara", barato: "barata", producto: "pp_gba_papa", cosa: "de papa" },
  { rid: "01", dicho: "la comida", caro: "cara", barato: "barata" },
  { rid: "03", dicho: "la ropa", caro: "cara", barato: "barata" },
  { rid: "04", dicho: "la vivienda y los servicios", caro: "caros", barato: "baratos" },
  { rid: "06", dicho: "la salud", caro: "cara", barato: "barata" },
  { rid: "07", dicho: "el transporte", caro: "caro", barato: "barato" },
  { rid: "11", dicho: "comer afuera", caro: "caro", barato: "barato" },
  { rid: "total", dicho: "vivir", caro: "caro", barato: "barato" },
];
/** Series extra del catálogo que necesita la pregunta (además de IDS_PM): el salario mediano y los productos de los rubros. */
export const IDS_PREGUNTA: string[] = ["sipa_med", ...PREG_RUBROS.flatMap((r) => (r.producto ? [r.producto] : []))];

/** Contra quién se compara. `ents`: países que entran (vacío en "el mundo", que vale 100 por definición). */
export interface PregContra { id: string; dicho: string; ents: string[] }
export const REGION = ["BRA", "CHL", "MEX", "COL"];
export const PREG_CONTRA: PregContra[] = [
  { id: "EA", dicho: "la zona euro", ents: ["EA"] },
  { id: "mundo", dicho: "el mundo", ents: [] },
  { id: "region", dicho: "la región", ents: REGION },
  { id: "USA", dicho: "Estados Unidos", ents: ["USA"] },
  { id: "BRA", dicho: "Brasil", ents: ["BRA"] },
  { id: "CHL", dicho: "Chile", ents: ["CHL"] },
  { id: "MEX", dicho: "México", ents: ["MEX"] },
  { id: "COL", dicho: "Colombia", ents: ["COL"] },
];

/** Argentina contra una entrada (país, "mundo" o "region") en un mes (estimado) o un año (medido). */
export interface FilaComparacion {
  ent: string; nombre: string; nivelArg: number; nivelOtro: number;
  dif: number;                       // % entero: (nivel de la Argentina / nivel del otro − 1) × 100, con los niveles que se muestran (un decimal)
  fecha: string;                     // "2026-10" o "2021"
  modo: "estimado" | "medido";
  entran?: string[];                 // solo "region": países que entraron en el promedio
}
const difPct = (a: number, o: number): number => Math.round((r1(a) / r1(o) - 1) * 100) || 0;
/** Último índice en que todas las series tienen valor (o -1). */
function ultimoComun(series: Serie[]): number {
  const n = Math.min(...series.map((s) => s.length));
  for (let i = n - 1; i >= 0; i--) if (series.every((s) => ok(s[i]))) return i;
  return -1;
}

/** Argentina contra cada país con estimado, el mundo y la región (último mes en que hay estimado de los dos), y aparte los países sin IPC por rubro (solo medido). Todo con el dólar elegido. */
export function comparacionRubro(d: DatosPM, arg: ArgPM, rid: string, dolar: Dolar): { filas: FilaComparacion[]; soloMedido: FilaComparacion[] } {
  const filas: FilaComparacion[] = [], soloMedido: FilaComparacion[] = [];
  if (!d.rubros[rid]) return { filas, soloMedido };
  const a = niveles(d, rid, ARG, arg, dolar);
  const sin = new Set(Object.keys(d.sin_datos));
  const nv: Record<string, Niveles> = {};
  const de = (c: string) => (nv[c] ??= niveles(d, rid, c, arg, dolar));
  const mk = (ent: string, nombre: string, i: number, otro: number, extra: Partial<FilaComparacion> = {}): FilaComparacion => {
    const na = a.est[i] as number;
    return { ent, nombre, nivelArg: na, nivelOtro: otro, dif: difPct(na, otro), fecha: d.fechas[i], modo: "estimado", ...extra };
  };
  // Países con estimado
  for (const c of Object.keys(d.paises)) {
    if (c === ARG || sin.has(c)) continue;
    const i = ultimoComun([a.est, de(c).est]);
    if (i >= 0) filas.push(mk(c, d.paises[c], i, de(c).est[i] as number));
  }
  // El mundo: último mes con estimado de la Argentina, nivel 100
  const iMundo = ultimoComun([a.est]);
  if (iMundo >= 0) filas.push(mk("mundo", "El mundo", iMundo, 100));
  // La región: último mes en que los cuatro tienen estimado; si no, el último en que al menos dos tienen
  const reg = REGION.filter((c) => d.paises[c] && !sin.has(c));
  let iReg = reg.length ? ultimoComun([a.est, ...reg.map((c) => de(c).est)]) : -1;
  let entran = reg;
  if (iReg < 0 && reg.length >= 2) {
    for (let i = d.fechas.length - 1; i >= 0 && iReg < 0; i--) {
      const hay = reg.filter((c) => ok(de(c).est[i]));
      if (ok(a.est[i]) && hay.length >= 2) { iReg = i; entran = hay; }
    }
  }
  if (iReg >= 0) {
    const prom = entran.reduce((s, c) => s + (de(c).est[iReg] as number), 0) / entran.length;
    filas.push(mk("region", "La región", iReg, prom, { entran }));
  }
  // Sin estimado de este rubro (no publican su IPC, o no el de este rubro): último año medido en que también hay nivel de la Argentina
  const conEst = new Set(filas.map((f) => f.ent));
  for (const c of Object.keys(d.paises)) {
    if (c === ARG || conEst.has(c)) continue;
    const anios = aniosMedidos(d).filter((y) => a.med[y] != null && d.medido[y]?.[rid]?.[c] != null).sort((x, y) => y - x);
    if (!anios.length) continue;
    const y = anios[0], o = d.medido[y][rid][c];
    soloMedido.push({ ent: c, nombre: d.paises[c], nivelArg: a.med[y], nivelOtro: o, dif: difPct(a.med[y], o), fecha: String(y), modo: "medido" });
  }
  const orden = (x: FilaComparacion, y: FilaComparacion) => x.dif - y.dif || x.nombre.localeCompare(y.nombre, "es");
  return { filas: filas.sort(orden), soloMedido: soloMedido.sort(orden) };
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export interface RespuestaPregunta {
  fila: FilaComparacion;
  cifra: string;       // "54 % más barata"
  que: string;         // "que en la zona euro"
  fechaTxt: string;    // "estimado oct-2026"
  dolarTxt: string;    // "dólar oficial"
  frase: string;       // "La carne está 54 % más barata en la Argentina que en la zona euro (estimado oct-2026, dólar oficial)."
}
/** La respuesta a "¿Es más cara <rubro> en la Argentina que en <contra>?" (null si no hay estimado de esa combinación). Sin adjetivos de juicio. */
export function respuestaPregunta(d: DatosPM, arg: ArgPM, rid: string, contra: string, dolar: Dolar): RespuestaPregunta | null {
  const rub = PREG_RUBROS.find((x) => x.rid === rid), con = PREG_CONTRA.find((x) => x.id === contra);
  if (!rub || !con) return null;
  const cmp = comparacionRubro(d, arg, rid, dolar);
  const fila = cmp.filas.find((f) => f.ent === contra) ?? cmp.soloMedido.find((f) => f.ent === contra);
  if (!fila) return null;
  const n = Math.abs(fila.dif), igual = n < 1;
  const adj = fila.dif < 0 ? rub.barato : rub.caro;
  const que = `que en ${con.dicho}`;
  const fechaTxt = fila.modo === "estimado" ? `estimado ${fmtMes(fila.fecha)}` : `medido en ${fila.fecha}`;
  const dolarTxt = `dólar ${dolar}`;
  const plural = rub.caro.endsWith("s");
  const nn = nf0.format(n);
  const cifra = igual ? "Cuesta lo mismo" : `${nn} % más ${adj}`;
  const cuerpo = rid === "total"
    ? (igual ? `Vivir en la Argentina cuesta lo mismo ${que}` : `Vivir en la Argentina es ${nn} % más ${adj} ${que}`)
    : (igual ? `${cap(rub.dicho)} ${plural ? "cuestan" : "cuesta"} lo mismo en la Argentina ${que}` : `${cap(rub.dicho)} ${plural ? "están" : "está"} ${nn} % más ${adj} en la Argentina ${que}`);
  return { fila, cifra, que, fechaTxt, dolarTxt, frase: `${cuerpo} (${fechaTxt}, ${dolarTxt}).` };
}
