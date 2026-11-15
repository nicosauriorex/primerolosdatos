"use client";
// Una sola forma de decir "cambió": flecha ↑/↓ (o raya si no cambia) + texto con signo.
// La flecha sigue a `dir`, no al tono: si sube la inflación, flecha hacia arriba y en rojo.
// En las placas (`en="placa"`) la flecha y el texto van dentro de una píldora azul noche, en verde o rojo de placa; la referencia queda afuera.
import { IconoBaja, IconoIgual, IconoSube } from "./iconos";
import { useAparecer } from "./useAparecer";

export interface DeltaProps {
  /** Ya formateado y con signo, por ejemplo "+0,3 p.p." o "−1,2 %". Un guion inicial se reemplaza por "−". */
  texto: string;
  tono: "bueno" | "malo" | "neutro" | null;
  /** 1 sube, -1 baja, 0 igual */
  dir: 1 | -1 | 0;
  /** Contra qué se compara, por ejemplo "vs sep-26" */
  contra?: string;
  tam?: "normal" | "grande";
  /** Dónde se usa: "placa" es para las placas celestes de la portada (píldora azul noche con la flecha y el texto en verde o rojo de placa). */
  en?: "placa";
  /** Para lectores de pantalla. Si falta, se arma con la dirección, el texto y la referencia. */
  etiqueta?: string;
  /** Solo con `en="placa"`: la píldora entra con escala y opacidad, y la flecha se desliza 4 px, una sola vez al quedar visible. Sin animación con "reducir movimiento". */
  animar?: boolean;
}

export function Delta({ texto, tono, dir, contra, tam = "normal", en, etiqueta, animar }: DeltaProps) {
  const [ref, estado] = useAparecer<HTMLSpanElement>();
  const t = texto.startsWith("-") ? "−" + texto.slice(1) : texto;
  const sinSigno = t.replace(/^[+−]/, "");
  const verbo = dir > 0 ? "Sube" : dir < 0 ? "Baja" : "Sin cambios";
  const refTxt = contra ? contra.replace(/^vs\s+/i, "contra ") : "";
  const aria = etiqueta ?? (dir === 0 ? `${verbo}${refTxt ? " " + refTxt : ""}` : `${verbo} ${sinSigno}${refTxt ? " " + refTxt : ""}`);
  const Marca = dir > 0 ? IconoSube : dir < 0 ? IconoBaja : IconoIgual;
  const placa = en === "placa";
  return (
    <span ref={ref} className={`delta${tam === "grande" ? " delta-grande" : ""}${placa ? " delta-placa" : ""}`} data-tono={tono ?? "neutro"} data-dir={dir}
      data-anim={placa && animar ? estado : undefined} role="img" aria-label={aria}>
      <span className="delta-cuerpo">
        <Marca className="delta-marca" />
        <span className="delta-texto" aria-hidden="true">{t}</span>
      </span>
      {contra ? <span className="delta-ref" aria-hidden="true">{contra}</span> : null}
    </span>
  );
}
