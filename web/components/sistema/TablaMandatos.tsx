"use client";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { IconoAjustes } from "@/components/Iconos";
import { FilaChips } from "./FilaChips";
import { Hoja } from "./Hoja";

export type CeldaMandato = { texto: string; valor?: number | null; tono?: "bueno" | "malo" | null };
/** `cuenta`: solo si a este presidente se le cuenta el inicio distinto que al resto ("Cuenta desde ene-24 (mes después de asumir)"): se dibuja bajo el período, con alerta. */
export type FilaMandato = { id: string; nombre: string; periodo: string; cuenta?: string; color: string; celdas: Record<string, CeldaMandato> };
export type ColumnaMandato = { clave: string; titulo: string; principal?: boolean };
export type TablaMandatosProps = {
  filas: FilaMandato[]; columnas: ColumnaMandato[]; visibles: string[]; extras?: string[]; resaltar?: string; etiqueta: string;
  /** Columnas sumadas (las que se eligen en `AjustesTabla`): las maneja quien usa la tabla (en el link o en su estado). Sin `elegidas`, ninguna. */
  elegidas?: string[];
  /** Una línea bajo la tabla. */
  nota?: ReactNode;
};

/** Qué se cuenta de un mandato que no arranca donde el resto: ícono de alerta y texto en ámbar (no el rojo de "peor"). */
const AvisoCuenta = ({ texto }: { texto: string }) => (
  <span className="tmand-cuenta">
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">
      <path d="M10 3 18 17H2z" /><path d="M10 8v4M10 14.5v.5" />
    </svg>
    <span>{texto}</span>
  </span>
);

const tonoVar = (t?: "bueno" | "malo" | null) => (t === "bueno" ? "var(--bueno)" : t === "malo" ? "var(--malo)" : "var(--text-primary)");

/** Botón "Ajustes" de la tabla (va en la barra del capítulo) y la hoja "Ajustes de la tabla": vista Tabla o Velas y columnas que se suman.
 *  El botón dice qué hay cambiado ("Ajustes · Velas", "Ajustes · 2 columnas más"). Al cerrar, el foco vuelve al botón (lo hace `Hoja`).
 *  `porDefecto`: columnas sumadas que ya vienen de fábrica (no cuentan como "más"). */
export function AjustesTabla({ vista, onVista, columnas, extras, elegidas, onElegidas, porDefecto = [] }: {
  vista?: "tabla" | "velas"; onVista?: (v: "tabla" | "velas") => void;
  columnas: ColumnaMandato[]; extras: string[]; elegidas: string[]; onElegidas: (claves: string[]) => void; porDefecto?: string[];
}) {
  const [abierta, setAbierta] = useState(false);
  const opcionesExtras: [string, string][] = extras.flatMap((k) => { const c = columnas.find((x) => x.clave === k); return c ? [[k, c.titulo] as [string, string]] : []; });
  const set = new Set(elegidas);
  const nMas = elegidas.filter((k) => extras.includes(k) && !porDefecto.includes(k)).length;
  const resumen = [vista === "velas" ? "Velas" : "", nMas > 0 ? `${nMas} ${nMas === 1 ? "columna más" : "columnas más"}` : ""].filter(Boolean).join(" · ");
  const tocar = (k: string) => {
    const n = new Set(set); if (n.has(k)) n.delete(k); else n.add(k);
    onElegidas(extras.filter((x) => n.has(x)));   // en el orden de las columnas
  };
  if (!onVista && opcionesExtras.length === 0) return null;
  return (
    <>
      <button type="button" className="vistabar-ajustes tmand-ajustes-btn" aria-haspopup="dialog" aria-label={`Ajustes de la tabla${resumen ? `: ${resumen}` : ""}`} onClick={() => setAbierta(true)}>
        <IconoAjustes /><span>Ajustes{resumen ? ` · ${resumen}` : ""}</span>
      </button>
      {/* "Listo" va en el pie de la hoja (R3). Cerrar con setAbierta(false) también devuelve la entrada del historial (lo hace `useAtras` al desmontar) */}
      <Hoja titulo="Ajustes de la tabla" abierta={abierta} onCerrar={() => setAbierta(false)}
        pie={<button type="button" className="btn primario hoja-listo" onClick={() => setAbierta(false)}>Listo</button>}>
        {() => (
          <div className="tmand-ajustes">
            {onVista && vista && (
              <div className="tmand-ajuste">
                <span className="tmand-ajuste-rot">Vista</span>
                <FilaChips opciones={[["tabla", "Tabla"], ["velas", "Velas"]]} valor={vista} onElegir={(v) => onVista(v === "velas" ? "velas" : "tabla")} etiqueta="Vista" />
              </div>
            )}
            {opcionesExtras.length > 0 && (vista !== "velas") && (
              <div className="tmand-ajuste">
                <span className="tmand-ajuste-rot">Sumar columnas</span>
                <FilaChips opciones={opcionesExtras} valor={set} onElegir={tocar} etiqueta="Más columnas" />
              </div>
            )}
          </div>
        )}
      </Hoja>
    </>
  );
}

export function TablaMandatos({ filas, columnas, visibles, resaltar, etiqueta, elegidas: elegidasFuera, nota }: TablaMandatosProps) {
  const elegidas = useMemo(() => new Set(elegidasFuera ?? []), [elegidasFuera]);
  const [orden, setOrden] = useState<{ clave: string; dir: 1 | -1 } | null>(null);
  const principal = columnas.find((c) => c.principal) ?? columnas[0];
  const mostradas = useMemo(
    () => columnas.filter((c) => c.clave === principal?.clave || visibles.includes(c.clave) || elegidas.has(c.clave)),
    [columnas, visibles, elegidas, principal],
  );
  const otras = mostradas.filter((c) => c.clave !== principal?.clave);
  const ordenadas = useMemo(() => {
    if (!orden) return filas;
    const k = orden.clave;
    return [...filas].sort((a, b) => {
      const x = a.celdas[k]?.valor, y = b.celdas[k]?.valor;
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x - y) * orden.dir;
    });
  }, [filas, orden]);
  const tope = Math.max(0, ...filas.map((f) => Math.abs((principal && f.celdas[principal.clave]?.valor) || 0)));
  const alternar = (clave: string) => setOrden((o) => (o && o.clave === clave ? (o.dir === -1 ? { clave, dir: 1 } : null) : { clave, dir: -1 }));

  return (
    <div className="tmand">
      <ul className="tmand-lista" aria-label={etiqueta}>
        {ordenadas.map((f) => {
          const p = principal ? f.celdas[principal.clave] : undefined;
          return (
            <li key={f.id} className={`tmand-fila${f.id === resaltar ? " tmand-res" : ""}`} style={{ "--pc": `var(${f.color})` } as CSSProperties}>
              <span className="tmand-raya" aria-hidden="true" />
              <span className="tmand-quien">
                <span className="tmand-nombre">{f.nombre}</span>
                <span className="tmand-periodo">{f.periodo}</span>
                {f.cuenta && <AvisoCuenta texto={f.cuenta} />}
              </span>
              <span className="tmand-prin" style={{ color: tonoVar(p?.tono) }}>
                {p && p.valor != null ? p.texto : "—"}
                {principal && <span className="tmand-prin-t">{principal.titulo}</span>}
              </span>
              {otras.length > 0 && (
                <span className="tmand-resto">
                  {otras.map((c) => `${c.titulo} ${f.celdas[c.clave]?.texto ?? "—"}`).join(" · ")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="tmand-desliza">
      <table className="tmand-tabla">
        <caption className="tmand-cap">{etiqueta}</caption>
        <thead>
          <tr>
            <th scope="col" className="tmand-th-nom">Presidente</th>
            {mostradas.map((c) => {
              const act = orden?.clave === c.clave;
              return (
                <th key={c.clave} scope="col" className={c.clave === principal?.clave ? "tmand-th-prin" : undefined}
                  aria-sort={act ? (orden!.dir === -1 ? "descending" : "ascending") : "none"}>
                  <button type="button" className="tmand-orden" onClick={() => alternar(c.clave)}>
                    {c.titulo}
                    <svg viewBox="0 0 10 14" width="8" height="12" aria-hidden="true" className="tmand-flecha" data-act={act ? (orden!.dir === -1 ? "baja" : "sube") : undefined}>
                      <path d="M5 1 L9 6 H1 Z M5 13 L1 8 H9 Z" fill="currentColor" />
                    </svg>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((f) => (
            <tr key={f.id} className={f.id === resaltar ? "tmand-res" : undefined} style={{ "--pc": `var(${f.color})` } as CSSProperties}>
              <th scope="row" className="tmand-th-fila">
                <span className="tmand-raya" aria-hidden="true" />
                <span className="tmand-quien">
                  <span className="tmand-nombre">{f.nombre}</span>
                  <span className="tmand-periodo">{f.periodo}</span>
                  {f.cuenta && <AvisoCuenta texto={f.cuenta} />}
                </span>
              </th>
              {mostradas.map((c) => {
                const ce = f.celdas[c.clave];
                if (c.clave !== principal?.clave) return <td key={c.clave} className="tmand-celda">{ce?.texto ?? "—"}</td>;
                const v = ce?.valor;
                // Sin dato: solo la raya, sin barra. Con dato: la barra (a partir del centro del riel) y siempre su cifra al lado.
                if (v == null) return <td key={c.clave} className="tmand-celda tmand-celda-prin"><span className="tmand2-vacio">—<span className="sr-solo"> sin dato</span></span></td>;
                const frac = tope ? Math.min(1, Math.abs(v) / tope) : 0;
                const color = ce?.tono ? tonoVar(ce.tono) : "var(--acento)";
                return (
                  <td key={c.clave} className="tmand-celda tmand-celda-prin">
                    <div className="tmand2-caja">
                      <span className="tmand2-riel" aria-hidden="true">
                        <span className={`tmand2-barra${v < 0 ? " tmand2-neg" : ""}`} style={{ width: `${frac * 50}%`, background: color }} />
                      </span>
                      <span className="tmand-num tmand2-num" style={{ color: tonoVar(ce?.tono) }}>{ce?.texto ?? "—"}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {nota ? <p className="tmand-nota">{nota}</p> : null}
    </div>
  );
}
