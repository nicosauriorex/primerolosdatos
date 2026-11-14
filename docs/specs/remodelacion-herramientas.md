# Remodelación, etapa 3.5: Herramientas

Estado: implementada (2026-11-14); verificada en local y con el revisor (ver docs/ESTADO.md). Sale de `docs/AUDITORIA-DISENO-2026-11-13.md` (tabla "Diagnóstico por sección", "Herramientas" y principios 1, 2 y 5), D-023 y el sistema de `docs/specs/remodelacion-sistema.md` (componentes en `web/components/sistema/`). Sigue a la etapa 3.4 (`docs/specs/remodelacion-contexto.md`). Es la última etapa de la Fase 3.

## Objetivo
Llevar el mismo sistema de las etapas 3.1 a 3.4 a todas las páginas que quedan con el diseño viejo, para que el sitio entero se lea igual:
- **El Estado por dentro**: `/gasto/`, `/provincias/` (las tres vistas) y `/universidades/`.
- **Herramientas**: `/semaforo/`, `/bcra/`, `/plantillas/` (Gráficos listos) y `/fuentes/`.
- **Presidentes, lo que faltaba**: `/congreso/`, `/elecciones/`, `/ranking/` y `/herencia/`. Ranking y Herencia no estaban en el plan de etapas, pero la auditoría las marcó (P1) y ninguna otra etapa las cubre; se suman acá para que el barrido de todas las rutas cierre la remodelación.

En cada página, las mismas cuatro reglas:
1. **Abre con la respuesta**: una frase en lenguaje llano con la cifra grande, calculada (nunca escrita a mano), antes de cualquier control.
2. **Configuración a demanda**: `BarraVista` + `Hoja` "Ajustes" (o `FilaChips` si es una sola elección de hasta ~8 opciones) en vez de filas de `Seg`/`Selector` sueltas. Ningún `Seg` se parte en dos renglones a 360 px.
3. **Sin caja**: los bloques pasan de `div.card` a `Capitulo` (h2; h3 adentro); los bordes quedan para lo que flota y lo que se toca. Los métodos y avisos van a `InfoPunto` o a un plegado "Cómo se mide" al final; a la vista, como máximo una línea de nota por gráfico.
4. **Una sola forma de compartir**: `CompartirHoja` (Imagen · Link · Texto) en las acciones del capítulo, que abre el panel de imagen que la página ya tiene (`PanelGasto`, `PanelSemaforo`, `PanelParte`, `BotonCompartir`…). Las imágenes no cambian en esta etapa.

**Links viejos**: todo link de estas páginas sigue abriendo lo mismo, con sus parámetros. **Ningún parámetro cambia de significado** y no se saca ninguno. Lista de parámetros por página en cada requisito.

**Cuentas**: no se escribe ninguna cuenta nueva en los componentes. Las frases-respuesta salen de funciones nuevas en el `lib/` de cada página (sin React), con los valores redondeados que se muestran (las cuentas cierran con lo que se ve, `r1` de `formato.ts`).

## Requisitos

### G. En qué gasta la Nación (`components/secciones/Gasto.tsx`, `lib/gasto.ts`)
Parámetros que se conservan: `anio`, `med`, `etapa`, `forma`, `ruta`, `todas`, `vista` (`mes`).
- **G1. Respuesta arriba.** Nueva `fraseGasto(v: Vista): { cifra: string; frase: string }` en `lib/gasto.ts`: sin ruta, "En <año> la Nación gastó <total>; <N> de cada 100 pesos fueron para <primera barra>." (N = parte de la primera barra sobre el total, entero, con el mismo redondeo que la lista; si la primera barra es "Otros", se usa la segunda). Con ruta, "<nodo>: <total> en <año>, <parte> del gasto total." Año en curso: "En lo que va de <año> (hasta <fecha>)…". Se muestra con `CabeceraDato` (h2, porque el h1 es el de la página), cifra = total del nivel, `fecha` = año (y "en curso" si corresponde), sin deltas; `frase` = la frase. Reemplaza `gas-total` (el h2, el total, la unidad y el "Nombre en el presupuesto" pasan a la cabecera: el nombre técnico como `info` en `InfoPunto`).
- **G2. Controles.** `BarraVista` con chips "<Año>", "<Medida>" (Pesos de hoy / % del total / % del PIB), "<Etapa>" (Gastado / Vigente / Presupuestado) y un botón "Buscar" aparte (lupa, 44 px) que abre el buscador de hoy dentro de una `Hoja` "Buscar en el gasto". `Hoja` "Ajustes" con Año (lista de botones, no `Selector`), Medida y Etapa. La vista "Cómo viene el año" (`vista=mes`) queda como `FilaChips` de dos opciones arriba de la barra ("Año completo" / "Cómo viene el año"), solo si existe el archivo mensual (como hoy).
- **G3. Formas.** Las cuatro formas (Para qué / Quién / En qué / Dónde) en `FilaChips` (un renglón), con la bajada de la forma (`BAJADA_FORMA`) como `InfoPunto` al lado y no como párrafo.
- **G4. Lista.** `Lista`/`FilaBarra` pasan a `ListaBarras` (no divergente, tono neutro). `texto` = monto; `sub` = parte y % ejecutado; tocar una fila abre el nivel siguiente (`ruta`) y la fila "Otros" pone `todas=1`, como hoy; las filas sin nivel abajo van sin `onClick`. Si `ListaBarras` no tiene cómo marcar "se abre" contra "no se abre", agregarle una prop opcional `flecha` por fila (sin cambiar su aspecto por defecto). Las migas quedan arriba de la cabecera, como `nav` de una línea deslizable. Las notas de la lista ("El % ejecutado es…", `NOTA_DONDE`) pasan a un `InfoPunto` junto al encabezado de la lista. Los links a Universidades y a Provincias quedan como una línea con flecha debajo de la lista.
- **G5. Evolución por finalidad (nuevo).** Capítulo "¿Cómo cambió en el tiempo?", debajo de la lista, solo en la forma Para qué sin ruta: barras apiladas por año (2004 en adelante con `serie_larga`, desde el primer archivo anual con los archivos de cada año, igual que `serieNodo`), en pesos de hoy, una capa por finalidad (las 5 de `serie_larga`, mismos nombres que la lista), con colores del sistema en tono neutro (escala de un solo color en 5 pasos, no verde/rojo). Tocar una finalidad (en la leyenda o en el gráfico) la deja sola y escribe `ruta=<finalidad>` (que es lo mismo que tocarla en la lista). Cálculo en una función nueva `evolucionFinalidades(ix, porAnio, deflactor)` en `lib/gasto.ts` que reutiliza `serieNodo` por finalidad (los totales de cada año tienen que coincidir con `serieNodo` del gasto total). SVG propio, sin librerías. Baja los archivos de los años cerrados recién cuando el capítulo está por entrar en pantalla (`useAparecer`), como `Comparar` al abrirse. Año en curso fuera, como en `Comparar`. Debajo, "Ver año por año" plegado con la tabla.
- **G6. Comparar años** sigue como hoy (plegado), dentro de un `Capitulo` "<Nodo> año por año" cuando hay ruta. Sin ruta, lo reemplaza G5.
- **G7. Compartir**: `CompartirHoja` en las acciones del capítulo principal (`onImagen` abre `PanelGasto` con `vistaImg`, como hoy; `href` = `hrefVista`; `texto` = la frase de G1 + fuente). Se sacan los botones "Compartir como imagen" y "Copiar link" y `aviso-link`.
- **G8. Unidades**: la cifra grande usa la misma unidad que Universidades (ver U1): `fmtMillones` en las dos (hoy una dice "billones" y la otra "millones"; la regla es la de `fmtMillones`, que elige la escala por el tamaño, y las dos páginas la usan igual).
- `GastoMensual.tsx` ("Cómo viene el año"): mismo tratamiento (G1 con su frase "En lo que va de <año>, …", controles en `BarraVista`, sin `card`), sin cambiar sus cuentas.
- El pie "Qué incluye, qué es cada etapa y fuente" queda plegado al final como "Cómo se mide" (mismo texto).

### P. Las provincias (`components/secciones/Provincias.tsx`, `ProvinciasCuentas.tsx`, `ProvinciasAlicuotas.tsx`, `lib/provincias.ts`, nuevo `components/sistema/MosaicoProvincias.tsx`)
Parámetros que se conservan: `anio`, `medida`, `gasto`, `prov`, `forma`, `ruta`, `todas`, `vista` (`cuentas`), `ind`, `orden`, `ib_act`, `ib_anio`, `ib_orden`.
- **P1. Vistas.** El `Seg` de dos opciones de arriba (hoy en vertical y roto) pasa a `FilaChips`: "Lo que gasta la Nación" / "Las cuentas de cada provincia".
- **P2. Respuesta arriba** (vista Nación). `fraseProvincias(v)` en `lib/provincias.ts`: con medida por habitante, "En <año>, la provincia que más recibió de la Nación por habitante fue <X> (<monto>); la que menos, <Y> (<monto>)." (sin contar "Sin provincia" ni las sin dato; si CABA queda primera o última, la frase lo dice igual: es un dato). Con total y con %, la misma frase con "en total" / "del gasto ubicado". En `CabeceraDato` h2, cifra = el monto de la primera.
- **P3. Mapa de mosaico (nuevo).** `MosaicoProvincias` en `components/sistema/` (genérico: recibe `{ id, nombre, valor, texto }[]`, `resaltar`, `onElegir`, `etiqueta`): 24 cuadrados iguales en una grilla de 5 columnas × 8 filas, cada uno con la abreviatura (3 letras) y el valor corto, coloreado por el valor en una escala de un solo tono (5 pasos, del token de acento; sin verde/rojo: recibir más no es mejor ni peor). Ubicación fija por id de INDEC (columna, fila, desde 0):

  | Fila | Col 0 | Col 1 | Col 2 | Col 3 | Col 4 |
  |---|---|---|---|---|---|
  | 0 | | Jujuy (38) JUJ | Salta (66) SAL | Formosa (34) FOR | Misiones (54) MIS |
  | 1 | | Catamarca (10) CAT | Tucumán (90) TUC | Chaco (22) CHA | Corrientes (18) COR |
  | 2 | San Juan (70) SJU | La Rioja (46) LRI | Santiago del Estero (86) SDE | Santa Fe (82) SFE | Entre Ríos (30) ERI |
  | 3 | Mendoza (50) MZA | San Luis (74) SLU | Córdoba (14) CBA | Buenos Aires (6) BUE | Ciudad de Buenos Aires (2) CABA |
  | 4 | Neuquén (58) NQN | Río Negro (62) RNE | La Pampa (42) LPA | | |
  | 5 | | Chubut (26) CHU | | | |
  | 6 | | Santa Cruz (78) SCR | | | |
  | 7 | | | Tierra del Fuego (94) TDF | | |

  Cada cuadrado es un `button` de al menos 44 px con `aria-label` "<Nombre>: <texto>"; tocarlo abre la provincia (`prov`, como la lista). Leyenda de la escala debajo (mínimo y máximo con su monto). Sin dato: cuadrado con raya y "sin dato". SVG o grilla CSS, sin librerías. A 360 px entra entero sin deslizar.
- **P4. Mosaico + ranking.** Debajo de la respuesta: en la computadora, mosaico a la izquierda y ranking a la derecha; en el celular, mosaico arriba y ranking debajo. El ranking pasa a `ListaBarras` (tono neutro) con la provincia abierta resaltada; "Sin provincia" y CABA rotulados como hoy.
- **P5. Controles**: `BarraVista` con "<Año>", "<Medida>" y "<Qué gasto>" (Todo / Sin jubilaciones ni asignaciones) → `Hoja` "Ajustes". El recuadro de alcance de hoy (qué es el gasto ubicado, qué queda sin provincia) pasa a `InfoPunto` junto al título.
- **P6. Detalle de una provincia** (`prov`): se abre como hoy (en el lugar, con foco en su título), como `Capitulo` h2 "<Provincia>: en qué gasta la Nación en <año>" con su frase ("<monto> por habitante, <puesto> de 24"), las formas en `FilaChips`, `ListaBarras` para los niveles y la evolución de hoy. Cruz o "Volver al mapa" que borra `prov`.
- **P7. "Lo que gastan las provincias juntas"** (`prov-agregado`): `Capitulo` sin caja.
- **P8. Vista Cuentas** (`ProvinciasCuentas.tsx`): misma receta. `fraseCuentas(v)` en `lib/provinciasCuentas.ts`: "En <período>, <indicador>: más alto en <X> (<valor>), más bajo en <Y> (<valor>)." Controles: `BarraVista` con "<Indicador>", "<Año>", "<Orden>" → `Hoja` (el indicador como lista de botones agrupada, no `Selector`). Ranking en `ListaBarras` (divergente si el indicador tiene signo, como el resultado fiscal; tono por la ley de colores solo si el indicador tiene `dir`, si no neutro). Mosaico (P3) con el indicador elegido. Detalle de provincia igual que P6.
- **P9. Alícuotas** (`ProvinciasAlicuotas.tsx`): `Capitulo` h2 con frase "Para <actividad>, la alícuota más alta es la de <X> (<n> %) y la más baja, la de <Y> (<n> %).", controles en `BarraVista` + `Hoja`, lista en `ListaBarras` neutra. La ventana de aperturas queda como está (`Modal`).
- Compartir en las tres vistas: `CompartirHoja` con `onImagen` → `PanelGasto` como hoy.

### U. Universidades (`components/secciones/Universidades.tsx`, `lib/universidades.ts`)
Parámetros que se conservan: `anio`, `med`, `orden`, `u`, `q`.
- **U1. Respuesta arriba.** `fraseUniversidades(v)`: "En <año>, la Nación transfirió <total> a las universidades nacionales: <var> que el año anterior, en pesos de hoy." (o "% del PIB" si `med=pib`), con `Delta` contra el año anterior (tono neutro). `CabeceraDato` h2; reemplaza `uni-resumen` (lo que hoy tiene el resumen, como la evolución corta, queda debajo de la cabecera, sin caja).
- **U2. Controles**: `BarraVista` "<Año>" · "Pesos de hoy|% del PIB" → `Hoja`.
- **U3. Lista**: "Qué recibió cada universidad" como `Capitulo`, con el buscador de hoy arriba (mismo `q`), el orden (Monto / Variación / Por estudiante) en `FilaChips` y la lista en `ListaBarras` (con `Variación` divergente neutra; las otras dos, no divergentes). La universidad abierta (`u`) resaltada y abierta como hoy.
- **U4. Por estudiante, Control y rendición de cuentas**: `Capitulo` cada uno, sin caja; "Cómo leer esta cuenta" a `InfoPunto`.
- **U5. Compartir**: `CompartirHoja` → `PanelGasto`.

### S. Semáforo de actividad (`components/secciones/Semaforo.tsx`, `lib/semaforo.ts`)
Parámetros que se conservan: `med`, `v`.
- **S1. Respuesta arriba.** `fraseSemaforo(t: Tabla)`: "En <último mes con difusión no atenuada>, subieron <n> de <m> indicadores de actividad (<pct> %)." con `Delta` contra el mes anterior (en puntos de la difusión; tono por la ley de colores: más indicadores en alza es "bueno"). Cifra grande = el %. `CabeceraDato` h2.
- **S2. Controles**: la medida (Interanual / Mes contra mes) en `FilaChips`; la nota de por qué mes contra mes no tiene todos los indicadores, a `InfoPunto` junto a la fila.
- **S3. Tabla**: queda como tabla (es la forma correcta: indicador × mes), sin caja alrededor; la fila de difusión pasa arriba de los grupos (es la respuesta) y se repite abajo. Los colores de las celdas no cambian. La ventana de la fila (`VentanaFila`) queda como está.
- **S4. Compartir**: `CompartirHoja` → `PanelSemaforo`. "Cómo se calcula" e "Indicadores que no pudimos incluir", plegados al final ("Cómo se mide").

### B. Parte del Banco Central (`components/secciones/ParteBcra.tsx`, `lib/diario.ts`)
Parámetros que se conservan: `v`, `per`.
- **B1. Respuesta arriba.** `CabeceraDato` h2 con la primera variable del parte (las reservas): cifra, fecha y sus `Delta` contra el día anterior y contra un mes atrás (las comparaciones que ya calcula `lib/diario.ts`), con la frase automática que ya tenga el parte (si no hay, ninguna; no inventar).
- **B2. Variables**: las tarjetas pasan a filas sin caja (nombre, cifra, fecha, `Delta` y minigráfico a la derecha), toda la fila tocable (abre `v` como hoy). Cada variable con su fecha, como hoy (CLAUDE.md: cada dato lleva su propia fecha). Mismo patrón que el zócalo de la portada (`BloqueParte.tsx`) en lo que se pueda reutilizar, sin cambiar el zócalo.
- **B3. Variable abierta** (`v`): `Capitulo` con el gráfico grande y el período (`per`) en `FilaChips`.
- **B4. Compartir**: `CompartirHoja` con `onImagen` → `PanelParte` y `texto` = el texto para pegar en redes que hoy copia el botón (`copiarTexto`), sin cambiarlo.

### C. Gobierno y Congreso (`components/secciones/GobiernoCongreso.tsx`, `lib/capacidad.ts`)
Parámetros que se conservan: `cgi`, `cgp`.
- **C1. Respuesta arriba.** Frase por indicador elegido (`fraseCapacidad(datos, ind, pres)` en `lib/capacidad.ts`): por ejemplo, para bancas, "<Presidente> tiene <n> bancas propias de <total> en Diputados (<pct> %) y <n> de <total> en el Senado." (los totales salen de `capacidad.json`, no escritos a mano) Para leyes, DNU y vetos, la cifra del gobierno actual y su lugar entre los gobiernos con dato. Sin juicio (D-012).
- **C2. Controles**: el indicador (Bancas / Leyes / DNU / Vetos) en `FilaChips`. La página deja de ser una `card` con id `congreso`: el ancla `#congreso` se conserva en el primer `Capitulo`.
- **C3. Por gobierno**: barras en `ListaBarras` (o `TablaMandatos` si hoy es tabla), gobierno elegido (`cgp`) resaltado. "¿Cómo se cuenta?" plegado al final.

### E. Elecciones (`components/secciones/Elecciones.tsx`)
Parámetros que se conservan: `et`, `elr`, `em`, `emn`, `eipc`.
- **E1. Respuesta arriba.** El bloque "¿Qué dicen los datos sobre el voto al oficialismo hoy?" pasa primero como `Capitulo` con su cifra grande (la que ya calcula, sin cambiar la cuenta).
- **E2. Aviso**: la caja roja "Ejercicio estadístico, no un pronóstico" pasa a una línea gris bajo la cifra con un `InfoPunto` que tiene el texto completo (el rojo es para "malo" según la ley de colores, no para alarmas). La línea queda siempre visible: es parte de la respuesta.
- **E3. Controles**: `BarraVista` con "<Presidenciales y legislativas>", "<Medir: …>", "r ≥ <corte>", "<N> variables" y "<Con/Sin detalle regional>" → una `Hoja` "Ajustes" con los `Seg` de hoy (ninguno se parte: si tiene más de 3 opciones, lista de botones). "Cómo leer estos números" pasa a `InfoPunto`.
- **E4. Dispersión y Correlación**: `Capitulo` cada uno, sin caja. "Ver las elecciones usadas" plegado al final.

### R. Ranking (`components/secciones/Ranking.tsx`)
Parámetros que se conservan: `rkc`, `rk`, `rkv`, `rka`.
- **R1. Respuesta arriba**: el primero del ranking con los indicadores elegidos, en una frase ("Con los <n> indicadores elegidos, el que más mejoró fue <X>, en <k> de <n>."), con la cuenta que ya hace la página (contar los indicadores donde quedó primero, de la misma tabla).
- **R2. Controles**: `BarraVista` con "<Por grupos|Elegir variables>", "<Mejora|Nivel promedio|Ambos>", "<N> grupos" → `Hoja` con los controles de hoy; los grupos como chips que se marcan (en la hoja, varios renglones están bien).
- **R3.** "Indicador por indicador" y el "Puntaje combinado" (plegado, como hoy) como `Capitulo`; el método pasa a `InfoPunto`. Sin `.card` ni `.callout`.

### H. Herencia (`components/secciones/Herencia.tsx`, `lib/herencia.ts`)
Parámetros que se conservan: `p`, `vista`, `v`.
- **H1. Respuesta arriba**: `fraseHerencia(pres)` en `lib/herencia.ts`, solo hechos (D-012): "De los <m> datos con valor al asumir y al entregar, <n> estaban mejor al entregar y <k> peor (según la ley de colores de cada dato)." Si la página ya calcula el tono de cada fila, se cuenta eso; si no, la frase solo nombra el período ("Asumió en <mes>; los datos van de <mes> a <mes>").
- **H2. Tabla** "Recibido y entregado": `TablaMandatos` no aplica (las filas son datos, no presidentes). Se queda tabla con primera columna fija (`tablewrap fija`), pero en el celular se apila por fila (dato arriba; recibido → entregado y el cambio debajo, grande), para que "Cambio" no quede fuera de pantalla. **Arreglar "−$ 105,9 M millones"**: la unidad no se repite (una sola escala, la de `fmtMillones` o la de la serie). Buscar con grep el mismo error en todo el sitio (`M millones`, `millones millones`, `mil millones millones`).
- **H3. Controles**: vista (Un presidente / Todos los traspasos) en `FilaChips`; presidente y variable en `BarraVista` + `Hoja` (lista de botones, no `Selector`).
- **H4.** Citas, estimaciones y "Lo que no se puede medir…" como `Capitulo` sin caja; las notas, plegadas como hoy.

### L. Gráficos listos (`components/secciones/Plantillas.tsx`)
Parámetros que se conservan: `g`, `q`.
- **L1.** Los 12 grupos pasan de un `Seg` en 5 renglones a `FilaChips` (un renglón deslizable), con "Todos" primero.
- **L2.** Cada gráfico como `Lamina` (como en la ficha y el Histórico), en grilla de 2 columnas en el celular y 4 en la computadora, agrupadas bajo un h2 por grupo (sin caja). Los gráficos guardados por la persona ("Mis gráficos", `misPlantillas`) quedan primero, con sus acciones de renombrar y borrar como hoy.
- **L3.** El buscador (`q`) arriba de los chips, con el mismo aspecto que el `Buscador` del sistema si se puede reutilizar sin cambiarlo; si no, el `input` de hoy con 44 px de alto.
- **L4.** El botón compartir de cada lámina (32 px hoy) pasa a 44 px o se saca de la lámina y queda dentro de la plantilla abierta (elegir lo que no rompa la `Lamina`: preferible sacarlo, porque la lámina entera es un link).

### F. Fuentes (`components/secciones/Fuentes.tsx`, `lib/fuentes.ts`)
- **F1. Respuesta arriba**: "<N> series de <k> organismos, desde <mes> hasta <mes>." (lo que hoy dice el `sub`, en `CabeceraDato` h2 sin deltas, cifra = N).
- **F2. Lista por organismo**: agrupar `metas` por `organismoDe(fuente)` (las que dan vacío van en "Cálculos propios y portales"); por cada organismo, una fila con su nombre, la cantidad de series en el sitio, un link a su página oficial (tabla nueva `LINKS_ORGANISMO: Record<string, string>` en `lib/fuentes.ts`, con las páginas de inicio de cada organismo; solo los que se puedan confirmar, sin inventar URLs) y, plegado, la lista de sus series (nombre público, link a la ficha si existe —`lib/datos-fijos.ts`— o al Histórico).
- **F3.** El texto de `FUENTES_HTML` queda plegado al final como "Detalles técnicos", sin cambios de contenido salvo sacar los nombres internos de las APIs que la persona no necesita para ir a la fuente (`api.indec.gob.ar (tabla ipc_nacional)` → "INDEC"); el link a la fuente reemplaza al nombre interno. Sin `dangerouslySetInnerHTML` si el cambio lo permite sin reescribir todo (si no, queda).
- Fuera de esta etapa: la fecha del último dato por organismo (hace falta bajar todas las series; ver "Fuera").

### T. Todo el sitio (barrido)
- **T1.** Al terminar, ninguna página usa `.card` como contenedor de bloque (grep de `className="card` en `web/components/secciones/` y `web/app/`: lo que quede tiene que ser un error de carga o un estado vacío, y se justifica en el informe). Lo mismo con `aviso-link`, `callout`, `btn primario` para compartir y `Desplegable` en estas páginas.
- **T2.** Objetivos táctiles de 44 px en todo lo que se toca de estas páginas (ⓘ, compartir, chips, filas).
- **T3.** Ningún texto de 11 px fuera de los ejes de los gráficos (la auditoría contó 50 en Gasto).
- **T4.** Los estados de carga reservan el alto (la página no salta) y los errores siguen el patrón de hoy, pero sin caja.

### CSS (`web/app/globals.css`)
- Clases nuevas con el prefijo de cada página (`gas-`, `prov-`, `mosaico-`, `uni-`, `sem-`, `parte-`, `cg-`, `elec-`, `rk-`, `her-`, `pl-`, `fue-`); buscar antes con grep que no existan. Tokens del sistema, sin colores fijos. Bloque nuevo al final bajo "Remodelación 3.5: Herramientas", con un subtítulo por página.
- Borrar el CSS que quede sin uso en cada página (`.gas-card`, `.gas-total*`, `.gas-lista`, `.gas-fila*`, `.gas-barra*`, `.prov-card`, `.uni-resumen`, `.aviso-elecciones`, `.filtros-graficos`, `.plantilla`, `.curio`, etc.) solo después de comprobar con grep que nada más los usa.

## Orquestación (para la implementación)
Seis subagentes en paralelo (Sonnet, esfuerzo medio), cada uno con esta spec y solo sus archivos; ninguno corre `npm run build`, servidores ni commits:
1. **G**: `Gasto.tsx`, `GastoMensual.tsx`, `lib/gasto.ts`, `lib/gasto-mensual.ts`.
2. **P**: `Provincias.tsx`, `ProvinciasCuentas.tsx`, `ProvinciasAlicuotas.tsx`, `lib/provincias*.ts`, `sistema/MosaicoProvincias.tsx` (nuevo).
3. **U + F**: `Universidades.tsx`, `lib/universidades.ts`, `Fuentes.tsx`, `lib/fuentes.ts`.
4. **S + B**: `Semaforo.tsx`, `lib/semaforo.ts`, `ParteBcra.tsx`, `lib/diario.ts`.
5. **C + E + R**: `GobiernoCongreso.tsx`, `lib/capacidad.ts`, `Elecciones.tsx`, `Ranking.tsx`.
6. **H + L**: `Herencia.tsx`, `lib/herencia.ts`, `Plantillas.tsx`.
- **CSS**: cada subagente escribe su CSS en un archivo propio `web/app/_css-3-5-<letra>.css` (no importado); la sesión principal lo pega al final de `globals.css` y borra los archivos. El borrado de CSS viejo lo hace la sesión principal, con grep, después de juntar todo.
- Si un subagente necesita cambiar un componente de `sistema/` (por ejemplo, la prop `flecha` de `ListaBarras`), no lo toca: lo pide en su informe y lo hace la sesión principal antes de compilar, sin cambiar el aspecto por defecto.
- Cada uno entrega un informe por requisito (hecho / no hecho / cambiado y por qué).

## Fuera de esta etapa
- Imágenes compartibles nuevas (la del mapa de provincias, la de la evolución por finalidad): por ahora, las imágenes que ya existen.
- Fecha del último dato por organismo en Fuentes.
- `/curiosidades/` (ya redirige a Gráficos listos), `/tema/`, `/dato/`, `/mandato/` y `/contexto/`: ya hechos en etapas anteriores o sin cambios.
- Cambiar cualquier cuenta de `lib/` que no sea agregar las frases y `evolucionFinalidades`.
- Regenerar `DESIGN.md` con el documentador de Impeccable (queda para después de esta etapa, ya con el sitio entero remodelado).

## Cómo se verifica
- `npm run tipos` y `npm run build`.
- **Cuentas**: la frase de Gasto (total y "N de cada 100") contra la lista de la misma vista; la suma de las capas de G5 en 2023 igual a "Comparar años" del gasto total en 2023; la provincia primera y última de P2 contra el ranking; el total de U1 y su variación contra "Ver año por año"; la difusión de S1 contra la fila de la tabla; la cifra de B1 contra la fila de las reservas; la frase de C1 contra el gráfico de bancas. Una de cada una, contada a mano.
- **Links viejos** (sin errores de consola, mismo contenido): `/gasto/?anio=2024&med=pib&etapa=vigente&forma=quien&ruta=<un organismo>`, `/gasto/?todas=1`, `/gasto/?vista=mes`, `/gasto/?forma=donde`; `/provincias/?medida=total&gasto=sin_ss&prov=<id>&forma=quien`, `/provincias/?vista=cuentas&ind=<id>&orden=asc&prov=<id>`, `/provincias/?vista=cuentas&ib_act=<slug>&ib_orden=asc`; `/universidades/?med=pib&orden=est&u=<slug>&q=buenos`; `/semaforo/?med=mm&v=<clave>`; `/bcra/?v=<clave>&per=<per>`; `/congreso/?cgi=dnu&cgp=<pres>` y `#congreso`; `/elecciones/?et=pres&elr=0.5&em=nivel&emn=8&eipc=si`; `/ranking/?rkc=ambos&rk=<grupos>&rka=<pres>` y uno con `rkv`; `/herencia/?p=<pres>&vista=traspasos&v=<clave>`; `/plantillas/?g=<grupo>&q=dólar`; una plantilla guardada en "Mis gráficos".
- **Mosaico**: las 24 provincias en su lugar (tabla de P3), tocar una abre su detalle y escribe `prov`; colores en el mismo orden que el ranking; a 360 px entra sin deslizar; con teclado se recorre en orden de lectura.
- **Barrido de todas las rutas** (las 11 de esta etapa y, para ver que nada se rompió, `/`, `/historico/`, `/presidentes/`, `/dato/inflacion-mensual/`, `/contexto/`) a 360, 390 y 1280 px, tema oscuro y claro: sin desplazamiento horizontal de la página, sin errores de consola, un solo h1, objetivos de 44 px, respuesta visible sin deslizar a 390 px, ningún chip partido en dos renglones. Medir el alto de `/gasto/` y `/provincias/` a 390 px antes y después (la respuesta tiene que subir: hoy el primer dato de Provincias está a 770 px).
- Cada `BarraVista` abre su hoja; Escape, cruz y Atrás la cierran y devuelven el foco; los cambios escriben los mismos parámetros que hoy.
- Grep de T1 y de "M millones" sin resultados.
- `impeccable detect` y agente `revisor`.
