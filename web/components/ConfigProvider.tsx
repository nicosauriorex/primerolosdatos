"use client";
// Contexto de la configuración global + panel (botón ⚙ y ventana). Ver docs/specs/configuracion-global.md.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Desplegable, Modal, Selector, Seg, useCerrarModal } from "./ui";
import { IconoAjustes } from "./Iconos";
import { AYUDA_F, AYUDA_IGUAL, PRES_DEF, mesF, mesMas } from "@/lib/estadisticas";
import { fmtMes } from "@/lib/formato";
import {
  CLAVE, DEFECTO, DESDES, SECCIONES_BASE, aplicaDe, aplicarColPres, DOLARES, MEDIDAS, TEMAS, T_MAX, T_MIN, TF_MAX, TF_MIN, aplicarTema, guardar, leer, txtF, txtFLargo, txtT, txtTLargo,
  type Config, type SeccionBase,
} from "@/lib/config";

interface Ctx {
  config: Config;
  /** Cambia una o más opciones, las aplica y las guarda. Sube `rev` (las secciones sacan de la URL el inicio del link). */
  cambiar: (c: Partial<Config>) => void;
  reiniciar: () => void;
  /** Cuenta los cambios hechos desde el panel en esta pestaña. */
  rev: number;
  abrirPanel: () => void;
}
const ConfigCtx = createContext<Ctx | null>(null);
export const useConfig = (): Ctx => {
  const c = useContext(ConfigCtx);
  if (!c) throw new Error("useConfig fuera de ConfigProvider");
  return c;
};

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config>(DEFECTO);
  const [guardado, setGuardado] = useState(true);
  const [rev, setRev] = useState(0);
  const [abierto, setAbierto] = useState(false);

  // Primera lectura (después de hidratar, para que servidor y cliente coincidan) y cambios desde otras pestañas.
  useEffect(() => {
    const r = leer();
    setConfig(r.config); setGuardado(r.ok); aplicarTema(r.config.tema);
    const alCambiar = (ev: StorageEvent) => {
      if (ev.key !== null && ev.key !== CLAVE) return;
      const n = leer().config;
      setConfig(n); aplicarTema(n.tema); setRev((x) => x + 1); // las secciones sacan de la URL el inicio viejo
    };
    window.addEventListener("storage", alCambiar);
    return () => window.removeEventListener("storage", alCambiar);
  }, []);

  useEffect(() => { aplicarColPres(config.colPres); }, [config.colPres]);

  const aplicar = useCallback((n: Config) => {
    setConfig(n); aplicarTema(n.tema); setGuardado(guardar(n)); setRev((x) => x + 1);
  }, []);
  const cambiar = useCallback((c: Partial<Config>) => aplicar({ ...config, ...c }), [aplicar, config]);
  const reiniciar = useCallback(() => aplicar(DEFECTO), [aplicar]);
  const abrirPanel = useCallback(() => setAbierto(true), []);

  const valor = useMemo<Ctx>(() => ({ config, cambiar, reiniciar, rev, abrirPanel }), [config, cambiar, reiniciar, rev, abrirPanel]);
  return (
    <ConfigCtx.Provider value={valor}>
      {children}
      {abierto && <Panel onCerrar={() => setAbierto(false)} guardado={guardado} />}
    </ConfigCtx.Provider>
  );
}

/** Botón de configuración del encabezado: con texto en computadora y solo el ícono (con `aria-label`) en celular. */
export function BotonConfig() {
  const { abrirPanel } = useConfig();
  return <button type="button" className="config-btn" aria-label="Configuración" onClick={abrirPanel}><IconoAjustes /><span className="solo-grande">Configurar</span></button>;
}

/** Color de fábrica de un presidente (la variable de serie de la que sale) como #rrggbb, para el selector de color. */
function colorBase(v: string): string {
  const x = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  if (/^#[0-9a-f]{6}$/i.test(x)) return x;
  return v === "--neutral" ? "" : colorBase("--neutral");   // sin color suelto: cae al gris del tema
}

const RANGO_T = Array.from({ length: T_MAX - T_MIN + 1 }, (_, i) => T_MIN + i);

function SelectT({ valor, onElegir, etiqueta, igual }: { valor: number | undefined; onElegir: (k: number | undefined) => void; etiqueta: string; igual?: string }) {
  return (
    <Selector etiqueta={etiqueta} valor={valor === undefined ? "" : String(valor)}
      opciones={[...(igual ? [["", igual] as [string, string]] : []), ...RANGO_T.map((k) => [String(k), txtTLargo(k)] as [string, string])]}
      onElegir={(v) => onElegir(v === "" ? undefined : Number(v))} />
  );
}
const RANGO_F = Array.from({ length: TF_MAX - TF_MIN + 1 }, (_, i) => TF_MIN + i);
function SelectF({ valor, onElegir, etiqueta, igual }: { valor: number | undefined; onElegir: (k: number | undefined) => void; etiqueta: string; igual?: string }) {
  return (
    <Selector etiqueta={etiqueta} valor={valor === undefined ? "" : String(valor)}
      opciones={[...(igual ? [["", igual] as [string, string]] : []), ...RANGO_F.map((k) => [String(k), txtFLargo(k)] as [string, string])]}
      onElegir={(v) => onElegir(v === "" ? undefined : Number(v))} />
  );
}
/** Desde / Hasta de un presidente: el mes real y, entre paréntesis, su T (o su F). La primera opción, «= <mes> (<T>)», es lo que da «Para todos» (corta, para que el mes se vea en el botón). */
function SelPres({ c, id, fin, onElegir }: { c: Config; id: string; fin: boolean; onElegir: (k: number | undefined) => void }) {
  const p = PRES_DEF.find((x) => x.id === id)!;
  const ancla = fin ? mesF(p) : p.ini;
  if (!ancla) return null;
  const k0 = fin ? (c.tf ?? c.t0p[id] ?? c.t0) : c.t0;
  const rango = fin ? RANGO_F : RANGO_T, txt = fin ? txtF : txtT, mes = (k: number) => fmtMes(mesMas(ancla, k));
  const valor = (fin ? c.tfp[id] : c.t0p[id]);
  return (
    <Selector etiqueta={`${fin ? "Hasta" : "Desde"} de ${p.n}`} valor={valor === undefined ? "" : String(valor)}
      opciones={[["", `= ${mes(k0)} (${txt(k0)})`], ...rango.map((k) => [String(k), `${mes(k)} (${txt(k)})`] as [string, string])]}
      onElegir={(v) => onElegir(v === "" ? undefined : Number(v))} />
  );
}
/** «Dónde»: las secciones en que vale, en un desplegable con casillas (chips). `lista` = las marcadas. */
function Donde({ lista, onCambiar, etiqueta, deshabilitado }: { lista: readonly SeccionBase[]; onCambiar: (l: SeccionBase[]) => void; etiqueta: string; deshabilitado?: boolean }) {
  if (deshabilitado) return <button type="button" className="btn drop cfgm-nulo" disabled aria-label={`${etiqueta}: sin excepción`}><span className="et">—</span></button>;
  const n = lista.length, todas = n === SECCIONES_BASE.length;
  const texto = todas ? "Todas" : n === 0 ? "Ninguna" : `${n} ${n === 1 ? "sección" : "secciones"}`;
  const poner = (l: SeccionBase[]) => onCambiar(SECCIONES_BASE.map((x) => x[0]).filter((x) => l.includes(x)));
  return (
    <Desplegable etiqueta={<><span className="sr-solo">{etiqueta}: </span>{texto}</>} className="cfgm-donde">
      <div className="cfgg-chips" role="group" aria-label={etiqueta} ref={(el) => { if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "nearest" })); }}>
        <button type="button" className="chip-c" aria-pressed={todas} onClick={() => poner(SECCIONES_BASE.map((x) => x[0]))}>Todas</button>
        {SECCIONES_BASE.map(([id, nombre]) => {
          const on = lista.includes(id);
          return <button key={id} type="button" className="chip-c" aria-pressed={on} onClick={() => poner(on ? lista.filter((x) => x !== id) : [...lista, id])}>{nombre}</button>;
        })}
      </div>
    </Desplegable>
  );
}
function Opciones<T extends string>({ etiqueta, valor, opciones, onElegir }: { etiqueta: string; valor: T; opciones: [T, string][]; onElegir: (v: T) => void }) {
  // `Seg` (R12): riel para una opción; si no entra en el renglón (Período por defecto, 7 opciones) pasa solo a píldoras sueltas
  return <Seg etiqueta={etiqueta} valor={valor} opciones={opciones} onElegir={(v) => onElegir(v as T)} />;
}

/** Una fila de ajuste (R4): rótulo arriba en el celular, a la izquierda en una columna de ancho fijo desde 600 px; el control y su aclaración al lado. */
function Fila({ rotulo, ayuda, children }: { rotulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div className="cfgg-fila">
      <span className="cfgg-rot">{rotulo}</span>
      <div className="cfgg-ctl">{children}{ayuda ? <p className="cfgg-ayuda">{ayuda}</p> : null}</div>
    </div>
  );
}
function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <section className="cfgg-grupo"><h3 className="cfgg-titulo">{titulo}</h3>{children}</section>;
}

/** Pie de la ventana (R3): "Listo" principal; cierra por el camino de Atrás. */
function PieConfig({ reiniciar }: { reiniciar: () => void }) {
  const cerrar = useCerrarModal();
  return (
    <footer className="config-pie cfgg-pie">
      <button type="button" className="btn" onClick={reiniciar}>Volver a lo de fábrica</button>
      <button type="button" className="btn primario" onClick={() => cerrar()}>Listo</button>
    </footer>
  );
}

function Panel({ onCerrar, guardado }: { onCerrar: () => void; guardado: boolean }) {
  const { config: c, cambiar, reiniciar } = useConfig();
  // Si un presidente se queda sin excepciones, su «Dónde» vuelve a «todas».
  const sinExc = (id: string, t0p: Record<string, number>, tfp: Record<string, number>) => t0p[id] == null && tfp[id] == null;
  const limpiarDonde = (id: string, t0p: Record<string, number>, tfp: Record<string, number>) => {
    const aplicaP = { ...c.aplicaP };
    if (sinExc(id, t0p, tfp)) delete aplicaP[id];
    return aplicaP;
  };
  const setPres = (id: string, k: number | undefined) => {
    const t0p = { ...c.t0p };
    if (k === undefined) delete t0p[id]; else t0p[id] = k;
    cambiar({ t0p, aplicaP: limpiarDonde(id, t0p, c.tfp) });
  };
  const setFin = (id: string, k: number | undefined) => {
    const tfp = { ...c.tfp };
    if (k === undefined) delete tfp[id]; else tfp[id] = k;
    cambiar({ tfp, aplicaP: limpiarDonde(id, c.t0p, tfp) });
  };
  const setDonde = (id: string, l: SeccionBase[]) => {
    const aplicaP = { ...c.aplicaP };
    if (l.length === SECCIONES_BASE.length) delete aplicaP[id]; else aplicaP[id] = l;
    cambiar({ aplicaP });
  };
  return (
    <Modal titulo="Configuración" cabecera="Configuración" onCerrar={onCerrar}>
      <div className="config-cuerpo cfgg-cuerpo">
        {!guardado && <p className="error" role="alert">No se pudo guardar en este navegador: se va a perder al cerrar.</p>}
        <Grupo titulo="Apariencia">
          <Fila rotulo="Tema"><Opciones etiqueta="Tema" valor={c.tema} opciones={TEMAS} onElegir={(tema) => cambiar({ tema })} /></Fila>
        </Grupo>
        <Grupo titulo="Mandatos">
          <p className="cfgg-ayuda cfgg-intro">Desde y hasta qué mes se cuenta cada mandato, y en qué secciones. {AYUDA_F} {AYUDA_IGUAL} Para el presidente en ejercicio, F es el fin previsto de su mandato ({fmtMes(mesF(PRES_DEF[PRES_DEF.length - 1]))}): mientras no haya datos hasta ese mes se cuenta hasta el último dato.</p>
          <div className="cfgg-fila cfgm-cab" aria-hidden="true">
            <span className="cfgg-rot" />
            <div className="cfgm-ctls"><span>Desde</span><span>Hasta</span><span>Dónde</span></div>
          </div>
          <div className="cfgg-fila">
            <span className="cfgg-rot">Para todos</span>
            <div className="cfgg-ctl cfgm-ctl">
              <div className="cfgm-ctls">
                <div className="cfgm-c"><span className="cfgm-et">Desde</span><SelectT valor={c.t0} etiqueta="Inicio del mandato para todos" onElegir={(k) => cambiar({ t0: k ?? DEFECTO.t0 })} /></div>
                <div className="cfgm-c"><span className="cfgm-et">Hasta</span><SelectF valor={c.tf ?? undefined} etiqueta="Fin del mandato para todos" igual="Igual que el inicio" onElegir={(k) => cambiar({ tf: k ?? null })} /></div>
                <div className="cfgm-c"><span className="cfgm-et">Dónde</span>
                  <Donde lista={c.aplica} etiqueta="Secciones donde se aplica el inicio y el fin de Para todos"
                    onCambiar={(aplica) => cambiar({ aplica })} /></div>
              </div>
              <p className="cfgg-ayuda">Una sección que no esté en «Dónde» usa lo de fábrica (T, fin igual que el inicio). En cada presidente, «=» es lo que da Para todos. Un link compartido siempre muestra lo que trae.</p>
            </div>
          </div>
          {PRES_DEF.map((p) => (
            <div key={p.id} className="cfgg-fila">
              <span className="cfgg-rot">{p.n}</span>
              <div className="cfgg-ctl cfgm-ctl">
                <div className="cfgm-ctls">
                  <div className="cfgm-c"><span className="cfgm-et">Desde</span><SelPres c={c} id={p.id} fin={false} onElegir={(k) => setPres(p.id, k)} /></div>
                  <div className="cfgm-c"><span className="cfgm-et">Hasta</span><SelPres c={c} id={p.id} fin onElegir={(k) => setFin(p.id, k)} /></div>
                  <div className="cfgm-c"><span className="cfgm-et">Dónde</span>
                    <Donde lista={aplicaDe(c, p.id)} etiqueta={`Secciones donde vale la excepción de ${p.n}`} deshabilitado={sinExc(p.id, c.t0p, c.tfp)}
                      onCambiar={(l) => setDonde(p.id, l)} /></div>
                </div>
              </div>
            </div>
          ))}
        </Grupo>
        <Grupo titulo="Datos">
          <Fila rotulo="Dólar preferido"><Opciones etiqueta="Dólar preferido" valor={c.dolar} opciones={DOLARES} onElegir={(dolar) => cambiar({ dolar })} /></Fila>
          <Fila rotulo="Medida preferida" ayuda="Para los montos en pesos, al agregar o cambiar una variable. Los dólares usan el dólar preferido.">
            <Opciones etiqueta="Medida preferida" valor={c.medida} opciones={MEDIDAS} onElegir={(medida) => cambiar({ medida })} />
          </Fila>
          <Fila rotulo="Período por defecto" ayuda={'El "Desde" de Histórico cuando el link no trae uno.'}>
            <Opciones etiqueta="Período por defecto" valor={c.desde} opciones={DESDES} onElegir={(desde) => cambiar({ desde })} />
          </Fila>
        </Grupo>
        <Grupo titulo="Presidentes en los gráficos">
          <Fila rotulo="Mostrar" ayuda="Franjas de color detrás de las líneas, una por mandato. Se pueden prender o apagar en cada gráfico; acá se elige si arrancan prendidas. Los colores se usan en todo el sitio.">
            <Opciones etiqueta="Mostrar presidentes en los gráficos" valor={c.franjas ? "si" : "no"} opciones={[["no", "No"], ["si", "Sí, en todos"]]} onElegir={(v) => cambiar({ franjas: v === "si" })} />
          </Fila>
          {PRES_DEF.map((p) => (
            <Fila key={p.id} rotulo={p.n}>
              <input type="color" className="cfgg-color" aria-label={`Color de ${p.n}`} value={c.colPres[p.id] ?? colorBase(p.color)} onChange={(ev) => cambiar({ colPres: { ...c.colPres, [p.id]: ev.target.value } })} />
            </Fila>
          ))}
          <div className="cfgg-fila cfgg-fila-sola">
            <button type="button" className="btn" disabled={!Object.keys(c.colPres).length} onClick={() => cambiar({ colPres: {} })}>Volver a los colores de fábrica</button>
          </div>
        </Grupo>
        <Grupo titulo="Compartir">
          <Fila rotulo="Preguntar por qué compartís" ayuda="Contamos cuántas veces se comparte cada dato y vista, sin guardar quién sos.">
            <Opciones etiqueta="Preguntar por qué compartís" valor={c.preguntarPorque ? "si" : "no"} opciones={[["si", "Sí"], ["no", "No"]]} onElegir={(v) => cambiar({ preguntarPorque: v === "si" })} />
          </Fila>
        </Grupo>
      </div>
      <PieConfig reiniciar={reiniciar} />
    </Modal>
  );
}
