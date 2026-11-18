# Datos calientes 5: pobreza infantil, el 57,4 % de la UCA en el gráfico y RIGI pendientes

Estado: implementada (2026-11-18), publicada en c7cddf4 (corrida completa en verde, run 44339393259)

Pedidos del usuario (`docs/IDEAS.md`, «Datos calientes, preguntas y pedidos (2026-11-17)»; elegido el 2026-11-18 con «Datos calientes 5»):
- «RIGI: sumar los proyectos **presentados y pendientes** (o no aprobados), no solo los aprobados».
- «El 57,4 % de pobreza (UCA, ene-24) […] Ver si conviene hacerlo más visible». Decisión (2026-11-18): «me gustaria que aparezca ese puntito en el gráfico. hacer una sola serie para la uca si solo tiene ese dato no tiene sentido. capaz ponerlo en el de la di tella un puntito rojo o una serie que combine las 3».
- «Pobreza infantil (0 a 14 años, EPH del INDEC por edad, semestral): no está; sumarla».
- «Consumo de huevo por habitante: ver si hay fuente». Primero se decidió no cargarlo (solo CAPIA, privada, con cifras de prensa que no cierran); después de ver la tanda, el usuario pidió (2026-11-18): «huevos sí cargalo» → sección E.
- RIGI, decisión (2026-11-18): **totales oficiales + lista del Monitor RIGI marcada como no oficial**.

## Reglas comunes
- Las de `datos-calientes-3.md` y D-027: bajar solo con `red.py`; respaldo en `datos/cache/`; si una fuente falla y no hay respaldo, se omite con aviso; controles puntuales avisan, estructurales cortan con `ValueError`; `desc` para un lector común; datos a mano con URL, fecha y frase. Sin cita no se carga.
- Ningún id existente cambia de significado. Ningún parámetro de URL cambia.
- Subagentes: nada de `npm run build`, commits ni servidores; informe por requisito.

## A. Pobreza infantil (pipeline, `pipeline/poblacion_salud.py`)

Fuente: INDEC, `cuadros_informe_pobreza_MM_AA.xls` (el mismo archivo que ya baja `poblacion_salud.py` con `URL_POBREZA`), hoja con el cuadro histórico «Cuadro 3.2 bis» (incidencia de la pobreza y la indigencia por grupo de edad, por semestre, total 31 aglomerados). En el `_09_26` está dentro de la hoja «Cuadro 3.2», debajo del cuadro del último semestre (el título del bis empieza cerca de la fila 19). Buscar hoja y bloque **por el texto** (título que diga «bis» o la fila de rótulos de semestre), no por posición fija: el nombre de la hoja cambia entre archivos.

Diseño leído en el `_09_26` (filas y columnas desde 0, `header=None`): fila de rótulos de semestre («2do. semestre 2016», …, «1er. semestre 2026*»); filas Total, «0-14», «15-29», «30-64», «65 y más». Cada semestre ocupa 6 columnas: +0 total (100), +1 pobres indigentes, +2 pobres no indigentes, +3 **total de pobres** (tasa de pobreza), +4 no pobres. La tasa de indigencia es la columna +1. Hay celdas como texto con coma decimal: convertirlas.

| id | Nombre | cat | tipo | unidad | dir |
|---|---|---|---|---|---|
| `pob_infantil` | Pobreza infantil (0 a 14 años) | `["Empleo, pobreza e ingresos", "Pobreza (EPH, semestral)"]` | none | % de chicos de 0 a 14 años | -1 |
| `indig_infantil` | Indigencia infantil (0 a 14 años) | ídem | none | % de chicos de 0 a 14 años | -1 |

- Semestres en la misma fecha que las tasas del INDEC (`_fecha_semestre`: 1.er semestre → enero, 2.º → julio). Desde 2S-2016.
- Bajada: el **último** archivo publicado alcanza (trae toda la serie). Probar `09_AA` y `03_AA` del año actual hacia atrás hasta encontrar uno que sea xls (`contenido[:4] == b"\xd0\xcf\x11\xe0"`) y tenga el cuadro. Respaldo `indec_pobreza_edad` con `red.cache_df` (tabla chica ya armada: semestre × [pob_0_14, ind_0_14, pob_total]). Si se puede, reutilizar el contenido ya bajado por `_bajar_pobreza_personas` en la misma corrida en vez de bajar dos veces; si complica, bajar aparte.
- Controles puntuales (avisan, ±0,05): 0-14 pobreza 1S-2024 66,1; 2S-2024 51,9; 1S-2025 45,4; 2S-2025 41,3; 1S-2026 44,5. Indigencia 0-14 1S-2024 27,0; 2S-2024 11,5; 1S-2025 10,0.
- Controles estructurales (cortan): la fila Total del cuadro igual a `pob_tasa_pobreza_personas` (±0,15) en cada semestre que esté en las dos; 0-14 ≥ total en todos los semestres; 0 < indigencia < pobreza < 100.
- `fuente`: «INDEC, Encuesta Permanente de Hogares: cuadros del informe de pobreza e indigencia (cuadros_informe_pobreza_MM_AA.xls), cuadro 3.2 bis (incidencia por grupo de edad)».
- `desc` de `pob_infantil`: porcentaje de chicos de 0 a 14 años que viven en hogares bajo la línea de pobreza, en los 31 aglomerados urbanos de la EPH, por semestre. Es la tasa del grupo (de cada 100 chicos, cuántos son pobres), no qué parte de los pobres son chicos. Notas del INDEC: 2S-2019 sin Gran Resistencia, 2S-2020 sin Ushuaia-Río Grande. Dato semestral (se ubica en enero y julio). Igual para `indig_infantil` con la línea de indigencia.

## B. El 57,4 % de la UCA en el gráfico de Di Tella (marcas sobre una serie)

Concepto nuevo y general: una serie puede llevar **marcas**, puntos sueltos de otra fuente que se dibujan sobre su gráfico sin ser parte de la serie (no entran en cálculos, medidas, rankings, «El más alto», tablas ni descargas).

### B1. Pipeline
- `catalogo.S(...)`: parámetro opcional `marcas=None`; si viene, `d["marcas"] = marcas`. Va a `catalogo.json` como metadato (no a los archivos de valores). Formato:
  `[{"f": "AAAA-MM", "v": 57.4, "t": "UCA: simulación de enero de 2024 (no es una medición)", "tipo": "simulacion" | "medicion", "fuente": "ODSA-UCA, <documento>", "url": "<nota>"}]`
- `manuales_calientes.py`, `pobreza_utdt`: marcas con los puntos de `uca_odsa` que tengan URL y cita. Mes: el `periodo` «AAAA-MM» tal cual; «AAAA-T3» → septiembre de ese año. `tipo` «simulacion» si el `tipo` del archivo empieza con «simulación», si no «medicion». La frase de la `desc` sobre la UCA se mantiene (resumida si hace falta) y dice que los puntos rojos son de la UCA.
- Ningún valor de la UCA entra en `v`.

### B2. Web
- `web/lib/motor.ts`: `SerieMeta.marcas?: MarcaSerie[]` y su tipo. Validar al leer (fecha «AAAA-MM» que esté en `fechas`, `v` número, `t` texto; descartar lo demás).
- Gráfico del Histórico y de la ficha (donde se dibuja una serie en valores tal cual, `med: "asis"`): si la serie tiene marcas, agregar una `SerieG` de solo puntos (`puntos`) con los valores de las marcas en sus meses. Color: **rojo** (token de color existente para «malo»/rojo, nunca hex en JSX) para `simulacion`; el color de la serie (o neutro) con borde para `medicion`. Nombre en la leyenda y en el globo: «UCA (puntos sueltos)»; el globo, al pasar por ese mes, muestra el `t` de la marca. Con otra medida (variación, base 100, en dólares, etc.) las marcas no se dibujan (no se puede transformar un punto suelto con la misma cuenta).
- Una etiqueta junto al punto rojo: «57,4 % · UCA, simulación» (el número con `formato.ts`). Que no tape la línea (usar la ubicación de etiquetas que ya existe si la hay).
- Imagen compartible (`web/lib/imagen*.ts`): si la imagen dibuja esa serie en valores, dibuja también las marcas y su etiqueta, con la fuente de la UCA agregada en «Fuente:». Si complica mucho, decirlo en el informe y dejarlo fuera (anotarlo en la spec).
- Plantilla nueva en `web/lib/plantillas.ts`: «Pobreza: INDEC, Di Tella y UCA», con `pob_tasa_pobreza_personas` y `pobreza_utdt` en valores en un mismo gráfico (las marcas de la UCA salen solas). `desc`: el INDEC mide por semestre; Di Tella estima un semestre móvil cada mes; los puntos de la UCA son de otra encuesta, y el 57,4 % de enero de 2024 fue una simulación, no una medición. Etiquetas: pobreza, 57, 57 %, uca, di tella, simulación, pobreza mensual.
- Sinónimos (`web/lib/nombres.ts`) de `pobreza_utdt`: sumar «uca», «57», «57,4», «odsa», «deuda social».

## C. RIGI: presentados, en evaluación y rechazados (`/rigi/`)

### C1. Datos a mano (`datos/manual/rigi.json`, campos nuevos; lo aprobado no se toca salvo el punto de Bajo del Toro)
- `totales`: fotos oficiales de los agregados, una por fuente y fecha:
  `{"fecha": "AAAA-MM-DD", "aprobados": {"n", "monto"}, "evaluacion": {"n", "monto", "empleos"}, "presentados": {"n", "monto"}, "fuente": "...", "url": "...", "cita": "..."}` (campos sin dato en `null`).
  Cargar: (1) la hoja «evaluacion» de la planilla oficial del Ministerio (`.../gviz/tq?tqx=out:csv&sheet=evaluacion`, bajarla y anotar fecha de descarga): 21 proyectos, US$ 140.204 M, 108.487 empleos; (2) la nota oficial del portal RIGI del 11/06/2026 (`https://www.argentina.gob.ar/node/504545`): 16 aprobados US$ 29.892 M; 25 en evaluación US$ 111.037 M, 142.168 empleos; 41 presentados; (3) Caputo en Rosario, 29/10/2026 (nota de prensa con frase textual): 48 presentados por casi US$ 210.000 M, 30 aprobados. Abrir cada una y copiar la frase. Lo que solo se vio en un extracto del buscador no entra.
- `pendientes`: lista con nombre del **Monitor RIGI** (DESIP-IIEP; `https://monitor-rigi-desip-iiep.github.io/RIGI/base-datos.html`, XLSX `.../downloads/base_completa.xlsx`, hoja «Proyectos»), estado «En evaluación» y «Rechazado»:
  `{"nombre", "empresa", "provincias": [], "sector", "monto", "fecha_presentacion": "AAAA-MM-DD"|null, "estado": "evaluacion"|"rechazado", "url": "<link de la columna links_fuentes o la mejor nota>", "fecha_rechazo": "AAAA-MM-DD"|null}`
  y a nivel archivo `fuente_pendientes` («Monitor RIGI (DESIP-IIEP), base de datos no oficial, actualizada al <fecha de su portada>»), `url_pendientes`, `fecha_descarga_pendientes`. Sectores con los mismos nombres que usan los aprobados (mapear). Control: la suma de los «En evaluación» igual al total que declara el monitor (US$ 126.218 M con 16 proyectos al 17/11/2026; si cambió, el del día).
- **Bajo del Toro** (YPF-Vista, US$ 8.729 M): el monitor lo pone en evaluación pero cita la Resolución 1976/2026 (Boletín Oficial del 13/11/2026, `https://www.boletinoficial.gob.ar/detalleAviso/primera/350287/20261113`). Abrir la resolución: si **aprueba** la adhesión al RIGI, pasa a `proyectos` (aprobados) con norma, fecha y cita, y se saca de `pendientes`; si es otra cosa, queda pendiente y se anota en `nota`.
- Los que el monitor ya marca aprobados deben coincidir con los 30 de `proyectos` (mismos nombres o equivalentes). Listar en el informe cualquier diferencia; no cambiar aprobados sin norma.
- `nota_pendientes`: la planilla oficial cuenta 21 en evaluación y la lista con nombres tiene 16 (no se sabe cuáles 5 faltan); los montos son los de la solicitud según el monitor y pueden diferir de lo anunciado.

### C2. Pipeline (`manuales_calientes.construir_rigi`)
Pasar a `web/public/datos/rigi.json`: `totales` (ordenados por fecha), `pendientes` (con `estado`) y `fuente_pendientes` `{texto, url, fecha}` y `nota_pendientes`. Controles: un pendiente con el mismo nombre que un aprobado corta (`ValueError`); montos ≥ 0. El resto del contrato no cambia.

### C3. Web (`web/lib/rigi.ts`, `web/components/secciones/Rigi.tsx`)
- `decodificar` lee los campos nuevos con la misma validación (texto, número, link solo http(s), fechas ISO); si faltan, la página se ve como hoy.
- Arriba de la tabla de aprobados, un bloque «Presentados y en evaluación» con la foto oficial más reciente: «N proyectos en evaluación por US$ X (Ministerio de Economía, <fecha>)», aprobados y presentados si la foto los trae, y debajo las fotos anteriores en una línea cada una (fecha, fuente con link). Números con `formato.ts` y `txtUsd`.
- Una pestaña o selector (chips compactos, R24; estado en la URL con un parámetro nuevo, por ejemplo `e=evaluacion`, sin cambiar los existentes) para ver la tabla de **Aprobados** (la de hoy) o **En evaluación** (la lista nueva: nombre, empresa, provincias, sector, monto, fecha de presentación, link «fuente»). Encima de la tabla de evaluación, aviso visible: «Lista no oficial: Monitor RIGI (DESIP-IIEP), al <fecha>. El Gobierno solo publica el total: <n> proyectos por US$ <x>. Esta lista tiene <m>», con link. Orden por monto y por fecha como la de aprobados.
- Rechazados: debajo, una línea por proyecto («Mariana, Litio Minera Argentina (Salta), US$ 273 millones: rechazado en jul-25», con link).
- La imagen compartible de `/rigi/`, si existe, no cambia salvo que sea trivial sumar el total en evaluación.

## D. Catálogo, nombres y páginas fijas (sesión principal o subagente de la web)
- `datos/series_esperadas.txt`: `pob_infantil`, `indig_infantil`.
- `web/lib/nombres.ts`: nombres públicos de las dos series y sinónimos: «pobreza infantil», «chicos pobres», «niños pobres», «niñez», «infancia», «menores», «0 a 14», «indigencia infantil».
- `web/lib/plantillas.ts`: «Pobreza infantil: chicos de 0 a 14 años» (`pob_infantil` y `pob_tasa_pobreza_personas` en valores, mismo gráfico) además de la de B2.
- `web/lib/datos-fijos.ts`: `pobreza-infantil` (`pob_infantil`, `asis`).
- `docs/IDEAS.md`: huevo → «sin fuente confiable (2026-11-18): solo CAPIA por prensa, cifras que no cierran»; las otras tres ideas, `→ spec: docs/specs/datos-calientes-5.md`.

## E. Consumo de huevo por habitante (agregado el 2026-11-18)
- `datos/manual/huevo.json` (D-027): `{actualizado, fuente, nota, valores: [{anio, huevos, proyectado, url, fecha, documento, cita}], discrepancias: [...]}`. Fuente: Anuarios Avícolas de la Secretaría de Agricultura (2002-2014 y 2020-2025, valor de la edición más nueva que trae cada año; usan la producción estimada por CAPIA); 2015-2019, que los anuarios no traen, de comunicados de CAPIA citados por la prensa (`fuente_alterna`). Si dos fuentes no coinciden en un año, se carga una sola (el documento de CAPIA o el más reciente) y la otra va a `discrepancias`.
- Serie `consumo_huevo` (`manuales_calientes.py`): «Consumo de huevo por habitante», `["Actividad", "Consumo e indicadores de demanda"]`, none, «huevos por habitante por año», dir 1, anual en diciembre, huecos sin interpolar; la `desc` dice que no es oficial, qué años son proyectados y cuáles faltan. Control estructural: valores entre 50 y 600.
- Web: nombre público «Consumo de huevo por habitante», sinónimos (huevo, huevos, consumo per cápita, avícola), página fija `huevo`. Sin gráfico listo con las carnes (otra unidad).

## Cómo se verifica
1. `python -m ruff check pipeline`; `python pipeline/obtener_datos.py` completo (red): las dos series nuevas en el catálogo, los controles de A impresos como cumplidos, `rigi.json` con totales, pendientes y rechazado; `python pipeline/verificar_series.py` sin faltantes.
2. `cd web && npm run lint && npm run tipos && npm run build`.
3. En `http://localhost:3100` (vista `web-out`):
   - `/historico/?v=pobreza_utdt~asis~~compra~`: punto rojo en ene-24 con 57,4 y su etiqueta; los puntos de medición de la UCA; el globo dice el texto; con variación no aparecen.
   - La plantilla «Pobreza: INDEC, Di Tella y UCA» y la ficha `/dato/pobreza-infantil/`: 1S-2024 = 66,1 %; último 1S-2026 = 44,5 %.
   - `/rigi/`: bloque de totales, pestaña En evaluación con 16 (o lo que dé el monitor) y aviso de lista no oficial, rechazado, link de cada fila; el parámetro en la URL al recargar.
   - La lupa encuentra «pobreza infantil», «57» y «RIGI pendientes».
   - 375 px sin desborde en `/rigi/` y en el Histórico con las marcas.
4. Barridos: `npx tsx scripts/barrido-cuentas.ts`.
5. Revisor contra esta spec.

## Lo que cambió respecto de la spec
- Aprobados en el bloque de totales: salen de la lista oficial de 30 (exacta, US$ 79.649 M), no de la foto de Caputo (aproximada). Las fotos usadas arriba no se repiten en «Fotos anteriores».
- `filasGrafico` tiene la opción `incluir`: el gráfico alcanza el mes de las marcas aunque la serie empiece después (Di Tella arranca en jul-24; el 57,4 % es de ene-24). La tabla del Histórico recorta esas filas vacías.
- Se agregó una etiqueta también al 49,5 % de dic-23 (la otra simulación de la UCA).
- Bajo del Toro: el Boletín Oficial no abre con acceso automático; la Resolución 1976/2026 que le asocia el Monitor es la de Midstream de Gas del Sur (ya cargada), así que queda en evaluación.
- Mariana: rechazo con la nota de La Nación del 23/07/2025 (fecha del anuncio); la fecha de presentación queda vacía (sin fuente).
- Correcciones en los aprobados, encontradas al cruzar con el Monitor: PSJ Cobre Mendocino era la Resolución 801/2026 (la 809/2026 cargada antes es otra norma) y La Rinconada se aprobó con la Resolución 1983/2026 (firmada el 13/11/2026). Las dos abiertas en argentina.gob.ar.
- Título de /rigi/: «RIGI: grandes inversiones aprobadas y en evaluación».

## Verificación (2026-11-18)
- Pipeline completo (`PYTHONUTF8=1`): 705 series, `verificar_series` OK; controles de pobreza infantil cumplidos (1S-24 66,1; 2S-24 51,9; 1S-25 45,4; 2S-25 41,3; 1S-26 44,5; indigencia 27,0 / 11,5 / 10,0; fila Total = tasa del INDEC en 20 semestres). `rigi.json`: 30 aprobados, 3 totales, 16 en evaluación (US$ 126.218 M = Monitor) y 1 rechazado.
- `ruff`, `npm run tipos`, `npm run lint`, `npm run build`, `barrido-cuentas.ts` sin hallazgos.
- Navegador (`web-out`): punto rojo 57,4 % con etiqueta en el Histórico de Di Tella (captura); ficha `/dato/pobreza-infantil/` 44,5 %; `/rigi/` con totales, pestaña En evaluación (16), aviso y rechazado, sin desborde a 375 px (medido). El panel quedó oculto en parte de la prueba: las marcas a 375 px se midieron, no se vieron.
- Huevo (E): 24 años 2002-2025, ficha `/dato/huevo/` = 401 en 2025; citas de 2024 y 2016 abiertas en la sesión principal. Se redondea a huevos enteros (2015: 265,1 y 2016: 272,8 en la fuente). Corrida completa: 706 series.
- Revisor: primera pasada marcó Mariana sin cita, el control estructural que no cortaba y filas vacías en la tabla (arreglados).

## Dónde ver los cambios
Local `http://localhost:3100<ruta>` (vista `web-out`); publicado `https://primerolosdatos.com.ar<ruta>` después del push y la corrida en verde (completa, unos 10 minutos: toca el pipeline).
1. Portada (buscador): 1.1 la lupa encuentra «pobreza infantil», «57», «UCA» y «RIGI en evaluación» — `/`.
2. Histórico: 2.1 punto rojo del 57,4 % y puntos de la UCA sobre Di Tella — `/historico/?v=pobreza_utdt~asis~~compra~`; 2.2 gráfico listo «Pobreza: INDEC, Di Tella y UCA»; 2.3 gráfico listo «Pobreza infantil: chicos de 0 a 14 años»; 2.4 la imagen para compartir lleva los puntos.
3. Ficha: 3.1 `/dato/pobreza-infantil/`; 3.4 `/dato/huevo/`; 3.2 `/dato/?v=indig_infantil`; 3.3 puntos de la UCA en la ficha de Di Tella.
4. RIGI: 4.1 totales `/rigi/#totales`; 4.2 En evaluación `/rigi/?e=evaluacion`; 4.3 rechazados; 4.4 PSJ Cobre Mendocino con su norma correcta; 4.5 La Rinconada aprobada (`/dato/?v=rigi_aprobado`).
Página con links: `docs/cambios/datos-calientes-5.html`.
