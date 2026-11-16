"use client";
// Predicciones (/predicciones/, docs/specs/predicciones.md): cuánto cree la gente que va a dar la inflación del mes, contra lo que esperan los analistas
// (REM del Banco Central) y el dato real. Sin cuentas ni ranking: cada uno ve su propia predicción, guardada en su navegador.
// Lo estático (rondas, REM, dato real) sale de `predicciones.json`; lo de la gente, de /api/ (solo en el sitio publicado y con funciones).
// Sin ese servicio la página muestra lo estático y avisa que lo de la gente no está disponible. Diferencias con signo: sin «ganó» ni «acertó» (D-012).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Cargando } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { contarCompartir } from "@/lib/conteo";
import { nf0, nf1 } from "@/lib/formato";
import {
  claveTurnstile, difConSigno, difPalabras, dif, enviarPrediccion, errorMedio, estadoRonda, guardarRonda, leerGuardado, leerValor, MIN_MEDIANA, pedirLista, pedirResumen,
  prediccionesDisponibles, rondaAbierta, rondasCerradas, RUTA_PREDICCIONES, usePredicciones, VALOR_MAX, VALOR_MIN, votanteDe,
  type FilaGente, type Guardado, type Predicciones as DatosPred, type Ronda, type Resumen,
} from "@/lib/predicciones";

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const NBSP = " ";
const pct = (v: number) => `${nf1.format(v)}${NBSP}%`;
const mesDe = (periodo: string) => MESES_LARGOS[+periodo.slice(5, 7) - 1];
const mesAnio = (periodo: string) => `${mesDe(periodo)} ${periodo.slice(0, 4)}`;
const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "2026-12-11T16:00-03:00" → { fecha: "jueves 11 de diciembre", hora: "16:00", dia: "2026-12-11" } (la hora ya viene en hora argentina). */
function cierreTxt(iso: string | null): { fecha: string; hora: string; dia: string } | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(iso) : null;
  if (!m) return null;
  const dia = DIAS[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
  return { fecha: `${dia} ${+m[3]} de ${MESES_LARGOS[+m[2] - 1]}`, hora: m[4], dia: `${m[1]}-${m[2]}-${m[3]}` };
}
const fechaCorta = (f: string) => { const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(f); return m ? `${+m[2]} de ${MESES_LARGOS[+m[1] - 1]}` : f; };

// ------------------------------------------------------------ Turnstile (el script se carga solo al enfocar el campo o tocar Predecir)
interface TurnstileApi {
  render(el: HTMLElement, o: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id?: string): void;
}
declare global { interface Window { turnstile?: TurnstileApi } }
let scriptTurnstile: Promise<TurnstileApi> | null = null;
function cargarTurnstile(): Promise<TurnstileApi> {
  if (!scriptTurnstile) {
    scriptTurnstile = new Promise<TurnstileApi>((ok, mal) => {
      if (window.turnstile) return ok(window.turnstile);
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => (window.turnstile ? ok(window.turnstile) : mal(new Error("sin turnstile")));
      s.onerror = () => mal(new Error("no cargó turnstile"));
      document.head.appendChild(s);
    }).catch((e) => { scriptTurnstile = null; throw e; });
  }
  return scriptTurnstile;
}

// ------------------------------------------------------------ Página
export function Predicciones() {
  const { datos, error } = usePredicciones();
  if (error) return <div className="pred-error"><p className="error" role="alert">{error}</p><p className="note">El resto del sitio sigue funcionando. Probá de nuevo en un rato.</p></div>;
  if (!datos) return <Cargando texto="Cargando las predicciones…" />;
  if (!datos.rondas.length) return <p className="note pred-vacio">Todavía no hay rondas de predicciones.</p>;
  return <Cuerpo datos={datos} />;
}

function Cuerpo({ datos }: { datos: DatosPred }) {
  const [ahora, setAhora] = useState(() => Date.now());
  const abierta = rondaAbierta(datos, ahora);
  const cerradas = useMemo(() => rondasCerradas(datos, ahora), [datos, ahora]);
  const esperando = cerradas.find((r) => estadoRonda(r, ahora) === "esperando") ?? null;
  const ultima = cerradas.find((r) => r.real != null) ?? null;
  const [disp, setDisp] = useState<boolean | null>(null);        // ¿hay servicio de predicciones? (null: todavía no se sabe)
  const [lista, setLista] = useState<FilaGente[] | null | undefined>(undefined); // undefined: cargando · null: no disponible
  const [guardado, setGuardado] = useState<Record<string, Guardado>>({});
  useEffect(() => {
    setGuardado(leerGuardado());
    setDisp(prediccionesDisponibles());
    let vivo = true;
    pedirLista().then((l) => { if (vivo) setLista(l); });
    return () => { vivo = false; };
  }, []);
  const gente = useCallback((id: string) => lista?.find((f) => f.ronda === id) ?? null, [lista]);
  const referencia = ultima ?? cerradas.find((r) => r.real != null) ?? null;

  return (
    <section className="pred">
      {esperando && (
        <Capitulo id="pred-cerrada" titulo={`${mayus(mesAnio(esperando.periodo))}: se cerró`}>
          <Esperando r={esperando} gente={gente(esperando.id)} servicio={lista} />
        </Capitulo>
      )}
      {ultima && (
        <Capitulo id="pred-resultado" titulo={`${mayus(mesAnio(ultima.periodo))}: el resultado`}>
          <Resultado r={ultima} gente={gente(ultima.id)} tu={guardado[ultima.id]?.valor ?? null} />
        </Capitulo>
      )}
      {abierta && (
        <Capitulo id="pred-abierta" titulo={`¿Cuánto va a dar la inflación de ${mesAnio(abierta.periodo)}?`}
          bajada={cierreBajada(abierta)}>
          <RondaAbierta r={abierta} referencia={referencia} disp={disp} guardado={guardado[abierta.id]}
            onGuardado={(g) => setGuardado((x) => ({ ...x, [abierta.id]: g }))} onCerrada={() => {
              // 409: el servidor dice que cerró. Se adelanta el reloj de la página hasta el cierre (por si el del navegador va atrasado), sin recargar.
              const c = abierta.cierra ? Date.parse(abierta.cierra) : NaN;
              if (Number.isFinite(c)) setAhora(Math.max(Date.now(), c)); else window.location.reload();
            }} />
        </Capitulo>
      )}
      {!abierta && !esperando && !ultima && <p className="note pred-vacio">Por ahora no hay una ronda abierta. La próxima abre cuando el INDEC publique la inflación del mes.</p>}
      <Capitulo id="pred-historia" titulo="Historia" bajada="Una fila por ronda cerrada: lo que esperaba la gente, lo que esperaban los analistas del REM y el dato real. Las diferencias llevan signo: más o menos que el dato real, en puntos porcentuales (p.p.).">
        <Historia cerradas={cerradas} lista={lista} guardado={guardado} />
      </Capitulo>
      <section className="pred-pie" aria-label="De dónde sale cada cosa">
        <h2 className="pred-pie-titulo">De dónde sale cada cosa</h2>
        <p className="note">
          El dato real y su fecha de publicación son los del INDEC. El REM es el Relevamiento de Expectativas de Mercado del Banco Central: la mediana de lo que esperan los analistas.
          Las predicciones de la gente se guardan sin tu nombre, sin tu IP y sin cookies; cada navegador tiene un código distinto por ronda, que no une una ronda con otra.
        </p>
      </section>
    </section>
  );
}

function cierreBajada(r: Ronda): string {
  const c = cierreTxt(r.cierra);
  return c ? `El INDEC la publica el ${c.fecha} a las ${c.hora}. Podés cambiar tu predicción hasta entonces.`
    : "Todavía no se conoce la fecha en que la publica el INDEC. Podés cambiar tu predicción hasta que salga.";
}

// ------------------------------------------------------------ Ronda abierta
function RondaAbierta({ r, referencia, disp, guardado, onGuardado, onCerrada }: {
  r: Ronda; referencia: Ronda | null; disp: boolean | null; guardado?: Guardado; onGuardado: (g: Guardado) => void; onCerrada: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [resumen, setResumen] = useState<Resumen | null | undefined>(undefined); // undefined: cargando · null: no disponible
  const [sinAlmacen, setSinAlmacen] = useState(false);
  const mostrar = !editando && !!guardado && (guardado.valor != null || guardado.visto);
  const tu = guardado?.valor ?? null;

  useEffect(() => {
    if (!mostrar || disp === null) return;
    let vivo = true;
    if (!disp) { setResumen(null); return; }
    pedirResumen(r.id).then((s) => { if (vivo) setResumen((x) => s ?? x ?? null); });
    return () => { vivo = false; };
  }, [mostrar, disp, r.id]);

  const verSin = () => {
    const g: Guardado = { votante: votanteDe(r.id), valor: tu, visto: true };
    guardarRonda(r.id, g); onGuardado(g);
  };
  const enviado = (valor: number, s: Resumen, votante: string) => {
    const g: Guardado = { votante, valor, visto: false };
    if (!guardarRonda(r.id, g)) setSinAlmacen(true);
    onGuardado(g); setResumen(s); setEditando(false);
  };

  if (disp === null) return null;
  return (
    <div className="pred-ronda">
      {!mostrar && (disp
        ? <Formulario r={r} referencia={referencia} inicial={tu} onEnviado={enviado} onCerrada={onCerrada} onVerSin={verSin} />
        : <p className="note pred-aviso" role="status">Las predicciones no están disponibles ahora; el REM y la historia sí.</p>)}
      {!mostrar && !disp && <Analistas r={r} />}
      {mostrar && (
        <>
          <Gente resumen={resumen} tu={tu} />
          <Analistas r={r} />
          <div className="pred-bloque">
            <h3 className="pred-sub">Tu predicción</h3>
            {editando ? (
              <Formulario r={r} referencia={referencia} inicial={tu} onEnviado={enviado} onCerrada={onCerrada} onCancelar={() => setEditando(false)} />
            ) : (
              <div className="pred-tu">
                {tu != null ? <b className="pred-num">{pct(tu)}</b> : <span className="note">Todavía no predijiste.</span>}
                {disp && <button type="button" className="chip-c" onClick={() => setEditando(true)}>{tu != null ? "Cambiar" : "Predecir"}</button>}
              </div>
            )}
            {sinAlmacen && <p className="note" role="status">Tu navegador no dejó guardar la predicción: cuenta igual, pero no la vamos a recordar cuando cierres esta pestaña.</p>}
          </div>
          <Compartir r={r} resumen={resumen} />
        </>
      )}
    </div>
  );
}

function Formulario({ r, referencia, inicial, onEnviado, onCerrada, onVerSin, onCancelar }: {
  r: Ronda; referencia: Ronda | null; inicial: number | null;
  onEnviado: (valor: number, s: Resumen, votante: string) => void; onCerrada: () => void; onVerSin?: () => void; onCancelar?: () => void;
}) {
  const [texto, setTexto] = useState(inicial != null ? nf1.format(inicial) : "");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [estado, setEstado] = useState<"quieto" | "verificando" | "enviando">("quieto");
  const contRef = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const espera = useRef(false);
  const enviarRef = useRef<() => void>(() => {});
  const api = useRef<TurnstileApi | null>(null);
  const idCampo = `pred-valor-${r.id}`;

  const preparar = useCallback(() => {
    if (widget.current !== null || api.current) return;
    const clave = claveTurnstile();
    if (!clave) return;
    cargarTurnstile().then((t) => {
      if (!contRef.current || widget.current !== null) return;
      api.current = t;
      widget.current = t.render(contRef.current, {
        sitekey: clave, appearance: "interaction-only", theme: "auto", size: "flexible",
        callback: (tok: string) => { token.current = tok; if (espera.current) { espera.current = false; enviarRef.current(); } },
        "expired-callback": () => { token.current = null; },
        "error-callback": () => {
          token.current = null;
          if (espera.current) { espera.current = false; setEstado("quieto"); setAviso("No pudimos verificar que no seas un robot. Probá de nuevo."); }
        },
      });
    }).catch(() => {
      if (espera.current) { espera.current = false; setEstado("quieto"); setAviso("No pudimos verificar que no seas un robot. Probá de nuevo."); }
    });
  }, []);
  useEffect(() => () => {
    try { if (api.current && widget.current !== null) api.current.remove(widget.current); } catch { /* el widget ya no está */ }
    widget.current = null; api.current = null; token.current = null; espera.current = false;
  }, []);

  const mandar = async (valor: number) => {
    setEstado("enviando");
    const votante = votanteDe(r.id);
    const res = await enviarPrediccion({ ronda: r.id, votante, valor, token: token.current ?? "" });
    token.current = null;
    try { if (api.current) api.current.reset(widget.current ?? undefined); } catch { /* sin widget */ }
    if (res.ok) { onEnviado(valor, res.resumen, votante); return; }
    setEstado("quieto");
    if (res.error === "cerrada") { onCerrada(); return; }
    setAviso(res.error === "verificacion" ? "No pudimos verificar que no seas un robot. Probá de nuevo."
      : res.error === "invalido" ? (res.texto || "No se pudo guardar esa predicción.")
      : "Las predicciones no están disponibles ahora; el REM y la historia sí.");
  };

  const enviar = () => {
    setAviso(null);
    const v = leerValor(texto);
    if ("error" in v) { setError(v.error); return; }
    setError(null);
    if (token.current) { void mandar(v.valor); return; }
    espera.current = true; setEstado("verificando"); preparar();
  };
  enviarRef.current = () => {
    const v = leerValor(texto);
    if ("valor" in v) void mandar(v.valor);
    else { setEstado("quieto"); setError(v.error); }
  };

  const paso = (d: number) => {
    const v = leerValor(texto);
    const base = "valor" in v ? v.valor : referencia?.real ?? 0;
    const n = Math.min(VALOR_MAX, Math.max(VALOR_MIN, Math.round((base + d) * 10) / 10)) || 0;
    setTexto(nf1.format(n)); setError(null); preparar();
  };
  const ocupado = estado !== "quieto";

  return (
    <form className="pred-form" noValidate onSubmit={(e) => { e.preventDefault(); if (!ocupado) enviar(); }}>
      <label className="pred-label" htmlFor={idCampo}>Tu predicción de inflación mensual, en %</label>
      <div className="pred-campo">
        <button type="button" className="chip-c pred-paso" aria-label="Restar 0,1" onClick={() => paso(-0.1)} disabled={ocupado}>−</button>
        <input id={idCampo} className="pred-input" type="text" inputMode="decimal" autoComplete="off" placeholder="2,0" value={texto} disabled={ocupado}
          aria-invalid={error ? true : undefined} aria-describedby={error ? `${idCampo}-e` : referencia ? `${idCampo}-r` : undefined}
          onFocus={preparar} onChange={(e) => { setTexto(e.target.value); setError(null); }} />
        <button type="button" className="chip-c pred-paso" aria-label="Sumar 0,1" onClick={() => paso(0.1)} disabled={ocupado}>+</button>
        <button type="submit" className="btn primario pred-enviar" disabled={ocupado}>{estado === "enviando" ? "Enviando…" : estado === "verificando" ? "Verificando…" : inicial != null ? "Guardar" : "Predecir"}</button>
        {onCancelar && <button type="button" className="chip-c" onClick={onCancelar} disabled={ocupado}>Cancelar</button>}
      </div>
      {error && <p className="error pred-msj" id={`${idCampo}-e`} role="alert">{error}</p>}
      {!error && referencia?.real != null && <p className="note pred-msj" id={`${idCampo}-r`}>Última publicada, {mayus(mesDe(referencia.periodo))}: {pct(referencia.real)}</p>}
      <div ref={contRef} className="pred-turnstile" />
      <p className="pred-estado note" role="status" aria-live="polite">{estado === "verificando" ? "Verificando que no seas un robot…" : aviso ?? ""}</p>
      {onVerSin && <button type="button" className="pred-ver-sin" onClick={onVerSin}>Ver sin predecir</button>}
    </form>
  );
}

// ------------------------------------------------------------ Bloques de cifras
function Gente({ resumen, tu }: { resumen: Resumen | null | undefined; tu: number | null }) {
  return (
    <div className="pred-bloque" aria-live="polite">
      <h3 className="pred-sub">La gente</h3>
      {resumen === undefined ? <p className="note">Cargando lo que predijo la gente…</p>
        : resumen === null ? <p className="note" role="status">Lo que predijo la gente no está disponible ahora.</p>
        : resumen.mediana == null ? <p className="note">Todavía son {nf0.format(resumen.n)}: la mediana se muestra desde {MIN_MEDIANA}.</p>
        : (
          <>
            <p className="pred-cifra"><b className="pred-num">{pct(resumen.mediana)}</b> <span className="note">mediana de {nf0.format(resumen.n)} predicciones</span></p>
            {resumen.p25 != null && resumen.p75 != null && <p className="note">La mitad del medio está entre {pct(resumen.p25)} y {pct(resumen.p75)}.</p>}
            {resumen.histograma && resumen.histograma.length > 0 && <Histograma datos={resumen.histograma} tu={tu} />}
          </>
        )}
    </div>
  );
}

function Analistas({ r }: { r: Ronda }) {
  const rem = r.rem;
  return (
    <div className="pred-bloque">
      <h3 className="pred-sub">Los analistas (REM)</h3>
      {rem ? (
        <>
          <p className="pred-cifra"><b className="pred-num">{pct(rem.mediana)}</b> <span className="note">mediana del REM para {mesAnio(r.periodo)}</span></p>
          {rem.relevamiento && <p className="note">Relevamiento del {fechaCorta(rem.relevamiento)}{rem.n ? ` (${nf0.format(rem.n)} analistas)` : ""}.</p>}
        </>
      ) : <p className="note">El REM no tiene ese mes.</p>}
    </div>
  );
}

/** Barras de a 0,1 p.p. (SVG simple con los colores del sistema). Una barra por valor, desde el más bajo hasta el más alto. */
function Histograma({ datos, tu }: { datos: [number, number][]; tu: number | null }) {
  const claves = datos.map(([v]) => Math.round(v * 10)), min = Math.min(...claves), max = Math.max(...claves);
  const n = max - min + 1, cant = new Map(claves.map((k, i) => [k, datos[i][1]])), tope = Math.max(...datos.map((d) => d[1]));
  const kTu = tu != null ? Math.round(tu * 10) : null;
  const AL = 80, ANCHO = 6;
  const barras = [];
  for (let k = min; k <= max; k++) {
    const c = cant.get(k) ?? 0;
    if (!c && k !== kTu) continue;
    const h = Math.max(2, Math.round((c / tope) * AL));
    barras.push(<rect key={k} className={k === kTu ? "pred-barra pred-barra-tu" : "pred-barra"} x={(k - min) * ANCHO} y={AL - h} width={ANCHO - 1} height={h} />);
  }
  const total = datos.reduce((s, d) => s + d[1], 0);
  return (
    <figure className="pred-hist">
      <svg viewBox={`0 0 ${n * ANCHO} ${AL}`} preserveAspectRatio="none" role="img"
        aria-label={`Histograma de ${nf0.format(total)} predicciones, entre ${pct(min / 10)} y ${pct(max / 10)}; el valor más elegido tiene ${nf0.format(tope)}.`}>
        {barras}
      </svg>
      <figcaption className="pred-hist-eje"><span>{pct(min / 10)}</span><span className="note">cada barra, 0,1 p.p.{kTu != null && kTu >= min && kTu <= max ? "; la tuya, destacada" : ""}</span><span>{pct(max / 10)}</span></figcaption>
    </figure>
  );
}

// ------------------------------------------------------------ Compartir
function Compartir({ r, resumen }: { r: Ronda; resumen: Resumen | null | undefined }) {
  const [aviso, setAviso] = useState("");
  const mes = mesDe(r.periodo);
  const texto = useMemo(() => {
    const partes: string[] = [];
    if (resumen?.mediana != null) partes.push(`La gente espera ${pct(resumen.mediana)} de inflación para ${mes}`);
    if (r.rem) partes.push(`${partes.length ? "los analistas del REM" : `Los analistas del REM esperan ${pct(r.rem.mediana)} de inflación para ${mes}`}${partes.length ? `, ${pct(r.rem.mediana)}` : ""}`);
    const base = partes.length ? `${partes.join("; ")}.` : `¿Cuánto va a dar la inflación de ${mes}?`;
    return `${base} ¿Vos? primerolosdatos.com.ar${RUTA_PREDICCIONES}`;
  }, [resumen, r.rem, mes]);
  const copiar = async (que: string, accion: "texto" | "link_copiado") => {
    try { await navigator.clipboard.writeText(que); setAviso("Copiado."); contarCompartir({ accion, dato: "prediccion", href: RUTA_PREDICCIONES }); }
    catch { setAviso("No se pudo copiar: seleccionalo y copialo a mano."); }
  };
  return (
    <div className="pred-bloque">
      <h3 className="pred-sub">Compartir</h3>
      <p className="pred-texto-comp">{texto}</p>
      <div className="pred-acciones">
        <button type="button" className="chip-c" onClick={() => void copiar(texto, "texto")}>Copiar texto</button>
        <button type="button" className="chip-c" onClick={() => void copiar(`https://primerolosdatos.com.ar${RUTA_PREDICCIONES}`, "link_copiado")}>Copiar link</button>
      </div>
      <p className="note" role="status" aria-live="polite">{aviso}</p>
    </div>
  );
}

// ------------------------------------------------------------ Cerrada y resultado
function Esperando({ r, gente, servicio }: { r: Ronda; gente: FilaGente | null; servicio: FilaGente[] | null | undefined }) {
  const c = cierreTxt(r.cierra);
  const dHoy = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10); // hoy en hora argentina (UTC−3), como c.dia
  return (
    <div className="pred-ronda">
      <p>{c && c.dia === dHoy ? `Se cerró. El INDEC publicó hoy a las ${c.hora} y el dato entra al sitio en unos minutos.`
        : c ? `Se cerró. El INDEC publicó el ${c.fecha} a las ${c.hora}; el dato entra al sitio en la próxima actualización.` : "Se cerró. El dato entra al sitio cuando lo publica el INDEC."}</p>
      <div className="pred-bloque">
        <h3 className="pred-sub">La gente</h3>
        {servicio === undefined ? <p className="note">Cargando lo que predijo la gente…</p>
          : servicio === null ? <p className="note" role="status">Lo que predijo la gente no está disponible ahora.</p>
          : gente?.mediana != null ? <p className="pred-cifra"><b className="pred-num">{pct(gente.mediana)}</b> <span className="note">mediana final de {nf0.format(gente.n)} predicciones</span></p>
          : <p className="note">{gente ? `Fueron ${nf0.format(gente.n)}: la mediana se muestra desde ${MIN_MEDIANA}.` : "Nadie predijo en esta ronda."}</p>}
      </div>
      <Analistas r={r} />
    </div>
  );
}

function Resultado({ r, gente, tu }: { r: Ronda; gente: FilaGente | null; tu: number | null }) {
  if (r.real == null) return null;
  const real = r.real;
  return (
    <p className="pred-resultado">
      {mayus(mesAnio(r.periodo))}: dio <b>{pct(real)}</b>.
      {gente?.mediana != null && <> La gente esperaba {pct(gente.mediana)} ({difPalabras(gente.mediana, real)}){r.rem ? "; el REM, " : "."}</>}
      {r.rem ? <>{gente?.mediana != null ? "" : " El REM esperaba "}{pct(r.rem.mediana)} ({difPalabras(r.rem.mediana, real)}).</> : null}
      {tu != null && <> Vos dijiste {pct(tu)} ({difPalabras(tu, real)}).</>}
    </p>
  );
}

// ------------------------------------------------------------ Historia
function Historia({ cerradas, lista, guardado }: { cerradas: Ronda[]; lista: FilaGente[] | null | undefined; guardado: Record<string, Guardado> }) {
  const filas = cerradas.filter((r) => r.real != null);
  if (!filas.length) return <p className="note">Todavía no hay rondas cerradas con dato publicado.</p>;
  const gen = (id: string) => lista?.find((f) => f.ronda === id) ?? null;
  const conAmbas = filas.filter((r) => r.rem && gen(r.id)?.mediana != null);
  const paresGente = conAmbas.map((r) => ({ esperado: gen(r.id)!.mediana!, real: r.real! }));
  const paresRem = conAmbas.map((r) => ({ esperado: r.rem!.mediana, real: r.real! }));
  const soloRem = filas.filter((r) => r.rem).map((r) => ({ esperado: r.rem!.mediana, real: r.real! }));
  const mG = errorMedio(paresGente), mR = errorMedio(paresRem), mS = errorMedio(soloRem);
  return (
    <>
      {mG != null && mR != null ? (
        <p className="pred-mae">Error medio absoluto en {conAmbas.length === 1 ? "la ronda" : `las ${conAmbas.length} rondas`} que tienen las dos cifras: la gente, <b>{nf1.format(mG)} p.p.</b>; el REM, <b>{nf1.format(mR)} p.p.</b></p>
      ) : mS != null ? (
        <p className="pred-mae">Error medio absoluto del REM en {soloRem.length === 1 ? "el último mes" : `los últimos ${soloRem.length} meses`}: <b>{nf1.format(mS)} p.p.</b>{lista === null && <span className="note"> Lo de la gente no está disponible ahora.</span>}</p>
      ) : null}
      <div className="pred-tabla-sc" tabIndex={0} role="region" aria-label="Historia de las rondas">
        <table className="pred-tabla">
          <thead><tr><th scope="col">Mes</th><th scope="col">Dato real</th><th scope="col">La gente</th><th scope="col">REM</th><th scope="col">Vos</th></tr></thead>
          <tbody>
            {filas.map((r) => {
              const g = gen(r.id), tu = guardado[r.id]?.valor ?? null, real = r.real!;
              const celda = (v: number | null | undefined, extra?: string) => v == null ? <td className="pred-nd">–</td>
                : <td><span className="pred-v">{nf1.format(v)}</span> <small className="pred-d">{difConSigno(dif(v, real))}</small>{extra && <small className="pred-n"> {extra}</small>}</td>;
              return (
                <tr key={r.id}>
                  <th scope="row">{mayus(mesAnio(r.periodo))}</th>
                  <td><b className="pred-v">{nf1.format(real)}</b></td>
                  {celda(g?.mediana, g ? `${nf0.format(g.n)} pred.` : undefined)}
                  {celda(r.rem?.mediana)}
                  {celda(tu)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">Valores en %. En chico, debajo de cada valor, la diferencia con el dato real en p.p.: con signo + si esperaban más, − si esperaban menos.</p>
    </>
  );
}

// ------------------------------------------------------------ Línea de la ficha de la inflación mensual
/** Una línea con link mientras hay una ronda abierta (la ficha de /dato/inflacion/). No muestra nada si no hay ronda o si falla el archivo. */
export function LineaPredecir() {
  const { datos } = usePredicciones();
  const r = rondaAbierta(datos);
  if (!r) return null;
  return <p className="pred-linea note">¿Cuánto creés que va a dar la de {mesDe(r.periodo)}? <Link prefetch={false} href={RUTA_PREDICCIONES}>Predecí la inflación de {mesDe(r.periodo)}</Link></p>;
}
