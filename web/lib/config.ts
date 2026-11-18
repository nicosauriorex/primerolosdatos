// Configuración global del usuario (D-005): se guarda en el navegador (localStorage), sin cuentas.
// Acá vive la lectura, la validación y la escritura; el contexto de React está en components/ConfigProvider.tsx.
import { FX_KEYS } from "./motor";

export const CLAVE = "pld:config";
export const VERSION = 2;
export const T_MIN = -12, T_MAX = 24;
export const TF_MIN = -12, TF_MAX = 12;

export type Dolar = (typeof FX_KEYS)[number];
export type MedidaPref = "real" | "corr" | "usdr" | "usd";
export type DesdePref = "todo" | "1995" | "2003" | "2011" | "2017" | "2023" | "ultimo";
export type TemaPref = "auto" | "claro" | "oscuro";
export type FormatoImg = "1x1" | "4x5" | "16x9";
export type TarjetasImg = "ninguna" | "pres" | "gen";
export type DatoPres = "recibio" | "entrego" | "variacion" | "promedio" | "mediana" | "maximo" | "minimo";
export type DatoGen = "ultimo" | "inicio" | "variacion" | "promedio" | "mediana" | "maximo" | "minimo";
/** Lo que el usuario elige para personalizar la imagen del dato (ver docs/specs/personalizar-imagen.md). El período no se guarda. */
export interface OpcionesImagen {
  promedio: boolean; mediana: boolean; lineaUltimo: boolean;   // líneas horizontales con su nombre y valor
  marcaUltimo: boolean; marcaExtremos: boolean;                 // marcadores sobre la serie
  resaltar: boolean;                                            // franjas de los presidentes en el gráfico
  comparaciones: boolean;                                       // mes anterior y hace un año al lado de la cifra (solo si la vista los trae)
  tarjetas: TarjetasImg;
  datosPres: DatoPres[];                                        // hasta 3, en el orden de DATOS_PRES
  datosGen: DatoGen[];                                          // hasta 4, en el orden de DATOS_GEN
  frases: ClaveFrase[] | null;                                  // hasta 2 frases elegidas; null = las dos que salen solas
}
export const MAX_DATOS_PRES = 3, MAX_DATOS_GEN = 4;
/** Frases que el sitio puede calcular para un dato (las elige quien comparte; no se editan). */
export type ClaveFrase = "desde" | "record" | "minimo" | "anio" | "promedio" | "inicio";
export const FRASES_IMG: [ClaveFrase, string][] = [
  ["desde", "Más alto / más bajo desde"], ["record", "Contra su récord"], ["minimo", "Contra su mínimo"],
  ["anio", "Contra hace un año"], ["promedio", "Contra el promedio del período"], ["inicio", "Contra el inicio del período"],
];
export const MAX_FRASES_IMG = 2;

/** Secciones en las que se puede aplicar el inicio y el fin del mandato configurados (`useBase` recibe el id). Ficha y tema comparten «fichas». */
export type SeccionBase = "presidentes" | "mandato" | "ranking" | "curiosidades" | "elecciones" | "herencia" | "fichas";
export const SECCIONES_BASE: [SeccionBase, string][] = [
  ["presidentes", "Por presidente"], ["mandato", "Meses de mandato"], ["ranking", "Ranking"], ["curiosidades", "Curiosidades"],
  ["elecciones", "Elecciones"], ["herencia", "Herencia"], ["fichas", "Fichas y temas"],
];

export interface Config {
  v: number;
  t0: number;                    // desplazamiento para todos (T+k)
  t0p: Record<string, number>;   // excepciones por presidente
  tf: number | null;             // fin del mandato para todos (F+k, F = mes en que asume el sucesor); null = igual que el inicio (F+k con k = el inicio)
  tfp: Record<string, number>;   // excepciones del fin por presidente
  aplica: SeccionBase[];         // secciones donde se aplica el inicio y el fin de «Para todos» (el resto usa el de fábrica)
  aplicaP: Record<string, SeccionBase[]>; // por presidente: secciones donde vale SU excepción de inicio y fin (solo se guarda si difiere de «todas»)
  dolar: Dolar;
  medida: MedidaPref;
  desde: DesdePref;
  tema: TemaPref;
  franjas: boolean;              // franjas de presidentes en todos los gráficos
  colPres: Record<string, string>; // color elegido por presidente (id → #rrggbb)
  formatoImagen: FormatoImg;     // último formato elegido para la imagen de compartir
  imagen: OpcionesImagen;        // últimas elecciones de "Personalizar imagen"
  preguntarPorque: boolean;      // tira «¿Por qué lo compartís?» después de compartir (docs/specs/contar-compartir.md)
}
export const IMAGEN_DEFECTO: OpcionesImagen = {
  promedio: false, mediana: false, lineaUltimo: false, marcaUltimo: true, marcaExtremos: false, resaltar: false, comparaciones: true, tarjetas: "ninguna",
  datosPres: ["recibio", "entrego", "variacion"], datosGen: ["ultimo", "promedio", "maximo", "minimo"],
  frases: null,
};
export const DEFECTO: Config = { v: VERSION, t0: 0, t0p: {}, tf: null, tfp: {}, aplica: SECCIONES_BASE.map((x) => x[0]), aplicaP: {}, dolar: "oficial", medida: "real", desde: "2003", tema: "oscuro", franjas: false, colPres: {}, formatoImagen: "1x1", imagen: IMAGEN_DEFECTO, preguntarPorque: true };

export const DOLARES: [Dolar, string][] = [["oficial", "Oficial"], ["blue", "Blue"], ["mep", "MEP"], ["ccl", "CCL"]];
export const MEDIDAS: [MedidaPref, string][] = [["real", "Pesos reales"], ["corr", "Pesos corrientes"], ["usdr", "Dólares reales"], ["usd", "Dólares corrientes"]];
export const DESDES: [DesdePref, string][] = [["todo", "Todo"], ["1995", "1995"], ["2003", "2003"], ["2011", "2011"], ["2017", "2017"], ["2023", "2023"], ["ultimo", "Último año"]];
export const TEMAS: [TemaPref, string][] = [["oscuro", "Oscuro"], ["claro", "Claro"], ["auto", "Automático"]];
export const FORMATOS_IMG: [FormatoImg, string][] = [["1x1", "Cuadrada 1:1"], ["4x5", "Vertical 4:5"], ["16x9", "Horizontal 16:9"]];
export const TARJETAS_IMG: [TarjetasImg, string][] = [["ninguna", "Ninguna"], ["pres", "Por presidente"], ["gen", "Generales"]];
/** Datos elegibles de cada tipo de tarjeta, en el orden en que se muestran. */
export const DATOS_PRES: [DatoPres, string][] = [["recibio", "Recibió"], ["entrego", "Entregó"], ["variacion", "Variación"], ["promedio", "Promedio"], ["mediana", "Mediana"], ["maximo", "Máximo"], ["minimo", "Mínimo"]];
export const DATOS_GEN: [DatoGen, string][] = [["ultimo", "Último"], ["inicio", "Inicio del período"], ["variacion", "Variación del período"], ["promedio", "Promedio"], ["mediana", "Mediana"], ["maximo", "Máximo"], ["minimo", "Mínimo"]];

const unoDe = <T extends string>(x: unknown, validos: readonly [T, string][], def: T): T =>
  validos.some((v) => v[0] === x) ? (x as T) : def;
const entero = (x: unknown): number | null =>
  typeof x === "number" && Number.isFinite(x) ? Math.max(T_MIN, Math.min(T_MAX, Math.round(x))) : null;
const enteroF = (x: unknown): number | null =>
  typeof x === "number" && Number.isFinite(x) ? Math.max(TF_MIN, Math.min(TF_MAX, Math.round(x))) : null;

/** Lista de datos válidos, sin repetir, en el orden del catálogo y con tope; si queda vacía, la de fábrica. */
function datosDe<T extends string>(x: unknown, validos: readonly [T, string][], tope: number, def: T[]): T[] {
  const pedidos = Array.isArray(x) ? x : [];
  const lista = validos.map((v) => v[0]).filter((v) => pedidos.includes(v)).slice(0, tope);
  return lista.length ? lista : def;
}
/** Las elecciones de la imagen: lo inválido cae al valor de fábrica, campo por campo. */
export function normalizarImagen(raw: unknown): OpcionesImagen {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>, D = IMAGEN_DEFECTO;
  const si = (x: unknown, def: boolean) => (typeof x === "boolean" ? x : def);
  return {
    promedio: si(r.promedio, D.promedio), mediana: si(r.mediana, D.mediana), lineaUltimo: si(r.lineaUltimo, D.lineaUltimo),
    marcaUltimo: si(r.marcaUltimo, D.marcaUltimo), marcaExtremos: si(r.marcaExtremos, D.marcaExtremos), resaltar: si(r.resaltar, D.resaltar), comparaciones: si(r.comparaciones, D.comparaciones),
    tarjetas: unoDe(r.tarjetas, TARJETAS_IMG, D.tarjetas),
    datosPres: datosDe(r.datosPres, DATOS_PRES, MAX_DATOS_PRES, D.datosPres), datosGen: datosDe(r.datosGen, DATOS_GEN, MAX_DATOS_GEN, D.datosGen),
    // null (o algo inválido) = las dos de fábrica; una lista vacía válida = ninguna frase
    frases: Array.isArray(r.frases) ? FRASES_IMG.map((f) => f[0]).filter((f) => (r.frases as unknown[]).includes(f)).slice(0, MAX_FRASES_IMG) : D.frases,
  };
}

/** Convierte cualquier cosa leída del almacenamiento en una configuración válida: lo que no se entiende cae al valor por defecto. */
export function normalizar(raw: unknown): Config {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const t0p: Record<string, number> = {};
  if (r.t0p && typeof r.t0p === "object") {
    for (const [id, k] of Object.entries(r.t0p as Record<string, unknown>)) { const n = entero(k); if (n != null) t0p[id] = n; }
  }
  const tfp: Record<string, number> = {};
  if (r.tfp && typeof r.tfp === "object") {
    for (const [id, k] of Object.entries(r.tfp as Record<string, unknown>)) { const n = enteroF(k); if (n != null) tfp[id] = n; }
  }
  const aplica = Array.isArray(r.aplica) ? SECCIONES_BASE.map((x) => x[0]).filter((id) => (r.aplica as unknown[]).includes(id)) : DEFECTO.aplica;
  const aplicaP: Record<string, SeccionBase[]> = {};
  if (r.aplicaP && typeof r.aplicaP === "object") {
    for (const [id, l] of Object.entries(r.aplicaP as Record<string, unknown>)) {
      if (!/^[a-z0-9]+$/.test(id) || !Array.isArray(l)) continue;
      const lista = SECCIONES_BASE.map((x) => x[0]).filter((x) => l.includes(x));
      if (lista.length !== SECCIONES_BASE.length) aplicaP[id] = lista;   // una lista vacía es válida: la excepción no vale en ninguna sección
    }
  }
  const colPres: Record<string, string> = {};
  if (r.colPres && typeof r.colPres === "object") {
    for (const [id, c] of Object.entries(r.colPres as Record<string, unknown>)) if (/^[a-z0-9]+$/.test(id) && typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)) colPres[id] = c.toLowerCase();
  }
  return {
    franjas: r.franjas === true, colPres, formatoImagen: unoDe(r.formatoImagen, FORMATOS_IMG, DEFECTO.formatoImagen), imagen: normalizarImagen(r.imagen),
    preguntarPorque: typeof r.preguntarPorque === "boolean" ? r.preguntarPorque : DEFECTO.preguntarPorque,
    v: VERSION, t0: entero(r.t0) ?? DEFECTO.t0, t0p, tf: enteroF(r.tf) ?? null, tfp, aplica, aplicaP,
    dolar: unoDe(r.dolar, DOLARES, DEFECTO.dolar), medida: unoDe(r.medida, MEDIDAS, DEFECTO.medida),
    desde: unoDe(r.desde, DESDES, DEFECTO.desde), tema: unoDe(r.tema, TEMAS, DEFECTO.tema),
  };
}

/** Lee lo guardado. `ok` es false si el almacenamiento no está disponible. */
export function leer(): { config: Config; ok: boolean } {
  try {
    const s = window.localStorage.getItem(CLAVE);
    return { config: s ? normalizar(JSON.parse(s)) : DEFECTO, ok: true };
  } catch {
    // Almacenamiento bloqueado o JSON roto: si se puede leer la clave pero está rota, igual se puede escribir.
    try { window.localStorage.getItem(CLAVE); return { config: DEFECTO, ok: true }; } catch { return { config: DEFECTO, ok: false }; }
  }
}
export function guardar(c: Config): boolean {
  try { window.localStorage.setItem(CLAVE, JSON.stringify(c)); return true; } catch { return false; }
}

/** Atributo `data-theme` de <html> para un tema: "dark" (el de fábrica), "light" o "auto" (sigue al dispositivo). */
export const atributoTema = (t: TemaPref): string => (t === "claro" ? "light" : t === "auto" ? "auto" : "dark");
export function aplicarTema(t: TemaPref) {
  document.documentElement.setAttribute("data-theme", atributoTema(t));
}
/** Aplica los colores elegidos de los presidentes: pisan las variables `--pres-<id>` (el color de fábrica está en globals.css). */
export function aplicarColPres(col: Record<string, string>) {
  const st = document.documentElement.style;
  for (let i = st.length - 1; i >= 0; i--) { const n = st.item(i); if (n.startsWith("--pres-")) st.removeProperty(n); }
  for (const [id, c] of Object.entries(col)) st.setProperty(`--pres-${id}`, c);
}
/** Script chico para el <head>: aplica el tema guardado antes de pintar (sin nada guardado queda el oscuro que ya trae el HTML). Debe seguir en sintonía con `atributoTema`. */
export const SCRIPT_TEMA = `try{var c=JSON.parse(localStorage.getItem("${CLAVE}")||"{}");var t=c.tema==="claro"?"light":c.tema==="auto"?"auto":"dark";document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

// ---------------------------------------------------------------- Inicio y fin del mandato
/** Cómo se cuenta cada mandato: inicio `t0` y fin `tf` para todos, con excepciones por presidente. El fin es F+k (F = mes en que asume el sucesor);
 *  `tf` null = igual que el inicio (k = el inicio de cada presidente: T-1 → F-1, T → F, T+1 → F+1). */
export interface BaseCfg { t0: number; t0p: Record<string, number>; tf: number | null; tfp: Record<string, number> }
export const kDe = (b: BaseCfg, id: string): number => b.t0p[id] ?? b.t0;
/** k del fin de un presidente: su excepción, o el de todos, o (fin igual que el inicio) su propio inicio. */
export const kfDe = (b: BaseCfg, id: string): number => b.tfp[id] ?? (b.tf ?? kDe(b, id));
export const txtT = (k: number): string => (k === 0 ? "T" : k > 0 ? `T+${k}` : `T${k}`);
export const txtTLargo = (k: number): string => (k === 0 ? "T (mes de asunción)" : txtT(k));
export const txtF = (k: number): string => (k === 0 ? "F" : k > 0 ? `F+${k}` : `F${k}`);
export const txtFLargo = (k: number): string => (k === 0 ? "F (mes en que asume el siguiente)" : k === -1 ? "F-1 (mes antes de que asuma el siguiente)" : txtF(k));

/** Saca las excepciones que valen lo mismo que "para todos" o que apuntan a un presidente que ya no existe.
 *  El último de `ids` es el presidente en ejercicio: su fin es el previsto (`finPrevisto` de `PRES_DEF`) y también se configura. */
export function limpiarBase(b: BaseCfg, ids: readonly string[]): BaseCfg {
  const t0p: Record<string, number> = {}, tfp: Record<string, number> = {};
  for (const id of ids) if (b.t0p[id] != null && b.t0p[id] !== b.t0) t0p[id] = b.t0p[id];
  for (const id of ids) if (b.tfp[id] != null && b.tfp[id] !== (b.tf ?? kDe(b, id))) tfp[id] = b.tfp[id];
  return { t0: b.t0, t0p, tf: b.tf, tfp };
}
export const baseDeConfig = (c: Config, ids: readonly string[]): BaseCfg => limpiarBase({ t0: c.t0, t0p: c.t0p, tf: c.tf, tfp: c.tfp }, ids);
/** Secciones donde vale la excepción de un presidente: las de `aplicaP`, o todas. */
export const aplicaDe = (c: Pick<Config, "aplicaP">, id: string): SeccionBase[] => c.aplicaP[id] ?? SECCIONES_BASE.map((x) => x[0]);
/** La base de una sección. Para todos: el inicio y el fin configurados si la sección está en `aplica`; si no, los de fábrica (T, fin igual que el inicio: de diciembre a diciembre).
 *  Por presidente: su excepción de inicio y de fin solo si la sección está en su «Dónde» (`aplicaP`); si no, vale lo de «Para todos» de esa sección. */
export function baseDeSeccion(c: Config, sec: SeccionBase, ids: readonly string[]): BaseCfg {
  const gral = c.aplica.includes(sec) ? { t0: c.t0, tf: c.tf } : { t0: DEFECTO.t0, tf: DEFECTO.tf };
  const t0p: Record<string, number> = {}, tfp: Record<string, number> = {};
  for (const id of ids) {
    if (!aplicaDe(c, id).includes(sec)) continue;
    if (c.t0p[id] != null) t0p[id] = c.t0p[id];
    if (c.tfp[id] != null) tfp[id] = c.tfp[id];
  }
  return limpiarBase({ ...gral, t0p, tfp }, ids);
}
/** Dos bases son la misma si cuentan igual a todos los presidentes (el inicio y el fin de cada uno), aunque se expresen distinto
 *  (p. ej. fin "igual que el inicio" con inicio T-1 y fin F-1). */
export const mismaBase = (a: BaseCfg, b: BaseCfg, ids: readonly string[]): boolean =>
  ids.every((id) => kDe(a, id) === kDe(b, id)) && ids.every((id) => kfDe(a, id) === kfDe(b, id));
export const BASE_FABRICA: BaseCfg = { t0: DEFECTO.t0, t0p: {}, tf: DEFECTO.tf, tfp: {} };
export const esBaseDeFabrica = (b: BaseCfg, ids: readonly string[]): boolean => mismaBase(b, BASE_FABRICA, ids);
/** ¿El fin es el de fábrica (igual que el inicio, sin excepciones)? */
export const esFinDeFabrica = (b: BaseCfg, ids: readonly string[]): boolean => {
  const x = limpiarBase(b, ids);
  return x.tf === null && Object.keys(x.tfp).length === 0;
};
/** ¿El inicio es el de fábrica (T para todos, sin excepciones)? */
export const esInicioDeFabrica = (b: BaseCfg, ids: readonly string[]): boolean => {
  const x = limpiarBase(b, ids);
  return x.t0 === DEFECTO.t0 && Object.keys(x.t0p).length === 0;
};

export const encT0p = (t0p: Record<string, number>): string => Object.entries(t0p).map(([id, k]) => `${id}:${k}`).join(",");
const decPares = (s: string | null | undefined, min: number, max: number): Record<string, number> => {
  const o: Record<string, number> = {};
  (s ? s.split(",") : []).forEach((par) => {
    const [id, v] = par.split(":");
    const n = v === undefined || v.trim() === "" ? NaN : Number(v);
    if (id && Number.isFinite(n)) o[id] = Math.max(min, Math.min(max, Math.round(n)));
  });
  return o;
};
export const decT0p = (s: string | null | undefined): Record<string, number> => decPares(s, T_MIN, T_MAX);
export const encTfp = encT0p;
export const decTfp = (s: string | null | undefined): Record<string, number> => decPares(s, TF_MIN, TF_MAX);
/** Parámetros de la URL de una base: solo lo que no es de fábrica (inicio `t0`/`t0p`, fin `tf`/`tfp`).
 *  Cuando el inicio no es el de fábrica el link SIEMPRE lleva `tf` (`i` = igual que el inicio, o el número): un link sin `tf` es de los viejos y significa F-1. */
export const paramsDeBase = (x: BaseCfg): Record<"t0" | "t0p" | "tf" | "tfp", string | null> => {
  const iniFab = x.t0 === DEFECTO.t0 && Object.keys(x.t0p).length === 0;   // sin t0p, `t0` ausente en el link = el de fábrica
  return {
    t0: iniFab ? null : String(x.t0), t0p: encT0p(x.t0p) || null,
    tf: x.tf === null ? (iniFab ? null : "i") : (iniFab && x.tf === DEFECTO.t0 ? null : String(x.tf)), tfp: encTfp(x.tfp) || null,
  };
};
/** Inicio y fin de mandato que trae la URL (`t0`/`t0p`/`tf`/`tfp`, o los viejos `b`/`n` para el inicio), o null si no trae ninguno.
 *  Lo que el link no trae vale lo de fábrica, salvo el inicio de un link viejo con `t0p` y sin `t0` (era T-1) y el fin de un link viejo con inicio (`t0`, `t0p`, `b`) y sin `tf`: era F-1, y sigue siéndolo. */
export function baseDeUrl(p: URLSearchParams): BaseCfg | null {
  const num = (s: string | null, min: number, max: number) => (s == null || s === "" || !Number.isFinite(Number(s)) ? null : Math.max(min, Math.min(max, Math.round(Number(s)))));
  const conIni = p.has("t0") || p.has("t0p") || ["prev", "asume", "mas"].includes(p.get("b") ?? "");
  const tf = p.get("tf") === "i" ? null : (num(p.get("tf"), TF_MIN, TF_MAX) ?? (conIni ? -1 : null));
  const fin = { tf, tfp: decTfp(p.get("tfp")) };
  const conFin = p.has("tf") || p.has("tfp");
  if (p.has("t0") || p.has("t0p")) return { t0: num(p.get("t0"), T_MIN, T_MAX) ?? (p.has("t0p") ? -1 : DEFECTO.t0), t0p: decT0p(p.get("t0p")), ...fin };
  const b = p.get("b");
  if (b === "prev") return { t0: -1, t0p: {}, ...fin };
  if (b === "asume") return { t0: 0, t0p: {}, ...fin };
  if (b === "mas") return { t0: num(p.get("n"), T_MIN, T_MAX) ?? 1, t0p: {}, ...fin };
  return conFin ? { t0: DEFECTO.t0, t0p: {}, ...fin } : null;
}
export const PARAMS_BASE = ["t0", "t0p", "tf", "tfp", "b", "n"] as const;

/** Medida inicial de un monto en pesos, según la medida y el dólar preferidos. */
export const medidaPreferida = (c: Pick<Config, "medida" | "dolar">): string =>
  c.medida === "real" || c.medida === "corr" ? c.medida : `${c.medida}_${c.dolar}`;

/** Valor de un parámetro de la URL: se omite solo si es el de fábrica y la configuración también lo es (así un link compartido muestra lo mismo a cualquiera). */
export const paramSi = (valor: string, fabrica: string, porConfig: string): string | null =>
  valor === fabrica && porConfig === fabrica ? null : valor;

/** Medida con la que entra una variable al agregarla o cambiarla: los montos en pesos usan la preferida; el resto, la suya. */
export const medidaInicial = (tipo: string, porDefecto: string, c: Pick<Config, "medida" | "dolar">): string =>
  tipo === "ars" ? medidaPreferida(c) : porDefecto;

/** Primer mes del "Desde" por defecto de Histórico, dentro de las fechas disponibles. */
export function desdePreferido(d: DesdePref, F: string[]): string {
  if (d === "todo") return F[0];
  if (d === "ultimo") return F[Math.max(0, F.length - 12)];
  const m = `${d}-01`;
  return m < F[0] ? F[0] : m > F[F.length - 1] ? F[F.length - 1] : m;
}
