"use client";
// Carga de rigi.json (docs/specs/datos-calientes-3.md). Va aparte del catálogo: no pasa por DatosProvider.
// Si el archivo no está o no trae proyectos, `estado` es "sin" y la página lo dice (no es un error del sitio).
import { useEffect, useState } from "react";
import { decodificar, type Rigi } from "@/lib/rigi";

let promesa: Promise<Rigi | null> | null = null;
function bajar(): Promise<Rigi | null> {
  if (!promesa) {
    promesa = fetch("/datos/rigi.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => decodificar(c))
      .catch(() => { promesa = null; return null; });
  }
  return promesa;
}

export function useRigi(): { estado: "cargando" | "listo" | "sin"; datos: Rigi | null } {
  const [e, setE] = useState<{ estado: "cargando" | "listo" | "sin"; datos: Rigi | null }>({ estado: "cargando", datos: null });
  useEffect(() => {
    let vivo = true;
    bajar().then((datos) => { if (vivo) setE(datos ? { estado: "listo", datos } : { estado: "sin", datos: null }); });
    return () => { vivo = false; };
  }, []);
  return e;
}
