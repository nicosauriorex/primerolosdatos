// Tarifas y subsidios (/tarifas/, docs/specs/tarifas-y-datos-calientes-4.md, fase 3): quién paga la energía, facturas en AMBA, Córdoba y Santa Fe,
// el AMBA mes a mes del IIEP y los tipos de subsidio con cuántos los reciben.
// Lee `tarifas.json` (lo escribe pipeline/tarifas.py) y hace todas las cuentas de la página. Sin el archivo, la página dice que no hay datos.
import { MESES, fmtMes, nf0, nf1 } from "./formato";
import { encExpr } from "./url";
import type { Expr } from "./motor";

export type Servicio = "luz" | "gas" | "agua";
export type Lugar = "amba" | "cordoba" | "santa_fe";
export type Categoria = "sin_subsidio" | "con_subsidio";

export const SERVICIOS: [Servicio, string][] = [["luz", "Luz"], ["gas", "Gas"], ["agua", "Agua"]];
export const LUGARES: [Lugar, string][] = [["amba", "AMBA"], ["cordoba", "Córdoba"], ["santa_fe", "Santa Fe"]];
export const SERVICIO_DEFECTO: Servicio = "luz";

export interface Cuadro {
  servicio: Servicio; lugar: Lugar; empresa: string; vigencia: string; corte: string; categoria: Categoria;
  consumo: number | null; factura: number | null; norma: string | null; cita: string; nota: string | null;
}
export interface Faltante { servicio: Servicio | null; texto: string }
export interface CoberturaIiep { mes: string | null; canasta: number | null; luz: number | null; gas: number | null; url: string | null }
export interface CoberturaCammesa { mes: string | null; luz: number | null; url: string | null }
export interface Tipo { id: string; nombre: string; desde: string | null; hasta: string | null; quienes: string; descuento: string; norma: string | null }
export interface Cantidad {
  tipo: string; servicio: string; nivel: string; alcance: string; valor: number | null; unidad: string;
  fecha: string | null; fuente: string; cita: string; url: string | null;
}
/** Una foto: las cifras de un mismo subsidio, servicio, lugar y fecha (por ejemplo N1, N2 y N3 de julio de 2024), con su fuente. */
export interface Foto {
  subsidio: string; servicio: string; alcance: string; fecha: string | null; unidad: string;
  partes: { nivel: string; valor: number }[]; total: number | null; fuente: string; cita: string; url: string | null;
}
export interface Tarifas {
  actualizado: string | null; cuadros: Cuadro[]; consumos: Record<string, string>; faltantes: Faltante[];
  iiep: CoberturaIiep | null; cammesa: CoberturaCammesa | null; tipos: Tipo[]; cantidades: Cantidad[];
  fuentes: { texto: string; url: string | null }[]; nota: string | null;
}

const esTxt = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
const num = (x: unknown): number | null => (typeof x === "number" && isFinite(x) ? x : null);
/** Solo links web: lo que venga del archivo no puede traer otro esquema. */
const enlace = (x: unknown): string | null => (typeof x === "string" && /^https?:\/\//i.test(x.trim()) ? x.trim() : null);
const fechaIso = (x: unknown): string | null => (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);
const mesIso = (x: unknown): string | null => (typeof x === "string" && /^\d{4}-\d{2}/.test(x) ? x.slice(0, 7) : null);
const txt = (o: Record<string, unknown>, ...claves: string[]): string => {
  for (const k of claves) { const v = o[k]; if (esTxt(v)) return v.trim(); }
  return "";
};
const obj = (x: unknown): Record<string, unknown> | null => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : null);
const clave = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const servicioDe = (x: unknown): Servicio | null => { const k = typeof x === "string" ? clave(x) : ""; return k === "luz" || k === "gas" || k === "agua" ? k : null; };
const lugarDe = (x: unknown): Lugar | null => {
  const k = typeof x === "string" ? clave(x) : "";
  return k === "amba" ? "amba" : k === "cordoba" ? "cordoba" : k === "santafe" ? "santa_fe" : null;
};
const categoriaDe = (x: unknown): Categoria | null => { const k = typeof x === "string" ? clave(x) : ""; return k === "sinsubsidio" ? "sin_subsidio" : k === "consubsidio" ? "con_subsidio" : null; };

/** Valida el JSON. Devuelve null si no trae nada que mostrar. Un cuadro sin servicio, lugar, categoría o vigencia se descarta. */
export function decodificar(c: unknown): Tarifas | null {
  const o = obj(c);
  if (!o) return null;
  const cuadros: Cuadro[] = [];
  for (const x of Array.isArray(o.cuadros) ? o.cuadros : []) {
    const p = obj(x);
    const servicio = p && servicioDe(p.servicio), lugar = p && lugarDe(p.lugar), categoria = p && categoriaDe(p.categoria), vigencia = p && fechaIso(p.vigencia);
    if (!p || !servicio || !lugar || !categoria || !vigencia) continue;
    const corte = mesIso(p.corte) ?? vigencia.slice(0, 7);
    cuadros.push({
      servicio, lugar, categoria, vigencia, corte, empresa: txt(p, "empresa"), consumo: num(p.consumo), factura: num(p.factura),
      norma: enlace(p.norma), cita: txt(p, "cita"), nota: txt(p, "nota") || null,
    });
  }
  const faltantes: Faltante[] = [];
  for (const x of Array.isArray(o.faltantes) ? o.faltantes : []) {
    if (esTxt(x)) { faltantes.push({ servicio: null, texto: x.trim() }); continue; }
    const p = obj(x);
    if (!p) continue;
    const donde = [txt(p, "lugar"), txt(p, "vigencia", "corte", "anio")].filter(Boolean).join(", ");
    const motivo = txt(p, "motivo", "texto", "nota");
    if (donde || motivo) faltantes.push({ servicio: servicioDe(p.servicio), texto: [donde, motivo].filter(Boolean).join(": ") });
  }
  const consumos: Record<string, string> = {};
  const co = obj(o.consumos);
  if (co) for (const [k, v] of Object.entries(co)) if (esTxt(v)) consumos[k] = v.trim();
  const cob = obj(o.cobertura), ii = cob && obj(cob.iiep), ca = cob && obj(cob.cammesa);
  const iiep = ii && (num(ii.canasta) != null || num(ii.luz) != null || num(ii.gas) != null)
    ? { mes: mesIso(ii.mes), canasta: num(ii.canasta), luz: num(ii.luz), gas: num(ii.gas), url: enlace(ii.url) } : null;
  const cammesa = ca && num(ca.luz) != null ? { mes: mesIso(ca.mes), luz: num(ca.luz), url: enlace(ca.url) } : null;
  const tipos: Tipo[] = [];
  for (const x of Array.isArray(o.tipos) ? o.tipos : []) {
    const p = obj(x);
    const nombre = p ? txt(p, "nombre", "tipo") : "";
    if (!p || !nombre) continue;
    tipos.push({
      id: txt(p, "id") || nombre, nombre, desde: txt(p, "desde") || null, hasta: txt(p, "hasta") || null,
      quienes: txt(p, "quienes", "quiénes", "destinatarios"), descuento: txt(p, "descuento", "que", "qué"), norma: enlace(p.norma ?? p.url),
    });
  }
  const cantidades: Cantidad[] = [];
  for (const x of Array.isArray(o.cantidades) ? o.cantidades : []) {
    const p = obj(x);
    const tipo = p ? txt(p, "tipo", "nombre", "concepto") : "";
    if (!p || !tipo) continue;
    cantidades.push({
      tipo, servicio: txt(p, "servicio"), nivel: txt(p, "nivel"), alcance: txt(p, "alcance"),
      valor: num(p.valor ?? p.cantidad ?? p.usuarios ?? p.hogares), unidad: txt(p, "unidad"),
      fecha: mesIso(p.fecha), fuente: txt(p, "fuente"), cita: txt(p, "cita"), url: enlace(p.url ?? p.norma),
    });
  }
  const fuentes: Tarifas["fuentes"] = [];
  for (const x of Array.isArray(o.fuentes) ? o.fuentes : []) {
    const p = obj(x);
    if (p && esTxt(p.texto)) fuentes.push({ texto: p.texto.trim(), url: enlace(p.url) });
  }
  if (!cuadros.length && !iiep && !cammesa && !tipos.length && !cantidades.length) return null;
  return { actualizado: fechaIso(o.actualizado), cuadros, consumos, faltantes, iiep, cammesa, tipos, cantidades, fuentes, nota: esTxt(o.nota) ? o.nota.trim() : null };
}

/** Porcentaje entero o con un decimal: "54 %", "48,9 %". */
const SERV_TXT: Record<string, string> = {
  luz: "Luz", gas: "Gas", agua: "Agua", luz_y_gas: "Luz y gas", garrafa: "Garrafa", gas_propano_redes: "Propano por redes",
};
const servicioTxt = (s: string): string => SERV_TXT[s] ?? (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "–");
const alcanceTxt = (a: string): string => (a === "país" || a === "" ? "Todo el país" : ((s) => s.charAt(0).toUpperCase() + s.slice(1))(a.replace(/^provincia Buenos Aires/, "Provincia de Buenos Aires").replace(/^provincia /, "")));

/** Agrupa las cifras sueltas en fotos (mismo subsidio, servicio, lugar, fecha y fuente), en el orden de los tipos, el país primero y lo más nuevo arriba. */
export function fotosDe(t: Tarifas): Foto[] {
  const nombreDe = new Map(t.tipos.map((x) => [x.id, x.nombre]));
  const orden = new Map(t.tipos.map((x, i) => [x.id, i]));
  const grupos = new Map<string, { tipo: string; xs: Cantidad[] }>();
  for (const c of t.cantidades) {
    if (c.valor == null) continue;
    const k = [c.tipo, c.servicio, c.alcance, c.fecha, c.url, c.cita].join("|");
    const g = grupos.get(k) ?? { tipo: c.tipo, xs: [] };
    g.xs.push(c);
    grupos.set(k, g);
  }
  const fotos = [...grupos.values()].map(({ tipo, xs }) => {
    const partes = xs.map((x) => ({ nivel: x.nivel, valor: x.valor as number }));
    const niveles = partes.every((p) => /^N[123]$/.test(p.nivel)) && partes.length > 1;
    const x = xs[0];
    return {
      subsidio: nombreDe.get(tipo) ?? tipo, servicio: servicioTxt(x.servicio), alcance: alcanceTxt(x.alcance), fecha: x.fecha,
      unidad: x.unidad || "usuarios", partes, total: niveles ? partes.reduce((s, p) => s + p.valor, 0) : null,
      fuente: x.fuente, cita: x.cita, url: x.url, _o: orden.get(tipo) ?? 99, _p: x.alcance === "país" ? 0 : 1,
    };
  });
  fotos.sort((a, b) => a._o - b._o || (b.fecha ?? "").localeCompare(a.fecha ?? "") || a._p - b._p || a.alcance.localeCompare(b.alcance, "es"));
  return fotos.map(({ _o, _p, ...f }) => { void _o; void _p; return f; });
}

export const txtPct = (x: number): string => `${Number.isInteger(x) ? nf0.format(x) : nf1.format(x)} %`;
/** Lo que pone el Estado: el resto hasta 100, calculado con el valor que se ve (las cuentas cierran). */
export const restoPct = (x: number): number => Math.round((100 - (Number.isInteger(x) ? x : Math.round(x * 10) / 10)) * 10) / 10;
export const txtPesos = (x: number): string => `$ ${nf0.format(Math.round(x))}`;
/** "2025-12-01" → "1-dic-2025"; "2025-12" → "dic-2025". */
export const txtFecha = (iso: string | null): string => {
  const m = iso ? /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(iso) : null;
  return !m ? "sin fecha" : m[3] ? `${+m[3]}-${MESES[+m[2] - 1]}-${m[1]}` : `${MESES[+m[2] - 1]}-${m[1]}`;
};
export const txtMes = (ym: string | null): string => (ym ? fmtMes(ym) : "fecha sin informar");
export const nombreLugar = (l: Lugar): string => LUGARES.find((x) => x[0] === l)![1];
export const esServicio = (x: string | null): x is Servicio => SERVICIOS.some((s) => s[0] === x);

export interface FilaFactura { corte: string; etiqueta: string; celdas: Partial<Record<`${Lugar}:${Categoria}`, Cuadro>> }
/** Una fila por corte (diciembre de cada año y el último cuadro vigente), de lo más nuevo a lo más viejo. El primero, si no es diciembre, se rotula «vigente». */
export function filasDe(t: Tarifas, servicio: Servicio): FilaFactura[] {
  const m = new Map<string, FilaFactura>();
  for (const c of t.cuadros) {
    if (c.servicio !== servicio) continue;
    const f = m.get(c.corte) ?? { corte: c.corte, etiqueta: "", celdas: {} };
    f.celdas[`${c.lugar}:${c.categoria}`] = c; m.set(c.corte, f);
  }
  const filas = [...m.values()].sort((a, b) => (a.corte < b.corte ? 1 : -1));
  filas.forEach((f, i) => { f.etiqueta = i === 0 && !f.corte.endsWith("-12") ? `Vigente (${fmtMes(f.corte)})` : fmtMes(f.corte); });
  return filas;
}

export type Factor = (anio: number, mes: number) => { f: number; estimado: boolean } | null;
/** Factura de la celda: en pesos corrientes o, con `factor`, en pesos de hoy. null si falta la factura o el IPC. */
export const valorFactura = (c: Cuadro, factor: Factor | null): number | null => {
  if (c.factura == null) return null;
  if (!factor) return c.factura;
  const k = factor(+c.vigencia.slice(0, 4), +c.vigencia.slice(5, 7));
  return k ? c.factura * k.f : null;
};

/** Link a las facturas del AMBA (IIEP) en pesos de hoy, como la plantilla de Histórico. */
export function hrefAmba(): string {
  const e = (id: string): Expr => ({ id, med: "real", rel: null, modo: "compra", esc: "" });
  const v = ["tarifa_amba_luz", "tarifa_amba_gas", "tarifa_amba_agua"].map((id) => encExpr(e(id))).join(",");
  return `/historico/?${new URLSearchParams({ v, pl: "tarifas-del-amba-luz-gas-y-agua-iiep" }).toString()}`;
}
