"use client";
// Tira «¿Por qué lo compartís?» (docs/specs/contar-compartir.md, req. 12). Escucha `pld:compartido`; no se lleva el foco y no entra en el historial.
import { useCallback, useEffect, useRef, useState } from "react";
import { useConfig } from "../ConfigProvider";
import { EVENTO_COMPARTIDO, contarPorque, type Porque } from "@/lib/conteo";

const OPCIONES: [Porque, string][] = [["bueno", "Es bueno"], ["malo", "Es malo"], ["mejoro", "Mejoró"], ["empeoro", "Empeoró"], ["curiosidad", "Curiosidad"], ["otro", "Otro"]];
const MS_PREGUNTA = 8000, MS_GRACIAS = 1500, MS_LISTO = 3000;
type Estado = { fase: "pregunta" | "gracias" | "listo"; id: string; n: number };

export function PreguntaPorque() {
  const { cambiar } = useConfig();
  const [est, setEst] = useState<Estado | null>(null);
  const [pausa, setPausa] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alCompartir = (ev: Event) => {
      const id = (ev as CustomEvent<{ id?: string }>).detail?.id;
      if (typeof id !== "string") return;
      setPausa(false);
      setEst((e) => ({ fase: "pregunta", id, n: (e?.n ?? 0) + 1 }));   // `n` reinicia los 8 s aunque ya hubiera una abierta
    };
    window.addEventListener(EVENTO_COMPARTIDO, alCompartir);
    return () => window.removeEventListener(EVENTO_COMPARTIDO, alCompartir);
  }, []);

  // Se va sola: 8 s la pregunta (pausada con el cursor o el foco adentro), 1,5 s el «Gracias», 3 s el «Listo».
  useEffect(() => {
    if (!est || (est.fase === "pregunta" && pausa)) return;
    const ms = est.fase === "pregunta" ? MS_PREGUNTA : est.fase === "gracias" ? MS_GRACIAS : MS_LISTO;
    const t = window.setTimeout(() => setEst(null), ms);
    return () => window.clearTimeout(t);
  }, [est, pausa]);

  const abierta = est !== null;
  useEffect(() => {
    if (!abierta) return;
    const tecla = (ev: KeyboardEvent) => {
      // En captura sobre window (antes que la del Modal, que va sobre document): con el foco en la tira, Escape cierra solo la tira.
      if (ev.key === "Escape" && caja.current?.contains(document.activeElement)) { ev.stopImmediatePropagation(); ev.preventDefault(); setEst(null); setPausa(false); }
    };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [abierta]);

  const elegir = useCallback((id: string, porque: Porque) => {
    contarPorque(id, porque);
    setEst((e) => (e ? { ...e, fase: "gracias" } : e));
    setPausa(false);
  }, []);
  const apagar = useCallback(() => {
    cambiar({ preguntarPorque: false });
    setEst((e) => (e ? { ...e, fase: "listo" } : e));
    setPausa(false);
  }, [cambiar]);

  if (!est) return null;
  const alSalirFoco = (ev: React.FocusEvent) => { if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) setPausa(false); };
  return (
    <div className="porque" role="status" ref={caja} key={est.n}
      onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)} onFocus={() => setPausa(true)} onBlur={alSalirFoco}>
      {est.fase === "pregunta" ? (
        <>
          <p className="porque-titulo">¿Por qué lo compartís?</p>
          <div className="porque-opciones">
            {OPCIONES.map(([k, t]) => <button key={k} type="button" className="chip-c" onClick={() => elegir(est.id, k)}>{t}</button>)}
          </div>
          <button type="button" className="porque-no" onClick={apagar}>No preguntar más</button>
          <button type="button" className="porque-cruz" aria-label="Cerrar" onClick={() => { setEst(null); setPausa(false); }}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </>
      ) : (
        <p className="porque-titulo">{est.fase === "gracias" ? "Gracias" : "Listo. Podés volver a activarla en Configuración"}</p>
      )}
    </div>
  );
}
