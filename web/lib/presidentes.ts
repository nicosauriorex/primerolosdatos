// Por presidente: lo que calculan la tabla "Una variable, todos los presidentes" y la grilla de presidentes × datos clave.
// Funciones puras (sin React). Reutilizan las cuentas de la ficha (`filasMandatosFicha`, `acumulada`) para que todo el sitio muestre lo mismo.
// Ver docs/specs/remodelacion-historico-presidentes.md (P1).
import { claseVariacion, crearPres, statsMandato, varNum, type BaseCfg, type Pres } from "./estadisticas";
import { acumulada, filasMandatosFicha, type TablaFicha } from "./ficha";
import { datoFijoPorSlug, hrefFijo } from "./datos-fijos";
import { ok, nf1, r1 } from "./formato";
import type { Expr, Motor, SerieMeta } from "./motor";
import { periodoMandato, variacionMostrada } from "./tablas";
import type { FilaMandato } from "@/components/sistema/TablaMandatos";

const menos = (t: string) => t.replace(/^-/, "−");

// ------------------------------------------------------------ Tabla "Una variable, todos los presidentes"
/** Columnas que se pueden pedir por el link (`cl`): las claves de `COLS` (`var` en una tasa es "Cambio"). */
export const CLAVES_COLUMNAS = ["ini", "fin", "var", "min", "max", "prom", "med", "n"] as const;

/** Lo que necesita `TablaMandatos` para `/presidentes/`: las filas de la ficha filtradas a `presIds`, más Meses y (en una tasa) Cambio.
 *  `visibles` va vacío y `extras` trae todas las columnas que no son la principal: quien llama pasa `elegidas` (las del link `cl`, o `porDefecto`)
 *  y `TablaMandatos` las muestra, con los chips "Sumar columnas" para cambiarlas. `cl` null = las de la ficha. */
export function tablaPresidentes(m: Motor, e: Expr, b: BaseCfg, o: { presIds: Set<string>; cl: string[] | null }):
  TablaFicha & { porDefecto: string[]; elegidas: string[]; principal: string | null } {
  const T = filasMandatosFicha(m, e, b);
  const F = m.F, c = m.calc(e);
  const pres = crearPres(F);
  const filas = T.filas.filter((f) => o.presIds.has(f.id)).map((f) => {
    const x = pres.find((p) => p.id === f.id) as Pres, st = statsMandato(F, c.v, x, b);
    const celdas: FilaMandato["celdas"] = { ...f.celdas, n: { texto: String(st.n), valor: st.n } };
    if (T.tasa) {
      const d = varNum(c, st), cls = claseVariacion(c.dir, c.pct, st.ini, st.fin);
      celdas.var = { texto: d == null ? "–" : menos(variacionMostrada(m, c, st.ini, st.fin)), valor: d, tono: cls === "neutro" ? null : cls };
    }
    return { ...f, celdas };
  });
  const columnas = [...T.columnas];
  if (T.tasa) columnas.splice(columnas.findIndex((x) => x.clave === "prom"), 0, { clave: "var", titulo: "Cambio" });
  columnas.push({ clave: "n", titulo: "Meses" });
  const principal = columnas.find((x) => x.principal)?.clave;
  const claves = columnas.map((x) => x.clave);
  const extras = claves.filter((k) => k !== principal);
  const porDefecto = T.visibles.filter((k) => k !== principal);
  const elegidas = o.cl ? o.cl.filter((k) => extras.includes(k)) : porDefecto;
  return { ...T, filas, columnas, visibles: [], extras, porDefecto, elegidas, principal: principal ?? null };
}

// ------------------------------------------------------------ Grilla de presidentes × datos clave
export type MetricaGrilla = "Acumulada" | "Variación" | "Cambio";
/** Los 8 datos clave de la grilla, en orden. `metrica` es la que se pide; si el dato resulta ser una tasa (o un nivel) el rótulo es "Cambio" (o "Variación"). */
export const GRILLA_DATOS: { slug: string; nombre: string; metrica: MetricaGrilla }[] = [
  { slug: "inflacion-mensual", nombre: "Inflación", metrica: "Acumulada" },
  { slug: "salario-mediano-real", nombre: "Salario", metrica: "Variación" },
  { slug: "dolar-blue", nombre: "Dólar blue", metrica: "Variación" },
  { slug: "actividad-economica", nombre: "Actividad", metrica: "Variación" },
  { slug: "desocupacion", nombre: "Desocupación", metrica: "Cambio" },
  { slug: "pobreza", nombre: "Pobreza", metrica: "Cambio" },
  { slug: "reservas", nombre: "Reservas", metrica: "Variación" },
  { slug: "riesgo-pais", nombre: "Riesgo país", metrica: "Variación" },
];

export interface CeldaGrilla { texto: string; valor: number | null; tono: "bueno" | "malo" | null; href: string | null; desde?: string }
export interface ColumnaGrilla { slug: string; nombre: string; metrica: MetricaGrilla; unidad: string }
export interface FilaGrilla { pres: Pres; periodo: string; celdas: CeldaGrilla[] }
export interface Grilla { columnas: ColumnaGrilla[]; filas: FilaGrilla[] }

const mediana = (v: number[]): number => {
  const s = [...v].sort((a, b) => a - b), h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

/** Una fila por presidente con datos en al menos una columna, del más nuevo al más viejo. Cada celda es la principal de la tabla de ese dato:
 *  Variación o Cambio como en `filasMandatosFicha` (las cuentas cierran con lo que se muestra) y, en la inflación, la acumulada del mandato
 *  (verde si quedó por debajo de la mediana de los presidentes de la columna, rojo si por encima, redondeadas como se muestran). */
export function grillaPresidentes(m: Motor, b: BaseCfg, S: Record<string, SerieMeta>): Grilla {
  const F = m.F, pres = crearPres(F).slice().reverse();
  const columnas: ColumnaGrilla[] = [];
  const porColumna: CeldaGrilla[][] = [];
  for (const d of GRILLA_DATOS) {
    const fijo = datoFijoPorSlug(d.slug);
    if (!fijo || !S[fijo.e.id] || (fijo.e.rel && !S[fijo.e.rel])) continue;
    const c = m.calc(fijo.e);
    const acum = d.metrica === "Acumulada" && c.pct;
    const sts = pres.map((x) => statsMandato(F, c.v, x, b));
    // acumulada con el valor mostrado (r1), para que el tono coincida con lo que se lee
    const acums = sts.map((st) => { if (!st.n) return null; const a = acumulada(c.v, st); return a == null ? null : r1(a); });
    const med = acum ? mediana(acums.filter((a): a is number => a != null)) : null;
    columnas.push({ slug: d.slug, nombre: d.nombre, metrica: acum ? "Acumulada" : c.pct ? "Cambio" : "Variación", unidad: c.unidad });
    porColumna.push(pres.map((x, k) => {
      const st = sts[k], vacia: CeldaGrilla = { texto: "—", valor: null, tono: null, href: null };
      if (!st.n) return vacia;
      let texto: string, valor: number | null, tono: CeldaGrilla["tono"] = null;
      if (acum) {
        const a = acums[k];
        if (a == null) return vacia;
        texto = `${a > 0 ? "+" : ""}${menos(nf1.format(a))} %`; valor = a;
        tono = med == null || a === med ? null : a > med ? "malo" : "bueno";
      } else {
        valor = varNum(c, st);
        if (valor == null) return vacia;
        texto = menos(variacionMostrada(m, c, st.ini, st.fin));
        const cls = claseVariacion(c.dir, c.pct, st.ini, st.fin);
        tono = cls === "neutro" ? null : cls;
      }
      // Solo si la serie empieza después de que asumió (no por ser trimestral o semestral: el primer dato del mandato puede caer unos meses después).
      let desde: string | undefined;
      let primero = -1;
      for (let i = 0; i < c.v.length; i++) if (ok(c.v[i])) { primero = i; break; }
      if (primero > x.i0) desde = F[primero].slice(0, 4);
      return { texto, valor, tono, href: hrefFijo(d.slug, { pd: x.id }), ...(desde ? { desde } : {}) };
    }));
  }
  const filas: FilaGrilla[] = pres.map((x, k) => ({ pres: x, periodo: periodoMandato(F, x), celdas: porColumna.map((col) => col[k]) }))
    .filter((f) => f.celdas.some((ce) => ce.href));
  return { columnas, filas };
}
