"use client";
// En qué gasta la Nación (/gasto/, docs/specs/gasto-nacion.md): una lista de barras de mayor a menor para cuatro formas de mirar el gasto
// (para qué, quién, en qué, dónde), por año, en pesos de hoy, % del total o % del PIB. Tocar una barra abre su nivel siguiente.
// Todas las cuentas están en lib/gasto.ts; acá solo se dibuja. Estado en la URL: anio, med, etapa, forma, ruta (nombres separados por "~") y todas.
// Con el archivo mensual (fase 2) se suma `vista=mes` ("Cómo viene el año"), que dibuja components/GastoMensual.tsx; sin el archivo, esa vista no existe.
// Remodelación 3.5 (docs/specs/remodelacion-herramientas.md, G): respuesta arriba, ajustes en una hoja, sin cajas, una sola forma de compartir.
import { HojaListo } from "./comunes";
import { useCallback, useMemo, useState } from "react";
import { useGastoAnios, useGastoIndice, useGastoMensual } from "../useGasto";
import { useSeccion } from "../useSeccion";
import { Cargando } from "../ui";
import { Sparkline } from "../Sparkline";
import { PanelGasto } from "../PanelGasto";
import { GastoMensual } from "../GastoMensual";
import { EvolucionFinalidades } from "../GastoEvolucion";
import { CabLista, EnlaceFlecha, GrupoAjuste, Migas, Opciones } from "../GastoPiezas";
import { IconoBuscar } from "../sistema/iconos";
import { CabeceraDato } from "../sistema/CabeceraDato";
import { Capitulo } from "../sistema/Capitulo";
import { BarraVista } from "../sistema/BarraVista";
import { FilaChips } from "../sistema/FilaChips";
import { Hoja } from "../sistema/Hoja";
import { InfoPunto } from "../sistema/InfoPunto";
import { ListaBarras, type FilaBarra } from "../sistema/ListaBarras";
import { CompartirHoja } from "../sistema/CompartirHoja";
import Link from "next/link";
import { fmtMillones, nfDec } from "@/lib/formato";
import {
  BAJADA_FORMA, ETAPAS, ETAPA_DEFECTO, FORMAS, FORMA_DEFECTO, MEDIDAS, MEDIDA_DEFECTO, NIVELES, NOTA_DONDE,
  anioDe, anioDefecto, aniosTxt, armarImagenGasto, armarVista, buscar, crearDeflactor, decPctDe, escribirRuta, esEtapa, esForma, esMedida, fechaLarga, fraseGasto, fuenteTxt, hrefVista, leerRuta,
  nombreEtapa, nombreForma, opcionesAnio, otraUbicacionTxt, serieNodo, tituloVista,
  type ArchivoAnio, type Barra, type Deflactor, type Forma, type IndiceGasto, type Vista,
} from "@/lib/gasto";
import { crearDeflactorMensual, opcionesVista, type DeflactorMensual } from "@/lib/gasto-mensual";
import { esProgramaU } from "@/lib/universidades";
import { useParams } from "@/lib/url";

export function Gasto() {
  const { datos, error } = useGastoIndice();
  const sec = useSeccion([]);
  const m = sec.motor, listo = !!m && !sec.ocupado;
  const deflactor = useMemo(() => (m && listo ? crearDeflactor(m.F, m.base().IPC) : null), [m, listo]);
  const deflactorM = useMemo(() => (m && listo ? crearDeflactorMensual(m.F, m.base().IPC) : null), [m, listo]);
  if (error) return <><p className="error" role="alert">{error}</p><p className="note">El resto del sitio sigue funcionando. Probá de nuevo en un rato.</p></>;
  if (sec.errorGeneral) return <p className="error" role="alert">{sec.errorGeneral}</p>;
  if (!datos || !deflactor || !deflactorM) return <div className="gas-reserva"><Cargando texto="Cargando el gasto de la Nación…" /></div>;
  return <Cuerpo ix={datos} deflactor={deflactor} deflactorM={deflactorM} />;
}

function Cuerpo({ ix, deflactor, deflactorM }: { ix: IndiceGasto; deflactor: Deflactor; deflactorM: DeflactorMensual }) {
  const [p, set, montado] = useParams();
  const [imagen, setImagen] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const def = anioDefecto(ix);
  const anio = anioDe(ix, p.get("anio")) ?? def;
  const forma: Forma = esForma(p.get("forma")) ? (p.get("forma") as Forma) : FORMA_DEFECTO;
  const medida = esMedida(p.get("med")) ? p.get("med")! as typeof MEDIDA_DEFECTO : MEDIDA_DEFECTO;
  const etapa = esEtapa(p.get("etapa")) ? p.get("etapa")! as typeof ETAPA_DEFECTO : ETAPA_DEFECTO;
  const ruta = leerRuta(p.get("ruta"));
  const todas = p.get("todas") === "1";
  const mensual = useGastoMensual();
  const pideMes = p.get("vista") === "mes";
  const modoMes = pideMes && !!mensual.datos;   // sin el archivo mensual, un link con vista=mes muestra el año completo
  const { listos, cargando, error } = useGastoAnios(ix, montado && !modoMes ? [anio.archivo] : []);
  const archivo = listos.get(anio.archivo) ?? null;
  const vista = useMemo(() => (archivo ? armarVista({ archivo, anio, forma, ruta, medida, etapa, deflactor, max: todas ? Infinity : undefined }) : null),
    [archivo, anio, forma, p.get("ruta"), medida, etapa, deflactor, todas]);   // eslint-disable-line react-hooks/exhaustive-deps

  // la imagen sale siempre con la vista por defecto (diez barras y "Otros"), que es lo que abre el link (el link no lleva `todas`)
  const vistaImg = useMemo(() => (!vista || !todas || !archivo ? vista : armarVista({ archivo, anio, forma, ruta, medida, etapa, deflactor })),
    [vista, todas, archivo, anio, forma, p.get("ruta"), medida, etapa, deflactor]);   // eslint-disable-line react-hooks/exhaustive-deps

  const armarImg = useCallback((f: Parameters<typeof armarImagenGasto>[1]) => armarImagenGasto(vistaImg!, f), [vistaImg]);
  const ir = (r: string[]) => set({ ruta: escribirRuta(r), todas: null });
  const href = vista ? hrefVista(vista, def.anio) : "/gasto/";
  const titulo = vista ? tituloVista(vista) : "En qué gasta la Nación";
  const resp = vista ? fraseGasto(vista) : null;

  const cambiarVista = (v: string) => set(v === "mes"
    ? { vista: "mes", todas: null, ...(forma === "donde" ? { forma: null, ruta: null } : {}) }   // Dónde no existe en "Cómo viene"
    : { vista: null, todas: null });
  const selectorPeriodo = mensual.datos ? (
    <div className="gas-periodo">
      <FilaChips etiqueta="Qué período mirar" valor={modoMes ? "mes" : "anio"} opciones={opcionesVista(mensual.datos)} onElegir={cambiarVista} />
    </div>
  ) : null;

  if (pideMes && !mensual.listo) return <section className="gas"><p className="sub">Cuánto gastó el Estado nacional cada año, en qué y quién, con datos oficiales del presupuesto.</p><div className="gas-reserva"><Cargando texto="Cargando la ejecución mensual…" /></div></section>;
  if (modoMes) {
    return (
      <section className="gas">
        <p className="sub">Cuánto gastó el Estado nacional cada año, en qué y quién, con datos oficiales del presupuesto.</p>
        <GastoMensual ar={mensual.datos!} deflactor={deflactorM} p={p} set={set} periodo={selectorPeriodo} />
      </section>
    );
  }

  const enCurso = anio.en_curso ? " · en curso" : "";
  const chips = [
    { clave: "anio", texto: `${anio.anio}${enCurso}` },
    { clave: "med", texto: MEDIDAS.find((x) => x[0] === medida)![1] },
    { clave: "etapa", texto: nombreEtapa(etapa) },
  ];
  const nivel = vista ? NIVELES[vista.forma][vista.ruta.length] : undefined;
  const sonUniv = !!vista && vista.forma === "quien" && vista.ruta.some((n) => esProgramaU(n));
  const infoLista = vista ? (
    <>
      <p>El % ejecutado es lo gastado (devengado) sobre el crédito vigente: el presupuesto con sus modificaciones del año.</p>
      {vista.medidaUsada === "pct" && vista.ruta.length > 0 && <p>Cada barra, sobre el gasto total del año.</p>}
      {vista.forma === "donde" && <p>{NOTA_DONDE}</p>}
    </>
  ) : null;

  return (
    <section className="gas">
      <p className="sub">Cuánto gastó el Estado nacional cada año, en qué y quién, con datos oficiales del presupuesto.</p>
      {vista && <Migas raiz={nombreForma(vista.forma)} ruta={vista.ruta} onIr={ir} />}
      {vista && resp && (
        <CabeceraDato nivel={2} titulo={vista.ruta.length ? vista.ruta[vista.ruta.length - 1] : `Gasto total de ${vista.anio.anio}`}
          cifra={resp.cifra} fecha={vista.etapaTxt} deltas={[]} frase={resp.frase}
          info={vista.nodo.t ? <p>Nombre en el presupuesto: {vista.nodo.t}</p> : undefined} />
      )}
      {vista && (
        <p className="note gas-unidad">
          {vista.unidad}.{vista.totalEjec ? ` ${vista.totalEjec} ejecutado.` : ""}
          {vista.aviso && <span role="status"> {vista.aviso}</span>}
        </p>
      )}
      {selectorPeriodo}
      <div className="gas-barra-fila">
        <div className="gas-barra-vista"><BarraVista items={chips} onAbrir={() => setAjustes(true)} /></div>
        <button type="button" className="gas-buscar-btn" aria-label="Buscar en el gasto" aria-haspopup="dialog" onClick={() => setBuscando(true)}><IconoBuscar /><span>Buscar</span></button>
      </div>
      <HojaListo titulo="Ajustes" abierta={ajustes} onCerrar={() => setAjustes(false)}>
        {(cerrar) => (
          <div className="gas-hoja">
            <GrupoAjuste rotulo="Año"><Opciones etiqueta="Año" valor={String(anio.anio)} opciones={opcionesAnio(ix)} onElegir={(a) => set({ anio: Number(a) === def.anio ? null : a })} /></GrupoAjuste>
            <GrupoAjuste rotulo="Medida"><Opciones etiqueta="Medida" valor={medida} opciones={MEDIDAS} onElegir={(v) => set({ med: v === MEDIDA_DEFECTO ? null : v })} /></GrupoAjuste>
            <GrupoAjuste rotulo="Etapa"><Opciones etiqueta="Etapa" valor={etapa} opciones={ETAPAS} onElegir={(v) => set({ etapa: v === ETAPA_DEFECTO ? null : v })} /></GrupoAjuste>
          </div>
        )}
      </HojaListo>
      <Hoja titulo="Buscar en el gasto" abierta={buscando} onCerrar={() => setBuscando(false)}>
        {(cerrar) => (
          <Buscador ix={ix} onIr={(r) => cerrar(() => set({ forma: r.forma === FORMA_DEFECTO ? null : r.forma, ruta: escribirRuta(r.ruta), anio: r.anio === def.anio ? null : String(r.anio), todas: null }))} />
        )}
      </Hoja>

      {error && <p className="error" role="alert">{error}</p>}
      {!vista ? (cargando || !montado ? <div className="gas-reserva"><Cargando texto={`Cargando ${anio.anio}…`} /></div> : <p className="note">No hay datos de esta forma para {anio.anio}.</p>) : (
        <>
          <Capitulo titulo={vista.ruta.length ? `Cómo se divide ${vista.ruta[vista.ruta.length - 1]}` : "Cómo se reparte el gasto"}
            acciones={<CompartirHoja href={href} titulo={titulo} onImagen={() => setImagen(true)} texto={resp ? `${resp.frase} Fuente: ${fuenteTxt(vista.anio)}.` : undefined} />}>
            <div className="gas-formas-fila">
              <FilaChips etiqueta="Forma de mirar el gasto" valor={forma} opciones={FORMAS} onElegir={(f) => set({ forma: f === FORMA_DEFECTO ? null : f, ruta: null, todas: null })} />
              <InfoPunto etiqueta="Qué muestra esta forma"><p>{BAJADA_FORMA[forma]}</p></InfoPunto>
            </div>
            <Lista vista={vista} nivel={nivel} info={infoLista} onIr={ir} onTodas={() => set({ todas: "1" })} />
            {sonUniv && <EnlaceFlecha href={`/universidades/?anio=${vista.anio.anio}`}>Ver cuánto recibió cada universidad, año por año</EnlaceFlecha>}
            {vista.forma === "donde" && !vista.ruta.length && <EnlaceFlecha href={`/provincias/?anio=${vista.anio.anio}`}>Ver cada provincia, por habitante</EnlaceFlecha>}
          </Capitulo>
          {forma === "para_que" && !vista.ruta.length && ix.serie_larga
            ? <Capitulo titulo="¿Cómo cambió en el tiempo?"><EvolucionFinalidades ix={ix} deflactor={deflactor} onElegir={(f) => ir([f])} /></Capitulo>
            : <Comparar ix={ix} forma={forma} ruta={vista.ruta} deflactor={deflactor} />}
        </>
      )}

      <Pie ix={ix} anio={anio.anio} />
      {imagen && vistaImg && <PanelGasto armar={armarImg} titulo={titulo} href={href} onCerrar={() => setImagen(false)} />}
    </section>
  );
}

/** La lista de barras del nivel abierto: tocar una fila abre su nivel siguiente. */
function Lista({ vista: v, nivel, info, onIr, onTodas }: { vista: Vista; nivel: string | undefined; info: React.ReactNode; onIr: (r: string[]) => void; onTodas: () => void }) {
  if (!v.barras.length) return <p className="note">No se divide en un nivel más abajo.</p>;
  const filas: FilaBarra[] = v.barras.map((b, i) => filaDe(b, i, () => onIr([...v.ruta, b.n]), onTodas));
  return (
    <>
      <CabLista nivel={nivel ?? "Partida"} derecha={v.encParte} info={info} />
      <ListaBarras etiqueta={`${nivel ?? "Partida"}: ${v.unidad}`} filas={filas} max={1} />
    </>
  );
}

function filaDe(b: Barra, i: number, abrir: () => void, todas: () => void): FilaBarra {
  const sub = [b.parte, b.ejec && `${b.ejec} ejecutado`].filter(Boolean).join(" · ");
  const abre = b.tipo === "nodo" && !!b.nodo?.h?.length, esOtros = b.tipo === "otros";
  return {
    id: String(i), nombre: esOtros ? `${b.n} · ver todas` : b.n, valor: b.ancho, texto: b.txt, sub: sub || undefined,
    color: b.tipo === "nodo" ? undefined : "--text-muted",
    ...(abre ? { onClick: abrir, flecha: true, aria: `${b.n}: ${b.txt}${sub ? `, ${sub}` : ""}. Abrir` }
      : esOtros ? { onClick: todas, flecha: true, aria: `${b.n}: ${b.txt}. Ver todas` } : {}),
  };
}

/** Buscador por nombre en todos los niveles y años. Baja los archivos de todos los años recién cuando se escribe. */
function Buscador({ ix, onIr }: { ix: IndiceGasto; onIr: (r: { forma: Forma; ruta: string[]; anio: number }) => void }) {
  const [q, setQ] = useState("");
  const activo = q.trim().length >= 3;
  const { listos, cargando } = useGastoAnios(ix, activo ? ix.anios.map((a) => a.archivo) : []);
  const archivos = useMemo(() => [...listos.values()] as ArchivoAnio[], [listos]);
  const res = useMemo(() => (activo ? buscar(archivos, q, 30, new Set(ix.anios.filter((a) => a.en_curso).map((a) => a.anio))) : []), [activo, archivos, q, ix]);
  return (
    <div className="gas-buscar">
      <label className="lbl" htmlFor="gas-q">Buscar un organismo, programa o partida</label>
      <input id="gas-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Por ejemplo: universidad, ANSES, Conicet" autoComplete="off" />
      {activo && (
        <div className="gas-resultados" role="status" aria-live="polite">
          {cargando && !archivos.length ? <p className="note">Buscando en todos los años…</p>
            : !res.length ? <p className="note">No hay nada con ese nombre.</p> : (
              <ul>
                {res.map((r, i) => {
                  return (
                    <li key={i}>
                      <button type="button" onClick={() => { setQ(""); onIr({ forma: r.forma, ruta: r.ruta, anio: r.anio }); }}>
                        <span className="gas-res-n">{r.n}</span>
                        <small>{nombreForma(r.forma)} · {r.nivel}{r.ruta.length > 1 ? `, en ${r.donde}` : ""} · {aniosTxt(r.anios)}</small>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          {cargando && archivos.length > 0 && <p className="note">Buscando en el resto de los años…</p>}
        </div>
      )}
    </div>
  );
}

/** Comparar años: el nodo abierto en cada año cerrado, en pesos de hoy y en % del PIB. Baja los años recién al abrirlo. */
function Comparar({ ix, forma, ruta, deflactor }: { ix: IndiceGasto; forma: Forma; ruta: string[]; deflactor: Deflactor }) {
  const [abierto, setAbierto] = useState(false);
  const { listos, cargando } = useGastoAnios(ix, abierto ? ix.anios.filter((a) => !a.en_curso).map((a) => a.archivo) : []);
  const porAnio = useMemo(() => new Map([...listos.values()].map((a) => [a.anio, a])), [listos]);
  const serie = useMemo(() => (abierto ? serieNodo(ix, porAnio, forma, ruta, deflactor) : null), [abierto, ix, porAnio, forma, ruta.join("~"), deflactor]);   // eslint-disable-line react-hooks/exhaustive-deps
  const nombre = ruta.length ? ruta[ruta.length - 1] : "Gasto total";
  const decPib = decPctDe((serie?.puntos ?? []).map((x) => x.pib));   // los mismos decimales que la lista: un organismo chico no queda en "0,00 %"
  const fmtPib = (v: number) => `${nfDec(decPib).format(v)} %`;
  return (
    <Capitulo titulo={`${nombre} año por año`}>
      <details className="gas-comparar" onToggle={(e) => setAbierto((e.target as HTMLDetailsElement).open)}>
        <summary>Comparar años: {nombre}</summary>
        {!serie || (cargando && serie.puntos.length < 2) ? <div className="gas-reserva"><Cargando texto="Cargando los años…" /></div>
          : serie.puntos.length < 2 ? <p className="note">Hay un solo año con este nombre: no hay con qué comparar.</p> : (
            <>
              <p className="note">Lo gastado (devengado) en cada año cerrado{serie.larga ? ", desde 2004 con la serie por finalidad y función del Ministerio de Economía" : ""}. El año en curso no entra porque todavía no terminó.</p>
              {otraUbicacionTxt(serie) && <p className="note">{otraUbicacionTxt(serie)}</p>}
              <div className="gas-graficos">
                <MiniSerie titulo={`En pesos de ${serie.ref}`} puntos={serie.puntos.map((x) => [x.anio, x.hoy])} fmt={(v) => fmtMillones(v)} />
                <MiniSerie titulo="En % del PIB" puntos={serie.puntos.map((x) => [x.anio, x.pib])} fmt={fmtPib} />
              </div>
              <details className="gas-tabla-anios">
                <summary>Ver año por año</summary>
                <div className="tablewrap">
                  <table>
                    <thead><tr><th scope="col">Año</th><th scope="col">Pesos de {serie.ref}</th><th scope="col">% del PIB</th></tr></thead>
                    <tbody>
                      {[...serie.puntos].reverse().map((x) => (
                        <tr key={x.anio}><th scope="row">{x.anio}</th><td>{x.hoy != null ? fmtMillones(x.hoy) : "–"}</td><td>{x.pib != null ? fmtPib(x.pib) : "–"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
      </details>
    </Capitulo>
  );
}

function MiniSerie({ titulo, puntos, fmt }: { titulo: string; puntos: [number, number | null][]; fmt: (v: number) => string }) {
  const con = puntos.filter((x): x is [number, number] => x[1] != null);
  if (con.length < 2) return <div className="gas-evo-mini"><h3>{titulo}</h3><p className="note">Sin datos suficientes.</p></div>;
  const a = con[0], z = con[con.length - 1];
  return (
    <div className="gas-evo-mini">
      <h3>{titulo}</h3>
      <Sparkline v={puntos.map((x) => x[1])} desde={0} />
      <p className="gas-evo-ext"><span>{a[0]}: <b>{fmt(a[1])}</b></span><span>{z[0]}: <b>{fmt(z[1])}</b></span></p>
    </div>
  );
}

function Pie({ ix, anio }: { ix: IndiceGasto; anio: number }) {
  const a = ix.anios.find((x) => x.anio === anio);
  const enCurso = ix.anios.filter((x) => x.en_curso);
  return (
    <details className="gas-mide">
      <summary>Cómo se mide</summary>
      <ul className="method">
        <li><b>Qué incluye</b>: la Administración Nacional (la administración central, los organismos descentralizados y la seguridad social, como la ANSES). <b>No incluye</b> las empresas públicas ni los fondos fiduciarios, y tampoco el gasto de las provincias ni de los municipios con sus propios recursos (sí lo que la Nación les transfiere).</li>
        <li><b>Presupuestado</b>: lo que aprobó la ley de presupuesto al empezar el año. <b>Vigente</b>: el presupuesto con las modificaciones que se le hicieron durante el año. <b>Gastado (devengado)</b>: el gasto ya hecho, cuando el bien o el servicio se recibió y nace la obligación de pagarlo, aunque todavía no se haya pagado. El % ejecutado es lo gastado sobre lo vigente; si una fila no lo muestra, es porque la fuente no trae el crédito vigente completo en ese nivel (pasa, por ejemplo, con cada universidad).</li>
        <li><b>Pesos de hoy</b>: el monto de cada año ajustado por inflación con el IPC (el IPC del último mes publicado sobre el IPC promedio de ese año). <b>% del PIB</b>: sobre el producto bruto de ese año a precios corrientes.</li>
        <li><b>Universidades</b>: no figuran como organismos del presupuesto: reciben transferencias del programa “Desarrollo de la Educación Superior”, que se abre por universidad en Quién. <Link prefetch={false} href="/universidades/">Cuánto reciben las universidades</Link>, con su evolución, los estudiantes y el control.</li>
        <li><b>Nombres</b>: en palabras de todos los días; el nombre del presupuesto aparece al abrir cada nivel. Un organismo que cambió de ministerio se sigue por su nombre.</li>
        <li><b>Fuente</b>: {a ? fuenteTxt(a) : "Presupuesto Abierto (Ministerio de Economía)"}.{enCurso.map((x) => ` ${x.anio} está en curso: los datos llegan hasta el ${fechaLarga(x.actualizado) ?? "último dato publicado"} y cambian a medida que avanza el año.`).join("")} Montos redondeados: por eso se muestra la diferencia por redondeo cuando la suma no da justo.</li>
      </ul>
    </details>
  );
}
