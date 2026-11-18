"use client";
// El "lápiz": dibujo continuo de un gráfico mes a mes. Una posición con decimales avanza con requestAnimationFrame y el gráfico se recorta a la
// derecha con `clip-path`: se dibuja un mes de más y el tramo siguiente se descubre de a poco. Lo usan Meses de mandato y la ficha del dato.
// Uso: `rowsVista(rows)` va al gráfico y `envoltura` es el div que lo envuelve (clase `mand-lapiz`).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Milisegundos por mes a velocidad normal, según la cantidad de meses: de 6 a 12 segundos en total, sin pasar de 150 ms por mes. */
export const msPorMes = (maxAnim: number): number => Math.round(Math.max(6000 / Math.max(1, maxAnim), Math.min(150, 12000 / Math.max(1, maxAnim))));

/** `ts`: valor del eje x de cada fila (el recorte se ubica con ellos). `ms`: milisegundos por mes. `auto`: arranca en estado "listo" (mes 0, quieto)
 *  en vez de sin animación: el gráfico se ve vacío hasta que quien lo usa llama a `reiniciar(true)`. */
export function useLapiz(ts: number[], ms: number, auto = false) {
  // mes actual (parte entera de la posición) y si avanza; null = sin animación, todo a la vista
  const [anim, setAnim] = useState<{ t: number; play: boolean } | null>(auto ? { t: 0, play: false } : null);
  const maxAnim = Math.max(0, ts.length - 1);
  const play = !!anim?.play;
  // Posición continua del dibujo (en meses, con decimales): el lápiz avanza entre un mes y el siguiente. `anim.t` es solo su parte entera.
  const pos = useRef(0);
  const envoltura = useRef<HTMLDivElement>(null);
  const tsRef = useRef<number[]>(ts);
  tsRef.current = ts;
  /** Recorta el gráfico a la derecha del lápiz: el último tramo (ya dibujado hasta el mes siguiente) se descubre de a poco. */
  const aplicarRecorte = useCallback(() => {
    const el = envoltura.current;
    if (!el) return;
    const t = tsRef.current, fin = t.length - 1;
    const over = el.querySelector(".u-over");
    if (!over || fin < 1 || pos.current >= fin) { el.style.clipPath = ""; return; }
    const i = Math.max(0, Math.min(Math.floor(pos.current), fin - 1));
    const tt = t[i] + (t[i + 1] - t[i]) * (pos.current - i);
    const fr = (tt - t[0]) / ((t[fin] - t[0]) || 1);
    const er = el.getBoundingClientRect(), or = over.getBoundingClientRect();
    const x = or.left - er.left + Math.max(0, Math.min(1, fr)) * or.width;
    el.style.clipPath = `inset(-12px ${Math.max(0, er.width - x)}px -12px 0)`;
  }, []);
  useEffect(() => {
    if (!play) return;
    // si el sistema pide reducir el movimiento (también si cambió con la animación andando), no avanza sola
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setAnim(null); return; }
    let ultimo = performance.now(), raf = 0;
    const paso = (ahora: number) => {
      const dt = Math.min(100, ahora - ultimo);   // una pestaña en segundo plano no salta de golpe
      ultimo = ahora;
      pos.current = Math.min(maxAnim, pos.current + dt / ms);
      const entero = Math.floor(pos.current), llego = pos.current >= maxAnim;
      setAnim((a) => (!a || !a.play ? a : llego ? { t: maxAnim, play: false } : a.t === entero ? a : { t: entero, play: true }));
      aplicarRecorte();
      if (!llego) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [play, ms, maxAnim, aplicarRecorte]);
  // al cambiar los cuadros (o cortarse la animación) el recorte se vuelve a poner donde corresponde
  useLayoutEffect(() => { if (!anim) { if (envoltura.current) envoltura.current.style.clipPath = ""; return; } aplicarRecorte(); });
  // el cuadro actual nunca pasa del último mes visible: al achicar el rango con la animación terminada, anim.t queda fuera de rango hasta que se corta
  const cuadro = anim ? Math.max(0, Math.min(anim.t, maxAnim)) : 0;
  /** Las filas con las que se dibuja: un mes de más que el cuadro (el recorte deja ver solo hasta donde llegó el lápiz). */
  const rowsVista = <R extends { t?: unknown }>(rows: R[]): R[] => (anim ? rows.map((r, i) => (i <= cuadro + 1 ? r : ({ t: r.t } as R))) : rows);
  /** Sin animación: todo a la vista. */
  const cortar = useCallback(() => setAnim(null), []);
  /** Vuelve al mes 0; `play` dice si arranca o queda esperando. No hace nada si el sistema pide reducir el movimiento. */
  const reiniciar = useCallback((arrancar = true) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setAnim(null); return; }
    pos.current = 0;
    setAnim({ t: 0, play: arrancar });
  }, []);
  const pausar = useCallback(() => setAnim((a) => (a ? { ...a, play: false } : a)), []);
  /** Sigue desde donde quedó; si ya había terminado, empieza de nuevo. */
  const seguir = () => {
    if (cuadro >= maxAnim) { pos.current = 0; setAnim({ t: 0, play: true }); } else setAnim({ t: cuadro, play: true });
  };
  return { anim, cuadro, maxAnim, play, termino: !!anim && !play && cuadro >= maxAnim, envoltura, rowsVista, cortar, reiniciar, pausar, seguir };
}
