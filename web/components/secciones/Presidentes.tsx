"use client";
import { listables } from "@/lib/regiones";
import { esOculta } from "@/lib/nombres";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useSeccion } from "../useSeccion";
import { Cargando, Selector, Seg, alternar } from "../ui";
import { BotonInfo, FilaVariable, RenglonVariable } from "../Variables";
import { Sparkline } from "../Sparkline";
import { Velas } from "../Velas";
import { BotonCompartir } from "../PanelCompartir";
import { IconoAjustes, IconoCompartir } from "../Iconos";
import { ContextoMandato } from "./ContextoMandato";
import { VentanaConfig } from "./VentanaConfig";
import { INFO_CORTA } from "@/lib/info";
import { CeldaVar, CeldasStats, COLS, Cabecera, LineaInicio, siguienteOrden, useBase, valorCol, type Orden, HojaListo } from "./comunes";
import { Capitulo } from "../sistema/Capitulo";
import { FilaChips } from "../sistema/FilaChips";
import { Hoja } from "../sistema/Hoja";
import { TablaMandatos } from "../sistema/TablaMandatos";
import { GrillaPresidentes } from "../sistema/GrillaPresidentes";
import { grillaPresidentes, tablaPresidentes } from "@/lib/presidentes";
import { fechaDeDato, fmtMes } from "@/lib/formato";
import { frecuenciaOrigen } from "@/lib/historico";
import { baseIdx, claseMandato, crearPres, resumenClases, type BaseCfg, type ClaseMandato, nivelComparable, ordenar, statsMandato, type Pres } from "@/lib/estadisticas";
import { bajadaTablaMandatos, velasDe } from "@/lib/ficha";
import { grupoDe, ordenarGrupos, textoBusqueda } from "@/lib/catalogo";
import { monedaEnSerie } from "@/lib/monedas";
import { norm } from "@/lib/formato";
import type { Expr } from "@/lib/motor";
import { useConfig } from "../ConfigProvider";
import { medidaPreferida, paramSi } from "@/lib/config";
import { decExpr, encExpr, lista, unoDe, useParams } from "@/lib/url";

/** El inicio de mandato en palabras para el chip (sin "T-1"): "el mes antes de asumir", "el mes de asunción"… y "con excepciones" si las hay. */
function inicioCorto(b: BaseCfg): string {
  const k = b.t0;
  const gral = k === -1 ? "el mes antes de asumir" : k === 0 ? "el mes de asunción" : k > 0 ? `${k} ${k === 1 ? "mes" : "meses"} después de asumir` : `${-k} meses antes de asumir`;
  return Object.keys(b.t0p).length ? `${gral}, con excepciones` : gral;
}

/** Estrella de "Mis variables" (44 px): llena si la variable ya está en la lista, vacía si no. */
function Estrella({ activa, nombre, onClick, deshabilitada }: { activa: boolean; nombre: string; onClick: () => void; deshabilitada?: boolean }) {
  const acc = activa ? "Sacar de Mis variables" : "Agregar a Mis variables";
  return (
    <button type="button" className="pres-estrella" aria-pressed={activa} aria-label={`${acc}: ${nombre}`} title={deshabilitada ? "Mis variables ya tiene 10" : acc} disabled={deshabilitada} onClick={onClick}>
      <svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true"><path d="m10 2.5 2.2 4.7 5.1.6-3.8 3.5 1 5.1-4.5-2.5-4.5 2.5 1-5.1L2.7 7.8l5.1-.6z" fill={activa ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
    </button>
  );
}

/** Cómo le fue a cada variable en el mandato (para el resumen del grupo plegado): se calcula una vez por motor, presidente, moneda e inicio de mandato. */
const cacheClases = new WeakMap<object, Map<string, Map<string, ClaseMandato>>>();

/** "7 mejoraron · 4 empeoraron · 1 sin cambio" con color y con texto (el color nunca va solo). */
function ResumenGrupo({ clases }: { clases: ClaseMandato[] }) {
  const r = resumenClases(clases);
  const partes: [string, string, string][] = [];
  if (r.bueno) partes.push(["bueno", `${r.bueno} ${r.bueno === 1 ? "mejoró" : "mejoraron"}`, "▲ "]);
  if (r.malo) partes.push(["malo", `${r.malo} ${r.malo === 1 ? "empeoró" : "empeoraron"}`, "▼ "]);
  if (r.sinCambio) partes.push(["neutro", `${r.sinCambio} sin cambio`, ""]);
  if (r.sinCalificar) partes.push(["neutro", `${r.sinCalificar} sin calificar`, ""]);
  return <span className="pres-res">{partes.map(([k, t, g], i) => <span key={t}>{i > 0 ? " · " : ""}<span className={`pres-res-${k}`}><span aria-hidden="true">{g}</span>{t}</span></span>)}</span>;
}

export function Presidentes() {
  const [p, set, montado] = useParams();
  const sec = useSeccion("todo");
  const { config } = useConfig();
  const info = useBase(p, set, montado), b = info.b;
  const [hoja, setHoja] = useState(false);
  const [hojaA, setHojaA] = useState(false);
  const [ordA, setOrdA] = useState<Orden>({ k: null, d: -1 });
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set());   // al entrar, todos los grupos están contraídos
  const [tipo, setTipo] = useState("");
  const [editando, setEditando] = useState(false);
  const [buscar, setBuscar] = useState("");
  const { motor: m, metas } = sec;
  const PRES: Pres[] = useMemo(() => (m ? crearPres(m.F) : []), [m]);
  // Congreso tiene su propia página: los links viejos `/presidentes/?...#congreso` pasan a `/congreso/?...` con los mismos parámetros.
  useEffect(() => { if (window.location.hash === "#congreso") window.location.replace(`/congreso/${window.location.search}`); }, []);

  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!m || !montado) return <Cargando />;
  if (sec.ocupado) return <Cargando />;

  const existe = (id: string) => !!m.SER[id];
  const presSel = new Set(lista(p.get("pr") ?? PRES.map((x) => x.id).join(",")).filter((id) => PRES.some((x) => x.id === id)));
  // `cl` lo comparten las dos tablas (como antes de la etapa 3.3); la de una variable escribe siempre también su columna principal: si en esta no queda ninguna columna (p. ej. `cl=ninguna` o solo `acum`), se ven todas.
  const colsPedidas = COLS.filter((c) => (p.has("cl") ? lista(p.get("cl")) : COLS.map((x) => x[0])).includes(c[0]));
  const cols = colsPedidas.length ? colsPedidas : COLS;
  const eB: Expr = decExpr(p.get("pv"), existe) || { id: m.SER.sipa_med ? "sipa_med" : "sipa_prom", med: medidaPreferida(config), rel: null, modo: "compra", esc: "" };
  const F = m.F;

  // ---- tabla B: una variable, todos los presidentes
  const c = m.calc(eB), dir = c.dir || 0, niv = nivelComparable(m, eB);
  const T = tablaPresidentes(m, eB, b, { presIds: presSel, cl: p.has("cl") ? lista(p.get("cl")) : null });
  const vista = unoDe(p.get("pvista"), ["tabla", "velas"] as const, "tabla");
  // velas: solo presidentes con datos; el resto se lista al pie
  const selPres = PRES.filter((x) => presSel.has(x.id));
  const { velas, sin: velasSin } = velasDe(m, c, selPres.map((x) => ({ x, st: statsMandato(F, c.v, x, b) })));
  // Compartir comparte lo que se ve: la tabla, o las velas. Si las velas no se pueden dibujar (pesos corrientes o sin datos), no hay nada para compartir.
  const sinVelas = vista === "velas" && (!niv || velas.length === 0);
  const compartirB = (
    <BotonCompartir className="btn" titulo={`Primero los Datos: ${c.corto} por presidente${vista === "velas" ? " (velas)" : ""}`} href={() => window.location.href} deshabilitado={(vista === "velas" ? selPres.length : T.filas.length) === 0 || sinVelas}
      title={sinVelas ? "Las velas no se pueden armar con estos datos: no hay nada para compartir" : vista === "velas" ? "Armar una imagen de estas velas para compartir" : "Armar una imagen de esta tabla para compartir"}
      aria-label={`Compartir como imagen: una variable, todos los presidentes, en ${vista === "velas" ? "velas" : "tabla"}`}
      crearVista={() => (vista === "velas"
        ? { tipo: "velas", expr: eB, presIds: selPres.map((x) => x.id), base: b }
        : { tipo: "barras", expr: eB, presIds: T.filas.map((f) => f.id), base: b, ...(T.tasa ? { metrica: "var" as const } : {}) })}><IconoCompartir />Compartir</BotonCompartir>
  );
  const bajadaB = bajadaTablaMandatos(T.tasa);
  const notaB = (dir ? "Verde = mejoró y rojo = empeoró; el signo también está escrito." : "Sin verde ni rojo: subir o bajar no es ni bueno ni malo en sí mismo.")
    + (niv ? "" : " En montos corrientes los niveles de épocas distintas no se pueden comparar (hay inflación de por medio): solo vale la variación.")
    + ` Unidad: ${c.unidad}.`;
  // R19: un solo Ajustes por capítulo; lo elegido se lee como texto
  const nMas = T.elegidas.filter((k) => T.extras.includes(k) && !T.porDefecto.includes(k)).length;
  const resumenB = [
    presSel.size === PRES.length ? "Todos los presidentes" : `${presSel.size} de ${PRES.length} presidentes`,
    `desde ${inicioCorto(b)}`,
    ...(vista === "velas" ? ["velas"] : []),
    ...(nMas > 0 ? [`${nMas} ${nMas === 1 ? "columna más" : "columnas más"}`] : []),
  ].join(" · ");
  const opcionesExtras: [string, string][] = T.extras.flatMap((k) => { const col = T.columnas.find((x) => x.clave === k); return col ? [[k, col.titulo] as [string, string]] : []; });
  const tocarColumna = (k: string) => {
    const n = new Set(T.elegidas); if (n.has(k)) n.delete(k); else n.add(k);
    const claves = T.extras.filter((x) => n.has(x));   // en el orden de las columnas
    set({ cl: [...new Set([...(T.principal ? [T.principal] : []), ...claves])].join(",") });
  };
  const cambiarPres = (v: string) => { const n = [...alternar(presSel, v)]; set({ pr: n.length ? n.join(",") : "ninguno" }); };
  const serB = m.SER[eB.id];
  const medidaB = eB.rel || !serB ? "" : m.resumenMedida(serB, eB.med || m.medDefault(serB));
  const grilla = grillaPresidentes(m, b, m.SER);
  const calor = p.get("gc") !== "0";   // mapa de calor de la grilla: prendido salvo `gc=0`

  // ---- tabla A: un presidente, todas las variables
  const paPres = PRES.find((x) => x.id === p.get("pap")) || PRES[PRES.length - 1];
  const medsArs = m.medArs();
  const medPref = medidaPreferida(config);
  const paBi = baseIdx(F, paPres, b), paFin = Math.min(paPres.i1, F.length - 1), paCierra = paPres.i1 < F.length - 1;
  const textoPaPres = `${paPres.n}: de ${fmtMes(F[paBi])} (mes inicial) ${paCierra ? `a ${fmtMes(F[paFin])} (fin del mandato)` : "a hoy (último dato de cada variable)"}`;
  /** Cuando los datos de la variable no cubren todo el período, la fila lo dice. */
  const rango = (st: ReturnType<typeof statsMandato>, v: (number | null)[]) => {
    if (!st.n) return null;
    const fd = (i: number) => fechaDeDato(F[i], frecuenciaOrigen(v));
    const desde = st.iniI != null && st.iniI > paBi, hasta = st.finI != null && st.finI < paFin;
    return desde || hasta ? <small className="c-per">{desde && hasta ? `datos de ${fd(st.iniI as number)} a ${fd(st.finI as number)}` : desde ? `datos desde ${fd(st.iniI as number)}` : `datos hasta ${fd(st.finI as number)}`}</small> : null;
  };
  const paMed = medsArs.some((o) => o[0] === p.get("pam")) ? (p.get("pam") as string) : medPref;
  const modoA = unoDe(p.get("pam2"), ["todas", "mis"] as const, "todas");
  const RECO_IDS = ["Salarios", "Precios", "Empleo, pobreza e ingresos", "Dólar y tipo de cambio", "Actividad"];
  const recomendadas: Expr[] = RECO_IDS.map((k) => INFO_CORTA[k]?.reco).filter((r) => r && m.SER[r.id]).map((r) => ({ id: r.id, med: r.med, rel: null, modo: "compra", esc: r.esc ?? "" }));
  const misPedidas = lista(p.get("pav")).map((x) => decExpr(x, existe)).filter(Boolean).slice(0, 10) as Expr[];
  const mis: Expr[] = misPedidas.length ? misPedidas : recomendadas;
  const setMis = (nv: Expr[]) => set({ pav: nv.map((e) => encExpr(e)).join(",") || null, pam2: "mis" });
  const mover = (k: number, d: number) => { const nv = mis.slice(); const j = k + d; if (j < 0 || j >= nv.length) return; [nv[k], nv[j]] = [nv[j], nv[k]]; setMis(nv); };
  const toks = norm(buscar.trim()) ? norm(buscar.trim()).split(/\s+/) : [];
  // Una fila por rubro o producto (sin repetir regiones). La inflación va como mensual e interanual; el índice de precios no se lista.
  const todasSer = Object.values(m.SER);
  const series = [...(listables(todasSer) as typeof todasSer).filter((s) => s.id !== "ipc_empalme"), ...todasSer.filter((s) => esOculta(s.id))];
  const GRUPOS = ordenarGrupos([...new Set(series.map(grupoDe))]);
  const nc = cols.length + 3;   // variable, estadísticas, minigráfico del mandato y estrella
  const idsMis = new Set(mis.map((e) => e.id));
  const mapaClases = (() => {
    if (modoA !== "todas") return new Map<string, ClaseMandato>();
    const clave = `${paPres.id}|${paMed}|${JSON.stringify(b)}|${sec.version}`;
    let porM = cacheClases.get(m); if (!porM) { porM = new Map(); cacheClases.set(m, porM); }
    let cl = porM.get(clave);
    if (!cl) {
      cl = new Map();
      series.forEach((s) => { const mo = monedaEnSerie(s, paMed), cc = m.calc({ id: s.id, med: mo.med, rel: null }); cl!.set(s.id, claseMandato(cc.dir, cc.pct, statsMandato(F, cc.v, paPres, b))); });
      porM.set(clave, cl);
    }
    return cl;
  })();
  const sacarOPoner = (e: Expr) => {
    if (idsMis.has(e.id)) set({ pav: mis.filter((x) => x.id !== e.id).map((x) => encExpr(x)).join(",") || null });
    else if (mis.length < 10) set({ pav: [...mis, e].map((x) => encExpr(x)).join(",") });
  };
  const todosAbiertos = GRUPOS.length > 0 && GRUPOS.every((g) => abiertos.has(g));
  const filasA: React.ReactNode[] = [];
  let total = 0;
  GRUPOS.forEach((g) => {
    if (tipo && g !== tipo) return;
    let ss = series.filter((s) => grupoDe(s) === g);
    if (toks.length) ss = ss.filter((s) => { const t = textoBusqueda(s); return toks.every((k) => t.includes(k)); });
    if (!ss.length) return;
    total += ss.length;
    const ab = toks.length ? true : abiertos.has(g);
    filasA.push(
      <tr key={"g" + g} className={`grupo${ab ? " abierto" : ""}`} onClick={() => { if (toks.length) return; setAbiertos(alternar2(abiertos, g)); }}
        tabIndex={0} onKeyDown={(ev) => { if (ev.key === "Enter" && !toks.length) setAbiertos(alternar2(abiertos, g)); }}>
        <td colSpan={nc}>{g} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>({ss.length})</span>{" "}<ResumenGrupo clases={ss.map((s) => mapaClases.get(s.id) ?? "sin-calificar")} /></td>
      </tr>,
    );
    if (!ab) return;
    // R13: si la moneda no cambia nada en todo el grupo, una sola nota; si solo en algunas filas, la marca va en cada una
    const items = ordenar(ss.map((s) => { const mo = monedaEnSerie(s, paMed), cc = m.calc({ id: s.id, med: mo.med, rel: null }); return { s, c: cc, aplica: mo.aplica, st: statsMandato(F, cc.v, paPres, b) }; }),
      ordA, (o) => valorCol(o.c, o.st, ordA.k));
    const grupoSinMoneda = items.length > 0 && items.every((o) => !o.aplica);
    if (grupoSinMoneda) filasA.push(<tr key={"n" + g} className="nota-grupo"><td colSpan={nc}><small className="c-per">La moneda elegida no cambia estas variables: se muestran tal cual.</small></td></tr>);
    items.forEach(({ s, c: cc, st, aplica }) => filasA.push(
      <tr key={s.id}><CeldaVar nombre={s.n} unidad={cc.unidad} info={<BotonInfo id={s.id} />}
        extra={<>{rango(st, cc.v)}{!aplica && !grupoSinMoneda && <small className="c-per">la moneda no aplica a esta variable</small>}</>} /><CeldasStats m={m} c={cc} st={st} cols={cols} />
        <td><div className="spark"><Sparkline v={cc.v.slice(0, paPres.i1 + 1)} color={paPres.color} desde={paBi} /></div></td>
        <td className="pres-estrella-celda"><Estrella activa={idsMis.has(s.id)} nombre={s.n} deshabilitada={!idsMis.has(s.id) && mis.length >= 10}
          onClick={() => sacarOPoner({ id: s.id, med: mo0(s, paMed), rel: null, modo: "compra", esc: "" })} /></td></tr>,
    ));
  });

  const columnas = <div className="controls"><label>Columnas</label><Seg valor={new Set(cols.map((x) => x[0]))} opciones={COLS} onElegir={(v) => set({ cl: [...alternar(new Set(cols.map((x) => x[0])), v)].join(",") })} /></div>;
  const enEdicion = editando || mis.length === 0;   // sin variables propias, se abre directo en modo edición

  return (
    <section>
      <Capitulo id="pres-grilla" titulo="Todos los presidentes, de un vistazo" bajada="Cómo cambió cada dato clave en cada mandato. Tocá una celda para ver el dato."
        acciones={<BotonCompartir className="btn" titulo="Primero los Datos: datos clave por presidente" href={() => window.location.href} deshabilitado={grilla.filas.length === 0}
          title="Armar una imagen de esta grilla para compartir" aria-label="Compartir como imagen: todos los presidentes, de un vistazo"
          crearVista={() => ({ tipo: "grilla", calor, base: b })}><IconoCompartir />Compartir</BotonCompartir>}>
        <LineaInicio info={info} F={F} />
        <label className="comp-marca pres-colores"><input type="checkbox" checked={calor} onChange={(ev) => set({ gc: ev.target.checked ? null : "0" })} /> Colores</label>
        <GrillaPresidentes grilla={grilla} calor={calor} />
      </Capitulo>
      <Capitulo id="pres-variable" titulo="Una variable, todos los presidentes" bajada={bajadaB} acciones={compartirB}>
        <div className="pres-controles">
          <VentanaConfig etiqueta={<span className="pres-pil-var"><b>{c.corto}</b>{medidaB ? <span> · {medidaB}</span> : null}</span>} titulo="Variable y cómo verla">
            <FilaVariable e={eB} onChange={(e) => e && set({ pv: encExpr(e) })} />
          </VentanaConfig>
          <BotonInfo id={eB.id} />
          <button type="button" className="vistabar-ajustes" aria-haspopup="dialog" aria-label={`Ajustes: ${resumenB}`} onClick={() => setHoja(true)}><IconoAjustes /><span>Ajustes</span></button>
        </div>
        <p className="pres-resumen pres-resumen-b">{resumenB}</p>
        <HojaListo titulo="Ajustes" abierta={hoja} onCerrar={() => setHoja(false)}>
          {(cerrar) => (
            <>
              <div className="pres-hoja-sec">
                <div className="pres-hoja-acciones">
                  <button type="button" className="btn" onClick={() => set({ pr: null })}>Todos</button>
                  <button type="button" className="btn" onClick={() => set({ pr: "ninguno" })}>Ninguno</button>
                </div>
                <Seg valor={presSel} opciones={PRES.map((x) => [x.id, x.n] as [string, string])} onElegir={cambiarPres} />
              </div>
              <div className="pres-hoja-sec">
                <LineaInicio info={info} F={F} />
              </div>
              <div className="pres-aj-sec">
                <span className="pres-aj-rot">Vista</span>
                <FilaChips etiqueta="Vista" opciones={[["tabla", "Tabla"], ["velas", "Velas"]]} valor={vista} onElegir={(v) => set({ pvista: v === "tabla" ? null : v })} />
              </div>
              {vista === "tabla" && opcionesExtras.length > 0 && (
                <div className="pres-aj-sec">
                  <span className="pres-aj-rot">Sumar columnas</span>
                  <FilaChips etiqueta="Más columnas" opciones={opcionesExtras} valor={new Set(T.elegidas)} onElegir={tocarColumna} />
                </div>
              )}
            </>
          )}
        </HojaListo>
        <div className="pres-cuerpo">
        {vista === "tabla" ? (
          T.filas.length ? (
            <TablaMandatos etiqueta={`${c.corto} por presidente`} filas={T.filas} columnas={T.columnas} visibles={T.visibles} extras={T.extras}
              elegidas={T.elegidas} nota={notaB} />
          ) : <p className="note">Ningún presidente elegido tiene datos de esta variable.</p>
        ) : !niv ? (
          <p className="note">En montos corrientes los valores de épocas distintas no se pueden poner en una misma escala (hay inflación de por medio). Elegí una medida real o un índice, o mirá la vista Tabla, que compara las variaciones.</p>
        ) : velas.length ? (
          <>
            <Velas velas={velas} sinDatos={velasSin} unidad={c.unidad} minEscala={m.fmtC(c, Math.min(...velas.map((v) => v.min)))} maxEscala={m.fmtC(c, Math.max(...velas.map((v) => v.max)))} />
            <p className="pres-nota">Unidad: {c.unidad}. Verde = mejoró y rojo = empeoró entre el inicio y el cierre del mandato; el signo del cambio también está escrito.</p>
          </>
        ) : <p className="note">Ningún presidente elegido tiene datos de esta variable.</p>}
        </div>
      </Capitulo>
      {/* R11: el Compartir de Mis variables va arriba a la derecha del capítulo, no debajo de la tabla */}
      <Capitulo id="pres-uno" titulo="Un presidente, todas las variables" acciones={paPres && modoA === "mis" && !enEdicion && mis.length > 0
        ? <BotonCompartir className="compartir" titulo={`Primero los Datos: ${paPres.n}`} href={() => window.location.href}
            title="Armar una imagen de estas variables para compartir" aria-label={`Compartir como imagen: ${paPres.n}, variables elegidas`}
            crearVista={() => ({ tipo: "variables", presId: paPres.id, exprs: mis, base: b })}><IconoCompartir />Compartir</BotonCompartir>
        : undefined}>
        <div className="pres-controles">
          <Selector etiqueta="Presidente" valor={paPres.id} opciones={PRES.slice().reverse().map((x) => [x.id, x.n] as [string, string])} onElegir={(v) => set({ pap: v === "milei" ? null : v })} />
          <button type="button" className="vistabar-ajustes" aria-haspopup="dialog" aria-label={`Ajustes: ${modoA === "mis" ? "Mis variables" : "todas las variables"}`} onClick={() => setHojaA(true)}><IconoAjustes /><span>Ajustes</span></button>
        </div>
        <HojaListo titulo="Ajustes" abierta={hojaA} onCerrar={() => setHojaA(false)}>
          {() => (
            <>
              <div className="pres-aj-sec">
                <span className="pres-aj-rot">Variables</span>
                <Seg valor={modoA} opciones={[["todas", "Todas"], ["mis", "Mis variables"]]} onElegir={(v) => set({ pam2: v === "todas" ? null : v, ...(v === "mis" && !misPedidas.length ? { pav: recomendadas.map((e) => encExpr(e)).join(",") } : {}) })} />
              </div>
              {modoA === "todas" && (
                <>
                  <div className="pres-aj-sec">
                    <span className="pres-aj-rot">Moneda</span>
                    <Selector etiqueta="Medida" valor={paMed} opciones={medsArs.map((o) => [o[0], o[1]] as [string, string])} onElegir={(v) => set({ pam: paramSi(v, "real", medPref) })} />
                    <p className="note">La moneda cambia los montos en pesos y en dólares. Un índice de precios muestra cuánto subió en el mandato: en pesos reales, contra la inflación general; en corrientes, tal cual. Los porcentajes, las tasas y las cantidades no dependen de la moneda: la tabla lo avisa.</p>
                  </div>
                  <div className="pres-aj-sec">
                    <span className="pres-aj-rot">Tipo de variable</span>
                    <Selector etiqueta="Tipo de variable" valor={tipo} opciones={[["", "Todos los tipos"], ...GRUPOS.map((g) => [g, g] as [string, string])]} onElegir={setTipo} />
                  </div>
                </>
              )}
              <div className="pres-aj-sec">{columnas}</div>
            </>
          )}
        </HojaListo>
        {modoA === "todas" && (
          <div className="pres-busca">
            <input type="search" aria-label="Buscar variable" placeholder="Buscar variable: asado, reservas, alquiler…" value={buscar} onChange={(ev) => setBuscar(ev.target.value)} />
            <button type="button" className="btn" onClick={() => setAbiertos(todosAbiertos ? new Set() : new Set(GRUPOS))}>{todosAbiertos ? "Contraer todas" : "Expandir todas"}</button>
          </div>
        )}
        <LineaInicio info={info} F={F} texto={textoPaPres} sinAviso />
        <ContextoMandato m={m} pres={paPres} />
        {modoA === "mis" ? (
          <>
            <p className="note">Hasta 10 variables de cualquier categoría. El minigráfico va desde el inicio del mandato de {paPres.n} ({fmtMes(F[paBi])}) hasta el cierre.{misPedidas.length ? "" : " Arrancás con las recomendadas de cada tema; cambialas, quitalas o agregá otras."}</p>
            <div className="tablewrap fija"><table>
              <thead><tr><th>Variable</th>{!enEdicion && <Cabecera cols={cols} ord={{ k: null, d: -1 }} onOrden={() => {}} />}{!enEdicion && <th>Mandato</th>}{!enEdicion && <th><span className="sr-solo">Mis variables</span></th>}</tr></thead>
              <tbody>{mis.map((e, k) => {
                const cc = m.calc(e), st = statsMandato(F, cc.v, paPres, b);
                if (enEdicion) return (
                  <tr key={k + e.id}>
                    <td className="nombre c-mis">
                      <RenglonVariable e={e} sinRel quitable onChange={(ne) => setMis(ne ? mis.map((x, j) => (j === k ? ne : x)) : mis.filter((_, j) => j !== k))}
                        onMover={(d) => mover(k, d)} puedeSubir={k > 0} puedeBajar={k < mis.length - 1} />
                    </td>
                  </tr>
                );
                return (
                  <tr key={k + e.id}>
                    <CeldaVar nombre={cc.corto} unidad={cc.unidad} info={<BotonInfo id={e.id} />} extra={rango(st, cc.v)} />
                    <CeldasStats m={m} c={cc} st={st} cols={cols} />
                    <td><div className="spark"><Sparkline v={cc.v.slice(0, paPres.i1 + 1)} color={paPres.color} desde={paBi} /></div></td>
                    <td className="pres-estrella-celda"><Estrella activa nombre={cc.corto} onClick={() => setMis(mis.filter((_, j) => j !== k))} /></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
            {enEdicion && mis.length < 10 && <div className="sigue-tabla"><FilaVariable e={null} agregable textoAgregar="+ Agregar variable" onChange={(e) => e && setMis([...mis, e])} /></div>}
            <div className="controls sigue-tabla">
              {enEdicion
                ? <button type="button" className="btn primario" onClick={() => setEditando(false)}>Guardar</button>
                : <button type="button" className="btn" onClick={() => setEditando(true)}>Editar mis variables</button>}
            </div>
          </>
        ) : (
        <div className="tablewrap fija"><table>
          <thead><tr><th>Variable</th><Cabecera cols={cols} ord={ordA} onOrden={(k) => setOrdA(siguienteOrden(ordA, k))} /><th>Mandato</th><th><span className="sr-solo">Mis variables</span></th></tr></thead>
          <tbody>
            {filasA}
            {!total && <tr><td colSpan={nc} style={{ textAlign: "center", color: "var(--text-muted)" }}>Ninguna variable coincide con &quot;{buscar}&quot;.</td></tr>}
          </tbody>
        </table></div>
        )}
      </Capitulo>
      {metas.length === 0 && <Fragment />}
    </section>
  );
}
/** Medida con que se calcula una serie en la tabla "Todas" (la elegida, o la que corresponde si la moneda no le aplica). */
const mo0 = (s: Parameters<typeof monedaEnSerie>[0], med: string) => monedaEnSerie(s, med).med;
function alternar2(s: Set<string>, g: string): Set<string> { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; }
void unoDe;
