"use client";
// "¿Cómo cambió en el tiempo?" de /gasto/ (remodelación 3.5, G5): barras apiladas por año, una capa por finalidad, en pesos de hoy.
// SVG propio. Los archivos de los años cerrados se bajan recién cuando el capítulo está por entrar en pantalla.
import { useEffect, useMemo, useState } from "react";
import { useGastoAnios } from "./useGasto";
import { useAparecer } from "./sistema/useAparecer";
import { Cargando } from "./ui";
import { nfDec, unidadMontoDe, fmtMillones } from "@/lib/formato";
import { evolucionFinalidades, type ArchivoAnio, type Deflactor, type IndiceGasto } from "@/lib/gasto";

const W = 328, H = 220, ML = 34, MR = 4, MT = 8, MB = 22;

export function EvolucionFinalidades({ ix, deflactor, onElegir }: { ix: IndiceGasto; deflactor: Deflactor; onElegir: (finalidad: string) => void }) {
  const [ref, estado] = useAparecer<HTMLDivElement>();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const pedir = montado && estado !== "espera";   // "espera": todavía fuera de pantalla; no se baja nada
  const { listos, cargando } = useGastoAnios(ix, pedir ? ix.anios.filter((a) => !a.en_curso).map((a) => a.archivo) : []);
  const porAnio = useMemo(() => new Map([...listos.values()].map((a: ArchivoAnio) => [a.anio, a])), [listos]);
  const ev = useMemo(() => (pedir ? evolucionFinalidades(ix, porAnio, deflactor) : null), [pedir, ix, porAnio, deflactor]);

  return (
    <div ref={ref} className="gas-evo">
      {!ev || (cargando && ev.anios.length < 2)
        ? <div className="gas-reserva"><Cargando texto="Cargando los años…" /></div>
        : ev.anios.length < 2 ? <p className="note">No hay años suficientes para comparar.</p> : <Grafico ev={ev} onElegir={onElegir} cargando={cargando} />}
    </div>
  );
}

function Grafico({ ev, onElegir, cargando }: { ev: NonNullable<ReturnType<typeof evolucionFinalidades>>; onElegir: (f: string) => void; cargando: boolean }) {
  const n = ev.anios.length;
  const tope = Math.max(...ev.anios.map((_, i) => ev.capas.reduce((s, c) => s + c.v[i], 0)));
  const un = unidadMontoDe(tope), mY = (x: number) => MT + (H - MT - MB) * (1 - x / tope);
  const banda = (W - ML - MR) / n, ancho = banda * 0.78;
  const paso = Math.max(1, Math.ceil(n / Math.floor((W - ML - MR) / 34)));
  const ticks = [0, tope / 2, tope];
  const fmtT = (x: number) => nfDec(un.dec).format(x / un.div);
  const cabe = (x: number) => fmtMillones(x, un);
  return (
    <>
      <p className="note gas-evo-nota">Gasto de cada año, en {un.nombre} de pesos de {ev.ref}{ev.larga ? ", desde 2004 con la serie por finalidad del Ministerio de Economía" : ""}. Tocá una finalidad para ver su detalle.{cargando ? " Cargando más años…" : ""}</p>
      <svg className="gas-evo-svg" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Gasto por finalidad de ${ev.anios[0]} a ${ev.anios[n - 1]}, en pesos de ${ev.ref}. El detalle está en la tabla de abajo.`}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="gas-evo-grilla" x1={ML} x2={W - MR} y1={mY(t)} y2={mY(t)} />
            <text className="gas-evo-eje" x={ML - 4} y={mY(t) + 4} textAnchor="end">{fmtT(t)}</text>
          </g>
        ))}
        {ev.anios.map((a, i) => {
          let acum = 0;
          const x = ML + banda * i + (banda - ancho) / 2;
          return (
            <g key={a}>
              {ev.capas.map((c, k) => {
                const y1 = mY(acum + c.v[i]), y0 = mY(acum);
                acum += c.v[i];
                return (
                  <rect key={c.n} className={`gas-capa gas-capa-${Math.min(k + 1, 5)}`} x={x} y={y1} width={ancho} height={Math.max(0, y0 - y1)} onClick={() => onElegir(c.n)}>
                    <title>{`${c.n}, ${a}: ${cabe(c.v[i])}`}</title>
                  </rect>
                );
              })}
              {i % paso === 0 && <text className="gas-evo-eje" x={x + ancho / 2} y={H - 6} textAnchor="middle">{a}</text>}
            </g>
          );
        })}
      </svg>
      <ul className="gas-leyenda">
        {[...ev.capas].map((c, k) => (
          <li key={c.n}><button type="button" onClick={() => onElegir(c.n)}><i className={`gas-capa-sw gas-capa-${Math.min(k + 1, 5)}`} aria-hidden="true" /><span>{c.n}</span></button></li>
        ))}
      </ul>
      <details className="gas-tabla-anios">
        <summary>Ver año por año</summary>
        <div className="tablewrap fija">
          <table>
            <thead><tr><th scope="col">Año</th>{ev.capas.map((c) => <th key={c.n} scope="col">{c.n}</th>)}<th scope="col">Total</th></tr></thead>
            <tbody>
              {[...ev.anios].map((a, i) => i).reverse().map((i) => (
                <tr key={ev.anios[i]}><th scope="row">{ev.anios[i]}</th>{ev.capas.map((c) => <td key={c.n}>{cabe(c.v[i])}</td>)}<td>{cabe(ev.total[i])}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">Montos redondeados: la suma de las finalidades puede diferir del total en una unidad.</p>
      </details>
    </>
  );
}
