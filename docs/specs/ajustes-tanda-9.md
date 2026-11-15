# Ajustes, tanda 9: cabecera del dato, ficha, Compartir, presidentes, herencia, Banco Central y menús

Estado: implementada (2026-11-15), sin publicar

Pedidos del usuario al recorrer la página en la computadora (2026-11-15, 20 puntos, anotados en `docs/IDEAS.md`). Como siempre, cada pedido es un caso de una regla general: cada parte aplica las reglas en **todos** sus archivos y lo informa.

Fuera de esta tanda: **Contexto internacional** (pedidos 19 y 20). El usuario sigue mirando esa sección; se anotó todo en `docs/IDEAS.md` y después se propone una remodelación. No tocar `Contexto.tsx`, `PreciosMundo.tsx`, `PreguntaPrecios.tsx` ni `contexto.css`.

## Reglas generales (nuevas, se suman a R1–R17)

- **R18. Sin columnas vacías.** Una cabecera o bloque en dos columnas no deja una columna medio vacía: si la derecha tiene poco, se llena con lo que ya existe y se pide seguido (más comparaciones, un minigráfico) o el bloque pasa a una columna.
- **R19. Un botón por cosa, en un solo renglón de controles.** Cada capítulo tiene, como mucho, un renglón de controles: el resumen de lo elegido como texto ("Todos los presidentes · desde el mes de asunción") y **un solo** Ajustes (más, como mucho, uno o dos botones propios de lo que se usa seguido). Nunca dos Ajustes, nunca píldoras que abren lo mismo que Ajustes. El Compartir va en el título del capítulo (R11) y nunca pisa una línea divisoria.
- **R20. El cero se ve.** En todo gráfico (pantalla e imagen) cuyos valores cruzan el cero, la línea del cero va marcada con un color propio (`--cero`, gris claro más fuerte que la grilla), para leer de un vistazo quién quedó por encima y quién por debajo. Se puede sacar desde los ajustes del gráfico (opción "Línea del cero", prendida por defecto; en el Histórico va a la URL solo si se apaga).
- **R21. Las frases no se contradicen.** Una frase automática no junta dos afirmaciones que se leen como opuestas ("el más bajo desde 2023" y "el 3.º más alto"). Si el hecho de "desde" va en sentido contrario al puesto, se dice como comparación con los años vecinos ("Más bajo que 2024 y 2025; el último septiembre más bajo fue 2023 (−2,3 %).").
- **R22. Lo armado a gusto lo dice.** Toda imagen o texto compartido de una vista que el usuario arma eligiendo variables, criterios o presidentes (Ranking, Un presidente con Mis variables, Mes a mes, Herencia elegida, gráficos con varias series) lleva al pie "Armado en primerolosdatos.com.ar · armá el tuyo" y el link de la vista, para que quien lo recibe sepa que es una elección y pueda hacer la suya.
- **R23. Volver adonde estaba.** Al cerrar algo que se abrió desde una fila (gráfico desplegado, ventana), la página queda en la fila que se tocó, no en otra parte.

## Parte A: cabecera del dato, ficha e Histórico

Archivos: `web/components/sistema/CabeceraDato.tsx`, `web/components/FichaDato.tsx`, `web/lib/ficha.ts`, `web/app/estilos/ficha.css`, `web/components/sistema/BarrasMes.tsx`, `web/components/secciones/Historico.tsx`, `web/app/estilos/historico.css`, `web/lib/historico.ts`, `web/components/secciones/Dato.tsx`, `web/components/Grafico.tsx`, `web/app/estilos/grafico.css`, `web/lib/url.ts` (solo si hace falta un parámetro).

1. (pedidos 1 y 10, R18, R19) Cabecera del dato (ficha y Histórico, la misma `CabeceraDato`): la columna derecha de la línea divisoria hoy tiene solo dos variaciones. En computadora pasa a tener las dos variaciones y, debajo, **las comparaciones extra que hoy están en "Más comparaciones"** (inicio del período, promedio, mediana, máximo, mínimo, con la misma `Delta`), visibles sin plegar, en dos columnas si entran. En el celular (una columna) siguen plegadas bajo "Más comparaciones", justo debajo de las dos variaciones (no debajo de "Cómo verlo"). El plegable separado de abajo del Histórico desaparece (una sola vez cada cosa). La ficha muestra las mismas comparaciones (calcularlas con lo que ya usa el Histórico, sin duplicar lógica). El Compartir y "Cambiar dato" del Histórico quedan arriba a la derecha **por encima de la cabecera**, sin pisar la línea divisoria (medir que el botón no se superponga con el borde de la columna).
2. (pedido 3) La ficha de una variable con otras formas de verse (inflación: mensual, interanual, índice; las que el Histórico ofrece en "Cómo verlo") muestra el mismo selector "Cómo verlo" debajo de la cifra; al elegir, cambia la ficha entera (cifra, gráfico, meses, presidentes) y la URL (`?v=` como hoy). El botón "Abrir completo" sigue llevando al Histórico con la forma elegida.
3. (pedido 5, segunda parte) "¿Cómo fue <mes> en otros años?" exige hoy 10 años del mismo mes: los rubros del IPC en interanual (desde 2018) no llegan. Bajar el mínimo a 6 años; con menos, el capítulo no se muestra.
4. (pedido 7, R21) Frase de `mesesIguales` (`ficha.ts`): si el sentido de "desde" es contrario al del puesto, usar la forma de R21. Revisar las otras frases automáticas de la ficha y del Histórico (`contexto-dato.ts` solo lectura; si el mismo problema está ahí, informarlo) para que no se contradigan.
5. (pedido 7, R20) Línea del cero: en `BarrasMes` (barras de meses), en `Grafico.tsx` (uPlot: Histórico, ficha, Mandato y demás) y en las barras de la tabla por presidente de la ficha si cruzan el cero. Opción "Línea del cero" en la hoja de Ajustes del Histórico (parámetro nuevo `cero=0` solo cuando se apaga) y en el capítulo de meses de la ficha (en sus ajustes si los tiene; si no, siempre prendida). `Grafico.tsx` recibe una opción `cero?: boolean` (por defecto true) y la dibuja solo si el rango del eje Y incluye el cero.
6. Barrido: otras cabeceras en dos columnas con un lado medio vacío dentro de los archivos de esta parte.

## Parte B: portada, menús, buscador de variables y temas

Archivos: `web/components/secciones/Inicio.tsx`, `web/app/estilos/portada.css`, `web/components/sistema/MenuMas.tsx`, `web/components/sistema/iconosTemas.tsx`, `web/components/Nav.tsx`, `web/lib/secciones.ts`, `web/components/Variables.tsx`, `web/app/estilos/variables.css`, `web/components/secciones/Tema.tsx`, `web/lib/temas.ts`, `web/lib/nombres.ts` (solo si hace falta para el punto 4).

1. (pedido 4) Placas de "Los datos más buscados": cada placa tiene una bajada debajo de la cifra (hoy el dólar blue no tiene): si la serie no tiene una propia, el hecho de contexto de la ficha ("El valor más bajo desde sep-24", "x % por debajo de su récord"), con la lógica que ya existe (`ficha.ts`/`contexto-dato.ts`, sin duplicar). Las cuatro placas siguen alineadas (R13): la bajada reserva dos renglones.
2. (pedido 9) "Todas las secciones" (mosaico de la portada): otro diseño para las tarjetas, menos "caja con ícono en un cuadrado". Dirección: tarjeta sin fondo de caja, con el ícono grande en `--acento` arriba a la izquierda sin cuadrado detrás, nombre y una línea, y una línea fina arriba de cada tarjeta (`--borde`) que pasa a `--acento` y se engrosa al pasar el mouse o con foco; flecha → que aparece al pasar el mouse. Mismo alto en cada fila; dos columnas en el celular. Usar el skill de diseño del proyecto (Impeccable) si ayuda, sin pedir confirmación.
3. (pedido 18) Menú "Más" (`MenuMas.tsx`) y la barra de arriba: cada sección con su ícono (los de `iconosTemas.tsx`, los mismos que el mosaico) a la izquierda del nombre. Mismo ícono en todos lados para la misma sección.
4. (pedido 5) Precios, "Todos los datos" (`Tema.tsx`, `tv=todos`): las series de otros países (inflación de EEUU CPI-U y cualquier otra serie no argentina listada en un tema) no van entre los indicadores de la Argentina: pasan a un bloque propio al final ("Otros países") y se abren en variación interanual (la expresión del Histórico con `~ia` o la que corresponda para interanual), no como índice. Barrido en todos los temas.
5. (pedido 11) Buscador de variables ("Cambiar dato", `Variables.tsx`): el botón ← para subir de carpeta pasa a ser una píldora chica `--relleno` con flecha y la palabra de la carpeta de arriba ("← Todas"), alineada con la ruta, sin círculo negro; el bloque de la carpeta muestra primero la explicación y, separado por `--e-3` y una línea fina, el renglón "Recomendado" con su botón (no en la misma caja pegado al texto).
6. Barrido: otros lugares del sitio con un ← en círculo oscuro o un botón pegado a un texto explicativo, dentro de estos archivos.

## Parte C: Compartir e imágenes

Archivos: `web/components/PanelCompartir.tsx`, `web/lib/imagen.ts`, `web/lib/imagen-presidentes.ts`, `web/lib/imagen-datos.ts`, `web/lib/compartir.ts`, `web/lib/config.ts`, `web/app/globals.css` (único que lo edita en esta tanda).

1. (pedido 2) Panel de Compartir, "Tarjetas" → "Datos de cada presidente (hasta 3)": las píldoras quedan pegadas al borde de abajo del bloque; darles aire (`--e-3` abajo) y revisar todos los grupos de píldoras del panel (Líneas, Presidentes, Frases, Formato) con el mismo margen.
2. (pedido 6) `VistaPres` de tipo `"mandato"` suma `resaltados?: string[]` (ids de presidentes). La imagen dibuja esos presidentes con línea gruesa y los demás atenuados, igual que la pantalla. En el panel, para vistas `mandato`, un grupo de píldoras de elección múltiple "Resaltar" (R12) con los presidentes de la vista, que arranca con `resaltados`; ninguno elegido = todos iguales.
3. (pedido 12) Vista nueva `{ tipo: "grilla"; calor: boolean; base: BaseCfg }`: la grilla "Todos los presidentes, de un vistazo" como imagen (una fila por presidente, una columna por dato clave, con el mismo texto de cada celda). Con `calor` las celdas van coloreadas como mapa de calor (verde = mejor, rojo = peor, intensidad según el lugar entre los presidentes de esa columna, siempre con el texto con signo). Armar la grilla con la misma función de `web/lib/` que usa la pantalla (`Presidentes.tsx` → `GrillaPresidentes`); si esa función está en un componente, moverla o reexportarla desde `web/lib/presidentes.ts` sin cambiar su resultado.
4. (pedido 15) Imagen de la herencia (tipo `"herencia"`, se dibuja como `"variables"`): los nombres largos con su explicación (unidad) se pisan con la fila de abajo. Cada fila reserva el alto de su nombre (hasta dos renglones, cortado con "…" después) más el renglón de la unidad; si no entra la explicación, va solo el nombre. Revisar el mismo problema en las otras imágenes con filas (variables, ranking, barras).
5. (R22, pedido 16) Pie "Armado en primerolosdatos.com.ar · armá el tuyo" en la imagen y "Armá el tuyo: <link>" en el texto que se comparte o copia, para las vistas armadas a gusto: `ranking`, `variables`, `mandato`, `herencia` con variables elegidas, y las vistas del Histórico con más de una serie. Se decide por el tipo de vista dentro de esta parte; las páginas no pasan nada nuevo.
6. (R20) En las imágenes con gráfico (líneas, barras, meses, mandato) cuyos valores cruzan el cero, la línea del cero con el color `--cero` de la paleta de la imagen. La opción de apagarla: si la vista del Histórico trae `cero: false` (campo opcional nuevo en `VistaImg`), no se dibuja.
7. Token `--cero` en `globals.css` (oscuro y claro) y en la paleta de la imagen (`imagen-paleta.ts` es de esta parte también).

## Parte D: Por presidente y Meses de mandato

Archivos: `web/components/secciones/Presidentes.tsx`, `web/components/sistema/GrillaPresidentes.tsx`, `web/components/secciones/Mandato.tsx`, `web/components/secciones/ContextoMandato.tsx`, `web/app/estilos/presidentes.css`, `web/lib/presidentes.ts`, `web/components/secciones/VentanaConfig.tsx`, `web/components/secciones/comunes.tsx` (solo si hace falta).

1. (pedido 6) Mes a mes (Meses de mandato): al compartir, la vista pasa `resaltados` con el presidente resaltado en la leyenda (contrato de C2). La animación del dibujo deja de ir de mes en mes a saltos: cada línea avanza de forma continua entre un mes y el siguiente, como un lápiz (interpolar la posición dentro del tramo con `requestAnimationFrame`; uPlot puede recibir un último punto intermedio o recortarse con un clip que avanza). Respeta reducir movimiento (sin animación) y las reglas de lo que se mueve solo.
2. (pedido 12) "Todos los presidentes, de un vistazo": mapa de calor por defecto (verde = mejor, rojo = peor según `dir` de cada dato, intensidad por el lugar entre presidentes en esa columna; el texto con signo se mantiene). Un control "Colores" (prendido) para sacarlo, en la URL solo apagado (`gc=0`). El Compartir pasa de `CompartirHoja` (solo link) a `BotonCompartir` con la vista `{ tipo: "grilla", calor, base }` (C3).
3. (pedido 13, R19) "Una variable, todos los presidentes": hoy hay un Ajustes en el título, otro Ajustes abajo y dos píldoras ("Todos los presidentes", "Desde: el mes de asunción, con excepciones") que abren lo mismo. Queda un solo Ajustes (en el renglón de controles, al lado de la variable y la moneda), el resumen como texto ("Todos los presidentes · desde el mes de asunción, con excepciones") y el filtro de presidentes dentro de ese Ajustes. Barrido en Meses de mandato.
4. (pedido 14, R19) "Un presidente, todas las variables": antes de la tabla hay Todas/Mis variables, presidente, Personalizar, buscador, tipos, Expandir, Contraer y dos textos. Reordenar: un renglón con el presidente (botón principal) y Ajustes (que adentro tiene Todas/Mis variables, Personalizar, tipos); el buscador a todo el ancho debajo; "Expandir todas / Contraer todas" como un solo botón que alterna, chico, al final del renglón del buscador; el texto "Tocá un grupo…" se va (se entiende) y la línea del período queda como resumen. "Contexto del mandato" (`ContextoMandato.tsx`): el plegable tiene el relleno mal (texto pegado arriba a la izquierda, mucho alto vacío abajo); igualarlo a los plegables del sistema (`Plegable` de `ui.tsx`).
5. Barrido: otros capítulos de estos archivos con controles duplicados o un plegable con relleno distinto.

## Parte E: Herencia, Ranking y Elecciones

Archivos: `web/components/secciones/Herencia.tsx`, `web/app/estilos/herencia.css`, `web/components/secciones/Ranking.tsx`, `web/lib/ranking.ts`, `web/components/secciones/Elecciones.tsx`, `web/app/estilos/elecciones.css`.

1. (pedido 13, R19) Herencia: mismo problema que Por presidente (botones que abren lo mismo, Ajustes repetido): un solo renglón de controles con resumen como texto y un solo Ajustes.
2. (pedido 15) "Recibido y entregado": algunas filas (Reservas brutas, Pasivos remunerados) quedan muy altas porque el ⓘ se ubica lejos del nombre y empuja la unidad abajo. El ⓘ va pegado al final del nombre (en línea, 28 px dentro de 44 px tocables, sin agrandar la fila) y la unidad debajo; la fila mide lo que mide su contenido. Comprobar a 1280 y 390 px.
3. (pedido 16) Ranking: "Filtrar grupos" no deja volver a sacar el filtro (no se pueden volver a elegir todos los grupos o desmarcar). Arreglarlo: las píldoras alternan y hay "Todos" para volver a todos. Mismo control en Elecciones si existe.
4. (pedido 17) Elecciones no tiene Compartir: sumar `BotonCompartir` en el título de cada capítulo con datos (R11). Si no hay imagen para esa vista, usar el que existe para tablas o link (`CompartirHoja`) y anotar en el informe qué imagen faltaría.
5. Barrido R19 en estos archivos.

## Parte F: parte del Banco Central

Archivos: `web/components/secciones/ParteBcra.tsx`, `web/components/secciones/BloqueParte.tsx`, `web/components/GraficoDiario.tsx`, `web/components/PanelParte.tsx`, `web/lib/diario.ts`, `web/app/estilos/bcra.css`.

1. (pedido 8) Ventana "Elegir fechas": aire entre Desde, Hasta, la nota y Aplicar (`--e-3` entre bloques, etiqueta pegada a su campo). Aplicar como botón primario.
2. (pedido 8, R23) Al cerrar el gráfico desplegado de una variable, la página queda en la fila que se abrió (guardar la fila y llevarla a la vista sin salto brusco; si ya está a la vista, no mover).
3. (pedido 8) Debajo del gráfico, además de "más alto" y "más bajo" del período: el valor al **inicio del período** elegido y la **variación del último contra ese inicio** (con `Delta`, mismo formato que las otras comparaciones del parte). Calcularlo en `diario.ts`.
4. (pedido 8) "En vivo · Banco Central": un ícono propio del Banco Central (dibujo de línea, edificio con columnas, del mismo grosor que los íconos del sitio; **no** el logo oficial del BCRA). En el parte de la portada (`BloqueParte`) y en `/bcra/`.
5. Barrido: otras ventanas de este parte sin aire y otros cierres que dejan la página en otro lado.

## CSS por parte

Solo C edita `web/app/globals.css`. Las demás en su archivo de `web/app/estilos/`: A `ficha.css`, `historico.css`, `grafico.css`; B `portada.css`, `variables.css`; D `presidentes.css`; E `herencia.css`, `elecciones.css`; F `bcra.css`. Clases nuevas con prefijo de su parte; antes de crear una, buscar con grep que no exista. Si una parte necesita `--cero` antes de que C lo agregue, usar `var(--cero, #8a93b8)`.

## Contratos entre partes

- C2/D1: `VistaPres` mandato con `resaltados?: string[]`.
- C3/D2: `VistaPres` `{ tipo: "grilla"; calor: boolean; base: BaseCfg }`; la función que arma la grilla vive en `web/lib/presidentes.ts` (D la mueve si hace falta; C la importa desde ahí).
- A5/C6: `VistaImg` con `cero?: boolean` (A lo pasa desde el Histórico cuando está apagada).

## Lo que no cambia

- Ningún parámetro de URL ni id de serie cambia de significado. Parámetros nuevos: `cero` (Histórico), `gc` (grilla de presidentes).
- Cifras: mismas cuentas que hoy (un solo redondeo).

## Cómo se verifica

- `npm run tipos` y `npm run build` sin errores.
- En la vista local (`web-out`) a 1280 y 390 px:
  - Ficha de inflación (`/dato/?v=…` desde la placa): columna derecha con comparaciones; "Cómo verlo" cambia a interanual; `/historico/` sin el plegable de abajo y con Compartir sin pisar la línea (medir).
  - Rubro del IPC en interanual con "¿Cómo fue octubre en otros años?"; Cuentas públicas, frase de septiembre sin contradicción; línea del cero en las barras.
  - Placa del blue con bajada; mosaico nuevo; menú Más con íconos; Precios → Todos los datos sin CPI-U en indicadores de inflación.
  - Compartir con tarjetas por presidente con aire; Mes a mes con un presidente resaltado → imagen resaltada; grilla con colores y su imagen; herencia imagen sin filas pisadas; ranking con "armá el tuyo".
  - Por presidente con un solo Ajustes por capítulo; Recibido y entregado con filas justas; Ranking deja sacar el filtro; Elecciones con Compartir.
  - Banco Central: Elegir fechas con aire, cerrar el gráfico deja la fila a la vista, inicio y variación debajo del gráfico, ícono.
- Barrido de todas las rutas a 360 y 1280 px: sin desborde horizontal ni errores de consola.

## Dónde ver los cambios (por sección, en el orden del menú)

En local: con la vista `web-out` andando (`.claude/launch.json`, puerto 3100), abrir `http://localhost:3100` + la ruta. Publicado (después del push y de la corrida en verde): `https://primerolosdatos.com.ar` + la ruta.

1. **Portada** `/`: placa del dólar blue con frase debajo de la cifra ("El valor más bajo desde que hay datos (jul-94)"); "Todas las secciones" con el diseño nuevo (sin caja, línea arriba que se pone celeste y flecha al pasar el mouse); "En vivo · Banco Central" con ícono propio.
2. **Menú Más** (botón "Más" arriba) y **Presidentes ▾**: cada sección con su ícono.
3. **Buscar / Cambiar dato** (lupa del Histórico): "← Todas" como píldora; "Recomendado" separado de la explicación por una línea.
4. **Histórico** `/historico/`: a la derecha de la línea, las dos variaciones y debajo inicio, promedio, mediana, máximo y mínimo (con "dif." en las series que no son porcentaje); Compartir y Cambiar dato en su renglón arriba, sin pisar la línea; ya no está "Más comparaciones" abajo; Ajustes → "Línea del cero" (aparece si la serie tiene negativos).
5. **Ficha del dato** `/dato/inflacion-mensual/` (o tocando la placa de inflación): "Cómo verlo" Mensual / Interanual / Índice; mismas comparaciones a la derecha. `/dato/?v=ipc_nacional_02_coicop~via~~~` (bebidas, interanual): ahora tiene "¿Cómo fue octubre en otros años?". `/dato/resultado-fiscal-primario/`: frase "Más bajo que 2024 y 2025; el último septiembre más bajo fue 2023" y la línea del cero en las barras.
6. **Precios** `/tema/precios/?tv=todos`: inflación de EEUU fuera de "Indicadores de inflación", en "Otros países" al final y en variación interanual.
7. **Por presidente** `/presidentes/`: "De un vistazo" con colores (casilla "Colores" para sacarlos) y Compartir con imagen; "Una variable" con un solo Ajustes y lo elegido como texto; "Un presidente" con presidente + Ajustes, buscador a lo ancho y un solo Expandir/Contraer; "Contexto del mandato" con el plegable común.
8. **Meses de mandato** `/mandato/`: tocar un presidente en la leyenda y Compartir → la imagen lo resalta (y deja elegir otros en "Resaltar presidentes"); "▶ Animar" dibuja de corrido; un solo Ajustes.
9. **Herencia** `/herencia/`: un solo renglón de controles; filas de "Recibido y entregado" justas (ⓘ pegado al nombre); Compartir → Imagen sin filas pisadas.
10. **Ranking** `/ranking/`: "Filtrar grupos" con "Todos" y las píldoras que se prenden y apagan; la imagen dice "Armado en primerolosdatos.com.ar · armá el tuyo".
11. **Elecciones** `/elecciones/`: Compartir (link y texto) en los tres capítulos con datos; filtro de elecciones con "Todos".
12. **Banco Central** `/bcra/`: ícono en "En vivo"; "Elegir fechas" con aire; abrir una variable y cerrarla deja la fila a la vista; debajo del gráfico, inicio del período y variación desde el inicio.
13. **Compartir** (cualquier imagen con tarjetas por presidente, por ejemplo desde Por presidente): píldoras con aire abajo.

## Segunda vuelta (2026-11-15, comentarios del usuario sobre la página de cambios)

- **V1 (sobre 1.2) Íconos de secciones** (`web/components/sistema/iconosTemas.tsx`): trazo más fino y parejo (como `Iconos.tsx`); Meses de mandato con líneas finas; En qué gasta la Nación como gráfico de anillo con varias divisiones (no un reloj); Gobierno y Congreso con un edificio con cúpula (Congreso); Semáforo con círculos finos; parte del Banco Central con el mismo dibujo que `IconoBanco` (edificio con columnas).
- **V2 (sobre 4.2) Cabecera del dato** (`CabeceraDato.tsx`, `ficha.css`, `historico.css`): lo principal (título, cifra, fuente, frase) es lo más ancho; las comparaciones son secundarias: columna derecha de no más del 40 %, extras en una sola columna, chicas. El título nunca corta palabras ("TRABAJAD-ORES"): baja de renglón entre palabras y achica la letra si hace falta; la cifra no se sale de su columna.
- **V3 (sobre 5.3, R21 corregida)** Frase de `mesesIguales`: el hecho "más alto/bajo desde" solo se dice en el mismo sentido que el puesto. Si va en contra, no se dice (ni se pinta año de referencia); en su lugar, si el puesto es 2.º o 3.º, "Solo 2024 y 2025 estuvieron más altos.". Ejemplo: "Septiembre de 2026: 1,3 %. Solo 2024 y 2025 estuvieron más altos. Entre los 11 septiembres desde 2016, es el 3.º más alto."
- **V4 (sobre 7.2) Una variable, todos los presidentes**: sin caja; a la izquierda, en el mismo renglón que Ajustes, una sola píldora con la variable y cómo verla ("Salario mediano · Pesos reales ▾") que abre una ventana con las dos cosas (elegir variable y cómo verla); ⓘ al lado; resumen como texto; Ajustes a la derecha.
- **V5 (sobre 7.3 y 8.2) Bugs**: en Un presidente, elegir "Mis variables" en Ajustes y tocar Listo no queda guardado; en Meses de mandato, cambiar la variable (dólar blue → salario) no queda. Encontrar la causa y arreglar (no es una limitación de la vista local: el estado vive en la URL).
- **V6 (sobre 9.2) ⓘ en tablas**: el ⓘ junto al nombre de una variable en tablas y filas (herencia, presidentes, temas) se ve pesado: círculo chico (18 px, borde fino o sin borde, glifo "i" chico) pegado al nombre, con área tocable de 44 px invisible que no agranda la fila. Barrido en todo el sitio.
- **V7 (sobre 11.1) Imagen en Elecciones**: Compartir con imagen en los tres capítulos: cifra de "hoy" (tarjeta), dispersión (puntos con etiquetas, recta) y correlación (barras horizontales por variable).
