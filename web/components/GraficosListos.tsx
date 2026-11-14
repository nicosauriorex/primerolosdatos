"use client";
// Capítulo "Gráficos listos": hasta 6 plantillas curadas que usan la variable, en láminas, y el link a todas las de ese nombre.
// Lo usan la ficha del dato (FichaDato.tsx) y Histórico (vista de un solo gráfico).
import { useMemo } from "react";
import Link from "next/link";
import { useSeccion } from "./useSeccion";
import { Capitulo } from "./sistema/Capitulo";
import { Lamina, Laminas } from "./sistema/Lamina";
import { mismaVariable } from "@/lib/datos-fijos";
import { crearPlantillas, evaluar, hrefPlantilla } from "@/lib/plantillas";
import type { Expr, Motor, SerieMeta } from "@/lib/motor";
import { idsDe } from "@/lib/temas";

const MAX_LAMINAS = 6;

/** `nombre`: el de la variable (para el rótulo y para buscar en "Ver todos los gráficos listos"). Sin plantillas, no dibuja nada. */
export function GraficosListos({ m, e, metas, nivel, nombre, titulo = "Gráficos listos", id = "fi-laminas" }: {
  m: Motor; e: Expr; metas: SerieMeta[]; nivel: 2 | 3; nombre: string; titulo?: string; id?: string;
}) {
  const kE = `${e.id}~${e.med}~${e.rel}~${e.modo}~${e.esc}`;
  const todas = useMemo(() => crearPlantillas(metas), [metas]);
  // Las curadas que usan la serie, sin la que muestra exactamente esta misma variable sola (sería la misma vista otra vez)
  const pls = useMemo(() => todas.filter((x) => x.curada && !x.propia && x.ids.includes(e.id) && !(x.e && mismaVariable(x.e, e) && x.ids.length === idsDe(e).length)).slice(0, MAX_LAMINAS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todas, kE]);
  const ids = useMemo(() => [...new Set(pls.flatMap((x) => x.ids))], [pls]);
  const sec = useSeccion(ids);
  const evs = useMemo(() => (sec.ocupado ? [] : pls.map((x) => ({ x, ev: evaluar(m, x) })).filter((y) => y.ev)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pls, sec.ocupado, sec.version, m]);
  if (!evs.length) return null;
  return (
    <Capitulo id={id} nivel={nivel} titulo={titulo}>
      <Laminas etiqueta={`Gráficos listos con ${nombre}`}>
        {evs.map(({ x, ev }) => <Lamina key={x.id} titulo={x.titulo} cifra={ev!.val} fecha={ev!.fecha} v={ev!.v} desde={m.idxDe("2003-01")} tono={ev!.cls} href={hrefPlantilla(x, ev!.vista)} />)}
      </Laminas>
      <p className="fi-mas"><Link prefetch={false} className="enlace" href={`/plantillas/?${new URLSearchParams({ q: nombre }).toString()}`}>Ver todos los gráficos listos</Link></p>
    </Capitulo>
  );
}
