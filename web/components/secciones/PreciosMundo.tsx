"use client";
// Bloque "Precios en el mundo" de Contexto (bloque 6c): cuánto cuesta cada rubro en la Argentina contra el mundo, en dólares.
import { FilaAjuste, HojaListo } from "./comunes";
import { useEffect, useMemo, useState } from "react";
import { usePreciosMundo } from "../usePreciosMundo";
import { Cargando, Selector, Seg } from "../ui";
import { Grafico, type OpcionesG, type SerieG } from "../Grafico";
import { PALETA } from "../util";
import { Capitulo } from "../sistema/Capitulo";
import { BarraVista } from "../sistema/BarraVista";
import { Hoja } from "../sistema/Hoja";
import { InfoPunto } from "../sistema/InfoPunto";
import { CompartirHoja } from "../sistema/CompartirHoja";
import { ListaBarras, type FilaBarra } from "../sistema/ListaBarras";
import { fmtMes, nf0, nf1, ok, r1 } from "@/lib/formato";
import {
  ARG, DOLARES, PAISES_DEF, aniosMedidos, argDesdeMotor, niveles, tablaRubros,
  type DatosPM, type Dolar, type ResumenRubro,
} from "@/lib/preciosMundo";
import { fraseRubroMundo, hrefBloque } from "@/lib/contexto";
import { lista, unoDe } from "@/lib/url";
import type { Motor } from "@/lib/motor";

type Setter = (c: Record<string, string | null | undefined>) => void;
const fecha = (r: ResumenRubro) => (r.modo === "estimado" ? `estimado ${fmtMes(r.fecha)}` : `medido ${r.fecha}`);
const TITULO = "Precios en el mundo";

export function PreciosMundo({ m, p, set }: { m: Motor; p: URLSearchParams; set: Setter }) {
  const { datos, error } = usePreciosMundo();
  useEffect(() => {   // el ancla #precios-mundo existe recién cuando llegan los datos: se vuelve a ir ahí una vez
    if (datos && window.location.hash === "#precios-mundo") document.getElementById("precios-mundo")?.scrollIntoView();
  }, [datos]);
  if (error) return <Capitulo id="precios-mundo" titulo={TITULO}><p className="error" role="alert">{error}</p></Capitulo>;
  if (!datos) return <Capitulo id="precios-mundo" titulo={TITULO}><div className="ctx-reserva"><Cargando /></div></Capitulo>;
  return <Cuerpo m={m} d={datos} p={p} set={set} />;
}

function Cuerpo({ m, d, p, set }: { m: Motor; d: DatosPM; p: URLSearchParams; set: Setter }) {
  const dolar = unoDe<Dolar>(p.get("pmd"), ["oficial", "blue"], "oficial");
  const arg = useMemo(() => argDesdeMotor(m, d), [m, d]);
  const tabla = useMemo(() => tablaRubros(d, arg, dolar), [d, arg, dolar]);
  // el gráfico de líneas siempre muestra un rubro: el elegido en la URL o, si no hay, el consumo total
  const ids = Object.keys(d.rubros);
  const rid = p.get("pmr") && d.rubros[p.get("pmr") as string] ? (p.get("pmr") as string) : d.rubros.total ? "total" : ids[0];
  const hayBlue = !!m.SER.fx_blue;
  const frase = useMemo(() => fraseRubroMundo(d, arg, "total", dolar), [d, arg, dolar]);
  return (
    <Capitulo id="precios-mundo" titulo={TITULO}
      acciones={<CompartirHoja href={hrefBloque(p, "precios-mundo")} titulo={TITULO} texto={frase ? `${frase} Fuente: ${d.fuente}.` : undefined} />}>
      {frase && <p className="ctx-respuesta">{frase}</p>}
      {dolar === "blue" && !hayBlue && <p className="note" role="status">Todavía no hay serie de dólar blue: se usa el oficial.</p>}
      <div id="pm-detalle">
        {rid && <Detalle d={d} rid={rid} dolar={dolar} arg={arg} p={p} set={set} />}
      </div>
      <Filas titulo="Por rubro" filas={tabla.divisiones} rid={rid} set={set} />
      <Filas titulo="Algunos productos" filas={tabla.productos} rid={rid} set={set} />
      <details className="ctx-mas">
        <summary>Cómo se mide</summary>
        <p className="note">«Medido» es lo que midió el Banco Mundial (Programa de Comparación Internacional, ICP: {aniosMedidos(d).join(", ")}). «Estimado» es nuestra cuenta mes a mes desde la última medición, con la inflación del rubro y el tipo de cambio de cada país. Lo estimado puede desviarse de la próxima medición.
          {" "}Con cepo o brecha alta, el nivel en dólares depende mucho del dólar elegido. No se comparan calidades ni impuestos por separado.</p>
        <p className="note">Fuente: {d.fuente}. La zona euro es el promedio simple de Alemania, Francia, Italia y España en lo medido, y el índice armonizado de la zona en lo estimado.</p>
      </details>
    </Capitulo>
  );
}

/** Lista de rubros contra el mundo (= 100): barras desde el centro, color neutro (más barato no es mejor ni peor). El número sale del nivel que se muestra. */
function Filas({ titulo, filas, rid, set }: { titulo: string; filas: ResumenRubro[]; rid: string | null; set: Setter }) {
  if (!filas.length) return null;
  const items: FilaBarra[] = filas.map((f) => {
    const nivel = Math.round(f.nivel), dif = Math.abs(100 - nivel);
    return {
      id: f.rid, nombre: f.n, valor: r1(f.nivel) - 100,
      texto: dif === 0 ? "igual que el mundo" : `${nf0.format(dif)} % más ${nivel < 100 ? "barato" : "caro"}`,
      sub: `nivel ${nf0.format(f.nivel)} · ${fecha(f)}`,
      onClick: () => { set({ pmr: f.rid === "total" ? null : f.rid }); document.getElementById("pm-detalle")?.scrollIntoView({ block: "start" }); },
    };
  });
  return (
    <>
      <h3>{titulo}</h3>
      <p className="note">Contra el promedio del mundo (= 100). Tocá una fila para ver su evolución.</p>
      <ListaBarras divergente etiqueta={`${titulo}, contra el promedio del mundo`} filas={items} resaltar={rid ?? undefined} />
    </>
  );
}

function Detalle({ d, rid, dolar, arg, p, set }: { d: DatosPM; rid: string; dolar: Dolar; arg: ReturnType<typeof argDesdeMotor>; p: URLSearchParams; set: Setter }) {
  const [hoja, setHoja] = useState(false);
  const r = d.rubros[rid];
  const disponibles = Object.keys(d.paises).filter((c) => c !== ARG);
  const habilitado = (c: string) => !d.sin_datos[c];
  const elegidos = (p.has("pmp") ? lista(p.get("pmp")) : PAISES_DEF).filter((c) => disponibles.includes(c) && habilitado(c));
  const alternar = (c: string) => set({ pmp: (elegidos.includes(c) ? elegidos.filter((x) => x !== c) : [...elegidos, c]).join(",") || "-" });
  const ents = [ARG, ...elegidos];
  const nv = useMemo(() => Object.fromEntries(ents.map((c) => [c, niveles(d, rid, c, arg, dolar)])), [d, rid, dolar, arg, ents.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const anios = aniosMedidos(d);
  const rows = d.fechas.map((f, i) => {
    const fila: Record<string, string | number | null> = { fecha: f, per: fmtMes(f), mundo: 100 };
    for (const c of ents) {
      fila[c] = nv[c].est[i];
      const a = anios.find((y) => f === `${y}-07`);                // el punto medido se marca a mitad del año
      fila[c + "_m"] = a != null && nv[c].med[a] != null ? nv[c].med[a] : null;
    }
    return fila;
  });
  const series: SerieG[] = [{ key: "mundo", name: "Mundo (= 100)", color: "--neutral" }];
  ents.forEach((c, k) => {
    const color = c === ARG ? "--series-1" : PALETA[(k % (PALETA.length - 1)) + 1];
    const n = d.paises[c];
    series.push({ key: c, name: `${n} (estimado)`, color, dash: true });
    if (rows.some((f) => ok(f[c + "_m"] as number | null))) series.push({ key: c + "_m", name: `${n} (medido)`, color, puntos: 11 });
  });
  const opts: OpcionesG = { height: 320, fmtAxis: (v) => nf0.format(v), fmtTip: (v) => nf1.format(v), tipTitle: (f) => String(f.per), refLine: 100, endLabels: false, maxGap: 2 };
  const sinEst = ents.filter((c) => !nv[c].estimable || nv[c].est.every((x) => !ok(x)));
  const hayGeneral = nv[ARG].mundoGeneral;
  const faltaBlue = Object.keys(nv[ARG].med).length < anios.length && dolar === "blue";
  const leyenda = series.filter((s) => s.key !== "mundo");
  const chips = [
    { clave: "rubro", texto: `Rubro: ${r.n}` },
    { clave: "dolar", texto: `Dólar ${dolar === "blue" ? "blue" : "oficial"}` },
    { clave: "paises", texto: elegidos.length === 1 ? "1 país" : `${elegidos.length} países` },
  ];
  return (
    <>
      <BarraVista items={chips} onAbrir={() => setHoja(true)} />
      <HojaListo titulo="Ajustes" abierta={hoja} onCerrar={() => setHoja(false)}>
        {(cerrar) => (
          <div className="ctx-hoja">
            <FilaAjuste rotulo="Rubro">
              <Selector etiqueta="Rubro" valor={rid} opciones={Object.keys(d.rubros).map((k) => [k, d.rubros[k].n] as [string, string])} onElegir={(v) => set({ pmr: v === "total" ? null : v })} />
            </FilaAjuste>
            <FilaAjuste rotulo="Dólar" ayuda="Para convertir los precios argentinos.">
              <Seg valor={dolar} opciones={DOLARES} onElegir={(v) => set({ pmd: v === "oficial" ? null : v })} />
            </FilaAjuste>
            <FilaAjuste rotulo="Países">
              <div className="seg" role="group" aria-label="Países para comparar">
                {disponibles.map((c) => (
                  <button key={c} type="button" aria-pressed={elegidos.includes(c)} disabled={!habilitado(c)} title={habilitado(c) ? undefined : `Sin datos por rubro: ${d.sin_datos[c]}`}
                    onClick={() => alternar(c)}>{d.paises[c]}{!habilitado(c) ? <small> (sin datos por rubro)</small> : null}</button>
                ))}
              </div>
            </FilaAjuste>
          </div>
        )}
      </HojaListo>
      <div className="ctx-titulo-graf">
        <h3>{r.n}: Argentina contra el mundo</h3>
        <InfoPunto etiqueta="Cómo leer este gráfico">
          <p>Los círculos son lo medido por el ICP; la línea punteada, lo estimado. Cuando llega una medición nueva la línea salta a ese valor: no se corrige el pasado.</p>
          {r.nota && <p><b>Sobre este rubro:</b> {r.nota}</p>}
          {hayGeneral && <p>EE.UU. no publica el IPC de este rubro en la base que usamos: el mundo se mueve con su IPC general.</p>}
          {faltaBlue && <p>Con el dólar blue faltan años medidos porque no hay cotización suficiente ese año.</p>}
        </InfoPunto>
      </div>
      <p className="note">Nivel de precios en dólares, mundo = 100. Círculos: medido; línea punteada: estimado.</p>
      <Grafico rows={rows} series={series} opts={opts} />
      <p className="note" style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
        {leyenda.map((s) => (
          <span key={s.key}><span aria-hidden style={s.puntos ? { display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: `var(${s.color})`, verticalAlign: "middle", marginRight: 5 } : { display: "inline-block", width: 18, borderTop: `3px ${s.dash ? "dashed" : "solid"} var(${s.color})`, verticalAlign: "middle", marginRight: 5 }} />{s.name}</span>
        ))}
      </p>
      {sinEst.length > 0 && <p className="note">Sin estimado para este rubro (solo se ven los valores medidos): {sinEst.map((c) => d.paises[c]).join(", ")}.</p>}
      <details className="ctx-mas">
      <summary>Valores medidos por el Banco Mundial</summary>
      <div className="tablewrap fija"><table>
        <thead><tr><th>País</th>{anios.map((y) => <th key={y}>{y}</th>)}</tr></thead>
        <tbody>{Object.keys(d.paises).map((c) => {
          const v = (y: number) => (c === ARG ? nv[ARG].med[y] : d.medido[y]?.[rid]?.[c]);
          return (
            <tr key={c} style={c === ARG ? { fontWeight: 600 } : elegidos.includes(c) ? undefined : { color: "var(--text-muted)" }}>
              <td>{d.paises[c]}{d.notas_pais[c] ? <small>{d.notas_pais[c]}</small> : null}</td>
              {anios.map((y) => <td key={y}>{ok(v(y)) ? nf0.format(v(y) as number) : "—"}</td>)}
            </tr>
          );
        })}</tbody>
      </table></div>
      <p className="note">Mundo = 100. Argentina se muestra con el dólar {dolar === "blue" ? "blue" : "oficial"}; los demás países, tal cual los publica el Banco Mundial.</p>
      </details>
    </>
  );
}
