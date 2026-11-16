"use client";
// Cartel con el valor de la barra que está bajo el mouse o el dedo (R32). Cada barra lleva su texto en `data-cartel`;
// el contenedor muestra uno solo, encima de esa barra, sin salirse del gráfico. En el celular aparece al tocar y queda hasta tocar fuera.
// Reemplaza al `title` nativo, que tarda en aparecer y en el celular no aparece. Ver docs/specs/ajustes-tanda-14.md.
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

interface Cartel { t: string; x: number; y: number; el: Element }

export function ConCartel({ children, className }: { children: ReactNode; className?: string }) {
  const caja = useRef<HTMLDivElement>(null), globo = useRef<HTMLSpanElement>(null);
  const [c, setC] = useState<Cartel | null>(null);

  const elegir = (ev: PointerEvent<HTMLDivElement>) => {
    const b = caja.current;
    const el = (ev.target as Element).closest("[data-cartel]");
    if (!b || !el || !b.contains(el)) { if (ev.type === "pointerdown") setC(null); return; }
    if (c?.el === el) return;
    const r = el.getBoundingClientRect(), rb = b.getBoundingClientRect();
    setC({ t: el.getAttribute("data-cartel") ?? "", x: r.left + r.width / 2 - rb.left + b.scrollLeft, y: r.top - rb.top + b.scrollTop, el });
  };

  // un toque fuera de este gráfico (por ejemplo, en otro gráfico de la misma página) cierra su cartel: nunca quedan dos abiertos.
  // Deslizar el gráfico de costado también lo cierra: si no, el cartel quedaría lejos de su barra.
  useEffect(() => {
    if (!c) return;
    const fuera = (ev: Event) => { if (!caja.current?.contains(ev.target as Node)) setC(null); };
    const desliza = (ev: Event) => { if (ev.target instanceof Node && caja.current?.contains(ev.target)) setC(null); };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("scroll", desliza, true);
    return () => { document.removeEventListener("pointerdown", fuera); document.removeEventListener("scroll", desliza, true); };
  }, [c]);

  // centrado sobre la barra, pero sin salirse de los bordes del gráfico
  useLayoutEffect(() => {
    const g = globo.current, b = caja.current;
    if (!c || !g || !b) return;
    const w = g.offsetWidth, max = Math.max(0, b.scrollWidth - w);
    g.style.left = `${Math.min(Math.max(c.x - w / 2, b.scrollLeft), Math.min(max, b.scrollLeft + b.clientWidth - w))}px`;
  }, [c]);

  return (
    <div ref={caja} className={`con-cartel${className ? ` ${className}` : ""}`} onPointerMove={elegir} onPointerDown={elegir}
      onPointerLeave={(ev) => { if (ev.pointerType === "mouse") setC(null); }}>
      {children}
      {c && <span ref={globo} className="cartel-valor" style={{ left: c.x, top: c.y }} aria-hidden="true">{c.t}</span>}
      <span className="sr-solo" aria-live="polite">{c?.t ?? ""}</span>
    </div>
  );
}
