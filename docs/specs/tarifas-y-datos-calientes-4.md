# Tarifas y subsidios, cobertura del costo de la energía y datos calientes 4 (carnes, robos de motos, fecundidad, universidades)

Estado: implementada (2026-11-17), sin publicar

Pedidos del usuario (2026-11-17):
- «segui con 1 y 2 que creo se relacionan»: los datos calientes que faltaban (carne 2019-2023, pollo y cerdo, robos de motos, fecundidad, universidades en serie larga) y la fase 3 de `series-deuda.md` (parte del costo de la electricidad que pagan las tarifas).
- «también estaría bueno la tarifa de luz, de agua y de gas. ponele podemos investigar para bs as, cordoba y santa fe. con y sin subsidio. cantidad de gente que recibe el subsidio y los tipos de subsidios».
- «y con eso sacar tambien como un indicador de la tarifa que paga el estado vs el consumidor final».

Decisiones del usuario (2026-11-17):
- Tarifas: la serie del AMBA del IIEP **y además** los cuadros tarifarios de Córdoba y Santa Fe cargados a mano (con el AMBA con la misma cuenta, para comparar).
- Estado vs. usuario: **las dos, separadas**: la del IIEP (luz, gas y canasta, mensual desde 2023) y la cuenta propia con CAMMESA para la luz (desde 2019).
- Subsidiados: **página `/tarifas/`** con facturas, quién paga cada parte, tipos de subsidio con su norma y las fotos de cuántos los reciben.
- Fecundidad: **las dos en un gráfico** (ONU/Banco Mundial y cuenta propia con DEIS + INDEC).

Investigación: `docs/investigaciones/tarifas-y-carnes-2026-11-17.md` (fuentes, URLs, cifras de control y reparos de todo lo de abajo). Los textos de los PDF ya leídos están en el scratchpad de la sesión (puede borrarse: volver a bajarlos si falta).

## Reglas comunes
- Las de `datos-calientes-3.md`: bajar solo con `red.py`; respaldo en `datos/cache/`; si una fuente falla y no hay respaldo, se omite con aviso sin romper; anuales en diciembre (`_anual_a_diciembre`); controles puntuales avisan, estructurales cortan con `ValueError`; `desc` para un lector común; `fuente` con organismo, documento y serie.
- Datos a mano (D-027): cada valor con URL, fecha de publicación y la frase, cuadro o página de donde sale. Sin cita no se carga. La sesión principal abre al menos dos citas de cada archivo.
- Ningún id existente cambia de significado (`carne_vacuna` sigue siendo vacuna en kg por habitante).
- Ids nuevos a `datos/series_esperadas.txt` y enganche en `catalogo.construir` / `obtener_datos.py`: lo hace la sesión principal.
- Subagentes: nada de `npm run build`, commits ni servidores; informe por requisito.

## Fase 1. Datos a mano (`datos/manual/`), en paralelo

### 1A. `tarifas_iiep.json` — Observatorio de Tarifas y Subsidios del IIEP (UBA-CONICET), AMBA, mensual
Un registro por reporte (n.° 1 ≈ mar-23 hasta el último publicado; índice `economicas.uba.ar/iiep/informes-y-reportes/tarifas-y-subsidios/`). Abrir cada PDF (`pdftotext -layout`), una vez cada uno.
```
{ "mes": "AAAA-MM", "numero": 40, "url": "...", "fecha": "AAAA-MM-DD",
  "luz_n1": 68210, "gas_n1": 64862, "agua": 41724, "canasta": 295826,          // portada, $/mes, con impuestos
  "luz_con_subsidio": <$|null>, "gas_con_subsidio": <$|null>,                  // N2 o SEF si el reporte lo da
  "cobertura_canasta": 54, "cobertura_luz": 63, "cobertura_gas": 57,            // % que paga el usuario
  "consumo_luz_kwh": 265, "consumo_gas_m3": <n|null>,
  "cita": { "<campo>": "frase o tabla y página" } }
```
Controles: jul-26 (n.° 40) los de arriba; dic-25 (n.° 33) 44.808 / 22.970 / 32.435 / 183.410; ago-24 (n.° 17) 38.137 / 34.973 / 24.486 / 144.433. Cobertura: solo si está en el texto (las del gráfico sin número no se cargan). Anotar en `nota` los cambios de definición (300 → 265 kWh; «sin subsidio» → «N1»; esquema SEF desde ene-26).

### 1B. `tarifas_cuadros.json` — factura típica desde los cuadros tarifarios, AMBA, Córdoba y Santa Fe
Para comparar los tres lugares con **la misma cuenta**: factura sin impuestos = cargo fijo + cargo variable × consumo de referencia (los impuestos cambian por municipio; decirlo). Consumos de referencia fijos: luz 250 kWh/mes, gas 50 m³/mes (anotar si la categoría R del cuadro cambia con ese consumo), agua: la tarifa media o el cargo de una vivienda tipo que defina cada cuadro (anotar cuál).

| Servicio | AMBA | Córdoba | Santa Fe |
|---|---|---|---|
| Luz | Edenor (ENRE) | EPEC (ERSeP) | EPE (gobierno provincial) |
| Gas | Metrogas (ENARGAS) | Distribuidora de Gas del Centro / Ecogas (ENARGAS) | Litoral Gas (ENARGAS) |
| Agua | AySA (ERAS) | Aguas Cordobesas (ERSeP) | Aguas Santafesinas (ENRESS) |

Cortes: **diciembre de cada año 2015-2025 y el último cuadro vigente** (el cuadro vigente al 1 de diciembre). Para cada corte, **sin subsidio** (N1 / sin subsidio / tarifa plena) y **con subsidio** (N2 o tarifa social antes de 2022; SEF desde 2026; si el esquema del año no tiene subsidio residencial, `null` con la nota).
```
{ "servicio": "luz", "lugar": "cordoba", "empresa": "EPEC", "vigencia": "AAAA-MM-DD", "categoria": "sin_subsidio" | "con_subsidio",
  "cargo_fijo": <$/mes>, "cargo_variable": <$/unidad>, "consumo": 250, "factura": <$ calculado>,
  "norma": "<url de la resolución o del cuadro>", "cita": "cuadro, fila y página" }
```
Lo que no se consiga con cita queda sin cargar y se lista en `faltantes` con el motivo. Prioridad si no alcanza: primero los cortes 2019, 2023, 2025 y el vigente; después el resto.
Repartir en dos subagentes: **luz** (las tres) y **gas + agua** (las seis), cada uno en su archivo: `tarifas_cuadros_luz.json` y `tarifas_cuadros_gas_agua.json` (mismo formato: `{"actualizado", "registros": [...], "faltantes": [...], "nota"}`); `tarifas.py` lee todos los `tarifas_cuadros*.json`.

### 1C. `subsidios_energia.json` — tipos de subsidio y cuántos los reciben
- `tipos`: Tarifa Social Federal (2016, Res. 6 y 7/2016 MINEM), segmentación RASE N1/N2/N3 (Decretos 332/2022 y 465/2024), Subsidios Energéticos Focalizados SEF (Decreto 943/2025, desde ene-26: hasta 3 canastas básicas, bloque subsidiado 300/150 kWh al 50 %, bonificación extra 2026), Zona Fría (Ley 27.637), tarifa social de AySA (ERAS), y los de Córdoba y Santa Fe si existen (tarifa social provincial). Cada uno: nombre, desde, hasta, quiénes, qué descuento, norma (URL).
- `cantidades`: fotos de cuántos usuarios/hogares reciben cada tipo, con fecha y cita. Verificada: RASE luz (informe del Jefe de Gabinete, abr-25): N1 6.918.821, N2 6.244.657, N3 3.211.792. Buscar y abrir los demás informes del Jefe de Gabinete al Congreso (traen inscriptos por nivel), los informes de gestión de Energía y ENARGAS (usuarios con tarifa social o Zona Fría) y cualquier cifra oficial del SEF 2026. Las cifras solo de prensa sin documento de origen no entran.
- `monto`: no hace falta (ya está la serie de subsidios a la energía, `452.2_ENERGIAGIA_0_T_7_79`).

### 1D. `carne.json` (actualizar), `universidades_alumnos.json`, `mujeres_por_edad.json`
1. **Carne:** cargar vacuna 2019-2023 y aviar, porcina y total 2015-2025 de los tableros de Agricultura (valores y URLs en la investigación, sección B), con página; corregir 2019 = 51,1 y pasar 2020-2025 a «verificado». Marcar el corte 2018/2019 (AGRO_0244 2018 = 57,94 vs tablero 56,5).
2. **Universidades** (SPU, anuarios y síntesis, sección E de la investigación): estudiantes, nuevos inscriptos y egresados por año, total país (gestión estatal + privada, pregrado + grado), desde 1996. Mirar a ojo las páginas de los anuarios 2008 y 2010 para los huecos 2008-2010; buscar las síntesis que faltan (2012-2015, 2017-2019, 2022-2024) en argentina.gob.ar. Egresados del anuario 1999/2003 corridos un año (usar el año del anuario 2006).
3. **Mujeres por edad** (para la fecundidad): mujeres al 1 de julio por grupo quinquenal 15-19 a 45-49, total país, de las proyecciones del INDEC: base 2010 (`proyeccionesyestimaciones_nac_2010_2040.pdf`, cuadro 2) para 2010-2021 y base 2022 (Análisis Demográfico n.° 40, cuadro 2.1) para 2022-2025. Control: la suma de los grupos contra el total de mujeres 15-49 si el cuadro lo trae.

## Fase 2. Pipeline

### 2A. `pipeline/energia.py` (nuevo) — parte del costo de la luz que pagan las tarifas (CAMMESA)
| id | Nombre | cat | tipo | unidad | dir |
|---|---|---|---|---|---|
| `luz_precio_estacional` | Precio que pagan las distribuidoras por la electricidad (estacional) | `["Fiscal", "Subsidios y tarifas"]` | none | US$ por MWh | 0 |
| `luz_costo_monomico` | Costo de abastecer la electricidad (monómico) | ídem | none | US$ por MWh | 0 |
| `luz_cobertura` | Parte del costo de la electricidad que pagan las tarifas | ídem | none | % del costo | 0 |

- PEST: ZIP «Precios medios Estacionales MEM y TDF 2019 2026 WEB» (`https://cammesaweb.cammesa.com/?wpdmdl=44426`, seguir la redirección), hoja «Datos»: filas desde el primer año entero 2019..; columnas año, mes de transacción, demanda, PEST $/MWh. Pasar a US$ con el A3500 del último día hábil del mes (`175.1_DR_REFE500_0_0_25`, o la serie de dólar mayorista ya en el catálogo si es la misma).
- Monómico: primero buscar la base mensual de «Variables Relevantes del MEM – BASE DE DATOS» (`https://cammesaweb.cammesa.com/variables-relevantes-mem/` y `/historico-variables-relevantes-2025/`: leer el `href` real del botón con el navegador o el HTML completo). Si se consigue, serie mensual 2018 →. Si no, la «Base de datos Informe Anual 2025» (`?wpdmdl=52496`, hoja «PRECIOS»): mensual 2024-2025 y anual 2005-2025 en diciembre (2022 y 2023 desde la suma de componentes si el total está roto; si tampoco cierra, vacíos). El ZIP del informe anual cambia de nombre cada año: buscar el link en la página.
- Controles: jun-25 55,0 %; jul-25 48,9 %; anual 2019 65,5 %, 2021 36,9 %, 2025 71,2 %. Estructural: cobertura entre 5 % y 150 %.
- `desc` de `luz_cobertura`: precio estacional que pagan las distribuidoras (lo que después va a las tarifas) dividido por el costo medio de abastecer la electricidad (energía, potencia, servicios y transporte), los dos en dólares; lo que falta para el 100 % lo cubre el Estado (Tesoro → CAMMESA). Es para toda la demanda que compra al precio estacional, no solo hogares. Desde nov-25 el estacional suma servicios asociados (quiebre). Otros centros (IAE Mosconi) usan otra definición y dan otro número; el IIEP publica la de hogares del AMBA (serie aparte).
- Respaldos `cammesa_pest` y `cammesa_monomico` (tablas ya armadas, chicas).

### 2B. `pipeline/tarifas.py` (nuevo) — lee 1A, 1B y 1C
Series del catálogo (cat `["Fiscal", "Subsidios y tarifas"]`, tipo `ars` para facturas, `none` para %):
| id | Nombre | unidad | dir |
|---|---|---|---|
| `tarifa_amba_luz` | Factura de luz de un hogar del AMBA sin subsidio (IIEP) | $ por mes | 0 |
| `tarifa_amba_gas` | Factura de gas de un hogar del AMBA sin subsidio (IIEP) | $ por mes | 0 |
| `tarifa_amba_agua` | Factura de agua de un hogar del AMBA (IIEP) | $ por mes | 0 |
| `tarifa_amba_canasta` | Canasta de servicios públicos de un hogar del AMBA (IIEP) | $ por mes | 0 |
| `cobertura_hogar_canasta` | Parte del costo de los servicios que pagan los hogares del AMBA (IIEP) | % del costo | 0 |
| `cobertura_hogar_luz` | Parte del costo de la luz que pagan los hogares del AMBA (IIEP) | % del costo | 0 |
| `cobertura_hogar_gas` | Parte del costo del gas que pagan los hogares del AMBA (IIEP) | % del costo | 0 |

`fuente`: «Observatorio de Tarifas y Subsidios, IIEP (UBA-CONICET), Reporte de Tarifas y Subsidios n.° X» (universidad, no oficial: decirlo en `desc`, D-027). `desc` de facturas: con impuestos, consumo de referencia del IIEP (cambió), gas muy estacional (compararlo con el mismo mes de otro año). `tipo: ars` deja verlas en pesos de hoy.

`escribir_tarifas(destino)` escribe `web/public/datos/tarifas.json` (contrato con la página):
```
{ "actualizado": "AAAA-MM-DD",
  "cuadros": [ {servicio, lugar, empresa, vigencia, categoria, consumo, factura, norma, cita} ],   // de 1B, con factura recalculada
  "consumos": {"luz": "250 kWh por mes", "gas": "50 m³ por mes", "agua": "..."},
  "faltantes": [...],
  "cobertura": { "iiep": {"mes", "canasta", "luz", "gas", "url"}, "cammesa": {"mes", "luz", "url"} },  // último dato de cada una
  "tipos": [...], "cantidades": [...],                                                              // de 1C
  "fuentes": [{"texto", "url"}], "nota": "..." }
```
Control estructural en 1B: `factura` = cargo fijo + variable × consumo (±1 $), y con subsidio ≤ sin subsidio en el mismo corte.

### 2C. Series nuevas en módulos existentes
| id | Módulo | Nombre | cat | unidad | dir | Fuente |
|---|---|---|---|---|---|---|
| `carne_aviar`, `carne_porcina`, `carne_total` | `manuales_calientes.py` | Consumo de pollo / de cerdo / de carnes (vacuna, pollo y cerdo) por habitante | la de `carne_vacuna` | kg por habitante por año | 1 | tableros de Agricultura 2015-2025 |
| `carne_vacuna` | ídem | (sin cambiar id ni nombre) | | | | suma 2019-2023; `desc` y `fuente` al día (ya no dice que faltan) |
| `robos_motos` | `trabajo_obra.py` | Robos de motos (denuncias, SNIC) | `["Sociedad", "Seguridad"]` | hechos | -1 | SNIC, SAT delitos contra la propiedad: CSV `https://cloud-snic.minseg.gob.ar/Bases/SAT/PROP/SAT-Propiedad-BU_2017-2024.csv` (51 MB; buscar el más nuevo con `package_show` de datos.gob.ar `delitos-contra-la-propiedad-sistema-de-alerta-temprana-estadisticas-criminales`); `nombre_delito_sat_prop == "Robo de motocicletas"`, suma de `cantidad_hechos` por año y mes (mes en texto). Respaldo `snic_robos_motos` (solo el conteo mensual). Controles anuales: 2017 33.312; 2020 26.637; 2024 44.236. Estructural: 24 jurisdicciones por año. `desc`: hechos denunciados ante las fuerzas (no trámites del Registro, a diferencia de `robos_autos`); el hurto de motos se cuenta aparte desde 2023 y no está acá |
| `fecundidad_onu` | `poblacion_salud.py` | Fecundidad: hijos por mujer (estimación de la ONU) | `["Sociedad", "Población"]` | hijos por mujer | 0 | Banco Mundial `SP.DYN.TFRT.IN` (UN WPP), 1960 →. Controles 2014 2,386; 2024 1,504 |
| `fecundidad` | ídem | Fecundidad: hijos por mujer (nacimientos y población oficiales) | ídem | hijos por mujer | 0 | cuenta propia 2010 →: 5 × Σ (nacimientos del grupo / mujeres del grupo), 15-19 a 45-49; menores de 15 sumados a 15-19 y «sin especificar» repartido en proporción. Nacimientos por edad de la madre del mismo CSV de DEIS (ampliar el respaldo `deis_nacimientos` para que guarde año × grupo, sin volver a bajar el de 68 MB si ya está: si el respaldo viejo no tiene grupos, bajarlo una vez). Mujeres de `datos/manual/mujeres_por_edad.json`. Controles: 2014 2,37; 2019 1,86; 2022 1,44; 2023 1,34; 2024 1,19 (±0,03). `desc`: por qué difiere de la ONU (la ONU estima y sus valores desde 2020 quedan más altos; 2024 es provisorio por inscripciones tardías; cambio de proyección de población en 2022) |
| `univ_estudiantes`, `univ_nuevos_inscriptos`, `univ_egresados` | `manuales_calientes.py` | Estudiantes / Nuevos inscriptos / Egresados universitarios | `["Sociedad", "Educación"]` (crear si no existe; si hay una ruta de universidades, usar esa) | personas | 1 (estudiantes e inscriptos), 1 (egresados) | SPU, anuarios y síntesis (1D.2). Años sin dato quedan vacíos (no interpolar). `desc`: universidades e institutos universitarios estatales y privados, pregrado y grado; cuántos años faltan y por qué |

## Fase 3. Web (un subagente; no toca el pipeline)
1. **Página `/tarifas/`** (`web/app/tarifas/page.tsx`, `web/components/secciones/Tarifas.tsx`, cuentas en `web/lib/tarifas.ts`; molde de `/rigi/`). Lee `tarifas.json`; sin el archivo dice que no hay datos y no rompe. Capítulos con ancla:
   - `#quien-paga` «¿Quién paga la energía?»: dos cifras grandes con su mes y su fuente (IIEP: «los hogares del AMBA pagan el X % del costo de los servicios; el Estado, el resto» y CAMMESA: «las tarifas cubren el X % del costo de la electricidad»), cada una con su definición en una línea y link a la ficha (`luz_cobertura`, `cobertura_hogar_canasta`). Aclarar que miden cosas distintas.
   - `#facturas` «Cuánto se paga en cada lugar»: selector de servicio (luz, gas, agua) con chips; tabla por corte (filas: diciembre de cada año y el vigente; columnas: AMBA, Córdoba, Santa Fe, cada una con y sin subsidio), valores en pesos corrientes con opción «en pesos de hoy» (IPC, con la función de `web/lib/` que ya hace esa cuenta); celdas sin dato con «—» y el motivo en la nota; link a la norma de cada valor. Debajo, el consumo de referencia y «sin impuestos».
   - `#amba` «El AMBA mes a mes (IIEP)»: link a la plantilla de las facturas del AMBA (punto 3).
   - `#subsidios` «Qué subsidios hay y cuántos los reciben»: lista de tipos (nombre, desde-hasta, a quién, descuento, norma) y las fotos de cantidades con fecha y cita; decir que no hay serie oficial y que del SEF 2026 no hay cifras públicas (si sigue así).
   - Pie con las fuentes.
   Entrada en `web/lib/secciones.ts` (grupo `estado`), lupa (`busqueda.ts`), menú y mosaico como `/rigi/`; link desde el tema de Cuentas públicas.
2. `web/lib/nombres.ts`: subcategoría «Subsidios y tarifas» y, si se creó, «Educación»; sinónimos: tarifa, tarifas, luz, electricidad, gas, agua, factura, boleta, subsidio, subsidios, tarifa social, segmentación, N1, N2, N3, SEF, zona fría, CAMMESA, quién paga, cobertura, costo de la energía; pollo, cerdo, carnes; robo de motos, motochorros; fecundidad, hijos por mujer, natalidad; universitarios, estudiantes universitarios, egresados, graduados, inscriptos.
3. `web/lib/plantillas.ts`: «Tarifas del AMBA: luz, gas y agua (IIEP)», «Quién paga la energía: tarifa contra costo» (`luz_cobertura`, `cobertura_hogar_luz`, `cobertura_hogar_gas`), «Consumo de carnes por habitante» (vacuna, pollo, cerdo), «Robos de autos y de motos», «Fecundidad: ONU contra datos oficiales» (las dos en un gráfico), «Universidades: estudiantes, inscriptos y egresados».
4. `web/lib/datos-fijos.ts`: `tarifas` (`tarifa_amba_canasta`), `quien-paga-la-luz` (`luz_cobertura`), `robos-de-motos`, `fecundidad`, `universitarios` (`univ_estudiantes`), `pollo` (`carne_aviar`).
5. `web/lib/temas.ts`: Cuentas públicas → «Parte del costo de la luz que pagan las tarifas» (`luz_cobertura`); Seguridad y salud → «Robos de motos»; párrafos cortos en `web/lib/info.ts` donde haga falta.
6. Reglas de `.claude/rules/frontend.md` (chips, tablas, números con `formato.ts`, sin `<select>`).

## Decisión D-029 (a `docs/DECISIONES.md`)
Tarifas y «quién paga»: no hay serie oficial de facturas ni de cobertura. Se muestran (1) la serie del IIEP (universidad, a mano con cita, AMBA, con impuestos); (2) una cuenta propia desde los cuadros tarifarios para comparar AMBA, Córdoba y Santa Fe (factura sin impuestos con consumos fijos); (3) una cuenta propia de cobertura con CAMMESA (precio estacional / monómico en dólares). Las tres con su definición a la vista y sin mezclarse. Fecundidad: dos series (ONU y cuenta propia) siempre juntas.

## Cómo se verifica
1. `python pipeline/obtener_datos.py` completo sin error; series nuevas (≈ 20) en la salida y `verificar_series.py` OK; controles de cada tabla cumplidos (o avisos explicados).
2. Valores de control en `web/public/datos/` con un script; `tarifas.json` con cuadros de los tres lugares y los controles estructurales de 1B.
3. Citas: la sesión principal abre dos de cada archivo de `datos/manual/` nuevo o cambiado.
4. `cd web && npm run tipos && npm run lint && npm run previas && npm run build`.
5. En `web-out`: `/tarifas/` (cuatro capítulos, selector, pesos de hoy, links a normas), fichas nuevas, plantillas, lupa con «tarifa», «subsidio», «zona fría», «motochorros», «fecundidad», «pollo», «egresados»; 360 px sin desborde ni errores de consola.
6. Revisor contra esta spec.

## Fuera de esta spec
Cantidad de subsidiados por provincia y del SEF 2026 (sin fuente pública: queda un pedido de acceso a la información a la Secretaría de Energía, si el usuario quiere hacerlo); tarifas de otras provincias; cuadros mensuales completos (solo diciembre de cada año); hurto de motos; universidades por institución.

## Cómo quedó (2026-11-17)
- **Datos a mano** (`datos/manual/`): `tarifas_iiep.json` (31 reportes, abr-24 → oct-26; mar-24 afuera por otra definición; los n.° 1-11 no traen portada del AMBA); `tarifas_cuadros_luz.json` (Edenor: dic-19, 20, 23, 24, 25; con subsidio N2 en 2023-2025); `tarifas_cuadros_luz_epec.json` (EPEC: dic-19 y dic-20 sin subsidio, dic-23 N1 y N2); `tarifas_cuadros_luz_epe.json` (EPE: dic-20 y dic-21 sin subsidio; tablas leídas como imagen con PyMuPDF; dic-19 afuera por inferido y el vigente solo se baja con el botón del sitio). EPEC y EPE cobran por escalones de consumo: `tarifas.py` los suma (`escalones`); `tarifas_cuadros_gas_agua.json` (gas sin subsidio de Metrogas, Ecogas Centro y Litoral Gas dic-17 → vigente nov-26, con subsidio solo dic-23; agua sin cuadros); `subsidios_energia.json` (6 tipos con norma; 68 cifras de informes del Jefe de Gabinete 135-145, ENARGAS/SE y comunicados: RASE feb-23 a jul-24 con provincias, SEF ene y mar-26, Zona Fría, AySA, EPE); `carne.json` (vacuna 2019-2025, pollo, cerdo y total 2015-2025); `universidades_alumnos.json` (1996-2022); `mujeres_por_edad.json` (2010-2025).
- **Pipeline:** `energia.py` (CAMMESA: monómico mensual de «Variables relevantes del MEM», ene-18 →, y PEST ene-19 →; dólar A3500 de fin de mes; anuales ponderados por demanda, 0,4 a 1,2 p.p. debajo de los de la investigación); `tarifas.py` (7 series del IIEP, `tarifas.json`, lugares normalizados, faltantes agrupados por motivo); robos de motos (SNIC) en `trabajo_obra.py`; fecundidad ONU y propia en `poblacion_salud.py` (el respaldo `deis_nacimientos` ahora guarda grupos de edad); carnes y universidades en `manuales_calientes.py`. 19 series nuevas.
- **Web:** página `/tarifas/` (quién paga, facturas por lugar con chips y pesos de hoy, AMBA del IIEP, subsidios con tabla de fotos), nombres, 6 plantillas, 6 datos fijos, temas, info.
- **Decisión:** D-029.

## Verificación (2026-11-17)
- Pipeline completo tres veces (la última después de las correcciones): 697 series, `verificar_series` OK, sin errores. Controles cumplidos: robos de motos 2017/2020/2024 y 24 jurisdicciones; fecundidad ONU 2014/2024 y propia 2014 2,36, 2019 1,85, 2022 1,44, 2023 1,33, 2024 1,19; CAMMESA jun-25 55,0 % y jul-25 48,9 %; IIEP jul-26, dic-25 y ago-24; factura = fijo + variable × consumo y con ≤ sin subsidio en todos los cuadros.
- Citas abiertas por la sesión principal: IIEP oct-26 (PDF igual al publicado, md5) y dic-25 (gas 48 %); ENARGAS Res. 851/2026 (Metrogas) y 852/2026 (Litoral Gas, columna Santa Fe); Jefe de Gabinete informe 140 (RASE jul-24) y 145 (SEF mar-26).
- Web: `tipos`, `lint`, `previas` (67 de 67) y `build` sin error. En el navegador (vista `web-out`): `/tarifas/` con luz, gas y agua (texto en vez de tabla vacía), 375 px sin desborde de página (las tablas se deslizan), capturas de la cabecera y de la tabla de gas; fichas `/dato/tarifas/`, `quien-paga-la-luz`, `robos-de-motos`, `fecundidad`, `universitarios`, `pollo`, `carne`; plantilla «Quién paga la energía» con las tres series; sin errores de consola.
- Revisor: primera pasada sin bloqueantes, 6 importantes (agua vacía, faltantes con claves internas y repetidos, quiebre de nov-25 sin aviso, cobertura de gas abr-24 de otra definición, PDF sueltos en la raíz, texto de «con subsidio»); todos corregidos. Segunda pasada: dos menores (redacción de los lugares, corte de la vacuna en la plantilla), corregidos.
- Segunda vuelta de luz (pedido del usuario: «lo de epe santa fe si es imagen no lo podes leer igual?»): citas comprobadas de EPEC (RG 64/2019 y RG 125/2023, en el texto de los PDF) y de la EPE (cuadro de nov-2021, fila 1001); escalones de la EPE ene-25 calculados a mano = 42.579,47 (igual que el pipeline).
- **Sin verificar:** el sitio publicado (falta commit, push y corrida); la lupa con cada término de la spec (se probó por plantillas, no tecleando en la lupa); luz de Córdoba y Santa Fe de 2024 en adelante y el agua (sin fuente legible: quedan como faltantes con motivo).

## Dónde ver los cambios
Página con links y casillas: `docs/cambios/tarifas-y-datos-calientes-4.html`. Local `http://localhost:3100<ruta>` (vista `web-out`); publicado recién después del commit, el push y la corrida completa en verde (toca `pipeline/`: unos 10 minutos).
1. Portada y menús: «Tarifas y subsidios» en Más y en el mosaico — `/#secciones`; lupa — `/`
2. Histórico: `/plantillas/?q=quien%20paga`, `?q=tarifas`, `?q=carnes`, `?q=motos`, `?q=fecundidad`, `?q=universidades`
3. Ficha: `/dato/quien-paga-la-luz/`, `/dato/tarifas/`, `/dato/robos-de-motos/`, `/dato/fecundidad/`, `/dato/universitarios/`, `/dato/pollo/`
4. Temas: `/tema/fiscal/`, `/tema/sociedad/`
5. Tarifas: `/tarifas/#quien-paga`, `/tarifas/?s=gas#facturas`, `/tarifas/?m=hoy#facturas`, `/tarifas/?s=agua#facturas`, `/tarifas/#subsidios`
