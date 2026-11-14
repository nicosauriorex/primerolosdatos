# Remodelación, cierre: lo que marcó la crítica final

Estado: implementada (2026-11-14); verificada en local y con el revisor (ver docs/ESTADO.md). Sale de la crítica final de Impeccable del 2026-11-14 (26/40, antes 21/40; archivo `.impeccable/critique/2026-11-14T22-32-25Z__web-app.md`). Alcance elegido por el usuario: los tres P1, los dos P2 y los menores; el contador animado sale de las cifras de dato; "Velas" y "Sumar columnas" pasan a la hoja de Ajustes y "T-1" se dice en palabras.

## Objetivo
Que la promesa del producto se cumpla en las páginas a las que llegan los links: **el dato con su fuente a la vista, sin cifras intermedias, y lo que se comparte igual a lo que se ve**. Además, sacar de la vista principal las herramientas de analista y corregir los detalles menores de la crítica.

Reglas generales (las de siempre):
- **Links viejos**: ningún parámetro de URL cambia de significado ni se saca. Si un control pasa a la hoja de Ajustes, el parámetro que escribía (`pvista`, `cl`, etc.) se sigue leyendo y escribiendo igual.
- **Cuentas**: no se escriben cuentas nuevas en los componentes.
- **Ley de colores**: verde = mejor y rojo = peor, siempre con signo o flecha.
- **CSS**: los subagentes no tocan `web/app/globals.css`. El CSS nuevo va en el informe; lo agrega la sesión principal al final de `globals.css`, bajo "Remodelación, cierre".

## Requisitos

### F. Ficha del dato (`components/FichaDato.tsx`, `components/sistema/CabeceraDato.tsx`, `components/sistema/TablaMandatos.tsx`, `components/sistema/CompartirHoja.tsx`, `lib/contexto-dato.ts`, `lib/imagen*.ts`, `components/PanelCompartir.tsx`, `components/secciones/Presidentes.tsx`, `components/sistema/GrillaPresidentes.tsx`)
- **F1. Fuente a la vista (P1).** `CabeceraDato` acepta `fuente?: string` y la muestra en un renglón chico debajo de la cifra (y de las secundarias): "Fuente: <fuente pública> · dato de <mes>". El texto de la fuente es el mismo que imprime la imagen (`fuentePublica`). La ficha (`FichaDato.tsx`) y el Histórico la pasan. Donde `CabeceraDato` se usa sin dato con fuente (Gasto, etc.), no cambia nada.
- **F2. Sin contador (P1).** `CabeceraDato` muestra la cifra directa, sin `Contador`.
- **F3. Compartir principal (P2).** Junto a la cifra, en la cabecera de la ficha, un botón "Compartir" (44 px, con texto) que abre la misma hoja de compartir del capítulo "¿Cómo viene?" (imagen de la serie con el período elegido). En la computadora va a la derecha de la cifra o con los deltas, sin dejar un hueco grande. El "Compartir" del capítulo "¿Cómo viene?" se saca (lo reemplaza el de la cabecera). Los de los otros capítulos quedan, pero con aspecto secundario: botón de ícono de 44 px con `aria-label` "Compartir <capítulo>".
- **F4. Lo compartido es lo que se ve (P2).** La imagen que se arma desde la ficha y desde el Histórico lleva las **mismas frases de contexto** que muestra la cabecera de esa página. Hoy la cabecera calcula con `sinRecord` (y en el Histórico con `sinContraAnio`), y la imagen con las frases por defecto: la ficha dice "3,0 p.p. por encima de su mínimo de ago-16" y la imagen "23,3 p.p. por debajo de su récord de dic-23". Pasar las claves de las frases visibles como `elegidas` a la imagen (o las mismas opciones). Quien comparte puede seguir cambiándolas en el panel.
- **F5. Rangos de la ficha.** Los botones de período del capítulo "¿Cómo viene?" (Desde 2003 / 1 año / 5 años / Todo) marcan el elegido con `aria-pressed=true` y con el estilo de elegido. Sin `fper` en la URL, queda marcado el que se usa por defecto.
- **F6. Herramientas de analista a Ajustes (P2).** En `TablaMandatos` (lo usan la ficha y `/presidentes/`), la elección Tabla/Velas y "Sumar columnas" (los toggles de columnas) salen de la vista y pasan a una `Hoja` "Ajustes de la tabla", que se abre desde un botón "Ajustes" (44 px) en la barra del capítulo. Los parámetros siguen iguales (`pvista`, `cl` y los que haya). Si hay columnas sumadas o se está en Velas, el botón lo dice ("Ajustes · Velas", "Ajustes · 2 columnas más"). Al cerrar, el foco vuelve al botón.
- **F7. Grilla de presidentes a 390 px.** La grilla de 8 datos clave (`GrillaPresidentes`) no deja una columna cortada sin aviso: degradé o sombra en el borde derecho mientras haya más columnas, que desaparece al llegar al final (el mismo recurso que ya usan otras filas deslizables, si existe).

### P. Portada, navegación y presidentes (`components/secciones/Inicio.tsx`, `components/Movimiento.tsx`, `components/Nav.tsx`, `app/layout.tsx`, `components/secciones/VentanaConfig.tsx`, `components/secciones/comunes.tsx`, `lib/estadisticas.ts`, `components/Variables.tsx`, `components/secciones/Herencia.tsx`)
- **P1. Sin contador en la portada (P1).** Las placas y las cifras de "¿Qué datos te interesan?" se muestran directas. `Contador` se borra de `Movimiento.tsx` (ya no lo usa nadie después de F2). Si `/herencia/` u otra página anima una cifra de dato por otro camino ("2 de 19 datos mejor hoy" llegó a verse mientras la frase decía 12), también se saca.
- **P2. Carrusel de la portada con pausa.** Si las placas avanzan solas (en la computadora; en el celular ya no avanzan), un botón visible "Pausar" / "Seguir" (44 px, `aria-pressed`) y una región `aria-live="off"` mientras avanza. Con "reducir movimiento" no avanza, como hoy.
- **P3. Cifras con medida en la portada.** En "¿Qué datos te interesan?", cada cifra dice qué es: unidad o medida corta al lado ("1.937.521 $", "49.726 US$ M", "41,5 %"…), con la misma lógica que ya usa la fila para "interanual". Sin unidad conocida, como hoy.
- **P4. Objetivos de 44 px.** Llegan a 44 px de alto (o de área de toque con `::after`, sin cambiar el aspecto): la barra de subsecciones de Presidentes (hoy 37 px), "Volver" (40), "Configurar" (38×40), "Ver las fuentes" (40), los chips de las preguntas de la portada (32) y los links de una línea como "En qué gasta la Nación" en Provincias (34) si son de este grupo de archivos. "Saltar al contenido" mide 44 px de alto cuando tiene el foco.
- **P5. "T-1" en palabras (P2).** La oración del inicio de mandato (`comunes.tsx`, `lib/estadisticas.ts`) dice "Se cuenta desde el mes antes de asumir" (T-1), "desde el mes de asunción" (T) o "desde el mes después de asumir" (T+1), con las excepciones en palabras ("excepto Milei: desde el mes después de asumir"). La explicación de la ⓘ puede seguir nombrando T-1 como abreviatura, ya definida. `AYUDA_T` se conserva para la configuración.
- **P6. Tema arriba en la configuración.** En la ventana de configuración, "Tema" es la primera opción (hoy está al final, después de las filas de inicio de mandato).
- **P7. ⓘ con nombre.** `BotonInfo` (`Variables.tsx`) lleva `aria-label` "Qué es <nombre público de la variable>" en vez de "Información de la variable" (hoy se repite igual unas 19 veces en `/herencia/`). Si se puede sin tocar su aspecto, pasa a ser un `button` real en vez de `span role=button`.

### H. Herramientas (`components/secciones/Provincias.tsx`, `components/secciones/Semaforo.tsx`, `lib/imagen-semaforo.ts`, `components/secciones/ParteBcra.tsx`, `components/secciones/BloqueParte.tsx`, `lib/diario.ts`, `components/secciones/Gasto.tsx`, `components/GastoEvolucion.tsx` o donde esté el eje, `components/secciones/Historico.tsx`, `lib/historico.ts`, el componente del gráfico de líneas)
- **H1. Provincias sin cifra engañosa (P1).** La aclaración que hoy está solo en la ⓘ ("no es el gasto del gobierno provincial ni incluye la coparticipación" y que en la Ciudad de Buenos Aires figuran las sedes de los organismos) pasa a la frase visible de la apertura, en una oración corta. El "*" junto a "Ciudad de Buenos Aires" tiene su nota visible debajo de la lista ("* Incluye gasto de organismos nacionales con sede en la Ciudad que no se puede ubicar en otra provincia" o el texto que corresponda según el código). La ⓘ puede conservar el detalle largo.
- **H2. Leyenda del Semáforo según la ley de colores.** Revisar con qué regla se pinta cada celda. Si se pinta por `dir` (mejor/peor), la leyenda dice "Verde: mejor. Rojo: peor." (con lo que eso significa: más actividad = mejor). Si se pinta por signo sin mirar `dir`, la leyenda dice eso y además se aclara. Lo mismo en `imagen-semaforo.ts`. La primera columna fija no tapa el primer mes al cargar (la tabla arranca en el último mes a la vista, sin la columna fija encima de una celda).
- **H3. Unidades del Banco Central.** Sin "puntos p.p." (decir "+0,31 p.p." o "+0,31 puntos") ni unidad repetida ("US$ 9 millones / millones de US$ por día" → una sola).
- **H4. Eje del gráfico de Gasto.** Las marcas del eje vertical son números redondos (0 / 100 / 200 / 300, o lo que dé un paso de 1, 2 o 5 × 10ⁿ), no 152,7 y 305,3.
- **H5. Histórico.** (a) "Cambiar dato": el título del dato en la cabecera lleva al lado un botón "Cambiar" (44 px) que abre directo el elegidor de variable (lo mismo que hoy es Ajustes → Variable → lápiz), sin cambiar parámetros. (b) El chip de período dice hasta el mes del último dato (oct-26) y no hasta el mes en curso (nov 2026), cuando no hay `h` en la URL. (c) Las etiquetas "Prom." y "Últ." del gráfico no se pisan: si caen a menos de una línea de distancia, una se corre.

### T. Tipografía (sesión principal, `web/app/globals.css`)
- **T1.** Párrafos y frases con `text-wrap: pretty` (h1 a h3 con `balance`, si no lo tienen) para que no queden palabras solas en el último renglón (la crítica encontró "presidente.", "1999" y "2.066.643)." a 390 px).

## Fuera de esta tanda (anotado)
- `/herencia/`: "12 de 19 datos mejor hoy" como posible veredicto (D-012). Queda para que lo decida el usuario.
- `/contexto/`: el título promete "qué pasaba en el mundo" y abre con carne contra la zona euro.
- `/bcra/`: si "compró" y las tasas deben tener color (revisar la `dir` de esas series).
- Jerga restante en ⓘ y siglas del mosaico (ERI, SDE, LRI: tienen nombre completo al tocarlas).

## Cómo se verifica
1. `npm run tipos` y `npm run build` sin errores.
2. En la vista local a 390 y 1280 px:
   - `/dato/inflacion-mensual/`: la fuente se ve bajo la cifra; la cifra aparece directa (medir el texto en el primer instante, con la pestaña en segundo plano); un solo Compartir junto a la cifra; la imagen abierta desde ahí lleva la misma frase que la cabecera; un rango marcado; Velas y Sumar columnas en Ajustes; `?pvista=velas` sigue abriendo velas.
   - `/historico/`: botón Cambiar abre el elegidor; el chip de período termina en el mes del último dato; la imagen lleva la frase de la cabecera.
   - `/presidentes/?pv=<inflación>&cl=ini,fin,var,n`: columnas respetadas; Ajustes de la tabla abre y cierra con Escape, foco de vuelta.
   - `/`: placas con la cifra final desde el primer instante; cifras con unidad; pausa del carrusel.
   - `/provincias/`, `/semaforo/`, `/bcra/`, `/gasto/`: frase con la aclaración y nota del asterisco; leyenda del semáforo; sin "puntos p.p."; marcas del eje redondas.
   - Objetivos táctiles: contar elementos visibles de menos de 44 px en `/`, la ficha, `/historico/`, `/presidentes/` y `/provincias/` (antes 6, 5, 6, 31 y 6).
   - Sin desborde, un solo h1, consola limpia; tema claro en la ficha y en `/presidentes/`.
3. `impeccable detect` sobre el código y en el navegador en la portada, la ficha y Presidentes: sin los avisos de palabra suelta.
4. Revisor contra esta spec.
