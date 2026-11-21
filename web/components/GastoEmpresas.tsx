"use client";
// Empresas públicas de /gasto/ (vista=empresas, docs/specs/empresas-publicas.md): cuánto pone el Tesoro en cada empresa, cuánta gente trabaja en ella
// y cómo cambió. Las cuentas están en lib/empresas-publicas.ts; acá solo se dibuja. Estado en la URL: vista=empresas, anio, orden, emp (la empresa o el
// grupo abierto, con "~" entre niveles) y todas. Mismo tratamiento que las otras vistas de /gasto/: respuesta arriba, ajustes en una hoja, sin cajas.
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { PanelGasto } from "./PanelGasto";
import { CabLista, GrupoAjuste, Migas, Opciones } from "./GastoPiezas";
import { CabeceraDato } from "./sistema/CabeceraDato";
import { Capitulo } from "./sistema/Capitulo";
import { BarraVista } from "./sistema/BarraVista";
import { Hoja } from "./sistema/Hoja";
import { InfoPunto } from "./sistema/InfoPunto";
import { ListaBarras, type FilaBarra } from "./sistema/ListaBarras";
import { CompartirHoja } from "./sistema/CompartirHoja";
import { ConCartel } from "./sistema/ConCartel";
import { IconoBuscar } from "./sistema/iconos";
import type { FormatoImg } from "@/lib/config";
import { escribirRuta, leerRuta } from "@/lib/gasto";
import { fmtMes, nf0, nfDec } from "@/lib/formato";
import {
  NOMBRE_RAIZ, ORDENES_EP, ORDEN_EP_DEFECTO, anioDefectoEP, anioPedidoEP, armarEmpresas, armarImagenEmpresas, buscarEmpresas, esOrdenEP, fraseEmpresas, fuenteEmpresasTxt,
  hrefEmpresas, opcionesAnioEP, textoBarraAnio, tituloEmpresas, unidadAnual,
  type AnualEP, type ArchivoEmpresas, type FilaEP, type OrdenEP, type PersonasEP, type VistaEP,
} from "@/lib/empresas-publicas";
import type { DeflactorMensual } from "@/lib/gasto-mensual";

export function GastoEmpresas({ ar, deflactor, p, set, periodo }: {
  ar: ArchivoEmpresas; deflactor: DeflactorMensual; p: URLSearchParams; set: (c: Record<string, string | null | undefined>) => void;
  /** El selector "Año completo / Cómo viene / Empresas públicas" (lo arma /gasto/): va debajo de la respuesta. */
  periodo?: ReactNode;
}) {
  const [imagen, setImagen] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const orden: OrdenEP = esOrdenEP(p.get("orden")) ? (p.get("orden") as OrdenEP) : ORDEN_EP_DEFECTO;
  const ruta = leerRuta(p.get("emp")), todas = p.get("todas") === "1", anioP = p.get("anio");
  const anioDef = anioDefectoEP(ar).anio, anioSel = anioPedidoEP(ar, anioP).anio;
  const vista = useMemo(() => armarEmpresas({ archivo: ar, ruta, orden, anio: anioP, deflactor, todas }),
    [ar, p.get("emp"), orden, anioP, deflactor, todas]);   // eslint-disable-line react-hooks/exhaustive-deps
  // la imagen sale siempre con las diez filas y "Otras", que es lo que abre el link (el link no lleva `todas`)
  const vistaImg = useMemo(() => (!todas ? vista : armarEmpresas({ archivo: ar, ruta, orden, anio: anioP, deflactor })),
    [vista, todas, ar, p.get("emp"), orden, anioP, deflactor]);   // eslint-disable-line react-hooks/exhaustive-deps
  const armar = useCallback((f: FormatoImg) => armarImagenEmpresas(vistaImg, ar, f), [vistaImg, ar]);

  const ir = (r: string[]) => set({ emp: escribirRuta(r), todas: null });
  const href = hrefEmpresas(vista, anioDef), titulo = tituloEmpresas(vista);
  const resp = fraseEmpresas(vista);
  const t = vista.tarjetas, abierta = vista.ruta.length > 0, ultimo = vista.ruta[vista.ruta.length - 1];
  const lista = vista.filas.length > 0;
  const notas = vista.filas.filter((f) => f.nota);
  const compartir = <CompartirHoja href={href} titulo={titulo} onImagen={() => setImagen(true)} texto={`${resp.frase} Fuente: ${fuenteEmpresasTxt(ar)}.`} />;
  const infoLista = (
    <>
      <p>Cada fila: lo que puso el Tesoro en el período, su parte del total, la variación real contra {vista.periodoAnt ? `${vista.periodoAnt}` : "el período anterior"}, los empleados del último mes con dato y lo que puso el Tesoro por empleado.</p>
      <p>Por empleado: lo que puso el Tesoro en el período dividido los empleados promedio del período, y solo se calcula con empleados en al menos 6 meses.</p>
      {notas.map((f, i) => <p key={i}><b>{f.n}</b>: {f.nota}</p>)}
    </>
  );
  const enc = `Puso el Tesoro · % del total · variación real · empleados`;
  const nivel = abierta ? `Empresas de ${ultimo}` : "Empresa";

  return (
    <>
      <Migas raiz={NOMBRE_RAIZ} ruta={vista.ruta} onIr={ir} />
      <CabeceraDato nivel={2} titulo={abierta ? ultimo : `Lo que pone el Tesoro en las empresas públicas, ${vista.periodoCorto}${vista.enCurso ? ` de ${vista.anio}` : ""}`}
        cifra={resp.cifra} fecha={vista.periodo} deltas={[]} frase={resp.frase}
        secundarias={[{ rotulo: "Variación real", valor: t.variacion.valor }, { rotulo: "Empleados", valor: t.empleados.valor }]}
        info={<>
          <p>Es lo que el Tesoro de la Nación puso en la empresa (devengado): transferencias corrientes y de capital, más aportes de capital. No es lo que gasta la empresa ni su resultado: la empresa también tiene ingresos propios.</p>
          {vista.nodo.t ? <p>Nombre técnico: {vista.nodo.t}</p> : null}
        </>} />
      <div className="note gas-unidad">
        {vista.periodo} {vista.periodoAnt ? `contra ${vista.periodoAnt}` : ""}. {vista.unidad}.
        <InfoPunto etiqueta="Cómo leer las cifras">
          <p><b>Lo que puso el Tesoro</b>: {t.transferido.valor}, {t.transferido.sub}.</p>
          <p><b>Variación real</b>: {t.variacion.valor}, {t.variacion.sub}.</p>
          <p><b>Empleados</b>: {t.empleados.valor}, {t.empleados.sub}.</p>
          {vista.porEmpTotalTxt ? <p><b>Por empleado</b>: {vista.porEmpTotalTxt}.</p> : null}
        </InfoPunto>
      </div>
      {vista.ipcAviso && <p className="note gas-aviso" role="status">{vista.ipcAviso}</p>}
      {periodo}
      <div className="gas-barra-fila">
        <div className="gas-barra-vista">
          <BarraVista items={[{ clave: "anio", texto: vista.enCurso ? vista.periodo : String(vista.anio) }, { clave: "orden", texto: `Orden: ${ORDENES_EP.find((o) => o[0] === orden)![1]}` }]} onAbrir={() => setAjustes(true)} />
        </div>
        <button type="button" className="gas-buscar-btn" aria-label="Buscar una empresa" aria-haspopup="dialog" onClick={() => setBuscando(true)}><IconoBuscar /><span>Buscar</span></button>
      </div>
      <Hoja titulo="Ajustes" abierta={ajustes} onCerrar={() => setAjustes(false)}>
        {(cerrar) => (
          <div className="gas-hoja">
            <GrupoAjuste rotulo="Año"><Opciones etiqueta="Año" valor={String(anioSel)} opciones={opcionesAnioEP(ar)} onElegir={(a) => set({ anio: Number(a) === anioDef ? null : a, todas: null })} /></GrupoAjuste>
            <GrupoAjuste rotulo="Ordenar la lista por"><Opciones etiqueta="Orden de la lista" valor={orden} opciones={ORDENES_EP} onElegir={(o) => set({ orden: o === ORDEN_EP_DEFECTO ? null : o, todas: null })} /></GrupoAjuste>
            <button type="button" className="btn primario" onClick={() => cerrar()}>Listo</button>
          </div>
        )}
      </Hoja>
      <Hoja titulo="Buscar una empresa" abierta={buscando} onCerrar={() => setBuscando(false)}>
        {(cerrar) => <Buscador ar={ar} deflactor={deflactor} orden={orden} anio={anioP} onIr={(r) => cerrar(() => set({ emp: escribirRuta(r), todas: null }))} />}
      </Hoja>

      <Capitulo titulo={`Año por año${abierta ? `: ${ultimo}` : ""}`} acciones={!lista ? compartir : undefined}>
        <GraficoAnios an={vista.anual} />
      </Capitulo>

      {lista && (
        <Capitulo titulo={abierta ? `Cómo se divide ${ultimo}` : "Cómo se reparte entre las empresas"} acciones={compartir}>
          <CabLista nivel={nivel} derecha={enc} info={infoLista} />
          <ListaBarras etiqueta={`${nivel}: ${vista.unidad}`} filas={vista.filas.map((f, i) => filaDe(f, i, () => ir([...vista.ruta, f.n]), () => set({ todas: "1" })))} max={1} />
        </Capitulo>
      )}

      {abierta && vista.personas && (
        <Capitulo titulo={`Cuánta gente trabaja${abierta ? ` en ${ultimo}` : ""}`}>
          <GraficoPersonas pe={vista.personas} />
        </Capitulo>
      )}
      {abierta && !vista.personas && <p className="note">No hay datos suficientes de empleados de {ultimo}.</p>}

      <Nota ar={ar} v={vista} />
      {imagen && <PanelGasto armar={armar} titulo={titulo} href={href} onCerrar={() => setImagen(false)} />}
    </>
  );
}

function filaDe(f: FilaEP, i: number, abrir: () => void, todas: () => void): FilaBarra {
  const sub = [f.parte, f.varTxt, f.empTxt, f.porEmpTxt].filter(Boolean).join(" · ");
  const esOtras = f.tipo === "otras";
  return {
    id: String(i), nombre: esOtras && !f.n.startsWith("Sin ") ? `${f.n} · ver todas` : f.n, valor: f.ancho, texto: f.txt, sub: sub || undefined,
    color: f.tipo === "nodo" ? undefined : "--text-muted",
    ...(f.tipo === "nodo" ? { onClick: abrir, flecha: true, aria: `${f.n}: ${f.txt}${sub ? `, ${sub}` : ""}. Abrir` }
      : esOtras && !f.n.startsWith("Sin ") ? { onClick: todas, flecha: true, aria: `${f.n}: ${f.txt}. Ver todas` } : {}),
  };
}

/** Buscador por nombre de empresa o grupo, en cualquier nivel. Elegir un resultado lo abre. */
function Buscador({ ar, deflactor, orden, anio, onIr }: { ar: ArchivoEmpresas; deflactor: DeflactorMensual; orden: OrdenEP; anio: string | null; onIr: (ruta: string[]) => void }) {
  const [q, setQ] = useState("");
  const activo = q.trim().length >= 2;
  const res = useMemo(() => (activo ? buscarEmpresas({ archivo: ar, q, orden, anio, deflactor }) : []), [activo, ar, q, orden, anio, deflactor]);
  return (
    <div className="gas-buscar">
      <label className="lbl" htmlFor="emp-q">Buscar una empresa pública</label>
      <input id="emp-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Por ejemplo: trenes, Aerolíneas, ENARSA, AySA" autoComplete="off" />
      {activo && (
        <div className="gas-resultados" role="status" aria-live="polite">
          {!res.length ? <p className="note">No hay ninguna empresa con ese nombre.</p> : (
            <ul>
              {res.map((r, i) => (
                <li key={i}>
                  <button type="button" onClick={() => { setQ(""); onIr(r.ruta ?? [r.n]); }}>
                    <span className="gas-res-n">{r.n}</span>
                    <small>{[r.txt, r.varTxt, r.empTxt, r.donde].filter(Boolean).join(" · ")}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- gráficos
const W = 328, H = 220, ML = 40, MR = 4, MT = 8, MB = 22;
/** Margen izquierdo según la etiqueta más larga del eje («600.000» no entra en 40 px a 360 de ancho). */
const margenEje = (etiquetas: string[]) => Math.max(ML, 8 + 7 * Math.max(0, ...etiquetas.map((e) => e.length)));

/** Barras apiladas por año (corrientes y capital), en pesos de hoy. El año en curso va más claro y marca los mismos meses del año anterior. */
function GraficoAnios({ an }: { an: AnualEP }) {
  const n = an.anios.length;
  if (n < 1) return <p className="note">No hay años para mostrar.</p>;
  const maximo = Math.max(...an.anios.map((b) => Math.max(b.total, b.marca ?? 0)));
  const un = unidadAnual(an);
  const enU = maximo / un.div, mag = 10 ** Math.floor(Math.log10(enU / 3 || 1));
  const pasoU = [1, 2, 5, 10].map((f) => f * mag).find((q) => enU / q <= 4) ?? mag * 10;
  const tope = maximo > 0 ? maximo * 1.04 : pasoU * un.div;
  const mY = (x: number) => MT + (H - MT - MB) * (1 - x / tope);
  const ticks = Array.from({ length: Math.floor(tope / un.div / pasoU + 1e-9) + 1 }, (_, k) => k * pasoU * un.div);
  const fmtT = (x: number) => nfDec(pasoU >= 1 ? 0 : pasoU >= 0.1 ? 1 : 2).format(x / un.div);
  const ml = margenEje(ticks.map(fmtT));
  const banda = (W - ml - MR) / n, ancho = banda * 0.78;
  const hayParcial = an.anios.some((b) => b.parcial);
  const par = an.anios.find((b) => b.parcial);
  return (
    <div className="gas-evo emp-anios">
      <p className="note gas-evo-nota">Lo que puso el Tesoro cada año, en {un.nombre} de {an.unidad}, con transferencias corrientes, transferencias de capital y aportes de capital.{hayParcial ? ` ${par!.anio} va hasta ${par!.etiqueta.split("· ")[1].replace("ene a ", "")}: se compara con los mismos meses de ${par!.anio - 1}, que marca la línea.` : ""}</p>
      <ConCartel>
        <svg className="gas-evo-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Lo que puso el Tesoro cada año de ${an.anios[0].anio} a ${an.anios[n - 1].anio}, en ${an.unidad}. El detalle está en la tabla de abajo.`}>
          {ticks.map((tk, i) => (
            <g key={i}>
              <line className="gas-evo-grilla" x1={ml} x2={W - MR} y1={mY(tk)} y2={mY(tk)} />
              <text className="gas-evo-eje" x={ml - 4} y={mY(tk) + 4} textAnchor="end">{fmtT(tk)}</text>
            </g>
          ))}
          {an.anios.map((b, i) => {
            const x = ml + banda * i + (banda - ancho) / 2, yc = mY(b.corr), yk = mY(b.corr + b.cap), yt = mY(b.total), y0 = mY(0);
            return (
              <g key={b.anio} className={b.parcial ? "emp-parcial" : undefined}>
                <rect className="gas-capa gas-capa-1" x={x} y={yc} width={ancho} height={Math.max(0, y0 - yc)} style={{ cursor: "default" }} />
                <rect className="gas-capa gas-capa-3" x={x} y={yk} width={ancho} height={Math.max(0, yc - yk)} style={{ cursor: "default" }} />
                <rect className="gas-capa gas-capa-5" x={x} y={yt} width={ancho} height={Math.max(0, yk - yt)} style={{ cursor: "default" }} />
                {b.marca != null && <line className="emp-marca" x1={x - 2} x2={x + ancho + 2} y1={mY(b.marca)} y2={mY(b.marca)} />}
                <rect x={x - (banda - ancho) / 2} y={MT} width={banda} height={H - MT - MB} fill="transparent" data-cartel={textoBarraAnio(b, an)} />
                <text className="gas-evo-eje" x={x + ancho / 2} y={H - 6} textAnchor="middle">{b.anio}</text>
              </g>
            );
          })}
        </svg>
      </ConCartel>
      <ul className="gas-leyenda">
        <li><span className="emp-ley"><i className="gas-capa-sw gas-capa-1" aria-hidden="true" /><span>Transferencias corrientes</span></span></li>
        <li><span className="emp-ley"><i className="gas-capa-sw gas-capa-3" aria-hidden="true" /><span>Transferencias de capital</span></span></li>
        <li><span className="emp-ley"><i className="gas-capa-sw gas-capa-5" aria-hidden="true" /><span>Aportes de capital</span></span></li>
        {hayParcial && <li><span className="emp-ley"><i className="emp-ley-marca" aria-hidden="true" /><span>Mismos meses del año anterior</span></span></li>}
      </ul>
      <details className="gas-tabla-anios">
        <summary>Ver año por año</summary>
        <div className="tablewrap">
          <table>
            <thead><tr><th scope="col">Año</th><th scope="col">Corrientes</th><th scope="col">Capital</th><th scope="col">Aportes de capital</th><th scope="col">Total</th></tr></thead>
            <tbody>
              {[...an.tabla].reverse().map((f) => <tr key={f.anio}><th scope="row">{f.etiqueta}</th><td>{f.corr}</td><td>{f.cap}</td><td>{f.apo}</td><td>{f.total}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p className="note">Montos redondeados: corrientes más capital más aportes de capital da el total que se ve.</p>
      </details>
    </div>
  );
}

const HP = 150;

/** Empleados mes a mes: una columna por mes con dato; los meses sin dato quedan vacíos. */
function GraficoPersonas({ pe }: { pe: PersonasEP }) {
  const n = pe.meses.length;
  const mag = 10 ** Math.floor(Math.log10(pe.max / 3 || 1));
  const paso = [1, 2, 5, 10].map((f) => f * mag).find((q) => pe.max / q <= 4) ?? mag * 10;
  const tope = pe.max * 1.04 || 1;   // sin empleados en ningún mes, el eje no divide por cero
  const mY = (x: number) => MT + (HP - MT - MB) * (1 - x / tope);
  const ticks = Array.from({ length: Math.floor(tope / paso + 1e-9) + 1 }, (_, k) => k * paso);
  const ml = margenEje(ticks.map((t) => nf0.format(t)));
  const banda = (W - ml - MR) / n, ancho = Math.max(1, banda * 0.8);
  const anios = pe.meses.map((m, i) => [m, i] as const).filter(([m]) => m.endsWith("-01"));
  const cada = Math.max(1, Math.ceil(anios.length / Math.floor((W - ml - MR) / 40)));
  return (
    <div className="gas-evo">
      <p className="note gas-evo-nota">Empleados de cada mes{pe.fuente ? `, según ${pe.fuente === "SIRHU" ? "el SIRHU (sistema de recursos humanos del Estado)" : "el Presupuesto"}` : ""}. Los meses sin columna no tienen dato. Último dato: {nf0.format(pe.ultimo!.v)} en {fmtMes(pe.ultimo!.mes)}; el primero, {nf0.format(pe.primero!.v)} en {fmtMes(pe.primero!.mes)}.</p>
      <ConCartel>
        <svg className="gas-evo-svg" viewBox={`0 0 ${W} ${HP}`} role="img" aria-label={`Empleados mes a mes, de ${fmtMes(pe.meses[0])} a ${fmtMes(pe.meses[n - 1])}. Último dato: ${nf0.format(pe.ultimo!.v)} en ${fmtMes(pe.ultimo!.mes)}.`}>
          {ticks.map((tk, i) => (
            <g key={i}>
              <line className="gas-evo-grilla" x1={ml} x2={W - MR} y1={mY(tk)} y2={mY(tk)} />
              <text className="gas-evo-eje" x={ml - 4} y={mY(tk) + 4} textAnchor="end">{nf0.format(tk)}</text>
            </g>
          ))}
          {pe.v.map((v, i) => v == null ? null : (
            <rect key={pe.meses[i]} className="gas-capa gas-capa-1" x={ml + banda * i + (banda - ancho) / 2} y={mY(v)} width={ancho} height={Math.max(0, mY(0) - mY(v))}
              data-cartel={`${fmtMes(pe.meses[i])}: ${nf0.format(v)} empleados`} style={{ cursor: "default" }} />
          ))}
          {anios.map(([m, i], k) => k % cada === 0 && <text key={m} className="gas-evo-eje" x={ml + banda * i} y={HP - 6} textAnchor="middle">{m.slice(0, 4)}</text>)}
        </svg>
      </ConCartel>
    </div>
  );
}

function Nota({ ar, v }: { ar: ArchivoEmpresas; v: VistaEP }) {
  return (
    <details className="gas-mide">
      <summary>Cómo se mide</summary>
      <ul className="method">
        <li><b>Lo que pone el Tesoro</b>: lo que el Tesoro de la Nación puso en cada empresa pública y ya se devengó (el compromiso nació, aunque todavía no se haya pagado): transferencias corrientes (el funcionamiento), transferencias de capital (inversión) y aportes de capital. <b>No es lo que gasta la empresa</b> ni su resultado: las empresas tienen además ingresos propios, como la venta de pasajes, de agua o de cartas.</li>
        <li><b>Aportes de capital</b>: es plata que el Tesoro pone para comprar acciones de la empresa (capitalizarla). En el presupuesto es un activo (el Estado pasa a tener más acciones), no un gasto, y por eso el monitor de transferencias de la fuente no los cuenta; acá se suman porque es plata del Tesoro que fue a la empresa. Austral figura dentro de Aerolíneas Argentinas: se fusionaron en 2020.</li>
        <li><b>Qué empresas entran</b>: solo las que reciben plata del Tesoro. No figuran las que se financian solas ni los bancos públicos. Una empresa que se creó, se cerró o cambió de nombre (por ejemplo ENARSA, que hoy es Energía Argentina) aparece con el nombre de la fuente y puede no tener datos todos los años. Los trenes se suman en Trenes Argentinos y se abren en sus cuatro sociedades.</li>
        <li><b>Pesos de hoy</b>: cada mes se ajusta por inflación con el IPC de ese mes y se lleva a pesos de {v.ref || "hoy"}. El año en curso se compara contra los mismos meses del año anterior. Lo que pone el Tesoro cada mes salta mucho: se lee mejor en el año.</li>
        <li><b>Variación real</b>: lo que puso el Tesoro contra el mismo período del año anterior, descontada la inflación. Una suba o una baja no es buena ni mala por sí sola. Cuando el año anterior recibió menos de 0,1 % del total de la lista y este año más del doble, la variación no se muestra porque exagera.</li>
        <li><b>Empleados</b>: salen del SIRHU (sistema de recursos humanos del Estado) o, donde no figura ahí, del Presupuesto, según cada empresa. El total de un mes solo se calcula si están todas las empresas que informan ese año. Los datos de empleados llegan hasta {v.datosOcup}, algo antes que los fondos del Tesoro ({v.datosTransf}). <b>Por empleado</b>: lo que puso el Tesoro en el período dividido los empleados promedio del período, solo con empleados en al menos 6 meses.</li>
        <li><b>Sin discriminar</b>: fondos que la fuente no asigna a una empresa; van dentro de «Otras».</li>
        <li><b>Fuente</b>: {fuenteEmpresasTxt(ar)}. Los datos cambian a medida que avanza el año.</li>
      </ul>
    </details>
  );
}
