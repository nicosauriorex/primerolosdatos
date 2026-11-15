# Chips compactos en todo el sitio (y cierre de Contexto)

Estado: implementada (2026-11-15), sin commit.

Origen: pedido del 2026-11-15 en la tercera vuelta de Contexto: «lo de los chips chicos está bueno también para toda la página» (anotado en `docs/IDEAS.md`). En la misma tanda: revisor sobre la cuarta vuelta de Contexto (`docs/specs/remodelacion-contexto-precios.md`) y el corte de la zona euro, Chile y EE.UU. en precios contra el mundo (IDEAS).

## Regla (R24, en `.claude/rules/frontend.md`)
Los controles que están **en la página** (filas de chips `FilaChips`, chips de la barra de vista `BarraVista`, botones Ajustes y los que abren una ventana, Elegir fechas del Banco Central, Repetir/Pausa y leyenda de la ficha) se ven de **32 px**, con borde fino (`--border`), fondo de superficie (`--surface-1`) y texto chico; el área de toque sigue siendo de **44 px** (`::before` de 6 px arriba y abajo, o el botón que envuelve al cuerpo del chip). Elegido: fondo `--acento`. Las listas de opciones **dentro** de una hoja o ventana (botones de opción, rieles `Seg`, píldoras de elección múltiple) siguen de 44 px a la vista; una fila de chips (`FilaChips`) es compacta también dentro de una hoja (antes medía 36 px).

Un solo bloque al final de `web/app/globals.css` ("R24"); un control nuevo usa `.chip-c`. Se borraron las reglas viejas de cada clase (`globals.css`, `contexto.css`, `bcra.css`, `ficha.css`) para que no se pisen. La leyenda de la ficha usa `::after` para el toque porque `::before` es la línea de color.

No cambia: los rieles `Seg`, las píldoras de elección múltiple de las hojas (`resbar-pil`), las pestañas de la ficha, Volver.

## Contexto: lo que marcó el revisor (cuarta vuelta)
1. **Bloqueante, corregido**: los links con uno solo de rubro (`pqr`/`pmr`) o "contra" (`pqc`) cambiaban de significado con el nuevo valor por defecto (consumo total contra el mundo). Ahora el valor nuevo vale solo si el link no trae ninguno de los dos; si trae uno, el otro se completa con el de antes (carne / zona euro), como los links de `plantillas.ts`. Al elegir, rubro y "contra" se escriben juntos (o ninguno, si son los de por defecto).
2. Frase de un período de presidente: dice los meses que de verdad entraron en el promedio de esa fila, igual que la barra ("promedio de Milei, dic-23 a sep-26").
3. Deslizador: centra la fila elegida (`data-id` en `GraficoBarrasH`), no la primera resaltada; si el cambio vino de tocar una fila de la misma lista, no recentra.
4. Visto y no cambiado: `yaDibujado` se marca durante el render en `Contexto.tsx` (funciona).

## Zona euro, Chile y EE.UU. cortados
- **Zona euro**: Eurostat congeló `prc_hicp_midx` (ECOICOP 1) en dic-2025 y desde febrero de 2026 publica `prc_hicp_minr` (ECOICOP 2, base 2025 = 100, el total es `TOTAL`). `pipeline/precios_mundo.py` ahora empalma las dos en el último mes en común, con la misma regla que la OCDE: solo los códigos que no cambian de contenido. Llega a sep-26 (total oct-26). Comunicación (08), Recreación (09) y Bienes varios (12) cambian de contenido en ECOICOP 2 y quedan en dic-25. Control: la ropa baja 12,5 % en ene-26 contra 11,9 y 12,7 % en los eneros anteriores (rebajas de temporada, no salto del empalme).
- **EE.UU. y Chile**: la OCDE dejó de publicar sus divisiones (EE.UU. desde ene-25, Chile desde ene-24), en las dos clasificaciones: solo siguen el total y alimentos. México corta 08, 09 y 12 en jul-24 por el cambio de contenido. No se corrigió: hace falta otra fuente (EE.UU.: BLS, IPC por grupo, pública; Chile: INE). Queda en IDEAS.

## Cómo se verifica
- `npm run tipos` y `npm run build`.
- Links: `/contexto/?pqr=carne` → contra la zona euro; `/contexto/?pqc=USA` → carne; `/contexto/` → consumo total contra el mundo; tocar Salud en Por rubro → `?pqr=06&pqc=mundo` y tocarla de nuevo vuelve a `/contexto/`.
- Medir en las rutas a 360 y 1280 px: los controles de la página miden 32 px, el toque 44, sin desborde ni pantalla de error.

## Dónde ver los cambios
Página: `docs/cambios/chips-compactos.html` (Artifact https://claude.ai/artifact/NZkZwyit7AHYhsbGhLFXfp). Local con la vista `web-out` (`http://localhost:3100<ruta>`); en el sitio (`https://primerolosdatos.com.ar<ruta>`) recién después del commit, el push y la corrida completa (toca `pipeline/`: ~10 minutos).
1. Portada `/`: chips compactos.
2. Histórico `/historico/`: barra de vista y chips.
3. Ficha `/dato/?s=ipc`: Cómo verlo, leyenda, Repetir/Pausa.
4. Presidentes `/presidentes/`: Ajustes y chips.
5. El mundo: links viejos `/contexto/?pqr=carne` (contra la zona euro) y `/contexto/?pqc=USA` (carne); zona euro a sep-26 `/contexto/?pqc=EA`; frase de Milei `/contexto/?pqr=03&pqc=EA&pqa=p-milei`; deslizador Por país `/contexto/?pqd=BRA&pqc=CHN`.
6. Más: `/ranking/`, `/elecciones/`, `/herencia/`, `/provincias/`, `/gasto/`, `/semaforo/`, `/congreso/`.
7. Banco Central `/bcra/?v=minorista`: período y Elegir fechas.

## Verificado (2026-11-15)
- `npm run tipos` y `npm run build` sin errores. `pipeline/precios_mundo.py` corrido solo (con red) y `--solo-json`: 86 series de IPC; zona euro hasta sep-26 (total oct-26), 08/09/12 en dic-25; ropa ene-26 −12,5 % (eneros anteriores −11,9 y −12,7 %).
- Navegador del panel (vista local en 3100): los cuatro casos de links de Contexto dan la frase esperada; tocar Salud → `?pqr=06&pqc=mundo` y otra vez → sin parámetros.
- Medido en 16 rutas a 360 y 1280 px: todos los controles de la página miden 32 px, el toque mínimo 44 px, sin desborde ni pantalla de error. `/bcra/?v=minorista`: los seis chips del período a 32 px en una fila de 44 sin nada encima.
- Revisor: sin bloqueantes; corregidos el respaldo de Eurostat (si falla la tabla nueva se usa la copia anterior) y el texto de R24 sobre los chips dentro de las hojas.
- Sin verificar: aspecto en captura de cada página (solo se vio `/bcra/`), tema claro, celular real. Un link viejo solo con `pqd`/`pqa`/`pvr` muestra consumo total contra el mundo (cambio ya publicado en a74107c).

## Segunda vuelta (2026-11-15, comentarios del usuario sobre la página de cambios)
- **Extra, cabecera del Histórico** («Compartir y cambiar dato hace que la etiqueta de inflación principal arranque más abajo… todas las variaciones desplegadas ocupan mucho espacio… empuja el gráfico para abajo»): en computadora (≥ 900 px) Compartir y "Cambiar dato" van arriba de la columna derecha (el título arranca arriba de todo) y las cinco comparaciones de más (inicio, promedio, mediana, máximo, mínimo) pasan a un chip "Más comparaciones (5)" que abre un panel flotante encima de la página (`Desplegable`: cruz, Escape, Atrás, clic afuera) sin empujar el gráfico. Vale también para la ficha (`/dato/`) y los temas: es la misma `CabeceraDato`. En el celular no cambia (plegable). Medido a 1600×835: el gráfico empieza a 354 px (antes, por debajo del pliegue); a 960 px los botones no tocan el título; abrir el panel no cambia el alto de la página.
- **5.3** («no se lee lo que dice abajo de la etiqueta… promedio ene-…»): el texto bajo el nombre en los gráficos de barras baja de renglón en vez de cortarse; el nombre tiene `title` con todo. Medido: los tres presidentes muestran "promedio ene-17 a nov-19" etc. completos en dos renglones.
- **5.4** («si la apreto me mueve de donde estoy»): reproducido en el sitio publicado a 1600×835 con la página bien abajo: tocar China la subía 358 a 382 px. Causa: el anclaje de desplazamiento del navegador elegía un elemento de los gráficos que cambia al tocar. Arreglo: `overflow-anchor: none` en los tres gráficos (`.pmc-tres`) y en todo `GraficoBarrasH`. Medido después: 0 px de movimiento en cuatro posiciones.
