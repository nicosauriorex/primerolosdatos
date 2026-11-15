"use client";
// Minigráfico con marcadores: punto en el último dato y en el dato con el que se compara, dos o tres fechas en el eje X,
// y al pasar el mouse o tocar, una línea vertical con un globo (fecha y valor). Opcionalmente una segunda línea con leyenda.
// El dibujo es un SVG que se estira (la línea no se deforma: trazo no escalable); los puntos, el globo y las fechas son HTML posicionado en %.
import { useEffect, useMemo, useRef, useState } from "react";
import { fmtMes, ok } from "@/lib/formato";
import type { Vals } from "@/lib/motor";

interface Props {
  v: Vals;
  /** Fechas "AAAA-MM" de cada índice de `v` (las del motor). */
  F: string[];
  /** Primer y último índice a dibujar (si no, todo). */
  desde?: number;
  hasta?: number;
  /** Cómo se escribe un valor en el globo y en el resumen. */
  fmt: (x: number) => string;
  /** Índice del dato con el que se compara (punto hueco). */
  cmp?: number;
  /** Segunda línea y los nombres de las dos (leyenda). */
  v2?: Vals;
  leyenda?: [string, string];
  /** Qué mide, para el resumen para lectores de pantalla. */
  nombre?: string;
}

const PAD = 8;   // % de aire arriba y abajo
function puntos(v: Vals, a: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = a; i <= b && i < v.length; i++) { const y = v[i]; if (ok(y)) out.push([i, y]); }
  return out;
}

export function MiniGrafico({ v, F, desde = 0, hasta, fmt, cmp, v2, leyenda, nombre }: Props) {
  const fin = Math.min(hasta ?? v.length - 1, v.length - 1, F.length - 1);
  const ini = Math.max(0, desde);
  const g = useMemo(() => {
    const p1 = puntos(v, ini, fin), p2 = v2 ? puntos(v2, ini, fin) : [];
    if (p1.length < 2) return null;
    const todos = [...p1, ...p2].map((q) => q[1]);
    const lo = Math.min(...todos), hi = Math.max(...todos);
    const x0 = Math.min(p1[0][0], p2[0]?.[0] ?? Infinity), x1 = Math.max(p1[p1.length - 1][0], p2[p2.length - 1]?.[0] ?? -Infinity);
    const X = (i: number) => ((i - x0) / ((x1 - x0) || 1)) * 100;
    const Y = (y: number) => PAD + (1 - (y - lo) / ((hi - lo) || 1)) * (100 - 2 * PAD);
    const trazo = (p: [number, number][]) => p.map(([i, y], k) => `${k ? "L" : "M"}${X(i).toFixed(2)},${Y(y).toFixed(2)}`).join("");
    return { p1, p2, X, Y, x0, x1, d1: trazo(p1), d2: p2.length ? trazo(p2) : "" };
  }, [v, v2, ini, fin]);

  const area = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<number | null>(null);   // índice del dato bajo el puntero

  useEffect(() => {   // tocar fuera cierra el globo (en el celular no hay "salir")
    if (sel == null) return;
    const afuera = (ev: Event) => { if (!area.current?.contains(ev.target as Node)) setSel(null); };
    document.addEventListener("pointerdown", afuera);
    return () => document.removeEventListener("pointerdown", afuera);
  }, [sel]);

  if (!g) return null;
  const { p1, p2, X, Y, x0, x1 } = g;
  const ultimo = p1[p1.length - 1], ultimo2 = p2[p2.length - 1];
  const val = (vv: Vals, i: number) => (ok(vv[i]) ? vv[i] as number : null);

  const cerca = (ev: React.PointerEvent) => {
    const r = area.current?.getBoundingClientRect();
    if (!r || !r.width) return;
    const i = x0 + Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)) * (x1 - x0);
    let mejor = p1[0][0], dist = Infinity;
    for (const [k] of p1) { const d = Math.abs(k - i); if (d < dist) { dist = d; mejor = k; } }
    setSel(mejor);
  };

  // Fechas del eje: inicio y fin, y la de comparación si queda lejos de las dos puntas
  const ejes: { i: number; alin: "ini" | "med" | "fin" }[] = [{ i: p1[0][0], alin: "ini" }, { i: x1, alin: "fin" }];
  if (cmp != null && cmp > x0 && cmp < x1 && X(cmp) > 22 && X(cmp) < 78) ejes.splice(1, 0, { i: cmp, alin: "med" });

  const resumen = `${nombre ? nombre + ": " : ""}evolución entre ${fmtMes(F[p1[0][0]])} y ${fmtMes(F[ultimo[0]])}. ` +
    (leyenda && ultimo2
      ? `${leyenda[0]}: de ${fmt(p1[0][1])} a ${fmt(ultimo[1])}. ${leyenda[1]}: de ${fmt(p2[0][1])} a ${fmt(ultimo2[1])}.`
      : `De ${fmt(p1[0][1])} a ${fmt(ultimo[1])}` + (cmp != null && val(v, cmp) != null && cmp !== p1[0][0] ? `; ${fmtMes(F[cmp])}: ${fmt(val(v, cmp) as number)}.` : "."));

  const xs = sel != null ? X(sel) : 0;
  return (
    <div className="mg">
      <div className="mg-area" ref={area} role="img" aria-label={resumen}
        onPointerMove={cerca} onPointerDown={cerca} onPointerLeave={(ev) => { if (ev.pointerType === "mouse") setSel(null); }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {g.d2 && <path className="mg-l2" d={g.d2} fill="none" vectorEffect="non-scaling-stroke" />}
          <path className="mg-l1" d={g.d1} fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
        {cmp != null && val(v, cmp) != null && cmp >= x0 && cmp <= x1 && <span className="mg-punto mg-cmp" aria-hidden="true" style={{ left: `${X(cmp)}%`, top: `${Y(val(v, cmp) as number)}%` }} />}
        <span className="mg-punto" aria-hidden="true" style={{ left: `${X(ultimo[0])}%`, top: `${Y(ultimo[1])}%` }} />
        {ultimo2 && <span className="mg-punto mg-p2" aria-hidden="true" style={{ left: `${X(ultimo2[0])}%`, top: `${Y(ultimo2[1])}%` }} />}
        {sel != null && (
          <>
            <span className="mg-guia" aria-hidden="true" style={{ left: `${xs}%` }} />
            <span className={`mg-globo${xs > 55 ? " mg-izq" : ""}`} aria-hidden="true" style={{ left: `${xs}%` }}>
              <b>{fmtMes(F[sel])}</b>
              {ok(v[sel]) && <span>{leyenda ? `${leyenda[0]}: ` : ""}{fmt(v[sel] as number)}</span>}
              {v2 && ok(v2[sel]) && <span className="mg-g2">{leyenda ? `${leyenda[1]}: ` : ""}{fmt(v2[sel] as number)}</span>}
            </span>
          </>
        )}
      </div>
      <div className="mg-eje" aria-hidden="true">
        {ejes.map((x) => <span key={x.i} className={`mg-fecha mg-${x.alin}`} style={x.alin === "med" ? { left: `${X(x.i)}%` } : undefined}>{fmtMes(F[x.i])}</span>)}
      </div>
      {leyenda && (
        <ul className="mg-leyenda">
          <li><i className="mg-k1" aria-hidden="true" />{leyenda[0]}</li>
          <li><i className="mg-k2" aria-hidden="true" />{leyenda[1]}</li>
        </ul>
      )}
    </div>
  );
}
