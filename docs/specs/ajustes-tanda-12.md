# Ajustes, tanda 12: el dato actual primero, todas las formas de verlo, y la deuda en Cuentas públicas

Estado: implementada (2026-11-15), publicada en 91aec1b (corrida en verde, run 43794669814; en el sitio: Cambiar dato › Cómo verlo › Por habitante se guarda al cerrar)

Pedido del usuario (2026-11-15, después de las series de deuda):
> «En historico el "Cambiar dato" debería mostrar primero la variable actual por si quiero modificar la forma de verlo y también dentro de "Ajustes". ponele si quiero ver deuda consolidada en % del PBI o si la quiero ver en otra moneda al dolar CCL ponele»
> «no encuentro donde se ve % del pib» (la lista de cambios de la deuda decía «% del PIB en Cómo verlo», y no estaba)
> «ahi podrias tambien agregar la consolidada / pbi, el deficit cuasifiscal» (tema Cuentas públicas)

## Diagnóstico
En la tanda 7 la sección «Variable» salió de la hoja «Ajustes» cuando hay una sola variable, y «Cómo verlo» ofrece como mucho tres medidas (mensual, interanual, valor). Desde entonces, con una variable, no hay forma de llegar a la escala (Total / Por habitante / % del PIB), a la moneda ni a la cotización del dólar (pesos reales, dólares al oficial, CCL, MEP, blue…), ni a «en términos de»: los controles existen (`FilaVariable`, `SelectorMedida` en `web/components/Variables.tsx`) pero no se muestran. La ficha (`/dato/`) tiene el mismo hueco. En series en dólares (deuda) «Cómo verlo» ni aparece.

## Regla general
- **R28. Toda forma de ver un dato se alcanza desde el dato.** Donde se elige o se cambia una variable (Cambiar dato, Ajustes, ficha), el dato actual va primero con todas sus formas de verlo: medida y moneda con su cotización (`SelectorMedida`), escala (Total / Por habitante / % del PIB) si la serie la admite, región y «en términos de» si corresponde. «Cómo verlo» queda como atajo de las tres más usadas, no como el único camino.

## Qué se cambia

1. **Componente nuevo `FormasDeVer`** (`web/components/Variables.tsx`): los controles de `FilaVariable` para una variable ya elegida, sin el botón para cambiarla ni quitarla (región, medida con `SelectorMedida`, escala, «en términos de»). `FilaVariable` lo reutiliza: no se duplica lógica.
2. **«Cambiar dato» (Histórico)**: el elegidor (`Picker`) recibe opcionalmente el dato actual (`pedido.actual: { e, onChange }`). Arriba de la búsqueda, un bloque «Dato actual: <nombre>» con `FormasDeVer`. Cambiar una forma la aplica ya (URL) y la ventana queda abierta para seguir ajustando; la cruz o Atrás la cierran. Elegir otra variable funciona como hoy.
3. **«Ajustes» (Histórico)** con una sola variable: primera sección «Cómo ver el dato» (abierta al entrar por el botón Ajustes) con el nombre del dato y `FormasDeVer`. Después «Más variables», opciones y guardar, como hoy.
4. **Ficha (`/dato/…`)**: junto a «Cómo verlo» (o solo, si no hay atajos, como en las series en dólares) un chip compacto «Más formas de verlo» (`.chip-c`, R24) que abre un `Modal` con `FormasDeVer`; cada cambio actualiza la ficha (mismo `onComoVerlo` con la expresión completa). Así «% del PIB» y «en dólares CCL» se alcanzan desde la ficha de la deuda consolidada.
5. **Tema Cuentas públicas (`/tema/fiscal/`)**: principales nuevos «Deuda consolidada del Tesoro y el Banco Central (% del PIB)» (`deuda_consolidada`, esc `pib`) y «Déficit cuasifiscal del Banco Central (% del PIB)» (`bcra_cuasifiscal`, esc `pib`), cada uno con su dato fijo (`deuda-consolidada-pib`, `deficit-cuasifiscal-pib` en `web/lib/datos-fijos.ts`, medida por defecto de cada serie).
6. Corregir el renglón 2.5 de `docs/cambios/series-deuda.html` y la spec de deuda («% del PIB en Cómo verlo» → «en Más formas de verlo»).

## Lo que no cambia
- Ningún id ni parámetro de URL: las formas de ver ya viven en `v=` (medida, escala, relación).
- «Cómo verlo» sigue igual (atajo).

## Cómo se verifica
- `npm run tipos`, `npm run build`.
- Histórico con `v=deuda_consolidada`: Cambiar dato → «Dato actual» → % del PIB y Dólares CCL cambian el gráfico y la URL; Ajustes → «Cómo ver el dato» igual. Con dos variables, Ajustes sigue con «Variables».
- Ficha `/dato/?v=deuda_consolidada`: «Más formas de verlo» → % del PIB; ficha de inflación sigue con su «Cómo verlo».
- `/tema/fiscal/` con los dos principales nuevos; `npm run previas` sin avisos nuevos.
- A 360 px: el bloque «Dato actual» y la ventana no desbordan; cruz de 44 px, Atrás y Escape cierran.

## Cómo quedó (2026-11-15, después de tres vueltas de mirarlo)
Pedidos al mirarlo: «al desplegar se ve feo (se baja la de total)», «dice pesos blue? que sería eso. no sería en dolares blue», «queda feo ahi y ya esta el "Como verlo"»; después: «debería estar arriba la barra de busqueda. abajo el dato pero tipo selecionable para apretar. cuando lo apretas ahí si te abre tipo pop up para como verlo», «la de tipo de moneda y la de total/habitante/pbi deberian estar una al lado de la otra. y tener el mismo formato desplegable que la de total», «saca eso de como verlo… dejalo como estaba antes»; y por último: «fijate que el titulo no queda a la altura de la X», «debería estar dentro de "mas variables" que ahora se debería llamar distinto y tambien permitir agregar otra asi edito todo de ahí», «si pongo un producto cuando voy a editar el "en terminos de" y le doy listo no lo guarda. recorda que estos bugs se resuelven a nivel app».

- **«Cambiar dato» (Histórico):** la búsqueda arriba; debajo, primer renglón «Dato actual» (nombre y cómo se está viendo) con «Cómo verlo ›»; tocarlo abre la ventana «Cómo verlo» (título = nombre del dato, en el renglón de la cruz) con `FormasDeVer`. Solo sin búsqueda ni carpeta abierta y con una variable.
- **«Ajustes» (Histórico):** una sola sección «Variables» (con una variable o con varias): cada variable en línea con `FilaVariable` (el nombre cambia el dato; región, moneda, escala y «en términos de» ahí mismo) y debajo «+ Agregar una segunda variable» y «+ Agregar gráfico». El punto de color y el nombre van siempre en el mismo renglón.
- **Moneda y escala, en toda la app:** una al lado de la otra, con el mismo desplegable (`Selector`); la medida es la lista plana de `motor.medidasDe` (`SelectorMedidaPlano`). Se borró el selector en pasos (`SelectorMedida`, `.med-desp`). Con «% del PIB» la medida no se muestra.
- **R29 (regla nueva). Título de una ventana en el renglón de la cruz.** `Modal` con `cabecera`: el título visible va a la altura de la cruz, no debajo. Aplicado a todas las ventanas con título (Configuración, Compartir, Información de la variable, Configurar variable, Herencia, Semáforo, Provincias, Mes inicial, VentanaConfig, Cómo verlo).
- **Bug de «Listo» que descartaba lo elegido (a nivel app, `web/components/ui.tsx`):** una marca de capa vieja en la entrada de la página del historial (el navegador la conserva al recargar; Next puede copiar un estado viejo) hacía que al cerrar la hoja se volviera a una entrada «de capa» y se repusiera el link anterior. Ahora, sin capas abiertas, la entrada no lleva marca (se borra al instalar el manejo de capas y ninguna escritura la agrega).
- **Elegir dentro de una ventana y cerrarla no guardaba (cuarta vuelta: «si cambio ponele a por habitante… se aplica el filtro pero al salir no lo guarda», «te cierra todo el menu de golpe y te deja en la página»):** al cerrar una capa, la entrada de abajo del historial trae la URL de cuando se abrió y Next reescribe su URL vieja; el `popstate` de `useParams` podía correr antes que el de `instalarAtras` (el orden no está garantizado), releía esa URL y la página volvía a los filtros de antes (y al rearmarse cerraba la hoja abierta). Arreglo de app: `instalarAtras` publica cuántas capas hay (`__pldCapasAbiertas`) y marca el cierre (`__pldCierraCapa`); `useParams`, al cerrar una capa, no relee la URL: reescribe sus filtros. Un Atrás sin capas relee como antes.
- **«Cómo verlo» de la ficha y de Histórico:** como antes (sin «Más…» ni chip).
- **Pesos a otra cotización para series en dólares:** se agregó y se sacó sin publicar; la versión con sentido quedó en `docs/IDEAS.md`. Las series en pesos se ven en dólares al CCL/MEP/blue desde el mismo desplegable.
- Tema Cuentas públicas: `deuda_consolidada` y `bcra_cuasifiscal` en % del PIB, datos fijos `deuda-consolidada-pib` y `deficit-cuasifiscal-pib`.

**Verificado (cuarta vuelta):** dos ventanas + escala cerrando con cruces, con Escape y con el Atrás del navegador: se guarda; Ajustes → moneda: la hoja sigue abierta y Listo guarda; Atrás/Adelante entre dos links de la misma página releen; link dentro de la hoja navega y un solo Atrás vuelve.
**Verificado (tercera vuelta):** `tipos`, `build`. Bug: con la marca vieja forzada, Ajustes → «en términos de» → Asado → Listo guarda `rel=pp_gba_asado` y la marca queda limpia (antes volvía al link anterior). Ajustes: punto, nombre e «i» en un renglón, moneda y escala lado a lado en el siguiente. Títulos: mismo centro que la cruz y sin pisarla en «Cómo verlo», Herencia, Configuración e Información de la variable (también dentro del elegidor), sin desborde a 375 px. Capturas: varias salieron cortadas por el panel del navegador; lo último se verificó midiendo.
## Dónde ver los cambios
Página con links y casillas: `docs/cambios/tanda-12.html`. Local `http://localhost:3100<ruta>`; publicado después del commit, el push y la corrida en verde (solo toca `web/`: modo rápido).
1. Histórico: «Cambiar dato» → «Dato actual» → «Cómo verlo»; «Ajustes» → «Variables» (todo en línea); «Listo» guarda «en términos de» — `/historico/?v=deuda_consolidada`
2. Todas las ventanas: título a la altura de la cruz — por ejemplo `/herencia/` (tocar un dato «informe»)
3. Temas › Cuentas públicas: consolidada y cuasifiscal en % del PIB — `/tema/fiscal/`
