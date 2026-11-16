# Ajustes, tanda 14: el valor de una barra al pasar el mouse o tocarla

Estado: implementada (2026-11-16), sin commitear

Pedido del usuario (2026-11-16), al recorrer los cambios de [imagenes-y-lupa](imagenes-y-lupa.md): «en el 2.1 el resumen por hitos se puede poner que cuando pasas el mouse por arriba te muestra el valor».

## Regla general
- **R32. Un gráfico de barras dice el valor de la barra al pasar el mouse o al tocarla.** Aparece un cartel encima de esa barra con el valor y el rótulo (quién y cuándo), dentro del gráfico. Con el mouse se va al salir; en el celular queda hasta tocar fuera. Hay uno solo a la vez en toda la página. El valor también se anuncia a los lectores de pantalla (`aria-live`). Nunca solo con el `title` nativo, que tarda en aparecer y en el celular no aparece. Componente común: `web/components/sistema/ConCartel.tsx` (cada barra lleva su texto en `data-cartel`).

## Qué se cambia
1. **Resumen por hitos, vista Barras** (`/mandato/#mand-hitos`, `components/secciones/Mandato.tsx`): cada barra muestra «<presidente>, <hito>: <valor>», con el mismo formato del gráfico de líneas (`D.fmtTip`).
2. **Barrido (R32):** los otros gráficos de barras que mostraban el valor solo con `title`:
   - Congreso, «año por año» (`/congreso/?cgp=<presidente>`): cada columna dice «dd/mm/aaaa: propios N, aliados N, de N bancas».
   - Gasto de la Nación, «Cómo viene el año» (`/gasto/?vista=mes`): cada mes dice el gasto de los dos años (o el del mes parcial).
   Los demás gráficos de barras ya muestran sus valores escritos o con su propio cursor (`BarrasMes`, `ColumnasGobiernos`, `ListaBarras`, `GraficoBarrasH`, el parte del Banco Central).

## Cómo se verifica
- `npm run tipos` y `npm run build`.
- En la vista `web-out` a 375 px: simular el mouse y el toque sobre la primera y la última barra de cada gráfico. El cartel aparece con el texto correcto, encima de la barra, sin salirse del gráfico, y la página no se desplaza de costado. Si se tocan dos gráficos seguidos, queda un solo cartel, y tocar fuera lo cierra.

## Verificación (2026-11-16)
- Compila sin errores. En `/mandato/`, `/congreso/?cgp=milei` y `/gasto/?vista=mes` se simularon el mouse y el toque (eventos `pointermove` y `pointerdown`). El cartel sale 6 px encima de la barra, dentro del gráfico, con `scrollWidth` de 375. En Congreso, tocar Diputados y después Senado deja un solo cartel, y tocar fuera lo cierra.
- Revisor: un problema medio, corregido. En hitos, el cartel de las barras altas se cortaba porque estaba dentro de `.pres-barras-marco`, que tiene deslizamiento propio; ahora `ConCartel` envuelve al marco. Verificado: el cartel de la barra más alta queda fuera de todo recorte. Además, deslizar el gráfico de costado cierra el cartel, para que no quede lejos de su barra. Aceptados: en Gasto el cartel sale arriba de la columna del mes y no pegado a la barra (no tapa nada), y el teclado no abre carteles (cada gráfico tiene su tabla con las cifras).
- Sin ver: el aspecto en una captura (el panel del navegador estaba oculto) y un mouse real.

## Dónde ver los cambios
Página: `docs/cambios/ajustes-tanda-14.html`.
1. Presidentes
   - 1.1 Resumen por hitos, Barras: el valor al pasar el mouse — `/mandato/#mand-hitos`. Pediste: «en el 2.1 el resumen por hitos se puede poner que cuando pasas el mouse por arriba te muestra el valor».
   - 1.2 Congreso, año por año: lo mismo en las columnas de bancas — `/congreso/?cgp=milei#cg-detalle`. Agregado por mí: regla general R32.
2. Gasto
   - 2.1 Cómo viene el año: lo mismo en las barras de cada mes — `/gasto/?vista=mes`. Agregado por mí: regla general R32.
