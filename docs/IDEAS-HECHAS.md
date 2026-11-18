# Ideas hechas

Lo que salió de `docs/IDEAS.md` porque ya está implementado (con la fecha y la spec). No se lee al empezar: se consulta para saber de dónde salió algo.

## ~~Inicio y búsqueda guiada~~ ✅ 2026-11-08
→ spec: docs/specs/inicio-y-temas.md (pendiente aparte: fotos de presidentes en la portada; subgrupos agro/minería/industria por rama necesitan series nuevas)
- Página de inicio visual (ej. los presidentes enfrentados, fotos de datos) que explique por qué existe la página y para qué sirve.
- Arranca preguntando qué tipo de dato te interesa (ej. Actividad económica), con un **(?)** que abre una explicación corta.
- Dentro del tema, primero los indicadores principales (PIB, EMAE…) y después los subgrupos (agro, minería, industria…). Tocás uno y ves todos sus datos.
- Podés cortar la búsqueda en el tema: te lleva a una **página del tema** (título, explicación y distintas formas de verlo: histórico, por presidente, contexto, etc.).
- Armar la búsqueda con una oración guiada o escrita: "quiero saber cuántos litros de cerveza se compran con un salario medio" → te muestra el gráfico.

## ~~Contexto para juzgar a un presidente~~ ✅ 2026-11-09
→ spec: docs/specs/contexto-internacional.md (también el consumo de carne, si hay fuente oficial)
- El contexto internacional influye (commodities con Néstor, pandemia con Alberto, tasas y petróleo con Milei).
- **Proyecciones vs. resultado**: qué se proyectaba a principio de año (FMI u otros) para Argentina, EE.UU., Europa, el mundo, y cuánto se desvió cada uno. Si el mundo cayó 50% contra lo proyectado y Argentina también, no es (solo) culpa del presidente. Posible sección "proyecciones cumplidas o no" y ranking de los que más se desviaron.
- **Comparar con vecinos o países parecidos**: crecer 5% no es mucho si los vecinos crecen 10%.
- Pendiente de este bloque: **consumo de carne vacuna por habitante**. La única serie oficial descargable (Ministerio de Agricultura, `AGRO_0244` en datos.gob.ar) termina en 2018, así que no se agregó; hay que ver si sale una fuente más nueva. Tampoco hay descargable la proyección de abril de 2023 en adelante, el desempleo proyectado ni la proyección para América Latina (la base "Historical WEO Forecasts" del FMI llega a abril de 2022).

## Comparación internacional (2026-11-09)
→ PBI y otras variables (base 100 desde 2000): spec docs/specs/contexto-internacional.md. Precios por categoría (nivel en dólares contra el mundo): spec docs/specs/precios-en-el-mundo.md. Queda pendiente la comparación de precios relativos en base 100.
- ~~**Precios por categoría**: cada división del IPC del INDEC (carne, ropa, servicios, etc.) contra la misma categoría en EE.UU., Europa y los países vecinos, para ver qué tan distorsionado está cada precio en Argentina. Ej.: precio de la carne en Argentina vs. el mundo.~~ ✅ 2026-11-09
- **Variables que no son precios** (PBI, empleo, etc.): traerlas también para los mismos países y poder comparar cada variable con Argentina.
  Ej.: crecimiento del PBI en **base 100 desde el 2000**, para ver cómo creció cada país.
- Se suma a "Comparar con vecinos o países parecidos" de más arriba: es la misma idea llevada a todas las variables.

## Capacidad de gobierno (2026-11-09)
- Legisladores **propios y aliados** del presidente: diputados y senadores, por período.
- **Leyes que quiso sacar vs. leyes aprobadas**.
- Otros indicadores a evaluar (ver "Sugerencias de Claude"): decretos (DNU) usados, vetos y vetos insistidos (→ entran en la spec), quórum en sesiones clave, cambios de gabinete.

## Histórico: celular y gráficos
→ spec: docs/specs/historico-celular.md (implementada, commit 144fc59)
- Barra de fechas y de vista (mes/año) **fija arriba** al bajar (ej. estás en "Rosario vs Chicago" y querés cambiar a "por año" sin subir).
- Eje X legible en celular: hoy los años se pisan y el gráfico queda apretado.
- Etiquetas de último dato, promedio, mediana: más chicas en celular.
- Variaciones en **verde/rojo según si es bueno o malo** (con `dir`: que baje el riesgo país es verde).
- Botón para **expandir el gráfico** a pantalla completa y en horizontal.
- Desplegables con estilo propio (en Android se ven los nativos, feos).
- Zoom arrastrando: al tocar, el gráfico se opaca y la selección se aclara a medida que arrastrás. Para volver, un botón arriba a la derecha (hoy son dos doble clic).
- Ver como **gráfico o tabla**. Otros tipos de gráfico solo si suman (casi todo va bien en líneas).

## Histórico: medidas y opciones
Las primeras seis → spec: docs/specs/medidas-y-opciones.md (implementadas 2026-11-08, ver "Hecho")
- ~~Hasta **4 gráficos** en la misma vista, cada uno con sus filtros, y compartir la vista entera.~~ ✅ 2026-11-08
- ~~Abajo, "Otros gráficos interesantes" (dólar, soja, brecha: cosas difíciles de armar con los filtros).~~ ✅ 2026-11-08
- ~~**Plantillas**~~ ✅ 2026-11-08: gráficos ya configurados con los datos de más interés (lo que hoy está en Curiosidades), con **buscador por palabra** (ej. "asado"). Darle importancia: muchas plantillas, mejor que sobren.
  (Estas tres → spec: docs/specs/plantillas-y-vistas.md. También: compartir plantillas propias por link.)

## Presidentes y mandato
- ~~"Inicio del mandato" pasa a ser **Configurar inicio del mandato**: T-1, T, T+N (también negativo) y **por presidente** (todos en T, Milei en T+1).~~ ✅ 2026-11-08
- ~~Preferencias guardadas por usuario; mejor una **configuración global** de la página que afecte a todas las secciones.~~ ✅ 2026-11-08
  (Estas dos → spec: docs/specs/configuracion-global.md)
- ~~En la vista de un presidente con todas las variables: poder filtrar y elegir, por ejemplo, 5 variables de distintas categorías una debajo de otra.~~ ✅ 2026-11-08

## Ranking de presidentes y curiosidades
- ~~Ranking armable de distintas formas: cuánto mejoró cada indicador en su mandato (desde T, T+1, etc.), en cuál se estaba mejor en nivel, quién tuvo la mejor/peor actividad, etc.~~ ✅ 2026-11-08
- ~~Separar Curiosidades del Ranking. Curiosidades tipo: "con este presidente el asado fue el más barato, pero se compraba menos por salario", "máxima pobreza histórica", "la ropa más barata".~~ ✅ 2026-11-08

## Elecciones
→ spec: docs/specs/presidentes-ranking-curiosidades.md
- ~~Porcentaje estimado de votos que sacaría el presidente en curso con los datos que tiene hasta hoy.~~ ✅ 2026-11-08

## Compartir gráficos
- ~~Todos los gráficos, indicadores y tablas tienen un botón **Compartir** que abre un panel para descargar lo que se está viendo.~~ ✅ 2026-11-10 (Histórico, Plantillas, Por presidente, Ranking y Meses de mandato; Elecciones, Curiosidades y Congreso quedan sin imagen)
- ~~Título que explique lo que se ve + subtítulo con los filtros aplicados.~~ ✅ 2026-11-10 (Histórico y Plantillas; Por presidente, Ranking y Meses de mandato: 7b, 2026-11-10)
- ~~Texto explicativo sugerido automáticamente (ej. "viene mejorando un x%"), que se puede ocultar o reemplazar por uno propio.~~ ✅ 2026-11-10 (contexto automático neutro + comentario propio aparte; el texto automático no se edita, decisión D-012)
- ~~Todo lo descargable (imagen, video) lleva **marca de agua** de la página.~~ ✅ 2026-11-10 (imagen; el video queda para 7c)

## Responder y verificar afirmaciones en redes (2026-11-08)
- ~~**Imagen lista para pegar en la respuesta** (la gente no entra a los links): se genera sola, con los datos, marca de agua y el link. Formato a elegir (cuadrado 1:1, vertical 4:5, horizontal 16:9).~~ ✅ 2026-11-10 (desde Histórico y Plantillas; y desde Por presidente, Ranking y Meses de mandato, 7b)

## ~~Ajustes pedidos al recorrer la página, tanda 9 (2026-11-15)~~ ✅ 2026-11-15 (Contexto internacional, aparte: docs/specs/remodelacion-contexto-precios.md)
- Contexto, segunda vuelta (2026-11-15): barras como gráfico (nombre a la izquierda, eje abajo) por país, por rubro y por presidente, enlazadas; "¿Cómo viene?" con filtros propios que siguen a los de arriba; subpestañas con íconos. → spec: docs/specs/remodelacion-contexto-precios.md (Segunda vuelta)
- Contexto, cuarta vuelta (2026-11-15): "Por rubro" con su propio deslizador (~8 filas) para no perder de vista los otros dos gráficos (también en el celular); "Otros países (solo medido)" abierto por defecto. (Hecha en local, sin commit; ver docs/ESTADO.md.)
- Contexto, pendientes (2026-11-15) — (1) y (3) hechos en local el mismo día (promedio y cierre por presidente; sin filtro = consumo total contra el mundo): (1) Por presidente muestra el **promedio** del mandato en los meses en que hay dato de los dos (la zona euro llega a dic-25), y el rótulo dice "dic-23 a nov-26": decir los meses reales del promedio y sumar el valor al cierre para que no parezca contradecir al gráfico de líneas. (2) A veces, al filtrar desde las barras con la pantalla entre las barras y "¿Cómo viene?", la página sube arriba de todo: no reproducido; se sacó un "Cargando" que podía achicar la página, sin confirmar que fuera eso. (3) "Sin filtro" = consumo total ("Todos los rubros", ya existe como rubro) contra el mundo: cambia lo que muestra `/contexto/` sin parámetros (hoy carne contra la zona euro); decidir con el usuario.
- ~~**Zona euro cortada en precios contra el mundo**~~ ✅ 2026-11-15 → spec: docs/specs/chips-compactos.md. No era la unidad: Eurostat congeló `prc_hicp_midx` en dic-2025 y sigue en `prc_hicp_minr` (ECOICOP 2); se empalman (08, 09 y 12 quedan en dic-25 porque cambian de contenido).
- ~~**EE.UU. y Chile cortados por rubro en precios contra el mundo** (2026-11-15): la OCDE dejó de publicar sus divisiones del IPC (EE.UU. desde ene-25, Chile desde ene-24; solo siguen total y alimentos), en las dos clasificaciones. Fuentes candidatas: EE.UU., BLS (IPC por grupo, API pública); Chile, INE (base 2023, COICOP 2018).~~ ✅ 2026-11-15 → spec: docs/specs/precios-mundo-bls-ine.md. ~~Pedido el mismo día: «si filtro carne contra estados unidos no aparece milei»~~ ✅ 2026-11-15 (productos de EE.UU. desde el BLS y aviso del presidente sin dato). Queda: México corta 08, 09 y 12 en jul-24 y Chile 08 y 09 en dic-23 por cambio de contenido.
- ~~**Chips compactos en todo el sitio** (pedido 2026-11-15: «lo de los chips chicos está bueno también para toda la página»): llevar el estilo de `ctxr-pildora`/`ctxr-ajustes` (32 px a la vista, 44 px de toque, borde fino, fondo de superficie) a `vistabar-ajustes`, píldoras y `FilaChips` de Presidentes, Ranking, Elecciones, Herencia, Histórico y fichas; un solo componente/clase en `globals.css`.~~ ✅ 2026-11-15 → spec: docs/specs/chips-compactos.md (regla R24, `.chip-c`).
- Pendiente de la remodelación de Contexto (sin pedir todavía): imagen al compartir en "La Argentina y otros países", "Lo esperado" y "Viento" (hoy comparten link y texto).
→ spec: docs/specs/ajustes-tanda-9.md
- Ficha y Histórico: a la derecha de la línea divisoria de las variaciones queda mucho vacío; el Compartir del Histórico pisa esa línea; "Más comparaciones" mal ubicado.
- Compartir con tarjetas: las píldoras "Datos de cada presidente" pegadas al borde.
- Ficha de inflación desde la portada: solo la mensual; dar la opción de verla de otras formas (interanual, índice) como en el Histórico.
- Placa del dólar blue: debajo de la cifra no dice nada (por ejemplo "el más bajo desde…").
- Precios, Todos los datos: la inflación de EEUU (CPI-U) aparece como índice entre los indicadores de la Argentina; sacarla o mostrarla en variación interanual. Rubros del IPC en interanual sin "¿Cómo fue octubre en otros años?".
- Mes a mes desde que asumió: la imagen respeta el presidente resaltado (o pregunta cuáles resaltar); la animación se dibuja de corrido, como con lápiz, sin saltos de mes en mes.
- ¿Cómo fue <mes> en otros años?: la frase "el más bajo desde 2023" contradice "el 3.º más alto". Gráficos que cruzan el cero: línea del cero de color, con opción para sacarla.
- Banco Central: "Elegir fechas" sin aire entre los campos; al cerrar el gráfico, volver a la fila que se abrió; en el gráfico, inicio del período y variación contra el último además de más alto y más bajo; ícono del Banco Central en "En vivo".
- Todas las secciones: otro diseño para las cajas.
- Cambiar dato: el botón ← y el Recomendado pegado a la explicación.
- Todos los presidentes, de un vistazo: mapa de calor por defecto, con opción para sacarlo, y que vaya a la imagen.
- Una variable, todos los presidentes: tres botones que hacen lo mismo y dos Ajustes; lo mismo en Herencia y otros menús.
- Un presidente, todas las variables: muchos botones y filtros antes de la tabla; "Contexto del mandato" sin el relleno bien.
- Recibido y entregado: filas muy altas sin necesidad; la imagen pisa las variables con su explicación.
- Lo que se arma a gusto (Ranking y demás): al compartir, "Armá el tuyo". En Ranking no se pueden volver a sacar los filtros de grupos.
- Elecciones sin Compartir.
- Menú Más con un ícono por sección.
- ~~Contexto internacional → spec: docs/specs/remodelacion-contexto-precios.md: precios contra el mundo más claro (más caro / más barato debajo de la variación), filtro de año o promedio de cada presidencia, imagen al compartir, barras con los países en el eje vertical verdes o rojas, sin el renglón "Argentina 95,0 · Bolivia 76,6 (mundo = 100)", comparar países contra la Argentina y países entre sí; sacar el "Con un salario mediano se compran…" de esa parte; los links "Ver la evolución de este rubro" parecen llevar a otra página y cortan la navegación (que sea limpia como la ficha); en "Precios en el mundo" algunos países solo con puntos y leyendas redundantes (color = país; línea = estimado, punto = medido).~~ ✅ 2026-11-15 (implementada en local; ver la spec)
- Regla: cada pedido vale para todo el sitio (barrido).

## ~~Ajustes pedidos al recorrer la página, tanda 8 (2026-11-14)~~ ✅ 2026-11-15
→ spec: docs/specs/ajustes-tanda-8.md
- Placas de la portada con variaciones, fecha y fuente a la misma altura entre placas; "¿Qué datos te interesan?" con la cifra alineada aunque lleve unidad, e íconos por tema; "Todas las secciones" menos aburrida (mosaico con íconos y explicación).
- Ícono del sitio nuevo (con propuestas).
- Buscador de variables: ⓘ que se sigue viendo mal; explicaciones de categoría ("Sobre Salarios") apretadas en columnas.
- La cruz de las ventanas tapa la barra de desplazamiento al pasar el mouse.
- Menú de arriba en la computadora con otro formato y otras opciones que el de abajo en el celular.
- Configuración: píldoras dentro de una píldora grande que se rompe al bajar de renglón; varias píldoras elegidas juntas se ven feas (rediseñar las de elección múltiple).
- Buscar: fondo transparente y la caja de búsqueda tapada por el título.
- Mes a mes desde que asumió: dibujarse más despacio, mes por mes, con repetir y velocidad.
- Parte del Banco Central: rótulos principales muy cargados; el resumen de ruedas abajo del gráfico; elegir una fecha además de 1 mes, 3 meses…
- Histórico: "Gráficos listos" con un link a la misma página no hace nada; "Expandir" como ícono en el gráfico; sin filtro de fecha en Ajustes (ya está en la píldora del período).
- Compartir: sacar el grande amarillo de la ficha; todos en el mismo lugar (y probar amarillo para encontrarlo).
- ¿Cómo fue <mes> en otros años?: rótulo de la barra elegida arriba con línea de puntos; los fijos (último, extremos) también arriba con línea de su color.
- Una variable, todos los presidentes: marcar en la tabla a quien se le cuenta distinto el inicio (inicio de mandato vs inicio de datos).
- Un presidente, todas las variables: minigráfico, estrella para agregar o sacar de Mis variables, y en los grupos plegados cuántas mejoraron y empeoraron.
- Meses de mandato: resaltar un presidente; por defecto dólar blue, pesos corrientes, mismo punto de partida, Milei; Resumen por hitos con gráfico o tabla con colores.
- Herencia: déficit fiscal del año cerrado; resultado fiscal + cuasifiscal; deuda neta consolidada (Tesoro + Banco Central) si se puede; en el celular el cambio al lado del Hoy y variables más grandes.
- Ranking y Elecciones: solo "Ajustes" se toca (los demás como texto), "Filtrar grupos" y "Elegir variable" como botones; etiquetas de la dispersión que no tapen puntos; correlación con el nombre solo.
- Contexto: precios contra el mundo como barras directas (sin la pregunta) y selector más lindo.
- Deuda neta consolidada (Tesoro + Banco Central), para la herencia y el Histórico: no está en el catálogo. Método a investigar (estimación propia, como las reservas netas, D-021): deuda bruta de la Administración Central − tenencias intra sector público (Banco Central, FGS, Banco Nación) + pasivos del Banco Central con privados (pasivos remunerados, deuda externa propia) − activos externos del Banco Central, todo en dólares. Fuentes: informe trimestral de deuda de la Secretaría de Finanzas (tenedores) y balance semanal del Banco Central. Antes: agente `investigador-datos` para confirmar series y frecuencia.
- Fase siguiente: control de cada variable del Histórico (que no ofrezca opciones sin sentido, como inflación ajustada por inflación, y que se vea bien).
- Regla: cada pedido vale para todo el sitio (barrido).

## ~~Ajustes pedidos al recorrer la portada y sus atajos (2026-11-14)~~ ✅ 2026-11-14
→ spec: docs/specs/ajustes-tanda-7.md
- Botones y selectores sin caja de borde fino en todo el sitio (elegida: píldora rellena).
- Placas de la portada: cifra del mismo tamaño (salario abreviado "1,94 M"), subió/bajó como píldora con flecha y animación (no el cuadradito con triángulo); tocar la placa lleva a la ficha, no al Histórico.
- Selector de variables: ⓘ roto, X gigante en la información, tabla de información apretada; "ver más" al final del texto; recomendado tocable; flecha para volver; resultados de búsqueda sin la ruta; carpetas y variables mezcladas.
- Histórico: "Más comparaciones" con animación y diferencia absoluta; hoja de Ajustes desprolija ("Mostrar" desparejo, "Guardar y compartir", "Listo" con franja oscura); "Cambiar" junto a las variaciones → "Cómo verlo" (medida) y "Cambiar dato" arriba, fuera de Ajustes; fila de variable que se sale.
- Configurar variable: "Mensual" → "Var. mensual"; media móvil del valor; estética.
- Gráficos: eje Y negativo estirado; dibujo continuo al aparecer; líneas suavizadas; leyenda que resalta un presidente; "Abrir completo" deja el título fuera de pantalla.
- Compartir: hover desprolijo; Compartir principal pegado a las variaciones; capítulo de meses sin imagen y sin deslizador de años.
- Tabla por presidente: "Listo" feo; con tasas, principal Variación (no Promedio) y promedios antes de asumir y al final; barra sin dato en la computadora.
- Temas: "Todos los datos" arriba en pestañas (Principales / Todos los datos), Principales de precios con núcleo, regulados, bienes y servicios; sin "Ver también".
- Banco Central: "Cómo se mide" sin caja; la variable se despliega debajo de su fila sin mover la página; "la mayor compra desde"; resumen de ruedas del período.
- Preguntale: minigráfico con marcadores, globo y fechas; "Con cada presidente" filtra el período; listas resumidas en "En dólares" y "Qué subió más"; base 100 con atajos "Desde"; orden de chips.
- Todas las secciones sin columnas vacías en la computadora; ventana Configurar con la estética nueva.
- Regla: cada pedido vale para todo el sitio (barrido).

## Bugs conocidos
- ~~Histórico: el filtro de fecha queda flotando y se superpone con el resto~~ (arreglado en la migración; ahora se pide que quede fijo arriba sin tapar nada, ver "Histórico: celular y gráficos").

## ~~Diseño visual y animación (2026-11-09)~~ ✅ 2026-11-10
→ spec: docs/specs/diseno-visual.md (bloque 5e). Implementado; resumen en "Hecho".
Dirección: **animaciones ligadas al scroll + scrollytelling + motion design**. Sobre todo en la portada, pero coherente con toda la app. Tipografías modernas y lindas. Libertad de diseño; los textos de abajo son ejemplos.
- **Portada contada al bajar**:
  1. Arranca con un mensaje fuerte. Ej.: "¿Cansado de ver comentarios en redes de gente que habla sin saber? *Primero los Datos* tiene la solución. Buscá el dato que te interesa y compará a lo largo del tiempo, con otros presidentes y con el contexto internacional."
  2. Al bajar, **los datos más buscados** como tarjetas con diseño más atractivo, que se mueven de a poco de izquierda a derecha; el usuario puede volver a una anterior.
  3. Más abajo, "¿Qué datos te interesan?" (los temas).
  4. Después "Preguntale a los datos" y las **plantillas destacadas**.
  5. Remarcar que **todo tiene fuente**.
- **Links de la portada** (¿Qué querés ver?): hoy se ven simples, azules y subrayados, y queda feo. Pasarlos a botones o tarjetas.
- **Volver atrás**: al tocar un dato en la portada se llega al Histórico, y falta una flecha "Volver" intuitiva.
- **Colores de lo bueno y lo malo**: en tema claro, que el verde más fuerte sea lo mejor y el rojo más fuerte lo peor (hoy el claro/oscuro confunde). En tema oscuro puede no tener solución limpia; si es así, dejarlo como está.
- **Renglones de más**: hay textos que se parten en dos líneas cuando entran en una (ej. la barra de arriba: Precios, Salarios, Dólar, Reservas). Revisar si es a propósito.
- **Tarjetas de resumen del Histórico** (último dato, promedio, mediana…): en una sola fila; si no entran, se deslizan de costado, y pueden moverse lento por sí solas.

## Ajustes de interfaz pedidos (2026-11-09)
→ spec 5c (Histórico, "Mis variables" y presidentes en la línea de tiempo): docs/specs/ajustes-historico.md
→ spec 5d (Presidentes, Ranking, Mandato y Elecciones): docs/specs/ajustes-presidentes.md
**Histórico**
- Con un solo gráfico, la barra de período y mes/año **ya no hace falta que quede fija** arriba (dejarla fija solo si hay varios).
- Botón **"Configurar variable"** que abre una ventana (pop-up) para elegir medida, pesos/dólares, etc. Lo mismo para la segunda variable. Ahorra mucho lugar en pantalla. Con **Aceptar**, la variable queda como texto limpio (sin todos los botones a la vista). Ahí también va el nombre de "mis variables".
- En esa ventana, separar más "reales / corrientes" de "pesos / dólares / variaciones": hoy se ve todo muy junto y parece lo mismo.
- **Leyenda del gráfico**: sacar las líneas de último, promedio y mediana. Mejor que al pasar el cursor sobre la línea se **resalte** y diga qué es (promedio, mediana…) y su valor.
- **Zoom**: al acercar una zona, la escala vertical se ajusta a esa sección y las líneas (promedio, etc.) se recalculan solo con lo visible. Al tocar "Volver", la escala queda rara y hay que hacer doble clic; que vuelva bien a la primera.
- **Precios (ej. carne)**: hoy "que suba es malo"; matizarlo, porque depende del poder de compra. Analizar también en términos de salario.
- ~~Promedio o cierre al pasar de mes a trimestre o año~~ ✅ ya estaba: botones "Promedio / Cierre" en la barra de período (revisado 2026-11-09).

**Presidentes y Ranking**
- Sumar la **variación absoluta** además del porcentaje (hoy Ranking compara solo el aumento porcentual).
- En Ranking, poder **abrir el detalle de dos presidentes a la vez** (ej. filtrar el grupo Salarios y ver Cristina y Milei desplegados juntos). Hoy abrir uno cierra el otro.
- Mover "lo mejor y lo peor de cada gobierno" de Curiosidades a **Ranking** (o a Presidentes). No es una curiosidad.
- ~~Curiosidades: sacar los datos curiosos armados a mano (ya están en Plantillas) y pasar el "ranking de presidentes" que quedó ahí a la sección Ranking.~~ ✅ ya estaba hecho (revisado 2026-11-09: Curiosidades tiene el aviso y los links viejos redirigen).

**Meses de mandato**
- "Precio teórico" y "partiendo del mes 0 de mi ley" se leen como cosas sueltas: integrar mejor que lo segundo depende de haber elegido lo primero.
- Mantener separado "presidentes y opciones" (está bien, pero que no se mezcle).
- **Animación**: que la escala del gráfico acompañe. Ej. con dólar blue, el máximo es 20.000, pero al principio los valores son ~1.200, así que no tiene sentido arrancar con una escala de 20.000. La escala crece a medida que cambian los valores.

**Elecciones (voto estimado)**
- En los gráficos de dispersión, **pintar aparte el valor actual** (último dato) para ver dónde caería hoy según esa recta.
- Hoy el cálculo usa solo las variables con relación fuerte (|r| ≥ 0,6, al menos 3 variables y 8 elecciones; el valor absoluto ya incluye las relaciones inversas). Ese 0,6 es un corte arbitrario. Opciones pedidas: poder **elegir el corte de r**, y una **proyección ponderada con todas las variables**, donde pesen más las de mayor coeficiente (ej. el empleo público pesa más que el precio del pan). Mostrar las dos proyecciones.

**Presidentes en la línea de tiempo**
- En la mayoría de los gráficos, una opción para **pintar el período de cada presidente** como un área de color (o marcarlo). Por defecto con los colores de cada partido (Macri amarillo, Cristina celeste, Milei violeta), y que los colores se puedan cambiar desde la **configuración global**.

## ~~Ajustes pedidos al recorrer la página (2026-11-10)~~ ✅ 2026-11-10
→ spec A (Histórico y gráfico): docs/specs/ajustes-grafico.md · → spec B (imagen): docs/specs/personalizar-imagen.md · → spec C (tablas, presidentes y temas): docs/specs/ajustes-tablas.md
Criterio general pedido: lo que se pide para una pantalla vale para toda la página.
1. Gráfico: al pasar por una línea de último, promedio o mediana, mostrar solo ese dato (hoy el de la serie lo tapa). → A
2. Imagen compartible: elegir marcadores y líneas (último, promedio, mediana); nombres de presidentes del mismo tamaño (abreviar "Néstor K.", "Alberto F."); compartir solo un rango de fechas, con tarjetas solo de esos presidentes; elegir qué datos van en las tarjetas (recibido, entregado, variación, promedio, mediana…) y que se entienda qué es cada uno; presidentes resaltados sin tarjetas, o tarjetas generales con o sin presidentes. → B
3. Página de tema en PC: mucho espacio vacío a la derecha del título y la bajada. → C
4. Zoom: al seleccionar un área, la escala no siempre se ajusta. → A
5. "Todos los datos" de inflación ofrece el índice y además la mensual y la interanual: dejar una sola forma (lo más fácil, las variaciones ya calculadas). → C
6. Celular: gráficos de muchos años ilegibles; zoom con deslizadores en el eje X y poder mover el gráfico; sin marcadores cuando está muy apretado. → A
7. Tabla por presidente de las páginas de tema: el mandato debajo del nombre, no en otra columna (también en PC). → C
8. Celular: compartir manda la imagen y el link. ✅ probado por el usuario (2026-11-10).
9. Celular: en Personalizar, Mes/Trimestre/Año se sale de la ventana. Mostrar siempre la temporalidad y cómo se agregan los datos (al ver y al compartir). → A y B
10. Personalizar: tres botones (Filtrar fecha, Elegir variable, Opciones del gráfico); en Opciones van Mes/Trimestre/Año, cómo se agregan, Gráfico/Tabla y lo de hoy; nada se sale de la pantalla. → A
11. Tarjetas de resumen del Histórico: no se sabe contra qué es la variación; fijar el último y pasar inicio, promedio, mediana, mínimo, etc. con la variación contra el último, aclarado arriba. → A
12. Por presidente: mandato debajo del nombre; variación en $ más chica y debajo del %; abreviar nombres; períodos no más anchos que el nombre; mejor/peor por color es confuso en fondo oscuro (un rojo oscuro alarma más que uno claro): buscar otra técnica; primera columna fija al desplazarse. → C
13. Celular: el desplegable del inicio de mandato en la configuración global es el nativo de Android. → C
14. "Inicio: T-1" poco claro: oración dinámica ("Mes inicial de cada presidente: T-1, excepto Milei (T+1)") y aclarar que T = mes de asunción. → C (y B para la imagen)
15. Por presidente: la explicación del inicio y el contexto del mandato, contraídos o como ícono de información. → C
16. Un presidente, todas las variables: mucha configuración arriba; unidad debajo de la variable, columna fija, nombres con puntos suspensivos o en varias líneas. → C
17. Gobierno y Congreso: no se ven los datos (vetos). → C (faltan cargar totales y bancas; que se entienda qué hay y qué falta)
18. Es raro que Congreso sea la misma página que Por presidente. → C

## ~~Simplificación (auditoría 2026-11-10, etapa 3)~~ ✅ 2026-11-11
→ spec: docs/specs/simplificacion.md (bloque 5h)
Decisiones del usuario (2026-11-11): los nombres públicos los propone Claude y el usuario corrige; Elecciones queda en el menú con un aviso visible; el puntaje del Ranking se relega (plegado, debajo de la comparación por indicador); los precios por región pasan a ser un filtro.
- Nombres que entienda cualquiera ("Salario mediano" en lugar de "Salario SIPA mediana").
- Inflación como una sola entrada, con mensual, interanual y promedio.
- Región como filtro del dato, no como cientos de series en el selector.
- "Plantillas" pasa a "Gráficos listos", con filtros por tema.
- Detalles de lectura que marcó la revisión con agentes: rótulos U/P/M, colores de presidentes parecidos, notas al pie dentro del área deslizable, vista previa chica de la imagen.

## ~~Ajustes pedidos al recorrer la página, tanda 3 (2026-11-11)~~ ✅ 2026-11-11
→ spec: docs/specs/ajustes-tanda-3.md (bloque 5i). Pendiente aparte: el parte diario del BCRA como bloque propio (compra de divisas del día, tipo de cambio minorista), que necesita datos diarios.
**Datos al día (prioridad)**
1. La inflación quedó en ago-26 y ya salió septiembre (antes del 2026-11-10 el sitio mostraba sep-26: revisar qué fuente del IPC manda en la corrida de GitHub). Capturar los datos a la hora en que se publican: IPC de INDEC (segunda semana del mes, 16 h) y el parte diario del BCRA (16:45 a 17 h: reservas, compra de divisas, tipo de cambio minorista, TAMAR, BADLAR). Sirve para comentar y difundir el sitio en ese momento.
**Portada y temas**
2. En "Los datos más buscados", actividad económica en lugar de kilos de asado (definir si son fijas o las más vistas).
3. La placa del dólar blue tiene otro formato ("-13,3 % contra hace un año" resaltado); en la de inflación la fecha a veces se parte ("AGO" / "26").
4. Página de tema: la cabecera se ve mal (tarjeta del dato principal suelta a la derecha y una sola tarjeta en "Principales"). Rediseñar.
5. Tema de precios: "IPC nivel general (Nacional)" repite la inflación; llevar Bienes, Servicios, Estacional, Núcleo y Regulados a "Indicadores de inflación"; renombrar "IPC INDEC" a "IPC por rubros"; ordenar bien los rubros (hoy 01, 04, 06, 07, 02, 03) y los precios promedio.
7. En el tema, la tabla por presidente con las demás variables principales (elegibles o rotando sola).
**Histórico y gráfico**
6. Las tarjetas "Último dato" + "Comparado con el último dato" quedan feas (peor en celular): rediseñar.
11. En Personalizar, un botón para volver a lo de fábrica (limpiar filtros).
12. "Regulados" debería encontrarse como servicios públicos. En índices del IPC es redundante "Precio relativo (contra la inflación general)" junto a "Nominal / Real": dejar una sola forma (probable: nominal y real, con mensual, interanual, etc.).
13. Con la vista en Tabla, Compartir comparte el gráfico: preguntar (copiar tabla o pasar a gráfico). Ícono para copiar la tabla, con la URL del sitio como última fila. En Opciones del gráfico, "Líneas" y "Marcadores" quedan en el mismo renglón.
**Nombres**
8. "Soja: Rosario contra Chicago (dólar X)" → que diga "Brecha".
**Imagen compartible**
9. Poder elegir cuál de las frases automáticas va en la imagen (contra el promedio, el inicio, el récord, hace un año…).
**Preguntale a los datos**
10. Elegir producto más directo: todos los ítems desplegados con separadores (canastas, precios promedio por categoría, dólares). El desplegable del salario se va de pantalla al deslizar. "¿Cómo le fue a el riesgo país?" → "al". Esa oración debería mostrar también un gráfico del mandato, no solo la tabla. "¿Cuánto vale… en dólares blue?" → "¿Cómo evolucionó…?".
**Presidentes**
14. Tabla Por presidente: no se entiende cómo se llena la barra. Opciones: eje en cero cuando hay negativos; o de izquierda a derecha con el mejor lleno y el peor vacío; degradado rojo-amarillo-verde entre presidentes. Sumar una vista tipo vela japonesa acostada (inicio, cierre, mínimo, máximo).
15. "Un presidente, todas las variables": "Contraer todas" fuera de Personalizar y todo contraído al entrar; filtro por tipo de variable y buscador a la vista; Personalizar solo para columnas y moneda. "Mis variables" con el mismo formato que "Todas" y modo edición aparte (subir, bajar, editar, quitar; Guardar). Con un solo presidente, decir el mes exacto de inicio y de cierre en lugar de la oración general.
16. Ranking: "Puntaje combinado" desplegado, pero abajo.
17. Meses de mandato: configuración en botones (variable; cómo mostrar: variación %, precio teórico, valor; presidentes), sin "índice base 100" (igual a variación %); explicar que el precio teórico es la misma variación valorizada. **Error**: Milei muestra el mes 0 en 366,4 aunque tenga T+1. **Error**: después de animar hasta el final, achicar "Hasta" tira "Algo falló al mostrar esta página". La imagen tiene demasiado texto; opción de mostrar el último dato a ese mes de mandato.
18. Elecciones: explicaciones plegadas o con ícono de información. En los gráficos de dispersión falta a veces el dato actual (rombo) y su valor marcado en el eje Y.
19. Contexto: faltan botones de compartir; falta un gráfico de líneas con los precios por producto de Argentina contra otros países.

## ~~Ajustes pedidos al recorrer la página, tanda 4 (2026-11-11)~~ ✅ 2026-11-11
→ spec: docs/specs/ajustes-tanda-4.md (bloque 5j). Además de estos casos, se buscaron errores parecidos en todo el sitio (scripts en `web/scripts/`).
- Resumen del Histórico: la variación no cierra con los valores que se ven (último 1,9 y mediana 2,1 → dice 0,1).
- El botón "Volver" del zoom tapa el último punto cuando queda arriba a la derecha.
- Histórico: por defecto solo las líneas de último y promedio; franjas de presidentes más a la vista (botón debajo del gráfico, junto a Personalizar; Compartir abajo); que el arranque no sea el asado.
- Preguntas: el separador ("CANASTAS") queda fijo y tapa los ítems; falta una cruz; el Atrás del celular cierra la página en lugar de la ventana (pasa en muchos menús); en PC "Ver la tabla por presidente" desalinea los botones "Ver".
- Portada en celular: la tarjeta de "Los datos más buscados" se corre apenas entrás; sacar el pie genérico de fuentes (ya está "Todo tiene fuente").
- Por presidente: compartir también el gráfico de velas; en celular hay textos que se salen del menú (la recomendación al entrar a Salarios en el selector).
- Tabla por presidente de los temas: las variables en un solo renglón deslizable, con nombres largos en dos líneas.

## ~~Ajustes pedidos al recorrer la página, tanda 5 (2026-11-12)~~ ✅ 2026-11-12
→ spec: docs/specs/ajustes-tanda-5.md (bloque 5k). Se resolvió con la "ficha del dato" (D-017) en lugar del cartel que pregunta a dónde ir.
- Preguntale a los datos: "Ver la tabla por presidente" queda feo; sacarlo o que "Ver" ya muestre esa tabla resumida.
- ¿Qué datos te interesan? (temas): en Por presidente hay nombres que no entran en dos líneas ("Salario mediano real (trabajadores registrados)"). "Ver todos los indicadores por presidente" queda pegado a la tabla.
- Al tocar un dato de "Todos los datos": preguntar a dónde ir (Histórico, Por presidente, Meses de mandato). O mejor (preferida por el usuario): potenciar la sección trayendo Histórico, Por presidente y Meses de mandato, y que tocar cualquier variable (principal o de "Todos los datos") la aplique a los tres. Lo mismo para "Preguntale a los datos". Con Compartir y personalización. En ese caso, ver si la tabla por presidente resumida de hoy sobra.
- Menú de Presidentes: Por presidente, Meses de mandato, Ranking, Elecciones, Congreso.
- Debajo de "Preguntale a los datos": explicar y promocionar las otras secciones, con su link (para quien quiere buscar o mezclar variables).
- Los datos más buscados: sumar el mes anterior y el año pasado con sus variaciones ("datos novedosos": ver enseguida si el dato nuevo fue bueno o malo).
- Histórico, cabecera del dato: a la derecha, en el mismo estilo, las comparaciones del resumen (inicio, promedio, mediana, máximo, mínimo) más mes anterior y año anterior, tipo carrusel; en celular revisar o sacar la frase del récord.
- Histórico: Personalizar y esos botones como ventana, con el fondo oscuro o borroso.
- En celular, al abrir "agregar una variable" se abre el teclado enseguida.
- Un presidente, todas las variables: en "IPC por rubros" (índices) la moneda no cambia nada.

## ~~Semáforo de actividad (2026-11-12)~~ ✅ 2026-11-12
→ spec: docs/specs/semaforo-actividad.md. Hecho con interanual por defecto; el mes contra mes sin estacionalidad de los ejemplos quedó solo para las series con ajuste oficial (la estimación propia dio demasiado error). Pendiente como idea: sumar un ajuste estacional serio (X-13 con corrección de calendario) y los indicadores sin fuente legible (CAME, patentamientos, Construya, escrituras, leche, petróleo).
Idea del usuario, con cuatro ejemplos de consultoras (Max Capital, Econviews, una "tabla semáforo s.e." y 1816).
- Una tabla con los indicadores de actividad de alta frecuencia en filas (EMAE, industria, autos, hierro y acero, petróleo y gas, construcción, cemento, Construya, molienda de soja, faena, pesca, ventas minoristas, patentamientos de autos y motos, energía eléctrica, escrituras, IVA, crédito al sector privado, exportaciones e importaciones, comercio con Brasil, confianza del consumidor, empleo) y los últimos meses en columnas, con la variación mensual desestacionalizada pintada de verde o rojo.
- Abajo, un **índice de difusión**: qué porcentaje de los indicadores subió ese mes.
- Variantes vistas: columnas mes contra mes, trimestre contra trimestre y último dato contra el trimestre previo con un círculo de color (Econviews); agrupado por sector (actividad y empleo, consumo, comercio exterior, industria, construcción, agro, inmobiliario); una tabla interanual en términos reales y otra mensual desestacionalizada, separando indicadores "tempranos" de los "principales con demora" (1816).
- A resolver: (1) faltan muchas fuentes (ADEFA, Cámara del Acero, AFCP, Construya, CAME, patentamientos, CAMMESA, escrituras, Secretaría de Energía, agro): usar el agente `investigador-datos`; (2) la desestacionalización es propia en los ejemplos: decidir si se usa la serie oficial sin estacionalidad donde existe y la interanual donde no, o si se desestacionaliza en el pipeline; (3) cada fila con su fecha (publican con distinta demora, como el parte del BCRA).

## Gasto e impuestos de las provincias y la Nación (2026-11-12)
- ~~Gasto de la Nación por partida presupuestaria~~ ✅ 2026-11-12; gasto de las provincias por partida: pendiente.
- ~~Qué provincias cobran más impuestos (por ejemplo Ingresos Brutos)~~ ✅ 2026-11-13 (`/provincias/?vista=cuentas`: recaudación propia por habitante y por impuesto, fase 2, y alícuotas teóricas de Ingresos Brutos, fase 3); contemplando exenciones: pendiente, no hay base oficial.

## Correcciones pedidas (2026-11-09)
→ spec: docs/specs/correcciones-historico.md
Son ajustes a lo ya hecho, no ideas nuevas.
- ~~**"Otros gráficos interesantes" del Histórico** (soja, Chicago, brecha, dólar): los datos ya están en el catálogo, así que ya no tiene sentido tenerlos como gráficos sueltos. Pasarlos a **variables elegibles** como cualquier otra (queda la plantilla si hace falta una vista armada) y sacar la sección.~~ ✅ 2026-11-09
- ~~**Hasta 4 gráficos en la vista, uno al lado del otro**, para comparar 4 cosas al mismo tiempo (en celular, apilados). Verificar cómo quedó con lo ya implementado.~~ ✅ 2026-11-09

## ~~Portada: ajustes pedidos (2026-11-14)~~ ✅ 2026-11-14
- En la computadora, "Ir directo a" deja a veces un chip solo abajo (Riesgo país): que entren todos juntos. → spec: docs/specs/remodelacion-historico-presidentes.md
- Al escribir en el buscador, muchas opciones empujan toda la página para abajo: que la lista quede por encima, sin empujar. → spec: docs/specs/remodelacion-historico-presidentes.md

## ~~Cierre de la remodelación: crítica final (2026-11-14)~~ ✅ 2026-11-14
→ spec: docs/specs/remodelacion-cierre.md
Crítica final de Impeccable: 26/40 (antes 21/40). El usuario eligió arreglar los P1, los P2 y los menores.
- La fuente del dato a la vista en la ficha.
- Sin contador animado en las cifras de dato (mostraba cifras intermedias).
- Provincias: la aclaración de la Ciudad de Buenos Aires (sedes, sin coparticipación) a la vista.
- La imagen compartida con la misma frase que la cabecera; un Compartir principal junto a la cifra.
- Velas y Sumar columnas a la hoja de Ajustes; "T-1" en palabras.
- Menores: objetivos de 44 px, leyenda del Semáforo, unidades del Banco Central, eje de Gasto, chip de período del Histórico, palabras sueltas, Tema arriba en la configuración, ⓘ con nombre.

## Sugerencias de Claude (a discutir)
- ~~Página propia por indicador con URL fija (`/dato/salario-real`): sirve para SEO y para que lo compartido tenga una vista previa linda en redes. Encaja con las "páginas de tema".~~ ✅ 2026-11-12 → spec: docs/specs/vista-previa-links.md

## Hecho
(Ideas implementadas y verificadas; se tachan acá con su fecha. Ver CLAUDE.md.)

### En qué gasta la Nación y las universidades (bloque 12, implementado, spec gasto-nacion)
- ~~Gasto de la Nación por partida, organismo, tipo de gasto y provincia, año por año (`/gasto/`).~~ ✅ 2026-11-12
- ~~Cómo viene el año en curso, mes a mes, contra el año anterior (`/gasto/?vista=mes`).~~ ✅ 2026-11-13
- ~~Presupuesto de cada entidad pública, por ejemplo las universidades, y si lo tienen sin rendir (`/universidades/`): transferencias por universidad 2018-2026, por estudiante en 2023 y 2024, y lo que dicen los documentos oficiales sobre el control (no hay lista pública de quién rindió).~~ ✅ 2026-11-13 (sin dato: en qué gasta cada universidad, porque lo que declaran no cierra con lo transferido; empresas públicas)

### Herencia: recibido contra entregado (bloque 11, implementado, spec herencia)
- ~~Sección dentro de Presidentes que compare lo que cada presidente recibió con lo que entregó: series oficiales (fase 1), datos de informes con su cita (fase 2), reservas netas del FMI y estimación propia, cobertura de tarifas, puts, importaciones pendientes y precios acordados (fase 3).~~ ✅ 2026-11-12 (sin dato: dividendos retenidos; cepo de 2003 y 2007)
  Pedido original:
  - ~~Idea del usuario: una sección dentro de Presidentes que compare lo que cada presidente recibió con lo que entregó, con los datos de los que los presidentes se suelen quejar. Sin spec; no implementar sin que se pida.~~
  - ~~Lista pedida: deuda con importadores, SIRA, déficit fiscal y cuasifiscal, brecha cambiaria, reservas netas negativas, precios congelados, tarifas atrasadas, Leliq y pases (pasivos remunerados), puts de los bancos, dividendos retenidos, acuerdo con el FMI incumplido.~~
  - ~~Lo que ya hay en el sitio: resultado fiscal, cuasifiscal y pasivos remunerados (BCRA), brecha, reservas brutas. Es el mismo cálculo que "Por presidente" (valor al inicio y al cierre del mandato) con otro armado.~~
  - ~~Lo que falta y es difícil: reservas netas (no hay serie oficial; depende de la metodología), deuda comercial con importadores y SIRA, puts, dividendos retenidos (estimaciones de informes, no series), tarifas y precios atrasados (hay que definir cómo se mide el atraso), cumplimiento del acuerdo con el FMI (es un hecho, no una serie). Varios habría que cargarlos a mano con su fuente, como los datos de Congreso, y decir cuáles son estimaciones.~~
  - ~~Cuidado con D-012: mostrar recibido y entregado con su fuente, sin calificar la herencia.~~

### Responder con una imagen (bloque 7a, implementado, spec responder-con-imagen)
- ~~Imagen para compartir (1:1, 4:5, 16:9) con el dato, su contexto automático, el gráfico, la fuente y la marca; "Comparar presidentes"; comentario propio; vista simple del Histórico.~~ ✅ 2026-11-10 (las ideas "Compartir gráficos" y "Responder y verificar afirmaciones" siguen abiertas en lo que toca a 7b y 7c)

### Imagen desde las secciones de presidentes (bloque 7b, implementado, spec imagen-presidentes)
- ~~Compartir con imagen desde Por presidente (una variable entre presidentes y un presidente con varias variables), Meses de mandato y Ranking.~~ ✅ 2026-11-10

### Diseño visual y animación (implementado, spec diseno-visual)
- ~~Portada contada al bajar, tipografía nueva, links como botones, flecha Volver, verde/rojo según bueno/malo, renglones sin partir y tarjetas de resumen deslizables.~~ ✅ 2026-11-10

### Inicio y búsqueda guiada (implementado, spec inicio-y-temas)
- ~~Portada con cifras en vivo, temas con (?), página por tema (principales → subgrupos) y oraciones guiadas.~~ ✅ 2026-11-08

### Histórico: medidas y opciones (implementado, spec medidas-y-opciones)
- ~~Elegir la medida en pasos: **Pesos / Dólares / Variaciones**.~~ ✅ 2026-11-08
  - Pesos → corrientes o reales.
  - Dólares → corrientes o reales → cotización (blue, oficial, MEP, CCL).
  - Variaciones → mensual, interanual o **acumulada de los últimos 12 meses** (en lugar de la acumulada en el año, que confunde) → nominal o real.
- Al agregar una variable (ej. salario): primero una explicación corta y cuál recomienda la página; un "ver más" despliega la explicación completa.
- Índices "tal cual" (ej. IPC empalmado como índice): al fondo y en un color apagado; no son lo primero que hay que ver.
- No ofrecer comparaciones sin sentido (IPC empalmado contra la inflación).
- Al pasar de mes a año, elegir cómo agregar: promedio o último dato (cierre); quizás máximo y mínimo.
(Las seis ideas anteriores: medida en pasos, explicación corta + recomendada, índices tal cual al fondo, sin comparaciones sin sentido, Promedio/Cierre.) ✅ 2026-11-08

### Configuración global (implementado, spec configuracion-global)
- ~~Configurar inicio del mandato (T-1, T, T+N, por presidente).~~ ✅ 2026-11-08
- ~~Configuración global guardada en el navegador.~~ ✅ 2026-11-08

### Plantillas y vistas (implementado, spec plantillas-y-vistas)
- ~~Hasta 4 gráficos por vista, Otros gráficos interesantes, Plantillas con buscador, plantillas propias y compartir por link.~~ ✅ 2026-11-08

### Ranking, curiosidades y voto estimado (implementado, spec presidentes-ranking-curiosidades)
- ~~Ranking armable, curiosidades generadas, variables elegidas por presidente, animación del mandato y voto estimado.~~ ✅ 2026-11-08

### Correcciones del Histórico (implementado 2026-11-09, spec correcciones-historico)
- ~~Sacar "Otros gráficos interesantes"~~ ✅ 2026-11-09 (hasta 4 variables de la misma unidad en un eje; 3 plantillas nuevas)
- ~~Hasta 4 gráficos uno al lado del otro~~ ✅ 2026-11-09 (grilla de 2 columnas desde 1024 px)

### Contexto internacional (implementado 2026-11-09, spec contexto-internacional)
- ~~Contexto para juzgar a un presidente: proyecciones del FMI vs. resultado, vecinos y viento de cola o de frente~~ ✅ 2026-11-09 (sección Contexto y recuadro "Contexto del mandato")
- ~~Comparación internacional: PBI y otras variables del FMI, base 100 desde 2000~~ ✅ 2026-11-09 (el consumo de carne quedó pendiente, ver arriba)

### Precios en el mundo (implementado 2026-11-09, spec precios-en-el-mundo)
- ~~Precios por categoría contra el mundo y otros países (ICP del Banco Mundial + estimación mes a mes).~~ ✅ 2026-11-09

### Ajustes del Histórico (implementado 2026-11-09, spec ajustes-historico)
- ~~Ventana "Configurar variable", referencias con hover, zoom que recalcula, precios corrientes neutros y franjas de presidentes con colores en la configuración global~~ ✅ 2026-11-09

## ~~Ajustes pedidos al recorrer la página, tanda 10 (2026-11-15)~~ ✅ 2026-11-15
→ spec: docs/specs/ajustes-tanda-10.md (bloque 5o).
- ~~«hay datos que capaz están en herencia que no aparecen en la lupa. ponele deuda publica, deuda neta, etc.»~~ ✅ 2026-11-15 (deuda neta no existe en el sitio).

## ~~Tanda 11: Congreso en columnas y resaltar un país (2026-11-15)~~ ✅ 2026-11-15
→ spec: docs/specs/ajustes-tanda-11.md
- ~~«En Cada gobierno frente al Congreso … que sea un gráfico de barras verticales con cada gobierno en el eje x», marcar el de más y el de menos apoyo, y un indicador de leyes según el apoyo que tenía cada gobierno.~~ ✅ 2026-11-15
- ~~«que en El mundo y la Argentina se pueda resaltar a un pais como hacemos en meses de mandato (tambien para la imagen)».~~ ✅ 2026-11-15

## ~~Series de deuda y deuda consolidada (2026-11-15)~~ ✅ 2026-11-15
→ spec: docs/specs/series-deuda.md
- ~~«no tenemos series para ver la evolución de las variables esas que están en herencia?» y «deuda consolidada»: la suma de los pasivos del Banco Central y los del Tesoro.~~ ✅ 2026-11-15 (fases 1 y 2; la tarifa eléctrica, fase 3 opcional, sigue abierta en la spec)

## ~~Tanda 12: el dato actual primero, y deuda en Cuentas públicas (2026-11-15)~~ ✅ 2026-11-15
→ spec: docs/specs/ajustes-tanda-12.md
- ~~«En historico el "Cambiar dato" debería mostrar primero la variable actual por si quiero modificar la forma de verlo y también dentro de "Ajustes"… ponele si quiero ver deuda consolidada en % del PBI o si la quiero ver en otra moneda al dolar CCL ponele».~~ ✅ 2026-11-15
- ~~«no encuentro donde se ve % del pib» (en la ficha de la deuda consolidada).~~ ✅ 2026-11-15
- ~~«ahi podrias tambien agregar la consolidada / pbi, el deficit cuasifiscal» (principales del tema Cuentas públicas).~~ ✅ 2026-11-15

## Datos calientes que faltan (2026-11-16)
- ~~Segunda investigación (`docs/investigaciones/datos-nuevos-2-2026-11-16.md`): subsidios al transporte, transferencias a provincias, patentamientos, demanda eléctrica, gasto por función, siniestros viales y femicidios (a mano) → spec: docs/specs/datos-calientes-2.md~~ ✅ 2026-11-16
- ~~Tercera tanda (2026-11-17), investigada en `docs/investigaciones/datos-nuevos-3-2026-11-17.md` → spec: docs/specs/datos-calientes-3.md: robos de autos, motos, obra pública, vacunas, empleadores; y pedidos del usuario: «puestos de trabajo totales? (formal + informal)»; «pobreza en numero de personas? (creo que tenemos el % nomás). y pobreza de alta frecuencia (la medicion mensual, habia una fuente que en enero 26 daba como 57% creo)»; «inversiones rigi anunciadas y ejecutadas?»; «piquetes?»; «consumo de carne?»; «ingresos, alumnos regulares y graduados?»; «natalidad, mortalidad?».~~ ✅ 2026-11-17 (universidades en serie larga quedó afuera: las fuentes no cierran)

## ~~Novedades, calendario y predicciones (primera parte)~~ ✅ 2026-11-16
→ spec: docs/specs/novedades-calendario.md
- ~~Sección con los datos nuevos que van entrando, para que la gente opine.~~ ✅ 2026-11-16
- ~~Calendario de próximas publicaciones con fecha (INDEC tiene calendario; para el resto, el día promedio en que suele salir).~~ ✅ 2026-11-16 (las fechas estimadas aparecen cuando cada fuente tenga dos meses registrados)

## ~~Novedades, calendario y predicciones (segunda parte)~~ ✅ 2026-11-16
→ spec: docs/specs/predicciones.md
- ~~La gente deja su predicción (ej. inflación de noviembre) y la página muestra la **mediana** (un valor absurdo no la mueve). Limitar valores imposibles (ej. 1.000.000% de inflación).~~ ✅ 2026-11-16 (solo inflación mensual, rango −5 a 30 %; para que guarde en el sitio faltan la base D1 y Turnstile)

## ~~Tanda 13: Novedades (2026-11-16)~~ ✅ 2026-11-16
→ spec: docs/specs/ajustes-tanda-13.md
- ~~«no se distingue mucho los dias en los que salio el dato xq tiene mismo color y fuente».~~ ✅ 2026-11-16
- ~~«al principio estaría bueno una vista de calendario con los dias y con un numerito tipo notificacion de cada dia de la cantidad de datos principales que salieron (ponele inflacion cuenta como 1) y los proximos que salen. Despues abajo si la linea historia cronologica» (una grilla por pestaña).~~ ✅ 2026-11-16
- ~~«al compartir estaria bueno que ponga el mes anterior y variacion intermensual y el dato del año anterior y la interanual» (texto e imagen, en todo el sitio).~~ ✅ 2026-11-16
- ~~«al desplegar los datos se ven feos y cuando son muchos como la inflación como que tambien queda feo».~~ ✅ 2026-11-16
- ~~«Lo ultimo y que salio debería ser como dos pestañas de novedades y calendario».~~ ✅ 2026-11-16
- ~~«se podría agendar un dato?» (botón por fecha: Google Calendar y .ics).~~ ✅ 2026-11-16
- ~~Segunda vuelta (2026-11-16): «yo decia de ponerla ahi al lado de la etiqueta del 2.2 grande… y se pueda prender y apagar desde la personalizacion asi no compite con las otras tarjetas»; «queda fea la grilla porque tiene dos cruces al costado que no tienen uso… en PC deja mucho hueco a la derecha»; «que los dias se puedan contraer y sean como desplegables grandes»; «se ve feo cuando hay muchos datos. de ultima pone un deslizador»; Agendar «se ve feo xq tiene espaci arriba».~~ ✅ 2026-11-16
- ~~Tercera vuelta (2026-11-16): «queda feo el calendario tan grande. de ultima busca otro grafico para pc» y «al apretar las casillas del calendario te muestra resumido los datos que hay tipo pop up» (elegido: grilla chica + panel al lado en PC, ventana en el celular).~~ ✅ 2026-11-16

## Tanda 14 (2026-11-16) → spec: docs/specs/ajustes-tanda-14.md
- ~~Resumen por hitos: al pasar el mouse por una barra, que muestre el valor~~ ✅ 2026-11-16 (regla R32, también en Congreso y Gasto)

## Empresas que cierran: ¿de qué tamaño? (2026-11-17)
Idea del usuario: «fijate si tenemos empleados por empresa. porque a veces cierran empresas (cuits) con 1 solo empleado o sin. y se usa eso para decir que cierran empresas. o como lo podemos contrastar».
- ~~Empresas y trabajadores por tamaño (SRT) y aperturas y cierres (OEDE)~~ ✅ 2026-11-17 → spec: docs/specs/empresas-por-tamano.md

## ~~Tarifas de servicios y subsidios (2026-11-17)~~ ✅ 2026-11-17 → spec: docs/specs/tarifas-y-datos-calientes-4.md
- «y con eso sacar tambien como un indicador de la tarifa que paga el estado vs el consumidor final».
- «también estaría bueno la tarifa de luz, de agua y de gas. ponele podemos investigar para bs as, cordoba y santa fe. con y sin subsidio. cantidad de gente que recibe el subsidio y los tipos de subsidios». Junto con la fase 3 de deuda (parte del costo de la electricidad que pagan las tarifas, CAMMESA) y los datos calientes que faltan (carne 2019-2023, pollo y cerdo, robos de motos, fecundidad, universidades). Investigación: `docs/investigaciones/tarifas-y-carnes-2026-11-17.md`.

## ~~Deuda en dólares a otra cotización (2026-11-15)~~ ✅ 2026-11-17 → spec: docs/specs/deuda-otros-dolares.md
- «o si la quiero ver en otra moneda al dolar CCL» y «no sería en dolares blue?»: la deuda ya está en dólares (Finanzas pasa los pesos al oficial de fin de mes), así que «al CCL» solo cambia la parte en pesos. Versión con sentido: deuda en moneda extranjera + deuda en pesos y pasivos del Banco Central pasados a dólares al CCL/MEP/blue (para la consolidada: `deuda_ac_me + deuda_ac_mn × oficial / CCL − letras + pasivos / CCL`).

## ~~Deuda neta del sector público consolidado (2026-11-17)~~ ✅ 2026-11-17 → spec: docs/specs/deuda-neta.md
- El usuario trajo otra forma de medir la deuda consolidada (texto pegado, citado a Infobae y al BCRA): Tesoro USD 260.638 millones = deuda bruta (484.917) menos la deuda en manos del propio sector público (BCRA, FGS y otros); BCRA USD 18.869 millones = pasivos monetarios ($68.006.428 millones al 31/08/2026) menos reservas netas. Mide lo que el Estado le debe a terceros.
- Diferencia con la nuestra (D-024): nosotros restamos solo lo que el Tesoro le debe al Banco Central según el boletín (letras y adelantos) y sumamos solo los pasivos remunerados; por eso la nuestra es un techo. Esta resta además lo que tienen el FGS, el Banco Nación y las Lecap del Banco Central, y del lado del Banco Central suma la base monetaria y resta las reservas netas.
- Fuentes: investigadas en `docs/investigaciones/deuda-neta-2026-11-17.md` (presentación trimestral de Finanzas por acreedor, a mano; pasivos monetarios del BCRA, variable 1247; metodología de Facimex).

## ~~Tanda de ajustes (2026-11-17)~~ ✅ 2026-11-18
→ spec: docs/specs/ajustes-tanda-15.md
- Ficha de un dato → «Mes a mes desde que asumió»: la animación no es tan fluida como la de Presidentes, y no deja filtrar hasta un cierto mes (elegir el mes final).
- «¿Cómo fue octubre en otros años?» → Compartir → Imagen: la línea punteada de «El más alto: 8,3 % (2023)» tendría que ser más corta y arrancar desde el centro de la barra; hoy parece que marca el último dato.

## ~~Presidentes y mandato: fin de mandato configurable~~ ✅ 2026-11-18
→ spec: docs/specs/ajustes-tanda-15.md (además: lo de fábrica pasa a dic a dic, panel «Mandatos» por presidente, Herencia vinculada)
- Mes de **fin** de mandato configurable, igual que ya se puede elegir el de inicio (2026-11-17). Ejemplo del usuario: computar la inflación interanual de cada presidente de diciembre a diciembre, así Alberto Fernández va de dic-19 a dic-23.

## Datos calientes, preguntas y pedidos (2026-11-17)
- ~~RIGI: sumar los proyectos **presentados y pendientes** (o no aprobados), no solo los aprobados. Hoy `/rigi/` y `rigi_aprobado` tienen solo los aprobados.~~ ✅ 2026-11-18 (docs/specs/datos-calientes-5.md)
- ~~El 57,4 % de pobreza (UCA, ene-24): hoy aparece solo en la nota de la serie de pobreza mensual de Di Tella (`/historico/?v=pobreza_utdt~asis~~compra~`), explicado como simulación, no como punto del gráfico. Ver si conviene hacerlo más visible.~~ ✅ 2026-11-18 (docs/specs/datos-calientes-5.md)
- ~~Pobreza infantil (0 a 14 años, EPH del INDEC por edad, semestral): no está; sumarla.~~ ✅ 2026-11-18 (docs/specs/datos-calientes-5.md)
- ~~Consumo de huevo por habitante: ver si hay fuente.~~ ✅ 2026-11-18 (docs/specs/datos-calientes-5.md, E: anuarios avícolas de Agricultura y CAPIA 2015-2019)
- ~~Reservas netas y deuda neta desde 2019: hoy la parte del Banco Central arranca en abr-24 y la deuda neta en jun-24, porque los supuestos de reservas netas (swaps con China y el BIS, seguro de depósitos) solo tienen cita desde abr-24. Qué hacer: buscar en los informes del FMI de los programas 2018 y 2022 el swap con China (en yuanes, pasarlo a dólares en cada fecha) y el seguro de depósitos de 2019 a 2024; cargarlos en `datos/manual/reservas_netas_supuestos.json` con cita (documento y página) y bajar el inicio a 2019; revisar que la estimación de reservas netas de Herencia (D-021) siga pasando sus controles contra el FMI. Con eso la parte del Banco Central y la deuda neta salen solas desde 2019 (unos 20 trimestres más).~~ ✅ 2026-11-18 (docs/specs/reservas-netas-2019.md)
