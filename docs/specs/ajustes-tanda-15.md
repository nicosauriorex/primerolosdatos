# Ajustes de la tanda 15

Estado: implementada (2026-11-18), publicada en c017dec (corrida en verde, run 44301938911)

Pedidos del usuario al recorrer la página (2026-11-17, anotados en `docs/IDEAS.md`):

- «En el ver en el Mes a mes, desde que asumió de las fichas de datos que la animación no es tan fluida como la de presidentes. y no deja filtrar hasta un cierto mes.»
- «como podemos poner mes de inicio de mandato configurable, también poder poner mes de fin de mandato configurable. Ponele si quiero computar la inflación interanual de los presidentes desde diciembre a diciembre. Entonces alberto sería dic 19 a dic 23.»
- «¿Cómo fue octubre en otros años?» → Compartir → Imagen: «fijate que la linea de alto deberia ser más cortita y arrancar desde el centro de la barra. sino parece que es el ultimo dato.»

Cada pedido es un caso de una regla general: se buscan y corrigen los casos del mismo tipo en todo el sitio.

## 1. Fin del mandato configurable

### Qué ve y hace el usuario
1. En **Configuración** (⚙), debajo de «Inicio del mandato», hay una sección **Fin del mandato** con la misma forma: «Para todos» y la lista de presidentes con «Igual que todos» o un valor.
2. El fin se expresa respecto de **F = el mes en que asume el sucesor**: `F+k`, con `k` entre **-12 y +12**. Se muestra «F-12» … «F-1 (mes antes de que asuma el siguiente)», «F (mes en que asume el siguiente)», «F+1» … «F+12». Una línea de ayuda: «F = mes en que asume el siguiente presidente. F-1 = último mes completo del mandato.»
3. Por defecto **F-1** para todos: con eso todo el sitio muestra exactamente lo mismo que hoy.
4. Ejemplo del usuario: Inicio «T (mes de asunción)» y Fin «F» → Alberto Fernández va de dic-19 a dic-23 y su inflación es la de diciembre a diciembre.
5. El presidente en ejercicio (sin sucesor) no tiene fin configurable: su fin sigue siendo el último dato. No aparece en la lista de excepciones del fin.

### Requisitos
1. `BaseCfg` (`web/lib/config.ts`) suma `tf: number` y `tfp: Record<string, number>` (mismas reglas que `t0`/`t0p`: `limpiarBase`, `mismaBase`, `esBaseDeFabrica` los consideran). La configuración guardada (`pld:config`) suma `tf` y `tfp`; si faltan o son inválidos, F-1 y sin excepciones (lo guardado antes sigue valiendo).
2. URL: parámetros nuevos `tf` (entero de -12 a 12) y `tfp` (ej. `af:0,macri:0`). La URL gana sobre la configuración, como con `t0`. Se agregan al link solo cuando el fin no es el de fábrica (F-1), así un link compartido muestra lo mismo a cualquiera y los links viejos siguen mostrando lo mismo. `PARAMS_BASE` y todo lo que arma o lee `t0`/`t0p` (links de compartir, «Estás viendo el inicio de mandato del link · Usar el mío») trata igual a `tf`/`tfp`.
3. Nueva función en `web/lib/estadisticas.ts`: `finIdx(F: string[], p: Pres, b: BaseCfg): number` = índice del último mes que se cuenta para el mandato: con sucesor, `asunción del sucesor + k`, sin pasar del último mes con datos (`F.length - 1`) ni de `baseIdx(F, p, b) + 1`; sin sucesor, `p.i1`. Con F-1 da exactamente `p.i1`.
4. Se usa `finIdx` en lugar de `p.i1` donde `p.i1` significa «hasta dónde se cuenta el mandato»: `statsMandato` (ventana de valores y valor final; la regla de cierre de series anuales se aplica sobre el nuevo fin), `calcularMandato` (`maxMes` y las curvas), hitos de Meses de mandato, Por presidente (tablas, sparklines y su imagen), Ranking, Curiosidades (período «desde … hasta» de cada mandato), Herencia («al entregar»), la ficha del dato y las imágenes de presidentes (`imagen-presidentes.ts`, `imagen-hitos.ts`, `imagen-datos.ts` en las tarjetas por presidente), y los textos «de <mes> a <mes>» de un mandato (`periodoMandato` de `tablas.ts`).
5. **No** cambia donde `p.i1` significa «quién gobernaba ese mes»: franjas de color de los gráficos (`franjasPres`), asignar un mes a un presidente (Curiosidades), Contexto internacional, precios contra el mundo y Elecciones (que ya tiene su propio corte, el mes antes de la elección).
6. Textos: `baseResumen` y la línea «Inicio: … · Configurar» (`LineaInicio` en `comunes.tsx`) suman «Fin: F» (con sus excepciones) solo cuando el fin no es el de fábrica. `oracionInicio` y `baseTxt` suman «hasta el mes en que asume el siguiente» / «hasta N meses después de que asuma el siguiente» solo cuando no es el de fábrica. Con el de fábrica, los textos quedan igual que hoy.
7. «Volver a lo de fábrica» también restablece el fin.
8. Sin `<select>` nativo (se usa el mismo control que el Inicio). A 375 px el panel entra y no se desliza de costado.

## 2. Mes a mes en la ficha del dato: animación fluida y filtro de meses

### Qué ve y hace el usuario
En `/dato/<slug>/` y en la ficha de cualquier dato, el capítulo **Mes a mes, desde que asumió** se dibuja con el mismo movimiento continuo («lápiz») que **Meses de mandato** de Presidentes, en vez de saltar de a un mes. Debajo del gráfico están los mismos dos deslizadores **Desde mes / hasta mes** que en Meses de mandato.

### Requisitos
1. El movimiento del lápiz (avance continuo con `requestAnimationFrame` y recorte a la derecha con `clip-path`, el tramo siguiente que se descubre de a poco) sale de un solo lugar: un hook nuevo (por ejemplo `web/components/useLapiz.ts`) que usan Meses de mandato (`Mandato.tsx`) y la ficha (`FichaDato.tsx`). Meses de mandato tiene que verse y comportarse igual que hoy.
2. La ficha conserva lo que ya tenía: arranca sola cuando el gráfico está a la vista (y no antes), se pausa al tocarlo, respeta «reducir movimiento» (sin animación y todo a la vista) y tiene los controles Repetir, Pausa/Seguir y Velocidad (0,5×, 1×, 2×). La duración a 1× es la misma que la de Meses de mandato para la misma cantidad de meses.
3. Filtro: deslizadores «Desde mes» y «hasta mes» como los de Meses de mandato (mismas reglas: siempre quedan al menos 2 meses; mover uno empuja al otro). Viven en la URL con los mismos parámetros `md` y `mh` (un link a la ficha con `mh=24` abre el gráfico hasta el mes 24) y se pasan a Compartir y al link «Ver en Meses de mandato» (hoy van `md: null, mh: null`). Cambiar el filtro reinicia la animación desde el nuevo «desde».
4. Barrido: cualquier otra animación de «dibujo» mes a mes del sitio usa el mismo hook; cualquier otro gráfico por mes de mandato sin filtro de meses lo suma (listar lo encontrado en el informe).

## 3. Imagen «¿Cómo fue <mes> en otros años?»: la línea de «El más alto»

### Requisitos
1. La línea punteada de «El más alto: … (año)» deja de cruzar todo el ancho: arranca en el centro de la columna más alta y llega solo hasta el otro extremo del rótulo (cubre el tramo entre la columna y el texto), así se lee que marca esa columna y no el último dato.
2. Un punto chico en el centro de la columna, donde arranca la línea.
3. Barrido: las demás imágenes compartibles (`web/lib/imagen*.ts`) con una línea de referencia que cruza todo el ancho y marca un solo valor de una sola barra o punto pasan a la misma forma. Las líneas que son referencia de todo el gráfico (el cero, un promedio, una meta) quedan como están.

## 4. El fin acompaña al inicio, a qué secciones se aplica y Herencia (pedido del 2026-11-18)

Pediste: «por default seria T+1 inicio y el fin tambien asi tiene sus 4 años. desde config como un slicer de seleccion multiple para elegir a que aplica, pero por default a todo» y «si, vincula herencia tambien». Elegiste: el fin acompaña al inicio, y el inicio de fábrica sigue en T-1 (el sitio de fábrica muestra lo mismo que hoy).

**Cambio de decisión (2026-11-18):** «la mayoria de lugares ya usan dic a dic… el proximo presidente tambien asi que es parejo». Lo de fábrica pasa a ser **dic a dic: inicio T y fin igual al inicio (F)**. Cambian los números por presidente de todo el sitio (Alberto F.: de +930,7 % a +1.146,5 %). Los links compartidos sin inicio elegido pasan a mostrar dic a dic (aceptado por el usuario: no se pueden distinguir de un link nuevo). Los que traen `t0`/`t0p` sin `tf` siguen leyendo el fin como F-1. Donde la sección 4 dice «T-1» como lo de fábrica, vale T.

### Requisitos
1. **Fin «Igual que el inicio»**: nueva opción de «Para todos» en Fin del mandato, primera de la lista y **de fábrica**. Con ella, el fin de cada presidente es `F + k` con `k` = su inicio (`kDe(b, id)`): T-1 → F-1, T → F, T+1 → F+1. Así cada mandato tiene sus 4 años (48 meses en uno de 4 años). Las excepciones por presidente del fin siguen siendo números. En `BaseCfg`, `tf: number | null` (null = igual que el inicio); `kfDe(b, id) = b.tfp[id] ?? (b.tf ?? kDe(b, id))`. El rango del inicio (-12 a +24) puede llevar el fin más allá de F+12: se recorta como siempre al último dato. Ayuda en el panel: «Igual que el inicio: si se cuenta desde T+1, se cuenta hasta F+1; así cada mandato dura lo mismo».
2. **Links**: los links compartidos tienen que seguir mostrando lo mismo. Un link viejo con `t0`/`t0p` y sin `tf` significaba fin F-1: se sigue leyendo así. Por eso, cuando la vista lleva `t0` o `t0p` (inicio distinto del de fábrica), el link **siempre** lleva `tf`: `tf=i` para «igual que el inicio» o el número. Un link sin `t0`, `t0p`, `tf` ni `tfp` es de fábrica (T-1 e igual que el inicio = F-1). `tf=i` sin `t0` también vale. Lo guardado en el navegador sin `tf` pasa a «igual que el inicio».
3. **Textos**: «de fábrica» del fin es `tf = null` sin excepciones. Con el inicio de fábrica y fin igual al inicio, los textos quedan como hoy. Con inicio no de fábrica y fin igual al inicio, `oracionInicio` dice «Se cuenta desde el mes de asunción hasta el mes en que asume el siguiente» (el fin en palabras, derivado); `baseResumen`/la línea corta: «T · Fin: igual» o similar, breve.
4. **A qué secciones se aplica**: en Configuración, debajo de Inicio y Fin, «Se aplica en» con chips de selección múltiple (`.chip-c`, `aria-pressed`), todas marcadas de fábrica: Por presidente, Meses de mandato, Ranking, Curiosidades, Elecciones, Herencia, Fichas y temas. Se guarda en `pld:config` (`aplica`, lista de ids; si falta o es inválido, todas). Una sección desmarcada usa el inicio y el fin de fábrica (T-1, igual que el inicio), salvo que la URL traiga `t0`/`t0p`/`tf`/`tfp` (el link siempre gana). `useBase` recibe el id de la sección. En una sección desmarcada, la línea «Inicio: … · Configurar» lo dice: «Esta sección usa el inicio de fábrica (T-1) · Configurar».
5. **Herencia sigue la configuración** (y la selección del punto 4, id `herencia`): sale `BASE_HERENCIA` fija; la página, su imagen y su texto usan la base de `useBase`. «Recibió» = último dato en o antes del mes de inicio del presidente que asume (`baseIdx` con su k; con T-1 es lo de hoy), con el mismo tope de atraso. «Entregó» = último dato en o antes de `finIdx` del que entrega. El año cerrado de los flujos en % del PIB (`recibioCerrado`) se mantiene. Los textos que dicen «T-1» o el mes de «lo que recibió» usan el mes real. La vista «de un presidente a otro» (`traspasos`) también. Los links y la imagen de Herencia llevan los parámetros como las otras secciones. Con `t0=-1` explícito, Herencia muestra exactamente lo mismo que hoy; con lo de fábrica nuevo (T), «recibió» pasa a ser el dato del mes de asunción (Milei: dic-23).

## 5. Panel de mandatos con meses reales y excepciones por presidente (pedido del 2026-11-18)

Pediste: «una opción de para todos. por default viene como dijimos recien. y abajo cada presidente para establecer sus excepciones. ponele milei quiero desde enero a dic. capaz en esta que esta cada presidente directamente poner el slicer y el mes real y entre parentesis si es T o T+1, etc. y al lado otro de para donde aplica.» Elegiste: «dónde aplica» propio de cada presidente; el fin de Milei elegible.

### Qué ve y hace el usuario
En ⚙, las secciones «Inicio del mandato», «Fin del mandato» y «Se aplica en» se juntan en una sola, **Mandatos**:
- Renglón **Para todos**: Inicio (T-1, T, T+1…; de fábrica T), Fin (Igual que el inicio, F-1, F, F+1…; de fábrica Igual que el inicio) y **Se aplica en** (las secciones, todas de fábrica).
- Debajo, un renglón por presidente (todos, Milei incluido) con tres controles: **Desde** con el mes real y su T entre paréntesis («ene-24 (T+1)»), **Hasta** con el mes real y su F («dic-27 (F)»), y **Dónde** (en qué secciones vale su excepción). La primera opción de Desde y Hasta es «Igual que todos (dic-23)», con el mes que da Para todos.
- Ejemplo del usuario: Milei Desde «ene-24 (T+1)», Hasta «dic-27 (F)».

### Requisitos
1. Desde/Hasta por presidente: mismas excepciones de hoy (`t0p`, `tfp`), mostradas como mes real + T/F. Rango de Desde: T-12 a T+24; de Hasta: F-12 a F+12. Meses fuera de los datos se muestran igual (el cálculo recorta como hoy).
2. **Milei (el presidente en ejercicio)** tiene Hasta elegible: su F es el fin de mandato previsto, **dic-27** (dato nuevo en `PRES_DEF`, p. ej. `finPrevisto: "2027-12"`). `finIdx` del presidente sin sucesor = `min(F previsto + k, último dato)`: mientras no haya datos hasta ese mes, se cuenta hasta el último dato y el texto lo dice («hasta el último dato; fin previsto dic-27»). Con lo de fábrica da exactamente lo mismo que hoy. `limpiarBase`, `finConExc` y `finDeFabrica` dejan de excluir al último presidente.
3. **Dónde por presidente**: `aplicaP: Record<id, string[]>` en `pld:config` (se guarda solo si difiere de «todas»). En la sección S, el presidente p usa su excepción de Desde/Hasta solo si S está en su Dónde; si no, usa lo de Para todos de esa sección. El Dónde de Para todos (el `aplica` de hoy) decide si la sección usa Para todos o lo de fábrica. `baseDeSeccion` arma la base efectiva de la sección con las dos reglas; los links siguen llevando esa base ya resuelta (`t0`, `t0p`, `tf`, `tfp`): **no hay parámetros de URL nuevos**. Control: un `Desplegable` o botón compacto que abre la lista de secciones con casillas («Todas» / «3 secciones»), sin `<select>` nativo; deshabilitado (o con «—») si el presidente no tiene excepción.
4. Lo que ya existe se mantiene: lo de fábrica (T e igual que el inicio), «Volver a lo de fábrica» (borra excepciones y Dónde), links viejos, la línea «Inicio: … · Configurar» de cada sección y sus textos (las excepciones se nombran con el mes real cuando ayuda: «Milei: desde ene-24 hasta dic-27»).
5. A 375 px: cada presidente en un bloque (nombre arriba, los tres controles debajo, en una o dos líneas), sin deslizar de costado. Controles compactos (R24). En PC, una fila por presidente con los controles alineados en columnas (regla «acciones alineadas»).

## Cómo se verifica
- `cd web && npm run tipos && npm run lint && npm run build`, sin errores.
- `npx tsx` con un script de prueba sobre los JSON locales: con Inicio T y Fin F, Alberto Fernández va de dic-19 a dic-23 en `statsMandato` y su variación del IPC coincide con el acumulado de 2020 a 2023 (índice dic-23 / dic-19). Con la configuración de fábrica, `finIdx` = `p.i1` para todos y los resultados de `statsMandato` y `calcularMandato` son idénticos a los de antes.
- Navegador (`web-out`, puerto 3100): panel de Configuración con la sección nueva a 1280 y 375 px; `/presidentes/?tf=0&t0=0` muestra a Alberto «dic-19 a dic-23»; un link sin `tf` muestra lo mismo que hoy; la ficha `/dato/inflacion-mensual/` con `mh=12` corta en el mes 12 y la animación avanza con el lápiz (con el panel a la vista); la imagen de «¿Cómo fue <mes> en otros años?» con la línea corta.
- Revisor contra esta spec.

## Verificación (2026-11-18)
- `npm run tipos`, `npm run lint` y `npm run build` sin errores.
- Script con el Motor real: de fábrica `finIdx === p.i1` para los 10 presidentes; con `t0=0, tf=0` Alberto va de dic-19 a dic-23.
- Navegador (`web-out`): `/presidentes/?t0=0&tf=0` → Alberto «dic-19 a dic-23», +1.146,5 % (igual al acumulado 2020-2023); `/presidentes/` sin parámetros, idéntico al sitio publicado (+930,7 %, dic-19 a nov-23); ficha con `mh=12` corta en el mes 12, el deslizador escribe `md`/`mh` y empuja al otro, el link a Meses de mandato lleva `mh`; panel de Configuración a 375 px sin desborde; imagen de «octubre en otros años» en 1:1 y 16:9 con la línea corta pegada a la columna de 2023 (captura).
- Sin verificar: la animación en movimiento (con el panel del navegador oculto no corren `IntersectionObserver` ni `requestAnimationFrame`).
- Revisor: dos problemas en la primera pasada (`finIdx` con inicio tardío y fin de fábrica daba `p.i1 + 1`; texto de excepciones del fin que podía salir vacío), corregidos; segunda pasada limpia.
- Decidido primero que Herencia quedaba fija; después el usuario pidió vincularla (sección 4).
- Sección 4 (navegador): de fábrica Alberto «dic-19 a dic-23», +1.146,5 %, frase «Se cuenta desde el mes de asunción hasta el mes en que asume el siguiente»; `?t0=0` (link viejo) da dic-19 a nov-23; `?t0=-1` da +930,7 % (igual al sitio publicado); con la config en T+1 la URL pasa a `?t0=1&tf=i`; Herencia desmarcada en «Se aplica en» muestra «Esta sección usa el inicio de fábrica (T)» y recibió dic-23; panel a 375 px sin desborde, chips de 32 px. Script: Herencia con `t0=-1` = base fija vieja en 63 filas, 0 diferencias. Animación de la ficha medida con el panel a la vista: el recorte avanza unos 15 px cada 250 ms, sin saltos.
- Revisor de la sección 4: imagen de Compartir sin `aplica` ni el link (arreglado: base del link o de «Fichas y temas»), textos de Herencia con «T-1» (arreglados); chips de 32 px en la ventana se dejan (regla: una fila de chips es compacta en todos lados).
- Sección 5 (navegador): panel «Mandatos» con Para todos y una fila por presidente; Milei Desde «ene-24 (T+1)» / Hasta «dic-27 (F)» elegidos en el panel → URL `?t0=0&t0p=milei%3A1&tf=i&tfp=milei%3A0`, tabla «Milei ene-24 a hoy», frase «… excepto Milei: desde el mes después de asumir hasta dic-27 (fin previsto; …)»; Dónde de Milei solo en Por presidente → Herencia sigue en dic-23; 375 px sin desborde ni textos cortados. Script: de fábrica, `finIdx` y `statsMandato` idénticos a antes de la sección 5 en 5 bases.
- Ajustes míos en la sección 5: la opción «Igual que todos» pasó a «= dic-23 (T)» (cortada no dejaba ver el mes); la frase junta desde y hasta de cada presidente; el período de las tablas arranca en el mes de inicio real (con `?t0=-1`, «nov-19 a nov-23»); nombre accesible para Dónde; el panel de Dónde se lleva a la vista al abrirlo.
- Revisor de la sección 5: «hoy» del período con un fin de Milei antes del último dato, período de un presidente anterior al primer mes de datos y aviso «de fábrica» que no nombraba las excepciones por presidente: corregidos.

## Dónde ver los cambios
Página: `docs/cambios/tanda-15.html`. Local `http://localhost:3100<ruta>`; publicado `https://primerolosdatos.com.ar<ruta>` después del push.
1. Configuración (⚙): 1.1 sección «Fin del mandato» — `/presidentes/` y abrir ⚙. Pediste: «también poder poner mes de fin de mandato configurable».
2. Ficha del dato: 2.1 animación con lápiz — `/dato/inflacion-mensual/#fi-mandato` (pediste: «la animación no es tan fluida»); 2.2 Desde / hasta mes — `/dato/inflacion-mensual/?mh=12#fi-mandato` (pediste: «no deja filtrar hasta un cierto mes»); 2.3 Compartir y «Ver en Meses de mandato» con el corte (agregado por mí: lo que se ve se comparte igual); 2.4 línea de «El más alto» — `/dato/inflacion-mensual/#fi-meses` → Compartir → Imagen (pediste: «la linea de alto deberia ser más cortita»).
3. Por presidente: 3.1 Alberto dic-19 a dic-23 — `/presidentes/?t0=0&tf=0` (pediste: «alberto sería dic 19 a dic 23»); 3.2 la línea «Se cuenta desde… hasta…» (agregado por mí).
4. Meses de mandato: 4.1 con fin F, un mes más por presidente — `/mandato/?t0=0&tf=0`; 4.2 «▶ Animar» igual que antes, con el motor compartido — `/mandato/` (agregados por mí: barrido).
6. De fábrica y Herencia (sección 4): 6.1 lo de fábrica es dic a dic — `/presidentes/` (pediste: «la mayoria de lugares ya usan dic a dic»); 6.2 fin «Igual que el inicio» y «Se aplica en» en ⚙ (pediste: «un slicer de seleccion multiple para elegir a que aplica»); 6.3 Herencia sigue la configuración — `/herencia/` (pediste: «vincula herencia tambien»); 6.4 links viejos con `t0` siguen igual — `/presidentes/?t0=-1` (agregado por mí: los links compartidos no cambian de significado).
7. Panel de mandatos (sección 5): 7.1 una fila por presidente con Desde / Hasta en mes real y su T o F — `/presidentes/` y abrir ⚙ (pediste: «poner el slicer y el mes real y entre parentesis si es T o T+1»); 7.2 Dónde por presidente (pediste: «al lado otro de para donde aplica»); 7.3 fin de Milei elegible, dic-27 previsto (pediste: «milei quiero desde enero a dic»); 7.4 el período de la tabla arranca en el mes de inicio real (agregado por mí: que el rótulo diga lo que se cuenta).
5. Ranking y Curiosidades: 5.1 y 5.2 períodos y variaciones con el fin elegido — `/ranking/?t0=0&tf=0`, `/curiosidades/?t0=0&tf=0` (agregado por mí: barrido).
