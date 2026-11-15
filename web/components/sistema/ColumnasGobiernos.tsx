"use client";
// Columnas verticales, una por gobierno y en orden cronológico (R26): el valor arriba de cada columna, el más alto y el más bajo
// marcados con palabras (rótulo unido a su columna con una línea de puntos; nunca solo color). SVG propio, medido al ancho del contenedor,
// como BarrasMes: a 360 px los nombres van rotados y nada se sale. Tocar una columna elige ese gobierno (otra vez, lo suelta);
// con teclado, el gráfico es enfocable: flechas para recorrer, Enter o espacio para elegir. Para lectores de pantalla, una tabla oculta.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export type ColGob = {
  id: string;
  nombre: string;          // nombre completo (tabla oculta y lector de pantalla)
  corto: string;           // nombre que va en el eje (nombreCorto)
  valor: number | null;    // null = sin dato: columna vacía con «s/d»
  txt: string;             // valor corto, el que se escribe arriba de la columna
  texto: string;           // valor completo (tabla oculta)
};

const ALTO = 286, ARRIBA = 64, ABAJO = 62, IZQ = 38, DER = 6;   // franja de rótulos arriba (dos renglones); nombres debajo del eje
const RENGLON = [13, 31];   // línea base del texto de cada renglón de la franja
const PX_CAR = 7.2, PAD = 8;
const ANCHO_HORIZ = 72;     // desde esta banda, los nombres van horizontales; por debajo, rotados

type Rotulo = { i: number; texto: string; peso: number };
type Puesto = Rotulo & { x0: number; w: number; xb: number; fila: number };

/** Escala "linda" para el techo del eje: 1, 2, 2,5, 5 o 10 por una potencia de diez. */
function techo(m: number): number {
  if (!(m > 0)) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(m))), f = m / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
}

export function ColumnasGobiernos({ filas, etiqueta, max, dec = 0, sel, onElegir, fmtEje, linea, rotAlto, rotBajo }: {
  filas: ColGob[]; etiqueta: string;
  max?: number;                       // techo del eje; sin él, se calcula de los datos
  dec?: number;                       // decimales con los que se muestra el valor (para comparar como se ve)
  sel: string | null; onElegir: (id: string) => void;
  fmtEje: (v: number) => string;
  linea?: { v: number; txt: string };
  rotAlto: string; rotBajo: string;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [kb, setKb] = useState<number | null>(null);

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
  const f10 = Math.pow(10, dec);
  const red = (v: number) => Math.round(v * f10) / f10;
  const conDato = filas.map((f, i) => ({ f, i })).filter((x) => x.f.valor != null);
  const techoY = max ?? techo(Math.max(0, ...conDato.map((x) => x.f.valor as number)));
  const area = ALTO - ARRIBA - ABAJO, plano = Math.max(0, ancho - IZQ - DER);
  const y = (v: number) => ARRIBA + (1 - Math.min(v, techoY) / techoY) * area;
  const banda = N ? plano / N : 0;
  const bw = Math.max(2, banda * 0.66);
  const xDe = (i: number) => IZQ + i * banda + banda / 2;

  // El más alto y el más bajo, comparando los valores redondeados como se muestran; con empate se marcan todos. Con un solo dato o todos iguales, ninguno.
  let marcas: Rotulo[] = [];
  if (conDato.length >= 2) {
    const rs = conDato.map((x) => red(x.f.valor as number));
    const hi = Math.max(...rs), lo = Math.min(...rs);
    if (hi !== lo) {
      conDato.forEach((x, k) => {
        if (rs[k] === hi) marcas.push({ i: x.i, texto: rotAlto, peso: 2 });
        else if (rs[k] === lo) marcas.push({ i: x.i, texto: rotBajo, peso: 1 });
      });
    }
  }
  // Colocación (como BarrasMes): primer renglón, si choca el segundo (la línea del de arriba tampoco cruza el texto del de abajo), si no, de costado.
  const puestos: Puesto[] = [];
  [...marcas].sort((p, q) => q.peso - p.peso).forEach((r) => {
    const w = r.texto.length * PX_CAR + 4, xb = xDe(r.i);
    const x0 = Math.max(0, Math.min(xb - w / 2, ancho - w));
    const cruza = (alta: Puesto, baja: Puesto) => alta.xb > baja.x0 - 3 && alta.xb < baja.x0 + baja.w + 3;
    const choca = (c: Puesto) => puestos.some((p) => (p.fila === c.fila ? c.x0 < p.x0 + p.w + PAD && p.x0 < c.x0 + c.w + PAD : p.fila < c.fila ? cruza(p, c) : cruza(c, p)));
    let c: Puesto = { ...r, x0, w, xb, fila: 0 };
    if (choca(c)) c = { ...c, fila: 1 };
    if (choca(c)) {
      const fin = Math.max(...puestos.filter((p) => p.fila === 1).map((p) => p.x0 + p.w + PAD), 0);
      c = { ...c, x0: Math.min(Math.max(c.x0, fin), Math.max(0, ancho - w)) };
    }
    puestos.push(c);
  });
  const marcaDe = (i: number) => marcas.find((m) => m.i === i)?.texto;

  const tecla = (ev: KeyboardEvent<SVGSVGElement>) => {
    const k = ev.key;
    if (!["ArrowLeft", "ArrowRight", "Home", "End", "Escape", "Enter", " "].includes(k)) return;
    ev.preventDefault();
    if (k === "Escape") { setKb(null); return; }
    if (k === "Enter" || k === " ") { if (kb != null) onElegir(filas[kb].id); return; }
    setKb((s) => {
      const desde = s ?? (sel ? Math.max(0, filas.findIndex((f) => f.id === sel)) : 0);
      if (k === "Home") return 0;
      if (k === "End") return N - 1;
      if (s == null) return desde;
      return Math.max(0, Math.min(N - 1, desde + (k === "ArrowLeft" ? -1 : 1)));
    });
  };

  const horizontal = banda >= ANCHO_HORIZ;
  const dosRenglones = (t: string): string[] => {
    const k = t.lastIndexOf(" ");
    return k > 0 ? [t.slice(0, k), t.slice(k + 1)] : [t];
  };
  const yEje = ARRIBA + area;
  const kbF = kb != null ? filas[kb] : null;

  return (
    <div className="cgc" ref={caja}>
      {ancho > 0 && N > 0 ? (
        <svg className="cgc-svg" width={ancho} height={ALTO} viewBox={`0 0 ${ancho} ${ALTO}`} role="img" aria-label={etiqueta} tabIndex={0}
          onKeyDown={tecla} onBlur={() => setKb(null)}>
          {[0, techoY / 2, techoY].map((v) => (
            <g key={v}>
              <line className="cgc-grilla" x1={IZQ} x2={ancho - DER} y1={y(v)} y2={y(v)} />
              <text className="cgc-eje" x={IZQ - 5} y={y(v) + 4} textAnchor="end">{fmtEje(v)}</text>
            </g>
          ))}
          {linea && linea.v <= techoY && (
            <g>
              <line className="cgc-mayoria" x1={IZQ} x2={ancho - DER} y1={y(linea.v)} y2={y(linea.v)} />
              {/* a la izquierda: las primeras columnas son las de menos dato o sin dato, y así el rótulo no tapa los valores de los últimos gobiernos */}
              <text className="cgc-mayoria-txt" x={IZQ + 4} y={y(linea.v) - 4} textAnchor="start">{linea.txt}</text>
            </g>
          )}
          {filas.map((f, i) => {
            const x = xDe(i), esSel = f.id === sel, m = marcaDe(i);
            return (
              <g key={f.id}>
                {kb === i && <rect className="cgc-kb" x={IZQ + i * banda} y={ARRIBA - 22} width={banda} height={area + 22} />}
                {f.valor != null ? (
                  <>
                    <rect className={`cgc-col${esSel ? " cgc-sel" : ""}${m ? " cgc-marca" : ""}`} x={x - bw / 2} y={y(f.valor)} width={bw} height={Math.max(1, yEje - y(f.valor))} />
                    <text className={`cgc-valor${esSel ? " cgc-valor-sel" : ""}`} x={x} y={y(f.valor) - 5} textAnchor="middle">{f.txt}</text>
                  </>
                ) : <text className="cgc-sd" x={x} y={yEje - 6} textAnchor="middle">s/d</text>}
                {horizontal ? (
                  <text className={`cgc-nombre${esSel ? " cgc-nombre-sel" : ""}`} textAnchor="middle">
                    {dosRenglones(f.corto).map((t, k) => <tspan key={k} x={x} y={yEje + 16 + k * 14}>{t}</tspan>)}
                  </text>
                ) : (
                  <text className={`cgc-nombre${esSel ? " cgc-nombre-sel" : ""}`} x={x + 4} y={yEje + 12} textAnchor="end" transform={`rotate(-45 ${x + 4} ${yEje + 12})`}>{f.corto}</text>
                )}
                <rect className="cgc-hit" x={IZQ + i * banda} y={0} width={banda} height={ALTO} onClick={() => onElegir(f.id)} />
              </g>
            );
          })}
          <line className="cgc-base" x1={IZQ} x2={ancho - DER} y1={yEje} y2={yEje} />
          {puestos.map((p) => {
            const v = filas[p.i].valor as number;
            return (
              <g key={p.i}>
                <line className="cgc-guia" x1={p.xb} x2={p.xb} y1={RENGLON[p.fila] + 4} y2={y(v) - 19} />
                <text className="cgc-rotulo" x={p.x0} y={RENGLON[p.fila]} textAnchor="start">{p.texto}</text>
              </g>
            );
          })}
        </svg>
      ) : <div style={{ height: ALTO }} aria-hidden="true" />}
      <p className="sr-solo" aria-live="polite">{kbF ? `${kbF.nombre}: ${kbF.valor != null ? kbF.texto : "sin dato"}${marcaDe(kb as number) ? ` (${marcaDe(kb as number)})` : ""}` : ""}</p>
      <div className="sr-solo"><table>
        <caption>{etiqueta}</caption>
        <thead><tr><th scope="col">Gobierno</th><th scope="col">Valor</th></tr></thead>
        <tbody>{filas.map((f, i) => <tr key={f.id}><th scope="row">{f.nombre}</th><td>{f.valor != null ? f.texto : "sin dato"}{marcaDe(i) ? ` (${marcaDe(i)})` : ""}{f.id === sel ? " (elegido)" : ""}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
