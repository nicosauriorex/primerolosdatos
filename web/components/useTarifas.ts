"use client";
// Carga de tarifas.json (docs/specs/tarifas-y-datos-calientes-4.md). Va aparte del catálogo: no pasa por DatosProvider.
// Si el archivo no está o no trae proyectos, `estado` es "sin" y la página lo dice (no es un error del sitio).
import { useEffect, useState } from "react";
import { decodificar, type Tarifas } from "@/lib/tarifas";

let promesa: Promise<Tarifas | null> | null = null;
function bajar(): Promise<Tarifas | null> {
  if (!promesa) {
    promesa = fetch("/datos/tarifas.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => decodificar(c))
      .catch(() => { promesa = null; return null; });
  }
  return promesa;
}

export function useTarifas(): { estado: "cargando" | "listo" | "sin"; datos: Tarifas | null } {
  const [e, setE] = useState<{ estado: "cargando" | "listo" | "sin"; datos: Tarifas | null }>({ estado: "cargando", datos: null });
  useEffect(() => {
    let vivo = true;
    bajar().then((datos) => { if (vivo) setE(datos ? { estado: "listo", datos } : { estado: "sin", datos: null }); });
    return () => { vivo = false; };
  }, []);
  return e;
}
