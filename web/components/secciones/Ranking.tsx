"use client";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSeccion } from "../useSeccion";
import { createPortal } from "react-dom";
import { Cargando, alternar } from "../ui";
import { IconoAjustes } from "../Iconos";
import { FilaVariable } from "../Variables";
import { ContextoMandato } from "./ContextoMandato";
import { PanelCompartir } from "../PanelCompartir";
import { Capitulo } from "../sistema/Capitulo";
import { CabeceraDato } from "../sistema/CabeceraDato";
import { Hoja } from "../sistema/Hoja";
import { InfoPunto } from "../sistema/InfoPunto";
import { CompartirHoja } from "../sistema/CompartirHoja";
import { CeldaPres, CeldaVar, LineaInicio, Valor, useBase, HojaListo } from "./comunes";
import { columnaComparable, periodoMandato, variacionMostrada } from "@/lib/tablas";
import { fmtMes, nf0, nf1, ok } from "@/lib/formato";
import { crearPres, mejorPeor, rankingPresidentes, tablasIndicadores, type CritRk, type FilaMP, type IndRk, type Pres, type TablaInd } from "@/lib/estadisticas";
import { crearIndicadores } from "@/lib/catalogo";
import { fraseRanking, ordenPorIndicador } from "@/lib/ranking";
import type { Expr, Motor } from "@/lib/motor";
import { decExpr, encExpr, lista, unoDe, useParams } from "@/lib/url";

const CRIT_TXT: Record<CritRk, string> = {
  mejora: "cuánto mejoró o empeoró desde el inicio hasta el cierre (en porcentajes, la diferencia en puntos; en el resto, la variación anualizada)",
  nivel: "el nivel promedio del mandato (en montos en pesos corrientes, donde el nivel no se puede comparar entre épocas, se usa la mejora)",
  ambos: "el promedio de los dos puntajes de cada indicador: la mejora y el nivel promedio",
};
const MIN_V = 3, MAX_V = 20;
const menos = (t: string) => t.replace(/^-/, "−");
const hrefHist = (e: Expr) => `/historico/?v=${encodeURIComponent(encExpr({ ...e, med: e.med || undefined }))}`;

/** Lo mejor y lo peor de un gobierno: 5 indicadores de cada lado y la lista completa a pedido. */
function MejorPeor({ m, tablas, PRES, pres, crit }: { m: Motor; tablas: TablaInd[]; PRES: Pres[]; pres: Pres; crit: CritRk }) {
  const [todos, setTodos] = useState(false);
  const { mejores, peores } = useMemo(() => mejorPeor(tablas, PRES, pres, crit), [tablas, PRES, pres, crit]);
  const F = m.F;
  const mesC = (i?: number) => (i != null && i >= 0 ? <small>{fmtMes(F[i])}</small> : null);
  const pu = (x?: number, de?: number, pct?: number) => ok(x) ? <Valor tono={(pct as number) > 50 ? "bueno" : (pct as number) < 50 ? "malo" : null}>{x}º de {de}</Valor> : <td style={{ color: "var(--text-muted)" }} title="El nivel no se puede comparar entre épocas">–</td>;
  const tabla = (titulo: string, filas: FilaMP[], bueno: boolean, vacio: string) => (
    <div>
      <h3>{titulo}</h3>
      <div className="tablewrap fija"><table>
        <thead><tr><th style={{ textAlign: "left" }}>Indicador</th><th>Inicio</th><th>Cierre</th><th>Cambio</th><th>Promedio</th><th>Puesto por mejora</th><th>Puesto por nivel</th></tr></thead>
        <tbody>
          {(todos ? filas : filas.slice(0, 5)).map((f) => (
            <tr key={f.grupo + f.nombre}>
              <CeldaVar nombre={<Link prefetch={false} href={hrefHist(f.ind)} title={f.nombre}>{f.nombre}</Link>} unidad={`${f.grupo} · ${f.c.unidad}`} />
              <td>{m.fmtC(f.c, f.d.st.ini)}{mesC(f.d.st.iniI)}</td><td>{m.fmtC(f.c, f.d.st.fin)}{mesC(f.d.st.finI)}</td>
              <Valor tono={bueno ? "bueno" : "malo"} sub={<>
                {m.difAbsTxt(f.c, f.d.st.ini ?? null, f.d.st.fin ?? null) ? <small>{m.difAbsTxt(f.c, f.d.st.ini ?? null, f.d.st.fin ?? null)}</small> : null}
                {f.d.enPuntos ? (f.d.st.ini! > 0 && f.d.st.fin! >= 0 ? <small>{nf0.format((f.d.st.fin! / f.d.st.ini! - 1) * 100)} % relativo</small> : null) : <small>{nf1.format(f.d.mejora * 100)} % anual</small>}</>}>{menos(variacionMostrada(m, f.c, f.d.st.ini, f.d.st.fin))}</Valor>
              <td>{m.fmtC(f.c, f.d.st.prom)}</td>
              {pu(f.d.m_puesto, f.d.m_de, f.d.m_pct)}{pu(f.d.n_puesto, f.d.n_de, f.d.n_pct)}
            </tr>
          ))}
          {!filas.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)" }}>{vacio}</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
  return (
    <div className="mp-grid">
      {tabla("Lo mejor", mejores, true, "Sin indicadores que hayan mejorado")}
      {tabla("Lo peor", peores, false, "Sin indicadores que hayan empeorado")}
      <p className="note">Verde = mejor y rojo = peor; el signo y el texto dicen cuánto cambió. Usa los indicadores principales de todos los grupos, no solo los filtrados arriba. Se ordenan por el puesto frente a los demás presidentes ({crit === "ambos" ? "promedio de mejora y nivel" : crit === "nivel" ? "nivel promedio" : "mejora"}).{" "}
        {(mejores.length > 5 || peores.length > 5) && <button type="button" className="enlace" onClick={() => setTodos(!todos)}>{todos ? "Ver solo los 5 primeros" : "Ver la lista completa"}</button>}</p>
    </div>
  );
}

type DesRk = NonNullable<TablaInd["des"][number]>;
/** Para cada indicador, el orden de los presidentes según el criterio, con quién quedó primero y quién último. */
function Comparacion({ m, tablas, PRES, crit, conUnidad }: { m: Motor; tablas: TablaInd[]; PRES: Pres[]; crit: CritRk; conUnidad: boolean }) {
  const nom = (k: number) => PRES[k].corto ?? PRES[k].n;
  const filas = ordenPorIndicador(tablas, crit);
  const cifra = (t: TablaInd, d: DesRk) => (crit === "nivel" ? `promedio ${m.fmtC(t.c, d.st.prom)}` : menos(variacionMostrada(m, t.c, d.st.ini, d.st.fin)));
  if (!filas.length) return <p className="note">No hay indicadores con datos de al menos dos presidentes para comparar.</p>;
  return (
    <div className="tablewrap fija"><table>
      <thead><tr><th style={{ textAlign: "left" }}>Indicador</th><th style={{ textAlign: "left" }}>Primero</th><th style={{ textAlign: "left" }}>Último</th><th style={{ textAlign: "left" }}>Orden completo</th></tr></thead>
      <tbody>{filas.map(({ t, orden }) => {
        const a = orden[0], z = orden[orden.length - 1];
        return (
          <tr key={t.grupo + t.nombre}>
            <CeldaVar nombre={<Link prefetch={false} href={hrefHist(t.ind)} title={t.nombre}>{t.nombre}</Link>} unidad={conUnidad ? `${t.grupo} · ${t.c.unidad}` : t.c.unidad} />
            <Valor tono="bueno" sub={<small>{cifra(t, a.d)}</small>}>{nom(a.k)}</Valor>
            <Valor tono="malo" sub={<small>{cifra(t, z.d)}</small>}>{nom(z.k)}</Valor>
            <td className="unidad rk-orden">{orden.map((x) => nom(x.k)).join(" › ")}</td>
          </tr>
        );
      })}</tbody>
    </table></div>
  );
}

export function Ranking() {
  const [p, set, montado] = useParams();
  const sec = useSeccion("todo");
  const info = useBase(p, set, montado), b = info.b;
  const [puntajeAbierto, setPuntajeAbierto] = useState(true);   // la tabla de puntajes arranca desplegada; si se pliega, queda plegada
  const [hoja, setHoja] = useState(false);
  const [hojaGrupos, setHojaGrupos] = useState(false);
  const [hojaVars, setHojaVars] = useState(false);
  const [imagen, setImagen] = useState(false);
  const { motor: m, version } = sec;
  const PRES = useMemo(() => (m ? crearPres(m.F) : []), [m]);
  const I = useMemo(() => (m && !sec.ocupado ? crearIndicadores(m) : null), [m, sec.ocupado, version]);  // eslint-disable-line react-hooks/exhaustive-deps

  const tablasTodos = useMemo(() => (m && I ? tablasIndicadores(m, m.F, PRES, I.INDIC.map((i) => ({ ind: i as Expr, grupo: i.grupo, nombre: i.nombre })), b) : []), [m, PRES, I, b]);
  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!m || !montado || sec.ocupado || !I) return <Cargando />;

  const F = m.F;
  const crit = unoDe(p.get("rkc"), ["mejora", "nivel", "ambos"] as const, "mejora");
  const grupos = new Set(lista(p.has("rk") ? p.get("rk") : I.GRUPOS_IND.join(",")).filter((g) => I.GRUPOS_IND.includes(g)));
  const usaVars = p.has("rkv");
  const vars = lista(p.get("rkv")).map((s) => decExpr(s, (id) => !!m.SER[id])).filter(Boolean).slice(0, MAX_V) as Expr[];
  const inds: IndRk[] = usaVars
    ? vars.map((e, k) => ({ ind: e, grupo: "v" + k, nombre: m.calc(e).corto }))
    : I.INDIC.filter((i) => grupos.has(i.grupo)).map((i) => ({ ind: i as Expr, grupo: i.grupo, nombre: i.nombre }));
  const tablasComp = usaVars ? tablasIndicadores(m, F, PRES, inds, b) : tablasTodos.filter((t) => grupos.has(t.grupo));
  const valido = !usaVars || vars.length >= MIN_V;
  const res = valido ? rankingPresidentes(m, F, PRES, inds, crit, b) : null;

  // Puntaje: un solo tono (verde en la mitad de arriba, rojo en la de abajo), barra de 0 a 100 y marca "mejor" / "peor" en los extremos.
  const colPuntaje = columnaComparable((res?.filas ?? []).map((f) => f.score), 1, false);
  const abiertos = lista(p.get("rka")).filter((id) => res?.filas.some((f) => f.p.id === id));
  const alternarAb = (id: string) => set({ rka: (abiertos.includes(id) ? abiertos.filter((x) => x !== id) : [...abiertos, id]).join(",") || null });
  const porDefecto = ["sipa_med", "ipc_empalme", "pob_tasa_pobreza_personas"].map((id) => I.INDIC.find((i) => i.id === id)).filter(Boolean) as Expr[];
  const cambiarModo = (v: string) => {
    if (v === "vars") set({ rkv: porDefecto.map((e) => encExpr(e)).join(",") });
    else set({ rkv: null });
  };
  const setVars = (nv: Expr[]) => set({ rkv: nv.map((e) => encExpr(e)).join(",") || "-" });
  const agregar = (e: Expr | null) => { if (e && vars.length < MAX_V) setVars([...vars, e]); };

  const rta = valido ? fraseRanking(tablasComp, PRES, crit, inds.length) : null;
  const CRIT_NOM: Record<CritRk, string> = { mejora: "Mejora", nivel: "Nivel promedio", ambos: "Ambos" };
  const resumen = [usaVars ? "Elegir variables" : "Por grupos", CRIT_NOM[crit], usaVars ? `${vars.length} variables` : `${grupos.size} de ${I.GRUPOS_IND.length} grupos`].join(" · ");
  const textoCompartir = rta ? `${rta.frase} Fuente: Primero los Datos.` : undefined;

  return (
    <section>
      {rta ? <CabeceraDato nivel={2} titulo={rta.titulo} cifra={rta.cifra} unidad={rta.unidad} fecha={rta.fecha} deltas={[]} frase={rta.frase} />
        : <p className="note rk-sin">{valido ? "No hay indicadores con datos de al menos dos presidentes para comparar." : `Con al menos ${MIN_V} variables se arma la comparación.`}</p>}

      <BarraResumen resumen={resumen} onAjustes={() => setHoja(true)}
        extras={usaVars
          ? <button type="button" className="vistabar-ajustes" aria-haspopup="dialog" onClick={() => setHojaVars(true)}>Elegir variable</button>
          : <button type="button" className="vistabar-ajustes" aria-haspopup="dialog" onClick={() => setHojaGrupos(true)}>Filtrar grupos</button>} />
      <HojaListo titulo="Ajustes" abierta={hoja} onCerrar={() => setHoja(false)}>
        {() => (
          <div className="rk-hoja">
            <Grupo titulo="Qué entra" forma="lista" valor={usaVars ? "vars" : "grupos"} onElegir={cambiarModo} opciones={[["grupos", "Por grupos"], ["vars", "Elegir variables"]]} />
            <Grupo titulo="Criterio" forma="lista" valor={crit} onElegir={(v) => set({ rkc: v === "mejora" ? null : v })} opciones={[["mejora", "Mejora"], ["nivel", "Nivel promedio"], ["ambos", "Ambos"]]} />
          </div>
        )}
      </HojaListo>
      <HojaListo titulo="Filtrar grupos" abierta={hojaGrupos && !usaVars} onCerrar={() => setHojaGrupos(false)}>
        {() => (
          <div className="rk-hoja">
            <Pildoras titulo="Grupos de indicadores" valor={grupos} opciones={I.GRUPOS_IND.map((g) => [g, g] as [string, string])}
              onElegir={(v) => { const n = alternar(grupos, v); set({ rk: n.size === I.GRUPOS_IND.length ? null : [...n].join(",") }); }}
              onTodos={() => set({ rk: null })} />
            <p className="note">Tocá un grupo para sacarlo o volver a sumarlo; “Todos” los vuelve a elegir. Queda al menos uno.</p>
          </div>
        )}
      </HojaListo>
      <HojaListo titulo="Elegir variable" abierta={hojaVars && usaVars} onCerrar={() => setHojaVars(false)}>
        {() => (
          <div className="rk-hoja">
            <p className="note">{vars.length} de {MAX_V}; hacen falta al menos {MIN_V}. Cada una cuenta como su propio grupo.</p>
            {vars.map((e, k) => (
              <FilaVariable key={k + e.id} e={e} sinRel quitable onChange={(ne) => setVars(ne ? vars.map((x, j) => (j === k ? ne : x)) : vars.filter((_, j) => j !== k))} />
            ))}
            {vars.length < MAX_V && <FilaVariable e={null} agregable textoAgregar="+ Agregar variable" onChange={agregar} />}
          </div>
        )}
      </HojaListo>
      <LineaInicio info={info} F={F} />

      <Capitulo id="rk-comparacion" titulo="Indicador por indicador"
        bajada="Quién quedó mejor y quién peor en cada indicador, con los mismos indicadores y el mismo criterio para todos."
        acciones={<InfoPunto etiqueta="Cómo se ordena"><p>Para cada indicador, los presidentes se ordenan según <b>{CRIT_TXT[crit]}</b>. Verde = el que quedó mejor, rojo = el que quedó peor; debajo del nombre va el dato que lo explica. Cada presidente se evalúa con los mismos indicadores y el mismo criterio.</p></InfoPunto>}>
        <Comparacion m={m} tablas={tablasComp} PRES={PRES} crit={crit} conUnidad={!usaVars} />
      </Capitulo>

      {!res ? <p className="note">Con al menos {MIN_V} variables se arma también el puntaje combinado.</p> : (
        <Capitulo id="rk-puntaje" titulo="Puntaje combinado" bajada="Depende de los indicadores elegidos; no es una medida oficial."
          acciones={<>
            <InfoPunto etiqueta="Cómo se arma el puntaje">
              <p>Un puntaje de 0 (el peor) a 100 (el mejor) por presidente. Se promedia dentro de cada grupo y después entre grupos, para que ningún grupo pese más por tener más series. <b>Ojo:</b> muchos datos empiezan en 2003, 2012 o 2016, así que Menem, De la Rúa y Duhalde se evalúan con pocos indicadores; Milei, con un mandato en curso; y el contexto internacional y la herencia de cada uno no entran en el número. En la tabla, la barra va de 0 a 100, verde es la mitad de arriba y rojo la de abajo, y las marcas “mejor” y “peor” señalan los extremos.
                {res.incompletas && usaVars ? " Algunas variables no tienen datos para todos los presidentes." : ""}</p>
            </InfoPunto>
            {res.filas.length > 0 && <CompartirHoja href={window.location.pathname + window.location.search} titulo="Ranking de presidentes" onImagen={() => setImagen(true)} texto={textoCompartir} />}
          </>}>
          <details className="rk-plegado" open={puntajeAbierto} onToggle={(ev) => setPuntajeAbierto(ev.currentTarget.open)}>
            <summary>Tabla de puntajes</summary>
          {abiertos.length > 0 && <div className="rk-abiertos"><button type="button" className="btn" onClick={() => set({ rka: null })}>Cerrar todos</button></div>}
          <div className="tablewrap fija rk-tabla"><table>
            <thead><tr><th>Presidente</th><th>Puntaje</th><th>Indicadores</th><th className="rk-col-mejor" style={{ textAlign: "left" }}>Mejor en</th><th style={{ textAlign: "left" }}>Peor en</th></tr></thead>
            <tbody>{res.filas.map((f, k) => {
              const ab = abiertos.includes(f.p.id);
              const px = PRES.find((x) => x.id === f.p.id) ?? f.p;
              const mejorEn = f.items.slice(0, 3).map((i) => i.nombre).join(" · ");
              return (
                <Fragment key={f.p.id}>
                  <tr className={`clic${ab ? " abierto" : ""}`} tabIndex={0} aria-expanded={ab} onClick={() => alternarAb(f.p.id)}
                    onKeyDown={(ev) => { if (ev.key === "Enter") alternarAb(f.p.id); }}>
                    <CeldaPres n={px.n} corto={px.corto} periodo={periodoMandato(F, px)} aparte={mejorEn ? `Mejor en: ${mejorEn}` : null} pos={k + 1} />
                    <Valor tono={colPuntaje.tono[k]} f={(f.score as number) / 100} modo="izq" marca={colPuntaje.marca[k]}>{nf0.format(f.score as number)}</Valor><td>{f.items.length}</td>
                    <td className="unidad rk-col-mejor">{mejorEn}</td>
                    <td className="unidad">{f.items.slice(-3).reverse().map((i) => i.nombre).join(" · ")}</td>
                  </tr>
                  {ab && (
                    <tr><td colSpan={5}>
                      <div className="rk-detalle">
                        <ContextoMandato m={m} pres={px} />
                        <div className="tablewrap fija"><table>
                          <thead><tr><th style={{ textAlign: "left" }}>Indicador</th><th>Inicio</th><th>Cierre</th><th>Cambio</th><th>Puesto</th></tr></thead>
                          <tbody>{f.items.map((i) => (
                            <tr key={i.grupo + i.nombre}>
                              <CeldaVar nombre={i.nombre} unidad={usaVars ? i.c.unidad : i.grupo} />
                              <td>{m.fmtC(i.c, i.d.st.ini)}<small>{i.d.st.iniI != null ? fmtMes(F[i.d.st.iniI]) : ""}</small></td>
                              <td>{m.fmtC(i.c, i.d.st.fin)}<small>{i.d.st.finI != null ? fmtMes(F[i.d.st.finI]) : ""}</small></td>
                              <Valor tono={i.d.bueno ? "bueno" : i.d.malo ? "malo" : null}
                                sub={m.difAbsTxt(i.c, i.d.st.ini ?? null, i.d.st.fin ?? null) ? <small>{m.difAbsTxt(i.c, i.d.st.ini ?? null, i.d.st.fin ?? null)}</small> : null}>{menos(variacionMostrada(m, i.c, i.d.st.ini, i.d.st.fin))}</Valor>
                              <Valor tono={i.pct > 50 ? "bueno" : i.pct < 50 ? "malo" : null}>{i.puesto}º de {i.de}</Valor>
                            </tr>
                          ))}</tbody>
                        </table></div>
                        <MejorPeor m={m} tablas={tablasTodos} PRES={PRES} pres={px} crit={crit} />
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              );
            })}</tbody>
          </table></div>
          </details>
        </Capitulo>
      )}
      {imagen && res && createPortal(<PanelCompartir vista={{ tipo: "ranking", crit, inds, usaVars, base: b }} href={window.location.href} titulo="Primero los Datos: ranking de presidentes" onCerrar={() => setImagen(false)} />, document.body)}
    </section>
  );
}

/** Un grupo de opciones de la hoja de ajustes: botones de 44 px que se marcan. En "lista" va uno por renglón; en "chips" se acomodan en varios renglones (la hoja lo permite). */
function Grupo({ titulo, opciones, valor, onElegir, forma }: {
  titulo: string; opciones: [string, string][]; valor: string | Set<string>; onElegir: (v: string) => void; forma: "lista" | "chips";
}) {
  const activo = (v: string) => (valor instanceof Set ? valor.has(v) : valor === v);
  return (
    <div className="rk-grupo" role="group" aria-label={titulo}>
      <span className="rk-rotulo">{titulo}</span>
      <div className="rk-opcs" data-forma={forma}>
        {opciones.map(([v, t]) => <button key={v} type="button" className="rk-opc" aria-pressed={activo(v)} onClick={() => onElegir(v)}>{t}</button>)}
      </div>
    </div>
  );
}

/** Renglón de resumen de la vista ("Por grupos · Mejora · 7 de 7 grupos") con el único botón general, Ajustes, y los botones propios de lo que se usa seguido (R14). */
export function BarraResumen({ resumen, onAjustes, extras }: { resumen: string; onAjustes: () => void; extras?: ReactNode }) {
  return (
    <div className="vistabar resbar">
      <p className="resbar-texto">{resumen}</p>
      {extras}
      <button type="button" className="vistabar-ajustes" aria-haspopup="dialog" onClick={onAjustes}>
        <IconoAjustes /><span>Ajustes</span>
      </button>
    </div>
  );
}

/** Elección múltiple (R12): píldoras sueltas separadas; la elegida va rellena con un ✓ a la izquierda. */
export function Pildoras({ titulo, opciones, valor, onElegir, onTodos, bloqueadas }: {
  titulo: string; opciones: [string, string][]; valor: Set<string>; onElegir: (v: string) => void;
  /** Si se pasa, suma la píldora "Todos": vuelve a elegir todas las opciones (y queda marcada cuando ya están todas). */ onTodos?: () => void;
  /** Opciones que no se pueden elegir, con el motivo. */ bloqueadas?: Record<string, string>;
}) {
  const todas = opciones.every(([v]) => valor.has(v));
  return (
    <div className="rk-grupo" role="group" aria-label={titulo}>
      <span className="rk-rotulo">{titulo}</span>
      <div className="resbar-pildoras">
        {onTodos && (
          <button type="button" className="resbar-pil" aria-pressed={todas} onClick={onTodos}>
            {todas && <span className="resbar-tilde" aria-hidden="true">✓</span>}Todos
          </button>
        )}
        {opciones.map(([v, t]) => (
          <button key={v} type="button" className="resbar-pil" aria-pressed={valor.has(v)} disabled={!!bloqueadas?.[v]} title={bloqueadas?.[v]} onClick={() => onElegir(v)}>
            {valor.has(v) && <span className="resbar-tilde" aria-hidden="true">✓</span>}{t}{bloqueadas?.[v] ? <small> (sin datos por rubro)</small> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
