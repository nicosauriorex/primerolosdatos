"use client";
// Zócalo de la portada con las cifras principales del parte diario del Banco Central (docs/specs/parte-diario-bcra.md, R7 de remodelacion-inicio-buscador.md).
// Baja diario_bcra.json (~550 KB) recién cuando el bloque está por entrar en pantalla, para no demorar la portada.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDiario } from "../useDiario";
import { useDeslizable } from "../Movimiento";
import { IconoDerecha } from "../Iconos";
import { Delta } from "../sistema/Delta";
import { variableDe, type ClaveDiario, type Parte, type ResumenVariable } from "@/lib/diario";

const CIFRAS: ClaveDiario[] = ["minorista", "reservas", "compras", "base", "tamar"];
const ROTULO = "En vivo · Banco Central";

/** Ícono propio del Banco Central (dibujo de línea, mismo trazo que los íconos del sitio): frontón, cuatro columnas y escalón. No es el logo oficial. */
export function IconoBanco({ className = "" }: { className?: string }) {
  return (
    <svg className={`icono icono-banco ${className}`} viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">
      <path d="M2 8 10 3l8 5zM4 10v5M8 10v5M12 10v5M16 10v5M2 17.5h16" />
    </svg>
  );
}

export function BloqueParte() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const { parte, error } = useDiario(visible);
  if (error) return null;   // sin el archivo, la portada no muestra un zócalo vacío; la página /bcra/ explica el problema
  return (
    <div ref={ref} className="zocalo-sitio">
      {parte ? <Zocalo parte={parte} /> : (
        <div className="zocalo zocalo-espera">
          <div className="ancho zocalo-in"><span className="zocalo-rotulo"><IconoBanco />{ROTULO}</span><p className="zocalo-nota" role="status">Cargando…</p></div>
        </div>
      )}
    </div>
  );
}

function Zocalo({ parte }: { parte: Parte }) {
  const lista = useRef<HTMLUListElement>(null);
  useDeslizable(lista, false, parte);
  const vars = CIFRAS.map((c) => variableDe(parte, c)).filter((v): v is ResumenVariable => !!v);
  return (
    <Link prefetch={false} href="/bcra/" className="zocalo" aria-label={`Abrir el parte del Banco Central del ${parte.fechaTxt}`}>
      <div className="ancho zocalo-in">
        <div className="zocalo-cab">
          <span className="zocalo-rotulo"><IconoBanco />{ROTULO}</span>
          <span className="zocalo-fecha">Datos del {parte.fechaTxt}</span>
        </div>
        <ul className="zocalo-cifras" ref={lista}>
          {vars.map((v) => (
            <li key={v.clave}>
              <span className="zocalo-n">{v.corto}</span>
              <b>{v.valor}</b>
              <span className="zocalo-var">{v.atrasada ? <small>al {v.fechaTxt}</small> : <Variacion v={v} />}</span>
            </li>
          ))}
        </ul>
        <span className="zocalo-ir" aria-hidden="true"><IconoDerecha /></span>
      </div>
    </Link>
  );
}

/** Cambio contra el día anterior. En compras (un flujo) no hay diferencia con el anterior: no se dice nada. */
function Variacion({ v }: { v: ResumenVariable }) {
  if (!v.difAnterior) return null;
  const t = v.difAnterior;
  if (!/^[+\-−]?\d/.test(t)) return <small>{t}</small>;   // por ejemplo "sin cambios"
  const dir = t.startsWith("+") ? 1 : /^[-−]/.test(t) ? -1 : 0;
  return <Delta texto={t} tono={v.clsAnterior} dir={dir} contra="vs día anterior" />;
}
