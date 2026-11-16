"use client";
// "Cómo viene el año" de /gasto/ (vista=mes, docs/specs/gasto-nacion.md, fase 2): respuesta arriba, barras por mes y la lista de un nivel.
// Las cuentas están en lib/gasto-mensual.ts; acá solo se dibuja. Estado en la URL: vista=mes, forma, ruta, orden y todas.
// Remodelación 3.5 (docs/specs/remodelacion-herramientas.md, G): mismo tratamiento que /gasto/ (sin cajas, ajustes en una hoja, compartir en una hoja).
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { PanelGasto } from "./PanelGasto";
import { CabLista, GrupoAjuste, Migas, Opciones } from "./GastoPiezas";
import { CabeceraDato } from "./sistema/CabeceraDato";
import { Capitulo } from "./sistema/Capitulo";
import { BarraVista } from "./sistema/BarraVista";
import { FilaChips } from "./sistema/FilaChips";
import { Hoja } from "./sistema/Hoja";
import { InfoPunto } from "./sistema/InfoPunto";
import { ListaBarras, type FilaBarra } from "./sistema/ListaBarras";
import { CompartirHoja } from "./sistema/CompartirHoja";
import { ConCartel } from "./sistema/ConCartel";
import type { FormatoImg } from "@/lib/config";
import { BAJADA_FORMA, NIVELES, escribirRuta, leerRuta, nombreForma } from "@/lib/gasto";
import {
  FORMAS_M, ORDENES, ORDEN_DEFECTO, armarImagenMensual, armarMensual, esOrden, formaMDe, fraseMensual, fuenteMensual, hrefMensual, tituloMensual,
  type ArchivoMensual, type DeflactorMensual, type FilaM, type MesM, type Orden, type VistaM,
} from "@/lib/gasto-mensual";

export function GastoMensual({ ar, deflactor, p, set, periodo }: {
  ar: ArchivoMensual; deflactor: DeflactorMensual; p: URLSearchParams; set: (c: Record<string, string | null | undefined>) => void;
  /** El selector "Año completo / Cómo viene el año" (lo arma /gasto/): va debajo de la respuesta. */
  periodo?: ReactNode;
}) {
  const [imagen, setImagen] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const forma = formaMDe(ar, p.get("forma"));
  const orden: Orden = esOrden(p.get("orden")) ? (p.get("orden") as Orden) : ORDEN_DEFECTO;
  const ruta = leerRuta(p.get("ruta")), todas = p.get("todas") === "1";
  const vista = useMemo(() => armarMensual({ archivo: ar, forma, ruta, orden, deflactor, todas }),
    [ar, forma, p.get("ruta"), orden, deflactor, todas]);   // eslint-disable-line react-hooks/exhaustive-deps
  // la imagen sale siempre con las diez filas y "Otros", que es lo que abre el link (el link no lleva `todas`)
  const vistaImg = useMemo(() => (!vista || !todas ? vista : armarMensual({ archivo: ar, forma, ruta, orden, deflactor })),
    [vista, todas, ar, forma, p.get("ruta"), orden, deflactor]);   // eslint-disable-line react-hooks/exhaustive-deps
  const armar = useCallback((f: FormatoImg) => armarImagenMensual(vistaImg!, ar, f), [vistaImg, ar]);

  const ir = (r: string[]) => set({ ruta: escribirRuta(r), todas: null });
  if (!vista) return <><p className="note">No hay datos mensuales de esta forma.</p>{periodo}</>;
  const href = hrefMensual(vista), titulo = tituloMensual(vista);
  const resp = fraseMensual(vista);
  const t = vista.tarjetas;
  const nivel = NIVELES[forma][vista.ruta.length] ?? "Partida";
  const filas: FilaBarra[] = vista.filas.map((f, i) => filaDe(f, i, () => ir([...vista.ruta, f.n]), () => set({ todas: "1" })));
  const notas = vista.filas.filter((f) => f.nota);
  const infoLista = (
    <>
      <p>Cada fila: lo gastado en los meses completos, la variación real contra los mismos meses de {vista.anioAnt} y el % del vigente. El % del vigente es lo gastado (devengado) sobre el crédito vigente a fin del último mes completo; entre paréntesis, lo mismo en {vista.anioAnt} a la misma altura.</p>
      {notas.map((f, i) => <p key={i}><b>{f.n}</b>: {f.nota}</p>)}
    </>
  );

  return (
    <>
      <Migas raiz={nombreForma(forma)} ruta={vista.ruta} onIr={ir} />
      <CabeceraDato nivel={2} titulo={vista.ruta.length ? vista.ruta[vista.ruta.length - 1] : `Gasto total de la Nación, ${vista.periodo} de ${vista.anio}`}
        cifra={resp.cifra} fecha={`${vista.periodo} de ${vista.anio}`} deltas={[]} frase={resp.frase}
        secundarias={[{ rotulo: "Variación real", valor: t.variacion.valor }, { rotulo: "Del crédito vigente", valor: t.ejecutado.valor }]}
        info={vista.nodo.t ? <p>Nombre en el presupuesto: {vista.nodo.t}</p> : undefined} />
      <div className="note gas-unidad">
        Meses completos ({vista.periodo}) contra los mismos meses de {vista.anioAnt}. {vista.unidad}.
        <InfoPunto etiqueta="Cómo leer las cifras">
          <p><b>Gastado</b>: {t.gastado.valor}, {t.gastado.sub}.</p>
          <p><b>Variación real</b>: {t.variacion.valor}, {t.variacion.sub}.</p>
          <p><b>Del crédito vigente</b>: {t.ejecutado.valor}{t.ejecutado.sub ? `, ${t.ejecutado.sub}` : `, ya gastado a fin de ${vista.periodo.split("–").pop()}`}.</p>
        </InfoPunto>
      </div>
      {vista.ipcAviso && <p className="note gas-aviso" role="status">{vista.ipcAviso}</p>}
      {vista.sinIpc && <p className="note gas-aviso" role="status">No hay inflación cargada: los montos están en pesos corrientes de cada mes y la variación real no descuenta la inflación.</p>}
      {periodo}
      <BarraVista items={[{ clave: "orden", texto: `Orden: ${ORDENES.find((o) => o[0] === orden)![1]}` }]} onAbrir={() => setAjustes(true)} />
      <Hoja titulo="Ajustes" abierta={ajustes} onCerrar={() => setAjustes(false)}>
        {(cerrar) => (
          <div className="gas-hoja">
            <GrupoAjuste rotulo="Ordenar la lista por"><Opciones etiqueta="Orden de la lista" valor={orden} opciones={ORDENES} onElegir={(o) => set({ orden: o === ORDEN_DEFECTO ? null : o, todas: null })} /></GrupoAjuste>
            <button type="button" className="btn primario" onClick={() => cerrar()}>Listo</button>
          </div>
        )}
      </Hoja>

      <Capitulo titulo={`Mes a mes, ${vista.anio} contra ${vista.anioAnt}`}>
        <GraficoMeses v={vista} />
      </Capitulo>

      <Capitulo titulo={vista.ruta.length ? `Cómo se divide ${vista.ruta[vista.ruta.length - 1]}` : "Cómo se reparte el gasto"}
        acciones={<CompartirHoja href={href} titulo={titulo} onImagen={() => setImagen(true)} texto={`${resp.frase} Fuente: ${fuenteMensual(ar)}.`} />}>
        <div className="gas-formas-fila">
          <FilaChips etiqueta="Forma de mirar el gasto" valor={forma} opciones={FORMAS_M.filter((f) => ar.arboles[f[0]]) as [string, string][]} onElegir={(f) => set({ forma: f === "para_que" ? null : f, ruta: null, todas: null })} />
          <InfoPunto etiqueta="Qué muestra esta forma"><p>{BAJADA_FORMA[forma]}</p></InfoPunto>
        </div>
        {filas.length ? (
          <>
            <CabLista nivel={nivel} derecha="Gastado · variación real · % del vigente" info={infoLista} />
            <ListaBarras etiqueta={`${nivel}: ${vista.unidad}`} filas={filas} max={1} />
          </>
        ) : <p className="note">No se divide en un nivel más abajo.</p>}
      </Capitulo>

      <Nota ar={ar} v={vista} />
      {imagen && vistaImg && <PanelGasto armar={armar} titulo={titulo} href={href} onCerrar={() => setImagen(false)} />}
    </>
  );
}

function filaDe(f: FilaM, i: number, abrir: () => void, todas: () => void): FilaBarra {
  const sub = [f.varTxt, f.ejec].filter(Boolean).join(" · ");
  const abre = f.tipo === "nodo" && !!f.nodo?.h?.length, esOtros = f.tipo === "otros";
  return {
    id: String(i), nombre: esOtros ? `${f.n} · ver todas` : f.n, valor: f.ancho, texto: f.txt, sub: sub || undefined,
    color: f.tipo === "nodo" ? undefined : "--text-muted",
    ...(abre ? { onClick: abrir, flecha: true, aria: `${f.n}: ${f.txt}${sub ? `, ${sub}` : ""}. Abrir` }
      : esOtros ? { onClick: todas, flecha: true, aria: `${f.n}: ${f.txt}. Ver todas` } : {}),
  };
}

/** Barras por mes: el año contra el anterior, en pesos de hoy. El mes parcial va aparte, más claro, y no entra en ninguna cuenta. */
function GraficoMeses({ v }: { v: VistaM }) {
  const alto = (x: number | null) => (x == null || v.maxMes <= 0 ? 0 : Math.max(0, (x / v.maxMes) * 100));
  const par = v.parcial;
  const columna = (m: MesM) => (
    <div key={m.mes} className={`gm-mes${m.parcial ? " gm-mes-parcial" : ""}`} data-cartel={m.parcial ? `${m.nombre} ${v.anio}: ${m.aTxt} (${v.parcialTxt})` : `${m.nombre}: ${v.anio} ${m.aTxt}; ${v.anioAnt} ${m.bTxt}`}>
      <span className="gm-par">
        {!m.parcial && <span className="gm-b gm-b-ant" style={{ height: `${alto(m.b).toFixed(1)}%` }} />}
        <span className={`gm-b ${m.parcial ? "gm-b-parcial" : "gm-b-a"}`} style={{ height: `${alto(m.a).toFixed(1)}%` }} />
      </span>
      <span className="gm-et">{m.nombre}</span>
    </div>
  );
  return (
    <div className="gm-graf">
      <p className="gm-leyenda">
        <span><i className="gm-sw gm-b-a" aria-hidden="true" /> {v.anio}</span>
        <span><i className="gm-sw gm-b-ant" aria-hidden="true" /> {v.anioAnt}</span>
        {par && <span><i className="gm-sw gm-b-parcial" aria-hidden="true" /> {nombreMesLargo(par)} {v.anio}: {v.parcialTxt}</span>}
      </p>
      <ConCartel><div className="gm-barras" role="img" aria-label={`Gasto de cada mes de ${v.anio} y de ${v.anioAnt}, en pesos de hoy. El detalle está en la tabla de abajo.`}>
        {v.meses.map(columna)}
        {par && columna(par)}
      </div></ConCartel>
      <details className="gm-tabla">
        <summary>Ver mes por mes</summary>
        <div className="tablewrap">
          <table>
            <thead><tr><th scope="col">Mes</th><th scope="col">{v.anio}</th><th scope="col">{v.anioAnt}</th><th scope="col">Variación real</th></tr></thead>
            <tbody>
              {v.meses.map((m) => <tr key={m.mes}><th scope="row">{m.nombre}</th><td>{m.aTxt}</td><td>{m.bTxt}</td><td>{m.varTxt}</td></tr>)}
              <tr className="gm-total"><th scope="row">{v.periodo}</th><td>{v.totalTxt}</td><td>{v.totalAntTxt}</td><td>{v.varTotalTxt}</td></tr>
              {par && <tr className="gm-fila-parcial"><th scope="row">{par.nombre} <small>({v.parcialTxt}; no cuenta)</small></th><td>{par.aTxt}</td><td>–</td><td>–</td></tr>}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
const MESES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const nombreMesLargo = (m: MesM) => MESES_L[m.mes - 1];

function Nota({ ar, v }: { ar: ArchivoMensual; v: VistaM }) {
  return (
    <details className="gas-mide">
      <summary>Cómo se mide</summary>
      <ul className="method">
        <li><b>Gastado (devengado)</b>: el gasto ya hecho, cuando el bien o el servicio se recibió y nace la obligación de pagarlo, aunque todavía no se haya pagado.</li>
        <li><b>El último mes no cuenta</b>: la fuente lo trae incompleto{v.parcial ? ` (${nombreMesLargo(v.parcial)} está ${v.parcialTxt})` : ""}. Se compara {v.periodo} de {v.anio} contra {v.periodo} de {v.anioAnt}, la misma cantidad de meses.</li>
        <li><b>Variación real</b>: lo gastado contra lo gastado en el mismo período del año anterior, después de descontar la inflación: cada mes se lleva a pesos de {v.ref || "hoy"} con el IPC de ese mes. Una suba o una baja no es buena ni mala por sí sola. Cuando el año anterior gastó menos de 0,1 % del total de ese nivel y este año gastó más del doble, la variación no se muestra porque exagera.</li>
        <li><b>Crédito vigente</b>: el presupuesto con las modificaciones que se le van haciendo durante el año, así que cambia mes a mes. El % del vigente toma el de fin del último mes completo; entre paréntesis, el de {v.anioAnt} a la misma altura.</li>
        <li><b>Nombres</b>: un programa que cambió de nombre entre los dos años aparece como “Nuevo en {v.anio}”.</li>
        <li><b>Fuente</b>: {fuenteMensual(ar)}. Los datos cambian a medida que avanza el año. Solo la Administración Nacional: sin empresas públicas ni fondos fiduciarios.</li>
      </ul>
    </details>
  );
}
