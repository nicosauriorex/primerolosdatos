"use client";
// Capítulo único "Precios contra el mundo" de Contexto: tres gráficos de barras enlazados (Por país, Por rubro, Por presidente), "¿Cómo viene?" con sus propios filtros
// y plegados con lo medido. Un solo estado de rubro (`pqr`) y de "contra" (`pqc`); las cuentas salen de lib/preciosMundo.ts (frase, barras e imagen usan las mismas).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePreciosMundo } from "../usePreciosMundo";
import { Cargando, Seg } from "../ui";
import { Grafico, type OpcionesG, type SerieG } from "../Grafico";
import { PALETA } from "../util";
import { Capitulo } from "../sistema/Capitulo";
import { FilaChips } from "../sistema/FilaChips";
import { GraficoBarrasH, type BarraH } from "../sistema/GraficoBarrasH";
import { Hoja } from "../sistema/Hoja";
import { InfoPunto } from "../sistema/InfoPunto";
import { BotonCompartir } from "../PanelCompartir";
import { IconoAbajo, IconoAjustes, IconoCompartir } from "../Iconos";
import { FilaAjuste, HojaListo } from "./comunes";
import { Pildoras } from "./Ranking";
import { fmtMes, nf0, nf1, norm, ok } from "@/lib/formato";
import {
  ARG, DICHO_PAIS, DOLARES, PAISES_DEF, aniosMedidos, argDesdeMotor, compararPorPresidente, compararPorRubro, presidentesSinDato, fraseSinPresidentes, compararPrecios, frasePrecios, niveles,
  opcionesPeriodo, periodoDe, referencias,
  type ArgPM, type DatosPM, type Dolar, type FilaPrecio, type Niveles,
} from "@/lib/preciosMundo";
import type { VistaCtx } from "@/lib/imagen-contexto";
import { lista, unoDe } from "@/lib/url";
import type { Motor } from "@/lib/motor";
import type { Pres } from "@/lib/estadisticas";

type Setter = (c: Record<string, string | null | undefined>) => void;
const TITULO = "Precios contra el mundo";
const RUBRO_DEF = "total", CONTRA_DEF = "mundo";   // sin filtro: el consumo total (todos los rubros) contra el mundo (pedido 2026-11-15; antes, carne contra la zona euro)
// Los links viejos con uno solo de los dos (rubro o "contra") completan el otro con el valor de antes, para seguir mostrando lo mismo.
const RUBRO_VIEJO = "carne", CONTRA_VIEJO = "EA";
const GRUPOS_PERIODO: Record<string, string> = { Hoy: "Hoy", "Un año": "Un año", Presidente: "Promedio de un presidente" };
const VISTAS: [string, string][] = [["rubro", "Por rubro"], ["pais", "Por país"], ["pres", "Por presidente"]];
const ESCALA_MAS = "más caro →";

const txtDif = (dif: number) => (dif > 0 ? `+${nf0.format(dif)} %` : dif < 0 ? `−${nf0.format(-dif)} %` : "0 %");
const notaDif = (dif: number) => (dif < 0 ? "más barato" : dif > 0 ? "más caro" : "igual");
const mayorAMenor = (a: FilaPrecio, b: FilaPrecio) => b.dif - a.dif || a.nombre.localeCompare(b.nombre, "es");
/** La fecha que más se repite en una lista de filas (la que ya dice la frase): solo las filas con otra fecha la repiten. */
function fechaComun(filas: FilaPrecio[]): string | null {
  const n = new Map<string, number>();
  filas.forEach((f) => n.set(f.fecha, (n.get(f.fecha) ?? 0) + 1));
  let mejor: string | null = null, max = 0;
  n.forEach((v, k) => { if (v > max) { max = v; mejor = k; } });
  return mejor;
}
/** Una barra del gráfico: verde si el país de referencia es más barato que el de la fila, rojo si es más caro; siempre con la palabra. `sub` solo si la fecha no es la común. */
const barraDe = (f: FilaPrecio, comunDe: string | null): BarraH => ({
  id: f.ent, nombre: f.nombre, valor: f.dif, texto: txtDif(f.dif), nota: notaDif(f.dif),
  tono: f.dif < 0 ? "bueno" : f.dif > 0 ? "malo" : null,
  sub: comunDe != null && f.fecha !== comunDe ? f.fecha : undefined,
});

/** Todo lo que se deduce de la URL y los datos: rubro, dólar, país de referencia, período, filas y frase. Lo usan el capítulo y Contexto. */
export function estadoPrecios(d: DatosPM, m: Motor, p: URLSearchParams, PRES: Pres[]) {
  const dolar = unoDe<Dolar>(p.get("pmd"), ["oficial", "blue"], "oficial");
  const arg = argDesdeMotor(m, d);
  const ids = Object.keys(d.rubros);
  // pmr: los links viejos del gráfico; un link viejo del gráfico sin rubro (con pmp) mostraba el consumo total y lo sigue mostrando
  const conRubro = p.has("pqr") || p.has("pmr"), conContra = p.has("pqc");
  const defRubro = !conRubro && p.has("pmp") && d.rubros.total ? "total"
    : !conRubro && conContra && d.rubros[RUBRO_VIEJO] ? RUBRO_VIEJO : d.rubros[RUBRO_DEF] ? RUBRO_DEF : ids[0];
  const rid = unoDe(p.has("pqr") ? p.get("pqr") : p.get("pmr"), ids, defRubro);
  const refs = referencias(d, arg, rid, dolar);
  const ref = unoDe(p.get("pqd"), refs, ARG);
  const opciones = opcionesPeriodo(d, PRES, m.F);
  const pqa = unoDe<string>(p.get("pqa") ?? "", opciones.map((o) => o.id), "");
  const periodo = periodoDe(pqa || null, d, PRES, m.F);
  const cmp = compararPrecios(d, arg, rid, ref, periodo, dolar);
  const ents = [...cmp.filas, ...cmp.soloMedido].map((f) => f.ent);
  const preferido = conRubro && !conContra ? CONTRA_VIEJO : CONTRA_DEF;
  const contraDef = ents.includes(preferido) ? preferido : ents.includes(CONTRA_DEF) ? CONTRA_DEF : (ents[0] ?? CONTRA_DEF);
  const contra = unoDe(p.get("pqc"), ents, contraDef);
  const fila = cmp.filas.find((f) => f.ent === contra) ?? cmp.soloMedido.find((f) => f.ent === contra) ?? null;
  const frase = fila ? frasePrecios(d, rid, ref, fila, cmp.fechaTxt, dolar) : null;
  return { dolar, arg, rid, refs, ref, opciones, pqa, periodo, cmp, ents, contra, contraDef, fila, frase };
}

export function PreciosMundo({ m, PRES, p, set }: { m: Motor; PRES: Pres[]; p: URLSearchParams; set: Setter }) {
  const { datos, error } = usePreciosMundo();
  if (error) return <Capitulo id="precios-mundo" titulo={TITULO}><span id="pregunta" /><p className="error" role="alert">{error}</p></Capitulo>;
  if (!datos) return <Capitulo id="precios-mundo" titulo={TITULO}><span id="pregunta" /><div className="ctx-reserva"><Cargando /></div></Capitulo>;
  return <Cuerpo m={m} d={datos} PRES={PRES} p={p} set={set} />;
}

type Abierta = "rubro" | "contra" | "periodo" | "ref" | "ajustes" | null;

function Cuerpo({ m, d, PRES, p, set }: { m: Motor; d: DatosPM; PRES: Pres[]; p: URLSearchParams; set: Setter }) {
  const [abierta, setAbierta] = useState<Abierta>(null);
  const e = useMemo(() => estadoPrecios(d, m, p, PRES), [d, m, p, PRES]);
  const { dolar, arg, rid, ref, periodo, cmp, contra, fila, frase } = e;
  const hayBlue = !!m.SER.fx_blue;
  const rubro = d.rubros[rid];
  const nombreRef = d.paises[ref] ?? ref;
  const vista = unoDe(p.get("pqv"), VISTAS.map((v) => v[0]), "pais");
  const dichoRef = DICHO_PAIS(d, ref), dichoContra = DICHO_PAIS(d, contra);
  const escala: [string, string] = [`← más barato en ${dichoRef}`, ESCALA_MAS];

  // Cambiar el rubro, el "contra" o el "desde" de arriba hace que "¿Cómo viene?" vuelva a seguirlos (se borran sus filtros propios).
  const seguir = { pvr: null, pmp: null };
  // Rubro y "contra" se escriben juntos (o ninguno, si son los de por defecto): así ninguno depende del valor por defecto del otro.
  const fijar = (r: string, c: string) => (r === RUBRO_DEF && c === CONTRA_DEF ? set({ pqr: null, pmr: null, pqc: null, ...seguir }) : set({ pqr: r, pmr: null, pqc: c, ...seguir }));
  const elegirRubro = (v: string) => fijar(v, contra);
  const elegirContra = (v: string) => fijar(rid, v);
  // En las barras, tocar la ya elegida saca el filtro (vuelve al valor por defecto); en las hojas, elegir la actual no cambia nada.
  const alternarContra = (v: string) => fijar(rid, v === contra ? CONTRA_DEF : v);
  const alternarRubro = (v: string) => fijar(v === rid ? RUBRO_DEF : v, contra);
  const elegirRef = (v: string) => set({ pqd: v === ARG ? null : v, ...seguir });
  const elegirPeriodo = (v: string) => set({ pqa: v === "" ? null : v });
  const opSel = e.opciones.find((o) => o.id === e.pqa);

  // ---- Por país
  const filasOrd = useMemo(() => [...cmp.filas].sort(mayorAMenor), [cmp]);
  const medidoOrd = useMemo(() => [...cmp.soloMedido].sort(mayorAMenor), [cmp]);
  const comun = fechaComun(cmp.filas);
  const barrasPais = filasOrd.map((f) => barraDe(f, comun));
  const barrasMedido = medidoOrd.map((f) => ({ ...barraDe(f, null), sub: `solo medido en ${(f.fecha.match(/\d{4}/) ?? [f.fecha])[0]}` }));
  const resaltadas = ref !== ARG ? [contra, ARG] : [contra];

  // ---- Por rubro y Por presidente
  const porRubro = useMemo(() => compararPorRubro(d, arg, ref, contra, periodo, dolar), [d, arg, ref, contra, periodo, dolar]);
  const rubrosOrd = useMemo(() => [...porRubro.filas].sort(mayorAMenor), [porRubro]);
  const comunRubro = fechaComun(porRubro.filas);
  const barrasRubro = rubrosOrd.map((f) => barraDe(f, comunRubro));
  const porPres = useMemo(() => compararPorPresidente(d, arg, rid, ref, contra, PRES, m.F, dolar), [d, arg, rid, ref, contra, PRES, m.F, dolar]);
  const presSin = useMemo(() => presidentesSinDato(d, PRES, m.F, porPres), [d, PRES, m.F, porPres]);
  const avisoPres = fraseSinPresidentes(presSin, rubro.n, dichoContra);
  const barrasPres = porPres.map((f) => ({ ...barraDe(f, null), sub: f.fecha, nota2: f.cierre ? `al cierre ${txtDif(f.cierre.dif)}` : undefined }));

  // ---- opciones de "Contra": el mundo primero, después la región y los países con dato
  const opcionesContra = useMemo(() => {
    const nombres = new Map<string, string>();
    [...cmp.filas, ...cmp.soloMedido].forEach((f) => nombres.set(f.ent, f.ent === "mundo" ? "El mundo" : f.nombre));
    const orden = ["mundo", "region"].filter((k) => nombres.has(k));
    const resto = [...nombres.keys()].filter((k) => !orden.includes(k));
    return [...orden, ...resto].map((k) => ({ id: k, n: nombres.get(k) as string }));
  }, [cmp]);

  const hrefCap = () => `${window.location.pathname}${window.location.search}#precios-mundo`;
  const vistaPais = (): VistaCtx | null => (frase && fila ? {
    tipo: "ctx-precios", titulo: `${rubro.n}: precios contra el mundo`, frase, filas: filasOrd, soloMedido: medidoOrd, refNombre: nombreRef, dolar, fuente: d.fuente, enc: "País",
  } : null);
  const vistaRubro = (): VistaCtx | null => (rubrosOrd.length ? {
    tipo: "ctx-precios", titulo: "Precios contra el mundo: por rubro", frase: `Precios de ${dichoRef} contra ${dichoContra}, rubro por rubro${porRubro.fechaTxt ? ` (${porRubro.fechaTxt})` : ""}.`,
    filas: rubrosOrd, soloMedido: [], refNombre: nombreRef, dolar, fuente: d.fuente, enc: "Rubro", contraDicho: dichoContra,
  } : null);
  const vistaPres = (): VistaCtx | null => (porPres.length ? {
    tipo: "ctx-precios", titulo: `${rubro.n}: precios por presidente`, frase: `${rubro.n}: precios de ${dichoRef} contra ${dichoContra}, promedio de cada presidencia.${avisoPres ? ` ${avisoPres}` : ""}`,
    filas: porPres.map((f) => (f.cierre ? { ...f, fecha: `${f.fecha} · al cierre (${f.cierre.fecha}): ${txtDif(f.cierre.dif)}` } : f)), soloMedido: [], refNombre: nombreRef, dolar, fuente: d.fuente, enc: "Presidente", orden: "fijo", contraDicho: dichoContra,
  } : null);
  const compartir = (cual: string, crear: () => VistaCtx | null) => (
    <BotonCompartir className="solo-icono" titulo={`Primero los Datos: precios contra el mundo, ${cual}`} href={hrefCap} crearVista={crear} aria-label={`Compartir el gráfico ${cual}`} title="Compartir este gráfico">
      <IconoCompartir />
    </BotonCompartir>
  );
  const sinDatos = <p className="note" role="status">No hay datos de {rubro.n.toLowerCase()} en este período con el dólar elegido. Probá con otro período o rubro.</p>;

  return (
    <Capitulo id="precios-mundo" titulo={TITULO}>
      <span id="pregunta" />
      {frase && <p className="ctx-respuesta">{frase}</p>}
      <div className="ctxr-fila">
        <Pildora rotulo="Comparar desde" valor={nombreRef} onClick={() => setAbierta("ref")} />
        <Pildora rotulo="Período" valor={opSel?.n ?? "Hoy"} onClick={() => setAbierta("periodo")} />
        <button type="button" className="ctxr-ajustes" aria-haspopup="dialog" onClick={() => setAbierta("ajustes")}><IconoAjustes />Ajustes</button>
        <InfoPunto etiqueta="Cómo se calcula">
          <p>El nivel de precios compara cuánto cuesta lo mismo en cada país, en dólares, con el promedio del mundo (= 100). Lo mide el Banco Mundial (Programa de Comparación Internacional) en {aniosMedidos(d).join(" y ")}.</p>
          <p>Para llegar a cada mes se lleva ese valor con la inflación del rubro y el tipo de cambio de cada país: es una estimación, no un precio por kilo ni en euros.</p>
          <p>El período cambia «Por país» y «Por rubro». «Por presidente» siempre promedia cada mandato.</p>
          <p>{d.notas_pais.EA ?? "La zona euro es el promedio simple de Alemania, Francia, Italia y España."}</p>
        </InfoPunto>
      </div>
      {e.pqa !== "" && <p className="note">El período no cambia «Por presidente», que ya promedia cada mandato.</p>}
      {dolar === "blue" && !hayBlue && <p className="note" role="status">Todavía no hay serie de dólar blue: se usa el oficial.</p>}

      <HojaElegir titulo="Elegir rubro" abierta={abierta === "rubro"} onCerrar={() => setAbierta(null)} buscador
        grupos={[{ items: Object.keys(d.rubros).map((k) => ({ id: k, n: d.rubros[k].n })) }]} valor={rid} onElegir={elegirRubro} />
      <HojaElegir titulo="Elegir contra quién" abierta={abierta === "contra"} onCerrar={() => setAbierta(null)}
        grupos={[{ items: opcionesContra }]} valor={contra} onElegir={elegirContra} />
      <HojaElegir titulo="Elegir período" abierta={abierta === "periodo"} onCerrar={() => setAbierta(null)}
        grupos={(["Hoy", "Un año", "Presidente"] as const).map((g) => ({ titulo: g === "Hoy" ? undefined : GRUPOS_PERIODO[g], items: e.opciones.filter((o) => o.grupo === g).map((o) => ({ id: o.id, n: o.n, nota: o.nota })) })).filter((g) => g.items.length)}
        valor={e.pqa} onElegir={elegirPeriodo} />
      <HojaElegir titulo="Comparar desde" abierta={abierta === "ref"} onCerrar={() => setAbierta(null)}
        grupos={[{ items: e.refs.map((c) => ({ id: c, n: d.paises[c] ?? c })) }]} valor={ref} onElegir={elegirRef} />
      <HojaListo titulo="Ajustes" abierta={abierta === "ajustes"} onCerrar={() => setAbierta(null)}>
        {() => (
          <div className="ctx-hoja">
            <FilaAjuste rotulo="Dólar" ayuda="Para convertir los precios argentinos.">
              <Seg valor={dolar} opciones={DOLARES} onElegir={(v) => set({ pmd: v === "oficial" ? null : v })} />
            </FilaAjuste>
          </div>
        )}
      </HojaListo>

      <div className="pmc-chips">
        <FilaChips opciones={VISTAS} valor={vista} etiqueta="Vista de los gráficos de precios" onElegir={(v) => set({ pqv: v === "pais" ? null : v })} />
      </div>
      <div className="pmc-tres">
        <Columna activa={vista === "rubro"} titulo="Por rubro" acciones={compartir("por rubro", vistaRubro)}
          pildoras={<Pildora rotulo="Contra" valor={opcionesContra.find((o) => o.id === contra)?.n ?? dichoContra} onClick={() => setAbierta("contra")} />}>
          {!barrasRubro.length ? <p className="note" role="status">No hay rubros con datos contra {dichoContra} en este período.</p> : (
            <Deslizable clave={`${rid}|${barrasRubro.length}`} centro={rid}><GraficoBarrasH filas={barrasRubro} etiqueta={`Por rubro: ${nombreRef} contra ${dichoContra}, diferencia de nivel de precios`} elegida={rid}
              onElegir={alternarRubro} fmtEje={fmtEje} escala={escala} /></Deslizable>
          )}
        </Columna>
        <Columna activa={vista === "pais"} titulo="Por país" acciones={compartir("por país", vistaPais)}
          pildoras={<Pildora rotulo="Rubro" valor={rubro.n} onClick={() => setAbierta("rubro")} />}>
          {!fila ? sinDatos : (
            <>
              <Deslizable clave={`${contra}|${rid}|${barrasPais.length + barrasMedido.length}`} centro={contra}>
                <GraficoBarrasH filas={[...barrasPais, ...barrasMedido]} etiqueta={`${rubro.n}: ${nombreRef} contra cada país, diferencia de nivel de precios`} elegida={resaltadas}
                  onElegir={alternarContra} fmtEje={fmtEje} escala={escala} />
              </Deslizable>
            </>
          )}
        </Columna>
        <Columna activa={vista === "pres"} titulo="Por presidente" acciones={compartir("por presidente", vistaPres)}
          pildoras={<>
            <Pildora rotulo="Rubro" valor={rubro.n} onClick={() => setAbierta("rubro")} />
            <Pildora rotulo="Contra" valor={opcionesContra.find((o) => o.id === contra)?.n ?? dichoContra} onClick={() => setAbierta("contra")} />
          </>}>
          {!barrasPres.length ? <p className="note" role="status">No hay datos de {rubro.n.toLowerCase()} contra {dichoContra} para promediar por presidente.</p> : (
            <GraficoBarrasH filas={barrasPres} etiqueta={`${rubro.n} por presidente: ${nombreRef} contra ${dichoContra}, promedio del mandato`}
              elegida={periodo.tipo === "pres" ? periodo.id : undefined} onElegir={(id) => set({ pqa: periodo.tipo === "pres" && periodo.id === id ? null : `p-${id}` })} fmtEje={fmtEje} escala={escala} />
          )}
          {barrasPres.length > 0 && presSin.length > 0 && (
            <p className="note" role="status">{avisoPres}</p>
          )}
        </Columna>
      </div>

      <Detalle d={d} rid={rid} dolar={dolar} arg={arg} ref0={ref} contra={contra} p={p} set={set} />

      <TablaMedidos d={d} rid={rid} dolar={dolar} arg={arg} />
      <details className="ctx-mas">
        <summary>Cómo se mide</summary>
        <p className="note">«Medido» es lo que midió el Banco Mundial (Programa de Comparación Internacional, ICP: {aniosMedidos(d).join(", ")}). «Estimado» es nuestra cuenta mes a mes desde la última medición, con la inflación del rubro y el tipo de cambio de cada país. Lo estimado puede desviarse de la próxima medición.
          {" "}Con cepo o brecha alta, el nivel en dólares depende mucho del dólar elegido. No se comparan calidades ni impuestos por separado.</p>
        <p className="note">Fuente: {d.fuente}. La zona euro es el promedio simple de Alemania, Francia, Italia y España en lo medido, y el índice armonizado de la zona en lo estimado.</p>
        {Object.entries(d.notas_estimado ?? {}).map(([c, t]) => <p key={c} className="note">{d.paises[c] ?? c}: {t}</p>)}
      </details>
    </Capitulo>
  );
}

/** Lista larga con su propio deslizador vertical (~8 filas; el eje queda abajo, fuera de lo que se desliza), sombra si hay más y la fila elegida (`centro`)
 *  a la vista al cargar o cuando cambia desde afuera (se mueve el scrollTop de la lista, nunca la ventana). Si el cambio vino de tocar una fila de esta
 *  misma lista, no se recentra: la fila tocada queda donde estaba. */
function Deslizable({ clave, centro, children }: { clave: string; centro: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const tocada = useRef(0);   // cuándo se tocó una fila de la lista
  useEffect(() => {
    const raiz = ref.current, lista = raiz?.querySelector<HTMLElement>(".gbh-lista");
    if (!raiz || !lista) return;
    const marcar = () => raiz.setAttribute("data-mas", lista.scrollTop + lista.clientHeight < lista.scrollHeight - 2 ? "true" : "false");
    const sel = lista.querySelector<HTMLElement>(`[data-id="${CSS.escape(centro)}"]`);
    if (sel && Date.now() - tocada.current > 1500) { const t = sel.offsetTop - lista.offsetTop; lista.scrollTop = Math.max(0, t - (lista.clientHeight - sel.offsetHeight) / 2); }
    marcar();
    lista.addEventListener("scroll", marcar, { passive: true });
    window.addEventListener("resize", marcar);
    return () => { lista.removeEventListener("scroll", marcar); window.removeEventListener("resize", marcar); };
  }, [clave, centro]);
  return <div ref={ref} className="pmc-desliz" data-mas="false" onClickCapture={() => { tocada.current = Date.now(); }}>{children}</div>;
}

const fmtEje = (v: number) => txtDif(Math.round(v));

/** Una de las tres columnas: en computadora se ven las tres; en angosto solo la elegida (lo decide el CSS, así el primer dibujo ya sale bien). */
function Columna({ activa, titulo, acciones, pildoras, children }: { activa: boolean; titulo: string; acciones: ReactNode; pildoras: ReactNode; children: ReactNode }) {
  return (
    <section className="pmc-col" data-activa={activa ? "true" : "false"}>
      <div className="pmc-col-cab">
        <h3 className="pmc-col-t">{titulo}</h3>
        <span className="pmc-col-acc">{acciones}</span>
      </div>
      <div className="pmc-pildoras">{pildoras}</div>
      {children}
    </section>
  );
}

function Pildora({ rotulo, valor, onClick }: { rotulo: string; valor: string; onClick: () => void }) {
  return (
    <button type="button" className="ctxr-pildora" aria-haspopup="dialog" aria-label={`${rotulo}: ${valor}. Cambiar`} onClick={onClick}>
      <span className="ctxr-rotulo">{rotulo}</span><b>{valor}</b><IconoAbajo />
    </button>
  );
}

/** Hoja con una lista de opciones (en grupos con título, con buscador si se pide); elegir una cierra la hoja. */
function HojaElegir({ titulo, abierta, onCerrar, grupos, valor, onElegir, buscador }: {
  titulo: string; abierta: boolean; onCerrar: () => void; valor: string; onElegir: (v: string) => void; buscador?: boolean;
  grupos: { titulo?: string; items: { id: string; n: string; nota?: string }[] }[];
}) {
  const [buscar, setBuscar] = useState("");
  const q = norm(buscar.trim());
  return (
    <Hoja titulo={titulo} abierta={abierta} onCerrar={() => { onCerrar(); setBuscar(""); }}>
      {(cerrar) => (
        <div className="ctxr-hoja">
          {buscador && <input type="search" className="ctxr-buscar" aria-label="Buscar rubro" placeholder="Buscar rubro: carne, ropa, transporte…" value={buscar} onChange={(ev) => setBuscar(ev.target.value)} />}
          {grupos.map((g, k) => {
            const items = g.items.filter((o) => !q || norm(o.n).includes(q));
            if (!items.length && !(k === 0 && buscador)) return null;
            return (
              <div key={g.titulo ?? k} className="pmc-grupo">
                {g.titulo && <span className="pmc-grupo-t">{g.titulo}</span>}
                <ul className="ctxr-lista">
                  {items.map((o) => (
                    <li key={o.id}>
                      <button type="button" className="ctxr-opcion" aria-pressed={o.id === valor} onClick={() => cerrar(() => onElegir(o.id))}>
                        {o.n}{o.nota ? <small className="pmc-nota"> · {o.nota}</small> : null}
                      </button>
                    </li>
                  ))}
                  {!items.length && <li className="note">Nada coincide.</li>}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Hoja>
  );
}

/** Países del gráfico "¿Cómo viene?": los que tienen estimado en el rubro (los demás no se ofrecen). */
function paisesConEstimado(d: DatosPM, nv: Record<string, Niveles>): string[] {
  return Object.keys(d.paises).filter((c) => c !== ARG && nv[c]?.est.some((x) => ok(x)));
}
function useNivelesTodos(d: DatosPM, rid: string, arg: ArgPM, dolar: Dolar) {
  return useMemo(() => Object.fromEntries(Object.keys(d.paises).map((c) => [c, niveles(d, rid, c, arg, dolar)])) as Record<string, Niveles>, [d, rid, arg, dolar]);
}

/** "¿Cómo viene?": un rubro en el tiempo, una línea por país (estimado) y un punto en cada año medido; mundo = 100.
 *  Rubro (`pvr`) y países (`pmp`) propios; sin tocar siguen a los de arriba (rubro de arriba; países = el de referencia y el "contra" si es un país). */
function Detalle({ d, rid, dolar, arg, ref0, contra, p, set }: { d: DatosPM; rid: string; dolar: Dolar; arg: ArgPM; ref0: string; contra: string; p: URLSearchParams; set: Setter }) {
  const [abierta, setAbierta] = useState<"rubro" | "paises" | null>(null);
  const rv = unoDe(p.get("pvr"), Object.keys(d.rubros), rid);
  const r = d.rubros[rv];
  const nvTodos = useNivelesTodos(d, rv, arg, dolar);
  const nvArg = useMemo(() => niveles(d, rv, ARG, arg, dolar), [d, rv, arg, dolar]);
  const nv = (c: string) => (c === ARG ? nvArg : nvTodos[c]);
  const conEst = paisesConEstimado(d, nvTodos).filter((c) => c !== ref0);
  // por defecto: el país contra el que se compara arriba (si tiene estimado); si el "contra" no es un país (el mundo, la región) o no tiene estimado, los de siempre
  const defecto = contra !== ref0 && contra !== ARG && conEst.includes(contra) ? [contra]
    : contra === ARG && contra in d.paises ? [] : PAISES_DEF.filter((c) => conEst.includes(c));
  const elegidos = (p.has("pmp") ? lista(p.get("pmp")) : defecto).filter((c) => conEst.includes(c));
  const alternar = (c: string) => {
    const nuevo = elegidos.includes(c) ? elegidos.filter((x) => x !== c) : [...elegidos, c];
    const igual = nuevo.length === defecto.length && nuevo.every((x) => defecto.includes(x));
    set({ pmp: igual ? null : nuevo.join(",") || "-" });
  };
  const ents = [ARG, ...(ref0 !== ARG ? [ref0] : []), ...elegidos].filter((c, i, a) => a.indexOf(c) === i && (c === ARG || conEst.includes(c) || (c === ref0 && paisesConEstimado(d, nvTodos).includes(c))));
  const colorDe = (c: string) => (c === ARG ? "--series-1" : PALETA[(Math.max(0, Object.keys(d.paises).filter((x) => x !== ARG).indexOf(c)) % (PALETA.length - 1)) + 1]);
  const anios = aniosMedidos(d);
  const rows = d.fechas.map((f, i) => {
    const fila: Record<string, string | number | null> = { fecha: f, per: fmtMes(f), mundo: 100 };
    for (const c of ents) {
      fila[c] = nv(c)?.est[i] ?? null;
      const a = anios.find((y) => f === `${y}-07`);                // el punto medido se marca a mitad del año
      fila[c + "_m"] = a != null && nv(c)?.med[a] != null ? nv(c).med[a] : null;
    }
    return fila;
  });
  const series: SerieG[] = [{ key: "mundo", name: "Mundo (= 100)", color: "--neutral" }];
  for (const c of ents) {
    series.push({ key: c, name: `${d.paises[c]} (estimado)`, color: colorDe(c) });
    if (rows.some((f) => ok(f[c + "_m"] as number | null))) series.push({ key: c + "_m", name: `${d.paises[c]} (medido)`, color: colorDe(c), puntos: 11 });
  }
  const opts: OpcionesG = { height: 320, fmtAxis: (v) => nf0.format(v), fmtTip: (v) => nf1.format(v), tipTitle: (f) => String(f.per), refLine: 100, endLabels: false, maxGap: 2 };
  const hayGeneral = nvArg.mundoGeneral;
  const faltaBlue = Object.keys(nvArg.med).length < anios.length && dolar === "blue";
  const sinEst = Object.keys(d.paises).filter((c) => c !== ARG && !paisesConEstimado(d, nvTodos).includes(c));
  const textoPaises = elegidos.length === 0 ? "Solo los de arriba" : elegidos.length <= 2 ? elegidos.map((c) => d.paises[c]).join(", ") : `${elegidos.length} países`;
  const nuevoRubro = (v: string) => set({ pvr: v === rid ? null : v });
  return (
    <>
      <div className="ctx-titulo-graf">
        <h3>¿Cómo viene?</h3>
        <InfoPunto etiqueta="Cómo leer este gráfico">
          <p>Los puntos son lo medido por el Banco Mundial; la línea, lo estimado. Cuando llega una medición nueva la línea salta a ese valor: no se corrige el pasado.</p>
          {r.nota && <p><b>Sobre este rubro:</b> {r.nota}</p>}
          {hayGeneral && <p>EE.UU. no publica el IPC de este rubro en la base que usamos: el mundo se mueve con su IPC general.</p>}
          {faltaBlue && <p>Con el dólar blue faltan años medidos porque no hay cotización suficiente ese año.</p>}
          <p>Sin tocar, sigue al rubro y a los países de los gráficos de arriba.</p>
        </InfoPunto>
      </div>
      <div className="ctxr-fila">
        <Pildora rotulo="Rubro" valor={r.n} onClick={() => setAbierta("rubro")} />
        <Pildora rotulo="Países" valor={textoPaises} onClick={() => setAbierta("paises")} />
      </div>
      <HojaElegir titulo="Elegir rubro del gráfico" abierta={abierta === "rubro"} onCerrar={() => setAbierta(null)} buscador
        grupos={[{ items: Object.keys(d.rubros).map((k) => ({ id: k, n: d.rubros[k].n })) }]} valor={rv} onElegir={nuevoRubro} />
      <HojaListo titulo="Países del gráfico" abierta={abierta === "paises"} onCerrar={() => setAbierta(null)}>
        {() => (
          <div className="ctx-hoja">
            <Pildoras titulo="Países del gráfico «¿Cómo viene?»" valor={new Set(elegidos)} onElegir={alternar}
              opciones={conEst.map((c) => [c, d.paises[c]] as [string, string])} />
            <p className="note">La Argentina y el país de «Comparar desde» siempre se ven. Solo se ofrecen los países con estimado mes a mes en este rubro.</p>
          </div>
        )}
      </HojaListo>
      <p className="note">{r.n}: nivel de precios en dólares, mundo = 100.</p>
      <Grafico rows={rows} series={series} opts={opts} />
      <ul className="pmc-leyenda" aria-label="Países del gráfico">
        {ents.map((c) => (
          <li key={c}><span className="pmc-clave" aria-hidden style={{ borderTopColor: `var(${colorDe(c)})` }} />{d.paises[c]}</li>
        ))}
      </ul>
      <p className="note pmc-claves"><span className="pmc-clave" aria-hidden /> línea: estimado · <span className="pmc-punto" aria-hidden /> punto: medido</p>
      {sinEst.length > 0 && <p className="note">Sin estimado mes a mes para este rubro (solo se ven en las barras, como medidos): {sinEst.map((c) => d.paises[c]).join(", ")}.</p>}
    </>
  );
}

/** Plegado con lo medido por el Banco Mundial para el rubro de arriba. */
function TablaMedidos({ d, rid, dolar, arg }: { d: DatosPM; rid: string; dolar: Dolar; arg: ArgPM }) {
  const nvArg = useMemo(() => niveles(d, rid, ARG, arg, dolar), [d, rid, arg, dolar]);
  const anios = aniosMedidos(d);
  return (
    <details className="ctx-mas">
      <summary>Valores medidos por el Banco Mundial</summary>
      <div className="tablewrap fija"><table>
        <thead><tr><th>País</th>{anios.map((y) => <th key={y}>{y}</th>)}</tr></thead>
        <tbody>{Object.keys(d.paises).map((c) => {
          const v = (y: number) => (c === ARG ? nvArg.med[y] : d.medido[y]?.[rid]?.[c]);
          return (
            <tr key={c} style={c === ARG ? { fontWeight: 600 } : undefined}>
              <td>{d.paises[c]}{d.notas_pais[c] ? <small>{d.notas_pais[c]}</small> : null}</td>
              {anios.map((y) => <td key={y}>{ok(v(y)) ? nf0.format(v(y) as number) : "—"}</td>)}
            </tr>
          );
        })}</tbody>
      </table></div>
      <p className="note">Mundo = 100. Argentina se muestra con el dólar {dolar === "blue" ? "blue" : "oficial"}; los demás países, tal cual los publica el Banco Mundial.</p>
    </details>
  );
}
