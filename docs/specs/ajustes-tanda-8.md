# Ajustes, tanda 8: alineación, Compartir en un solo lugar, píldoras, ficha, presidentes, Banco Central y herencia

Estado: implementada (2026-11-15), publicada en 32e022b

Pedidos del usuario al recorrer la página (2026-11-14, 28 puntos, anotados en `docs/IDEAS.md`). Como en las tandas anteriores, cada pedido es un caso de una regla general: cada parte aplica las reglas de abajo en **todos** sus archivos, no solo en el caso señalado, y lo informa.

Fuera de esta tanda: el punto 15 (control de cada variable del Histórico) queda como idea para una fase siguiente; la deuda neta consolidada (punto 24) necesita fuente y método (ver Parte G1, 4); el ícono del sitio (punto 2) se elige entre propuestas y lo aplica la sesión principal.

## Reglas generales (valen para todo el sitio)

- **R11. Compartir en un solo lugar.** Todo Compartir es el mismo botón: píldora chica amarilla (`--accion`, texto `--sobre-accion`) con el ícono de compartir y la palabra "Compartir" (solo el ícono, con `aria-label`, en un renglón que no tenga lugar), **arriba a la derecha del capítulo o de la cabecera** a la que pertenece (en `Capitulo`, prop `acciones`). Nunca debajo del gráfico, nunca grande ni a lo ancho, nunca dos en el mismo capítulo. La cabecera de un dato (`CabeceraDato`) no lleva Compartir propio: el del primer capítulo (el gráfico) es el de la página.
- **R12. Píldoras de elección múltiple separadas.** Selector de una sola opción = riel (como en la tanda 7). Elección múltiple (Líneas, Marcadores, presidentes, grupos…) = **píldoras sueltas separadas por `--e-2`**, sin riel; la elegida va rellena celeste con un ✓ a la izquierda, la no elegida en `--surface-2`. Dos elegidas juntas nunca se funden en una mancha. Un riel que no entra en un renglón no se parte en dos: pasa a píldoras sueltas que bajan de renglón (o a deslizamiento horizontal dentro del riel); nunca una píldora elegida que asoma por fuera del borde del riel.
- **R13. Filas comparables alineadas.** En tarjetas o filas que se leen una al lado de la otra (placas, temas, filas de herencia), cada parte (cifra, comparaciones, fecha, fuente, minigráfico) arranca a la misma altura o en la misma columna que en la vecina: grilla con filas compartidas (`subgrid` o alturas fijas por bloque), no texto apilado que se corre según lo que haya arriba. Las unidades largas van debajo de la cifra en chico, no al lado empujándola.
- **R14. Solo se toca lo que hace algo.** Si varios botones abren lo mismo, queda uno solo (por ejemplo "Ajustes") y lo demás pasa a ser un texto de resumen ("Por grupos · Mejora · 7 de 7 grupos"). Las opciones que se usan seguido (elegir variable, filtrar grupos) pueden ser botones propios al lado de Ajustes, cada uno abriendo su propia ventana.
- **R15. Etiquetas de gráficos que no tapan.** Toda etiqueta dentro de un gráfico (punto "Hoy", rótulo de barra, valor final de línea) se ubica donde no tape puntos, líneas ni otras etiquetas: se prueba arriba, abajo, izquierda y derecha y se elige la primera libre; si ninguna está libre, se une al punto con una línea fina de puntos y se lleva al borde superior.
- **R16. Explicaciones largas legibles.** Un texto explicativo con varias entradas ("¿Qué salario mirar?") se dibuja como lista de definiciones: el nombre en negrita en su propio renglón y la explicación debajo, ancho completo, con `--e-3` entre entradas. Nunca columnas que parten palabras.
- **R17. Un link a la misma página con otros parámetros funciona.** El estado vive en la URL y se lee al abrir (`useParams` de `web/lib/url.ts`): un link que lleva a la misma ruta con otro query string tiene que abrir esa vista (navegación completa con `<a href>` o `window.location.assign`, o que `useParams` vuelva a leer la URL). Ningún link "no hace nada".

## Parte A: sistema visual (CSS común, componentes del sistema, menú y configuración)

Archivos: `web/app/globals.css` (único que lo edita), `web/components/ui.tsx`, `web/components/sistema/{Hoja,Capitulo,CabeceraDato,FilaChips,BuscadorGlobal,Buscador,BarraInferior,MenuMas,InfoPunto,Delta,CompartirHoja,iconos}.tsx`, `web/components/Nav.tsx`, `web/components/ConfigProvider.tsx`, `web/components/PanelCompartir.tsx` (solo el botón `BotonCompartir`, no las imágenes).

1. (pedido 5) La cruz de `Hoja` y `Modal` no tapa la barra de desplazamiento: la cabecera de la capa (título + cruz) queda fija arriba, fuera de la zona que se desliza, y la barra de desplazamiento empieza debajo de esa cabecera. Al pasar el mouse, la cruz no crece por encima del borde de la capa.
2. (pedido 9) Un solo menú de secciones: la computadora (barra de arriba) y el celular (barra de abajo y "Más") muestran **las mismas opciones con los mismos nombres e íconos**, en el mismo orden; la de arriba con el mismo lenguaje de píldoras (R1 de la tanda 7). Definir la lista una sola vez y usarla en los dos.
3. (pedidos 10 y 18, R12) Rediseñar `Seg`/`Opciones`/`FilaChips` y los selectores de la ventana Configurar: riel para una opción, píldoras sueltas con ✓ para varias; el riel que no entra pasa a píldoras sueltas. Revisar "Período por defecto" de Configurar (7 opciones) y Líneas/Marcadores del Histórico.
4. (pedido 11) Buscar (la capa de `BuscadorGlobal`): fondo de la capa translúcido con desenfoque (`backdrop-filter: blur`, con respaldo opaco si no lo soporta), de modo que se vea la página detrás; la caja de búsqueda debajo del título "Buscar", sin quedar tapada por él (ni al enfocarla ni con el teclado del celular abierto).
5. (R11, pedidos 16 y 19) `BotonCompartir` con variante única de R11 (clase `compartir`, amarilla, chica). `Capitulo` alinea `acciones` arriba a la derecha del título también en el celular (el título se parte, el botón no baja). `CabeceraDato` deja de dibujar `accion` (se mantiene la prop por compatibilidad, sin uso: las páginas pasan el Compartir al capítulo).
6. Barrido: todas las capas (Hoja, Modal, buscador, ventanas de configuración) con la cabecera fija; todos los selectores de elección múltiple del sitio con R12 (los que vivan en `globals.css`).

## Parte B: portada

Archivos: `web/components/secciones/Inicio.tsx`, `web/app/estilos/portada.css`, componente nuevo `web/components/sistema/iconosTemas.tsx` (íconos de temas y secciones), `web/lib/secciones.ts` y `web/lib/temas.ts` solo si hace falta sumar el ícono o una descripción corta.

1. (pedido 1, R13) Placas "Los datos más buscados": cifra, bajada (interanual / "por debajo de su récord"), comparaciones, fecha, fuente y minigráfico a la misma altura en las cuatro (grilla con filas compartidas; la bajada reserva dos renglones). La fuente larga ("SECRETARÍA DE TRABAJO (SI…") se acorta con el nombre público corto, sin puntos suspensivos si se puede.
2. (pedido 6, R13) "¿Qué datos te interesan?": la cifra de cada tema en una columna derecha alineada entre filas; la unidad ("$ de oct-26 por mes") va debajo de la cifra en chico, no al lado.
3. (pedido 12) Cada tema lleva un ícono propio (precios: changuito o etiqueta; salarios: billete; dólar: signo US$; actividad: fábrica; pobreza: personas; cuentas públicas: balanza o edificio público; sector externo: barco o globo; etc.), dibujados en SVG de línea, del mismo grosor y tamaño que los de `Iconos.tsx`, en `--acento`.
4. (pedido 13) "Todas las secciones" como **mosaico**: una tarjeta por sección con su ícono grande, nombre y una línea de qué se hace ahí (la explicación entra en dos renglones como máximo), agrupadas como hoy; las tarjetas con fondo `--surface-1`, hover que levanta y resalta el ícono, todas del mismo alto en cada fila. En el celular, dos columnas (una si el nombre no entra). Distinto de la lista de temas de arriba (que es una lista de renglones).
5. Barrido: otras listas de la portada que mezclan cifra y unidad o que no alinean.

## Parte C: buscador de variables y explicaciones

Archivos: `web/components/Variables.tsx`, `web/app/estilos/variables.css`, `web/lib/info.ts`.

1. (pedido 3) El ⓘ de cada renglón del buscador es un círculo de 28 px dentro de un área tocable de 44 px, centrado verticalmente, sin óvalo estirado ni borde: revisar qué regla lo estira (en el renglón de variable el botón hereda alto y ancho de otro botón) y anularla. Comprobar con el buscador abierto y con resultados de búsqueda.
2. (pedido 4, R16) Las explicaciones de categoría (`INFO_CAT`, "Sobre <categoría>"): las listas se dibujan como lista de definiciones de una columna (nombre en negrita arriba, texto debajo); ninguna regla de grilla o `flex` parte las palabras. Pasar los textos de `INFO_CAT` con varias entradas a ese formato (`<dl><dt>…</dt><dd>…</dd></dl>` o `<ul>` con la clase nueva), sin cambiar su contenido. Texto corrido sin entradas: párrafos.
3. Barrido: otros lugares que muestran HTML de ayuda (`InfoPunto`, "Cómo se mide", fichas) con el mismo problema.

## Parte D: Histórico y enlaces a la misma página

Archivos: `web/components/secciones/Historico.tsx`, `web/app/estilos/historico.css`, `web/lib/historico.ts`, `web/lib/url.ts`, `web/components/GraficosListos.tsx`, `web/components/sistema/Lamina.tsx`.

1. (pedido 14, R17) Estando en `/historico/?v=bcra_cuasifiscal~real~~compra~` y tocando la lámina "Déficit cuasifiscal del Banco Central (% del PIB)" de Gráficos listos no pasa nada: `useParams` lee la URL solo al montar y el `Link` de Next a la misma ruta no remonta. Arreglarlo para todos los links a la misma ruta (preferible: `useParams` vuelve a leer la URL cuando cambia por una navegación del cliente; si no, las láminas y links a la misma ruta hacen navegación completa), y que la página quede arriba de todo con la vista nueva.
2. (pedido 17) "Expandir" deja de ser un botón con texto debajo del gráfico: pasa a ser un botón de ícono (flechas hacia las esquinas, 44 px, `aria-label="Ver el gráfico a pantalla completa"`) en la fila de controles de arriba del gráfico (junto al período, la frecuencia y Ajustes), del lado derecho. La unidad y la fuente quedan solas debajo del gráfico a todo el ancho.
3. (pedido 17) La hoja Ajustes no tiene filtro de fecha ("Desde"/"Hasta"): el período se elige desde su píldora ("2003 – oct 2026").
4. (R11) El Compartir del Histórico sube arriba a la derecha (de la cabecera del dato o del capítulo del gráfico), con el estilo de R11; debajo del gráfico queda solo "Presidentes" (o lo que corresponda), no dos botones grandes.
5. Barrido (R17): buscar en todo `web/` links (`Link`, `BotonLink`, `href`) que apunten a la misma ruta en la que se muestran con otro query string (fichas, temas, plantillas, `/bcra/?v=`, presidentes) y comprobar que funcionan.

## Parte E1: ficha del dato y gráfico

Archivos: `web/components/FichaDato.tsx`, `web/lib/ficha.ts`, `web/app/estilos/ficha.css`, `web/components/sistema/BarrasMes.tsx`, `web/components/sistema/TablaMandatos.tsx`, `web/components/Grafico.tsx`, `web/app/estilos/grafico.css`, `web/components/secciones/Dato.tsx`, `web/components/secciones/Tema.tsx`.

1. (pedidos 16 y 19, R11) Sin el Compartir grande amarillo de la cabecera de la ficha. Cada capítulo de la ficha (gráfico, ¿Cómo le fue con cada presidente?, Mes a mes, ¿Cómo fue <mes> en otros años?) tiene su Compartir arriba a la derecha del título, mismo botón y misma posición en todas las fichas (datos fijos, temas, `/dato/`).
2. (pedido 7) "Mes a mes, desde que asumió": al quedar a la vista se dibuja **mes por mes** (cada mes de mandato aparece de a uno en todas las líneas a la vez, ~120 ms por mes a velocidad normal), con controles chicos debajo del gráfico: Repetir (↺), Pausa/Seguir y Velocidad (riel: Lenta 0,5× · Normal 1× · Rápida 2×). Tocar el gráfico pausa (regla "Lo que se mueve solo"). Con "reducir movimiento", quieto y completo, sin controles. La animación por meses se implementa en `Grafico.tsx` como opción (`revelar?: { paso: number; ... }` o similar) que recorta los datos visibles, sin cambiar los valores ni la escala (la escala es la del gráfico completo desde el primer cuadro).
3. (pedido 20, R15) "¿Cómo fue <mes> en otros años?" (`BarrasMes`): todos los rótulos van arriba del gráfico, en una franja propia; el rótulo de la barra elegida (al tocar o pasar el mouse) aparece arriba y se une a su barra con una línea fina de puntos; los rótulos fijos (último dato, máximo/mínimo, el año destacado en ámbar) también arriba, con su línea de puntos del color de su barra. Los rótulos no se pisan entre sí (si dos chocan, se corre el de menor importancia).
4. (pedido 21) Tabla por presidente (`TablaMandatos`): cuando a un presidente se le cuenta el inicio distinto que al resto (Milei: desde el mes después de asumir; un mandato que empieza antes de que haya datos: "datos desde ene-95"), debajo del nombre, en lugar de solo "dic-23 a hoy", dice **qué se cuenta**: "Cuenta desde ene-24 (mes después de asumir)" o "Cuenta desde ene-95 (inicio de los datos)", con un ícono de alerta y en el color de advertencia (no rojo de "peor": usar ámbar `--advertencia` o el que exista). Los demás no llevan marca. El encabezado "Desde: el mes de asunción, con excepciones" sigue.
5. Barrido: otros capítulos con Compartir fuera de lugar en `Tema.tsx` y `Dato.tsx`; otros gráficos con rótulos que se pisan.

## Parte E2: Por presidente y Meses de mandato

Archivos: `web/components/secciones/Presidentes.tsx`, `web/components/secciones/Mandato.tsx`, `web/components/secciones/ContextoMandato.tsx` (si toca), `web/components/sistema/GrillaPresidentes.tsx`, `web/lib/presidentes.ts`, `web/lib/estadisticas.ts` (solo funciones nuevas), `web/app/estilos/presidentes.css`.

1. (pedido 22) "Un presidente, todas las variables": cada fila lleva el minigráfico del mandato (el mismo de "Mis variables") y una estrella (botón de 44 px, `aria-pressed`) que agrega o saca la variable de Mis variables; llena si ya está, vacía si no. Con "Mis variables" la estrella también está (llena) y sacarla la quita de la lista.
2. (pedido 22) Grupo plegado: además de "(12)", "7 mejoraron · 4 empeoraron · 1 sin cambio" (según el tono bueno/malo de cada variable de inicio a cierre, no según subió/bajó; las neutras como "sin calificar"). Con color y con texto (verde/rojo nunca solo).
3. (pedido 23) Meses de mandato: la leyenda de presidentes es tocable y resalta su línea (como la ficha, opción `resaltar` de `Grafico`), `aria-pressed`. Valor por defecto de la página (sin parámetros): dólar blue, en pesos corrientes, modo "Mismo punto de partida", con Milei resaltado. Un link con parámetros sigue mostrando lo mismo que antes.
4. (pedido 23) "Resumen por hitos": dos formas a elegir con un riel ("Barras" / "Tabla"): barras agrupadas por hito (un color por presidente) y tabla con celdas coloreadas tipo mapa de calor (escala divergente bueno/malo según el tono de la variable, con la cifra escrita). La elección va en la URL con un parámetro nuevo (`mhv=barras|tabla`; defecto: barras). El Compartir de ese capítulo dibuja la forma elegida si la imagen la soporta; si no, la tabla.
5. Barrido: otras leyendas de presidentes que no resaltan; otros grupos plegados sin resumen.

## Parte F: parte del Banco Central

Archivos: `web/components/secciones/ParteBcra.tsx`, `web/components/secciones/BloqueParte.tsx`, `web/components/GraficoDiario.tsx`, `web/lib/diario.ts`, `web/app/estilos/bcra.css`, `web/components/PanelParte.tsx`.

1. (pedido 8) Las filas principales del parte quedan menos cargadas: nombre, cifra grande y fecha; las dos variaciones (vs día anterior, vs hace un mes) en un renglón chico con flecha (R6 de la tanda 7), sin repetir "US$ … millones" si la cifra ya lo dice (por ejemplo "↓ 250 · día ant." y "↓ 373 · mes", con la unidad en el rótulo); el minigráfico a la derecha del mismo alto que la fila. La fila de compras: "Compró US$ 42 millones" y en un renglón "Acumulado nov-26: +51 · 2026: +16.037 · 2 ruedas seguidas comprando"; la rueda anterior pasa al detalle.
2. (pedido 8) Al abrir compras: el resumen de ruedas (compradoras, sin intervención, vendedoras, neto, promedio por rueda) va **debajo** del gráfico, compacto (grilla de 5 cifras chicas en la computadora, 2 columnas en el celular).
3. (pedido 8) Período: además de los atajos (1 mes, 3 meses, …) un botón "Elegir fechas" que abre una ventana con Desde y Hasta (campos de fecha, limitados a las fechas con datos); el gráfico y el resumen siguen ese rango. En la URL: parámetros nuevos `pd` y `ph` (AAAA-MM-DD); un `per` existente sigue funcionando y, si hay `pd`, gana `pd`.
4. Barrido: las otras variables del parte con el mismo exceso de rótulos.

## Parte G1: herencia

Archivos: `web/components/secciones/Herencia.tsx`, `web/lib/herencia.ts`, `web/lib/herencia-informes.ts` (si toca), `web/app/estilos/herencia.css`, `web/lib/imagen-presidentes.ts` (solo si la imagen de la herencia necesita la fila nueva).

1. (pedido 24) Cuentas públicas en % del PIB (resultado primario, financiero, cuasifiscal): "Recibió" muestra el **año calendario cerrado** del traspaso en lugar de los 12 meses a T-1: para quien asume en diciembre, el año que termina en ese diciembre (Milei: 2023 completo; Macri: 2015; Alberto F.: 2019); para quien asume en otro mes, el último año calendario completo antes de asumir. Rótulo de la fecha: "año 2023". Nota de la fila: "dic-23 ya fue en parte del gobierno nuevo; a nov-23 (12 meses) era −3,5 %". "Entregó/Hoy" sigue con los últimos 12 meses (o el año cerrado si el mandato terminó). Si el año cerrado no tiene los 12 meses publicados, cae a los 12 meses a T-1 con nota.
2. (pedido 24) Fila nueva "Resultado fiscal + cuasifiscal (Tesoro + Banco Central)" en Cuentas públicas: resultado financiero en % del PIB menos el déficit cuasifiscal en % del PIB (comprobar el signo de `bcra_cuasifiscal`: es un déficit en positivo; el total tiene que ser más negativo que el financiero cuando hubo cuasifiscal), con el mismo criterio de año cerrado. Nota: "No incluye intereses de las Lebac (2002-2017)". Dirección: más alto = mejor. Si los dos no tienen dato en el período, "sin dato" con el motivo.
3. (pedido 25) En el celular: cada fila con el nombre de la variable en el tamaño de los títulos de fila (no chico), Recibió y Hoy en dos columnas y el Cambio **debajo de Hoy** (o en una tercera columna si entra a 390 px), no en un renglón suelto a la izquierda. Probar a 360 y 390 px.
4. (pedido 24) Deuda neta consolidada (Tesoro + Banco Central): no se implementa en esta tanda. Dejar en `docs/IDEAS.md` (lo hace la sesión principal) el método a investigar: deuda bruta de la Administración Central − tenencias intra sector público (BCRA, FGS, BNA) + pasivos del Banco Central con privados − activos externos del Banco Central, todo en dólares, con fuente de cada parte (Secretaría de Finanzas trimestral, balance del Banco Central). Sería una estimación propia como las reservas netas (D-021).
5. Barrido: el resto de las filas de la herencia en el celular; la imagen compartible con la fila nueva.

## Parte G2: Ranking, Elecciones y Contexto internacional

Archivos: `web/components/secciones/Ranking.tsx`, `web/lib/ranking.ts` (si toca), `web/components/secciones/Elecciones.tsx`, `web/components/secciones/Contexto.tsx`, `web/components/secciones/PreciosMundo.tsx`, `web/components/secciones/PreguntaPrecios.tsx`, `web/lib/preciosMundo.ts` (si toca), `web/app/estilos/elecciones.css`, `web/app/estilos/contexto.css`.

1. (pedido 26, R14) Ranking: "Por grupos", "Mejora" y "7 de 7 grupos" pasan a ser un renglón de texto de resumen ("Por grupos · Mejora · 7 de 7 grupos"); el único botón general es Ajustes. Si en Ajustes se elige "Por grupos", al lado de Ajustes aparece el botón "Filtrar grupos" (abre una ventana con las píldoras de grupos, R12). La elección de variable (hoy un texto largo que ocupa la pantalla) pasa a un botón "Elegir variable" que abre el selector en una ventana.
2. (pedido 26, R14) Elecciones: lo mismo (resumen como texto, Ajustes, y botones propios para lo que se usa seguido).
3. (pedido 26, R15) Dispersión de Elecciones: la etiqueta "Hoy 42 % (extrapolado)" y las de cada elección no tapan puntos ni otras etiquetas (algoritmo de R15); "Hoy" puede ir en dos renglones ("Hoy 42 %" / "extrapolado").
4. (pedido 27) "Correlación de cada variable con el voto al oficialismo": en la columna Variable solo el nombre (sin categoría, ruta ni unidad debajo); la explicación detrás del ⓘ, que va al final de la fila (última columna). La columna Variable con ancho suficiente para que el nombre entre en un renglón si es una palabra (o dos renglones como máximo, sin cortar palabras).
5. (pedido 28) Contexto, precios contra el mundo: sin la pregunta "¿Es más cara la carne en la Argentina que en la zona euro?". Arriba un selector del rubro (píldora con el rubro elegido que abre una lista resumida con buscador, no un desplegable de texto subrayado) y directamente un **gráfico de barras horizontales** con la diferencia de la Argentina contra cada país y el mundo para ese rubro (cero = igual; a la izquierda "más barato en la Argentina", a la derecha "más caro"), ordenado de mayor a menor, con la cifra escrita en cada barra y la fecha de cada comparación. "Otros países (solo medido en 2021)" sigue plegado debajo. El Compartir del capítulo dibuja esas barras. Los parámetros de URL existentes (rubro y país) siguen abriendo lo mismo (el país elegido queda resaltado en el gráfico).
6. Barrido: otros selectores "en oración" con desplegables subrayados en Contexto y otros botones que abren lo mismo que Ajustes.

## CSS por parte

Solo la parte A edita `web/app/globals.css`. Las demás escriben en su archivo de `web/app/estilos/` (ya importados en `layout.tsx`): B `portada.css`, C `variables.css`, D `historico.css`, E1 `ficha.css` y `grafico.css`, E2 `presidentes.css`, F `bcra.css`, G1 `herencia.css`, G2 `elecciones.css` y `contexto.css`. Clases nuevas con prefijo de su parte; antes de crear una, buscar con grep que no exista.

## Lo que no cambia

- Ningún parámetro de URL ni id de serie cambia de significado. Parámetros nuevos: `mhv` (Mandato), `pd`/`ph` (parte del Banco Central).
- Cifras: mismas cuentas que hoy (un solo redondeo, `r1`), salvo la herencia fiscal (año cerrado, a pedido).

## Cómo se verifica

- `npm run tipos` y `npm run build` sin errores.
- En la vista local (`web-out`), a 390 y 1280 px, oscuro y claro:
  - Portada: placas con cada bloque a la misma altura (medir `getBoundingClientRect().top` de fecha y fuente en las cuatro); temas con cifras alineadas a la derecha e íconos; secciones en mosaico.
  - Buscador de variables: ⓘ redondo; "Sobre Salarios" en una columna legible.
  - Hoja de ajustes del Histórico con contenido largo: la cruz no tapa la barra de desplazamiento.
  - Menú: las mismas opciones arriba (1280) y abajo (390).
  - Configurar: "Período por defecto" sin píldora fuera del riel; Líneas con dos elegidas separadas y con ✓.
  - Buscar: fondo translúcido y caja visible bajo el título.
  - Histórico: la lámina de Gráficos listos a la misma página cambia la vista; Expandir como ícono arriba; Ajustes sin fechas; Compartir arriba a la derecha.
  - Ficha de inflación: sin Compartir grande; cada capítulo con Compartir en el mismo lugar; Mes a mes que se dibuja mes por mes con Repetir y Velocidad; meses en otros años con rótulos arriba y línea de puntos; tabla con "Cuenta desde ene-24 (mes después de asumir)" en Milei.
  - Presidentes: estrella y minigráfico, resumen en grupos plegados; Mandato por defecto en dólar blue con Milei resaltado; Resumen por hitos en barras y tabla con colores.
  - `/bcra/`: filas más limpias, resumen debajo del gráfico, "Elegir fechas" con `pd`/`ph`; contar a mano el neto de un rango corto contra `diario_bcra.json`.
  - Herencia de Milei: primario y financiero de "año 2023" (comparar con la suma de los 12 meses de 2023 / PIB de 2023 a mano) y la fila fiscal + cuasifiscal; a 390 px el cambio junto al Hoy.
  - Ranking y Elecciones: solo Ajustes + botones propios; etiqueta "Hoy" sin tapar; correlación con nombre solo.
  - Contexto: barras directas del rubro elegido; link viejo con rubro y país abre lo mismo.
- Links viejos (`/historico/?v=…`, `/mandato/?…`, `/bcra/?v=compras&per=…`, `/contexto/?…`) siguen abriendo lo mismo; consola sin errores; sin desborde a 360 px.
- Revisor contra esta spec.
