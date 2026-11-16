"use client";
// Carga de novedades.json (docs/specs/novedades-calendario.md). Va aparte del catálogo: no pasa por DatosProvider.
// Se baja una sola vez y se comparte entre la página /novedades/ y el bloque de la portada.
import { useEffect, useMemo, useState } from "react";
import { useSeccion } from "./useSeccion";
import { useConfig } from "./ConfigProvider";
import { datoNovedad, decodificar, exprDeSerie, idsPrincipales, type DatoNovedad, type Novedades, type ProximaFecha, type Publicacion } from "@/lib/novedades";
import type { Expr, SerieMeta } from "@/lib/motor";

let promesa: Promise<Novedades> | null = null;
function bajar(): Promise<Novedades> {
  if (!promesa) {
    promesa = fetch("/datos/novedades.json", { cache: "no-cache" })
      // Sin archivo (404: la corrida todavía no lo armó) es lo mismo que sin novedades: la página dice «Todavía no hay novedades registradas».
      .then((r) => { if (r.status === 404) return { generado: "", publicaciones: [], calendario: [], indec_sin_datos: 0 }; if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<unknown>; })
      .then((c) => { const n = decodificar(c); if (!n) throw new Error("el archivo no tiene el formato esperado"); return n; })
      .catch((e) => { promesa = null; throw e; });
  }
  return promesa;
}

/** `datos` es null mientras carga o si falló (en ese caso `error` trae el mensaje). `activo`: false no baja nada (la portada espera a estar a la vista). */
export function useNovedades(activo = true): { datos: Novedades | null; error: string | null } {
  const [estado, setEstado] = useState<{ datos: Novedades | null; error: string | null }>({ datos: null, error: null });
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    bajar().then((datos) => { if (vivo) setEstado({ datos, error: null }); })
      .catch((e: Error) => { if (vivo) setEstado({ datos: null, error: `No se pudieron cargar las novedades (${e.message}).` }); });
    return () => { vivo = false; };
  }, [activo]);
  return estado;
}

/** Carga los datos de los principales de estas publicaciones y fechas y arma lo que se muestra de cada uno (cifra, cambio, contexto), igual que la ficha. */
export function useDatosNovedades(pubs: Publicacion[], prox: ProximaFecha[]) {
  const ids = useMemo(() => idsPrincipales(pubs, prox), [pubs, prox]);
  const { motor, metas, version, ocupado } = useSeccion(ids);
  const { config } = useConfig();
  const listo = !ocupado && !!motor;
  const filas = useMemo(() => {
    const out = new Map<string, DatoNovedad | null>();
    if (!listo || !motor) return out;
    for (const x of [...pubs, ...prox]) {
      const k = `${x.principal}|${x.periodo}`;
      if (out.has(k)) continue;
      const e = exprDeSerie(x.principal, metas, config);
      let d: DatoNovedad | null = null;
      try { d = e ? datoNovedad(motor, e, x.periodo, config.desde) : null; } catch { d = null; }
      out.set(k, d);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, motor, version, pubs, prox, metas, config.desde, config.medida, config.dolar]);
  return {
    listo, metas, config,
    dato: (id: string, periodo: string): DatoNovedad | null => filas.get(`${id}|${periodo}`) ?? null,
    expr: (id: string): Expr | null => exprDeSerie(id, metas, config),
    meta: (id: string): SerieMeta | undefined => metas.find((s) => s.id === id),
  };
}
