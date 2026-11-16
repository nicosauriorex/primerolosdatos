# Ajustes de la tanda 13: Novedades

Estado: implementada (2026-11-16) — fe1b069, corrida en verde (run 43956106566)
Ideas: Tanda 13: Novedades (2026-11-16)

## Objetivo
Que `/novedades/` se lea de un vistazo (qué día salió qué y qué viene), que cada dato se pueda agendar, y que lo que se comparte de un dato traiga su comparación con el mes anterior y con el año anterior.

## Reglas generales
- **R30. Un dato compartido trae sus dos comparaciones básicas.** El texto y la imagen de un dato suelto (ficha y Novedades) dicen el valor, el del período anterior con su variación y el del mismo período del año anterior con su variación interanual, cuando existen. Las cifras y las variaciones son las de la cabecera de la ficha (`cabeceraFicha(...).deltas`, comparaciones `anterior` y `anio`): las cuentas cierran con lo que se ve.
- **R31. Los grupos de una lista se distinguen sin leer**: el título de cada grupo (día, mes, sección) tiene otro peso, tamaño o fondo que sus renglones, no solo otro texto.

## Qué se cambia
1. **Dos pestañas** (pedido «dos pestañas de novedades y calendario»): `/novedades/` arranca con `Seg` (o el control de pestañas del sitio) «Novedades» | «Calendario». La pestaña va en la URL (`?vista=calendario`; sin parámetro o inválido = Novedades). El título de la página sigue «Novedades y calendario».
2. **Grilla del mes arriba de cada pestaña** (pedido «vista de calendario con un numerito»): lunes a domingo, el mes que corresponde (Novedades: el mes de la publicación más reciente; Calendario: el mes de la próxima fecha), flechas para pasar de mes dentro del rango que tiene datos. Cada día con algo lleva un numerito tipo notificación: la cantidad de **publicaciones** (el IPC con sus 432 series cuenta 1) que salieron (Novedades) o que salen (Calendario; las estimadas cuentan aparte, con el numerito en contorno y «estimado» en su texto accesible). Hoy marcado. Tocar un día con algo baja a ese día en la lista; un día vacío no se puede tocar. A 360 px entra entera (7 columnas, sin deslizar de costado). Accesible: cada día es un botón con «13 de noviembre: 11 publicaciones».
3. **Línea cronológica debajo** (lo de hoy, con ajustes): los días se distinguen (R31): el título del día va con fondo de superficie o una franja, más grande que los renglones, con el número del día destacado, y queda fijo arriba al deslizar dentro de su día (`position: sticky`, sin tapar datos: regla «nada tapa un dato»).
4. **Desplegable de series** (pedido «al desplegar se ven feos y cuando son muchos queda feo»): en lugar de la lista con viñetas, las series se agrupan por subcategoría (`cat[1]`, o «Otros»); cada grupo es un renglón con su nombre y cuántas son; adentro, links compactos (`.chip-c` o una lista en columnas sin viñetas, sin subrayado hasta pasar el cursor). Más de 12 en un grupo: se ven 12 y «Ver las N» despliega el resto. El resumen dice «y 431 datos más: precios por región, precios promedio…» (los nombres de los primeros grupos), no solo el número.
5. **Agendar** (pedido «se podría agendar un dato?»): cada renglón de la pestaña Calendario tiene «Agendar», que abre un desplegable (`Desplegable` de `ui.tsx`) con «Google Calendar» (link `https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=…&details=…`) y «Bajar evento (.ics)» (archivo armado en el navegador, `text/calendar`, nombre `<slug-del-dato>-<fecha>.ics`). El evento: título «<nombre del dato> (<período>) · INDEC», a la hora del calendario (hora argentina, `America/Argentina/Buenos_Aires`, 30 minutos), o de día completo si es estimado (y el título dice «estimado»), descripción con el informe del INDEC y el link a la ficha en el sitio. Las acciones del renglón quedan alineadas en la misma columna («Ver», «Agendar»).
6. **Compartir con comparaciones (R30)**, en la ficha y en Novedades (es el mismo `Compartir`):
   - Texto: `<nombre>: <cifra> en <período>. Mes anterior (<per. anterior>): <cifra ant.> (<variación>). Hace un año (<per. año anterior>): <cifra> (<variación interanual>). Fuente: <fuente>.` Para tasas, la variación en p.p. como en la cabecera. Sin comparación disponible, esa parte no va. En series trimestrales o anuales «Mes anterior» dice «Período anterior».
   - Imagen: la ficha y Novedades pasan esas dos comparaciones como tarjetas generales (`tarjetas: { tipo: "gen", items }` de `VistaImg`), con palabras neutras.
   - Función única en `web/lib/ficha.ts`: `comparacionesCompartir(cab: CabeceraFicha): { texto: string; tarjetas: TarjetaImg[] }` (texto = la parte de las comparaciones) y `textoCompartirFicha(nombre: string, cab: CabeceraFicha, fuente: string): string` (el texto entero). `vistaCompartirFicha` suma las tarjetas. `web/lib/novedades.ts` usa `textoCompartirFicha` para su `texto`.

## Lo que no cambia
- Los datos (`novedades.json`), el bloque de la portada (salvo que use los mismos nombres) y ningún id ni parámetro de URL existente; `vista=` es nuevo en `/novedades/`.

## Cómo se verifica
- `npm run tipos`, `npm run build`.
- `/novedades/`: pestañas, `?vista=calendario` abre Calendario; grilla de noviembre con un número por día igual a la cantidad de publicaciones de ese día en la lista (hoy: 11 el 13, 2 el 12 —IPC y canastas— y 1 el 10); tocar el 13 baja al día; flechas de mes; títulos de día distinguibles; desplegable del IPC agrupado.
- Calendario: grilla con los números de las próximas fechas; «Agendar» → Google Calendar abre con título, fecha y hora correctas (19-nov 16:00 ART = 19:00 UTC); el .ics se baja y tiene `DTSTART` correcto.
- Compartir en `/dato/inflacion-mensual/` y en Novedades: el texto trae mes anterior, variación, hace un año e interanual; la imagen trae las dos tarjetas; las cuentas coinciden con la cabecera.
- A 360 px: grilla entera, sin desborde; Escape y Atrás cierran el desplegable de Agendar.

## Cómo quedó
- Las tarjetas de la imagen son cuatro, de un dato cada una (la imagen dibuja un solo dato por tarjeta general): mes o período anterior, variación mensual o contra el período anterior, hace un año, variación interanual. Se usan cuando quien comparte no eligió tarjetas en Personalizar («Ninguna», el valor por defecto); si elige otras, mandan las suyas.
- Evento de una fecha estimada: «<dato> (<período>) · fecha estimada», de día completo; las del INDEC, «· INDEC» a la hora del calendario.
- Revisor: grilla que conservaba el mes al cambiar de pestaña (`key`), plegado del .ics por octetos, UID con hash y tarjetas que no llegaban a la imagen: corregidos.

## Dónde ver los cambios
Local con `web-out` (`http://localhost:3100<ruta>`); en el sitio, después del commit, el push y la corrida en verde. Página con casillas: `docs/cambios/tanda-13.html`.
1. **Ficha del dato** (`/dato/inflacion-mensual/`): 1.1 texto de Compartir con mes anterior y hace un año; 1.2 cuatro tarjetas en la imagen; 1.3 «Período anterior» en trimestrales y anuales (`/dato/actividad-economica/`).
2. **Novedades y calendario** (`/novedades/`): 2.1 dos pestañas (`?vista=calendario`); 2.2 grilla del mes con numeritos; 2.3 días distinguibles y fijos; 2.4 desplegable agrupado; 2.5 Agendar; 2.6 hora y acciones en un renglón en el celular; 2.7 Compartir con comparaciones.

## Verificación (2026-11-16)
- `npm run tipos` y `npm run build` sin errores.
- Navegador a 375 px (capturas): pestañas y `?vista=calendario`; grillas 1/2/11 el 10/12/13-nov y 1/1/2/1/1 en las próximas; títulos de día; desplegable del IPC agrupado con «Ver las 301»; Agendar al lado de Ver; link de Google Calendar 19:00Z para 16:00; imagen de la ficha con las cuatro tarjetas; sin desborde.
- Sin ver: el .ics abierto en un calendario, 1280 px.

## Segunda vuelta (2026-11-16, después de mirarlo)
7. **Comparaciones al lado de la cifra grande, no como tarjetas** (pedido «ponerla ahi al lado de la etiqueta del 2.2 grande… que se pueda prender y apagar desde la personalización así no compite con las otras tarjetas»):
   - En la imagen, a la derecha de la cifra grande (en su mismo alto, alineado con ella), un bloque chico de dos renglones: «Mes anterior (sep-26) 1,9 % · +0,3 p.p.» y «Hace un año (oct-25) 2,3 % · −0,1 p.p.» (rótulo en texto secundario, cifra y variación en peso fuerte, variación con su signo; palabras neutras). Tiene que entrar en los tres formatos (1:1, 4:5, 16:9): si no entra al lado, va debajo de la cifra en un renglón; nunca tapa la cifra ni la frase.
   - Ya no van como tarjetas: `VistaImg.tarjetas` se reemplaza por `VistaImg.comparaciones?: { rotulo: string; fecha: string; valor: string; variacion: string }[]` y `DatosImagen.comparaciones` (lo que dibuja `imagen.ts`). `comparacionesCompartir` devuelve `{ texto, items }` con esa forma. Las tarjetas vuelven a ser solo las que elige quien comparte (por defecto «Ninguna»).
   - En «Personalizar imagen», un interruptor «Mes anterior y hace un año» (prendido por defecto), guardado en la configuración de la imagen (`config.imagen.comparaciones: boolean`, valor inválido = prendido). Solo aparece cuando la vista trae comparaciones.
   - El texto para copiar no cambia (sigue con las comparaciones).
8. **Grilla sin flechas inútiles y sin hueco a la derecha** (pedido «dos cruces al costado que no tienen uso… en PC deja mucho hueco a la derecha»):
   - Las flechas de mes solo aparecen si hay más de un mes con datos en esa pestaña; si no, el título del mes queda solo.
   - Desde 720 px la grilla ocupa todo el ancho de la columna de contenido, como un calendario de pared: cada día con algo muestra adentro los nombres cortos de sus publicaciones (hasta 2 y «+N más»), además del numerito; las celdas son más anchas que altas. Debajo de 720 px queda como ahora (solo número y numerito).
9. **Días como desplegables grandes** (pedido «que los días se puedan contraer y sean como desplegables grandes»): el título de cada día es el botón que abre y cierra su lista (todo el ancho, 44 px o más, con flecha, `aria-expanded`). Abierto al entrar: el día más reciente en Novedades y el más próximo en Calendario; los demás cerrados, con «N publicaciones: <nombre>, <nombre>…» en el título. Tocar un día en la grilla lo abre y baja hasta él. Cerrado, el título no queda fijo arriba.
10. **Lista de series con deslizador** (pedido «se ve feo cuando hay muchos datos… pone un deslizador»): el contenido de «y N datos más» va en una caja de alto máximo (unos 18 rem) que se desliza por dentro, con los grupos completos (sin «Ver las N»); los títulos de grupo quedan fijos arriba dentro de la caja mientras se desliza. Al abrirlo, la cifra y las acciones del renglón quedan arriba (alineadas con el nombre), no centradas en el alto del desplegable.
11. **Agendar sin espacio arriba** (pedido «se ve feo xq tiene espacio arriba»): en el panel de Agendar la cruz (44 px) va en la esquina, sin renglón propio; las dos opciones empiezan arriba y no pasan por debajo de la cruz.

## Cómo quedó la segunda vuelta (2026-11-16)
- Imagen: comparaciones al lado de la cifra con el tamaño más grande que entre (hasta 1,25 veces el alto de la cifra); si al lado quedarían más chicas que el tamaño base, van debajo de la fecha (en la horizontal 16:9, debajo). Interruptor «Mes anterior y hace un año» en Personalizar (por defecto prendido; la config vieja sin el campo queda prendida). Si en Personalizar la imagen termina en otro mes, no se dibujan (no cerrarían con la cifra grande; lo marcó el revisor).
- Novedades: grilla sin flechas con un solo mes; desde 720 px a todo el ancho con hasta 2 nombres por día y «+N más»; días desplegables (abierto el más reciente o el más próximo, cerrados con el resumen); series en una caja de 18 rem que se desliza, con títulos de grupo fijos; fila alineada arriba; Agendar con la cruz en la esquina.
- Verificado en el navegador: 1280 px (grilla, días, caja de 288 px de alto con 6.650 de contenido) y 375 px (Calendario, Agendar, sin desborde); imagen de la ficha 1:1 y 16:9.
- Sin ver: el .ics abierto en un calendario real; formato 4:5.

## Tercera vuelta (2026-11-16)
12. **Grilla chica y resumen del día** (pedidos «queda feo el calendario tan grande» y «al apretar las casillas del calendario te muestra resumido los datos que hay tipo pop up»; reemplaza la grilla a todo el ancho del punto 8):
   - La grilla vuelve a ser compacta en todos los anchos (como en el celular: número y numerito, celdas cuadradas, unos 22 a 26 rem de ancho máximo, sin nombres adentro). Las flechas siguen solo con más de un mes.
   - **Desde 900 px**: la grilla a la izquierda y, a la derecha, en el resto del ancho, el **panel del día elegido** (sin hueco). Arranca en el día más reciente (Novedades) o el más próximo (Calendario). Tocar otro día con algo cambia el panel (no baja la página). La casilla elegida se marca (`aria-pressed`).
   - **Debajo de 900 px**: tocar un día abre una ventana (`Modal` con `cabecera`: título en el renglón de la cruz, cierra con Escape y Atrás) con el mismo resumen.
   - **El resumen** (un componente para los dos): título «13 de noviembre · 11 publicaciones» (en Calendario «19 de noviembre · 1 publicación»; estimadas marcadas). Un renglón por publicación: nombre y período, cifra y cambio (Novedades; las mismas que la lista) u hora (Calendario), y «Ver» (la ficha). Con más de 6, se ven 6 y «y N más». Abajo, «Ir al día en la lista ↓», que abre ese día en la lista de abajo y baja hasta él (en el celular, cierra la ventana primero).
   - El panel tiene su propio alto (no estira la grilla); si el resumen es más alto que la grilla, la grilla queda arriba (`align-items: start`).

## Cómo quedó la tercera vuelta (2026-11-16)
- Grilla compacta (máx. 26 rem) en todos los anchos; desde 900 px, panel del día a la derecha (`.nov-zona`); debajo, ventana (`Modal`). Seis renglones y «y N más»; «Ir al día en la lista ↓».
- Arreglos: `.modal li { display: flex }` pisaba la grilla del resumen en la ventana (ahora `.nov-res .nov-res-fila`); al pasar a 900 px la ventana se cierra (si no, reaparecía al achicar; lo marcó el revisor).
- Verificado en el navegador: 1280 px (grilla de 416 px + panel de 608 px; tocar otro día cambia el panel sin mover la página) y 375 px (ventana legible, «Ir al día» cierra y baja, Escape cierra).
- Conocido: `Modal` no mueve el foco al abrir ni lo devuelve al cerrar (pasa en todas las ventanas del sitio).
- Cuarta vuelta («no debería ir más profundo que la grilla. de última tener slicer»): desde 900 px el panel toma el alto de la grilla y no lo pasa; muestra todas las publicaciones del día en una lista que se desliza por dentro (sin «y N más»; en la ventana del celular siguen las primeras 6). Verificado a 1280 px: grilla y panel de 324 px, lista de 209 px con 653 de contenido, sin desplazamiento horizontal.
- Quinta vuelta («el dato y la variación no permiten que al expandir los otros datos esos datos ocupen el espacio a la derecha»; «no me gusta el negro ese para el título»): «y N datos más» va en su propia fila del renglón, a todo el ancho (`.nov-resto`, columnas 1 a la última); el título del día y los títulos de grupo pasan del casi negro (`--surface-2`) al azul de relleno del sitio (`--relleno`). Verificado a 1280 px (caja de 1.048 px, cuatro columnas) y 375 px (sin desborde).
