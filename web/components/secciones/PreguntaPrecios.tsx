"use client";
// La pregunta que abre /contexto/: "¿Es más cara la carne en la Argentina que en la zona euro?", con la respuesta en una cifra,
// la Argentina contra cada país en barras centradas en "igual" y los kilos de asado (u otro producto) que compra un salario.
// Las cuentas salen de lib/preciosMundo.ts (las mismas que el detalle de abajo) y de lib/oraciones.ts (las mismas que "Preguntale" de la portada).
import { useMemo } from "react";
import Link from "next/link";
import { usePreciosMundo } from "../usePreciosMundo";
import { Cargando } from "../ui";
import { Delta } from "../sistema/Delta";
import { InfoPunto } from "../sistema/InfoPunto";
import { ListaBarras, type FilaBarra } from "../sistema/ListaBarras";
import { CompartirHoja } from "../sistema/CompartirHoja";
import { ListaHueco, RespuestaVista } from "./Oraciones";
import { fmtMes, nf0, nf1 } from "@/lib/formato";
import { unoDe } from "@/lib/url";
import type { Motor } from "@/lib/motor";
import type { Opcion, Respuesta } from "@/lib/oraciones";
import { hrefCompra, respuestaCompra } from "@/lib/oraciones";
import {
  PREG_CONTRA, PREG_RUBROS, argDesdeMotor, comparacionRubro, respuestaPregunta,
  type DatosPM, type Dolar, type FilaComparacion,
} from "@/lib/preciosMundo";

type Setter = (c: Record<string, string | null | undefined>) => void;
const RUBRO_DEF = "carne", CONTRA_DEF = "EA";

const txtDif = (dif: number) => (dif > 0 ? `+${nf0.format(dif)} %` : dif < 0 ? `−${nf0.format(-dif)} %` : "0 %");
const unidades = (t: string) => t.replace(/\bkg\b/, "kilos");

export function PreguntaPrecios({ m, p, set }: { m: Motor; p: URLSearchParams; set: Setter }) {
  const { datos, error } = usePreciosMundo();
  return (
    <section className="capitulo pq" id="pregunta" aria-label="La pregunta" aria-busy={!datos && !error}>
      {error ? <p className="error" role="alert">{error}</p>
        : !datos ? <div className="pq-espera"><Cargando /></div>
        : <Cuerpo m={m} d={datos} p={p} set={set} />}
    </section>
  );
}

function Cuerpo({ m, d, p, set }: { m: Motor; d: DatosPM; p: URLSearchParams; set: Setter }) {
  const arg = useMemo(() => argDesdeMotor(m, d), [m, d]);
  const dolar = unoDe<Dolar>(p.get("pmd"), ["oficial", "blue"], "oficial");
  const rubros = PREG_RUBROS.filter((r) => d.rubros[r.rid]);
  const rid = unoDe(p.get("pqr"), rubros.map((r) => r.rid), rubros.some((r) => r.rid === RUBRO_DEF) ? RUBRO_DEF : (rubros[0]?.rid ?? RUBRO_DEF));
  const rub = rubros.find((r) => r.rid === rid) ?? PREG_RUBROS[0];

  const { filas, soloMedido } = useMemo(() => comparacionRubro(d, arg, rid, dolar), [d, arg, rid, dolar]);
  const contras = PREG_CONTRA.filter((c) => filas.some((f) => f.ent === c.id) || soloMedido.some((f) => f.ent === c.id));
  const ids = contras.map((c) => c.id);
  const contra = unoDe(p.get("pqc"), ids, ids.includes(CONTRA_DEF) ? CONTRA_DEF : ids.includes("mundo") ? "mundo" : (ids[0] ?? CONTRA_DEF));
  const con = PREG_CONTRA.find((c) => c.id === contra) ?? PREG_CONTRA[0];
  const resp = useMemo(() => respuestaPregunta(d, arg, rid, contra, dolar), [d, arg, rid, contra, dolar]);
  const kilos = useMemo(() => (rub.producto && m.SER[rub.producto] && m.SER.sipa_med ? respuestaCompra(m, rub.producto, "sipa_med") : null), [m, rub]);

  const pregunta = `¿Es más ${rub.caro} ${rub.dicho} en la Argentina que en ${con.dicho}?`;
  const optRubros: Opcion[] = rubros.map((r) => [r.rid, r.dicho]);
  const optContras: Opcion[] = contras.map((c) => [c.id, c.dicho]);
  const elegirRubro = (v: string) => set({ pqr: v === RUBRO_DEF ? null : v });
  const elegirContra = (v: string) => set({ pqc: v === CONTRA_DEF ? null : v });

  const link = `/contexto/?${new URLSearchParams({ pqr: rid, pqc: contra, pmd: dolar }).toString()}#pregunta`;
  const fuente = `Fuente: ${d.fuente}.`;
  const texto = resp ? `${resp.frase} ${fuente}` : undefined;

  const barra = (f: FilaComparacion, fechaResp?: string): FilaBarra => {
    const otro = f.ent === "region" && f.entran ? `Región (${f.entran.map((c) => d.paises[c]).join(", ")})` : f.nombre;
    const fecha = f.fecha !== fechaResp ? ` · ${f.modo === "estimado" ? fmtMes(f.fecha) : `medido en ${f.fecha}`}` : "";
    return {
      id: f.ent, nombre: f.nombre, valor: f.dif, texto: txtDif(f.dif),
      sub: f.ent === "mundo" ? `Argentina ${nf1.format(f.nivelArg)} (mundo = 100)${fecha}` : `Argentina ${nf1.format(f.nivelArg)} · ${otro} ${nf1.format(f.nivelOtro)} (mundo = 100)${fecha}`,
      onClick: PREG_CONTRA.some((c) => c.id === f.ent) ? () => elegirContra(f.ent) : undefined,
    };
  };
  const anioMedido = soloMedido.length ? Math.max(...soloMedido.map((f) => +f.fecha)) : null;
  const verRubro = () => {
    set({ pmr: rid === "total" ? null : rid, pmd: dolar === "oficial" ? null : dolar });
    requestAnimationFrame(() => document.getElementById("precios-mundo")?.scrollIntoView());
  };

  const respuesta: Respuesta | null = resp ? { cifra: resp.cifra, detalle: [resp.que, resp.fechaTxt, resp.dolarTxt].join(" · ") } : null;
  return (
    <>
      <div className="capitulo-cab">
        <div className="capitulo-textos">
          <h2 className="capitulo-titulo pq-titulo" aria-label={pregunta}>
            ¿Es más {rub.caro}{" "}
            <ListaHueco etiqueta="Rubro" valor={rid} opciones={optRubros} onElegir={elegirRubro} /> en la Argentina que en{" "}
            <ListaHueco etiqueta="Comparar con" valor={contra} opciones={optContras} onElegir={elegirContra} />?
          </h2>
        </div>
        <div className="capitulo-acciones">
          <CompartirHoja href={link} titulo="la pregunta" texto={texto} />
        </div>
      </div>
      <div className="capitulo-cuerpo pq-cuerpo">
        <RespuestaVista r={respuesta} listo href={undefined} info={resp ? (
          <InfoPunto etiqueta="Cómo se calcula">
            <p>El nivel de precios compara cuánto cuesta lo mismo en cada país, en dólares, con el promedio del mundo (= 100). Lo mide el Banco Mundial (Programa de Comparación Internacional) en 2017 y 2021.</p>
            <p>Para llegar al mes de hoy se lleva ese valor con la inflación del rubro y el tipo de cambio de cada país: es una estimación, no un precio por kilo ni en euros.</p>
            <p>{d.notas_pais.EA ?? "La zona euro es el promedio simple de Alemania, Francia, Italia y España."}</p>
          </InfoPunto>
        ) : undefined} />
        {resp && (
          <>
            <p className="pq-sub-lista">Argentina contra cada uno (cero = igual)</p>
            <ListaBarras filas={filas.map((f) => barra(f, resp.fila.fecha))} divergente resaltar={contra} etiqueta="Argentina contra cada país: diferencia de nivel de precios" />
            {soloMedido.length > 0 && anioMedido != null && (
              <details className="pq-otros" open={resp.fila.modo === "medido" || undefined}>
                <summary>Otros países (solo medido en {anioMedido})</summary>
                <ListaBarras filas={soloMedido.map((f) => barra(f, String(anioMedido)))} divergente resaltar={contra} etiqueta={`Otros países, medido en ${anioMedido}`} />
              </details>
            )}
            {kilos && rub.cosa && /[a-z]/i.test(kilos.cifra) && (
              <p className="pq-kilos">
                Con un salario mediano se compran <b>{unidades(kilos.cifra)} {rub.cosa}</b>{kilos.fecha ? ` (${kilos.fecha})` : ""}
                {kilos.deltas?.[0] && <> <Delta {...kilos.deltas[0]} /></>}
                {rub.producto && <> <Link prefetch={false} href={hrefCompra(rub.producto, "sipa_med")} className="pq-link">Ver en el Histórico</Link></>}
              </p>
            )}
            <p className="pq-ver"><button type="button" className="pq-link" onClick={verRubro}>Ver la evolución de este rubro</button></p>
          </>
        )}
      </div>
    </>
  );
}
