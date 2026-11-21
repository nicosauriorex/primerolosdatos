// Empresas públicas (/gasto/?vista=empresas, docs/specs/empresas-publicas.md, fase 4 de gasto): cuánto les transfiere el Tesoro cada mes
// y cuánta gente trabaja en cada una. Los datos los escribe pipeline/empresas_publicas.py (`empresas_publicas.json`).
// Montos en millones de pesos corrientes (devengado: transferencias corrientes y de capital, más aportes de capital). Pesos de hoy con el deflactor MENSUAL de gasto-mensual.ts.
// El año en curso se compara siempre contra los mismos meses del año anterior. Las cuentas cierran con los valores redondeados que se ven.
// Sin veredicto (D-012): que el Tesoro ponga más o menos no es bueno ni malo. Lo que se transfiere no es lo que gasta la empresa ni su resultado.
import type { FormatoImg } from "./config";
import type { DatosImagen, FilaBarra, TarjetaImg } from "./imagen";
import { MESES, fmtMes, nf0, nfDec, norm, r1, unidadMontoDe, fmtMillones, valorMostrado } from "./formato";
import { aDec, conSigno, escalaDe, escribirRuta, fechaLarga, mostrado, repartir } from "./gasto";
import type { DeflactorMensual } from "./gasto-mensual";

// ---------------------------------------------------------------- formato del archivo (contrato con el pipeline)
export interface EmpresaEP {
  n: string; t?: string; grupo?: string;
  corr: number[]; cap: number[]; apo: number[]; vig: number[];   // un valor por mes de `meses` (millones de pesos corrientes); apo = aportes de capital
  ocup: (number | null)[]; fuente_ocup: string | null;   // un valor por mes de `meses_ocup`; null = sin dato
}
export interface TotalEP { corr: number[]; cap: number[]; apo: number[]; vig: number[]; ocup: (number | null)[] }
export interface ArchivoEmpresas {
  generado: string; fuente: string; actualizado: string | null;
  meses: string[]; meses_ocup: string[];
  empresas: EmpresaEP[]; total: TotalEP;
}

const esNum = (x: unknown): x is number => typeof x === "number" && isFinite(x);
const numeros = (x: unknown, n: number): number[] | null => (Array.isArray(x) && x.length === n && x.every(esNum) ? (x as number[]) : null);
const conHuecos = (x: unknown): (number | null)[] | null => (Array.isArray(x) && x.every((v) => v === null || esNum(v)) ? (x as (number | null)[]) : null);
const esMes = (x: unknown): x is string => typeof x === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(x);

/** Valida el archivo. null si falta algo esencial: en ese caso la vista no aparece. */
export function decodificarEmpresas(c: unknown): ArchivoEmpresas | null {
  if (!c || typeof c !== "object") return null;
  const r = c as ArchivoEmpresas;
  if (!Array.isArray(r.meses) || !r.meses.length || !r.meses.every(esMes) || !Array.isArray(r.meses_ocup) || !r.meses_ocup.every(esMes)) return null;
  const N = r.meses.length;
  if (!Array.isArray(r.empresas) || !r.empresas.length || !r.total || typeof r.total !== "object") return null;
  const corr = numeros(r.total.corr, N), cap = numeros(r.total.cap, N), ocupT = conHuecos(r.total.ocup);
  if (!corr || !cap || !ocupT) return null;
  const ceros = Array.from({ length: N }, () => 0);   // archivo viejo sin aportes de capital: ceros
  const empresas: EmpresaEP[] = [];
  for (const e of r.empresas) {
    if (!e || typeof e.n !== "string" || !e.n) return null;
    const ec = numeros(e.corr, N), ep = numeros(e.cap, N), eo = conHuecos(e.ocup);
    if (!ec || !ep || !eo) return null;
    empresas.push({
      n: e.n, ...(typeof e.t === "string" && e.t ? { t: e.t } : {}), ...(typeof e.grupo === "string" && e.grupo ? { grupo: e.grupo } : {}),
      corr: ec, cap: ep, apo: numeros(e.apo, N) ?? ceros, vig: numeros(e.vig, N) ?? [], ocup: eo, fuente_ocup: typeof e.fuente_ocup === "string" ? e.fuente_ocup : null,
    });
  }
  return {
    generado: typeof r.generado === "string" ? r.generado : "", fuente: typeof r.fuente === "string" ? r.fuente : "",
    actualizado: typeof r.actualizado === "string" ? r.actualizado : null,
    meses: r.meses, meses_ocup: r.meses_ocup, empresas,
    total: { corr, cap, apo: numeros(r.total.apo, N) ?? ceros, vig: numeros(r.total.vig, N) ?? [], ocup: ocupT },
  };
}

// ---------------------------------------------------------------- opciones de la página (valores de la URL)
export type OrdenEP = "monto" | "variacion" | "empleados";
export const ORDENES_EP: [OrdenEP, string][] = [["monto", "Más recibió"], ["variacion", "Variación real"], ["empleados", "Más empleados"]];
export const ORDEN_EP_DEFECTO: OrdenEP = "monto";
export const esOrdenEP = (s: string | null): s is OrdenEP => ORDENES_EP.some((o) => o[0] === s);
export const MAX_FILAS_EP = 10;
/** Un mes de empleados vale para el promedio del año solo si hay al menos esta cantidad con dato. */
export const MIN_MESES_EMPLEADOS = 6;
/** Por debajo de este % del total de lo que se está mirando, una base de comparación es chica y la variación no se muestra (como en "Cómo viene el año"). */
const BASE_INFIMA = 0.1;
export const NOMBRE_RAIZ = "Empresas públicas";
export const OPCION_EMPRESAS: [string, string] = ["empresas", "Empresas públicas"];
export const FUENTE_EMPRESAS = "OPC, Monitor de transferencias a empresas públicas (e-SIDIF); aportes de capital: Presupuesto Abierto";

const claveMes = (anio: number, mes: number) => `${anio}-${String(mes).padStart(2, "0")}`;
const varSigno = (r: number) => `${r > 0 ? "+" : ""}${conSigno(r, 1)} %`;
const nfPct = (x: number) => String(x).replace(".", ",");
const esSinDiscriminar = (n: string) => norm(n).startsWith("sin discriminar");

// ---------------------------------------------------------------- años y período
export interface AnioEP { anio: number; k: number }
/** Cuántos meses hay de cada año en el archivo (en orden). Un año está cerrado con sus 12 meses. */
export function aniosDe(ar: ArchivoEmpresas): AnioEP[] {
  const cuenta = new Map<number, number>();
  for (const m of ar.meses) cuenta.set(+m.slice(0, 4), (cuenta.get(+m.slice(0, 4)) ?? 0) + 1);
  return [...cuenta.entries()].map(([anio, k]) => ({ anio, k })).sort((a, b) => a.anio - b.anio);
}
/** El año pedido si el archivo lo trae; si no, el último año cerrado (o el último, si ninguno cerró). */
export function anioDefectoEP(ar: ArchivoEmpresas): AnioEP {
  const a = aniosDe(ar), cerrados = a.filter((x) => x.k === 12);
  return (cerrados.length ? cerrados : a)[(cerrados.length ? cerrados : a).length - 1];
}
export const anioPedidoEP = (ar: ArchivoEmpresas, s: string | null): AnioEP => aniosDe(ar).find((a) => String(a.anio) === s) ?? anioDefectoEP(ar);
/** Selector de año, de más nuevo a más viejo; el año en curso dice hasta qué mes. */
export const opcionesAnioEP = (ar: ArchivoEmpresas): [string, string][] =>
  [...aniosDe(ar)].reverse().map((a): [string, string] => [String(a.anio), a.k < 12 ? `${a.anio} · ene a ${MESES[a.k - 1]}` : String(a.anio)]);

// ---------------------------------------------------------------- el árbol: grupos y empresas
export interface SerieEP { corr: number[]; cap: number[]; apo: number[]; ocup: (number | null)[] }
export interface NodoEP {
  n: string; t?: string; serie: SerieEP;
  hijos?: NodoEP[];             // el grupo (Trenes Argentinos) se abre en sus empresas
  fuenteOcup: string | null;    // de dónde salen los empleados (SIRHU o Presupuesto); null si no hay
  grupo?: string;               // nombre del grupo al que pertenece (en las empresas que lo tienen)
}

const sumaSeries = (xs: number[][], N: number) => Array.from({ length: N }, (_, i) => xs.reduce((s, x) => s + x[i], 0));
/** Empleados de un grupo: la suma de sus empresas, con la regla del pipeline: cada empresa cuenta entre su primer y su último mes con dato
 *  (una que empieza o deja de figurar no vacía el grupo); si le falta un mes en medio, ese mes queda vacío (no se rellena). */
function ocupGrupo(hojas: EmpresaEP[], No: number): (number | null)[] {
  const con = hojas.map((h) => {
    const idx = h.ocup.map((x, i) => (x == null ? -1 : i)).filter((i) => i >= 0);
    return { h, desde: idx[0], hasta: idx[idx.length - 1] };
  }).filter((c) => c.desde !== undefined);
  return Array.from({ length: No }, (_, i) => {
    const vig = con.filter((c) => c.desde <= i && i <= c.hasta);
    if (!vig.length) return null;
    let s = 0;
    for (const { h } of vig) { const x = h.ocup[i]; if (x == null) return null; s += x; }
    return s;
  });
}
const cache = new WeakMap<ArchivoEmpresas, NodoEP>();
/** La raíz (todas las empresas) con sus hijos: los grupos y las empresas sueltas, en el orden del archivo. */
export function arbolEmpresas(ar: ArchivoEmpresas): NodoEP {
  const ya = cache.get(ar);
  if (ya) return ya;
  const N = ar.meses.length, No = ar.meses_ocup.length;
  const hoja = (e: EmpresaEP): NodoEP => ({ n: e.n, ...(e.t ? { t: e.t } : {}), serie: { corr: e.corr, cap: e.cap, apo: e.apo, ocup: e.ocup }, fuenteOcup: e.fuente_ocup, ...(e.grupo ? { grupo: e.grupo } : {}) });
  const hijos: NodoEP[] = [], grupos = new Map<string, EmpresaEP[]>();
  for (const e of ar.empresas) {
    if (!e.grupo) { hijos.push(hoja(e)); continue; }
    const g = grupos.get(e.grupo);
    if (g) { g.push(e); continue; }
    grupos.set(e.grupo, [e]);
    hijos.push({ n: e.grupo, serie: { corr: [], cap: [], apo: [], ocup: [] }, fuenteOcup: null });   // se completa abajo, en el mismo lugar
  }
  for (const h of hijos) {
    const miembros = grupos.get(h.n);
    if (!miembros || h.hijos) continue;
    h.hijos = miembros.map(hoja);
    h.serie = { corr: sumaSeries(miembros.map((m) => m.corr), N), cap: sumaSeries(miembros.map((m) => m.cap), N), apo: sumaSeries(miembros.map((m) => m.apo), N), ocup: ocupGrupo(miembros, No) };
    h.fuenteOcup = miembros.find((m) => m.fuente_ocup)?.fuente_ocup ?? null;
  }
  const raiz: NodoEP = { n: NOMBRE_RAIZ, serie: { corr: ar.total.corr, cap: ar.total.cap, apo: ar.total.apo, ocup: ar.total.ocup }, hijos, fuenteOcup: null };
  cache.set(ar, raiz);
  return raiz;
}
/** Camino de nombres desde la raíz (sin importar mayúsculas ni tildes); corta en el primero que no está. */
export function recorrerEP(raiz: NodoEP, ruta: string[]): NodoEP[] {
  const camino = [raiz];
  for (const n of ruta) {
    const k = norm(n).trim(), sig = camino[camino.length - 1].hijos?.find((x) => norm(x.n).trim() === k);
    if (!sig) break;
    camino.push(sig);
  }
  return camino;
}

// ---------------------------------------------------------------- cuentas de un período
interface Ctx { ar: ArchivoEmpresas; def: DeflactorMensual; im: Map<string, number>; io: Map<string, number>; sinIpc: boolean }
const crearCtx = (ar: ArchivoEmpresas, def: DeflactorMensual): Ctx => ({
  ar, def, im: new Map(ar.meses.map((m, i) => [m, i])), io: new Map(ar.meses_ocup.map((m, i) => [m, i])), sinIpc: !def.ref,
});
const factor = (c: Ctx, anio: number, mes: number) => (c.sinIpc ? 1 : c.def.factor(anio, mes)?.f ?? 1);

/** Lo transferido en los primeros `k` meses de `anio`, en pesos de hoy. null si al archivo le falta alguno de esos meses. */
function transferido(s: SerieEP, c: Ctx, anio: number, k: number, parte: "todo" | "corr" | "cap" | "apo" = "todo"): number | null {
  let t = 0;
  for (let m = 1; m <= k; m++) {
    const i = c.im.get(claveMes(anio, m));
    if (i == null) return null;
    t += ((parte === "todo" || parte === "corr" ? s.corr[i] ?? 0 : 0) + (parte === "todo" || parte === "cap" ? s.cap[i] ?? 0 : 0) + (parte === "todo" || parte === "apo" ? s.apo[i] ?? 0 : 0)) * factor(c, anio, m);
  }
  return t;
}
interface Empleados {
  ult: { v: number; mes: string } | null;   // el último mes con dato dentro del período
  ant: number | null;                       // el mismo mes un año antes
  prom: number | null; meses: number;       // promedio de los meses con dato del período y cuántos son
}
function empleados(s: SerieEP, c: Ctx, anio: number, k: number): Empleados {
  let ult: Empleados["ult"] = null, suma = 0, n = 0;
  for (let m = k; m >= 1; m--) {
    const i = c.io.get(claveMes(anio, m)), v = i == null ? null : s.ocup[i];
    if (v == null) continue;
    if (!ult) ult = { v, mes: claveMes(anio, m) };
    suma += v; n++;
  }
  let ant: number | null = null;
  if (ult) { const j = c.io.get(claveMes(anio - 1, +ult.mes.slice(5, 7))); ant = j == null ? null : s.ocup[j]; }
  return { ult, ant, prom: n ? suma / n : null, meses: n };
}

type Var = { tipo: "num"; pct: number } | { tipo: "nuevo" | "sinBase" | "infima" | "vacio" };

// ---------------------------------------------------------------- la vista
export interface FilaEP {
  tipo: "nodo" | "otras" | "redondeo";
  n: string; t?: string; nodo: NodoEP | null;
  abre: boolean;             // un grupo (se abre en sus empresas)
  txt: string;               // lo transferido en el período, en pesos de hoy
  parte: string | null;      // % del total de la lista
  ancho: number;             // largo de la barra, de 0 a 1
  varTxt: string | null;     // "Variación real: +3,2 %"
  nota: string | null;       // explicación cuando no hay variación numérica
  empTxt: string | null;     // "12.345 empleados" / "sin dato de empleados"
  porEmpTxt: string | null;  // "$ 5,3 millones por empleado"
  cuantos?: number;
  ruta?: string[];           // desde la raíz (en los resultados de la búsqueda)
  donde?: string | null;     // "en Trenes Argentinos" (en los resultados de la búsqueda)
}
export interface AnioBarra {
  anio: number; k: number; parcial: boolean; corr: number; cap: number; apo: number; total: number;
  marca: number | null;      // en el año en curso: lo transferido en los mismos meses del año anterior
  etiqueta: string;          // "2026 · ene a oct"
}
export interface FilaTablaAnio { anio: number; etiqueta: string; corr: string; cap: string; apo: string; total: string }
export interface AnualEP {
  anios: AnioBarra[]; ref: string; tabla: FilaTablaAnio[];
  unidad: string;
}
export interface PersonasEP { meses: string[]; v: (number | null)[]; max: number; primero: { mes: string; v: number } | null; ultimo: { mes: string; v: number } | null; fuente: string | null }
export interface VistaEP {
  ruta: string[]; camino: NodoEP[]; nodo: NodoEP; orden: OrdenEP;
  anio: number; anioAnt: number | null; k: number; enCurso: boolean;
  periodo: string;            // "2025" o "ene a oct de 2026"
  periodoAnt: string | null;  // "2024" o "ene a oct de 2025"
  periodoCorto: string;       // "2025" o "ene a oct"
  ref: string;                // "oct-26"
  tarjetas: { transferido: { valor: string; sub: string }; variacion: { valor: string; sub: string }; empleados: { valor: string; sub: string } };
  totalTxt: string; totalAntTxt: string | null; varTotalTxt: string;
  filas: FilaEP[];
  unidad: string;
  ipcAviso: string | null;
  sinIpc: boolean;
  anual: AnualEP;
  personas: PersonasEP | null;
  porEmpTotalTxt: string | null;
  datosTransf: string;        // "oct-26"
  datosOcup: string;          // "ago-26"
}

const porEmpleadoTxt = (millones: number) => `$ ${nfDec(1).format(millones)} millones por empleado`;

interface Per {
  c: Ctx; A: number; B: number | null; k: number; hayB: boolean;
  met: (n: NodoEP) => Met;
}
interface Met { gA: number; gB: number | null; emp: Empleados }
const crearPer = (c: Ctx, a: AnioEP): Per => {
  const B = a.anio - 1, hayB = c.im.has(claveMes(B, 1)) && c.im.has(claveMes(B, a.k));
  return {
    c, A: a.anio, B: hayB ? B : null, k: a.k, hayB,
    met: (n) => ({ gA: transferido(n.serie, c, a.anio, a.k) ?? 0, gB: hayB ? transferido(n.serie, c, B, a.k) : null, emp: empleados(n.serie, c, a.anio, a.k) }),
  };
};
const periodoTxt = (anio: number, k: number) => (k >= 12 ? String(anio) : `ene a ${MESES[k - 1]} de ${anio}`);

/** Variación real de una fila. `umbral`: por debajo, la base de comparación es chica. */
function variacionDe(m: { gA: number; gB: number | null }, umbral: number): Var {
  if (m.gB == null) return { tipo: "sinBase" };
  if (m.gB <= 0) return m.gA > 0 ? { tipo: "nuevo" } : { tipo: "vacio" };
  if (m.gB < umbral && m.gA > 2 * m.gB) return { tipo: "infima" };
  return { tipo: "num", pct: (m.gA / m.gB - 1) * 100 };
}
function textoVar(v: Var, p: { anio: number; k: number }): { varTxt: string; nota: string | null } {
  const antes = periodoTxt(p.anio - 1, p.k);
  switch (v.tipo) {
    case "num": return { varTxt: `Variación real: ${varSigno(r1(v.pct))}`, nota: null };
    case "nuevo": return { varTxt: "Variación real: —", nota: `En ${antes} no recibió fondos del Tesoro: no hay con qué comparar.` };
    case "sinBase": return { varTxt: "Variación real: —", nota: `No hay datos de ${p.anio - 1} para comparar.` };
    case "infima": return { varTxt: "Variación real: —", nota: `En ${antes} recibió menos de ${nfPct(BASE_INFIMA)} % del total de esta lista: sobre una base tan chica, el porcentaje exagera.` };
    default: return { varTxt: "Variación real: —", nota: null };
  }
}

/** Arma la vista del nodo abierto (`ruta`): tarjetas, gráfico por año, gente por mes y las filas de su nivel siguiente. */
export function armarEmpresas(o: { archivo: ArchivoEmpresas; ruta: string[]; orden: OrdenEP; anio: string | null; deflactor: DeflactorMensual; todas?: boolean }): VistaEP {
  const ar = o.archivo, c = crearCtx(ar, o.deflactor), a = anioPedidoEP(ar, o.anio), per = crearPer(c, a), def = o.deflactor;
  const raiz = arbolEmpresas(ar), camino = recorrerEP(raiz, o.ruta), nodo = camino[camino.length - 1];
  const { A, B, k } = per;
  const mN = per.met(nodo);
  const sinPublicar = c.sinIpc ? [] : Array.from({ length: k }, (_, i) => i + 1).filter((m) => def.factor(A, m)?.estimado);

  // ----- filas: las empresas de un nivel (sin discriminar y el resto, en "Otras")
  const umbral = Math.abs(mN.gB ?? 0) * BASE_INFIMA / 100;
  type Cand = { n: NodoEP; m: Met; v: Var };
  const todos: Cand[] = (nodo.hijos ?? []).map((n) => { const m = per.met(n); return { n, m, v: variacionDe(m, umbral) }; })
    .filter((x) => x.m.gA !== 0 || (x.m.gB ?? 0) !== 0 || x.m.emp.ult);   // una empresa sin plata ni gente en el período no figura
  const sinDisc = o.todas ? [] : todos.filter((x) => esSinDiscriminar(x.n.n));
  const cands = todos.filter((x) => !sinDisc.includes(x));
  const porMonto = (x: Cand, y: Cand) => y.m.gA - x.m.gA;
  const num = (x: Cand) => (x.v.tipo === "num" ? x.v.pct : null);
  const emps = (x: Cand) => x.m.emp.ult?.v ?? null;
  const clave = o.orden === "variacion" ? num : o.orden === "empleados" ? emps : null;
  const ordenados = [...cands].sort(!clave ? porMonto : (x, y) => {
    const p = clave(x), q = clave(y);
    if (p == null || q == null) return p == null && q == null ? porMonto(x, y) : p == null ? 1 : -1;
    return (q - p) || porMonto(x, y);
  });
  const max = o.todas ? Infinity : MAX_FILAS_EP;
  const vistos = ordenados.length > max + 1 ? ordenados.slice(0, max) : ordenados;   // si sobra una sola, se muestra en lugar de "Otras (1)"
  const resto = [...ordenados.slice(vistos.length), ...sinDisc];
  const sumaMet = (xs: Met[]): Met => ({
    gA: xs.reduce((s, x) => s + x.gA, 0), gB: xs.some((x) => x.gB == null) ? null : xs.reduce((s, x) => s + (x.gB as number), 0), emp: { ult: null, ant: null, prom: null, meses: 0 },
  });
  const mResto = sumaMet(resto.map((x) => x.m));

  // ----- una sola escala para tarjetas, años y filas (así las cuentas se pueden seguir)
  const anual = armarAnual(nodo, c, per);
  const positivos = [...vistos.map((x) => x.m.gA), ...(resto.length ? [mResto.gA] : []), mN.gA, mN.gB ?? 0].map(Math.abs).filter((x) => x > 0);
  const esc = escalaDe("hoy", Math.max(Math.abs(mN.gA), Math.abs(mN.gB ?? 0)), positivos.length ? Math.min(...positivos) : 0);
  const totalR = mostrado(esc, mN.gA), totalR1 = mN.gB == null ? null : mostrado(esc, mN.gB);

  const filasR = resto.length ? vistos.map((x) => mostrado(esc, x.m.gA)) : repartir(vistos.map((x) => esc.a(x.m.gA)), totalR, esc.dec);
  const otrasR = aDec(totalR - filasR.reduce((s, x) => s + x, 0), esc.dec);
  const hayOtras = resto.length > 0;
  // % del total con los montos redondeados; los renglones suman 100,0
  const bases = [...filasR, ...(hayOtras ? [otrasR] : [])];
  const partes = totalR > 0 ? repartir(bases.map((x) => (x / totalR) * 100), 100, 1) : bases.map(() => 0);
  const parteTxt = (i: number) => (totalR > 0 ? `${conSigno(partes[i], 1)} % del total` : null);

  const p = { anio: A, k };
  const empFila = (e: Empleados): string => (e.ult ? `${nf0.format(e.ult.v)} empleados` : "sin dato de empleados");
  const porEmp = (m: Met): string | null => (m.emp.prom != null && m.emp.meses >= MIN_MESES_EMPLEADOS && m.emp.prom > 0 ? porEmpleadoTxt(m.gA / m.emp.prom) : null);
  const filas: FilaEP[] = vistos.map((x, i) => ({
    tipo: "nodo", n: x.n.n, ...(x.n.t ? { t: x.n.t } : {}), nodo: x.n, abre: !!x.n.hijos?.length, txt: esc.txt(filasR[i]), parte: parteTxt(i), ancho: 0,
    ...textoVar(x.v, p), empTxt: empFila(x.m.emp), porEmpTxt: porEmp(x.m),
  }));
  if (hayOtras) {
    const soloSin = resto.length === sinDisc.length && resto.every((x) => esSinDiscriminar(x.n.n));
    filas.push({
      tipo: "otras", n: soloSin ? "Sin discriminar" : `Otras (${resto.length})`, nodo: null, abre: false, txt: esc.txt(otrasR), parte: parteTxt(bases.length - 1), ancho: 0,
      ...textoVar(variacionDe(mResto, umbral), p), empTxt: null, porEmpTxt: null, cuantos: resto.length,
    });
  } else if (vistos.length && otrasR !== 0) {
    filas.push({ tipo: "redondeo", n: "Diferencia por redondeo", nodo: null, abre: false, txt: esc.txt(otrasR), parte: null, ancho: 0, varTxt: null, nota: null, empTxt: null, porEmpTxt: null });
  }
  const largos = filas.map((f) => Math.max(0, valorMostrado(f.txt) ?? 0)), mayor = Math.max(...largos, 0);
  filas.forEach((f, i) => { f.ancho = mayor > 0 ? largos[i] / mayor : 0; });

  // ----- tarjetas (la variación se calcula con los montos redondeados que se ven)
  const vPrecisa = mN.gB != null && mN.gB > 0 ? (mN.gA / mN.gB - 1) * 100 : null;
  const vTarj = totalR1 != null && totalR1 > 0 ? (totalR / totalR1 - 1) * 100 : vPrecisa;
  const per1 = periodoTxt(A, k), perAnt = B != null ? periodoTxt(B, k) : null;
  const e = mN.emp;
  const cambioEmp = e.ult && e.ant != null && e.ant > 0 ? varSigno(r1((e.ult.v / e.ant - 1) * 100)) : null;
  const mesesDatos = (xs: string[]) => (xs.length ? fmtMes(xs[xs.length - 1]) : "—");
  const empleadosSub = e.ult
    ? `en ${fmtMes(e.ult.mes)}${e.ant != null ? `; un año antes: ${nf0.format(e.ant)}${cambioEmp ? ` (${cambioEmp})` : ""}` : ""}`
    : "sin dato de empleados en este período";
  const empProm = e.prom != null && e.meses >= MIN_MESES_EMPLEADOS && e.prom > 0 ? e.prom : null;
  return {
    ruta: camino.slice(1).map((x) => x.n), camino, nodo, orden: o.orden, anio: A, anioAnt: B, k, enCurso: k < 12,
    periodo: per1, periodoAnt: perAnt, periodoCorto: k >= 12 ? String(A) : `ene a ${MESES[k - 1]}`, ref: def.ref,
    tarjetas: {
      transferido: { valor: esc.txt(totalR), sub: `${per1}${c.sinIpc ? ", en pesos corrientes" : `, en pesos de ${def.ref}`}` },
      variacion: {
        valor: vTarj == null ? "—" : varSigno(r1(vTarj)),
        sub: vTarj == null ? (B == null ? `Sin datos de ${A - 1} para comparar` : `No recibió fondos del Tesoro en ${perAnt}`) : `contra ${perAnt} (${esc.txt(totalR1 as number)}), con inflación descontada`,
      },
      empleados: { valor: e.ult ? nf0.format(e.ult.v) : "—", sub: empleadosSub },
    },
    totalTxt: esc.txt(totalR), totalAntTxt: totalR1 == null ? null : esc.txt(totalR1), varTotalTxt: vTarj == null ? "—" : varSigno(r1(vTarj)),
    filas,
    unidad: c.sinIpc ? "Pesos corrientes de cada mes (todavía no hay inflación cargada)" : `Pesos de ${def.ref}: cada mes se ajusta con el IPC de ese mes`,
    ipcAviso: sinPublicar.length
      ? `El IPC de ${sinPublicar.map((m) => `${MESES[m - 1]}-${String(A).slice(2)}`).join(" y ")} ${sinPublicar.length === 1 ? "todavía no se publicó" : "todavía no se publicaron"}: ${sinPublicar.length === 1 ? "ese mes se ajusta" : "esos meses se ajustan"} con el del último mes publicado (${def.ref}).`
      : null,
    sinIpc: c.sinIpc, anual, personas: personasDe(nodo, ar),
    porEmpTotalTxt: empProm ? porEmpleadoTxt(mN.gA / empProm) : null,
    datosTransf: mesesDatos(ar.meses), datosOcup: mesesDatos(ar.meses_ocup),
  };
}

/** Un renglón por cada empresa o grupo cuyo nombre trae `q` (en cualquier nivel), con las mismas cuentas de la lista. Sin "Otras": cada una por su cuenta. */
export function buscarEmpresas(o: { archivo: ArchivoEmpresas; q: string; orden: OrdenEP; anio: string | null; deflactor: DeflactorMensual; max?: number }): FilaEP[] {
  const ar = o.archivo, c = crearCtx(ar, o.deflactor), per = crearPer(c, anioPedidoEP(ar, o.anio));
  const q = norm(o.q).trim();
  if (q.length < 2) return [];
  const raiz = arbolEmpresas(ar), mR = per.met(raiz), umbral = Math.abs(mR.gB ?? 0) * BASE_INFIMA / 100, p = { anio: per.A, k: per.k };
  type Hallazgo = { n: NodoEP; ruta: string[]; donde: string | null; m: Met; v: Var };
  const halla: Hallazgo[] = [];
  const visitar = (n: NodoEP, ruta: string[], donde: string | null) => {
    const texto = norm(`${n.n} ${n.t ?? ""} ${n.grupo ?? ""} ${aliasDe(n)}`);
    if (texto.includes(q)) { const m = per.met(n); halla.push({ n, ruta, donde, m, v: variacionDe(m, umbral) }); }
    n.hijos?.forEach((h) => visitar(h, [...ruta, h.n], n.n));
  };
  raiz.hijos?.forEach((h) => visitar(h, [h.n], null));
  const clave = (h: Hallazgo) => (o.orden === "variacion" ? (h.v.tipo === "num" ? h.v.pct : null) : o.orden === "empleados" ? h.m.emp.ult?.v ?? null : h.m.gA);
  halla.sort((x, y) => { const a = clave(x), b = clave(y); if (a == null || b == null) return a == null && b == null ? 0 : a == null ? 1 : -1; return b - a; });
  const lista = halla.slice(0, o.max ?? 30);
  const montos = [...lista.map((h) => h.m.gA), mR.gA].map(Math.abs).filter((x) => x > 0);
  const esc = escalaDe("hoy", Math.abs(mR.gA), montos.length ? Math.min(...montos) : 0);
  const largos = lista.map((h) => Math.max(0, h.m.gA)), mayor = Math.max(...largos, 0);
  return lista.map((h, i) => {
    const e = h.m.emp, prom = e.prom != null && e.meses >= MIN_MESES_EMPLEADOS && e.prom > 0 ? e.prom : null, r = mostrado(esc, h.m.gA);
    return {
      tipo: "nodo", n: h.n.n, ...(h.n.t ? { t: h.n.t } : {}), nodo: h.n, abre: !!h.n.hijos?.length, txt: esc.txt(r), ancho: mayor > 0 ? largos[i] / mayor : 0,
      parte: mR.gA > 0 ? `${conSigno(r1((h.m.gA / mR.gA) * 100), 1)} % del total` : null,
      ...textoVar(h.v, p), empTxt: e.ult ? `${nf0.format(e.ult.v)} empleados` : "sin dato de empleados", porEmpTxt: prom ? porEmpleadoTxt(h.m.gA / prom) : null,
      ruta: h.ruta, donde: h.donde ? `en ${h.donde}` : null,
    };
  });
}

/** Palabras con las que la gente nombra a cada empresa y que no están en su nombre (para el buscador de la lista). */
const ALIAS_EMPRESAS: [RegExp, string][] = [
  [/energia argentina|enarsa|ieasa/, "enarsa ieasa energia argentina gas gnl"],
  [/ferrocarril|adif|operadora ferroviaria|trenes|belgrano|capital humano ferroviario/, "trenes ferrocarril ferroviaria"],
  [/aerolineas/, "aerolineas aviones vuelos"],
  [/radio y television|\brta\b/, "television publica radio nacional canal 7 medios publicos"],
  [/correo/, "correo argentino correo oficial"],
  [/agua|aysa/, "aysa agua cloacas"],
  [/rio turbio|carboniferos/, "rio turbio carbon ycrt"],
];
const aliasDe = (n: NodoEP): string => { const t = norm(`${n.n} ${n.t ?? ""} ${n.grupo ?? ""}`); return ALIAS_EMPRESAS.filter(([r]) => r.test(t)).map((x) => x[1]).join(" "); };

// ---------------------------------------------------------------- gráfico por año y gente por mes
function armarAnual(nodo: NodoEP, c: Ctx, per: Per): AnualEP {
  const anios = aniosDe(c.ar);
  const barras: AnioBarra[] = anios.map((a): AnioBarra => {
    const corr = transferido(nodo.serie, c, a.anio, a.k, "corr") ?? 0, cap = transferido(nodo.serie, c, a.anio, a.k, "cap") ?? 0, apo = transferido(nodo.serie, c, a.anio, a.k, "apo") ?? 0, parcial = a.k < 12;
    const ant = parcial ? transferido(nodo.serie, c, a.anio - 1, a.k) : null;
    return { anio: a.anio, k: a.k, parcial, corr, cap, apo, total: corr + cap + apo, marca: ant, etiqueta: parcial ? `${a.anio} · ene a ${MESES[a.k - 1]}` : String(a.anio) };
  });
  const mayor = Math.max(0, ...barras.map((b) => b.total)), positivos = barras.flatMap((b) => [b.corr, b.cap, b.apo, b.total]).filter((x) => x > 0);
  const esc = escalaDe("hoy", mayor, positivos.length ? Math.min(...positivos) : 0);
  const tabla = barras.map((b): FilaTablaAnio => {
    const t = mostrado(esc, b.total), [rc, rk, ra] = repartir([esc.a(b.corr), esc.a(b.cap), esc.a(b.apo)], t, esc.dec);
    return { anio: b.anio, etiqueta: b.etiqueta, corr: esc.txt(rc), cap: esc.txt(rk), apo: esc.txt(ra), total: esc.txt(t) };
  });
  return { anios: barras, ref: c.def.ref, tabla, unidad: c.sinIpc ? "pesos corrientes de cada mes" : `pesos de ${c.def.ref}` };
}
/** Unidad común de los ejes del gráfico: la misma regla que el resto del sitio. */
export const unidadAnual = (an: AnualEP) => unidadMontoDe(Math.max(0, ...an.anios.map((b) => b.total)));
export const textoBarraAnio = (b: AnioBarra, an: AnualEP): string => {
  const un = unidadAnual(an);
  const marca = b.parcial && b.marca != null ? `; mismos meses de ${b.anio - 1}: ${fmtMillones(b.marca, un)}` : "";
  return `${b.etiqueta}: ${fmtMillones(b.total, un)} (corrientes ${fmtMillones(b.corr, un)}, capital ${fmtMillones(b.cap, un)}, aportes de capital ${fmtMillones(b.apo, un)})${marca}`;
};

function personasDe(nodo: NodoEP, ar: ArchivoEmpresas): PersonasEP | null {
  const v = ar.meses_ocup.map((_, i) => nodo.serie.ocup[i] ?? null);
  const con = v.map((x, i) => [x, i] as const).filter((x): x is readonly [number, number] => x[0] != null);
  if (con.length < 2) return null;
  const f = con[0], l = con[con.length - 1];
  return { meses: ar.meses_ocup, v, max: Math.max(...con.map((x) => x[0])), primero: { mes: ar.meses_ocup[f[1]], v: f[0] }, ultimo: { mes: ar.meses_ocup[l[1]], v: l[0] }, fuente: nodo.fuenteOcup };
}

// ---------------------------------------------------------------- textos, dirección e imagen
/** Título: "Lo que pone el Tesoro en las empresas públicas en 2025" o, con una empresa abierta, "Aerolíneas Argentinas: lo que pone el Tesoro en 2025". */
export const tituloEmpresas = (v: VistaEP): string => {
  const cuando = v.enCurso ? `en lo que va de ${v.anio} (${v.periodoCorto})` : `en ${v.anio}`;
  const base = `lo que pone el Tesoro ${v.ruta.length ? "" : "en las empresas públicas "}${cuando}`.replace(/\s+/g, " ");
  return v.ruta.length ? `${v.ruta[v.ruta.length - 1]}: ${base}` : `${base.charAt(0).toUpperCase()}${base.slice(1)}`;
};
/** Dirección de la vista: siempre con `vista=empresas` y los parámetros que no son los de defecto. */
export function hrefEmpresas(v: VistaEP, anioDef: number, ruta = "/gasto/"): string {
  const p = new URLSearchParams({ vista: "empresas" });
  if (v.anio !== anioDef) p.set("anio", String(v.anio));
  if (v.orden !== ORDEN_EP_DEFECTO) p.set("orden", v.orden);
  const r = escribirRuta(v.ruta); if (r) p.set("emp", r);
  return `${ruta}?${p.toString()}`;
}
export const fuenteEmpresasTxt = (ar: ArchivoEmpresas): string => {
  const f = fechaLarga(ar.actualizado);
  return `${FUENTE_EMPRESAS}${f ? `, actualizado al ${f}` : ""}`;
};

/** Cifra grande y frase: "En 2025 el Tesoro puso $ X en las empresas públicas, en pesos de oct-26: 3,2 % más que en 2024." Sin veredicto (D-012). */
export function fraseEmpresas(v: VistaEP): { cifra: string; frase: string } {
  const donde = v.ruta.length ? v.ruta[v.ruta.length - 1] : "las empresas públicas";
  const pesos = v.sinIpc ? "en pesos corrientes" : `en pesos de ${v.ref}`;
  const t = v.varTotalTxt, cuerpo = t.replace(/^[+−]/, "");
  const ant = v.periodoAnt ?? "";
  const comp = t === "—" ? "" : /^\+/.test(t) ? `: ${cuerpo} más que en ${ant}` : /^−/.test(t) ? `: ${cuerpo} menos que en ${ant}` : `: lo mismo que en ${ant}`;
  const inicio = v.enCurso ? `En lo que va de ${v.anio} (${v.periodoCorto})` : `En ${v.anio}`;
  return { cifra: v.totalTxt, frase: `${inicio} el Tesoro puso ${v.totalTxt} en ${donde}, ${pesos}${comp}.` };
}

/** Imagen para compartir: las tres cifras y las filas que se ven (sobre el lienzo de barras de imagen.ts). */
export function armarImagenEmpresas(v: VistaEP, ar: ArchivoEmpresas, formato: FormatoImg, hoy: Date = new Date()): DatosImagen {
  const filas: FilaBarra[] = v.filas.map((f, i) => ({
    id: `empresas-${i}`, nombre: f.n, valor: Math.max(0, valorMostrado(f.txt) ?? 0), variacion: f.txt, cls: "neutro", ini: null, fin: null, nota: null,
    detalle: [f.parte, f.varTxt?.replace("Variación real: ", "Real: "), f.empTxt === "sin dato de empleados" ? null : f.empTxt].filter(Boolean).join(" · ") || " ",
  }));
  const t = v.tarjetas;
  const items: TarjetaImg[] = [
    { nombre: "Puso el Tesoro", datos: [{ rotulo: "Lo que puso el Tesoro", valor: t.transferido.valor, cls: "neutro", sub: v.periodo }] },
    { nombre: "Variación real", datos: [{ rotulo: "Variación real", valor: t.variacion.valor, cls: "neutro", sub: v.periodoAnt ? `contra ${v.periodoAnt}` : null }] },
    { nombre: "Empleados", datos: [{ rotulo: "Empleados", valor: t.empleados.valor, cls: "neutro", sub: t.empleados.sub }] },
  ];
  const donde = v.ruta.length ? v.ruta.join(" › ") : "Todas las empresas";
  const arch = v.ruta.length ? "-" + norm(v.ruta[v.ruta.length - 1]).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) : "";
  return {
    formato, titulo: tituloEmpresas(v),
    temporalidad: `${v.periodo}. ${donde}`,
    cifra: null, frases: [], tarjetas: { tipo: "gen", items },
    leyenda: null, x: [], series: [], fmtEje: (x) => String(x), fmtEje2: null, franjas: [], inicioTxt: null,
    comentario: "", unidad: v.unidad, fuente: fuenteEmpresasTxt(ar),
    nota: `Lo que pone el Tesoro (transferencias y aportes de capital) no es lo que gasta la empresa ni su resultado. Datos hasta ${v.datosTransf}, de empleados hasta ${v.datosOcup}.`,
    fecha: hoy.toLocaleDateString("es-AR"),
    archivo: `primerolosdatos-empresas-publicas-${v.anio}${v.enCurso ? "-parcial" : ""}${arch}`,
    lienzo: { tipo: "barras", filas, sinDatos: [], enc: { nombre: v.nodo.hijos?.length ? "Empresa" : "Empresas", valor: "Puso el Tesoro" }, sinTope: true },
    marcaUltimo: false,
  };
}
