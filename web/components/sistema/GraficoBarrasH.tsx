"use client";
import type { CSSProperties } from "react";
import { niceTicks } from "@/lib/imagen-elecciones";
import { useAparecer } from "./useAparecer";

export interface BarraH { id: string; nombre: string; valor: number | null; texto: string; nota?: string; nota2?: string; sub?: string; tono?: "bueno" | "malo" | null }
export interface GraficoBarrasHProps {
  filas: BarraH[]; etiqueta: string; elegida?: string | string[]; onElegir?: (id: string) => void;
  fmtEje: (v: number) => string; escala?: [string, string];
}

const colorDe = (t?: "bueno" | "malo" | null) => (t === "bueno" ? "var(--bueno)" : t === "malo" ? "var(--malo)" : "var(--acento)");

/** Barras horizontales: nombre a la izquierda, rejilla vertical con marcas redondas, cero marcado y números del eje abajo. */
export function GraficoBarrasH({ filas, etiqueta, elegida, onElegir, fmtEje, escala }: GraficoBarrasHProps) {
  const [ref, aparece] = useAparecer<HTMLDivElement>();
  const vals = filas.flatMap((f) => (f.valor == null ? [] : [f.valor]));
  const mn = Math.min(0, ...vals), mx = Math.max(0, ...vals);
  const marcas = niceTicks(mn, mx, 3);
  const a = marcas[0] ?? mn, b = marcas[marcas.length - 1] ?? mx;
  const span = b - a || 1;   // la cifra va en su propia columna a la derecha: la barra usa todo el ancho entre la primera y la última marca
  const pos = (v: number) => ((v - a) / span) * 100;
  const cero = pos(0);
  const esElegida = (id: string) => (Array.isArray(elegida) ? elegida.includes(id) : id === elegida);

  const pista = (aria: boolean) => (
    <span className="gbh-pista" aria-hidden={aria || undefined}>
      {marcas.map((t) => <span key={t} className="gbh-marca" style={{ left: `${pos(t)}%` }} />)}
      <span className="gbh-cero" style={{ left: `${cero}%` }} />
    </span>
  );

  return (
    <div ref={ref} className="gbh" role="group" aria-label={etiqueta} data-aparece={aparece}>
      {escala && <div className="gbh-escala"><span>{escala[0]}</span><span>{escala[1]}</span></div>}
      <ul className="gbh-lista">
        {filas.map((f, i) => {
          const v = f.valor;
          const neg = v != null && v < 0;
          const ini = v == null ? cero : Math.min(cero, pos(v)), ancho = v == null ? 0 : Math.abs(pos(v) - cero);
          const estilo = { "--i": i, "--c": colorDe(f.tono) } as CSSProperties;
          const cuerpo = (
            <>
              <span className="gbh-nombre" title={f.sub ? `${f.nombre} · ${f.sub}` : f.nombre}>
                <span className="gbh-n">{f.nombre}</span>
                {f.sub && <span className="gbh-sub">{f.sub}</span>}
              </span>
              <span className="gbh-zona">
                {pista(true)}
                {v != null && (
                  <span className={`gbh-barra${neg ? " gbh-neg" : ""}`} style={{ left: `${ini}%`, width: `${ancho}%` }} aria-hidden="true" />
                )}
              </span>
              <span className="gbh-valor">
                <span className="gbh-cifra">{f.texto}</span>
                {f.nota && <span className="gbh-nota">{f.nota}</span>}
                {f.nota2 && <span className="gbh-nota gbh-nota2">{f.nota2}</span>}
              </span>
            </>
          );
          const cls = `gbh-fila${esElegida(f.id) ? " gbh-res" : ""}`;
          return (
            <li key={f.id} className="gbh-item" style={estilo} data-id={f.id}>
              {onElegir
                ? <button type="button" className={`${cls} gbh-toca`} onClick={() => onElegir(f.id)} aria-pressed={esElegida(f.id)}>{cuerpo}</button>
                : <div className={cls}>{cuerpo}</div>}
            </li>
          );
        })}
      </ul>
      <div className="gbh-eje" aria-hidden="true">
        <span className="gbh-eje-nom" />
        <span className="gbh-eje-zona">
          {marcas.map((t) => <span key={t} className="gbh-eje-num" style={{ left: `${pos(t)}%` }}>{fmtEje(t)}</span>)}
        </span>
      </div>
    </div>
  );
}
