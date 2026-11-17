// Motor de cálculo: port tipado de las líneas "datos / medidas / calc" de src/app.js.
// Una sola fuente de verdad: todas las secciones usan estas funciones.
import { fmtMes, nf0, nf1, fmtNum, fmtCant, ok, lastIdx, mul, r1 } from "./formato";
import { NOMBRES } from "./nombres";

export type Vals = (number | null)[];
export interface Banda { i0: number; v: (number | null)[] }
export interface SerieMeta {
  id: string; n: string; cat: string[]; tipo: string; u: string; dir: number; fuente: string; desc: string;
  agg?: number; flujo?: number; archivo: string;
  /** Nombre original del catálogo cuando `n` es el nombre público (ver nombres.ts). */
  nTecnico?: string;
}
export interface SerieDatos { i0: number; v: (number | null)[]; min?: Banda; max?: Banda }
export interface Serie extends SerieMeta {
  vals: Vals; mn?: Vals; mx?: Vals; busca?: string; i0: number;
}
export interface Expr {
  id: string; med?: string; rel?: string | null; modo?: string; esc?: string; forzar?: boolean;
}
export interface Calculo {
  v: Vals; lo?: Vals; hi?: Vals; nombre: string; corto: string; unidad: string; dir: number;
  flujo?: boolean; ultimo?: boolean; pct: boolean; serie: Serie;
  /** Cantidad entera: todos los valores son enteros (víctimas, personas, leyes…). Sus valores enteros se muestran sin decimal ("200", no "200,0"). */
  entero?: boolean;
  /** La serie con la que se mide (`rel`), si la hay: su fuente también se nombra. */
  rel?: Serie;
}
/** Fuentes de un cálculo: la de la serie y, si se mide en otra, también la de esa (sin repetir). */
export const fuentesCalc = (c: Calculo): string[] => [...new Set([c.serie.fuente, c.rel?.fuente].filter((f): f is string => !!f))];
export type Opcion = [string, string];

export const FX_NOM: Record<string, string> = { oficial: "oficial", blue: "blue", mep: "MEP", ccl: "CCL" };
export const FX_COLOR: Record<string, string> = { oficial: "--series-1", blue: "--series-2", mep: "--series-3", ccl: "--series-4" };
export const FX_KEYS = ["oficial", "blue", "mep", "ccl"] as const;
export const BASE_IDS = ["ipc_empalme", "cpi_usa", "fx_oficial", "fx_blue", "fx_mep", "fx_ccl", "poblacion", "pib_nom_anual"];

/** Variaciones: mensual, interanual (12 meses) y promedio geométrico mensual de 12 meses; con sufijo `_r` son reales (descontada la inflación). */
const VAR_BASE: Opcion[] = [["vm", "Var. mensual"], ["via", "Var. interanual"], ["vp12", "Var. mensual promedio 12 meses"]];
const RE_VAR = /^(vm|via|vp12)(_r)?$/;
export const ES_VAR = (m?: string) => !!m && RE_VAR.test(m);
const ETQ_VAR: Record<string, string> = { vm: "Var. mensual", via: "Var. interanual", vp12: "Var. mensual promedio 12 meses" };
/** Promedio móvil del valor: sufijo `_mm3` o `_mm12` sobre cualquier código de medida de valor (`real_mm12`, `corr_mm3`, `usd_blue_mm12`). Los códigos sin sufijo no cambian. */
const RE_MM = /_mm(3|12)$/;
/** Código sin el sufijo de promedio móvil y la cantidad de meses (0 = sin suavizado). */
export const partirMM = (m: string): [string, number] => { const r = RE_MM.exec(m); return r ? [m.slice(0, r.index), Number(r[1])] : [m, 0]; };
export const sufijoMM = (m?: string) => { const r = m ? RE_MM.exec(m) : null; return r ? r[0] : ""; };
/** Media de los últimos `n` valores ya convertidos; si falta alguno, null (sin huecos tapados). */
export function mediaMovil(arr: Vals, n: number): Vals {
  return arr.map((_, i) => {
    if (i < n - 1) return null;
    let t = 0;
    for (let k = i - n + 1; k <= i; k++) { const x = arr[k]; if (!ok(x)) return null; t += x; }
    return t / n;
  });
}
/** Los links viejos usaban `vac` (acumulada en el año): hoy se leen como interanual. */
export const normMed = (m?: string) => (m === "vac" ? "via" : m);
/** Series de IPC general: contra la inflación general serían una línea plana, no se les ofrece "Real" ni índice real. */
export const ES_IPC_GENERAL = (id: string) => id === "ipc_empalme" || id === "ipc_nacional_0_ipc";

/** Si subir es bueno (1), malo (-1) o neutro (0) para una serie vista con esta medida.
 *  Los precios en pesos o dólares corrientes suben casi siempre: se tratan como neutros.
 *  En precio real, en salarios ("en términos de") o como variación se mantiene el `dir` de la serie. */
export function dirEfectiva(s: SerieMeta, med?: string | null, rel?: string | null): number {
  const dir = s.dir || 0;
  if (dir !== -1 || rel || s.tipo !== "ars" || s.cat[0] !== "Precios") return dir;
  const m = med === "vac" ? "via" : med || "";
  return m === "corr" || m.startsWith("usd_") ? 0 : dir;
}

export interface DimMed { opciones: Opcion[]; tenue?: string }
/** Un grupo de medidas (Pesos / Dólares / Variaciones / Índice...). Cada grupo tiene 1 o 2 filas de opciones (`dims`);
 *  `unir` arma el código de medida y `partir` lo desarma (null = el código no es de este grupo). */
export interface GrupoMed {
  k: string; nombre: string; dims: DimMed[];
  unir: (v: string[]) => string; partir: (c: string) => string[] | null; etq: (v: string[]) => string;
}
export const FACTOR_U = (u: string): [number, string] =>
  /^millones de /.test(u) ? [1e6, u.replace(/^millones de /, "")] : /^miles de /.test(u) ? [1e3, u.replace(/^miles de /, "")] : [1, u];

/** Las tasas nominales anuales llegan como tipo "none" con TNA en la unidad: se tratan como "tasa". */
export function normalizarMeta(m: SerieMeta): SerieMeta {
  let r = m.tipo === "none" && /TNA/.test(m.u) ? { ...m, tipo: "tasa" } : m;
  const publico = NOMBRES[m.id];
  if (publico && !r.nTecnico) r = { ...r, n: publico, nTecnico: m.n };   // idempotente: si ya tiene nombre técnico, ya se aplicó
  return r;
}

export function expandir(i0: number, v: (number | null)[], N: number): Vals {
  const a: Vals = new Array(N).fill(null);
  v.forEach((x, k) => { a[i0 + k] = x; });
  return a;
}

/** Medida por defecto de una serie (solo depende de su metadato: sirve sin tener los datos cargados). */
export const medDefaultDe = (s: SerieMeta): string =>
  s.id === "ipc_empalme" ? "vm"   // la entrada pública de la inflación: se abre mensual (la interanual es una opción)
    : s.tipo === "idx" && s.dir !== 1 && s.cat[0] === "Precios" ? "via"
    : ({ ars: "real", idx: s.dir === 1 ? "real" : "corr", fx: "corr", usd: "corr" } as Record<string, string>)[s.tipo] || "asis";

export function crearMotor(F: string[]) {
  const N = F.length;
  const SER: Record<string, Serie> = {};
  const idxDe = (f: string) => F.indexOf(f);
  let cache = new Map<string, Calculo>();

  function agregar(metas: SerieMeta[], datos: Record<string, SerieDatos>) {
    for (const m of metas) {
      const d = datos[m.id];
      if (!d) continue;
      const s: Serie = { ...normalizarMeta(m), i0: d.i0, vals: expandir(d.i0, d.v, N) };
      if (d.min && d.max) { s.mn = expandir(d.min.i0, d.min.v, N); s.mx = expandir(d.max.i0, d.max.v, N); }
      SER[s.id] = s;
    }
    cache = new Map();
  }
  const baseLista = () => ({
    IPC: SER.ipc_empalme.vals, CPI: SER.cpi_usa.vals,
    FX: { oficial: SER.fx_oficial.vals, blue: SER.fx_blue.vals, mep: SER.fx_mep.vals, ccl: SER.fx_ccl.vals } as Record<string, Vals>,
    POB: SER.poblacion ? SER.poblacion.vals : null,
    PIB_AN: SER.pib_nom_anual ? SER.pib_nom_anual.vals : null,
  });
  // Se resuelve perezosamente: la base se carga siempre antes de calcular.
  let B: ReturnType<typeof baseLista> | null = null;
  let REF_AR = -1, REF_US = -1, refAR = "", refUS = "";
  const base = () => {
    if (!B) {
      B = baseLista();
      REF_AR = lastIdx(B.IPC); REF_US = lastIdx(B.CPI);
      refAR = fmtMes(F[REF_AR]); refUS = fmtMes(F[REF_US]);
    }
    return B;
  };
  const realAR = (i: number) => { const b = base(); return ok(b.IPC[i]) ? (b.IPC[REF_AR] as number) / (b.IPC[i] as number) : null; };
  const realUS = (i: number) => { const b = base(); return ok(b.CPI[i]) ? (b.CPI[REF_US] as number) / (b.CPI[i] as number) : null; };

  const esIndice = (s: SerieMeta) => s.tipo === "idx" || /índice/i.test(s.u || "");
  const MONETARIA = (s: SerieMeta) => ["ars", "idx", "usd", "fx"].includes(s.tipo);

  /** El promedio móvil solo vale para un valor (pesos, dólares, tipo de cambio), no para variaciones, índices tal cual ni tasas. */
  const permiteMM = (s: SerieMeta, medBase: string) => ["ars", "fx", "usd"].includes(s.tipo) && !!medBase && !ES_VAR(medBase) && medBase !== "asis" && medBase !== "tal_cual";

  const esPct = (s: SerieMeta) => /%/.test(s.u || "") && !/\$/.test(s.u || "");
  const grupoVar = (real: boolean): GrupoMed => ({
    k: "var", nombre: "Variaciones",
    dims: [{ opciones: VAR_BASE }, ...(real ? [{ opciones: [["nom", "Nominal"], ["real", "Real (descontada la inflación)"]] as Opcion[] }] : [])],
    unir: (v) => v[0] + (v[1] === "real" ? "_r" : ""),
    partir: (c) => { const r = RE_VAR.exec(c); return !r || (!real && r[2]) ? null : real ? [r[1], r[2] ? "real" : "nom"] : [r[1]]; },
    etq: (v) => `${ETQ_VAR[v[0]]}${v[1] === "real" ? " real" : ""}`,
  });
  /** Índices de precios por rubro: Mensual, Interanual, Promedio de 12 meses e Índice, y un único interruptor Nominal / Real (contra la inflación general) que vale para las cuatro.
   *  Los códigos no cambian: `vm`, `via`, `vp12` y con sufijo `_r` en real; el índice nominal es `corr` y el real (el precio relativo de antes) es `real`. */
  const grupoVarRubro = (): GrupoMed => ({
    k: "var", nombre: "Variaciones",
    dims: [{ opciones: [...VAR_BASE, ["ind", "Índice"]] }, { opciones: [["nom", "Nominal"], ["real", "Real (contra la inflación general)"]] }],
    unir: (v) => (v[0] === "ind" ? (v[1] === "real" ? "real" : "corr") : v[0] + (v[1] === "real" ? "_r" : "")),
    partir: (c) => {
      if (c === "corr") return ["ind", "nom"];
      if (c === "real") return ["ind", "real"];
      const r = RE_VAR.exec(c);
      return r ? [r[1], r[2] ? "real" : "nom"] : null;
    },
    etq: (v) => v[0] === "ind" ? (v[1] === "real" ? "Índice real (contra la inflación general)" : "Índice tal cual (base 100)")
      : `${ETQ_VAR[v[0]]}${v[1] === "real" ? " real" : ""}`,
  });
  const simple = (k: string, nombre: string, opciones: Opcion[], tenue?: string): GrupoMed => ({
    k, nombre, dims: [{ opciones, tenue }],
    unir: (v) => v[0], partir: (c) => (opciones.some((o) => o[0] === c) ? [c] : null),
    etq: (v) => {
      const t = opciones.find((o) => o[0] === v[0])?.[1] ?? "";
      return k === "pesos" || k === "dolares" ? `${nombre} ${t.charAt(0).toLowerCase()}${t.slice(1)}` : k === "indice" && t === "Real" ? "Índice real" : t;
    },
  });
  const grupoDolares = (): GrupoMed => ({
    k: "dolares", nombre: "Dólares",
    dims: [{ opciones: [["usdr", "Reales"], ["usd", "Corrientes"]] }, { opciones: FX_KEYS.map((k): Opcion => [k, FX_NOM[k]]) }],
    unir: (v) => `${v[0]}_${v[1]}`,
    partir: (c) => { const [t, f] = c.split("_"); return (t === "usdr" || t === "usd") && FX_NOM[f] ? [t, f] : null; },
    etq: (v) => `Dólares ${v[0] === "usdr" ? "reales" : "corrientes"} al ${FX_NOM[v[1]]}`,
  });

  /** Medidas de una serie ordenadas en grupos (pasos). Vacío o con una sola opción: no hay botón de medida. */
  function gruposMedida(s: SerieMeta): GrupoMed[] {
    base();
    switch (s.tipo) {
      case "ars": return [
        simple("pesos", "Pesos", [["real", "Reales"], ["corr", "Corrientes"]]), grupoDolares(), grupoVar(true)];
      case "fx": return [
        simple("pesos", "Pesos", [["real", "Reales"], ["corr", "Corrientes"], ["realbi", "Reales netos de inflación de EE.UU."]]), grupoVar(true)];
      case "usd": return [
        simple("dolares", "Dólares", [["corr", "Corrientes"], ["usdr", "Reales"]]),
        simple("pesos", "Pesos", [["arscorr", "Corrientes (al oficial)"], ["real", "Reales (al oficial)"]])];
      case "tasa": return [simple("tasa", "", [["asis", "TNA"], ["tea", "TEA"], ["real_a", "Real anual"], ["real_m", "Real mensual"]])];
      case "idx": {
        const tal: Opcion = ["corr", "Índice tal cual (base 100)"];
        const gral = ES_IPC_GENERAL(s.id as string);
        if (s.dir === 1) return [simple("indice", "Índice", [["real", "Real"], tal], "corr"), grupoVar(true)];
        if (s.cat[0] === "Precios") return gral ? [grupoVar(false), simple("indice", "Índice", [tal], "corr")] : [grupoVarRubro()];
        return [simple("indice", "Índice", [tal], "corr"), grupoVar(false)];
      }
      default:
        return s.tipo === "none" && !esPct(s) ? [simple("valor", "Valor", [["asis", "Tal cual"]]), grupoVar(false)] : [];
    }
  }
  const cantMedidas = (g: GrupoMed[]) => g.reduce((n, x) => n + x.dims.reduce((m, d) => m * d.opciones.length, 1), 0);
  /** Grupo y valores de cada fila para una medida, o null si no corresponde a la serie. */
  function ubicarMedida(s: SerieMeta, med: string): { g: GrupoMed; v: string[] } | null {
    const mb = partirMM(med)[0];
    for (const g of gruposMedida(s)) { const v = g.partir(mb); if (v) return { g, v }; }
    return null;
  }
  /** Nombre corto de la medida (texto del botón). */
  const etiquetaMedida = (s: SerieMeta, med: string): string => {
    const u = ubicarMedida(s, med), mm = partirMM(med)[1];
    return u ? u.g.etq(u.v) + (mm ? ` · promedio móvil ${mm} meses` : "") : "";
  };
  /** Resumen corto de la medida para el renglón de la variable ("pesos de hoy", "en US$ blue", "variación interanual"). */
  const resumenMedida = (s: SerieMeta, med: string): string => {
    const u = ubicarMedida(s, med);
    if (!u) return "";
    const mm = partirMM(med)[1];
    if (mm) { const b = resumenMedida(s, partirMM(med)[0]); return `${b || s.u} · promedio móvil ${mm} meses`; }
    const { g, v } = u;
    if (g.k === "pesos") {
      const t = ({ real: "pesos de hoy", corr: "pesos corrientes", realbi: "pesos de hoy, neto de inflación de EE.UU.", arscorr: "pesos corrientes (al oficial)" } as Record<string, string>)[v[0]];
      return s.tipo === "usd" && v[0] === "real" ? "pesos de hoy (al oficial)" : t ?? g.etq(v);
    }
    if (g.k === "dolares") {
      if (v[1]) return `en US$ ${FX_NOM[v[1]]}${v[0] === "usdr" ? " de hoy" : ""}`;
      return v[0] === "usdr" ? "dólares de hoy" : "dólares corrientes";
    }
    if (g.k === "valor") return "";                          // el valor tal cual: el nombre alcanza, sin "(tal cual)"
    // no "índice tal cual (base 100)": la base va en la unidad (índices generales y de rubros de precios)
    if ((g.k === "indice" && v[0] === "corr") || (g.k === "var" && v[0] === "ind" && v[1] !== "real")) return "índice";
    const t = g.etq(v);
    return g.k === "var" || /^[A-ZÁÉÍÓÚ]{2,}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
  };
  /** Lista plana de todas las medidas válidas (código, nombre). */
  function medidasDe(s: SerieMeta): Opcion[] {
    const out: Opcion[] = [];
    for (const g of gruposMedida(s)) {
      const rec = (i: number, v: string[]) => {
        if (i === g.dims.length) { out.push([g.unir(v), g.etq(v)]); return; }
        g.dims[i].opciones.forEach((o) => rec(i + 1, [...v, o[0]]));
      };
      rec(0, []);
    }
    return out.length ? out : [["asis", "Tal cual"]];
  }
  const medDefault = medDefaultDe;

  /** Variación sobre `arr`: mensual (contra el dato anterior, hasta 3 meses atrás en series trimestrales), interanual o mensual promedio de 12 meses. */
  function variacion(arr: Vals, med: string): Vals {
    const real = med.endsWith("_r"), tipo = med.replace("_r", "");
    const IPC = base().IPC;
    const a0: Vals = real ? arr.map((x, i) => ok(x) && ok(IPC[i]) ? (x as number) / (IPC[i] as number) : null) : arr;
    return a0.map((x, i) => {
      if (!ok(x)) return null;
      let j = tipo === "vm" ? i - 1 : i - 12;
      if (tipo === "vm") { while (j >= 0 && i - j < 4 && !ok(a0[j])) j--; }
      const a = a0[j];
      if (j < 0 || !ok(a) || a <= 0) return null;   // contra un valor cero o negativo (un déficit) el porcentaje no dice nada
      const r = x / a;
      return tipo === "vp12" ? (r > 0 ? (Math.pow(r, 1 / 12) - 1) * 100 : null) : (r - 1) * 100;
    });
  }

  function transformar(s: Serie, arr: Vals, med: string): Vals {
    const b = base();
    const { IPC, FX } = b;
    const t = s.tipo;
    if (t === "tasa") {
      if (med === "tea") return arr.map((x) => ok(x) ? (Math.pow(1 + x / 1200, 12) - 1) * 100 : null);
      if (med === "real_a") return arr.map((x, i) => ok(x) && i >= 12 && ok(IPC[i]) && ok(IPC[i - 12]) ? (Math.pow(1 + x / 1200, 12) / ((IPC[i] as number) / (IPC[i - 12] as number)) - 1) * 100 : null);
      if (med === "real_m") return arr.map((x, i) => ok(x) && i >= 1 && ok(IPC[i]) && ok(IPC[i - 1]) ? ((1 + x / 1200) / ((IPC[i] as number) / (IPC[i - 1] as number)) - 1) * 100 : null);
      return arr.slice();
    }
    if (ES_VAR(med)) return variacion(arr, med);
    if (t === "none" || med === "asis") return arr.slice();
    if (t === "ars" || t === "idx") return arr.map((x, i) => {
      if (!ok(x)) return null;
      if (med === "corr") return x;
      if (med === "real") return mul(x, realAR(i));
      const [tipo, fx] = med.split("_");
      const f = FX[fx] ? FX[fx][i] : null;
      const usd = f ? x / f : null;
      return tipo === "usd" ? usd : mul(usd, realUS(i));
    });
    if (t === "fx") return arr.map((x, i) => !ok(x) ? null : med === "corr" ? x : med === "real" ? mul(x, realAR(i)) : mul(x, realAR(i), 1 / (realUS(i) as number)));
    if (t === "usd") return arr.map((x, i) => !ok(x) ? null : med === "corr" ? x : med === "usdr" ? mul(x, realUS(i))
      : med === "arscorr" ? mul(x, FX.oficial[i]) : mul(x, FX.oficial[i], realAR(i)));
    return arr.slice();
  }

  function unidadDe(s: SerieMeta, med: string): string {
    base();
    const u = s.u || "";
    if (s.tipo === "tasa") return ({ tea: "% efectiva anual (TEA)", real_a: "% real anual (TEA vs. inflación de 12 meses)", real_m: "% real mensual (vs. inflación del mes)" } as Record<string, string>)[med] || u;
    if (ES_VAR(med)) {
      const t = ({ vm: "% de variación mensual", via: "% de variación interanual", vp12: "% mensual promedio (últimos 12 meses)" } as Record<string, string>)[med.replace("_r", "")];
      return med.endsWith("_r") ? t + ", real (descontada la inflación)" : t;
    }
    if (s.tipo === "none" || med === "asis") return u;
    if (s.tipo === "idx") {
      if (med === "corr") return u;
      if (med === "real") return s.cat[0] === "Precios" ? `${u}, relativo al IPC general` : `${u}, descontada la inflación`;
      const [tipo, fx] = med.split("_");
      return `${u}, en dólares${tipo === "usdr" ? " reales" : ""} al ${FX_NOM[fx]}`;
    }
    if (s.tipo === "ars") {
      if (med === "corr") return u;
      if (med === "real") return u.replace("$", `$ de ${refAR}`);
      const [tipo, fx] = med.split("_");
      return u.replace("$", tipo === "usdr" ? `US$ de ${refUS}` : "US$") + ` (${FX_NOM[fx]})`;
    }
    if (s.tipo === "fx") return med === "corr" ? u : med === "real" ? `$ de ${refAR} por US$` : `$ de ${refAR} por US$, neto infl. EEUU`;
    if (s.tipo === "usd") return ({ corr: u, usdr: u.replace("US$", `US$ de ${refUS}`), arscorr: u.replace("US$", "$"), real: u.replace("US$", `$ de ${refAR}`) } as Record<string, string>)[med] || u;
    return u;
  }

  const nominalPesos = (s: Serie): Vals => s.tipo === "usd" ? s.vals.map((x, i) => mul(x, base().FX.oficial[i])) : s.vals;
  const relPermitido = (s: SerieMeta) => !s.agg && ((s.tipo === "ars" && (s.cat[0] === "Precios" || s.id.startsWith("can_"))) || s.tipo === "fx");
  const relDestino = (s: SerieMeta) => !s.agg && (s.tipo === "ars" || s.tipo === "fx");
  const escPermitidas = (s: SerieMeta): Opcion[] => {
    const b = base();
    return s.agg ? [["", "Total"], ...(b.POB ? [["pc", "Por habitante"] as Opcion] : []), ...(b.PIB_AN && s.tipo !== "none" ? [["pib", "% del PIB"] as Opcion] : [])] : [];
  };
  function suma12(arr: Vals): Vals {
    return arr.map((_, i) => {
      if (i < 11) return null;
      let t = 0;
      for (let k = i - 11; k <= i; k++) { const x = arr[k]; if (!ok(x)) return null; t += x; }
      return t;
    });
  }

  function calc(e0: Expr): Calculo {
    const e: Expr = e0.med === "vac" ? { ...e0, med: "via" } : e0;
    const k = JSON.stringify(e);
    const hit = cache.get(k); if (hit) return hit;
    const b = base();
    const A = SER[e.id];
    let r: Omit<Calculo, "pct" | "serie">;
    let relUsada: Serie | undefined;
    const esc = escPermitidas(A).some((o) => o[0] === e.esc) ? (e.esc || "") : "";
    if (esc === "pib") {
      const [fa] = FACTOR_U(A.u || "");
      let nom = nominalPesos(A).map((x) => ok(x) ? x * fa / 1e6 : null);
      if (A.flujo) nom = suma12(nom);
      const PIB = b.PIB_AN as Vals;
      const v = nom.map((x, i) => ok(x) && ok(PIB[i]) && PIB[i] ? x / (PIB[i] as number) * 100 : null);
      r = { v, nombre: `${A.n} (% del PIB)`, corto: `${A.n}, % PIB`, unidad: A.flujo ? "% del PIB (suma de 12 meses / PIB de 12 meses)" : "% del PIB anual", dir: A.dir || 0, ultimo: !!A.flujo };
    } else if (e.rel && SER[e.rel] && relPermitido(A)) {
      const B2 = SER[e.rel];
      relUsada = B2;
      const a = nominalPesos(A), bb = nominalPesos(B2);
      let v = a.map((x, i) => ok(x) && ok(bb[i]) && x !== 0 && bb[i] !== 0 ? (e.modo === "medido" ? x / (bb[i] as number) : (bb[i] as number) / x) : null);
      const esIdx = A.tipo === "idx" || B2.tipo === "idx";
      if (esIdx) { const p = v.find(ok) as number; v = v.map((x) => ok(x) ? x / p * 100 : null); }
      // Lo que se compra: la unidad del producto ("kg", "litro"); una canasta en "$ por mes" se cuenta en canastas y otro monto por mes o
      // por año, en veces (no "mes por cada …").
      const cant = A.id.startsWith("can_") ? "canastas" : /^\$ por (mes|año)/.test(A.u || "") ? "veces" : (A.u || "").startsWith("$ por ") ? A.u.slice(6) : "unidades";
      const dirAB = Math.sign((B2.dir || 0) - (A.dir || 0));
      r = e.modo === "medido"
        ? { v, nombre: `${A.n} medido en ${B2.n}`, unidad: esIdx ? "índice (primer dato = 100)" : `veces "${B2.n}"`, dir: -dirAB, corto: "" }
        : { v, nombre: `${A.n}: cuánto se compra con 1 ${B2.n}`, unidad: esIdx ? "índice (primer dato = 100)" : `${cant} por cada ${B2.n}`, dir: dirAB, corto: "" };
      r.corto = e.modo === "medido" ? `${A.n} / ${B2.n}` : `${A.n} por ${B2.n}`;
    } else {
      const [medB, mm0] = partirMM(e.med || "");
      const med = e.forzar || medidasDe(A).some((m) => m[0] === medB) ? medB : medDefault(A);
      const mm = mm0 && permiteMM(A, med) ? mm0 : 0;   // el suavizado solo vale sobre un valor
      const suave = (x: Vals) => (mm ? mediaMovil(x, mm) : x);
      r = { v: suave(transformar(A, A.vals, med)), nombre: mm ? `${A.n} (promedio móvil ${mm} meses)` : A.n, corto: A.n, unidad: unidadDe(A, med) + (mm ? `, promedio móvil ${mm} meses` : ""), dir: dirEfectiva(A, med, null), flujo: !!A.flujo };
      if (A.mn && A.mx) { r.lo = suave(transformar(A, A.mn, med)); r.hi = suave(transformar(A, A.mx, med)); }
      if (esc === "pc") {
        const [fa, uu] = FACTOR_U(r.unidad);
        const POB = b.POB as Vals;
        const pc = (arr: Vals) => arr.map((x, i) => ok(x) && ok(POB[i]) ? x * fa / (POB[i] as number) : null);
        r.v = pc(r.v); if (r.lo && r.hi) { r.lo = pc(r.lo); r.hi = pc(r.hi); }
        r.unidad = `${uu.replace(/^personas$/, "")} por habitante`.trim(); r.nombre += " por habitante"; r.corto += " p/hab.";
      }
    }
    const pct = /%/.test(r.unidad) && !/\$/.test(r.unidad);
    const entero = !pct && r.v.some(ok) && r.v.every((x) => !ok(x) || Number.isInteger(x));
    const res: Calculo = { ...r, pct, serie: A, ...(entero ? { entero } : {}), ...(relUsada ? { rel: relUsada } : {}) };
    cache.set(k, res);
    return res;
  }

  // Una cantidad entera se muestra sin decimal; un promedio de ella (no entero) conserva el suyo.
  const fmtC = (c: { pct: boolean; entero?: boolean }, x: number | null | undefined) =>
    !ok(x) ? "–" : c.pct ? nf1.format(r1(x)) + " %" : fmtCant(x, c.entero);   // sin "-0,0 %"
  const variacionTxt = (c: { pct: boolean }, desde: number | null, hasta: number | null) => {
    if (!ok(desde) || !ok(hasta)) return "–";
    // En puntos, la cuenta sale de los dos valores como se muestran (1,9 y 2,1 → 0,2), para que cierre a la vista.
    if (c.pct) { const d = r1(r1(hasta) - r1(desde)); return `${d > 0 ? "+" : ""}${nf1.format(d)} p.p.`; }   // sin "-0,0"
    if (desde === 0) return "–";
    const d0 = (hasta / desde - 1) * 100, d = Math.abs(d0) < 0.05 ? 0 : d0;   // sin "-0,0 %"
    return `${d > 0 ? "+" : ""}${Math.abs(d) >= 1000 ? nf0.format(d) : nf1.format(d)} %`;
  };

  /** Diferencia absoluta en la unidad del indicador ("+$ 45.000"). Vacío si el indicador es un porcentaje, un índice o falta algún dato. */
  const difAbsTxt = (c: { pct: boolean; unidad: string; serie: { tipo: string }; entero?: boolean }, desde: number | null, hasta: number | null) => {
    if (c.pct || !ok(desde) || !ok(hasta) || desde === 0) return "";
    if (c.serie.tipo === "idx" || /índice/i.test(c.unidad)) return "";
    const d = hasta - desde, a = Math.abs(d), u = c.unidad;
    const mon = u.match(/US\$|\$/), pre = mon ? mon[0] + " " : "";
    // Una sola escala: con la unidad en "millones de $", 105.900.000 son "105,9 billones" (escala larga), no "105,9 M millones".
    const mag = u.match(/(miles|millones|billones) de/i)?.[1].toLowerCase();
    const factor = mag === "miles" ? 1e3 : mag === "millones" ? 1e6 : mag === "billones" ? 1e12 : 1;
    const abs = a * factor;
    let num: string, magTxt = "";
    // Debajo del millón (en la unidad de la serie) queda como siempre: "851 millones", "1.500 miles".
    if (!mag) num = a >= 1e6 ? nf1.format(a / 1e6) + " M" : fmtCant(a, c.entero);
    else if (a < 1e6) { num = fmtCant(a, c.entero); magTxt = " " + mag; }
    else if (abs >= 1e12) { num = nf1.format(abs / 1e12); magTxt = " billones"; }
    else { num = nf1.format(abs / 1e6); magTxt = " millones"; }
    const suf = !pre && u.length <= 14 && !u.includes('"') ? " " + u : "";
    return `${d > 0 ? "+" : d < 0 ? "−" : ""}${pre}${num}${magTxt}${suf}`;
  };
  /** Variación en % (o en puntos) y, entre paréntesis, la diferencia absoluta. */
  const variacionAbsTxt = (c: { pct: boolean; unidad: string; serie: { tipo: string }; entero?: boolean },desde: number | null, hasta: number | null) => {
    const v = variacionTxt(c, desde, hasta), a = difAbsTxt(c, desde, hasta);
    return a ? `${v} (${a})` : v;
  };

  return {
    F, N, SER, idxDe, agregar, calc, transformar, variacion, unidadDe, medidasDe, gruposMedida, cantMedidas, ubicarMedida, permiteMM, etiquetaMedida, resumenMedida, medDefault, esIndice, MONETARIA,
    relPermitido, relDestino, escPermitidas, nominalPesos, fmtC, variacionTxt, difAbsTxt, variacionAbsTxt,
    refs: () => { base(); return { refAR, refUS, REF_AR, REF_US }; },
    base,
    // Selectores propios de Por presidente y del bloque de dólares: siguen con su lista plana de siempre.
    medFx: (): Opcion[] => [["corr", "Pesos corrientes"], ["real", `Pesos reales (de ${base() && refAR})`], ["realbi", "Pesos reales, neto de inflación de EEUU"]],
    medArs: (): Opcion[] => [["real", `Pesos reales (de ${base() && refAR})`], ["corr", "Pesos corrientes"],
      ...FX_KEYS.map((k): Opcion => [`usdr_${k}`, `Dólares reales al ${FX_NOM[k]} (de ${refUS})`]),
      ...FX_KEYS.map((k): Opcion => [`usd_${k}`, `Dólares corrientes al ${FX_NOM[k]}`]),
      ["vm", "Var. mensual en pesos (%)"], ["via", "Var. interanual en pesos (%)"]],
  };
}
export type Motor = ReturnType<typeof crearMotor>;
