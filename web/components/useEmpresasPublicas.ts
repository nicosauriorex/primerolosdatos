"use client";
// Carga de las empresas públicas (docs/specs/empresas-publicas.md): `empresas_publicas.json`, aparte del catálogo.
// Se baja una sola vez por visita. Si falta o no valida, `datos` queda en null y la vista "Empresas públicas" no aparece (sin error en pantalla).
import { useEffect, useState } from "react";
import { decodificarEmpresas, type ArchivoEmpresas } from "@/lib/empresas-publicas";

let empresas: Promise<ArchivoEmpresas | null> | null = null;

export function useEmpresasPublicas(): { datos: ArchivoEmpresas | null; listo: boolean } {
  const [estado, setEstado] = useState<{ datos: ArchivoEmpresas | null; listo: boolean }>({ datos: null, listo: false });
  useEffect(() => {
    let vivo = true;
    if (!empresas) {
      empresas = fetch("/datos/empresas_publicas.json", { cache: "no-cache" })
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => decodificarEmpresas(c))
        .catch(() => null);
    }
    empresas.then((datos) => { if (vivo) setEstado({ datos, listo: true }); });
    return () => { vivo = false; };
  }, []);
  return estado;
}
