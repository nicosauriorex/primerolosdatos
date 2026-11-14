"use client";
// Semáforo de actividad (/semaforo/, docs/specs/semaforo-actividad.md): una tabla con un indicador por fila y los últimos meses en columnas;
// cada celda lleva la variación con signo y un fondo verde (subió) o rojo (bajó). Abajo, qué porcentaje de los indicadores subió cada mes.
// Tocar una fila abre el gráfico de los últimos 5 años. Compartir: imagen y link. Todas las cuentas salen de lib/semaforo.ts.
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSemaforo } from "../useSemaforo";
import { useDatos } from "../DatosProvider";
import { useConfig } from "../ConfigProvider";
import { Cargando, Modal } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { CabeceraDato } from "../sistema/CabeceraDato";
import { CompartirHoja } from "../sistema/CompartirHoja";
import { FilaChips } from "../sistema/FilaChips";
import { InfoPunto } from "../sistema/InfoPunto";
import { GraficoSemaforo } from "../GraficoSemaforo";
import { PanelSemaforo } from "../PanelSemaforo";
import { medidaInicial } from "@/lib/config";
import { MESES } from "@/lib/formato";
import { medDefaultDe } from "@/lib/motor";
import {
  MEDIDA_DEFECTO, MEDIDAS, NO_INCLUIDOS, admiteMedida, armarTabla, controlTxt, esMedida, fraseSemaforo, idCatalogo, txtMes, txtVariacion, ultimoMesConVariacion, variacionEn,
  type FilaSem, type Indicador, type Medida, type Semaforo, type Tabla,
} from "@/lib/semaforo";
import { hrefDato } from "@/lib/temas";
import { useParams } from "@/lib/url";

const RUTA = "/semaforo/";

/** "2026-11-12T12:50:08-03:00" → "12-nov, 12:50" (la hora ya viene en hora argentina). */
function actualizadoTxt(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(iso);
  return m ? `${m[3]}-${MESES[+m[2] - 1]}, ${m[4]}` : null;
}

export function Semaforo() {
  const { datos, error } = useSemaforo();
  if (error) return <div className="sem-error"><p className="error" role="alert">{error}</p><p className="note">El resto del sitio sigue funcionando. Probá de nuevo en un rato.</p></div>;
  if (!datos) return <Cargando texto="Cargando el semáforo…" />;
  return <Cuerpo datos={datos} />;
}

function Cuerpo({ datos }: { datos: Semaforo }) {
  const [p, set, montado] = useParams();
  const [imagen, setImagen] = useState(false);
  const medida: Medida = esMedida(p.get("med")) ? (p.get("med") as Medida) : MEDIDA_DEFECTO;
  const tabla = useMemo(() => armarTabla(datos, medida), [datos, medida]);
  const abierto = montado ? datos.indicadores.find((i) => i.clave === p.get("v")) ?? null : null;
  const act = actualizadoTxt(datos.actualizado);
  const href = medida === MEDIDA_DEFECTO ? RUTA : `${RUTA}?med=${medida}`;
  const titulo = tabla ? `Semáforo de actividad: ${tabla.resumen.charAt(0).toLowerCase()}${tabla.resumen.slice(1)}` : "Semáforo de actividad";
  const resp = tabla ? fraseSemaforo(tabla) : null;

  return (
    <section className="sem">
      {tabla && resp && (
        <CabeceraDato nivel={2} titulo="Indicadores que subieron" cifra={resp.cifra} fecha={resp.fecha} frase={resp.frase}
          deltas={resp.delta ? [resp.delta] : []}
          info={<>Cómo viene la actividad de un vistazo: cada fila es un indicador y cada columna, un mes. {tabla.comparado}</>} />
      )}

      <div className="sem-controles">
        <FilaChips opciones={MEDIDAS} valor={medida} etiqueta="Medida del semáforo" onElegir={(m) => set({ med: m === MEDIDA_DEFECTO ? null : m, v: null })} />
        <InfoPunto etiqueta="Por qué mes contra mes no tiene todos los indicadores">
          Mes contra mes usa solo las series sin estacionalidad que publica el organismo (actividad económica, industria, minería, construcción y empleo) y la confianza del consumidor.
          En los demás indicadores, la fila dice “solo interanual”. El detalle está en “Cómo se mide”.
        </InfoPunto>
      </div>

      <Capitulo titulo="Indicador por indicador" bajada="Cada fila es un indicador y cada columna, un mes. Verde: subió (más actividad). Rojo: bajó (menos actividad). El color sigue el signo de la variación; en importaciones, subir es más compras al exterior. Tocá una fila para ver su gráfico."
        acciones={tabla ? <CompartirHoja href={href} titulo={titulo} onImagen={() => setImagen(true)} /> : undefined}>
        {tabla ? <Grilla tabla={tabla} medida={medida} onAbrir={(i) => set({ v: i.clave })} /> : <p className="note">No hay datos para esta medida.</p>}
      </Capitulo>

      <ComoSeCalcula datos={datos} act={act} />
      <NoIncluidos />

      {abierto && <VentanaFila ind={abierto} onCerrar={() => set({ v: null })} />}
      {imagen && tabla && <PanelSemaforo tabla={tabla} titulo={titulo} href={href} onCerrar={() => setImagen(false)} />}
    </section>
  );
}

/** Fila de difusión: el porcentaje de indicadores que subieron cada mes. Va arriba de los grupos (es la respuesta) y se repite abajo. */
function FilaDifusion({ t, id }: { t: Tabla; id: string }) {
  return (
    <tr className="sem-dif" id={id}>
      <th scope="row">Indicadores que subieron<small>% de los que tienen dato ese mes</small></th>
      {t.difusion.map((d) => (
        <td key={d.mes} className={d.atenuada ? "atenuada" : undefined}>
          <b>{d.txtPct}</b>
          <small>{d.entran ? `${d.suben} de ${d.entran}` : "sin datos"}</small>
          {d.atenuada && <span className="sr-solo">, pocos indicadores con dato</span>}
        </td>
      ))}
    </tr>
  );
}

function Grilla({ tabla: t, medida, onAbrir }: { tabla: Tabla; medida: Medida; onAbrir: (i: Indicador) => void }) {
  const caja = useRef<HTMLDivElement>(null);
  // arranca deslizada hacia los meses más nuevos (la primera columna queda fija a la izquierda). El ancho de esa columna se ajusta
  // para que los meses visibles entren enteros: ninguno queda a medias debajo de la columna fija (variable --sem-w1, ver globals.css)
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    // al cargar arranca en el último mes; al cambiar el ancho solo se reajusta la columna fija (en el celular, mostrar u ocultar la barra del navegador cambia solo el alto: no se toca nada)
    let ancho = -1;
    const ajustar = () => {
      if (el.clientWidth === ancho) return;
      const primera = ancho < 0;
      ancho = el.clientWidth;
      el.style.removeProperty("--sem-w1");
      const th1 = el.querySelector("thead th:first-child") as HTMLElement | null, thMes = el.querySelector("thead th:nth-child(2)") as HTMLElement | null;
      if (th1 && thMes && el.scrollWidth > el.clientWidth) {
        const cw = thMes.offsetWidth, n = Math.floor((el.clientWidth - th1.offsetWidth) / cw);
        if (n >= 1 && cw > 0) el.style.setProperty("--sem-w1", `${el.clientWidth - n * cw}px`);
      }
      if (primera) el.scrollLeft = el.scrollWidth;
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [medida, t]);
  return (
    <div className="tablewrap fija sem-tabla" ref={caja} role="region" aria-label="Semáforo de actividad: tabla de indicadores por mes" tabIndex={0}>
      <table className="sem-t">
        <thead>
          <tr>
            <th scope="col">Indicador</th>
            {t.mesesTxt.map((m) => <th scope="col" key={m}>{m}</th>)}
          </tr>
        </thead>
        <tbody>
          <FilaDifusion t={t} id="sem-dif-arriba" />
          {t.grupos.map((g) => (
            <Fragment key={g.grupo}>
              <tr className="sem-grupo"><th scope="rowgroup">{g.grupo}</th><td colSpan={t.meses.length} /></tr>
              {g.filas.map((f) => <Fila key={f.ind.clave} f={f} n={t.meses.length} onAbrir={onAbrir} />)}
            </Fragment>
          ))}
          <FilaDifusion t={t} id="sem-dif-abajo" />
        </tbody>
      </table>
    </div>
  );
}

function Fila({ f, n, onAbrir }: { f: FilaSem; n: number; onAbrir: (i: Indicador) => void }) {
  return (
    <tr className="sem-fila" onClick={() => onAbrir(f.ind)}>
      <th scope="row">
        <button type="button" className="sem-abrir" aria-haspopup="dialog" aria-label={`Ver el gráfico de ${f.ind.nombre}. ${f.ind.fuente}${f.ultimo ? `, último dato ${f.ultimo}` : ""}`}>
          <span className="sem-n">{f.ind.nombre}</span>
          <small>{f.ind.fuente}{f.ultimo ? ` · último dato ${f.ultimo}` : ""}</small>
        </button>
      </th>
      {!f.admite
        ? <td colSpan={n} className="sem-solo-ia">solo interanual</td>
        : f.celdas.map((c, k) => c
          ? <td key={k} className={`sem-c ${c.dir} n${c.nivel}`} aria-label={c.aria}>{c.txt}</td>
          : <td key={k} className="sem-c vacia"><span aria-hidden="true">–</span><span className="sr-solo">sin dato</span></td>)}
    </tr>
  );
}

/** Ventana con el gráfico de una fila, sus últimas variaciones y el enlace a la ficha si la serie está en el catálogo. */
function VentanaFila({ ind, onCerrar }: { ind: Indicador; onCerrar: () => void }) {
  const { metas } = useDatos();
  const { config } = useConfig();
  const meta = metas.find((s) => s.id === idCatalogo(ind.id ?? ""));
  const enlace = ind.id && meta ? hrefDato({ id: meta.id, med: medidaInicial(meta.tipo, medDefaultDe(meta), config), rel: null, modo: "compra", esc: "" }) : null;
  const ultimas = (["ia", "mm"] as Medida[]).map((med) => {
    const m = ultimoMesConVariacion(ind, med), v = m != null ? variacionEn(ind, med, m) : null;
    return { med, texto: !admiteMedida(ind, med) ? "solo interanual" : m == null || v == null ? "sin dato" : `${txtVariacion(v)} % en ${txtMes(m)}` };
  });
  return (
    <Modal titulo={ind.nombre} onCerrar={onCerrar} ancho>
      <div className="parte-modal">
        <h2>{ind.nombre}</h2>
        <p className="note">{ind.fuente}. {ind.unidad}. Datos mensuales, últimos 5 años.</p>
        <GraficoSemaforo ind={ind} />
        <dl className="parte-extremos">
          <div><dt>Último interanual</dt><dd>{ultimas[0].texto}</dd></div>
          <div><dt>Último mes contra mes</dt><dd>{ultimas[1].texto}</dd></div>
        </dl>
        {enlace && <Link prefetch={false} href={enlace} className="enlace-parte">Ver la ficha de este dato</Link>}
      </div>
    </Modal>
  );
}

function ComoSeCalcula({ datos, act }: { datos: Semaforo; act: string | null }) {
  const control = controlTxt(datos);
  const reales = datos.indicadores.filter((i) => i.real).map((i) => i.nombre.replace(/\s*\(.*\)$/, ""));
  return (
    <details>
      <summary>Cómo se mide</summary>
      <ul className="method">
        <li><b>Qué se ve</b>: variación en %, con un decimal. Sin color: la variación se lee 0,0. Cada fila dice su fuente y el mes de su último dato.{act ? ` Última actualización del sitio: ${act}.` : ""}</li>
        <li><b>Interanual</b> (la medida de entrada): cada mes se compara con el mismo mes del año anterior, con la serie original, así que no hace falta quitarle la estacionalidad. Es la única medida con todos los indicadores.</li>
        <li><b>Mes contra mes</b>: cada mes se compara con el anterior, con la serie sin estacionalidad que publica el organismo. Solo entran los indicadores que tienen ese ajuste oficial (actividad económica, industria, minería, construcción y empleo) y la confianza del consumidor, que es una encuesta y no lo necesita. En los demás, la fila dice “solo interanual”.</li>
        <li><b>El color</b>: es el signo de la variación, no un juicio sobre el indicador: verde si subió (más actividad), rojo si bajó (menos actividad), sin color si la variación se lee 0,0. La intensidad compara cada celda con lo habitual de ese mismo indicador en los últimos 5 años (la mediana de sus variaciones, sin importar si subieron o bajaron): así un salto de 30 % en un indicador muy movido no apaga a los demás.</li>
        <li><b>Indicadores que subieron</b>: el porcentaje de los indicadores con dato ese mes cuya variación es positiva. Abajo del porcentaje figura con cuántos se calculó. Si ese mes entraron menos de la mitad de los indicadores (porque todavía no se publicó el resto), la columna se ve en gris.</li>
        <li><b>Meses de cada columna</b>: los últimos 7 meses, hasta el dato más nuevo que haya. Cada indicador se publica con una demora distinta, por eso las columnas más nuevas tienen celdas vacías.</li>
        <li><b>Sin dato</b>: si el valor del mes anterior es cero o negativo, la variación no se calcula y la celda queda vacía.</li>
        {reales.length > 0 && <li><b>En términos reales</b>: {reales.join(", ")} están en pesos y se descuenta la inflación (IPC), para comparar cantidades y no precios.</li>}
        <li>Los organismos revisan sus datos: un mes ya publicado puede cambiar cuando sale el siguiente. No se corrigen feriados ni días hábiles.</li>
      </ul>
      <h3 className="sem-sub">Por qué mes contra mes no incluye todos los indicadores</h3>
      <p className="method">
        Probamos calcular nosotros la serie sin estacionalidad de los indicadores que no la traen y la comparamos con la oficial en los que sí la tienen.{control.length > 0 && " La variación de un mes se apartaba de la oficial, en promedio:"}
      </p>
      {control.length > 0 && <ul className="method">{control.map((c) => <li key={c.nombre}>{c.nombre}: {c.txt}</li>)}</ul>}
      <p className="method">
        {control.length > 0 && "Las variaciones mensuales típicas de estos indicadores son de 1 a 2 puntos, así que errores de ese tamaño alcanzan para dar vuelta el color de una celda: una celda verde donde la serie oficial muestra una baja, o al revés. "}
        Por eso la estimación propia no se muestra: mes contra mes usa solo series oficiales. Mejorar el método queda para más adelante.
      </p>
    </details>
  );
}

function NoIncluidos() {
  return (
    <details>
      <summary>Indicadores que no pudimos incluir</summary>
      <p className="method">Estos indicadores se miran mucho, pero sus datos no están publicados en una forma que un programa pueda leer todos los días, así que todavía no están en la tabla:</p>
      <ul className="method">{NO_INCLUIDOS.map(([nombre, fuente]) => <li key={nombre}><b>{nombre}</b> · {fuente}</li>)}</ul>
    </details>
  );
}
