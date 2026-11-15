"use client";
import Link from "next/link";
import { Sparkline } from "./Sparkline";
import { Delta } from "./sistema/Delta";
import type { Evaluada } from "@/lib/plantillas";
import type { Motor } from "@/lib/motor";

/** "−0,1 p.p. contra hace un año" → flecha y cifra con signo (como `Delta`, R6 de la tanda 7); otro texto queda tal cual. */
function Cambio({ texto, cls }: { texto: string; cls: Evaluada["cls"] }) {
  const m = /^([+\-−]\S+(?: p\.p\.| %)?) contra (.+)$/.exec(texto);
  if (!m) return <>{texto}</>;
  const dir = /^\+/.test(m[1]) ? 1 : /^[−-]/.test(m[1]) && !/^[−-]0(,0+)?(\s|$)/.test(m[1]) ? -1 : 0;
  return <Delta texto={m[1]} tono={cls ?? "neutro"} dir={dir} contra={`vs ${m[2]}`} />;
}

/** Tarjeta con un valor ya calculado: la de los principales de cada tema.
 *  Con `onElegir` la tarjeta no navega: es un botón que pone la variable en la ficha del dato; `elegido` la marca. */
export function CardValor({ titulo, ev, href, motor, onElegir, elegido }: {
  titulo: string; ev: Evaluada; href: string; motor: Motor | null; onElegir?: () => void; elegido?: boolean;
}) {
  const desde = motor ? motor.idxDe("2003-01") : 0;
  const c = ev.cls;
  const T = onElegir ? "span" : "div";   // dentro de un botón solo van elementos de texto (el CSS los muestra en bloque)
  const cuerpo = (
    <>
      <T className="k" title={titulo}>{titulo}</T>
      <T className="v">{ev.val}<small>{ev.fecha}</small></T>
      <T className={`d${c ? " var-" + c : ""}`}><Cambio texto={ev.texto} cls={c} /></T>
      <Sparkline v={ev.v} desde={desde} cls={c} />
    </>
  );
  if (onElegir) {
    return (
      <div className={`plantilla${elegido ? " ficha-elegida" : ""}`}>
        <button type="button" className="plantilla-link ficha-elegir" aria-pressed={!!elegido} aria-label={`Ver ${titulo} en la ficha del dato: ${ev.val}`} onClick={onElegir}>{cuerpo}</button>
      </div>
    );
  }
  return (
    <div className="plantilla">
      <Link prefetch={false} href={href} className="plantilla-link" aria-label={`Abrir en Histórico: ${titulo}`}>{cuerpo}</Link>
    </div>
  );
}
