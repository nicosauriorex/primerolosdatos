"use client";
// Columnas verticales, una por año, del mismo mes calendario (todos los octubres): la del año actual en el color de acento,
// las demás en un tono apagado. SVG propio, medido al ancho del contenedor (a 360 px entran todas, más finas).
// Todos los rótulos (último dato, año de referencia, columna tocada) van en una franja propia arriba, cada uno unido a su columna
// con una línea fina de puntos; no se pisan entre sí. Pasar el mouse o tocar una columna muestra su año y valor ahí;
// con teclado, el gráfico es enfocable y las flechas recorren los años. Para lectores de pantalla, además, una tabla oculta.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/** `ref`: el año de "el más bajo (o alto) desde…": se pinta en otro color y lleva su año y valor arriba. */
export type FilaBarraMes = { anio: string; valor: number; texto: string; actual: boolean; ref?: boolean };

const ALTO = 214, ARRIBA = 48, ABAJO = 24;   // franja de rótulos (dos renglones, hasta 46) arriba; los años debajo del eje
const RENGLON = [14, 32];   // línea base del texto de cada renglón de la franja
const PX_CAR = 7.2, PAD = 8;   // ancho estimado por carácter y aire mínimo entre dos rótulos

/** Un rótulo de la franja de arriba: va unido a su columna con una línea fina de puntos. `peso`: importancia (si dos chocan, el más importante queda más cerca de la columna). */
type Rotulo = { clave: string; i: number; texto: string; clase: string; guia: string; peso: number };
type Puesto = Rotulo & { x0: number; w: number; xb: number; fila: number };

/** `cero` (R20, por defecto sí): con valores por debajo del cero, la línea del cero va con el color propio `--cero`. */
export function BarrasMes({ filas, etiqueta, cero = true }: { filas: FilaBarraMes[]; etiqueta: string; cero?: boolean }) {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setAncho(Math.floor(el.clientWidth));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const N = filas.length;
  const vals = filas.map((f) => f.valor);
  const min = Math.min(0, ...vals);
  let max = Math.max(0, ...vals);
  if (max === min) max = min + 1;
  const alto = ALTO - ARRIBA - ABAJO;
  const y = (v: number) => ARRIBA + ((max - v) / (max - min)) * alto;
  const y0 = y(0);
  const banda = N ? ancho / N : 0;
  const bw = Math.max(1, banda >= 4 ? banda * 0.7 : banda - 0.5);
  const iAct = filas.findIndex((f) => f.actual);

  const elegirEn = (ev: PointerEvent<SVGSVGElement>) => {
    if (!banda) return;
    const r = ev.currentTarget.getBoundingClientRect();
    const i = Math.floor((ev.clientX - r.left) / banda);
    setSel(i >= 0 && i < N ? i : null);
  };
  const tecla = (ev: KeyboardEvent<SVGSVGElement>) => {
    const k = ev.key;
    if (k !== "ArrowLeft" && k !== "ArrowRight" && k !== "Home" && k !== "End" && k !== "Escape") return;
    ev.preventDefault();
    if (k === "Escape") { setSel(null); return; }
    setSel((s) => {
      const desde = s ?? (iAct >= 0 ? iAct : N - 1);
      if (k === "Home") return 0;
      if (k === "End") return N - 1;
      return Math.max(0, Math.min(N - 1, desde + (k === "ArrowLeft" ? -1 : 1)));
    });
  };

  const filaSel = sel != null ? filas[sel] : null;
  const iRef = filas.findIndex((f) => f.ref);
  const xDe = (i: number) => i * banda + banda / 2;
  const cima = (i: number) => Math.min(y(filas[i].valor), y0);
  // Rótulos de arriba (R15): el de la columna tocada, el del año de referencia y el del último dato. Ninguno pisa a otro:
  // se prueba el primer renglón y después el segundo (la línea de uno tampoco cruza el texto del otro); si no entra en ninguno, se corre de costado.
  const rotulos: Rotulo[] = [];
  if (sel != null && filaSel && sel !== iAct && sel !== iRef) rotulos.push({ clave: "sel", i: sel, texto: `${filaSel.anio}: ${filaSel.texto}`, clase: "bmes-rotulo", guia: "bmes-guia-sel", peso: 3 });
  if (iRef >= 0) rotulos.push({ clave: "ref", i: iRef, texto: `${filas[iRef].anio}: ${filas[iRef].texto}`, clase: "bmes-ref-txt", guia: "bmes-guia-ref", peso: 2 });
  if (iAct >= 0) rotulos.push({ clave: "act", i: iAct, texto: `${filas[iAct].anio}: ${filas[iAct].texto}`, clase: "bmes-valor bmes-valor-top", guia: "bmes-guia-act", peso: 1 });
  rotulos.sort((p, q) => q.peso - p.peso);
  const puestos: Puesto[] = [];
  rotulos.forEach((r) => {
    const w = r.texto.length * (r.clave === "act" ? 8.2 : PX_CAR) + 4, xb = xDe(r.i);
    const x0 = Math.max(0, Math.min(xb - w / 2, ancho - w));
    const cruza = (alta: Puesto, baja: Puesto) => alta.xb > baja.x0 - 3 && alta.xb < baja.x0 + baja.w + 3;   // la línea del renglón de arriba atraviesa el texto de abajo
    const choca = (c: Puesto) => puestos.some((p) => (p.fila === c.fila ? c.x0 < p.x0 + p.w + PAD && p.x0 < c.x0 + c.w + PAD : p.fila < c.fila ? cruza(p, c) : cruza(c, p)));
    let c: Puesto = { ...r, x0, w, xb, fila: 0 };
    if (choca(c)) { c = { ...c, fila: 1 }; }
    if (choca(c)) {   // sin lugar en ningún renglón: de costado, en el segundo, después del que estorba
      const fin = Math.max(...puestos.filter((p) => p.fila === 1).map((p) => p.x0 + p.w + PAD), 0);
      c = { ...c, x0: Math.min(Math.max(c.x0, fin), Math.max(0, ancho - w)) };
    }
    puestos.push(c);
  });

  return (
    <div className="bmes" ref={caja}>
      {ancho > 0 && N > 0 ? (
        <svg className="bmes-svg" width={ancho} height={ALTO} viewBox={`0 0 ${ancho} ${ALTO}`} role="img" aria-label={etiqueta} tabIndex={0}
          onPointerMove={elegirEn} onPointerDown={elegirEn} onPointerLeave={(ev) => { if (ev.pointerType === "mouse") setSel(null); }}
          onKeyDown={tecla} onBlur={() => setSel(null)}>
          {filas.map((f, i) => {
            const top = cima(i), h = Math.max(1, Math.abs(y(f.valor) - y0));
            return <rect key={f.anio + i} className={`bmes-col${f.actual ? " bmes-actual" : ""}${f.ref ? " bmes-ref" : ""}${i === sel ? " bmes-sel" : ""}`}
              x={i * banda + (banda - bw) / 2} y={top} width={bw} height={h} />;
          })}
          <line className={`bmes-cero${cero && min < 0 ? " bmes-cero-marca" : ""}`} x1={0} x2={ancho} y1={y0} y2={y0} />
          {puestos.map((p) => (
            <g key={p.clave}>
              <line className={`bmes-guia ${p.guia}`} x1={p.xb} x2={p.xb} y1={RENGLON[p.fila] + 4} y2={cima(p.i) - 1} />
              <text className={p.clase} x={p.x0} y={RENGLON[p.fila]} textAnchor="start">{p.texto}</text>
            </g>
          ))}
          <text className="bmes-anio" x={0} y={ALTO - 6} textAnchor="start">{filas[0].anio}</text>
          <text className="bmes-anio" x={ancho} y={ALTO - 6} textAnchor="end">{filas[N - 1].anio}</text>
        </svg>
      ) : <div style={{ height: ALTO }} aria-hidden="true" />}
      <p className="sr-solo" aria-live="polite">{filaSel ? `${filaSel.anio}: ${filaSel.texto}` : ""}</p>
      <div className="sr-solo"><table>
        <caption>{etiqueta}</caption>
        <thead><tr><th scope="col">Año</th><th scope="col">Valor</th></tr></thead>
        <tbody>{filas.map((f, i) => <tr key={f.anio + i}><th scope="row">{f.anio}</th><td>{f.texto}{f.actual ? " (el último dato)" : f.ref ? " (año de referencia)" : ""}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
