# AUH, Tarjeta Alimentar, canasta y pensiones por invalidez

Estado: implementada (2026-11-16), verificada en local; sin commitear

Pedido del usuario (2026-11-16): «el AUH o las asignaciones familiares que se entregaban en términos reales, digamos, cuánto entregó cada gobierno y cuánto cubre lo que entregó de la canasta básica. Esto es un cálculo que ya hacía el Ministerio de Capital Humano […]. Otra cosa […] las pensiones por invalidez […]. ¿Qué cantidad dio cada gobierno?» Después eligió este bloque entre los de la investigación (`docs/investigaciones/datos-nuevos-2026-11-16.md`).

Todo entra como series del catálogo, así que se ven en la ficha, en Histórico, en Por presidente, en la lupa y en la imagen para compartir sin páginas nuevas.

## Fuentes (verificadas el 2026-11-16 contra la API de Series de Tiempo, `apis.datos.gob.ar/series/api/series/?ids=…`)

| Serie | ID de datos.gob.ar | Rango | Control |
|---|---|---|---|
| AUH, monto mensual por hijo (pleno, 100 %) | `165.1_AAUH_0_0_3` | mensual, nov-09 → hoy | oct-24 = 87.790, nov-24 = 90.837, oct-26 = 156.588 |
| Niños con AUH (prestaciones), tramo 2009-2013 | `189.1_ASIGNACIONADO_II_0_0_44` | mensual, dic-09 → sep-25 | empalme con la de abajo |
| Niños con AUH (prestaciones) | `189.1_TOTAL_AUHAUH_0_0_9` | mensual, ene-14 → hoy | dic-23 = 4.022.950, may-26 = 4.138.967 |
| Niños con asignación familiar (SUAF), tramo 2009-2013 | `189.1_ASIGNACIONADO_II_0_0_43` | mensual | empalme |
| Niños con asignación familiar (SUAF) | `189.1_TOTAL_AAFFAFF_0_0_10` | mensual, ene-14 → hoy | dic-23 = 5.005.344, may-26 = 4.279.228 |
| Pensiones no contributivas por invalidez (a diciembre) | `187.1_PENSIONES_DEZ_0_0_50` | anual 1999-2025 | 2023 = 1.215.548, 2025 = 1.150.450 |
| Pensiones a madres de 7 o más hijos (a diciembre) | `187.1_PENSIONES_JOS_0_0_54` | anual 1999-2025 | 2025 = 232.893 |
| Pensiones no contributivas por vejez (a diciembre) | `187.1_PENSIONES_JEZ_0_0_46` | anual 1999-2025 | 2025 = 310 |
| Gasto en AUH (devengado) | `186.3_ASIGNACIONIAL_0_0_43` | mensual, 2004 → hoy | oct-26 = 644.686 (millones de $) |
| Gasto en asignaciones familiares (devengado) | `186.3_ASIGNACIONRES_0_0_23` | mensual, 2004 → hoy | oct-26 = 336.162 |
| Gasto en pensiones no contributivas (devengado) | `186.3_PENSIONES_VAS_0_0_26` | mensual, 2004 → hoy | revisar la unidad de los primeros años |
| Prestación Alimentar (ex Tarjeta Alimentar), monto por hogar según hijos | sin serie: tabla a mano con su resolución | 2020 → hoy | may-24 a abr-26: 52.250 / 81.936 / 108.062 |

Canastas: ya están en el sitio (`can_cba` = canasta básica alimentaria de un adulto equivalente, GBA; `can_cba_h2` = la de un hogar de 4, 3,09 adultos equivalentes: 2 adultos y 2 hijos de 6 y 8 años).

## Qué se hace

### 1. Prestación Alimentar a mano: `datos/manual/prestacion_alimentar.json`
- Un renglón por cada cambio de monto: `desde` (AAAA-MM), `montos` (1 hijo, 2 hijos, 3 o más; por hogar), `edad_max` (hasta qué edad cubre en ese período), `norma` (número y organismo), `url` (Boletín Oficial u otra página oficial) y `nota` opcional.
- Regla de herencia: sin norma y url no se carga. Antes de ene-2020 (comienzo del programa, Res. 8/2020) la prestación vale 0; entre renglones rige el anterior; entre el comienzo y el primer renglón la serie queda vacía (no se inventa). Resultado: la tabla empieza en feb-2021 (no se encontró la norma con los montos de 2020) y `auh_alimentar` / `auh_hogar_4` quedan vacías de ene-2020 a ene-2021.
- Control en el pipeline: fechas en orden, montos crecientes con los hijos, cada renglón con `norma` y `url`; si falla, error claro.

### 2. Pipeline: `pipeline/proteccion_social.py` (`series(idx)`, llamado desde `catalogo.construir` como `deuda`)
Respaldo con `_cacheado_dict("proteccion_social", ids)` (si la API falla se usa la copia). Categoría `["Empleo, pobreza e ingresos", "Asignaciones y pensiones"]`. Valores redondeados (la API trae `156587.99999999997`).

| id | Nombre | tipo | unidad | dir | Cálculo |
|---|---|---|---|---|---|
| `auh` | Asignación Universal por Hijo (AUH) | ars | $ por mes, por hijo | 1 | `165.1_AAUH_0_0_3`, monto pleno (sin aguinaldo: la AUH no tiene) |
| `auh_alimentar` | AUH más Prestación Alimentar (un hijo) | ars | $ por mes | 1 | `auh` + monto de 1 hijo de la tabla (0 antes de que exista) — la cuenta de Capital Humano |
| `auh_hogar_4` | Lo que cobra un hogar de 4 por AUH y Alimentar | ars | $ por mes | 1 | 2 × 0,8 × `auh` + monto de la Alimentar para los hijos de 6 y 8 años que cubra (según `edad_max`) — la convención de la UCA |
| `auh_ninos` | Niños con AUH | none | niños | 0 | empalme: `_44` hasta dic-13, `TOTAL_AUHAUH` desde ene-14 (los ceros de la fuente son huecos) |
| `aaff_ninos` | Niños con asignación familiar por hijo (trabajadores registrados) | none | niños | 0 | ídem con `_43` y `TOTAL_AAFFAFF` |
| `pnc_invalidez` | Pensiones por invalidez | none | pensiones | 0 | anual, se ubica en diciembre (como `deuda_pib`) |
| `pnc_madres` | Pensiones a madres de 7 o más hijos | none | pensiones | 0 | ídem |
| `pnc_vejez` | Pensiones no contributivas por vejez | none | pensiones | 0 | ídem |
| `gasto_auh` | Gasto del Estado en AUH | ars | millones de $ | 0 | agg + flujo (pesos de hoy y % del PIB) |
| `gasto_aaff` | Gasto del Estado en asignaciones familiares | ars | millones de $ | 0 | agg + flujo |
| `gasto_pnc` | Gasto del Estado en pensiones no contributivas | ars | millones de $ | 0 | agg + flujo |

Descripciones (`desc`) para un lector común, y que digan lo que importa para no engañar:
- `auh`: el monto pleno; ANSES paga el 80 % por mes y el 20 % al presentar los controles de salud y escuela. Los aumentos de 2024 fueron decisiones del gobierno; desde jul-2024 se actualiza cada mes por inflación.
- `auh_alimentar`: es la cuenta que publica Capital Humano (AUH al 100 % más la Alimentar de un hijo, contra la canasta alimentaria de UN adulto). Hasta oct-2024 la Alimentar no llegaba a los chicos de 14 a 17 años; antes de 2020 no existía.
- `auh_hogar_4`: es la convención de la UCA (lo que se cobra en mano por dos hijos de 6 y 8 años, contra la canasta de toda la familia). No incluye otros ingresos del hogar.
- `auh_ninos` / `aaff_ninos`: cuentan prestaciones (hijos), no titulares.
- `pnc_*`: cantidad vigente a diciembre de cada año, no altas: la variación entre dos diciembres es altas menos bajas. 2018 es el promedio del año (así lo publica la fuente). Desde 2024, auditoría de ANDIS (Decreto 843/2024).
- `gasto_*`: devengado, en pesos de cada mes; `gasto_pnc` incluye invalidez, madres de 7 hijos, vejez y graciables.
- `fuente`: «ANSES vía datos.gob.ar, serie <ID>» (BESS de la Secretaría de Seguridad Social para las pensiones; Subsecretaría de Programación Macroeconómica para el gasto); para las calculadas, el organismo de cada parte y «Prestación Alimentar: resoluciones del Ministerio de Desarrollo Social y de Capital Humano».

Ids nuevos a `datos/series_esperadas.txt`.

### 3. Web (sin páginas nuevas)
1. `web/lib/nombres.ts`: nombres claros y sinónimos de búsqueda (auh, asignacion universal, asignacion por hijo, tarjeta alimentar, prestacion alimentar, plan social, pensiones por invalidez, discapacidad, andis, pensiones no contributivas, madres de 7 hijos, asignaciones familiares, suaf).
2. `web/lib/oraciones.ts`: `auh` a la lista `SALARIOS` (para «cuánto compra la AUH»), y el rótulo del grupo pasa a «Salarios, jubilaciones y AUH».
3. `web/lib/plantillas.ts`, grupo «Poder de compra»:
   - «AUH y Alimentar: cuántas canastas alimentarias cubre (cuenta de Capital Humano)»: `can_cba` con `rel: auh_alimentar`.
   - «AUH y Alimentar de un hogar de 4: cuántas canastas alimentarias cubre (cuenta de la UCA)»: `can_cba_h2` con `rel: auh_hogar_4`.
   - «AUH en pesos de hoy» (`auh`, real) y «Pensiones por invalidez» (`pnc_invalidez`), en el grupo que corresponda a Empleo y pobreza.
4. `web/lib/temas.ts`, tema Empleo y pobreza: principales «AUH real» (`auh`, real) y «Pensiones por invalidez» (`pnc_invalidez`).
5. `web/lib/datos-fijos.ts`: `auh-real` (`auh`, real) y `pensiones-por-invalidez` (`pnc_invalidez`, asis), en «Empleo y pobreza».
6. `web/lib/info.ts`, «Empleo, pobreza e ingresos»: un párrafo que explique las dos cuentas de cobertura (la del gobierno y la de la UCA), con qué compara cada una, y que no hay altas de pensiones, solo cantidad vigente.

## Fuera de esta spec (siguen en la investigación)
Pensiones por provincia cada 1.000 habitantes y la serie mensual con suspendidas (BESS en Excel), línea de tiempo de ANDIS (decretos, cautelar, Ley 27.793), monto de la asignación familiar por tramo (sin serie oficial) y moratorias.

## Cómo se verifica
1. `python pipeline/obtener_datos.py` termina sin error, el total de series sube en 11 y `verificar_series.py` pasa.
2. Controles: `auh` oct-24 = 87.790 y nov-24 = 90.837; `auh_alimentar` nov-24 = 143.087 y contra `can_cba` de nov-24 da ≈ 100,7 % (la cifra de Capital Humano); dic-23 ≈ 54,8 %; `pnc_invalidez` dic-23 = 1.215.548; `auh_ninos` may-26 = 4.138.967; el empalme de niños no salta en ene-14 más que lo normal de un mes.
3. `cd web && npm run tipos && npm run previas && npm run build`.
4. En `web-out`: la ficha de cada serie nueva, las dos plantillas de cobertura (valor de nov-24 ≈ 1,01 canastas para la de Capital Humano), Por presidente de `pnc_invalidez`, la lupa con «auh», «tarjeta alimentar» y «pensiones por invalidez», el tema Empleo y pobreza, y las dos páginas `/dato/<slug>/`.
5. Revisor contra esta spec.

## Verificación (2026-11-16)
- Pipeline completo sin error: 596 series (11 nuevas); empalme de niños dic-13 → ene-14: −0,64 % (AUH) y −1,26 % (asignaciones).
- Controles: `auh` oct-24 87.790 y nov-24 90.837; cobertura de Capital Humano 54,8 % dic-23, 100,7 % nov-24 y ene-25 (las cifras oficiales); UCA hogar de 4: 28,1 % dic-23 (igual a su informe) y 48,7 % sep-26 (ídem); `pnc_invalidez` dic-23 1.215.548; `auh_ninos` may-26 4.138.967.
- Con la misma cuenta de Capital Humano, la cobertura pasaba el 100 % de feb-21 a dic-22 (122 % en feb-21) para los chicos que cubría la Alimentar (hasta 6 años y, desde may-21, hasta 14); desde oct-24 llega también a los de 14 a 17. Se muestra el dato, sin veredicto.
- Prestación Alimentar: 12 renglones con resolución del Boletín Oficial (feb-21 → may-26); la sesión principal leyó la 181/2024 y la 161/2026 (rige desde mayo de 2026). Sin norma con montos para 2020: esa parte queda vacía.
- Web: tipos, previas y build sin error; en el navegador, ficha de AUH y de pensiones, las dos plantillas de cobertura, lupa, tema Empleo y pobreza; 7 rutas a 360 px sin desborde ni errores de consola. Aspecto visto en la imagen para compartir de pensiones; el resto, leyendo el contenido.

Cambios generales que salieron al verificar (bugs del mismo tipo en todo el sitio):
- `pipeline/catalogo.py`: los enteros se guardan exactos en el JSON (antes, 6 cifras: 4.138.970 en vez de 4.138.967).
- `web/lib/motor.ts`: cuando un dato se mide en otro, la fuente nombra a los dos (`fuentesCalc`, en Histórico, ficha e imágenes) y una canasta se cuenta en «canastas por cada …» (antes «mes por cada …»).
- `web/lib/estadisticas.ts` / `ficha.ts`: en series anuales cada mandato cierra con el diciembre del año en que terminó (antes el último año no se le contaba a nadie; afectaba también a «Deuda bruta / PIB»), y el aviso dice «primer dato del mandato: la serie no es mensual».

## Dónde ver los cambios
Local con la vista `web-out` (`http://localhost:3100<ruta>`); en el sitio (`https://primerolosdatos.com.ar<ruta>`) recién después del commit, el push y la corrida en verde. Lista completa con links: `docs/cambios/auh-pensiones.html`.
1. Buscar: la lupa encuentra AUH, Tarjeta Alimentar, pensiones por invalidez — `/`
2. Histórico: cobertura de Capital Humano — `/historico/?v=can_cba~corr~auh_alimentar~compra~&pl=auh-alimentar-vs-canasta`; cobertura de la UCA — `/historico/?v=can_cba_h2~corr~auh_hogar_4~compra~&pl=auh-hogar-4-vs-canasta`; gasto — `/historico/?v=gasto_auh~real~~compra~`; niños — `/historico/?v=auh_ninos~asis~~compra~`
3. Ficha: `/dato/auh-real/`, `/dato/pensiones-por-invalidez/`
4. Temas: `/tema/empleo/`
5. Por presidente: `/dato/pensiones-por-invalidez/#fi-pres`, `/dato/auh-real/#fi-pres`
6. Gráficos listos: `/plantillas/?q=auh`
