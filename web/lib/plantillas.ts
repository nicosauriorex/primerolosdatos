// Plantillas: gráficos ya armados de Histórico. Las curadas se escriben a mano (o vienen de Datos curiosos y de los indicadores);
// las generadas salen solas del catálogo. Una plantilla es un conjunto de parámetros de Histórico (`vista`) más texto para buscarla.
import { fechaDeDato, fmtMes, lastIdx, norm, ok, rotuloAnterior } from "./formato";
import { NOMBRE_LEGADO, crearIndicadoresDe, palabrasBusqueda, textoBusqueda } from "./catalogo";
import { defCurios, type DefCurio } from "./curiosidades";
import { claseVariacion } from "./estadisticas";
import { frecuenciaOrigen } from "./historico";
import { FX_KEYS, FX_NOM, type Expr, type Motor, type SerieMeta, type Vals } from "./motor";
import { decExpr, encExpr, lista as listaUrl } from "./url";
import { PM_RUBROS } from "./preciosMundo";

export const GRUPOS = ["Mis gráficos", "Destacados", "Poder de compra", "Precios contra la inflación", "Salarios", "Dólar y mercados",
  "Actividad", "Empleo y pobreza", "Sector externo", "Fiscal", "Sociedad", "En el mundo", "Gobierno y Congreso"] as const;
export type Vista = Record<string, string>;

export interface Plantilla {
  id: string; titulo: string; desc: string; grupo: string; etiquetas: string[];
  vista: Vista; curada: boolean;
  e: Expr | null;          // el primer gráfico: de ahí salen el valor, el minigráfico y los datos que hay que bajar
  ids: string[];           // series cuyos datos hacen falta para la tarjeta
  def?: DefCurio;          // dato curioso: arma su propio texto
  href?: string;           // si abre otra sección en vez de Histórico (ej. Precios en el mundo)
  propia?: boolean; fecha?: string;
}

const DINAMICAS = ["producto-que-mas-subio", "rubro-ipc-que-mas-subio"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const unaVista = (...es: Expr[]): Vista => ({ v: es.map(encExpr).join(",") });
/** Clave para detectar dos plantillas que muestran lo mismo. */
const claveVista = (v: Vista) => `${v.v ?? ""}|${v.m ?? ""}`;

export function crearPlantillas(metas: SerieMeta[]): Plantilla[] {
  const S: Record<string, SerieMeta> = Object.fromEntries(metas.map((s) => [s.id, s]));
  const { X, INDIC, INDIC_IPC } = crearIndicadoresDe(S);
  const out: Plantilla[] = [];
  const vistas = new Set<string>();
  const ids = new Set<string>();
  const nueva = (p: Omit<Plantilla, "ids" | "e" | "curada"> & { e: Expr; ids?: string[]; curada: boolean }) => {
    const k = claveVista(p.vista);
    const dinamica = DINAMICAS.includes(p.id);             // su vista de reserva es un placeholder: no tapa a ninguna generada
    if ((!dinamica && vistas.has(k)) || ids.has(p.id)) return;           // si una curada y una generada muestran lo mismo, queda la curada
    if (!dinamica) vistas.add(k);
    ids.add(p.id);
    out.push({ ...p, ids: p.ids ?? [p.e.id, ...(p.e.rel ? [p.e.rel] : [])] });
  };
  const fuente = (id: string) => `Fuente: ${S[id]?.fuente ?? "–"}`;

  // ---- curadas: datos curiosos (Destacadas)
  defCurios(S).forEach((d) => nueva({
    id: d.id, titulo: d.k, desc: "Dato curioso con la serie completa", grupo: "Destacados", etiquetas: [...d.etiquetas, "curioso", "destacada"],
    vista: unaVista(d.e), e: d.e, ids: d.ids, def: d, curada: true,
  }));

  // ---- curadas: indicadores principales
  const GRUPO_DE: Record<string, string> = {
    "Salarios": "Salarios", "Poder de compra": "Poder de compra", "Precios y dólar": "Dólar y mercados", "Actividad": "Actividad",
    "Empleo y pobreza": "Empleo y pobreza", "Externo y finanzas": "Sector externo", "Fiscal": "Fiscal",
  };
  const GRUPO_ID: Record<string, string> = { ipc_empalme: "Precios contra la inflación", riesgo: "Dólar y mercados", mk_merv: "Dólar y mercados" };
  INDIC.forEach((i) => nueva({
    id: "i-" + slug(NOMBRE_LEGADO[i.nombre] ?? i.nombre), titulo: i.nombre, desc: fuente(i.id), grupo: GRUPO_ID[i.id] ?? GRUPO_DE[i.grupo] ?? "Destacados",
    etiquetas: [i.grupo], vista: unaVista(i), e: i, curada: true,
  }));

  // ---- curadas: a mano
  const E = (id: string, extra: Partial<Expr> = {}): Expr | null => X(id, "", "", extra);
  const manual = (id: string, titulo: string, grupo: string, desc: string, etiquetas: string[], es: (Expr | null)[], extraVista: Vista = {}) => {
    const xs = es.filter(Boolean) as Expr[];
    if (xs.length !== es.length) return;                  // falta alguna serie en el catálogo
    nueva({ id, titulo, desc, grupo, etiquetas, vista: { ...unaVista(...xs), ...extraVista }, e: xs[0], ids: xs.flatMap((x) => [x.id, ...(x.rel ? [x.rel] : [])]), curada: true });
  };
  manual("cuatro-dolares", "Los cuatro dólares en pesos de hoy", "Dólar y mercados", "Oficial, blue, MEP y CCL en pesos de hoy, en un solo eje", ["dolar", "cotizacion", "cepo"],
    FX_KEYS.map((k) => E("fx_" + k, { med: "real" })));
  manual("brechas-blue-mep-ccl", "Brecha blue, MEP y CCL", "Dólar y mercados", "Cuánto más caros que el oficial mayorista, en un solo eje", ["dolar", "cepo", "contado con liqui"],
    ["blue", "mep", "ccl"].map((k) => E("brecha_" + k)));
  manual("soja-productor-cuatro-dolares", "Soja: lo que recibe el productor, a los cuatro dólares", "Sector externo", "Precio en Rosario como % de Chicago, según el dólar", ["campo", "retenciones", "productor"],
    FX_KEYS.map((k) => E("soja_ratio_" + k)));
  manual("brecha-mep", "Brecha MEP", "Dólar y mercados", "Cuánto más caro que el oficial mayorista", ["dolar", "cepo"], [E("brecha_mep")]);
  manual("brecha-ccl", "Brecha CCL", "Dólar y mercados", "Cuánto más caro que el oficial mayorista", ["dolar", "cepo", "contado con liqui"], [E("brecha_ccl")]);
  manual("soja-rosario-chicago-oficial", "Soja: lo que recibe el productor (al dólar oficial)", "Sector externo", "Precio en Rosario como % de Chicago", ["campo", "retenciones", "productor"], [E("soja_ratio_oficial")]);
  manual("soja-rosario-chicago-blue", "Soja: lo que recibe el productor (al dólar blue)", "Sector externo", "Precio en Rosario como % de Chicago", ["campo", "retenciones", "productor"], [E("soja_ratio_blue")]);
  manual("soja-chicago-vs-rosario", "Soja: Chicago contra Rosario", "Sector externo", "US$ por tonelada, Rosario al dólar oficial", ["campo", "cosecha", "precio internacional"],
    [E("soja_chi", { med: "corr" }), E("soja_ros", { med: "usd_oficial" })], { ej: "misma" });
  manual("salario-minimo-vs-canasta", "Cuántas líneas de pobreza (familia de 4) cubre un salario mínimo", "Poder de compra", "Salario mínimo sobre el valor de la línea de pobreza de una familia de 4",
    ["smvm", "sueldo minimo", "linea de pobreza"], [E("can_cbt_h2", { rel: "smvm", med: "corr" })]);
  manual("auh-alimentar-vs-canasta", "AUH y Alimentar: cuántas canastas alimentarias cubre (cuenta de Capital Humano)", "Poder de compra",
    "La AUH completa más la Prestación Alimentar de un hijo, sobre el valor de la canasta alimentaria de un adulto (línea de indigencia). Es la cuenta que publica el Ministerio de Capital Humano",
    ["auh", "tarjeta alimentar", "asignacion universal", "canasta alimentaria", "plan social"], [E("can_cba", { rel: "auh_alimentar", med: "corr" })]);
  manual("auh-hogar-4-vs-canasta", "AUH y Alimentar de un hogar de 4: cuántas canastas alimentarias cubre (cuenta de la UCA)", "Poder de compra",
    "Lo que cobra en mano un hogar con dos hijos de 6 y 8 años por AUH y Prestación Alimentar, sobre el valor de la canasta alimentaria de ese hogar (línea de indigencia de una familia de 4). No incluye otros ingresos. Es la convención de la Universidad Católica Argentina (UCA)",
    ["auh", "tarjeta alimentar", "asignacion universal", "canasta alimentaria", "plan social", "uca"], [E("can_cba_h2", { rel: "auh_hogar_4", med: "corr" })]);
  manual("auh-en-pesos-de-hoy", "AUH en pesos de hoy", "Empleo y pobreza", "Monto mensual por hijo de la Asignación Universal por Hijo, sin la Prestación Alimentar, ajustado por inflación",
    ["auh", "asignacion universal", "asignacion por hijo", "plan social"], [E("auh", { med: "real" })]);
  manual("pensiones-por-invalidez", "Pensiones por invalidez", "Empleo y pobreza", "Cantidad de pensiones no contributivas por invalidez vigentes a diciembre de cada año",
    ["pension", "discapacidad", "andis", "pensiones no contributivas"], [E("pnc_invalidez", { med: "asis" })]);
  manual("recaudacion-por-impuesto-pib", "Recaudación por impuesto (% del PIB)", "Fiscal", "IVA, Ganancias, retenciones e impuesto al cheque, como % del PIB (suma de 12 meses)",
    ["impuestos", "recaudacion", "iva", "ganancias", "retenciones", "cheque", "arca", "afip"],
    ["rec_iva", "rec_ganancias", "rec_retenciones", "rec_cheque"].map((id) => E(id, { med: "real", esc: "pib" })));
  manual("retenciones-en-pesos-de-hoy", "Retenciones a las exportaciones en pesos de hoy", "Fiscal", "Recaudación mensual de derechos de exportación, ajustada por inflación",
    ["retenciones", "derechos de exportacion", "campo", "soja", "impuestos"], [E("rec_retenciones", { med: "real" })]);
  manual("homicidios-cada-100-mil", "Homicidios cada 100.000 habitantes", "Sociedad", "Tasa de víctimas de homicidios dolosos por año (Ministerio de Seguridad)",
    ["homicidios", "asesinatos", "inseguridad", "crimen", "delitos", "seguridad"], [E("homicidios_tasa", { med: "asis" })]);
  manual("empleados-publicos-nacionales", "Empleados públicos nacionales", "Empleo y pobreza", "Administración pública nacional más empresas y sociedades del Estado, desde julio de 2022",
    ["empleo publico", "empleados publicos", "estado", "despidos", "motosierra", "empleo estatal"], [E("empleo_publico_nacional", { med: "asis" })]);
  manual("transferencias-a-provincias-en-pesos-de-hoy", "Transferencias a provincias en pesos de hoy", "Fiscal",
    "Lo que el gobierno nacional transfiere a las provincias por decisión propia (no incluye la coparticipación): corrientes y de capital, ajustado por inflación",
    ["provincias", "gobernadores", "transferencias", "fondos discrecionales", "atn", "obras"],
    ["transf_prov_corrientes", "transf_prov_capital"].map((id) => E(id, { med: "real" })));
  manual("gasto-salud-educacion-ciencia-pib", "Gasto en salud, educación y ciencia (% del PIB)", "Fiscal",
    "Gasto devengado de la administración pública nacional en cada función, como % del PIB del año (no incluye provincias ni municipios)",
    ["salud", "educacion", "ciencia", "conicet", "presupuesto", "gasto publico"],
    ["gasto_salud", "gasto_educacion", "gasto_ciencia"].map((id) => E(id, { med: "asis" })));
  manual("patentamientos", "Patentamientos de autos 0 km", "Actividad", "Automotores 0 km (autos, utilitarios y otros; la fuente no los separa) inscriptos por primera vez en el Registro del Automotor, por mes",
    ["autos", "0 km", "ventas de autos", "automotores", "usados"], [E("patentamientos", { med: "asis" })]);
  manual("trabajo-formal-e-informal", "Trabajo formal e informal", "Empleo y pobreza",
    "Puestos de trabajo asalariados registrados, asalariados no registrados (en negro) y no asalariados (cuentapropistas y patrones), en miles de puestos por trimestre. Cuenta puestos, no personas",
    ["trabajo en negro", "informalidad", "informales", "puestos de trabajo", "empleo total", "cuentapropistas", "monotributistas"],
    ["puestos_asal_reg", "puestos_asal_noreg", "puestos_no_asal"].map((id) => E(id, { med: "asis" })));
  manual("pobres-31-aglomerados-y-todo-el-pais", "Pobres: 31 aglomerados y todo el país", "Empleo y pobreza",
    "Personas pobres en los 31 aglomerados urbanos (cifra oficial del INDEC) y estimación propia para todo el país, que supone la misma tasa en el resto",
    ["pobres", "cantidad de pobres", "millones de pobres", "pobreza", "personas pobres"],
    ["pobres_31", "pobres_pais"].map((id) => E(id, { med: "asis" })));
  manual("natalidad-y-mortalidad", "Natalidad y mortalidad", "Sociedad",
    "Nacimientos y muertes cada 1.000 habitantes por año. La mortalidad es una cuenta propia: defunciones sobre población",
    ["natalidad", "mortalidad", "nacimientos", "muertes", "defunciones", "bebes", "fecundidad"],
    ["natalidad", "mortalidad"].map((id) => E(id, { med: "asis" })));
  manual("vacunacion-sarampion-dtp-bcg", "Vacunación: sarampión, DTP y BCG", "Sociedad",
    "Porcentaje de niños vacunados según la estimación de la OMS y UNICEF (distinta del registro del Ministerio de Salud)",
    ["vacunas", "vacunacion", "sarampion", "calendario de vacunas", "dtp", "bcg"],
    ["vacuna_sarampion1", "vacuna_sarampion2", "vacuna_dtp3", "vacuna_bcg"].map((id) => E(id, { med: "asis" })));
  manual("autos-y-motos-0-km", "Autos y motos 0 km", "Actividad",
    "Autos y motos inscriptos por primera vez en el Registro del Automotor, por mes",
    ["motos", "motos 0 km", "autos", "patentamientos", "ventas de autos"],
    ["patentamientos", "motos_0km"].map((id) => E(id, { med: "asis" })));
  // Solo los robos: los recuperos (decenas o cientos por mes) quedan planos en el mismo eje que miles de robos; tienen su propia ficha.
  manual("robos-y-recuperos-de-autos", "Robos de autos por mes", "Sociedad",
    "Denuncias de robo o hurto de autos inscriptas en el Registro del Automotor (no es el total de denuncias policiales)",
    ["robo de autos", "autos robados", "inseguridad", "recuperos"],
    [E("robos_autos", { med: "asis" })]);
  manual("robos-de-autos-y-de-motos", "Robos de autos y de motos", "Sociedad",
    "Robos de autos (trámites en el Registro del Automotor) y de motos (denuncias ante las fuerzas de seguridad): son fuentes distintas, no se pueden sumar",
    ["robo de autos", "robo de motos", "motochorros", "inseguridad", "autos robados", "motos robadas"],
    ["robos_autos", "robos_motos"].map((id) => E(id, { med: "asis" })));
  manual("fecundidad-onu-contra-datos-oficiales", "Fecundidad: ONU contra datos oficiales", "Sociedad",
    "Hijos por mujer: la estimación de la ONU y la cuenta propia con nacimientos (Ministerio de Salud) y población (INDEC). Difieren porque la ONU estima y los datos oficiales de los últimos años son provisorios",
    ["fecundidad", "hijos por mujer", "natalidad", "nacimientos", "tasa de fecundidad"],
    ["fecundidad_onu", "fecundidad"].map((id) => E(id, { med: "asis" })));
  manual("universidades-estudiantes-inscriptos-y-egresados", "Universidades: estudiantes, inscriptos y egresados", "Sociedad",
    "Estudiantes, nuevos inscriptos y egresados de universidades e institutos universitarios (estatales y privados), por año. Los años sin dato quedan vacíos",
    ["universitarios", "estudiantes universitarios", "egresados", "graduados", "inscriptos", "universidades"],
    ["univ_estudiantes", "univ_nuevos_inscriptos", "univ_egresados"].map((id) => E(id, { med: "asis" })));
  manual("consumo-de-carnes-por-habitante", "Consumo de carnes por habitante", "Actividad",
    "Kilos por habitante por año de carne vacuna, de pollo y de cerdo (Secretaría de Agricultura). En 2019 cambia el cálculo de la vacuna: 2018 y 2019 no se comparan directo",
    ["carne", "asado", "pollo", "cerdo", "carnes", "consumo de carne"],
    ["carne_vacuna", "carne_aviar", "carne_porcina"].map((id) => E(id, { med: "asis" })));
  manual("tarifas-del-amba-luz-gas-y-agua-iiep", "Tarifas del AMBA: luz, gas y agua (IIEP)", "Fiscal",
    "Factura mensual de un hogar del AMBA, con impuestos, en pesos de hoy (Observatorio de Tarifas y Subsidios del IIEP, UBA-CONICET). El consumo de referencia cambió con los años y el gas es muy estacional",
    ["tarifas", "luz", "gas", "agua", "factura", "boleta", "subsidios", "tarifa social"],
    ["tarifa_amba_luz", "tarifa_amba_gas", "tarifa_amba_agua"].map((id) => E(id, { med: "real" })));
  manual("quien-paga-la-energia-tarifa-contra-costo", "Quién paga la energía: tarifa contra costo", "Fiscal",
    "Qué parte del costo pagan los usuarios: la electricidad según CAMMESA (cuenta propia, toda la demanda) y la luz y el gas de los hogares del AMBA según el IIEP. Miden cosas distintas",
    ["quien paga", "tarifas", "subsidios", "costo de la energia", "cobertura", "luz", "gas", "cammesa"],
    ["luz_cobertura", "cobertura_hogar_luz", "cobertura_hogar_gas"].map((id) => E(id, { med: "asis" })));
  manual("empresas-por-tamano", "Empresas por tamaño", "Empleo y pobreza",
    "Empleadores con al menos un trabajador declarado en una ART, según cuántos trabajadores tienen. Son variaciones netas por tramo: una empresa que achica pasa a un tramo menor",
    ["empresas", "pymes", "microempresas", "cuits", "empresas chicas", "tamano de empresas", "monotributistas con empleados"],
    ["empresas_t1", "empresas_t2a5", "empresas_t6a10", "empresas_t11a50", "empresas_t51a500", "empresas_t501"].map((id) => E(id, { med: "asis" })));
  manual("trabajadores-segun-tamano-de-empresa", "Trabajadores según el tamaño de la empresa", "Empleo y pobreza",
    "Trabajadores cubiertos por una ART, según el tamaño de la empresa donde trabajan",
    ["trabajadores", "pymes", "empresas chicas", "tamano de empresas", "empleo por tamano"],
    ["trab_empresas_t1", "trab_empresas_t2a5", "trab_empresas_t6a10", "trab_empresas_t11a50", "trab_empresas_t51a500", "trab_empresas_t501"].map((id) => E(id, { med: "asis" })));
  manual("empresas-que-abren-y-cierran", "Empresas que abren y cierran", "Empleo y pobreza",
    "Empresas del sector privado que empezaron o dejaron de declarar empleados en el SIPA, por trimestre (con estacionalidad: comparar con el mismo trimestre de otro año)",
    ["empresas que cierran", "cierre de empresas", "cierran empresas", "aperturas de empresas", "pymes", "cuits"],
    ["aperturas_empresas", "cierres_empresas"].map((id) => E(id, { med: "asis" })));
  manual("puestos-perdidos-cierres-y-empresas-que-achican", "Puestos perdidos: cierres y empresas que achican", "Empleo y pobreza",
    "Puestos de trabajo destruidos por trimestre: por empresas que cerraron y por empresas que siguen abiertas y redujeron su plantel",
    ["despidos", "puestos perdidos", "empresas que cierran", "achican", "cierre de empresas"],
    ["puestos_perdidos_cierres", "puestos_perdidos_contraccion"].map((id) => E(id, { med: "asis" })));
  manual("subsidios-transporte-y-energia-en-pesos-de-hoy", "Subsidios: transporte y energía en pesos de hoy", "Fiscal",
    "Subsidios económicos al transporte (mensual) y a la energía (trimestral, repartido en los 3 meses), ajustados por inflación",
    ["subsidios", "colectivos", "trenes", "transporte", "energia", "luz", "gas", "tarifas"],
    ["sub_transporte", "dg_452_2_energiagia_0_t_7_79"].map((id) => E(id, { med: "real" })));
  manual("deuda-bruta-consolidada-y-neta", "Deuda bruta, consolidada y neta", "Fiscal",
    "Tres medidas de la deuda pública en millones de dólares y en un solo eje: la bruta (todo lo que debe el Tesoro), la consolidada con el Banco Central y la neta (lo que ambos deben a terceros, menos las reservas)",
    ["deuda", "deuda neta", "deuda publica", "deuda consolidada", "deuda bruta", "bcra", "reservas"],
    ["deuda_ac_total", "deuda_consolidada", "deuda_neta"].map((id) => E(id)));
  manual("a-quien-le-debe-el-tesoro", "¿A quién le debe el Tesoro?", "Fiscal",
    "Deuda de la Administración Central según quién la tiene: el propio Estado (Banco Central, Fondo de Garantía de Sustentabilidad, Banco Nación y otros), los organismos internacionales y los privados, trimestral",
    ["deuda", "acreedores", "fmi", "organismos", "privados", "bonistas", "deuda intra sector publico"],
    ["deuda_ac_sector_publico", "deuda_ac_organismos", "deuda_ac_privados"].map((id) => E(id)));
  manual("viajes-al-exterior", "Viajes al exterior en avión", "Sector externo", "Argentinos que salen por Ezeiza y Aeroparque, en miles de pasajeros",
    ["turismo", "viajes", "exterior", "chile", "compras afuera"], [E("turismo_emisivo", { med: "asis" })]);

  // ---- generadas
  const tieneSal = !!S.sipa_med;
  Object.values(S).filter((s) => s.id.startsWith("pp_gba_")).forEach((s) => {
    const nom = s.n.replace(" (GBA)", ""), base = s.id.slice(7);
    if (tieneSal) {
      const e = E(s.id, { rel: "sipa_med", med: "corr" })!;
      nueva({ id: "g-compra-" + base, titulo: `Cuánto ${minus(nom)} compra un salario mediano`, desc: "Poder de compra del salario, precios de GBA", grupo: "Poder de compra", etiquetas: [nom], vista: unaVista(e), e, curada: false });
    }
    const r = E(s.id, { med: "real" })!;
    nueva({ id: "g-real-" + base, titulo: `${cap(nom)} contra la inflación`, desc: "Precio real (en pesos de hoy), GBA", grupo: "Precios contra la inflación", etiquetas: [nom], vista: unaVista(r), e: r, curada: false });
  });
  INDIC_IPC.forEach((i) => nueva({
    id: "g-ipc-" + i.id, titulo: `${cap(i.nombre.replace(" (precio real)", ""))} contra la inflación`, desc: "Rubro del IPC nacional relativo al IPC general", grupo: "Precios contra la inflación",
    etiquetas: ["ipc", "rubro"], vista: unaVista(i), e: i, curada: false,
  }));
  if (tieneSal) {
    Object.values(S).filter((s) => s.id.startsWith("can_")).forEach((s) => {
      const e = E(s.id, { rel: "sipa_med", med: "corr" })!;
      nueva({ id: "g-" + s.id, titulo: `Cuánto cubre un salario mediano: ${minus(s.n)}`, desc: "Salario mediano (trabajadores registrados) sobre el valor de la canasta (GBA)", grupo: "Poder de compra",
        etiquetas: ["canasta", "pobreza", "indigencia"], vista: unaVista(e), e, curada: false });
    });
    FX_KEYS.forEach((k) => {
      const e = E("fx_" + k, { rel: "sipa_med", med: "corr" });
      if (e) nueva({ id: "g-dolares-" + k, titulo: `Cuántos dólares ${FX_NOM[k]} compra un salario mediano`, desc: "Salario mediano (trabajadores registrados) sobre la cotización", grupo: "Poder de compra", etiquetas: ["dolar", "sueldo"], vista: unaVista(e), e, curada: false });
    });
  }
  // ---- Precios en el mundo (bloque 6c): una por rubro, abre el detalle en Contexto
  PM_RUBROS.forEach(([rid, nombre]) => out.push({
    id: "pm-" + rid, titulo: `${nombre}: Argentina contra el mundo, en dólares`, desc: "Nivel de precios contra el promedio del mundo (= 100), medido y estimado",
    grupo: "En el mundo", etiquetas: ["mundo", "afuera", "dolares", "precios", "exterior", "caro", "barato", "icp"], vista: {}, e: null, ids: [], curada: true,
    href: `/contexto/?pqr=${rid}#precios-mundo`,
  }));
  // ---- Gobierno y Congreso (bloque 6d): una por indicador, abre la sección en Presidentes
  ([
    ["bancas", "Bancas del oficialismo por presidente", "Bancas propias y aliadas en Diputados y Senado, en % de la cámara"],
    ["leyes", "Leyes del Ejecutivo aprobadas por presidente", "Proyectos del Ejecutivo aprobados sobre enviados"],
    ["dnu", "DNU por presidente", "Decretos de necesidad y urgencia, total y por año de mandato"],
    ["vetos", "Vetos por presidente", "Vetos totales y parciales, y cuántas veces el Congreso insistió"],
  ] as const).forEach(([ind, titulo, desc]) => out.push({
    id: "cg-" + ind, titulo, desc, grupo: "Gobierno y Congreso",
    etiquetas: ["congreso", "diputados", "senado", "bancas", "mayoria", "leyes", "decretos", "dnu", "vetos", "oficialismo"], vista: {}, e: null, ids: [], curada: true,
    href: `/congreso/?cgi=${ind}`,
  }));
  return out;
}

/** Plantilla propia (guardada en el navegador o venida por link) como una más de la lista. */
export function plantillaPropia(p: { id: string; nombre: string; vista: Vista; fecha: string }, S: Record<string, SerieMeta>): Plantilla {
  const existe = (id: string) => !!S[id];
  const es = listaUrl(p.vista.v).map((s) => decExpr(s, existe)).filter(Boolean) as Expr[];
  const todas = Object.entries(p.vista).filter(([k]) => /^v\d?$/.test(k)).flatMap(([, s]) => listaUrl(s).map((x) => decExpr(x, existe)).filter(Boolean) as Expr[]);
  const primera = es[0] ?? todas[0];
  return {
    id: p.id, titulo: p.nombre, desc: "Mi gráfico", grupo: "Mis gráficos", etiquetas: [], vista: p.vista, curada: false, propia: true, fecha: p.fecha,
    e: primera ?? null, ids: primera ? [primera.id, ...(primera.rel ? [primera.rel] : [])] : [],
    // para buscar: todas las variables de todos los gráficos
    ...(todas.length ? { etiquetas: [...new Set(todas.flatMap((x) => [x.id, ...(x.rel ? [x.rel] : [])]))] } : {}),
  };
}

// ------------------------------------------------------------ búsqueda
export const MIN_BUSQUEDA = 2;
const cacheBusca = new WeakMap<Plantilla, string>();
function textoDe(p: Plantilla, S: Record<string, SerieMeta>): string {
  let t = cacheBusca.get(p);
  if (t == null) {
    // las etiquetas de las propias son ids de series: se buscan por el texto de la serie
    const deSeries = (p.propia ? p.etiquetas : DINAMICAS.includes(p.id) ? [] : p.ids).map((id) => (S[id] ? textoBusqueda(S[id]) : "")).join(" ");
    t = norm([p.titulo, p.desc, p.propia ? "" : p.etiquetas.join(" "), p.grupo].join(" ")) + " " + deSeries;
    cacheBusca.set(p, t);
  }
  return t;
}
/** Sin importar mayúsculas ni tildes ni palabras de relleno ("los peores salarios de la historia" busca "salarios"). Con varias palabras, la
 *  plantilla tiene que tener todas; si ninguna las tiene, las que tengan al menos una (más coincidencias primero). Con menos de 2 caracteres no filtra. */
export function filtrar(lista: Plantilla[], q: string, S: Record<string, SerieMeta>): Plantilla[] {
  const palabras = palabrasBusqueda(q);
  if (norm(q).trim().length < MIN_BUSQUEDA || !palabras.length) return lista;
  // cada palabra tiene que empezar una palabra del texto ("asado" no encuentra "pasado")
  const res = palabras.map((w) => new RegExp("(^|[^a-z0-9])" + w.replace(/[^a-z0-9]/g, (c) => "\\" + c)));
  const filas = lista.map((p) => { const t = textoDe(p, S); return { p, n: res.filter((re) => re.test(t)).length }; });
  let sel = filas.filter((f) => f.n === palabras.length);
  if (!sel.length && palabras.length > 1) sel = filas.filter((f) => f.n > 0).sort((a, b) => b.n - a.n);   // sort estable: conserva el orden de la lista
  return sel.map((f) => f.p);
}

// ------------------------------------------------------------ links a Histórico
export function hrefPlantilla(p: Plantilla, vista?: Vista): string {
  if (p.href) return p.href;
  const q = new URLSearchParams(vista ?? p.vista);
  if (p.propia) q.set("pn", p.titulo); else q.set("pl", p.id);
  return `/historico/?${q.toString()}`;
}

// ------------------------------------------------------------ tarjeta
export interface Evaluada { v: Vals; val: string; fecha: string; texto: string; cls: "bueno" | "malo" | "neutro" | null; unidad?: string; vista?: Vista }
/** Calcula lo que muestra una tarjeta. Devuelve null si faltan datos. */
export function evaluar(m: Motor, p: Plantilla): Evaluada | null {
  const e = p.e;
  if (!e || !m.SER[e.id] || (e.rel && !m.SER[e.rel])) return null;
  try {
    const c = m.calc(e), u = lastIdx(c.v);
    if (u < 0) return null;
    const fecha = fechaDeDato(m.F[u], frecuenciaOrigen(c.v));
    if (p.def) {
      const r = p.def.ev(m, c);
      if (r) return { v: r.v ?? c.v, val: r.val, fecha, texto: r.d, cls: null, vista: r.e ? unaVista(r.e) : undefined };
    }
    const antes = c.v[u - 12], ahora = c.v[u];
    const tiene = u >= 12 && ok(antes) && ok(ahora);
    return {
      v: c.v, val: m.fmtC(c, ahora), fecha, unidad: c.unidad,
      texto: tiene ? `${m.variacionTxt(c, antes, ahora)} contra hace un año` : "Sin variación contra hace un año",
      cls: tiene ? claseVariacion(c.dir, c.pct, antes, ahora) : "neutro",
    };
  } catch { return null; }
}

// ------------------------------------------------------------ para la portada y los temas
/** La plantilla cuyo primer gráfico es exactamente esta expresión. */
export const plantillaDeExpr = (pls: Plantilla[], e: Expr): Plantilla | undefined =>
  pls.find((p) => p.e && p.e.id === e.id && (e.med == null || (p.e.med ?? "") === e.med) && (p.e.rel ?? null) === (e.rel ?? null) && (p.e.esc ?? "") === (e.esc ?? ""));
/** Plantilla suelta para una expresión (cuando ninguna curada coincide): sirve para calcular la tarjeta. */
export const plantillaSuelta = (id: string, titulo: string, e: Expr): Plantilla => ({
  id, titulo, desc: "", grupo: "", etiquetas: [], vista: unaVista(e), curada: true, e, ids: [e.id, ...(e.rel ? [e.rel] : [])],
});
/** Plantillas de un tema: las de sus grupos y, si `porCat`, solo las de una categoría del tema. Primero las curadas. */
export function plantillasDeTema(pls: Plantilla[], S: Record<string, SerieMeta>, t: { cats: string[]; grupos: string[]; porCat?: boolean }): Plantilla[] {
  const deCat = (p: Plantilla) => !!p.e && !!S[p.e.id] && t.cats.includes(S[p.e.id].cat[0]);
  return pls.filter((p) => !p.propia && (t.porCat ? deCat(p) && (!t.grupos.length || t.grupos.includes(p.grupo)) : t.grupos.includes(p.grupo)))
    .sort((a, b) => Number(b.curada) - Number(a.curada));
}

// ------------------------------------------------------------ comparaciones de las placas de la portada
/** Una comparación del último dato contra un momento anterior: el valor de entonces y cuánto cambió hasta hoy (texto del motor, ya redondeado como se muestra). */
export interface Comparacion { rotulo: string; fecha: string; valor: string; variacion: string; cls: "bueno" | "malo" | "neutro" }
export interface Comparaciones { anterior: Comparacion | null; anio: Comparacion | null }
/** Último dato contra el período anterior (el mes anterior si la serie es mensual; si no, el último dato previo que exista, rotulado con su fecha)
 *  y contra un año atrás. Si la placa es en sí un porcentaje, la variación sale en puntos porcentuales (lo resuelve `variacionTxt`).
 *  Una comparación que no se puede calcular queda en null. Los datos curiosos (que traen su propio valor) no se comparan. */
export function comparaciones(m: Motor, p: Plantilla): Comparaciones | null {
  const e = p.e;
  if (!e || p.def || !m.SER[e.id] || (e.rel && !m.SER[e.rel])) return null;
  try {
    const c = m.calc(e), u = lastIdx(c.v);
    if (u < 0 || !ok(c.v[u])) return null;
    const ahora = c.v[u] as number;
    const armar = (j: number, rotulo: string): Comparacion | null => {
      const antes = c.v[j];
      if (j < 0 || !ok(antes)) return null;
      const variacion = m.variacionTxt(c, antes as number, ahora);
      if (variacion === "–") return null;
      return { rotulo, fecha: fechaDeDato(m.F[j], frecuenciaOrigen(c.v)), valor: m.fmtC(c, antes as number), variacion, cls: claseVariacion(c.dir, c.pct, antes as number, ahora) };
    };
    let j = u - 1;
    while (j >= 0 && !ok(c.v[j])) j--;
    // serie anual: el período anterior es justo el de un año atrás; no se repite
    const anterior = j < 0 || j === u - 12 ? null : armar(j, rotuloAnterior(m.F[j], m.F[u], "Mes anterior"));
    const anio = u >= 12 ? armar(u - 12, "Un año atrás") : null;
    return anterior || anio ? { anterior, anio } : null;
  } catch { return null; }
}

// ------------------------------------------------------------ líneas de contexto de las cifras de la portada
/** Inflación interanual (último dato), como texto. */
export function interanualTxt(m: Motor): string | null {
  const c = m.calc({ id: "ipc_empalme", med: "via", rel: null, modo: "compra", esc: "" }), u = lastIdx(c.v);
  return u >= 0 && ok(c.v[u]) ? m.fmtC(c, c.v[u]) : null;
}
/** Qué tan lejos está el último dato de su récord (fracción negativa o 0), o null si no se puede calcular. */
export function distanciaRecord(m: Motor, e: Expr): number | null {
  const c = m.calc(e), u = lastIdx(c.v), vals = c.v.filter(ok) as number[];
  return u < 0 || !vals.length ? null : (c.v[u] as number) / Math.max(...vals) - 1;
}
