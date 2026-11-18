"use client";
// Tarifas y subsidios (/tarifas/, docs/specs/tarifas-y-datos-calientes-4.md, fase 3): quién paga la energía, cuánto se paga en AMBA, Córdoba y Santa Fe,
// el AMBA mes a mes (IIEP) y qué subsidios hay con cuántos los reciben. Todas las cuentas salen de lib/tarifas.ts.
// Sin tarifas.json la página dice que no hay datos. Estado en la URL: `s` (servicio) y `m=hoy` (pesos de hoy).
import { useMemo } from "react";
import Link from "next/link";
import { useTarifas } from "../useTarifas";
import { useSeccion } from "../useSeccion";
import { Cargando } from "../ui";
import { Capitulo } from "../sistema/Capitulo";
import { FilaChips } from "../sistema/FilaChips";
import { nf0 } from "@/lib/formato";
import { crearDeflactorMensual, type DeflactorMensual } from "@/lib/gasto-mensual";
import { hrefFijo } from "@/lib/datos-fijos";
import { hrefDato } from "@/lib/temas";
import {
  LUGARES, SERVICIOS, SERVICIO_DEFECTO, esServicio, filasDe, fotosDe, hrefAmba, restoPct, txtFecha, txtMes, txtPct, txtPesos, valorFactura,
  type Cuadro, type Servicio, type Tarifas,
} from "@/lib/tarifas";
import { useParams } from "@/lib/url";

export function TarifasPagina() {
  const { estado, datos } = useTarifas();
  const sec = useSeccion([]);
  const m = sec.motor, listo = !!m && !sec.ocupado;
  const deflactor = useMemo(() => (m && listo ? crearDeflactorMensual(m.F, m.base().IPC) : null), [m, listo]);
  if (estado === "cargando") return <Cargando texto="Cargando las tarifas…" />;
  if (!datos) {
    return (
      <section className="tarifas">
        <Capitulo titulo="Todavía no hay datos de tarifas">
          <p className="note" role="status">No hay datos de tarifas y subsidios cargados en este momento. El resto del sitio sigue funcionando; probá de nuevo más tarde.</p>
        </Capitulo>
      </section>
    );
  }
  return <Cuerpo t={datos} deflactor={deflactor} />;
}

/** Link a la ficha de un dato propio de la sección. */
const ficha = (id: string): string => hrefDato({ id, med: "asis", rel: null, modo: "compra", esc: "" });

function Cuerpo({ t, deflactor }: { t: Tarifas; deflactor: DeflactorMensual | null }) {
  return (
    <section className="tarifas">
      <QuienPaga t={t} />
      <Facturas t={t} deflactor={deflactor} />
      <Capitulo titulo="El AMBA mes a mes (IIEP)" bajada="El Observatorio de Tarifas y Subsidios del IIEP (UBA-CONICET) publica cada mes cuánto paga un hogar del AMBA. Es un centro universitario, no un organismo oficial." id="amba">
        <p><Link prefetch={false} href={hrefAmba()} className="enlace-parte">Ver las facturas de luz, gas y agua del AMBA, mes a mes, en un gráfico</Link></p>
      </Capitulo>
      <Subsidios t={t} />
      <Pie t={t} />
    </section>
  );
}

function QuienPaga({ t }: { t: Tarifas }) {
  const ii = t.iiep, ca = t.cammesa;
  return (
    <Capitulo titulo="¿Quién paga la energía?" bajada="Dos cuentas distintas: no se pueden sumar ni comparar entre sí." id="quien-paga">
      <dl className="tarifas-cifras" aria-label="Quién paga los servicios">
        {ii && ii.canasta != null && (
          <div>
            <dt>Servicios de un hogar del AMBA, {txtMes(ii.mes)}</dt>
            <dd className="tarifas-num">{txtPct(ii.canasta)}</dd>
            <dd className="tarifas-sub">
              Los hogares del AMBA pagan el {txtPct(ii.canasta)} del costo de los servicios (luz, gas y agua); el Estado, el {txtPct(restoPct(ii.canasta))} restante.
              {ii.luz != null && ii.gas != null && <> En la luz pagan el {txtPct(ii.luz)} y en el gas el {txtPct(ii.gas)}.</>}
            </dd>
            <dd className="tarifas-sub">
              Fuente: Observatorio de Tarifas y Subsidios, IIEP (UBA-CONICET){ii.url ? <> · <a href={ii.url} target="_blank" rel="noopener noreferrer">Ver el reporte</a></> : null} ·{" "}
              <Link prefetch={false} href={ficha("cobertura_hogar_canasta")}>Ver la serie</Link>
            </dd>
          </div>
        )}
        {ca && ca.luz != null && (
          <div>
            <dt>Electricidad, {txtMes(ca.mes)}</dt>
            <dd className="tarifas-num">{txtPct(ca.luz)}</dd>
            <dd className="tarifas-sub">
              Las tarifas cubren el {txtPct(ca.luz)} del costo de la electricidad. Es el precio que pagan las distribuidoras sobre el costo de abastecerla, los dos en dólares, para toda la demanda
              que compra a ese precio, no solo hogares. Lo que falta lo cubre el Estado. Desde noviembre de 2025 el precio estacional también incluye los servicios
              asociados, así que la cobertura de antes y de después de ese mes no se compara directo.
            </dd>
            <dd className="tarifas-sub">
              Cuenta propia con datos de CAMMESA{ca.url ? <> · <a href={ca.url} target="_blank" rel="noopener noreferrer">Ver la fuente</a></> : null} ·{" "}
              <Link prefetch={false} href={hrefFijo("quien-paga-la-luz")}>Ver la serie</Link>
            </dd>
          </div>
        )}
      </dl>
      {!ii && !ca && <p className="note" role="status">Todavía no hay cifras de cobertura cargadas.</p>}
      <p className="note">Miden cosas distintas: la del IIEP es la factura de un hogar del AMBA contra el costo de abastecerla; la de CAMMESA, el precio mayorista de la electricidad contra su costo, para todos los usuarios.</p>
    </Capitulo>
  );
}

function Facturas({ t, deflactor }: { t: Tarifas; deflactor: DeflactorMensual | null }) {
  const [p, set, montado] = useParams();
  const sp = montado ? p.get("s") : null;
  const servicio: Servicio = esServicio(sp) ? sp : SERVICIO_DEFECTO;
  const hoy = !!deflactor && montado && p.get("m") === "hoy";
  const filas = useMemo(() => filasDe(t, servicio), [t, servicio]);
  const faltantes = t.faltantes.filter((f) => f.servicio == null || f.servicio === servicio);
  const consumo = t.consumos[servicio];
  const nombre = SERVICIOS.find((s) => s[0] === servicio)![1].toLowerCase();
  if (!t.cuadros.length) return null;
  const conDato = LUGARES.filter(([l]) => t.cuadros.some((c) => c.servicio === servicio && c.lugar === l)).map(([, n]) => n);
  const lugaresTxt = conDato.length > 1 ? `${conDato.slice(0, -1).join(", ")} y ${conDato[conDato.length - 1]}` : conDato[0];
  const bajada = conDato.length === 0
    ? `Factura típica de ${nombre} sin impuestos: todavía no hay ningún cuadro tarifario cargado con su fuente (abajo, por qué).`
    : conDato.length === LUGARES.length
      ? `Factura típica de ${nombre} sin impuestos, con la misma cuenta para AMBA, Córdoba y Santa Fe: cargo fijo más cargo variable por el consumo de referencia.`
      : `Factura típica de ${nombre} sin impuestos: cargo fijo más cargo variable por el consumo de referencia. Por ahora hay cuadros cargados solo de ${lugaresTxt} (abajo, por qué faltan los demás).`;
  return (
    <Capitulo titulo="Cuánto se paga en cada lugar" bajada={bajada} id="facturas">
      <FilaChips etiqueta="Servicio" valor={servicio} opciones={SERVICIOS} onElegir={(v) => set({ s: v === SERVICIO_DEFECTO ? null : v })} />
      <FilaChips
        etiqueta="Moneda" valor={hoy ? "hoy" : "corr"}
        opciones={[["corr", "Pesos de cada momento"], ...(deflactor ? [["hoy", `Pesos de hoy (${deflactor.ref})`] as [string, string]] : [])]}
        onElegir={(v) => set({ m: v === "hoy" ? "hoy" : null })}
      />
      {filas.length === 0 ? (
        <p className="note" role="status">No hay facturas de {nombre} para mostrar: ninguna empresa publica un cuadro que se pueda leer y comparar (detalle en «Qué falta y por qué»).</p>
      ) : (
      <div className="tablewrap tarifas-tabla" role="region" aria-label={`Factura de ${nombre} por lugar y año`} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col" rowSpan={2}>Corte</th>
              {LUGARES.map(([l, n]) => <th key={l} scope="colgroup" colSpan={2} className="tarifas-grupo">{n}</th>)}
            </tr>
            <tr>
              {LUGARES.flatMap(([l]) => [
                <th key={`${l}-s`} scope="col" className="tarifas-num-col">Sin subsidio</th>,
                <th key={`${l}-c`} scope="col" className="tarifas-num-col">Con subsidio</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.corte}>
                <th scope="row">{f.etiqueta}</th>
                {LUGARES.flatMap(([l]) => (["sin_subsidio", "con_subsidio"] as const).map((c) => (
                  <Celda key={`${l}-${c}`} c={f.celdas[`${l}:${c}`]} deflactor={hoy ? deflactor : null} />
                )))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      <ul className="method">
        {consumo && <li><b>Consumo de referencia</b>: {consumo}.</li>}
        <li>Las facturas van <b>sin impuestos</b> (cambian por municipio). «—» quiere decir que no hay dato cargado con su fuente o que ese año no existía un subsidio residencial para ese servicio y lugar.</li>
        <li>Cada valor lleva el link a la norma o al cuadro tarifario de donde sale. {hoy ? "En pesos de hoy: ajustado por el índice de precios al consumidor desde el mes de vigencia del cuadro." : "Pesos corrientes: no están ajustados por inflación."}</li>
        <li>«Corte»: el cuadro vigente cada diciembre y el último vigente. «Con subsidio» es el nivel 2 (hogares de menores ingresos) cuando el cuadro lo trae; la tarifa social y el esquema de 2026 (SEF) son descuentos fuera del cuadro y no se muestran acá (ver «Qué subsidios hay»).</li>
        {servicio === "gas" && <li>Sin la Zona Fría: en parte de Córdoba, Santa Fe y la provincia de Buenos Aires muchos hogares tienen un descuento de 30 % o 50 % que no está en esta cuenta.</li>}
      </ul>
      {faltantes.length > 0 && (
        <details>
          <summary>Qué falta y por qué ({nf0.format(faltantes.length)})</summary>
          <ul className="method">{faltantes.map((f, i) => <li key={i}>{f.texto}</li>)}</ul>
        </details>
      )}
    </Capitulo>
  );
}

function Celda({ c, deflactor }: { c: Cuadro | undefined; deflactor: DeflactorMensual | null }) {
  const v = c ? valorFactura(c, deflactor ? deflactor.factor : null) : null;
  if (!c || v == null) {
    return <td className="tarifas-num-col"><span aria-label={c?.nota ? `Sin dato: ${c.nota}` : "Sin dato"}>—</span>{c?.nota ? <small>{c.nota}</small> : null}</td>;
  }
  return (
    <td className="tarifas-num-col">
      {c.norma
        ? <a href={c.norma} target="_blank" rel="noopener noreferrer" aria-label={`${txtPesos(v)}, cuadro vigente desde ${txtFecha(c.vigencia)}, ${c.empresa}: ver la norma`}>{txtPesos(v)}</a>
        : txtPesos(v)}
      <small>{c.empresa ? `${c.empresa} · ` : ""}desde {txtFecha(c.vigencia)}</small>
    </td>
  );
}

function Subsidios({ t }: { t: Tarifas }) {
  if (!t.tipos.length && !t.cantidades.length) return null;
  const fotos = fotosDe(t);
  return (
    <Capitulo titulo="Qué subsidios hay y cuántos los reciben" bajada="No hay una serie oficial de cuántos hogares reciben cada subsidio: son fotos sueltas de informes oficiales, cada una con su fecha." id="subsidios">
      {t.tipos.length > 0 && (
        <div className="tablewrap tarifas-tabla" role="region" aria-label="Tipos de subsidio" tabIndex={0}>
          <table>
            <thead>
              <tr><th scope="col">Subsidio</th><th scope="col">Desde – hasta</th><th scope="col">A quién</th><th scope="col">Qué descuento</th><th scope="col">Norma</th></tr>
            </thead>
            <tbody>
              {t.tipos.map((x, i) => (
                <tr key={`${x.nombre}-${i}`}>
                  <th scope="row">{x.nombre}</th>
                  <td>{x.desde ? `${txtFecha(x.desde)} – ${x.hasta ? txtFecha(x.hasta) : "vigente"}` : x.hasta ? `hasta ${txtFecha(x.hasta)}` : "vigente"}</td>
                  <td>{x.quienes || "–"}</td>
                  <td>{x.descuento || "–"}</td>
                  <td>{x.norma ? <a href={x.norma} target="_blank" rel="noopener noreferrer" aria-label={`Norma de ${x.nombre}`}>Ver la norma</a> : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {fotos.length > 0 && (
        <>
          <h3 className="tarifas-h3">Cuántos los reciben</h3>
          <div className="tablewrap tarifas-tabla" role="region" aria-label="Cuántos usuarios reciben cada subsidio" tabIndex={0}>
            <table>
              <thead>
                <tr><th scope="col">Subsidio</th><th scope="col">Servicio</th><th scope="col">Dónde</th><th scope="col">Fecha</th><th scope="col">Cuántos</th><th scope="col">Fuente</th></tr>
              </thead>
              <tbody>
                {fotos.map((f, i) => (
                  <tr key={i}>
                    <th scope="row">{f.subsidio}</th>
                    <td>{f.servicio}</td>
                    <td>{f.alcance}</td>
                    <td>{f.fecha ? txtMes(f.fecha) : "–"}</td>
                    <td>
                      {f.partes.map((p, j) => (
                        <span key={j} className="tarifas-parte">{p.nivel ? `${p.nivel}: ` : ""}{nf0.format(p.valor)}</span>
                      ))}
                      {f.total != null && <span className="tarifas-parte"><b>Total: {nf0.format(f.total)}</b></span>}
                      <small>{f.unidad}</small>
                    </td>
                    <td>
                      {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer" title={f.cita || undefined}>{f.fuente || "Ver la fuente"}</a> : (f.fuente || "–")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="note">Son fotos de informes oficiales (sobre todo los del Jefe de Gabinete al Congreso), no una serie: cada una cuenta usuarios de un momento y, a veces, de un solo servicio. Del esquema de Subsidios Energéticos Focalizados de 2026 hay cifras del país, no por provincia.</p>
    </Capitulo>
  );
}

function Pie({ t }: { t: Tarifas }) {
  const act = t.actualizado ? txtFecha(t.actualizado) : null;
  return (
    <details>
      <summary>Fuentes y cómo leer estos datos</summary>
      <ul className="method">
        {t.fuentes.map((f, i) => <li key={`${f.texto}-${i}`}>{f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer">{f.texto}</a> : f.texto}</li>)}
        <li>No hay una serie oficial de facturas ni de cuánto del costo pagan los usuarios: se muestran tres cuentas separadas (la del IIEP, la propia con los cuadros tarifarios y la propia con CAMMESA), cada una con su definición.</li>
        {t.nota && <li>{t.nota}</li>}
        {act && <li>Última actualización de esta página: {act}.</li>}
      </ul>
    </details>
  );
}
