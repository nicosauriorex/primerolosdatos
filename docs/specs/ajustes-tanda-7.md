# Ajustes, tanda 7: botones sin caja, portada, buscador de variables, ficha, Histórico y Banco Central

Estado: implementada en local (2026-11-14), sin publicar

Pedidos del usuario al recorrer la portada y sus atajos (2026-11-14, 25 puntos, anotados en `docs/IDEAS.md`). El punto 25 es obligatorio: cada pedido es una decisión de diseño para **todo** el sitio; cada parte de abajo aplica las reglas generales en sus archivos, no solo el caso señalado.

Decisiones del usuario (muestra con opciones, 2026-11-14):
- Botones y selectores: **A · píldora rellena** (sin borde, fondo relleno, radio pleno; selectores como riel con la opción elegida en celeste).
- Subió/bajó en las placas: **1 · píldora azul noche con flecha ↑/↓** en verde o rojo, que entra con una animación al aparecer.
- Cifra del salario: **abreviar los millones** ("1,94 M"), mismo tamaño de cifra en las cuatro placas.

## Reglas generales (valen para todo el sitio)

- **R1. Sin cajas con borde fino.** Botones, chips, selectores (`.btn`, `.btn-icono`, `.seg`, `select`, `.chips`, `.vistabar-*`, `.comphoja-boton`, botones "Ir directo a", "Abrir completo", "Volver", "Cambiar", "Listo") son píldoras rellenas: `border: 0`, `border-radius: var(--r-pleno)`, fondo `--surface-1` (o un tono más claro sobre fondos `--surface-1`), hover `--acento-suave`, elegido `--acento` con texto `--sobre-acento`, principal `--accion`. Selector segmentado = riel (`--surface-2`, radio pleno, 3 px de relleno) con la opción elegida como píldora celeste; todas las opciones del mismo alto y con relleno parejo. Los paneles plegables ("Más comparaciones", "Cómo se mide", bloques de "Todos los datos", grupos del buscador) no son cajas con borde: renglón con chevron, línea de 1 px abajo y contenido sin marco. Las tablas y gráficos ya sin caja quedan como están.
- **R2. Abrir y cerrar con animación.** Todo lo que se despliega (plegables, filas del parte, "Más comparaciones", "ver más") abre y cierra con una transición de alto y opacidad de `--d-2` con `--curva`; con `prefers-reduced-motion` aparece sin animar. Nada mueve la página para mostrar algo que se abrió (sin `scrollIntoView` al abrir; si lo abierto queda fuera de pantalla, a lo sumo se lleva hasta que se vea su comienzo, sin saltar al principio).
- **R3. Pies de hoja sin franja.** El pie de `Hoja` (`.hoja-pie`) tiene el mismo fondo que la hoja, una línea de 1 px arriba y "Listo" como píldora principal a lo ancho en el celular (alineada a la derecha y de ancho propio desde 900 px). Ninguna hoja pone "Listo" suelto dentro del cuerpo: va en el pie (`Hoja` ya acepta `pie`).
- **R4. Filas de ajustes alineadas.** En hojas y ventanas de configuración cada ajuste es una fila con rótulo arriba (celular) o rótulo a la izquierda en una columna de ancho fijo (desde 600 px) y el control debajo o al lado; el mismo espacio vertical entre filas (`--e-4`) y entre grupos (`--e-5`). Las opciones largas se acortan ("Valor" / "Base 100") y la aclaración va en un texto chico debajo.
- **R5. Nada se sale de la ventana.** Ningún renglón de una hoja o ventana muestra barra de desplazamiento horizontal: los textos largos bajan de renglón (nombre arriba, detalle debajo).
- **R6. Toda cifra que cambia dice hacia dónde con flecha**, no con un cuadradito: `Delta` usa flecha ↑/↓ (o raya =) del color del tono. En las placas va dentro de una píldora azul noche (`--sobre-acento`) con la flecha y el texto en verde o rojo de placa.
- **R7. Cada capítulo con Compartir ofrece imagen.** Si un capítulo tiene Compartir, la hoja ofrece Imagen, Link y Texto (salvo que no haya gráfico).
- **R8. Los links "Abrir completo", "Ver completo" y los que llevan a otra página abren arriba de todo** (título a la vista), y si llevan un presidente o un período, la página destino lo muestra filtrado.
- **R9. Ejes Y ajustados a los datos.** El mínimo del eje no se extiende una marca entera por un valor apenas negativo (la inflación con −0,8 % en ago-16 no lleva el eje a −10 %).
- **R10. Listas que se tocan se ven tocables.** Una opción recomendada o un link no se presenta como encabezado: lleva aspecto de botón (píldora o renglón con flecha).

## Parte A — Sistema visual (CSS común y componentes del sistema)

Archivos: `web/app/globals.css` (único que lo edita), `web/components/sistema/{Delta,Hoja,CompartirHoja,CabeceraDato,FilaChips,BarraVista,iconos}.tsx`, `web/components/ui.tsx`, `web/components/Iconos.tsx`, `web/components/ConfigProvider.tsx` (y lo que dibuje la ventana Configurar).

1. (R1, pedido 1) Reescribir los estilos de botones, chips, selectores, `select` y riel segmentado según R1, en los dos temas. Revisar contraste (texto 4,5:1) y foco visible.
2. (R1, pedidos 17 y 20) Plegables sin caja: `details`/`summary` de `.fi-metodo`, `.parte-mide`, `.hi-mas` (o como se llame el de Más comparaciones) y cualquier otro plegable con borde: renglón con chevron que gira, línea abajo, sin fondo. Animación de apertura (R2) con un componente o patrón común (por ejemplo `Plegable` en `ui.tsx` con `grid-template-rows: 0fr → 1fr`) que las demás partes puedan usar.
3. (R3, pedidos 6 y 14) `Hoja`: pie según R3. `AjustesTabla` y el Histórico pasan "Listo" al `pie` (lo hacen E1 y D; A deja el estilo).
4. (pedido 12) `CompartirHoja`: las acciones tienen relleno lateral y radio al pasar el mouse; el ícono no queda pegado al borde de la zona marcada.
5. (pedido 18) `CabeceraDato`: el Compartir principal separado de los cambios (en el celular, en su propio renglón con `--e-4` arriba; en la computadora, separado por espacio y no pegado a la última variación).
6. (R6, pedido 2) `Delta`: flecha ↑/↓ en lugar del triángulo en todos lados; variante `en="placa"` = píldora azul noche con flecha y texto en `--placa-bueno`/`--placa-malo` (neutro: texto `--acento`). Animación de entrada opcional (`animar`): la píldora entra con escala 0,8→1 y opacidad, y la flecha se desliza 4 px en su dirección, una sola vez al quedar visible (usar `useAparecer` de `sistema/useAparecer.ts`); sin animación con movimiento reducido.
7. (pedido 24) La ventana Configurar (botón de arriba a la derecha): mismo lenguaje que las hojas (R1, R4): grupos con título, filas alineadas, píldoras, sin cajas con borde.
8. Barrido: buscar en `globals.css` otras cajas de borde fino que hagan de botón o de plegable y pasarlas a R1.

## Parte B — Portada y "Preguntale a los datos"

Archivos: `web/components/secciones/Inicio.tsx`, `web/components/secciones/Oraciones.tsx`, `web/lib/oraciones.ts`, componente nuevo `web/components/sistema/MiniGrafico.tsx`, CSS en `web/app/estilos/portada.css` (nuevo, importado en `layout.tsx` después de `globals.css`).

1. (pedido 2) Placas: cifras de 7 o más dígitos se abrevian a millones con dos decimales ("1,94 M"; el texto accesible dice el valor completo). El tamaño de la cifra se calcula con el largo mayor de las cuatro placas (todas iguales). Comparaciones con `Delta en="placa" animar`.
2. (pedido 10) Tocar una placa lleva a la ficha del dato (`/dato/<slug>/` si es un dato fijo, si no `hrefDato`), no al Histórico. El `aria-label` cambia a "Ver el dato: …".
3. (pedido 23) "Todas las secciones" en la computadora: la grilla no deja un grupo con un solo elemento al lado de una columna vacía (por ejemplo, "Argentina y el mundo"). Repartir en columnas que se llenen parejas (columnas tipo masonry con `columns`, o grupos que ocupen el ancho), alineadas arriba.
4. (pedido 22) Respuestas de "Preguntale":
   - Orden de los chips: Cuánto compra, Con cada presidente, Qué subió más, En dólares, Desde un año.
   - Minigráfico (`MiniGrafico`, reemplaza a `Sparkline` solo acá): punto marcado en el último dato y en el dato con el que se compara (el de hace un año u otro que use la respuesta), dos o tres fechas en el eje X, y al pasar el mouse o tocar, fecha y valor en un globo. Accesible (resumen en texto).
   - "Con cada presidente": "Ver completo" lleva al Histórico con el período de ese presidente (`d` y `h` del mandato).
   - "En dólares" y "Qué subió más": el hueco abre la lista resumida (como `ListaProductos` de "Cuánto compra", con buscador arriba y grupos), no el selector de variables general.
   - "Qué subió más": gráfico base 100 de los dos precios desde el año de inicio, y una fila de atajos "Desde": el año más viejo con datos de los dos (o 2016), dic 2023, hace un año, este año. La cifra y la frase siguen al período elegido.
5. Barrido: otros minigráficos de la portada sin marcador ni fechas, cajas con borde y links que lleven al Histórico cuando lo esperado es la ficha.

## Parte C — Selector de variables y "Configurar variable"

Archivos: `web/components/Variables.tsx`, `web/lib/motor.ts` (solo nombres de medidas y la media móvil), CSS en `web/app/estilos/variables.css` (nuevo).

1. (pedido 3) En el selector, el botón ⓘ es el círculo chico de siempre (no una barra estirada: los estilos de los botones de la lista no se le aplican). La ventana "Información de la variable" que se abre desde el selector muestra bien su cruz (de 44 px, en la esquina, no una X gigante encima del contenido) y la tabla con la primera columna de ancho suficiente ("Nombre técnico" en un renglón; nada de "Nom / bre / técni / co").
2. (pedido 4) Encabezado de una categoría: el "ver más" va pegado al final del texto corto ("… y jubilación mínima. ver más"). "Recomendado" es un rótulo chico y al lado (o debajo) la variable como píldora celeste con flecha, claramente tocable (R10).
3. (pedido 4) Navegación: con una categoría abierta hay un botón ← (44 px) a la izquierda de las migas que sube un nivel. Las migas siguen.
4. (pedido 4) En una categoría, primero las variables sueltas bajo el rótulo "Variables" y después las subcarpetas bajo un rótulo propio (por ejemplo "Más series, por fuente"), cada carpeta como renglón con ícono de carpeta, cantidad y chevron. Que se distinga a simple vista qué abre una carpeta y qué elige una variable.
5. (pedido 4) Al buscar, cada resultado tiene el mismo alto que en la navegación: nombre y, en un renglón chico, solo la categoría de primer nivel y la unidad (sin la ruta completa).
6. (pedido 7) "Cómo se mide": las variaciones dicen "Var. mensual", "Var. interanual", "Var. mensual promedio 12 meses" (en `VAR_BASE` y donde se rotulen igual); los códigos no cambian. Medidas nuevas: media móvil del valor de 3 y 12 meses, con sufijo nuevo en el código de medida (por ejemplo `real_mm3`, `corr_mm12`; los códigos existentes no cambian de significado). Se ofrecen en un selector "Suavizado: Sin / Promedio 3 meses / Promedio 12 meses" cuando la medida es un valor (no en variaciones ni índices tal cual). Rótulo del resumen: "… · promedio móvil 12 meses".
7. (pedido 24) La ventana "Configurar variable" con el lenguaje de R1 y R4 (grupos con título chico, filas alineadas, píldoras, botones Cancelar/Aceptar en un pie como R3).
8. (pedido 8, R5) `RenglonVariable`: el nombre en un renglón y la medida debajo, en chico; nunca barra horizontal.
9. Barrido: otras listas con ⓘ estirados o filas que se salen.

## Parte D — Histórico

Archivos: `web/components/secciones/Historico.tsx`, `web/lib/historico.ts`, CSS en `web/app/estilos/historico.css` (nuevo).

1. (pedido 9) Sin el botón "Cambiar" junto a las variaciones. En la cabecera, arriba a la derecha (o junto al título en el celular), un botón "Cambiar dato" que abre el selector de variables. Debajo de la cifra, un control "Cómo verlo" con las medidas de la variable principal que tengan sentido (por ejemplo, actividad: Var. mensual, Var. interanual, Valor; inflación: Mensual, Interanual, Índice), como riel segmentado (R1); cambia `med` de la primera variable en la URL.
2. (pedido 9) La sección "Variable" sale de la hoja "Ajustes" cuando hay una sola variable: la variable afecta a toda la página. Agregar una segunda variable y más gráficos queda en la hoja en una sección "Más variables" (con lo que hoy está en Variable).
3. (pedido 6, R4) Hoja "Ajustes": filas alineadas; "Mostrar" con dos opciones cortas e iguales ("Valor" / "Base 100") y la aclaración debajo ("hasta 2 variables, o 4 con la misma unidad" / "hasta 10"); "Guardar y compartir" pasa a llamarse por lo que hace (si solo guarda, "Guardar"; si comparte, el compartir ya está en la cabecera y sale de acá); "Listo" en el pie (R3).
4. (pedido 5, R2) "Más comparaciones" abre con animación. Columna nueva "Dif." con la diferencia absoluta en la unidad de la serie para las series que no son porcentaje (salario: "−103.163"); en las de porcentaje la diferencia ya está en p.p. y no se agrega.
5. (pedido 8, R5) La fila de variable en la hoja no se sale: nombre arriba, medida debajo.
6. Barrido: misma revisión en las hojas de Ajustes de las otras páginas que usan `BarraVista` + `Hoja` (Presidentes, Mandato, Contexto, Gasto, Provincias…): rótulos alineados, "Listo" en el pie, sin cajas.

## Parte E1 — Ficha del dato, tabla por presidente y página del tema

Archivos: `web/components/FichaDato.tsx`, `web/lib/ficha.ts`, `web/components/sistema/BarrasMes.tsx`, `web/components/sistema/TablaMandatos.tsx`, `web/components/secciones/Tema.tsx`, `web/lib/temas.ts`, `web/components/GraficosListos.tsx`, `web/components/secciones/Presidentes.tsx` (solo lo que toque la tabla), CSS en `web/app/estilos/ficha.css` (nuevo).

1. (pedido 19) Sin "Ver también" en la ficha.
2. (pedido 17) Página del tema: arriba (después del título y el texto) dos pestañas como riel: **Principales** (por defecto) y **Todos los datos**. Principales muestra las tarjetas; en Precios suma IPC Núcleo, Regulados, Bienes y Servicios (nacional, variación mensual). Todos los datos muestra la lista completa (bloques plegables sin caja, R1, con animación, R2; las series como renglones con nombre, unidad chica y ⓘ, no links subrayados). La pestaña va en la URL (`tv=todos`; sin parámetro = Principales). La ficha del dato elegido queda debajo, como hoy.
3. (pedido 13, R7) "¿Cómo fue <mes> en otros años?": Compartir con Imagen (usa la vista `{ tipo: "meses", ... }` que arma E2) y un deslizador de dos puntas (año desde / año hasta, con la barra de zoom existente `BarraZoom` o un rango doble) para acortar o estirar los años; la frase y la imagen siguen a los años elegidos.
4. (pedido 14, R3) `AjustesTabla`: "Listo" en el pie de la hoja.
5. (pedido 15) Tabla por presidente con tasas (inflación mensual y otras): la columna principal es la **Variación** (cierre − inicio, en p.p.), con Inicio y Cierre a la vista; Promedio pasa a "Sumar columnas". Se suman como opciones: "Promedio 6 meses antes de asumir", "Promedio 12 meses antes", "Promedio últimos 6 meses", "Promedio últimos 12 meses". La bajada cambia ("Inicio, cierre y cuánto cambió en cada mandato"). En `/presidentes/` lo mismo (C2 de la remodelación pasa a decir esto; las imágenes de barras con tasas usan la variación). `cl` sigue siendo el mismo parámetro.
6. (pedido 21) En la computadora la tabla no muestra una barra sin cifra: la columna principal lleva su cifra junto a la barra y su título; si no hay dato, "—" sin barra.
7. (pedido 16) "Mes a mes, desde que asumió": la leyenda de presidentes es tocable: tocar uno lo resalta (su línea entera opaca y más gruesa, las demás al 25 %) y tocar de nuevo lo suelta (usa la opción `resaltar` que agrega E2 a `Grafico`). `aria-pressed` en cada nombre.
8. (R8, pedido 16) "Abrir completo" y los links de capítulos abren la página destino arriba de todo (hoy queda el título fuera de pantalla). Revisar también `GraficosListos`.
9. Barrido: otras listas de links subrayados que deberían ser renglones tocables; capítulos con Compartir sin imagen.

## Parte E2 — Gráfico, imagen de meses y animación

Archivos: `web/components/Grafico.tsx`, `web/lib/imagen*.ts`, `web/components/PanelCompartir.tsx`, CSS en `web/app/estilos/grafico.css` (nuevo).

1. (R9, pedido 11) `escala()`: el borde del eje es el dato más un margen chico (4 %), no la marca redonda siguiente; las marcas se dibujan solo dentro del rango. Un mínimo de −0,8 con máximo de 25 deja el eje cerca de −2, no en −10. Igual para el máximo.
2. (pedido 16) Animación de dibujo: cuando el gráfico entra en pantalla por primera vez, las líneas se dibujan de izquierda a derecha en forma continua (`--d-dibujo`, curva suave), no punto por punto. Con movimiento reducido, quietas. Vale para todos los gráficos de línea del sitio.
3. (pedido 16) Opción `suave?: boolean` en `OpcionesG`: líneas suavizadas (spline monótona de uPlot, `uPlot.paths.spline`), usada en Mes a mes y donde haya pocos puntos por presidente. Sin cambiar los valores ni el globo.
4. (pedido 16) Opción `resaltar?: string | null` en `OpcionesG`: la serie con esa clave se dibuja opaca y más gruesa y las demás con 25 % de opacidad (y sus etiquetas de final de línea igual).
5. (pedido 13) Imagen "meses": nueva vista en `PanelCompartir` (`{ tipo: "meses", expr, desde, hasta }`) que dibuja las barras de ese mes en cada año (el elegido destacado, ámbar el de "más bajo/alto desde"), título, frase y fuente, como las demás imágenes.
6. Barrido: otros gráficos con eje Y estirado (barras de Gasto, `GraficoDiario`).

## Parte F — Parte del Banco Central

Archivos: `web/components/secciones/ParteBcra.tsx`, `web/lib/diario.ts`, `web/components/GraficoDiario.tsx`, `web/components/secciones/BloqueParte.tsx`, CSS en `web/app/estilos/bcra.css` (nuevo).

1. (pedido 20, R2) Tocar una variable despliega su gráfico **debajo de esa fila**, con animación; tocarla otra vez lo cierra. La página no se mueve (sin `scrollIntoView` arriba). El parámetro `v` sigue abriendo esa variable (link compartido).
2. (pedido 20) Compras del Banco Central: frase "la mayor compra desde <fecha>" (o "venta") cuando corresponda, como las de otros extremos.
3. (pedido 20) Resumen de ruedas del período elegido (sigue a `per`), compacto y arriba del gráfico: ruedas compradoras (cantidad y US$ comprados), sin intervención (cantidad), vendedoras (cantidad y US$ vendidos), neto y promedio por rueda. Lo de hoy (rueda anterior, acumulado del mes y del año, racha) pasa a la fila de la variable si entra (una línea), o a ese mismo resumen, sin empujar el gráfico muy abajo.
4. (pedido 20, R1) "Cómo se mide" sin caja (lo estiliza A; acá solo usar la clase común).

## CSS por parte

Para que las partes no se pisen: solo la parte A edita `web/app/globals.css`. Las demás escriben sus estilos en su archivo de `web/app/estilos/` (importados en `layout.tsx` en orden después de `globals.css`), con comentario cuando reemplazan una regla vieja. Clases nuevas con prefijo de su parte.

## Lo que no cambia

- Ningún parámetro de URL ni id de serie cambia de significado (R de `CLAUDE.md`). Parámetros nuevos: `tv` (pestaña del tema), las medidas `_mm3`/`_mm12`, y lo que haga falta para "Qué subió más" en la portada (estado local, no URL).
- Cifras: mismas cuentas que hoy (un solo redondeo, `r1`).

## Cómo se verifica

- `npm run tipos` y `npm run build` sin errores.
- En la vista local (`web-out`), a 390 y 1280 px, oscuro y claro: botones y selectores sin borde (R1) en portada, ficha, Histórico, presidentes y `/bcra/`; foco visible.
- Portada: cifras de las placas del mismo tamaño ("1,94 M"), píldoras con flecha, tocar una placa abre `/dato/…`; "Todas las secciones" sin columnas vacías a 1280 px; "Preguntale": orden de chips, minigráfico con marcadores, globo y fechas; "Con cada presidente" → Histórico con `d` y `h` del mandato; "Qué subió más" con base 100 y atajos.
- Selector de variables: ⓘ chico, información sin X gigante y con la tabla legible, ← para subir, "ver más" al final del texto, recomendado tocable, variables y carpetas separadas, resultados de búsqueda del mismo alto.
- Configurar variable: "Var. mensual"…, suavizado de 12 meses en el salario (comparar un mes a mano con el promedio de los 12 valores).
- Histórico: "Cambiar dato" arriba, "Cómo verlo" cambia la medida, hoja sin la sección Variable con una sola variable, "Listo" en el pie, Más comparaciones con animación y "Dif." en el salario.
- Ficha de inflación: sin "Ver también", eje Y del gráfico sin −10 %, Compartir de meses con imagen y deslizador de años, tabla con Variación principal (Milei: cierre − inicio a mano), Mes a mes con dibujo continuo, líneas suaves y leyenda que resalta, "Abrir completo" abre arriba.
- Tema Precios: pestañas Principales / Todos los datos, `?tv=todos` abre la segunda.
- `/bcra/`: la variable se despliega debajo de su fila sin mover la página y se cierra al tocarla; resumen de ruedas de 2026 contado a mano contra `diario_bcra.json` para un período corto.
- Links viejos (`/historico/?v=…`, `/presidentes/?pv=…&cl=…`, `/bcra/?v=compras`, `/tema/precios/?dv=…`) siguen abriendo lo mismo; consola sin errores; sin desborde a 360 px.
- Revisor contra esta spec.
