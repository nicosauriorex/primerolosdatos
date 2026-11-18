// RIGI (/rigi/, docs/specs/datos-calientes-3.md, fase 2): los proyectos aprobados del Régimen de Incentivo para Grandes Inversiones, con su monto y su norma.
// Lee `rigi.json` (lo escribe pipeline/manuales_calientes.py) y hace todas las cuentas de la página. Sin el archivo, la página dice que no hay datos.
import { MESES, fmtMes, nf0, nf1 } from "./formato";

export interface ProyectoRigi { nombre: string; empresa: string; provincias: string[]; sector: string; monto: number; empleos: number | null; fecha: string | null; norma: string | null }
export interface IngresadoRigi { bruto: number | null; egresos: number | null; neto: number | null; hasta: string | null; texto: string; url: string | null }
/** Foto de los agregados oficiales (o declarados) en una fecha. Montos en millones de US$; lo que la fuente no trae va en null. */
export interface TotalRigi {
  fecha: string; aprobados: { n: number; monto: number | null } | null;
  evaluacion: { n: number; monto: number | null; empleos: number | null } | null; presentados: { n: number; monto: number | null } | null;
  fuente: string; url: string | null; cita: string | null;
}
/** Proyecto de la lista no oficial (Monitor RIGI). `fecha` es la de presentación (así `ordenar` sirve para las dos tablas). */
export interface PendienteRigi {
  nombre: string; empresa: string; provincias: string[]; sector: string; monto: number; fecha: string | null;
  estado: "evaluacion" | "rechazado"; url: string | null; fechaRechazo: string | null;
}
export interface Rigi {
  actualizado: string | null; fuente: { texto: string; url: string | null } | null;
  proyectos: ProyectoRigi[]; ingresado: IngresadoRigi | null; nota: string | null;
  totales: TotalRigi[]; pendientes: PendienteRigi[];
  fuentePendientes: { texto: string; url: string | null; fecha: string | null } | null; notaPendientes: string | null;
}

const esTxt = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
const num = (x: unknown): number | null => (typeof x === "number" && isFinite(x) ? x : null);
/** Solo links web: lo que venga del archivo no puede traer otro esquema. */
const enlace = (x: unknown): string | null => (typeof x === "string" && /^https?:\/\//i.test(x.trim()) ? x.trim() : null);
const fechaIso = (x: unknown): string | null => (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);

/** Valida el JSON. Devuelve null si no trae proyectos (la página dice entonces que no hay datos). Un proyecto sin nombre o sin monto se descarta. */
export function decodificar(c: unknown): Rigi | null {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  if (!Array.isArray(o.proyectos)) return null;
  const proyectos: ProyectoRigi[] = [];
  for (const p of o.proyectos as Record<string, unknown>[]) {
    if (!p || typeof p !== "object") continue;
    const monto = num(p.monto);
    if (!esTxt(p.nombre) || monto == null || monto < 0) continue;
    proyectos.push({
      nombre: p.nombre.trim(), empresa: esTxt(p.empresa) ? p.empresa.trim() : "–",
      provincias: Array.isArray(p.provincias) ? (p.provincias as unknown[]).filter(esTxt).map((s) => s.trim()) : [],
      sector: esTxt(p.sector) ? p.sector.trim() : "Sin clasificar", monto, empleos: num(p.empleos), fecha: fechaIso(p.fecha), norma: enlace(p.norma),
    });
  }
  if (!proyectos.length) return null;
  const totales = decodificarTotales(o.totales), pendientes = decodificarPendientes(o.pendientes);
  const fp = o.fuente_pendientes as Record<string, unknown> | null | undefined;
  const f = o.fuente as Record<string, unknown> | null | undefined, i = o.ingresado as Record<string, unknown> | null | undefined;
  return {
    totales, pendientes, notaPendientes: esTxt(o.nota_pendientes) ? o.nota_pendientes.trim() : null,
    fuentePendientes: fp && typeof fp === "object" && esTxt(fp.texto) ? { texto: fp.texto.trim(), url: enlace(fp.url), fecha: fechaIso(fp.fecha) } : null,
    actualizado: fechaIso(o.actualizado), nota: esTxt(o.nota) ? o.nota.trim() : null, proyectos,
    fuente: f && typeof f === "object" && esTxt(f.texto) ? { texto: f.texto.trim(), url: enlace(f.url) } : null,
    ingresado: i && typeof i === "object" && (num(i.neto) != null || num(i.bruto) != null)
      ? { bruto: num(i.bruto), egresos: num(i.egresos), neto: num(i.neto), hasta: typeof i.hasta === "string" && /^\d{4}-\d{2}$/.test(i.hasta) ? i.hasta : null,
        texto: esTxt(i.texto) ? i.texto.trim() : "", url: enlace(i.url) }
      : null,
  };
}

const entero = (x: unknown): number | null => (typeof x === "number" && Number.isInteger(x) && x >= 0 ? x : null);
const montoOk = (x: unknown): number | null => { const v = num(x); return v != null && v >= 0 ? v : null; };

/** Fotos de totales, de la más vieja a la más nueva. Una foto sin fecha o sin ningún bloque válido se descarta. */
function decodificarTotales(x: unknown): TotalRigi[] {
  if (!Array.isArray(x)) return [];
  const out: TotalRigi[] = [];
  for (const t of x as Record<string, unknown>[]) {
    if (!t || typeof t !== "object") continue;
    const fecha = fechaIso(t.fecha);
    const bloque = (b: unknown): Record<string, unknown> | null => (b && typeof b === "object" && entero((b as Record<string, unknown>).n) != null ? (b as Record<string, unknown>) : null);
    const a = bloque(t.aprobados), e = bloque(t.evaluacion), pr = bloque(t.presentados);
    if (!fecha || (!a && !e && !pr)) continue;
    out.push({
      fecha, fuente: esTxt(t.fuente) ? t.fuente.trim() : "Fuente sin informar", url: enlace(t.url), cita: esTxt(t.cita) ? t.cita.trim() : null,
      aprobados: a ? { n: entero(a.n)!, monto: montoOk(a.monto) } : null,
      evaluacion: e ? { n: entero(e.n)!, monto: montoOk(e.monto), empleos: montoOk(e.empleos) } : null,
      presentados: pr ? { n: entero(pr.n)!, monto: montoOk(pr.monto) } : null,
    });
  }
  return out.sort((p, q) => (p.fecha < q.fecha ? -1 : p.fecha > q.fecha ? 1 : 0));
}

/** Lista no oficial. Sin nombre o con monto inválido se descarta; un estado desconocido también. */
function decodificarPendientes(x: unknown): PendienteRigi[] {
  if (!Array.isArray(x)) return [];
  const out: PendienteRigi[] = [];
  for (const p of x as Record<string, unknown>[]) {
    if (!p || typeof p !== "object") continue;
    const monto = num(p.monto);
    if (!esTxt(p.nombre) || monto == null || monto < 0 || (p.estado !== "evaluacion" && p.estado !== "rechazado")) continue;
    out.push({
      nombre: p.nombre.trim(), empresa: esTxt(p.empresa) ? p.empresa.trim() : "–",
      provincias: Array.isArray(p.provincias) ? (p.provincias as unknown[]).filter(esTxt).map((s) => s.trim()) : [],
      sector: esTxt(p.sector) ? p.sector.trim() : "Sin clasificar", monto, fecha: fechaIso(p.fecha_presentacion),
      estado: p.estado, url: enlace(p.url), fechaRechazo: fechaIso(p.fecha_rechazo),
    });
  }
  return out;
}

/** Foto oficial más reciente que trae el bloque pedido (la lista viene de la más vieja a la más nueva). */
export function ultimaCon(r: Rigi, bloque: "aprobados" | "evaluacion" | "presentados"): TotalRigi | null {
  for (let i = r.totales.length - 1; i >= 0; i--) if (r.totales[i][bloque]) return r.totales[i];
  return null;
}
/** Fecha ISO de la última actualización del monitor, sacada de su texto («...actualizada al 2026-11-17»); si no está, la de la descarga. */
export function fechaMonitor(r: Rigi): { iso: string | null; descarga: boolean } {
  const fp = r.fuentePendientes;
  const m = fp ? /(\d{4}-\d{2}-\d{2})/.exec(fp.texto) : null;
  return m ? { iso: m[1], descarga: false } : { iso: fp?.fecha ?? null, descarga: true };
}

/** Montos en millones de US$: "US$ 762 millones", "US$ 1.205 millones"; desde 10.000 millones, "US$ 12,3 mil millones". */
export const txtUsd = (millones: number): string =>
  Math.abs(millones) >= 1e4 ? `US$ ${nf1.format(millones / 1e3)} mil millones` : `US$ ${nf0.format(millones)} millones`;
/** Monto de una celda de la tabla: solo el número ("1.205"); la columna dice "millones de US$". */
export const txtMonto = (millones: number): string => nf0.format(millones);

/** "2025-03-14" → "14-mar-2025". */
export const txtFecha = (iso: string | null): string => {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  return m ? `${+m[3]}-${MESES[+m[2] - 1]}-${m[1]}` : "sin fecha";
};
/** "2026-03" → "mar-26". */
export const txtHasta = (ym: string | null): string => (ym ? fmtMes(ym) : "fecha sin informar");

export const totalMonto = (r: Rigi): number => r.proyectos.reduce((a, p) => a + p.monto, 0);

export interface SectorRigi { sector: string; monto: number; proyectos: number }
/** Total por sector, de mayor a menor. */
export function porSector(r: Rigi): SectorRigi[] {
  const m = new Map<string, SectorRigi>();
  for (const p of r.proyectos) {
    const s = m.get(p.sector) ?? { sector: p.sector, monto: 0, proyectos: 0 };
    s.monto += p.monto; s.proyectos += 1; m.set(p.sector, s);
  }
  return [...m.values()].sort((a, b) => b.monto - a.monto || a.sector.localeCompare(b.sector, "es"));
}

export type ClaveOrden = "monto" | "fecha";
export interface OrdenRigi { clave: ClaveOrden; asc: boolean }
export const ORDEN_DEFECTO: OrdenRigi = { clave: "monto", asc: false };
/** Parámetro `o` de la URL: "monto", "monto-asc", "fecha", "fecha-asc". Cualquier otra cosa cae al orden por defecto. */
export function leerOrden(x: string | null): OrdenRigi {
  const m = x ? /^(monto|fecha)(-asc)?$/.exec(x) : null;
  return m ? { clave: m[1] as ClaveOrden, asc: !!m[2] } : ORDEN_DEFECTO;
}
export const escribirOrden = (o: OrdenRigi): string | null => (o.clave === ORDEN_DEFECTO.clave && o.asc === ORDEN_DEFECTO.asc ? null : `${o.clave}${o.asc ? "-asc" : ""}`);
/** Al tocar un encabezado: si ya ordena por esa columna, invierte; si no, arranca de mayor a menor (la fecha más nueva primero). */
export const alternarOrden = (o: OrdenRigi, clave: ClaveOrden): OrdenRigi => (o.clave === clave ? { clave, asc: !o.asc } : { clave, asc: false });

/** Proyectos ordenados; los que no tienen fecha van siempre al final y, a igual valor, por nombre. */
export function ordenar<T extends { nombre: string; monto: number; fecha: string | null }>(ps: T[], o: OrdenRigi): T[] {
  const d = o.asc ? 1 : -1;
  return [...ps].sort((a, b) => {
    if (o.clave === "fecha") {
      if (a.fecha == null && b.fecha != null) return 1;
      if (a.fecha != null && b.fecha == null) return -1;
      if (a.fecha !== b.fecha) return (a.fecha! < b.fecha! ? -1 : 1) * d;
    } else if (a.monto !== b.monto) return (a.monto - b.monto) * d;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

/** Lo ingresado según el BCRA: el neto publicado y, si la resta de bruto menos egresos no da lo mismo (el redondeo de la fuente), la diferencia. */
export function difNeto(i: IngresadoRigi): number | null {
  if (i.bruto == null || i.egresos == null || i.neto == null) return null;
  const resta = Math.round((i.bruto - i.egresos) * 1e6) / 1e6;
  return Math.abs(resta - i.neto) > 1e-9 ? resta : null;
}
