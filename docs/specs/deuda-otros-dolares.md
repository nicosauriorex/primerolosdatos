# Deuda en dólares blue, MEP y CCL

Estado: implementada (2026-11-17), publicada en 56ce8e5 (corrida completa en verde, run 44216133187)

Pedido del usuario (2026-11-15, en `docs/IDEAS.md`): «o si la quiero ver en otra moneda al dolar CCL» y «no sería en dolares blue?». El 2026-11-17 dijo que se haga («dale seguí con tu recomendación»).

## El problema
La deuda ya viene en dólares: Finanzas pasa la parte en pesos al dólar oficial de fin de mes. Hoy la medida «Dólares» de una serie en US$ solo tiene «corrientes» y «reales»: no se puede elegir otra cotización. Dividir el total por el CCL no tiene sentido (la deuda en dólares no cambia con el CCL). Lo que sí cambia es **la parte en pesos**: al blue, al MEP o al CCL vale menos dólares que al oficial.

## La cuenta
Para el dólar k (blue, MEP o CCL), con O = dólar oficial (A3500) y F_k = dólar k, los dos **del último día con cotización de cada mes** (es un saldo de fin de mes, como hace Finanzas; un promedio del mes daría mal en los meses de devaluación, por ejemplo dic-23):

- Parte en pesos de la deuda del Tesoro, en millones de $: P = deuda en moneda nacional (hoja A.3, `deuda_ac_mn`) × O.
- `deuda_ac_total` al dólar k = deuda bruta − deuda en moneda nacional + P / F_k.
- `deuda_ac_mn` al dólar k = P / F_k.
- `deuda_consolidada` al dólar k = deuda bruta − deuda en moneda nacional − letras intransferibles en el Banco Central + (P − adelantos transitorios × O + pasivos remunerados del Banco Central en $) / F_k.
  Las letras intransferibles están en dólares (quedan igual); los adelantos transitorios están en pesos (se restan de la parte en pesos). Por eso el pipeline lee las filas «LETRA BCRA…» y «ADELANTOS TRANSITORIOS…» por separado (la serie `deuda_letras_bcra` sigue siendo la suma).
- Con k = oficial cada cuenta da la serie de siempre (control).

Lo demás (moneda extranjera, FMI, letras, deuda / PIB) no tiene parte en pesos o no es un monto: no cambia.

## Qué se hace

### Pipeline (`pipeline/deuda.py`, `pipeline/macro.py`, `pipeline/catalogo.py`, `pipeline/obtener_datos.py`)
1. `macro.py`: función `fin_de_mes()` que devuelve un DataFrame mensual (índice = primer día del mes) con la cotización del **último día con dato** de cada mes de `oficial` (A3500 diario completado con el mayorista, como en `construir`), `blue`, `mep` y `ccl`, después de `_sin_datos_sueltos`. Usa las mismas claves de `red.cacheado` que `construir` (no baja dos veces: `red` guarda en memoria).
2. `deuda.py`: `leer_mensual` agrega `adelantos` (fila «ADELANTOS TRANSITORIOS…», celda vacía = 0) sin cambiar `letras_bcra`. Para `deuda_ac_total`, `deuda_ac_mn` y `deuda_consolidada` se arma `alt = {"blue": serie, "mep": serie, "ccl": serie}` con las cuentas de arriba (millones de US$, mismo índice que `v`). Control que corta: con F = O las tres cuentas dan la serie original (diferencia < 0,5 millones). Si `fin_de_mes()` falla, las series salen sin `alt` (avisa y sigue).
3. La `desc` de esas tres series suma una oración: «En "Dólares al blue / MEP / CCL", la parte en pesos se pasa a esa cotización del último día del mes; lo que está en moneda extranjera queda igual.»
4. `catalogo.S` acepta `alt=None`; `a_json` comprime cada serie de `alt` como `{"i0", "v"}` (igual que `min`/`max`) y pone en el metadato `dol: ["blue","mep","ccl"]` (las que tienen dato). `escribir_json_web` manda `alt` al archivo de datos (con `i0`, `v`, `min`, `max`) y `dol` queda en `catalogo.json`.

### Web (`web/lib/motor.ts`)
5. Tipos: `SerieMeta.dol?: string[]`; `SerieDatos.alt?: Record<string, Banda>` (mismo formato que `min`); `Serie.alt?: Record<string, Vals>`. `agregar` expande `alt`.
6. Medidas de una serie `usd` con `dol`: el grupo «Dólares» tiene dos filas, como en las series en pesos: «Corrientes / Reales» y la cotización «Oficial / Blue / MEP / CCL» (solo las de `dol`). Códigos: oficial corrientes = `corr` y oficial reales = `usdr` (los de siempre: ningún link cambia de significado); el resto `usd_blue`, `usdr_blue`, `usd_mep`… (los mismos códigos que ya usan las series en pesos). Una serie `usd` sin `dol` queda como hoy.
7. `transformar`: `usd_k` = `alt[k]`; `usdr_k` = `alt[k]` × inflación de EE.UU. (como `usdr`). Promedio móvil permitido igual que hoy.
8. Textos: `unidadDe` → «millones de US$ (CCL)» y «millones de US$ de <ref> (CCL)»; `etiquetaMedida` → «Dólares corrientes al CCL»; `resumenMedida` → «en US$ CCL» / «en US$ CCL de hoy». Con oficial, los textos de siempre. El nombre de cada cotización sale de `FX_NOM` (el mismo que en el resto del sitio).
9. «% del PIB» y «Por habitante» no cambian (el % del PIB se calcula en pesos, como hoy).

## Lo que no cambia
- Ningún id de serie ni parámetro de URL existente; `corr` y `usdr` siguen siendo el dólar oficial.
- Las cifras de la serie al oficial.
- Herencia (sus cifras son de informes).

## Cómo se verifica
- `python pipeline/obtener_datos.py` completo sin error; el control de «F = O da la original» pasa.
- Cuenta a mano del último mes con `python pipeline/deuda.py` o un script: deuda bruta al CCL = bruta − mn + mn × O / CCL; el resultado es menor que al oficial cuando la brecha es positiva.
- `cd web && npm run tipos`, `npm run lint`, `npm run build` sin error.
- En el navegador (`web-out`): `/dato/?v=deuda_ac_total` → Ajustes → Dólares → CCL: el gráfico cambia, la unidad dice «(CCL)», el renglón dice «en US$ CCL»; el link con `usd_ccl` reabre igual; `/dato/?v=deuda_ac_me` no ofrece otra cotización; `deuda_consolidada` y `deuda_ac_mn` sí. Imagen de Compartir con la unidad nueva. Sin errores de consola.

## Cómo quedó (2026-11-17)
- Pipeline: `macro.fin_de_mes()` (y `_cotizaciones_diarias`, compartida con `construir`); en `deuda.py`, `adelantos` aparte, `_alternativas` con el control F = O y `alt` en las tres series. La consolidada usa como O el A3500 de `pasivos_fin_de_mes()` (el mismo dato; así el control cierra exacto). Si fallan los pasivos, la bruta y la moneda nacional conservan sus cotizaciones y la consolidada sale sin ellas; la oración de la `desc` aparece solo si la serie tiene `alt`. D-030.
- Web: `grupoDolaresUsd` en `motor.ts` (Corrientes / Reales × Oficial / Blue / MEP / CCL), `transformar`, `unidadDe`, `resumenMedida`; sin banda mín/máx con otra cotización; `monedaEnSerie` (Presidentes) respeta el dólar preferido en estas series.
- Agregado: `notaInflacion` (`imagen-datos.ts`) decía «IPC de INDEC» también para dólares reales («US$ de oct-26»); ahora dice inflación de EE.UU. (CPI-U del BLS). Afectaba a toda serie en dólares reales, no solo a la deuda.

**Verificado (2026-11-17):** corrida completa sin error (697 series; control F = oficial 0,000). Oct-26: bruta 489.634 al oficial → 484.845 blue, 483.340 MEP, 471.483 CCL; a mano 489.634,2 − 241.793 + 241.793 × 1.534 / 1.658,5 = 471.483,3. Consolidada 458.017 → 452.233 MEP; moneda nacional 241.793 → 223.642 CCL. `_alternativas` sin pasivos: solo bruta y moneda nacional. `ruff`, `tipos`, `lint`, `previas`, `build` sin error. En el navegador: fichas con `usd_ccl`, `usd_mep`, `usdr_blue` con esas cifras y unidad «(CCL)»; el menú de Ajustes lista las ocho medidas en dólares; `deuda_ac_me` solo las de siempre; nota de inflación correcta en dólares reales y en pesos de hoy; 375 px sin desborde; sin errores de consola. Revisor: sin bugs; dos menores (try de los pasivos, oración sin `alt`) corregidos.
**Sin verificar:** la imagen de Compartir con la unidad nueva (no se miró en captura); Presidentes con «Dólar preferido» blue.

## Dónde ver los cambios
Página con links y casillas: `docs/cambios/deuda-otros-dolares.html`. Local `http://localhost:3100<ruta>` (vista `web-out`); publicado recién después del commit, el push y la corrida completa en verde (toca `pipeline/`: unos 10 minutos).
1. Histórico
   - 1.1 Ajustes → Dólares de la deuda bruta: corrientes o reales al oficial, blue, MEP o CCL — `/historico/?v=deuda_ac_total~usd_ccl`
   - 1.2 Dólares reales: la nota dice inflación de EE.UU., no IPC de INDEC — `/historico/?v=deuda_ac_total~usdr`
2. Ficha del dato
   - 2.1 Deuda bruta al CCL — `/dato/?v=deuda_ac_total~usd_ccl`
   - 2.2 Consolidada al MEP — `/dato/?v=deuda_consolidada~usd_mep`
   - 2.3 Deuda en pesos al blue — `/dato/?v=deuda_ac_mn~usd_blue`
   - 2.4 Deuda en moneda extranjera sin otras cotizaciones — `/historico/?v=deuda_ac_me`
3. Presidentes
   - 3.1 «¿Cómo le fue con cada presidente?» a la cotización elegida — `/dato/?v=deuda_ac_total~usd_blue#fi-pres`
