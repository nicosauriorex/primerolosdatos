// Orden de los resultados del buscador (portada y buscador global). Funciones puras, sin React.
// Un solo orden: datos principales, filas propias de Herencia y del parte diario del Banco Central con las palabras en el nombre,
// variables del catálogo, las filas propias que coinciden por sinónimos, gráficos listos, temas y secciones. Regla: todo dato que se ve en el sitio se encuentra desde la lupa.
import { buscarSeries, palabrasBusqueda, textoBusqueda } from "./catalogo";
import { hrefFijo, mismaVariable } from "./datos-fijos";
import { norm } from "./formato";
import { nombresDiario } from "./diario";
import { FILAS_HERENCIA } from "./herencia";
import { DEF_RN_PROPIA, DEF_RN_PROPIA_BCRA, FILAS_INFORME, PREF_INF } from "./herencia-informes";
import type { Expr, SerieMeta } from "./motor";
import { SINONIMOS, rutaPublica } from "./nombres";
import { filtrar, hrefPlantilla, MIN_BUSQUEDA, type Plantilla } from "./plantillas";
import { GRUPOS_SECCIONES, SECCIONES } from "./secciones";
import { TEMAS, hrefDato, hrefHistorico, principalesDe } from "./temas";

export interface ResultadoBusqueda {
  tipo: "principal" | "variable" | "herencia" | "diario" | "grafico" | "seccion";
  titulo: string;
  /** Línea gris: la ruta ("Precios › Indicadores de inflación") o el grupo. */
  detalle: string;
  href: string;
  /** Para la cifra en vivo del primer resultado. */
  e?: Expr;
  plantilla?: Plantilla;
}

export interface ContextoBusqueda {
  metas: SerieMeta[];
  S: Record<string, SerieMeta>;
  plantillas: Plantilla[];
  /** Medida con la que se abre una variable (la preferida del usuario para las de pesos). */
  medidaDe: (s: SerieMeta) => string;
}

/** Máximo de cada grupo. */
export const MAX_GRUPO = { principal: 3, variable: 4, herencia: 4, diario: 2, grafico: 3, seccion: 2 } as const;

/** Palabras con las que también se encuentra una fila de Herencia (además de su nombre). Clave: la de la fila. */
const SINONIMOS_HERENCIA: Record<string, string> = {
  puts: "opciones liquidez bancos bonos",
  bopreal: "bopreal importadores deuda bonos",
  cepo: "cepo cambiario dolar ahorro restricciones",
  cobertura_luz: "tarifas luz electricidad subsidios energia costo",
  precios_acordados: "precios justos cuidados controles acordados",
  importaciones_pendientes: "deuda importadores importaciones",
  deuda_bruta_usd: "deuda publica total endeudamiento",
  deuda_bruta_pib: "deuda publica pib endeudamiento",
  deuda_moneda_ext: "deuda publica moneda extranjera dolarizada",
  fmi_deuda: "fmi fondo monetario deuda",
  fmi_acuerdo: "fmi fondo monetario acuerdo programa",
  deuda_importadores: "deuda comercial importadores",
  reservas_netas_fmi: "reservas netas fmi",
  reservas_netas_bcra: "reservas netas banco central bcra",
  cobertura_amba: "tarifas subsidios servicios publicos amba luz gas agua transporte",
  reservas_netas_propia: "reservas netas estimacion",
  reservas_netas_propia_bcra: "reservas netas estimacion banco central bcra",
  pasivos_base: "pasivos remunerados base monetaria leliq lefi pases",
  fiscal_cuasi: "deficit fiscal cuasifiscal resultado banco central tesoro",
};

/** Palabras con las que también se encuentra una variable del parte diario del Banco Central. */
const SINONIMOS_DIARIO: Record<string, string> = {
  compras: "compras ventas dolares bcra intervencion",
  reservas: "reservas brutas bcra diarias",
  minorista: "dolar oficial bancos",
  mayorista: "dolar oficial a3500 com",
  tamar: "tasa interes plazo fijo",
  badlar: "tasa interes plazo fijo",
  base: "base monetaria emision pesos",
  depositos: "depositos plazo fijo bancos pesos",
};
/** Una fila de una página propia que el buscador encuentra: `extra` son las palabras que también la encuentran. */
interface FilaPropia { titulo: string; detalle: string; href: string; extra: string }
const FILAS_BUSCABLES_DIARIO: FilaPropia[] = nombresDiario().map((d) => ({ titulo: d.nombre, detalle: "Banco Central › Parte diario", href: `/bcra/?v=${d.clave}`, extra: d.clave + " " + (SINONIMOS_DIARIO[d.clave] ?? "") }));

/** Filas de Herencia que no salen de otra forma en el buscador: las cargadas a mano de informes, las estimaciones de reservas netas
 *  y las cuentas propias de la tabla (cocientes y restas). Las demás filas de la tabla son series del catálogo y ya salen como dato o variable. */
const FILAS_BUSCABLES_HERENCIA: FilaPropia[] = ([
  ...FILAS_INFORME.map((d) => ({
    clave: d.clave, titulo: d.nombre,
    detalle: d.grupo === "Estimaciones" ? `Herencia › Estimaciones (${d.quien})` : `Herencia › ${d.grupo}`,
    href: `/herencia/?vista=traspasos&v=${PREF_INF}${d.clave}#traspasos`,
  })),
  // las estimaciones propias salen de otro archivo y no tienen vista de traspasos: van al bloque de estimaciones
  ...[DEF_RN_PROPIA, DEF_RN_PROPIA_BCRA].map((d) => ({ clave: d.clave, titulo: d.nombre, detalle: `Herencia › Estimaciones (${d.quien})`, href: "/herencia/#her-est" })),
  ...FILAS_HERENCIA.filter((f) => f.cociente || f.menos).map((f) => ({
    clave: f.clave, titulo: f.nombre ?? f.clave, detalle: `Herencia › ${f.grupo}`, href: `/herencia/?vista=traspasos&v=${f.clave}#traspasos`,
  })),
]).map(({ clave, ...f }) => ({ ...f, extra: SINONIMOS_HERENCIA[clave] ?? "" }));

/** Los cinco que se sugieren sin escribir. Cada slug es un dato fijo de `lib/datos-fijos.ts`. */
export const MAS_BUSCADOS: { titulo: string; slug: string }[] = [
  { titulo: "Inflación", slug: "inflacion-mensual" },
  { titulo: "Dólar blue", slug: "dolar-blue" },
  { titulo: "Salario", slug: "salario-mediano-real" },
  { titulo: "Pobreza", slug: "pobreza" },
  { titulo: "Riesgo país", slug: "riesgo-pais" },
];
export const hrefMasBuscado = (slug: string): string => hrefFijo(slug);

/** Cada palabra tiene que empezar una palabra del texto ("asado" no encuentra "pasado"). */
const empieza = (texto: string, w: string): boolean => new RegExp("(^|[^a-z0-9])" + w.replace(/[^a-z0-9]/g, (c) => "\\" + c)).test(texto);
/** Cuántas palabras de la búsqueda aparecen en el texto. */
const cuantas = (texto: string, ws: string[]): number => ws.filter((w) => empieza(texto, w)).length;

/** Hay búsqueda cuando se escribieron al menos dos caracteres. */
export const hayBusqueda = (q: string): boolean => norm(q).trim().length >= MIN_BUSQUEDA && palabrasBusqueda(q).length > 0;

export function buscar(q: string, ctx: ContextoBusqueda): ResultadoBusqueda[] {
  if (!hayBusqueda(q)) return [];
  const ws = palabrasBusqueda(q);
  const out: ResultadoBusqueda[] = [];

  // 1. Datos principales: por nombre, nombre corto o sinónimos de su serie. Los que tienen la palabra en el nombre, primero; empate: orden de los temas.
  const filas = TEMAS.flatMap((t) => principalesDe(t, ctx.S).map((p) => {
    const nombre = norm(p.nombre + " " + p.corto), extra = norm((SINONIMOS[p.id] ?? "") + " " + (ctx.S[p.id]?.nTecnico ?? ""));
    return { p, tema: t.nombre, enNombre: cuantas(nombre, ws), enTodo: cuantas(nombre + " " + extra, ws) };
  }));
  let sel = filas.filter((f) => f.enTodo === ws.length);
  // Respaldo con algunas de las palabras: solo si al final no hay ningún resultado con todas ("deuda public" no trae inflación de regulados por "public")
  const parciales = !sel.length && ws.length > 1 ? filas.filter((f) => f.enTodo > 0).sort((a, b) => b.enTodo - a.enTodo).slice(0, MAX_GRUPO.principal) : [];
  sel = sel.map((f, i) => ({ f, i })).sort((a, b) => (b.f.enNombre === ws.length ? 1 : 0) - (a.f.enNombre === ws.length ? 1 : 0) || a.i - b.i).map((x) => x.f);
  const principales = sel.slice(0, MAX_GRUPO.principal);
  principales.forEach((f) => out.push({ tipo: "principal", titulo: f.p.nombre, detalle: ctx.S[f.p.id] ? rutaPublica(ctx.S[f.p.id].cat).join(" › ") : f.tema, href: hrefDato(f.p), e: f.p }));

  // Filas propias de Herencia y del parte diario del Banco Central (fuera del catálogo mensual). Las que tienen todas las palabras en el nombre
  // van antes de las variables (primero las que empiezan con la primera palabra: "compras" → la compra de dólares antes que el cepo);
  // las que coinciden solo por sinónimos, después de las variables.
  const propias = (filas: FilaPropia[], tipo: "herencia" | "diario"): (ResultadoBusqueda & { enNombre: boolean; inicio: boolean })[] =>
    filas.map((h) => {
      const nombre = norm(h.titulo);
      return { tipo, titulo: h.titulo, detalle: h.detalle, href: h.href, enNombre: cuantas(nombre, ws) === ws.length, inicio: nombre.startsWith(ws[0]),
        enTodo: cuantas(nombre + " " + norm(h.extra), ws) === ws.length };
    }).filter((x) => x.enTodo).sort((a, b) => Number(b.enNombre) - Number(a.enNombre)).slice(0, MAX_GRUPO[tipo]).map(({ enTodo: _, ...x }) => x);
  const extras = [...propias(FILAS_BUSCABLES_HERENCIA, "herencia"), ...propias(FILAS_BUSCABLES_DIARIO, "diario")];
  const sinMarcas = ({ enNombre: _a, inicio: _b, ...r }: (typeof extras)[number]): ResultadoBusqueda => r;
  extras.filter((x) => x.enNombre).map((x, i) => ({ x, i })).sort((a, b) => Number(b.x.inicio) - Number(a.x.inicio) || a.i - b.i).forEach(({ x }) => out.push(sinMarcas(x)));

  // 2. Variables del catálogo, sin repetir las que ya salieron como principal (misma serie)
  const usadas = new Set(principales.map((f) => f.p.id));
  // Como en `filtrar`: cada palabra tiene que empezar una palabra del texto ("asado" no encuentra "pasado")
  const inicios = palabrasBusqueda(q).map((w) => new RegExp("(^|[^a-z0-9])" + w.replace(/[^a-z0-9]/g, (c) => "\\" + c)));
  const empiezaPalabra = (s: SerieMeta) => { const t = textoBusqueda(s as SerieMeta & { busca?: string }); return inicios.every((re) => re.test(t)); };
  buscarSeries(ctx.metas, q, 16).filter((s) => !usadas.has(s.id) && empiezaPalabra(s)).slice(0, MAX_GRUPO.variable).forEach((s) => {
    const e: Expr = { id: s.id, med: ctx.medidaDe(s), rel: null, modo: "compra", esc: "" };
    out.push({ tipo: "variable", titulo: s.n, detalle: rutaPublica(s.cat).join(" › "), href: hrefHistorico(e), e });
  });

  extras.filter((x) => !x.enNombre).forEach((x) => out.push(sinMarcas(x)));

  // 3. Gráficos listos (sin los propios)
  filtrar(ctx.plantillas.filter((p) => !p.propia && !principales.some((f) => p.e && mismaVariable(f.p, p.e))), q, ctx.S).slice(0, MAX_GRUPO.grafico).forEach((p) =>
    out.push({ tipo: "grafico", titulo: p.titulo, detalle: p.grupo, href: hrefPlantilla(p), ...(p.e ? { e: p.e, plantilla: p } : {}) }));

  // 4. Temas y secciones cuyo nombre coincida
  const nombres: ResultadoBusqueda[] = [
    ...TEMAS.map((t) => ({ tipo: "seccion" as const, titulo: t.nombre, detalle: "Tema", href: `/tema/${t.slug}/` })),
    ...SECCIONES.map((s) => ({ tipo: "seccion" as const, titulo: s.nombre, detalle: GRUPOS_SECCIONES.find((g) => g.id === s.grupo)?.titulo ?? "Sección", href: `/${s.carpeta}/` })),
  ];
  nombres.filter((r) => cuantas(norm(r.titulo), ws) === ws.length).slice(0, MAX_GRUPO.seccion).forEach((r) => out.push(r));
  if (!out.length) parciales.forEach((f) => out.push({ tipo: "principal", titulo: f.p.nombre, detalle: ctx.S[f.p.id] ? rutaPublica(ctx.S[f.p.id].cat).join(" › ") : f.tema, href: hrefDato(f.p), e: f.p }));
  return out;
}
