# Ajustes, tanda 11: Congreso en columnas con «leyes por apoyo», y resaltar un país en El mundo y la Argentina

Estado: implementada (2026-11-15), sin publicar

Pedido del usuario (2026-11-15):
> «En Cada gobierno frente al Congreso cambia la forma de visualizar. que sea un gráfico de barras verticales con cada gobierno en el eje x y el % o el valor en el eje Y. y señala al que tuvo mayor apoyo y el que tuvo menos apoyo. y pone otro indicador de leyes por cantidad de diputados o algo asi. o sea que muestre que gobierno saco más leyes en base al apoyo que tenía.»
> «que en El mundo y la Argentina se pueda resaltar a un pais como hacemos en meses de mandato (tambien para la imagen)»

## Reglas generales

- **R26. Comparar gobiernos = columnas en orden cronológico.** Cuando un gráfico pone un valor por gobierno, va en columnas verticales (un gobierno por columna, en orden de mandato) con el valor arriba de cada una, y marca el más alto y el más bajo con palabras (nunca solo color). Se toca una columna para elegir ese gobierno.
- **R27. Toda línea de un país o un presidente se puede resaltar**, tocando su nombre en la leyenda (como en Meses de mandato): la elegida queda gruesa y opaca, las demás tenues. Lo resaltado va en la URL y también en la imagen para compartir; en el panel de compartir se puede cambiar.

## Qué se cambia

### 1. Congreso (`/congreso/`)

1.1 **Columnas verticales en lugar de la lista de barras** del capítulo «Cada gobierno frente al Congreso». Componente nuevo `web/components/sistema/ColumnasGobiernos.tsx` (SVG propio medido al ancho, como `BarrasMes.tsx`): eje X = los 10 gobiernos en orden (nombre corto de `PRES_DEF`, rotado o en dos renglones si no entra a 360 px; nunca se sale), eje Y = el valor del indicador (de 0 a 100 % para bancas y leyes; de 0 al máximo para el resto), valor escrito arriba de cada columna, línea del 50 % en bancas («mayoría»). Gobiernos sin dato: columna vacía con «s/d» (no se omiten: se ve qué falta). Tocar una columna = elegir ese gobierno (mismo `cgp` de hoy; otra vez = soltar); la elegida va en acento. Teclado: enfocable y flechas, como `BarrasMes`. Tabla oculta para lectores de pantalla.
1.2 **Marca del más alto y del más bajo**: rótulo arriba de la columna, unido con línea de puntos. En «Bancas»: «Más apoyo» / «Menos apoyo»; en el resto: «Más alto» / «Más bajo». Se comparan los valores redondeados como se muestran; si hay empate, se marcan todos los empatados. Con un solo gobierno con dato no se marca nada.
1.3 **Indicador nuevo «Leyes por apoyo»** (chip después de «Leyes», `cgi=apoyo`): `% de leyes del Ejecutivo aprobadas ÷ % de bancas propias y aliadas en Diputados (promedio del mandato)`. Se muestra con un decimal («2,0 veces»). 1 = aprobó en la misma proporción que su apoyo; más de 1, más leyes que su apoyo; menos de 1, menos. Cálculo en `web/lib/capacidad.ts` (`resumenApoyo`), con los valores redondeados como se muestran (R «las cuentas cierran»: % aprobadas y % de bancas enteros, como en la tabla). Solo para gobiernos con leyes y bancas cargadas (hoy CFK 2, Macri, Fernández, Milei). La nota debajo del gráfico dice qué se divide; el «¿Cómo se cuenta?» suma un punto con el cálculo y sus límites (no pesa qué ley es, no cuenta el Senado ni acuerdos puntuales). Palabras neutras: nada de «gobernó bien» (D-012); la frase de la cabecera da el número y el puesto («Entre los N gobiernos con dato, puesto k de mayor a menor»). También va como columna en «Ver todos los indicadores juntos» y en `queHayCargado`.
1.4 La frase-respuesta (`fraseCapacidad`) cubre el indicador nuevo.

### 2. El mundo y la Argentina (`/contexto/…`)

2.1 **«La Argentina y otros países»** (`/contexto/paises/`): la leyenda del gráfico pasa a botones (clase `pres-leyenda` / `pres-leyenda-item`, como Meses de mandato, `aria-pressed`): tocar un país lo resalta (`opts.resaltar` del `Grafico`), tocar otra vez lo suelta. Parámetro nuevo `cpx=<entidad>` (inválido o no elegido = ninguno). Por defecto, ninguno resaltado.
2.2 **Imagen para compartir de «La Argentina y otros países»** (no tenía): botón Compartir en el capítulo (`BotonCompartir`, como Precios), que arma un gráfico de líneas igual al de la pantalla (mismos países, colores, base, escala logarítmica) con el país resaltado en línea gruesa y el resto tenue. Vista nueva `ctx-lineas` en `web/lib/imagen-contexto.ts` (genérica: título, frase, eje anual o mensual, series con nombre, color de `PALETA`, valores, resaltado, unidad, fuente, log, línea de referencia). El link de compartir (`CompartirHoja`) sigue.
2.3 **«¿Cómo viene?»** (Precios contra el mundo, `/contexto/`): la lista de países debajo del gráfico pasa a botones que resaltan igual (parámetro `pmx`; se resaltan juntas la línea estimada y los puntos medidos del país). Botón Compartir con la misma vista `ctx-lineas` (eje mensual, línea de 100 = mundo).
2.4 **Panel de compartir** (`PanelCompartir.tsx`): con una vista `ctx-lineas`, una fila «Resaltar país (ninguno = todos iguales)» como la de presidentes, que arranca con el de la pantalla.

## Lo que no cambia

- Ningún parámetro existente cambia de significado (`cgi`, `cgp`, `cpp`, `cpd`, `cpb`, `cpr`, `pmp`, `pvr`…). `cgi=apoyo`, `cpx` y `pmx` son nuevos.
- El detalle año por año de cada presidente, la tabla «Ver todos los indicadores juntos» (salvo la columna nueva) y «¿Cómo se cuenta?» siguen.
- Los gráficos de barras de Precios contra el mundo ya resaltan el país elegido: no se tocan.

## Cómo se verifica

- `cd web && npm run tipos && npm run build` sin errores.
- `/congreso/`: columnas en cada indicador; marcas correctas (bancas: más apoyo Menem 2 o CFK 1 según el corte de asunción, menos Milei); `?cgi=apoyo` muestra 4 columnas con valor y 6 «s/d»; las cuentas: el cociente sale de los enteros que muestra la tabla. A 360 px no hay desborde horizontal.
- `/contexto/paises/?cpx=BRA`: Brasil resaltado; tocar la leyenda cambia `cpx`; Compartir abre la imagen con la línea gruesa y el panel permite cambiarla.
- `/contexto/`: «¿Cómo viene?» resalta y comparte.
- Barridos de `docs/ESTADO.md` (cuentas y navegador) sin errores.

## Verificación (2026-11-15)

- `npm run tipos` y `npm run build` sin errores; barrido de cuentas sin hallazgos.
- Navegador (vista `web-out`): `/congreso/` en columnas con «Más apoyo» CFK 1 (54 %) y «Menos apoyo» Milei (15 %); `?cgi=apoyo` a 375 px y 1024 px sin desborde: CFK 2 y Milei 2,0 (empate, los dos «Más alto»), Macri 1,3, Fernández 1,0 («Más bajo»), seis «s/d». `/contexto/paises/?cpx=BRA`: Brasil resaltado, la imagen sale con Brasil grueso y el panel deja cambiarlo. `/contexto/?pmx=BRA`: línea y puntos medidos de Brasil resaltados. Sin errores de consola.
- Revisor: sin problemas graves; se corrigieron el rótulo de la línea de referencia (a la izquierda, para no tapar valores), los rótulos que capturaban el toque y CSS sin uso. Aceptados: eje de techo 1/2/5/10, `role="img"` con teclado (tiene tabla oculta).
- Sin ver: la imagen de «¿Cómo viene?» (solo líneas: la imagen no dibuja puntos), tema claro, celular real.

## Dónde ver los cambios

Local con la vista `web-out` (`http://localhost:3100<ruta>`); en el sitio, después del commit, el push y la corrida en verde. Página: `docs/cambios/tanda-11.html`.

1. Presidentes › Gobierno y Congreso
   - 1.1 Columnas verticales por gobierno — `/congreso/#congreso` (pediste)
   - 1.2 «Más apoyo» / «Menos apoyo» y línea de mayoría — `/congreso/#congreso` (pediste)
   - 1.3 Indicador «Leyes por apoyo», con línea en 1 — `/congreso/?cgi=apoyo#congreso` (pediste)
   - 1.4 «Más alto» / «Más bajo» en Leyes, DNU y Vetos — `/congreso/?cgi=dnu#congreso` (agregado: regla R26)
   - 1.5 «Leyes por apoyo» en la tabla y en «¿Cómo se cuenta?» — `/congreso/?cgi=apoyo#congreso` (agregado)
2. El mundo y la Argentina
   - 2.1 Resaltar un país en Otros países — `/contexto/paises/?cpx=BRA#comparar` (pediste)
   - 2.2 Imagen de Otros países con el país resaltado — `/contexto/paises/?cpx=BRA#comparar` (pediste)
   - 2.3 Resaltar y compartir en «¿Cómo viene?» — `/contexto/?pmx=BRA` (agregado: regla R27)
