// Única fuente de las secciones del sitio: carpeta, nombre público y para qué sirve, agrupadas para el menú "Más".
// Los textos salen de la portada (SECCIONES_INICIO) más "Parte del Banco Central" y "Fuentes".

export type GrupoSeccion = "presidentes" | "mundo" | "estado" | "herramientas";

/** `corto`: la misma idea en una línea (mosaico de la portada, dos renglones como máximo). */
export interface Seccion { carpeta: string; nombre: string; para: string; grupo: GrupoSeccion; corto?: string }

export const GRUPOS_SECCIONES: { id: GrupoSeccion; titulo: string }[] = [
  { id: "presidentes", titulo: "Comparar presidentes" },
  { id: "mundo", titulo: "Argentina y el mundo" },
  { id: "estado", titulo: "El Estado por dentro" },
  { id: "herramientas", titulo: "Herramientas" },
];

const S = (carpeta: string, nombre: string, para: string, grupo: GrupoSeccion, corto?: string): Seccion => ({ carpeta, nombre, para, grupo, corto });

/** En el orden en que se muestran dentro de cada grupo. */
export const SECCIONES: Seccion[] = [
  S("presidentes", "Por presidente", "Fijate qué pasó con un dato en el mandato de cada presidente.", "presidentes", "Un dato en el mandato de cada presidente."),
  S("mandato", "Meses de mandato", "Poné a todos los presidentes en la misma largada y compará mes a mes.", "presidentes", "Todos los presidentes en la misma largada, mes a mes."),
  S("herencia", "Herencia", "Cómo estaba cada dato cuando asumió cada presidente y cómo lo dejó.", "presidentes", "Cómo estaba cada dato al asumir y cómo lo dejó."),
  S("ranking", "Ranking", "Ordená a los presidentes según cómo cambió cada dato en su mandato.", "presidentes", "Ordená a los presidentes según cómo cambió cada dato."),
  S("elecciones", "Elecciones", "Mirá qué datos de la economía se movieron junto con el voto en cada elección.", "presidentes", "Qué datos se movieron junto con el voto."),
  S("congreso", "Gobierno y Congreso", "Bancas, leyes, decretos y vetos de cada gobierno.", "presidentes", "Bancas, leyes, decretos y vetos de cada gobierno."),
  S("contexto", "El mundo y la Argentina", "Compará a la Argentina con otros países y con los precios del mundo.", "mundo", "La Argentina contra otros países y los precios del mundo."),
  S("rigi", "RIGI: grandes inversiones", "Los proyectos aprobados del Régimen de Incentivo para Grandes Inversiones: cuánto prevén invertir y cuánto ingresó.", "mundo", "Los proyectos aprobados del RIGI y su inversión prevista."),
  S("gasto", "En qué gasta la Nación", "Cuánto gastó el Estado nacional cada año: para qué, quién, en qué y dónde, presupuestado y ejecutado.", "estado", "Cuánto gastó la Nación: para qué, quién, en qué y dónde."),
  S("provincias", "Las provincias", "El gasto que la Nación declara en cada provincia, por habitante y en pesos de hoy.", "estado", "El gasto de la Nación en cada provincia, por habitante."),
  S("universidades", "Universidades", "Lo que la Nación transfiere a cada universidad nacional, año por año, y cómo se controla.", "estado", "Lo que recibe cada universidad nacional, año por año."),
  S("novedades", "Novedades y calendario", "Qué datos oficiales salieron en los últimos días, con su cifra, y cuándo sale el próximo.", "herramientas", "Lo último que salió y cuándo sale lo próximo."),
  S("predicciones", "Predicciones", "Decí cuánto creés que va a dar la inflación del mes y compará con la gente, el REM y el dato real.", "herramientas", "Cuánto va a dar la inflación: vos, la gente y el REM."),
  S("historico", "Histórico", "Elegí cualquier dato y mirá cómo cambió en el tiempo, solo o comparado con otros.", "herramientas", "Cualquier dato en el tiempo, solo o comparado."),
  S("semaforo", "Semáforo de actividad", "Los indicadores de actividad en una tabla: cuáles subieron y cuáles bajaron cada mes.", "herramientas", "Qué indicadores de actividad subieron y cuáles bajaron."),
  S("bcra", "Parte del Banco Central", "Los datos del día del Banco Central, cada uno con su fecha.", "herramientas", "Los datos del día del Banco Central, con su fecha."),
  S("plantillas", "Gráficos listos", "Gráficos ya armados para abrir, cambiar y compartir.", "herramientas", "Gráficos ya armados para abrir y compartir."),
  S("fuentes", "Fuentes", "De dónde sale cada dato y cómo se calcula.", "herramientas", "De dónde sale cada dato y cómo se calcula."),
];

export const seccionesDe = (g: GrupoSeccion): Seccion[] => SECCIONES.filter((s) => s.grupo === g);
