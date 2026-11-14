// Página /fuentes/: series agrupadas por organismo, con su link oficial (aparte de fuentes.ts para que el menú no cargue esto).
import type { SerieMeta } from "./motor";
import { organismoDe } from "./fuente-publica";
import { DATOS_FIJOS, hrefFijo } from "./datos-fijos";
import { hrefHistorico } from "./temas";
import { fmtMes, nf0 } from "./formato";

export const LINKS_ORGANISMO: Record<string, string> = {
  "INDEC": "https://www.indec.gob.ar/",
  "BCRA": "https://www.bcra.gob.ar/",
  "Secretaría de Trabajo": "https://www.argentina.gob.ar/trabajo",
  "Bolsa de Comercio de Rosario": "https://www.bcr.com.ar/",
  "ANSES": "https://www.anses.gob.ar/",
  "Banco Mundial": "https://www.worldbank.org/",
  "Bureau of Labor Statistics": "https://www.bls.gov/",
  "Reserva Federal de EE.UU.": "https://www.federalreserve.gov/",
  "Yahoo Finance": "https://finance.yahoo.com/",
};
/** Donde van las series cuya fuente no es un organismo (portales, cálculos propios, enlaces). */
export const GRUPO_OTROS = "Cálculos propios y portales";

export interface GrupoOrganismo { nombre: string; link: string | null; series: SerieMeta[]; esOtros: boolean }

/** Agrupa las series por organismo (el de su primera fuente). Las que no tienen organismo van al final, en "Cálculos propios y portales".
 *  Orden: más series primero; dentro de cada grupo, por nombre público. */
export function agruparPorOrganismo(metas: SerieMeta[]): GrupoOrganismo[] {
  const m = new Map<string, SerieMeta[]>();
  for (const s of metas) {
    const o = organismoDe(s.fuente) || GRUPO_OTROS;
    (m.get(o) ?? m.set(o, []).get(o)!).push(s);
  }
  const porNombre = (a: SerieMeta, b: SerieMeta) => a.n.localeCompare(b.n, "es");
  const grupos = [...m.entries()].map(([nombre, series]) => ({ nombre, link: LINKS_ORGANISMO[nombre] ?? null, series: [...series].sort(porNombre), esOtros: nombre === GRUPO_OTROS }));
  return grupos.sort((a, b) => (a.esOtros ? 1 : 0) - (b.esOtros ? 1 : 0) || b.series.length - a.series.length || a.nombre.localeCompare(b.nombre, "es"));
}

/** "454 series de 13 organismos, desde ene-1995 hasta oct-2026." Los organismos son los grupos con nombre (sin "Cálculos propios y portales"). */
export function fraseFuentes(grupos: GrupoOrganismo[], F: string[]): { cifra: string; frase: string; fecha: string } {
  const n = grupos.reduce((a, g) => a + g.series.length, 0), k = grupos.filter((g) => !g.esOtros).length;
  const desde = F.length ? fmtMes(F[0]) : "", hasta = F.length ? fmtMes(F[F.length - 1]) : "";
  return {
    cifra: nf0.format(n),
    frase: `${nf0.format(n)} series de ${nf0.format(k)} organismos${desde ? `, desde ${desde} hasta ${hasta}` : ""}.`,
    fecha: hasta ? `datos hasta ${hasta}` : "series en el sitio",
  };
}

/** A dónde lleva el nombre de una serie: su página fija (/dato/<slug>/) si la tiene; si no, el Histórico con esa serie. */
export function hrefSerie(id: string): string {
  const fijo = DATOS_FIJOS.find((d) => d.e.id === id);
  return fijo ? hrefFijo(fijo.slug) : hrefHistorico({ id });
}
