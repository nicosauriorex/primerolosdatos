"use client";
// Apertura de toda página de un dato: título, cifra con su fecha, deltas, frase y (opcional) el gráfico. Sin caja.
// La cifra se muestra directa (sin animarla): es el dato, y tiene que ser el final desde el primer instante.
import { useEffect, useState, type ReactNode, type Ref } from "react";
import { Delta, type DeltaProps } from "./Delta";
import { InfoPunto } from "./InfoPunto";
import { Desplegable, Plegable, Seg } from "../ui";

/** ¿La pantalla es de computadora (≥ 900 px, donde la cabecera tiene dos columnas)? Empieza en falso (celular) hasta medir. */
function useColumnaDoble(): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)"), f = () => setV(mq.matches);
    f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return v;
}

/** "Cómo verlo": las otras formas de ver la misma variable (mensual, interanual, índice…), como control segmentado con su rótulo. La usan Histórico y la ficha. */
export function ComoVerlo({ opciones, valor, onElegir }: { opciones: [string, string][]; valor: string; onElegir: (v: string) => void }) {
  return (
    <div className="hi-comoverlo" role="group" aria-labelledby="hi-comoverlo-rot">
      <span className="hi-comoverlo-rot lbl" id="hi-comoverlo-rot">Cómo verlo</span>
      <Seg valor={valor} opciones={opciones} onElegir={onElegir} />
    </div>
  );
}

/** `secundarias`: otras medidas del mismo dato (por ejemplo, el interanual de la inflación mensual), como cifras chicas con su rótulo.
 *  `fuente`: la fuente pública del dato (la misma que imprime la imagen); sale en un renglón chico debajo de la cifra y de las secundarias.
 *  `mesDato`: el mes del último dato; con `fuente` completa el renglón ("Fuente: INDEC · dato de oct-26").
 *  `extras`: las comparaciones de más (inicio del período, promedio, mediana, máximo, mínimo), con la misma `Delta`. En computadora (dos columnas), en el
 *  chip "Más comparaciones" debajo de las dos variaciones, que abre un panel ENCIMA de la página (no empuja el gráfico hacia abajo; pedido 2026-11-15);
 *  en el celular, plegadas en "Más comparaciones" justo debajo de ellas.
 *  `accion`: ya no se dibuja (R11, tanda 8): el Compartir va en el capítulo del gráfico (prop `acciones` de `Capitulo`). Queda por compatibilidad.
 *  `nivel`: el del título (h1 en la página de un dato, h2 dentro de un tema). `tituloRef`/`tituloId`: para llevar el foco al título. */
export function CabeceraDato({ titulo, cifra, unidad, fecha, deltas, extras = [], secundarias = [], frase, fuente, mesDato, info, nivel = 1, tituloRef, tituloId, children }: {
  titulo: string; cifra: string; unidad?: string; fecha: string; deltas: DeltaProps[]; extras?: DeltaProps[]; secundarias?: { rotulo: string; valor: string }[]; frase?: string;
  fuente?: string; mesDato?: string; accion?: ReactNode; info?: ReactNode;
  nivel?: 1 | 2; tituloRef?: Ref<HTMLHeadingElement>; tituloId?: string; children?: ReactNode;
}) {
  const H = nivel === 2 ? "h2" : "h1";
  const doble = useColumnaDoble();
  const lista = (
    <ul className="cabdato-extras" aria-label="Más comparaciones">
      {extras.map((d, i) => <li key={i}><Delta {...d} /></li>)}
    </ul>
  );
  return (
    <header className="cabdato" data-nivel={nivel}>
      <div className="cabdato-izq">
        <div className="cabdato-titulo">
          <H ref={tituloRef} id={tituloId} tabIndex={tituloRef ? -1 : undefined}>{titulo}</H>
          {info ? <InfoPunto etiqueta={`Qué es ${titulo}`}>{info}</InfoPunto> : null}
        </div>
        <p className="cabdato-cifra">
          <span className="cabdato-num">{cifra}</span>
          {unidad ? <span className="cabdato-unidad">{unidad}</span> : null}
          <span className="cabdato-fecha">{fecha}</span>
        </p>
        {secundarias.length > 0 && (
          <dl className="cabdato-sec">{secundarias.map((x) => <div key={x.rotulo}><dt>{x.rotulo}</dt><dd>{x.valor}</dd></div>)}</dl>
        )}
        {fuente ? <p className="cabdato-fuente">Fuente: {fuente}{mesDato ? ` · dato de ${mesDato}` : ""}</p> : null}
        {frase ? <p className="cabdato-frase">{frase}</p> : null}
      </div>
      {(deltas.length > 0 || extras.length > 0) && (
        <div className="cabdato-lado">
          {deltas.length > 0 && (
            <ul className="cabdato-deltas" aria-label="Cambios">
              {deltas.slice(0, 3).map((d, i) => <li key={i}><Delta {...d} /></li>)}
            </ul>
          )}
          {extras.length > 0 && (doble ? <Desplegable etiqueta={`Más comparaciones (${extras.length})`} className="cabdato-mas-d">{lista}</Desplegable> : <Plegable resumen="Más comparaciones" nivel="chico" className="cabdato-mas">{lista}</Plegable>)}
        </div>
      )}
      {children ? <div className="cabdato-grafico">{children}</div> : null}
    </header>
  );
}
