# Recaudación por impuesto, seguridad, salud, presos, empleo público y turismo

Estado: implementada (2026-11-16), publicada en 9da1c52 (corrida completa en verde, run 43873660350; /dato/homicidios/ y /tema/sociedad/ comprobadas en el sitio)

Pedido del usuario (2026-11-16): «seguí por lo de datos. todo esos y manda a investigar si hay otra cosa interesante para mostrar. capaz hay cosas que va a haber que traer mas manual pero mientras pongamos la fuente esta bien». «Todos esos» son los de la lista que siguen en el ranking de `docs/investigaciones/datos-nuevos-2026-11-16.md`: homicidios, empleados públicos nacionales, recaudación por impuesto, turismo al exterior, mortalidad infantil y presos. Se suma la importación de bienes de consumo (#12 del ranking, el mismo debate que el turismo). El gasto en AUH y pensiones ya está (spec `auh-pensiones.md`).

Todo entra como series del catálogo: ficha, Histórico, Por presidente, lupa e imagen para compartir, sin páginas nuevas. Lo único nuevo en la interfaz es un tema **«Seguridad y salud»** (`/tema/sociedad/`) para la categoría raíz nueva `Sociedad`.

## Fuentes (verificadas por la sesión principal el 2026-11-16)

| Serie | Fuente / id | Rango | Control |
|---|---|---|---|
| IVA | API `142.3_IVA_2001_M_3` (millones de $) | mensual 1997 → sep-26 | sep-26 = 6.918.462 |
| Ganancias | `142.3_GANAN_2001_M_9` | ídem | sep-26 = 4.772.938 |
| Derechos de exportación (retenciones) | `142.3_DEREC_2001_M_20` | ídem | sep-26 = 1.121.551 |
| Derechos de importación | buscar el id «Derechos importación» de la misma tabla 142.3 (el `_M_26` es «Derechos importación **otros**»: no sirve solo). Si no hay serie mensual del total, usar `_M_26` solo si la fuente dice que es el total; si no, dejar fuera y decirlo en el informe | | |
| Bienes Personales | `142.3_BIENE_2001_M_17` | ídem | sep-26 = 93.931 |
| Impuesto PAIS | `142.3_IMPUESTO_PAIS_0_M_13_92` | dic-19 → hoy (residual desde 2025) | |
| Débitos y créditos (impuesto al cheque) | `142.3_CREDI_2001_M_24` | mensual 1997 → | |
| Aportes y contribuciones a la seguridad social | `142.3_SISTE_2001_M_24` | ídem | |
| Homicidios dolosos: tasa de víctimas | `t_snic_1_victimas_arg` (cada 100.000 habitantes) | anual 2000 → 2025 | 2025 = 3,61; 2024 = 3,90 |
| Homicidios dolosos: víctimas | `snic_1_victimas_arg` | anual 2000 → 2025 | 2025 = 1.676 |
| Homicidios dolosos: tasa de hechos | `t_snic_1_hechos_arg` | anual 2000 → 2025 | 2025 = 3,48; 2000 = 7,23 |
| Mortalidad infantil | `tmi_arg` (por 1.000 nacidos vivos) | anual 1990 → 2024 | 2024 = 8,5; 2023 = 8,0 |
| Personas presas | SNEEP, `https://datos.jus.gob.ar/dataset/70fc10e1-aa70-4dc9-9dfb-478875f684d8/resource/7d10bdae-a3a8-416e-96ce-094c96ecf7d9/download/sneep-poblacion-total.csv`, columna `total_arg` (incluye el Servicio Penitenciario Federal, `spf`) | anual 2002 → 2024 | 2002 = 44.969 |
| Empleados públicos nacionales | INDEC, `https://www.indec.gob.ar/ftp/cuadros/economia/serie_dotacion_apn.xlsx`, hoja `serie  cuadro 1` (dos espacios), fila «Total», «Administración pública nacional» y «Empresas y sociedades»; fechas en la fila 3 (vienen como fecha o como texto «nov-22 (i)» = imputado) | mensual jul-22 → sep-26 | jul-22 total = 341.692, APN = 230.592, empresas = 111.100 |
| Viajes al exterior por avión (turismo emisivo) | `322.3_TURISMO_EMIVO__15` (miles de pasajeros, Ezeiza y Aeroparque) | mensual 2010 → ago-26 | ago-26 = 337,6 |
| Turistas extranjeros que llegan (turismo receptivo, mismos aeropuertos) | buscar el id mensual `322.3_TURISMO_RE…` de la Encuesta de Turismo Internacional; si solo hay trimestral, dejar fuera y decirlo | | |
| Importaciones de bienes de consumo | `74.2_IIBCO_0_T_32` (millones de US$, trimestral) | 1992 → 3T-26 | 3T-26 = 2.959 |

## Qué se hace

### 1. Pipeline: `pipeline/sociedad.py` (`series(idx, pob=None)`, llamado desde `catalogo.construir` como `proteccion_social`)
Mismo molde que `pipeline/proteccion_social.py`: las series de la API van con `_cacheado_dict("sociedad", ids)`; el CSV del SNEEP y el xlsx del INDEC con `red.cacheado` / `red.cache_df` (nunca `urlopen` fuera de `red.py`). Si una fuente falla y no hay respaldo, se omiten sus series con un aviso (no rompe la corrida). Los datos anuales van en diciembre (como `pnc_invalidez`, función `_anual_a_diciembre`: reutilizarla importándola, no copiarla). Las trimestrales usan `_trim_a_mes` con `trim_flujo` como las otras de comercio exterior.

| id | Nombre | cat | tipo | unidad | dir | Opciones |
|---|---|---|---|---|---|---|
| `rec_iva` | Recaudación de IVA | `["Fiscal", "Recaudación por impuesto"]` | ars | millones de $ | 0 | agg, flujo |
| `rec_ganancias` | Recaudación de Ganancias | ídem | ars | millones de $ | 0 | agg, flujo |
| `rec_retenciones` | Retenciones a las exportaciones (derechos de exportación) | ídem | ars | millones de $ | 0 | agg, flujo |
| `rec_importacion` | Derechos de importación (si hay serie del total) | ídem | ars | millones de $ | 0 | agg, flujo |
| `rec_bienes_personales` | Recaudación de Bienes Personales | ídem | ars | millones de $ | 0 | agg, flujo |
| `rec_pais` | Recaudación del impuesto PAIS | ídem | ars | millones de $ | 0 | agg, flujo |
| `rec_cheque` | Impuesto al cheque (débitos y créditos) | ídem | ars | millones de $ | 0 | agg, flujo |
| `rec_seguridad_social` | Aportes y contribuciones a la seguridad social | ídem | ars | millones de $ | 0 | agg, flujo |
| `homicidios_tasa` | Homicidios dolosos cada 100.000 habitantes | `["Sociedad", "Seguridad"]` | none | víctimas cada 100.000 habitantes | -1 | |
| `homicidios_victimas` | Víctimas de homicidios dolosos | ídem | none | víctimas | -1 | |
| `homicidios_hechos_tasa` | Homicidios dolosos cada 100.000 habitantes (hechos) | ídem | none | hechos cada 100.000 habitantes | -1 | |
| `presos` | Personas presas | `["Sociedad", "Justicia"]` | none | personas | 0 | |
| `presos_tasa` | Personas presas cada 100.000 habitantes | ídem | none | presos cada 100.000 habitantes | 0 | calculada con la población que ya usa el pipeline (serie `poblacion`); si no está a mano, omitirla y decirlo |
| `mortalidad_infantil` | Mortalidad infantil | `["Sociedad", "Salud"]` | none | muertes cada 1.000 nacidos vivos | -1 | |
| `empleo_publico_nacional` | Empleados públicos nacionales | `["Empleo, pobreza e ingresos", "Empleo público"]` | none | personas | 0 | |
| `empleo_publico_apn` | Empleados de la administración pública nacional | ídem | none | personas | 0 | |
| `empleo_publico_empresas` | Empleados de empresas y sociedades del Estado | ídem | none | personas | 0 | |
| `turismo_emisivo` | Argentinos que viajan al exterior en avión | `["Sector externo", "Turismo"]` | none | miles de pasajeros | 0 | agg |
| `turismo_receptivo` | Turistas extranjeros que llegan en avión (si hay mensual) | ídem | none | miles de pasajeros | 1 | agg |
| `imp_consumo` | Importaciones de bienes de consumo | `["Sector externo", "Comercio exterior"]` (o la subcategoría donde ya están las importaciones: buscarla) | usd | millones de US$ | 0 | agg, flujo, trim_flujo |

`dir`: la recaudación por impuesto es neutra (que suba un impuesto no es bueno ni malo para todos); homicidios y mortalidad, -1; presos, neutro.

Descripciones (`desc`) para un lector común, diciendo lo que importa para no engañar:
- Recaudación: lo que ARCA (ex AFIP) recaudó en el mes, en millones de pesos de cada mes; se ve mejor en pesos de hoy o como % del PIB. Retenciones: bajaron por decisión del gobierno en 2024-2026 (rebajas a la soja y otros); PAIS: creado en dic-2019, eliminado en dic-2024 (lo que queda son pagos atrasados); Bienes Personales: blanqueo y pago adelantado (REIBP) en 2024; Ganancias: suba del mínimo no imponible en 2023 y vuelta de la cuarta categoría en 2024. Cada fecha mencionada tiene que estar en el informe del subagente con su fuente (norma o comunicado oficial); lo que no pueda confirmar, sacarlo del texto.
- Homicidios: del Sistema Nacional de Información Criminal (Ministerio de Seguridad). La **tasa de víctimas** es la que cita el gobierno («la más baja de la historia», 3,6 en 2025); la de **hechos** cuenta casos (un hecho puede tener varias víctimas). Dato anual, en diciembre.
- Mortalidad infantil: muertes de menores de un año cada 1.000 nacidos vivos (Dirección de Estadísticas e Información en Salud, Ministerio de Salud). Anual; el último año sale con unos dos años de atraso.
- Presos: personas privadas de la libertad en cárceles provinciales y federales a fin de cada año (SNEEP, Ministerio de Justicia). No incluye las detenidas en comisarías. Anual.
- Empleo público nacional: dotación de la administración pública nacional y de las empresas y sociedades del Estado (INDEC con la Secretaría de Transformación del Estado). Empieza en jul-2022: no compara con gobiernos anteriores. Universidades: no están (solo dos radios universitarias). Fuerzas: los entes de Defensa y Seguridad figuran con cifras chicas (Gendarmería 752 en jul-22), así que no parecen contar al personal militar y policial; el INDEC no lo aclara (corregido al implementar: la spec decía que no estaban). Los meses imputados por el INDEC («(i)») se toman igual y se dice en la descripción. Cambió la cantidad de informantes (de 149 a menos): decirlo.
- Turismo: pasajeros por Ezeiza y Aeroparque (Encuesta de Turismo Internacional, INDEC). No cuenta viajes por tierra ni otros aeropuertos.
- Importaciones de consumo: INDEC, trimestral repartido en los 3 meses.
- `fuente`: organismo y número de serie («ARCA vía datos.gob.ar, serie 142.3_IVA_2001_M_3» o «Secretaría de Hacienda…» según lo que diga la API en `dataset.source`), SNEEP con la URL del dataset, INDEC con el nombre del archivo.

Controles de cordura (fallan la corrida si no se cumplen, regla del pipeline):
- Recaudación: la suma de los impuestos de esta spec no puede pasar el total `142.3_TOTAL_2001_M_26` en ningún mes (tolerancia 0,5 %).
- Empleo público: total = APN + empresas en cada mes (±1 persona); el control de jul-22 de la tabla.
- Presos: `total_arg` = suma de las columnas de provincias + `spf` (±0,5 %); si la fuente no cumple, imprimir los años y no fallar (la fuente ya viene así), pero decirlo en el informe.
- Homicidios: víctimas / tasa ≈ población en cientos de miles (entre 360 y 480 para 2014-2025).

Ids nuevos a `datos/series_esperadas.txt`.

### 2. Web
1. `web/lib/catalogo.ts`: `"Sociedad"` en `ORDEN_RAIZ`, después de `"Fiscal"`.
2. `web/lib/temas.ts`: tema nuevo `{ slug: "sociedad", nombre: "Seguridad y salud", cats: ["Sociedad"], ... }` después de Cuentas públicas, con principales: homicidios (`homicidios_tasa`), mortalidad infantil y presos cada 100.000 habitantes (o presos). En el tema Empleo y pobreza, principal «Empleados públicos nacionales». En Cuentas públicas, principal «Retenciones a las exportaciones en pesos de hoy» (real). En Comercio exterior, «Viajes al exterior».
   Buscar todo lo que lista los temas o las categorías raíz (menú, íconos de los menús, portada, `generateStaticParams` de `/tema/[slug]`, `web/lib/info.ts` con `INFO_CORTA` y el texto largo, lupa) y sumar el tema nuevo en cada lugar, con un ícono acorde a los que ya hay.
3. `web/lib/info.ts`: textos de «Sociedad» (corto y largo). En «Fiscal», un párrafo sobre recaudación por impuesto; en «Empleo…», que el empleo público nacional empieza en 2022 y que el provincial está en `/provincias/`.
4. `web/lib/nombres.ts`: nombres claros y sinónimos de búsqueda: iva, ganancias, impuesto a las ganancias, retenciones, derechos de exportación, bienes personales, impuesto pais, impuesto al cheque, aportes, homicidios, asesinatos, inseguridad, crimen, delitos, tasa de homicidios, mortalidad infantil, bebés, salud, presos, cárceles, presos por habitante, empleados públicos, empleo estatal, despidos en el estado, motosierra, ñoquis, turismo, viajes al exterior, chile, compras afuera, importaciones de consumo, apertura.
5. `web/lib/plantillas.ts`: «Recaudación por impuesto (% del PIB)» o, si las plantillas no permiten varias series en % del PIB, una por impuesto principal (IVA, Ganancias y retenciones en % del PIB); «Homicidios cada 100.000 habitantes»; «Empleados públicos nacionales»; «Viajes al exterior y dólar» si existe la forma de relacionar dos series (si no, solo viajes).
6. `web/lib/datos-fijos.ts`: `homicidios` (`homicidios_tasa`, asis), `mortalidad-infantil`, `empleo-publico-nacional`, `retenciones` (`rec_retenciones`, real), `presos`.

## Fuera de esta spec
Homicidios y mortalidad infantil por provincia, femicidios, empleadores (cierre de empresas), patentamientos (siguen en la investigación). Lo que traiga la investigación nueva de datos va a otra spec.

## Cómo se verifica
1. `python pipeline/obtener_datos.py` termina sin error, el total de series sube en las que se agregaron (596 → ~616) y `verificar_series.py` pasa. Los controles de cordura de arriba se imprimen y pasan.
2. Controles con la tabla de fuentes: `rec_iva` sep-26, `homicidios_tasa` 2025 = 3,61, `homicidios_hechos_tasa` 2000 = 7,23, `mortalidad_infantil` 2024 = 8,5, `presos` 2002 = 44.969, `empleo_publico_nacional` jul-22 = 341.692, `turismo_emisivo` ago-26 = 337,6.
3. `cd web && npm run tipos && npm run previas && npm run build`.
4. En `web-out`: ficha de cada serie nueva y su Por presidente, el tema nuevo `/tema/sociedad/` y que aparezca en los menús, la lupa con «homicidios», «retenciones», «empleados públicos», «presos», «iva», las plantillas nuevas y las páginas `/dato/<slug>/`. A 360 px sin desborde ni errores de consola.
5. Revisor contra esta spec.

## Verificación (2026-11-16)
- Pipeline completo sin error: 616 series (20 nuevas), red sin respaldos; `verificar_series.py` OK. Controles: la suma de los 8 impuestos nunca pasa el total (máximo −1,24 %); víctimas / tasa entre 427 y 464; SNEEP total = provincias + SPF todos los años; dotación total = APN + empresas en los 51 meses y jul-22 = 341.692 / 230.592 / 111.100.
- Controles de la tabla: `rec_iva` sep-26 6.918.462, `homicidios_tasa` 2025 3,61, `homicidios_hechos_tasa` 2000 7,23, `mortalidad_infantil` 2024 8,5, `presos` 2002 44.969, `empleo_publico_nacional` jul-22 341.692, `turismo_emisivo` ago-26 337,6: todos coinciden.
- Decisiones al implementar: derechos de importación = `142.3_DEREC_2001_M_26` (la única línea de importación de la tabla; con las demás cierra con el total); turismo receptivo = `322.3_TURISMO_REIVO__17`; `presos_tasa` empieza en 2004 (la población del pipeline empieza ahí); `imp_consumo` en la raíz «Sector externo» (las importaciones no tienen subcategoría); de las fechas de política solo quedó la del impuesto PAIS (Ley 27.541), las otras no se pudieron confirmar con una fuente oficial; «149 a 121 entes» comprobado en la hoja «Aclaraciones».
- Web: tipos, previas (40 de 40 datos fijos) y build sin error. En el navegador (leyendo el contenido y midiendo, sin capturas): tema `/tema/sociedad/`, fichas nuevas, Por presidente, lupa (homicidios, inseguridad, retenciones, iva, presos, empleados publicos, motosierra, viajes al exterior), gráfico listo de recaudación; 16 rutas a 360 px sin desborde ni pantalla de error.
- Revisor: primera pasada marcó fechas de series anuales con mes en Ranking y Por presidente (corregido) y el «121» (comprobado); segunda pasada sin problemas.

Cambios generales que salieron al verificar:
- Las series anuales muestran el año («2025») en vez de «dic-25» en la ficha, la vista previa, la imagen, las tarjetas, las comparaciones, los tooltips y las tablas por presidente y Ranking (`fechaDeDato` en `web/lib/formato.ts`, con `frecuenciaOrigen`).
- El gráfico listo de recaudación quedó con 4 series: el Histórico muestra hasta 4 y la quinta (aportes a la seguridad social) se perdía sin aviso.

## Dónde ver los cambios
Local con la vista `web-out` (`http://localhost:3100<ruta>`); en el sitio (`https://primerolosdatos.com.ar<ruta>`) recién después del commit, el push y la corrida en verde. Lista con links: `docs/cambios/datos-sociedad-recaudacion.html`.
1. Buscar: la lupa encuentra homicidios, retenciones, IVA, presos, empleados públicos — `/`
2. Histórico: recaudación por impuesto % PIB — `/historico/?...&pl=recaudacion-por-impuesto-pib`; Bienes Personales — `/historico/?v=rec_bienes_personales~real~~compra~`
3. Ficha: `/dato/homicidios/`, `/dato/mortalidad-infantil/`, `/dato/presos/`, `/dato/empleo-publico-nacional/`, `/dato/retenciones/`, `/dato/viajes-al-exterior/`; fechas anuales en `/dato/pensiones-por-invalidez/`
4. Temas: `/tema/sociedad/` (nuevo), `/tema/fiscal/`, `/tema/empleo/`, `/tema/externo/`
5. Por presidente: `/dato/homicidios/#fi-pres`, `/dato/empleo-publico-nacional/#fi-pres`; Ranking `/ranking/`
6. Gráficos listos: `/plantillas/?q=recaudacion`
