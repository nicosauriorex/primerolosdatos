# Datos calientes 3: puestos de trabajo, pobreza en personas, natalidad, vacunas, obra pública, motos, robos de autos, empresas, RIGI, piquetes y carne

Estado: implementada (2026-11-17), publicada en 13b023b (corrida completa en verde, run 44089512632; /rigi/, /dato/piquetes/, /dato/puestos-de-trabajo/ y /dato/pobres/ responden en el sitio)

Pedidos del usuario (2026-11-17): «seguí con los datos calientes que faltan» (robos, motos, obra pública, vacunas, empleadores, de `datos-nuevos-2-2026-11-16.md`); «puestos de trabajo totales? (formal + informal)»; «pobreza en numero de personas? (creo que tenemos el % nomás). y pobreza de alta frecuencia (la medicion mensual, habia una fuente que en enero 26 daba como 57% creo)»; «inversiones rigi anunciadas y ejecutadas?»; «piquetes?»; «consumo de carne?»; «ingresos, alumnos regulares y graduados?»; «natalidad, mortalidad?».
Decisiones del usuario: pobreza en personas → las dos (31 aglomerados oficial + estimación del país como cuenta propia); pobreza mensual → a mano con cita; piquetes y carne → «ambas a mano. pero chequea porque el gobierno dice que las bajó a cero»; RIGI → panel con lista de aprobados + lo ingresado con su cita.
Investigación: `docs/investigaciones/datos-nuevos-3-2026-11-17.md`. Universidades (inscriptos, estudiantes, egresados) **no entra**: la Síntesis de la SPU y el CSV de datos abiertos no cierran entre sí (decirlo en el informe).

Todo entra como series del catálogo (ficha, Histórico, Por presidente, lupa, imagen) salvo el RIGI, que además tiene página propia `/rigi/`.

## Reglas comunes (como `pipeline/mas_series.py` y `pipeline/sociedad.py`)
- Bajar solo con `red.py` (`red.bajar`, `red.cacheado`, `red.cache_df`, `_cacheado_dict`); nunca `urlopen`. Si una fuente falla se usa el respaldo de `datos/cache/`; si no hay respaldo, se omiten esas series con un aviso, sin romper la corrida.
- Anuales en diciembre con `_anual_a_diciembre` (de `proteccion_social`); trimestrales con `_trim_a_mes` (stocks sin repartir; flujos con `repartir=True`); semestrales con la misma convención que ya usan las series de pobreza del INDEC en `pipeline/catalogo.py` (líneas ~458-490: mirar en qué mes cae cada semestre y copiarla).
- Valores de control puntuales: solo avisan (`_control` de `mas_series.py`); controles estructurales (sumas, rangos, cantidad de provincias) cortan con `ValueError`.
- `desc` para un lector común, diciendo lo que hace falta para no engañar; `fuente` con organismo, dataset y número de serie.
- Ids nuevos a `datos/series_esperadas.txt` (lo hace la sesión principal al final).
- Nada de `npm run build`, commits ni servidores en los subagentes.

## Fase 1A. `pipeline/trabajo_obra.py` (`series(idx)`)

| id | Nombre | cat | tipo | unidad | dir | Fuente y notas |
|---|---|---|---|---|---|---|
| `puestos_total` | Puestos de trabajo totales (formales e informales) | `["Empleo, pobreza e ingresos", "Puestos de trabajo (INDEC, trimestral)"]` | none | miles de puestos | 1 | API `324.1_TOTAL_GENEAJO__29`, trimestral 1T-16 → (stock: sin repartir) |
| `puestos_asal_reg` | Puestos asalariados registrados | ídem | none | miles de puestos | 1 | `324.1_TOTAL_GENEADO__51` |
| `puestos_asal_noreg` | Puestos asalariados no registrados (en negro) | ídem | none | miles de puestos | -1 | `324.1_TOTAL_GENEREG__32` |
| `puestos_no_asal` | Puestos no asalariados (cuentapropistas y patrones) | ídem | none | miles de puestos | 0 | `324.1_TOTAL_GENESAL__34` |
| `puestos_noreg_pct` | Asalariados no registrados (% de los puestos asalariados) | ídem | none | % | -1 | no registrados / (registrados + no registrados) × 100 |
| `obra_publica` | Obra pública nacional (inversión real directa) | `["Fiscal"]` | ars | millones de $ | 0 | API `379.9_GTOS_CAP_I017__36_40` (2015 →), `379.8_GTOS_CAP_I014__41_48` (2007-2014), `379.7_GTOS_CAP_I006__41_1` (1993-2006). agg, flujo |
| `empresas_art` | Empresas con trabajadores registrados | `["Empleo, pobreza e ingresos", "Empleo registrado (SIPA)"]` | none | empresas | 1 | SRT, cuadro 1.2, fila «Parte empleadora afiliada de unidades productivas con personas trabajadoras declaradas (1)» |
| `motos_0km` | Patentamientos de motos 0 km | `["Actividad", "Consumo e indicadores de demanda"]` | none | motos | 1 | DNRPA, paquete `72d85f23-b751-4d12-935b-25e32ed9445e`. agg |
| `motos_usadas` | Ventas de motos usadas (transferencias) | ídem | none | motos | 1 | ídem. agg |
| `robos_autos` | Robos y hurtos de autos (trámites en el Registro del Automotor) | `["Sociedad", "Seguridad"]` | none | autos | -1 | DNRPA, paquete `a9bdfec2-0af4-433a-b810-38c91275a251`. agg |
| `recuperos_autos` | Autos robados recuperados (trámites en el Registro) | ídem | none | autos | 1 | ídem. agg |

Detalles:
- **Puestos (CGI):** la API dice «En millones de pesos»: es un error, son miles de puestos (22.565,8 = 22,6 millones). Control estructural: registrados + no registrados + no asalariados = total (±0,01) en todos los trimestres. Controles: 1T-16 total 19.734,8; 2T-26 total 22.565,8, no registrados 5.600,7; 4T-25 total 23.152,9. `desc`: cuenta **puestos**, no personas (quien tiene dos trabajos cuenta dos veces); combina SIPA y otros registros con la EPH; por eso no coincide ni con la EPH (personas, 31 aglomerados) ni con el SIPA (solo lo formal). Sin desestacionalizar: el 4.º trimestre es siempre el pico; comparar con el mismo trimestre de otro año.
- **Obra pública:** tres tramos en millones de pesos corrientes. 2014→2015 empalma bien (dic-14 4.669,7, ene-15 4.661,9). Para 2006→2007 (dic-06 850,2, ene-07 504,4) comparar la caída dic→ene con la de los otros años de cada tramo: si es del mismo orden (estacionalidad de diciembre), pegar los tres tramos; si no, empezar en ene-2007 y decirlo en el informe. Control: suma de los meses de un año del tramo 2015+ contra el anual de la API si existe (buscar `379.9_GTOS_CAP_I017__36_*` anual; si no hay, no se compara). Controles: dic-24 204.098,0; sep-26 288.373,1. `desc`: compra y construcción de bienes de capital del Sector Público Nacional (rutas, edificios, equipos), base caja; no incluye lo que la Nación gira a las provincias para obras (está en «Transferencias de capital a provincias»). Verla en pesos de hoy o en % del PIB.
- **Empresas (SRT):** xlsx `https://www.srt.gob.ar/estadisticas/series/co/up/Serie_historica_Segun_ART_o_empleador_autoasegurado%20-%20UP.xlsx`; la URL puede cambiar: si falla, buscar en `https://www.srt.gob.ar/estadisticas/cf_serie_historica_up.php` el `href` que termina en `.xlsx` y contiene «UP». Hoja `Cuadro 1.2`, meses en columnas. Usar la fila (1) (sin casas particulares; no sumar las ART). Controles: jul-96 318.723; dic-15 533.107; nov-23 512.357; ago-26 479.928. `desc`: empleadores (empresas y otras unidades productivas, sin casas particulares) que tienen al menos un trabajador declarado en una ART; la SRT avisa que un cambio de un mes puede venir de rescisiones o de nóminas vacías y no es igual a empresas que abren o cierran.
- **Motos:** reutilizar `_url_csv` y `_leer_dnrpa` de `mas_series.py` (importarlas; no copiar), con el paquete de motos y los prefijos «Estadística de inscripciones iniciales de motovehículos» y «Estadística de transferencias de motovehículos». Respaldo `dnrpa_motos`. Control: 24 provincias todos los meses (como autos, ≥ 20). Controles: ene-07 28.659 / 8.293; dic-25 60.939 / 40.958; oct-26 81.713 / 47.335.
- **Robos y recuperos:** `package_show` del paquete; un ZIP por año (2018 →, recurso «DNRPA. Robos y recuperos de autos - AAAA»), un CSV por mes adentro. Contar renglones por `tramite_tipo` y mes de `tramite_fecha`: `DENUNCIA DE ROBO O HURTO / RETENCION INDEBIDA` → robos; `COMUNICACIÓN DE RECUPERO` → recuperos (comparar sin tildes ni mayúsculas). Guardar en el respaldo el conteo mensual ya armado (`dnrpa_robos`, chico), no los ZIP; los años cerrados no se vuelven a bajar si están en el respaldo, el año en curso como mucho una vez por día. Controles: ene-18 3.066 / 97; abr-20 824 / 12; may-24 5.013 / 120; sep-26 2.464 / 169. `desc`: denuncias de robo o hurto inscriptas en los Registros Seccionales del Automotor (DNRPA), no el total de denuncias policiales (el SNIC mide otra cosa); muchas provincias registran poco; el recupero se cuenta en el mes en que se comunica, no en el del robo; solo autos (los robos de motos no se publican).

## Fase 1B. `pipeline/poblacion_salud.py` (`series(idx, pob=None)`; `pob` = serie `poblacion` del catálogo, como en `sociedad.py`)

| id | Nombre | cat | tipo | unidad | dir | Fuente y notas |
|---|---|---|---|---|---|---|
| `natalidad` | Tasa de natalidad | `["Sociedad", "Población"]` | none | nacimientos cada 1.000 habitantes | 0 | API `tn_arg` (2000-2024). Control 2010 18,7; 2024 8,9 |
| `nacimientos` | Nacimientos | ídem | none | nacidos vivos | 0 | DEIS, dataset `d1350588-d8bb-4892-b21c-48738311e218` de datos.salud.gob.ar: CSV 2005-2022 (68 MB), 2023 y 2024; suma de `nacimientos_cantidad` por año. Control 2010 756.176; 2024 413.135 |
| `defunciones` | Defunciones | ídem | none | muertes | 0 | API `hdef_arg` (1914-2023) + xlsx `serie-historica-defunciones-ocurridas-argentina-jurisdiccion-1914-2024.xlsx` para los años que falten. Control 2021 436.799; 2023 353.428; 2024 376.405 |
| `mortalidad` | Tasa de mortalidad | ídem | none | muertes cada 1.000 habitantes | 0 | defunciones / población × 1.000 (cuenta propia, se dice en `desc`) |
| `vacuna_dtp3` | Vacunación: 3.ª dosis de DTP (difteria, tétanos y tos convulsa) | `["Sociedad", "Salud"]` | none | % de niños de 1 año | 1 | GHO OMS `WHS4_100`. Control 2010 94; 2023 66; 2025 75 |
| `vacuna_sarampion1` | Vacunación: 1.ª dosis contra el sarampión | ídem | none | % de niños | 1 | `WHS8_110`. Control 2010 95; 2025 82 |
| `vacuna_sarampion2` | Vacunación: 2.ª dosis contra el sarampión | ídem | none | % de niños | 1 | `MCV2`. Control 2010 94; 2025 46 |
| `vacuna_bcg` | Vacunación: BCG (tuberculosis, al nacer) | ídem | none | % de recién nacidos | 1 | `WHS4_543`. Control 2010 99; 2025 81 |
| `pobres_31` | Personas pobres (31 aglomerados urbanos) | `["Empleo, pobreza e ingresos"]` con la misma subcategoría que las tasas de pobreza actuales | none | personas | -1 | INDEC, xls por semestre (1S-18 →) |
| `indigentes_31` | Personas indigentes (31 aglomerados urbanos) | ídem | none | personas | -1 | ídem |
| `pobres_pais` | Personas pobres en todo el país (estimación propia) | ídem | none | personas | -1 | tasa de pobreza de personas × `poblacion` |
| `indigentes_pais` | Personas indigentes en todo el país (estimación propia) | ídem | none | personas | -1 | tasa de indigencia × `poblacion` |

Detalles:
- **Nacimientos:** el CSV de 2005-2022 pesa 68 MB: guardar en el respaldo solo el total por año (`deis_nacimientos`) y no volver a bajar los años que ya estén; solo se baja el archivo de un año que falte (buscar los recursos con `package_show` de datos.salud.gob.ar). El CSV 2023 es `;` y tiene líneas rotas: si hace falta `on_bad_lines="skip"`, contar cuántas se saltearon e imprimirlo; si son más del 0,5 %, aviso. Se cuentan por residencia de la madre (decirlo).
- **Defunciones:** son las ocurridas en el país (criterio distinto al de nacimientos: decirlo). 2020-2022 con exceso de mortalidad por covid.
- **Vacunas:** endpoint `https://ghoapi.azureedge.net/api/<código>?$filter=SpatialDim eq 'ARG'` (JSON: `TimeDim`, `NumericValue`). `desc`: estimación de la OMS y UNICEF (WUENIC), que cada año revisa la serie hacia atrás; el Ministerio de Salud informa coberturas más altas con su registro nominal (NOMIVAC; en 2025 dijo quíntuple 91,6 %, BCG 93,5 %): son métodos distintos, no un error. Control de rango: 0 a 100.
- **Pobreza en personas:** `https://www.indec.gob.ar/ftp/cuadros/sociedad/cuadros_informe_pobreza_MM_AA.xls` con `MM` = `03` (2.º semestre del año anterior) o `09` (1.er semestre); probar desde el más nuevo posible hacia atrás. **Una URL inexistente devuelve 200 con HTML**: validar la cabecera OLE (`D0 CF 11 E0`) antes de leer. Hoja «Poblaciones (Ex cuadro 4.2)» (en archivos viejos, la 4.2): personas pobres e indigentes del semestre. Normalizar: hasta 1S-21 vienen en personas, después con puntos como texto, y en 2026 en miles. Respaldo: la tabla semestre → (pobres, indigentes, población cubierta) (`indec_pobreza_personas`); los semestres que ya están no se vuelven a bajar. 2S-19 no está (`03_20` no existe): queda vacío. Controles: 1S-18 7.581.118; 2S-24 11.337.979; 1S-26 9.729.000; población cubierta 1S-26 30.143.000. Control estructural: pobres / población cubierta × 100 = tasa de pobreza publicada (±0,2 puntos) en cada semestre que esté en las dos.
- **Estimación del país (D-027):** tasa de pobreza (e indigencia) de personas de las series actuales × `poblacion` del mismo mes, redondeado a miles. `desc`: el INDEC mide la pobreza solo en 31 ciudades (unos 30 millones de personas, ~63 % de la población); esta cifra supone que el resto del país (ciudades chicas y zona rural) tiene la misma tasa; la oficial es la de 31 aglomerados. En la de 31 aglomerados, `desc` dice cuánta gente cubren.

## Fase 1C. Datos a mano con cita (`datos/manual/`), los busca un subagente `investigador-datos`
Regla (como `herencia.json` y `femicidios.json`): cada valor con documento (URL), fecha de publicación y la frase o tabla de donde sale. Sin cita, no se carga. La sesión principal abre al menos dos citas de cada archivo para comprobarlas.

1. `pobreza_alta_frecuencia.json`: el Nowcast de Pobreza de la UTDT (Martín González-Rozada), una entrada por ventana de 6 meses (`desde`, `hasta`, `pobreza`, `indigencia`, `url`, `cita`), lo más atrás que se pueda (idealmente desde 2024), priorizando el informe o la nota de la UTDT sobre la prensa; y los puntos de la UCA/ODSA, incluido el 57,4 % de enero de 2024 (simulación, decir que no es una medición), con su cita.
2. `piquetes.json`: cortes de calle y ruta por año según Diagnóstico Político (2009 →, lo que se consiga con cita; mensual si aparece citado), con la definición que usa la consultora. **Además**, como pidió el usuario («chequea porque el gobierno dice que las bajó a cero»): la frase del Gobierno (quién, cuándo, dónde, textual) y lo que dijeron los chequeos (Chequeado u otros), y cualquier conteo oficial del Ministerio de Seguridad si existe. Va en el archivo como `afirmaciones` (no como valores de la serie).
3. `carne.json`: consumo per cápita de carne vacuna (kg por habitante por año) de la Secretaría de Agricultura, «Indicadores bovinos anuales 1914-2025» (PDF en `https://www.magyp.gob.ar/sitio/areas/bovinos/informacion_sectorial/_archivos/000030_Indicadores/`); bajar **un solo archivo por pedido, despacio** (el sitio bloquea si se le pide mucho). Pollo y cerdo si están en el mismo documento o en el «Tablero consumo per capita de carnes» oficial. Si no se puede abrir, CICCRA (privada) con cita, marcada como privada; el CSV de datos.gob.ar (1990-2018) sirve de control de la serie oficial.
4. `rigi.json`: copia de la planilla oficial (Sheet `1eytHJrzUjIFOXI-P1Hx_wbmZiSqPxVle059Djdos6u8`, hoja `dataset`: `https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&sheet=dataset`; saltear la fila 2 de encabezados en español) con un proyecto por fila sin repetir (agrupando las provincias), y la **fecha de aprobación** de cada uno sacada de su norma (`enlace`: resolución en argentina.gob.ar/normativa o Boletín Oficial). Además `ingresado`: la cifra del BCRA (USD 1.205 M brutos, 452 M egresos, 762 M netos al 1T-2026; Chequeado notó que la resta da 753) con la fuente original si se encuentra (presentación de Vladimir Werning) y, si no, la nota que la cita; y cualquier dato oficial más nuevo de lo invertido.

## Fase 1D. `pipeline/manuales_calientes.py` (`series(idx)` + `escribir_rigi(dir_web)`)
Lee los cuatro archivos de la fase 1C y arma:

| id | Nombre | cat | tipo | unidad | dir | Notas |
|---|---|---|---|---|---|---|
| `pobreza_utdt` | Pobreza: estimación mensual de la UTDT (semestre móvil) | la de las tasas de pobreza | none | % de personas | -1 | valor en el mes final de cada ventana; `desc`: estimación privada (nowcast) con datos de la EPH simulados, 31 aglomerados; no es el dato del INDEC y se revisa |
| `piquetes` | Piquetes (cortes de calle y ruta) | `["Sociedad", "Seguridad"]` | none | cortes por año | -1 | anual en diciembre; `desc` con la definición de la consultora, que es privada y cuenta con noticias, y la frase del Gobierno y el chequeo, con sus links |
| `carne_vacuna` | Consumo de carne vacuna por habitante | `["Actividad", "Consumo e indicadores de demanda"]` | none | kg por habitante por año | 1 | anual en diciembre |
| `carne_aviar`, `carne_porcina` | Consumo de pollo / de cerdo por habitante | ídem | none | kg por habitante por año | 1 | solo si están en la fuente |
| `rigi_aprobado` | Inversión comprometida en proyectos RIGI aprobados (acumulada) | `["Sector externo"]` | none | millones de US$ | 1 | suma acumulada por mes de aprobación, desde el primer aprobado |

`escribir_rigi` escribe `web/public/datos/rigi.json` (contrato con la página):
```
{ "actualizado": "AAAA-MM-DD", "fuente": {"texto": "...", "url": "..."},
  "proyectos": [{"nombre", "empresa", "provincias": [..], "sector", "monto": <millones US$>, "empleos": <n|null>,
                 "fecha": "AAAA-MM-DD"|null, "norma": "<url>"}],
  "ingresado": {"bruto", "egresos", "neto", "hasta": "AAAA-MM", "texto", "url"} | null,
  "nota": "..." }
```
Se engancha en `catalogo.construir` (la sesión principal agrega las líneas) y `escribir_rigi` donde se escriben los otros JSON aparte (buscar cómo lo hace `herencia_informes` en `obtener_datos.py`). Con `--solo-json` funciona igual (solo lee `datos/manual/`).

## Fase 2. Web (un subagente; no toca el pipeline)
1. `web/lib/nombres.ts` (y `catalogo.ts` si hace falta): subcategorías nuevas («Puestos de trabajo (INDEC, trimestral)», «Población») con nombre público; sinónimos de búsqueda: trabajo en negro, informalidad, informales, puestos de trabajo, empleo total, cuentapropistas, monotributistas, pobres, cantidad de pobres, millones de pobres, indigentes, nowcast, UTDT, natalidad, nacimientos, bebés, fecundidad, muertes, defunciones, mortalidad, vacunas, vacunación, sarampión, calendario de vacunas, obra pública, obras, inversión pública, rutas, empresas, empleadores, cierre de empresas, pymes, motos, motos 0 km, robo de autos, autos robados, inseguridad, piquetes, cortes, protestas, carne, asado, consumo de carne, pollo, cerdo, RIGI, inversiones, grandes inversiones.
2. `web/lib/temas.ts`: principales nuevos: Empleo/pobreza → «Puestos de trabajo totales» (`puestos_total`, asis) y «Personas pobres (31 aglomerados)» (`pobres_31`, asis); Cuentas públicas → «Obra pública nacional» (`obra_publica`, real); Seguridad y salud → «Vacunación (sarampión, 1.ª dosis)» y «Natalidad». Párrafos cortos en `web/lib/info.ts` donde corresponda.
3. `web/lib/plantillas.ts`: «Trabajo formal e informal» (las tres partes de los puestos), «Pobres: 31 aglomerados y todo el país», «Natalidad y mortalidad», «Vacunación: sarampión, DTP y BCG», «Autos y motos 0 km», «Robos y recuperos de autos».
4. `web/lib/datos-fijos.ts`: `puestos-de-trabajo`, `trabajo-en-negro` (`puestos_noreg_pct`), `pobres`, `natalidad`, `vacunacion`, `obra-publica`, `empresas`, `motos`, `robos-de-autos`, `piquetes`, `carne`, `rigi`.
5. **Página `/rigi/`** (`web/app/rigi/page.tsx` + `web/components/secciones/Rigi.tsx`, con el molde de `/semaforo/`): lee `rigi.json`; arriba, tres cifras: proyectos aprobados, inversión comprometida (US$) y lo ingresado según el BCRA (con su fecha y link, y la aclaración de que no hay serie oficial de lo invertido); un total por sector (barras horizontales); la tabla de proyectos (nombre, empresa, provincias, sector, monto, fecha con link a la norma), ordenable por monto y fecha; abajo la fuente. Sin el JSON, la página dice que no hay datos y no rompe. Entrada en la lupa (`busqueda.ts`, tipo `seccion`) y en el menú donde estén las otras páginas especiales (mirar `/semaforo/` y `/herencia/`); link desde el tema Sector externo. Chips y tablas con los componentes y reglas de `.claude/rules/frontend.md`. Sin imagen propia en esta tanda (la serie `rigi_aprobado` tiene la de su ficha).

## Decisión D-027 (a `docs/DECISIONES.md`)
Pobres en todo el país = tasa de los 31 aglomerados × población total del INDEC, siempre al lado de la cifra oficial y diciendo el supuesto. Datos privados (UTDT, Diagnóstico Político, CICCRA) entran solo a mano, con cita y marcados como privados en `desc` y `fuente`.

## Cómo se verifica
1. `python pipeline/obtener_datos.py` termina sin error; las series nuevas aparecen (≈ 37) y `verificar_series.py` pasa; los controles se imprimen y pasan (o avisan, explicado).
2. Valores de control en `web/public/datos/` (abrir el JSON de la serie con un script, no a mano).
3. `cd web && npm run tipos && npm run previas && npm run build`.
4. En `web-out`: ficha de cada `/dato/<slug>/` nuevo, Por presidente de puestos y obra pública, temas con sus principales, lupa con «trabajo en negro», «pobres», «vacunas», «piquetes», «carne», «rigi», «motos», «robo de autos»; `/rigi/` con su tabla; 360 px sin desborde ni errores de consola.
5. Revisor contra esta spec.

## Fuera de esta spec
Universidades (inscriptos, estudiantes y egresados en serie larga), robos de motos, tasa global de fecundidad, cobertura de vacunas del Ministerio en serie, lo invertido por el RIGI mes a mes.

## Verificación (2026-11-17)
- Pipeline completo sin error (cuatro corridas; la última después de las correcciones): 660 series (27 nuevas), `verificar_series.py` OK, `rigi.json` con 30 proyectos. Controles: los de la tabla de cada fase, todos cumplidos (informes de los subagentes y salida de la corrida); puestos registrados + no registrados + no asalariados = total en los 42 trimestres; obra pública: suma mensual = anual `379.3_GTOS_CAP_I017__36_45` en 2015-2025 y empalmes 2006/2007 (0,59 contra 0,47-1,41 de otros años) y 2014/2015 (1,00) dentro de rango, se pegan los tres tramos; pobres / población cubierta = tasa publicada en los 16 semestres; DNRPA motos con 24 provincias todos los meses.
- Citas de los datos a mano comprobadas por la sesión principal (abiertas): iProfesional (tabla del Nowcast UTDT, 29,9 % a 32,6 %), Chequeado 2026 sobre piquetes («Falso»; 8.239 / 5.996 / 3.893; 95.152 en 2009-2025), Los Andes (carne 2024-2025: 48,49 y 49,92), Resolución 1/2025 (El Quemado, 7-1-2025) y Chequeado sobre lo ingresado por el RIGI (1.205 / 452 / 762). Los Andes dice porcina 2025 «19,89» (el subagente lo corrigió a 18,89 por la suma): por eso no hay serie de cerdo.
- Decisiones al implementar: puestos con un valor por trimestre (como la EPH; la web dice «Datos trimestrales»); carne sin 2019-2023 (el sitio de Agricultura bloqueó la descarga; no se reintentó contra el bloqueo) y sin pollo ni cerdo; piquetes sin 2019 y 2021 (sin cita abierta); el «ingresado» del RIGI cita a Chequeado porque en la presentación del BCRA las cifras están en un gráfico; la plantilla de robos muestra solo robos (los recuperos quedaban planos en el mismo eje); La Rinconada (US$ 231 M) sin resolución encontrada: está en la lista y el total de /rigi/ (se aclara) pero no en la serie acumulada.
- Web: tipos, previas (58 de 58) y build sin error. En el navegador (leyendo el contenido y midiendo; sin capturas, el panel está oculto): `/rigi/` (cifras, sectores, tabla ordenable), fichas nuevas, «Datos trimestrales» en puestos, fuentes de obra pública y SRT completas, lupa con trabajo en negro, piquetes, rigi, vacunas, robo de autos, carne; 17 rutas a 360 px sin desborde de página (ancho 357), sin errores de consola.
- Revisor: primera pasada marcó 9 puntos (veredicto «Falso» perdido en la desc de piquetes, pollo y cerdo en info.ts, frase de carne al revés, categoría de pobreza UTDT, versiones mezcladas sin aviso, un error de obra que tiraba las 11 series, «100 o 200 medios», proyecto RIGI sin norma en el recuento, división por None); todos corregidos.

## Dónde ver los cambios
Local con la vista `web-out` (`http://localhost:3100<ruta>`); en el sitio (`https://primerolosdatos.com.ar<ruta>`) recién después del commit, el push y la corrida completa en verde. Lista con links: `docs/cambios/datos-calientes-3.html`.
1. Portada y menús: RIGI en el menú «Más» y el mosaico — `/`; la lupa encuentra trabajo en negro, pobres, vacunas, piquetes, carne, rigi, motos, robo de autos — `/`
2. Histórico: `/plantillas/?q=informal`, `/plantillas/?q=pobres`, `/plantillas/?q=natalidad`, `/plantillas/?q=vacun`, `/plantillas/?q=motos`; pobreza mensual UTDT `/historico/?v=pobreza_utdt~asis~~compra~`
3. Ficha: `/dato/puestos-de-trabajo/`, `/dato/trabajo-en-negro/`, `/dato/pobres/`, `/dato/piquetes/`, `/dato/carne/`, `/dato/natalidad/`, `/dato/vacunacion/`, `/dato/obra-publica/`, `/dato/empresas/`, `/dato/motos/`, `/dato/robos-de-autos/`, `/dato/rigi/`
4. Temas: `/tema/empleo/`, `/tema/fiscal/`, `/tema/sociedad/`, `/tema/externo/`
5. Por presidente: `/dato/puestos-de-trabajo/#fi-pres`, `/dato/obra-publica/#fi-pres`
6. RIGI: `/rigi/`, `/rigi/#proyectos`
