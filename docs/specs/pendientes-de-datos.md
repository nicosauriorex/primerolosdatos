# Pendientes de datos: semáforo, universidades, herencia histórica y leyes del Ejecutivo

Estado: implementada (2026-11-18); publicada en 034e02d, corrida completa en verde (run 44416384904)

Pedido del usuario (2026-11-18): «Pendientes de datos» → los cuatro de `docs/ESTADO.md` («Semáforo, Universidades, Herencia histórica, Congreso»). Decisiones del usuario sobre lo investigado:
- Leyes: «Todas, con "aprox."».
- Semáforo: «Automáticas + manuales» y «Sí, X-13».
- Universidades: «Sí, 1998-2014».

Investigación del 2026-11-18 (agente `investigador-datos`, cuatro informes). Lo que sigue resume lo verificado; lo que no se verificó lo dice cada parte.

## A. Semáforo de actividad (`pipeline/semaforo.py`, `/semaforo/`)

### A1. Cuatro indicadores automáticos nuevos
| clave | grupo | nombre | organismo | fuente | ajuste |
|---|---|---|---|---|---|
| `patentamientos` | Consumo | Patentamientos de autos | DNRPA | reutilizar `_bajar_dnrpa` / caché `dnrpa_autos` de `pipeline/mas_series.py` (CKAN `datos.jus.gob.ar`, CSV por provincia y mes desde ene-2000; sumar el país) | propia |
| `petroleo` | Energía | Producción de petróleo | Secretaría de Energía (Capítulo IV) | archivos anuales «Producción de Pozos de Gas y Petróleo - AAAA» del dataset `c846e79c-026c-4040-897f-1ad3543b407c` de `datos.energia.gob.ar` (columnas `anio, mes, idpozo, prod_pet, prod_gas`; sumar `prod_pet` por mes; unidad m³, confirmar con el diccionario del dataset y decirla) | propia |
| `leche` | Agro y pesca | Producción de leche | OCLA | `https://www.ocla.org.ar/NewsFiles/BaseDeDatosOCLA.xlsx`, hoja «Series Mensuales», columna «PRODUCCION NACIONAL DE LECHE millones de lts./mes», desde 2000-01 | propia |
| `escrituras_caba` | Construcción | Escrituras en la Ciudad de Buenos Aires | Colegio de Escribanos de la Ciudad | XLS `https://www.colegio-escribanos.org.ar/noticias/<Mes>-<AAAA>-Comparativo-anual-por-mes.xls` (mes en español con mayúscula, «Septiembre», no «Setiembre»): cada archivo trae ese mes en todos los años. Con el último archivo publicado de cada uno de los 12 meses se arma la serie entera; cantidad de actos, no el monto | propia |

Detalles:
- **Petróleo (cambio al implementar)**: se usa el recurso «Serie histórica de producción de petróleo por cuenca (Capítulo IV)» del mismo dataset (32 KB, 2006-01 a 2026-09, total = suma de cuencas ±0,5 %), que coincide al 0,00 % con la suma por pozo en 18 de 21 meses. Los archivos por pozo quedan solo como control local (`--pozos-locales <carpeta>`). Lo que sigue en este punto era el plan original:
- **Petróleo (plan original, reemplazado)**: cada archivo pesa 250 a 330 MB. Leer en bloques (`pd.read_csv(..., usecols=[anio, mes, prod_pet], chunksize=...)`) y guardar solo las sumas mensuales en `datos/cache/petroleo_pozos.csv` (`mes, m3, filas`). Primera corrida: todos los años que ofrece el dataset (listar los recursos con la API CKAN `package_show`, no URLs fijas). Corridas siguientes: solo el año en curso (y el anterior en enero y febrero). Un mes con menos del 80 % de las filas de la mediana de los 12 meses anteriores se toma como incompleto y no se publica (oct-26 hoy tiene 20 mil filas contra unas 83 mil). No empalmar con la serie 363.3 (da 1 a 2 % menos y quedó en nov-25). Si el dataset no responde, respaldo.
- **Leche**: el archivo de OCLA hoy llega a jun-26. Con `MAX_ATRASO_MESES = 4` el semáforo lo marcaría atrasado: está bien, se muestra con su fecha como cualquier otro. La hoja anual tiene «Nueva Serie 2018»: revisar si la mensual tiene un salto en 2018 y, si lo tiene, usar solo desde 2018 y decirlo en la nota.
- **Escrituras CABA**: probar los 12 meses del año en curso y, si el mes todavía no salió, el del año anterior. Validar que los años que se superponen entre archivos den lo mismo. Si el formato no permite armar la serie (decirlo en el informe), quedan los últimos 12 meses (`<Mes>-<AAAA>-12-meses.xls`) acumulados en el respaldo desde hoy.
- Las cuatro llevan respaldo en `datos/cache/` como el resto (`_validada`, `MIN_FILAS_RESPALDO`).

### A2. Tres indicadores cargados a mano (solo variación)
Archivo nuevo `datos/manual/semaforo_manual.json`: por indicador, `{mes, var_ia, var_mm (opcional), fuente, url, cita}` por mes, con cita textual de la nota.

| clave | grupo | nombre | qué se carga | fuente |
|---|---|---|---|---|
| `came` | Consumo | Ventas minoristas pymes (CAME) | variación interanual real | notas mensuales de CAME (`redcame.org.ar/novedades/...`) |
| `construya` | Construcción | Índice Construya | variación interanual; variación mensual desestacionalizada (la publica Grupo Construya) | notas de prensa que citan el informe de Grupo Construya |
| `escrituras_pba` | Construcción | Escrituras en la Provincia de Buenos Aires | variación interanual | comunicados del Colegio de Escribanos de la Provincia |

- Cargar al menos los últimos 12 meses con cita (cada uno leído en la nota, sin cita no se carga). Lo que no se encuentre queda vacío.
- No hay nivel: estas filas muestran solo la interanual (y Construya la mensual con ajuste «oficial»). La fila dice «carga a mano de notas de prensa» y no entra en el índice de difusión mensual si no tiene variación mensual; en el interanual sí.
- Se sacan del pie de «sin fuente legible» las siete que ahora están. El pie conserva lo que siga afuera.
- `docs/ESTADO.md`, mantenimiento a mano: cargar CAME, Construya y escrituras de PBA cada mes.

### A3. X-13 ARIMA-SEATS para el ajuste propio
- `requirements.txt`: sumar `statsmodels` (versión con rueda para Python 3.14; si no hay, decirlo y no seguir con A3).
- Workflow `actualizar.yml`: instalar el binario (`sudo apt-get install -y x13as` en Ubuntu; si el paquete no existe en la imagen del runner, bajar el binario oficial del Census en un paso con `curl` a una carpeta del runner y pasar `X13PATH`).
- `desestacionalizar(s)`: primero X-13 (`statsmodels.tsa.x13.x13_arima_analysis`, log automático, con días hábiles `trading=True`, sin feriados argentinos: decirlo en la nota) y, si no está el binario o falla, el método actual de promedios móviles. Cada fila del JSON dice qué método usó (`metodo: "x13" | "promedios"`) y la nota plegada de la página lo explica.
- En Windows sin binario sigue funcionando con promedios.
- **Validación antes de adoptarlo** (en el informe y en esta spec, sección Verificación): para las series con ajuste oficial (EMAE, industria, construcción, minería, empleo), comparar la variación mensual de los últimos 24 meses de X-13 propio y de promedios contra la oficial (error medio absoluto en puntos). Si X-13 no es mejor o igual que promedios en la mayoría, no se adopta: queda el código detrás de una constante `USAR_X13 = False` y se anota.

## B. Universidades por institución, 1998-2014 (`/universidades/`)

### B1. Datos
- Fuente: anuarios de estadísticas universitarias de la SPU, cuadros 2.1.1 (estudiantes), 2.1.2 (nuevos inscriptos) y 2.1.3 (egresados), universidades nacionales, pregrado y grado:
  - Anuario 2008 (`https://dnpeiu.educacion.gob.ar/estadistica/Anuario%202008.pdf`, PDF págs. 65, 67, 69): 1998-2008.
  - Anuario 2014 (`https://www.argentina.gob.ar/sites/default/files/anuario_2014.pdf`, PDF págs. 92, 94, 96): 2004-2014.
  - Control cruzado: anuarios 2012 y 2013 (mismos cuadros) en los años que se superponen.
- Extracción por única vez con un script en `pipeline/extraer_anuarios_spu.py` (pdfplumber por coordenadas, `pip install pdfplumber` permitido solo en local; no va a `requirements.txt`). Escribe `datos/manual/universidades_spu.json`: `{fuente, documentos: [{anio_anuario, url, cuadro, pagina}], universidades: [{n_spu, n (nombre del presupuesto o null), est: {anio: n}, nuevos: {...}, egresados: {...}}], totales: {anio: {est, nuevos, egresados}}}`.
- Controles obligatorios (el script falla si no cierran): la suma de cada año da la fila «Total Universidades Nacionales» del cuadro; donde dos anuarios traen el mismo año, la cifra coincide (o se toma la del anuario más reciente y se lista la diferencia); UBA 2008 y UNC 2008 mirados a ojo en el PDF y escritos en la Verificación.
- Nombres: mapeo a mano de los nombres abreviados de la SPU («Buenos Aires», «Centro de la PBA», «Sur»…) a los del presupuesto que ya usa `pipeline/universidades.py`. Las que no emparejan se listan.
- `pipeline/universidades.py` lee el archivo y suma al JSON de la página, por universidad, `hist: {est: {anio: n}, nuevos: {...}, egresados: {...}}` (1998-2014 de la SPU y 2023-2024 del PIU, cada año con su fuente).

### B2. Página
- En la vista de una universidad: «Estudiantes a lo largo del tiempo», con la serie 1998-2014 y 2023-2024 y el hueco 2015-2022 visible (sin unir los puntos). Nota: «De 1998 a 2014, anuarios de la SPU; 2023 y 2024, Portal de Información Universitaria (datos del CIN). No hay datos por universidad de 2015 a 2022. Las dos fuentes cuentan distinto: compará con cuidado.»
- Las que no existían en esos años no muestran nada antes de su creación.
- Las 8 sin archivo en el PIU: si aparecen en los anuarios (Formosa, Jujuy, Salta y Santiago del Estero), muestran 1998-2014 con «sin datos desde 2015». Madres de Plaza de Mayo, Pilar, Río Tercero y Delta siguen «sin dato de estudiantes».
- No se calcula gasto por estudiante para 1998-2014 (las transferencias empiezan en 2018).

### B3. Total país 2023
- Síntesis 2023-2024 (`https://www.argentina.gob.ar/sites/default/files/sintesis_anuario_2023-2024.pdf`), sección 4 «Población estudiantil de pregrado y grado»: buscar a ojo la cifra de pregrado y grado de 2023 (estudiantes, nuevos inscriptos, egresados), sin posgrado. Si está, se carga en `datos/manual/universidades_alumnos.json` con su página y cita; si no, se deja como falta y se dice.

## C. Herencia: FMI 1995-2002 y cepo 2003 y 2007 (`datos/manual/herencia.json`)

### C1. Deuda con el FMI y acuerdo vigente
Entradas nuevas `fmi_deuda` y `fmi_acuerdo` (mismo formato que las de 2003; unidad millones de DEG):

| traspaso | fecha_dato | fmi_deuda | fmi_acuerdo | documento / cita |
|---|---|---|---|---|
| 1995-07 | 1995-07-31 | 3.738,82 | Facilidad Extendida de marzo de 1992 (DEG 4.020 millones) | tabla de compromisos del FMI al 31-07-1995 (`extarr2.aspx?memberKey1=30&date1key=1995-07-31`): no hay «Financial Position» antes de may-1996; el total 3.738.815 miles de DEG |
| 1999-12 | 1999-12-31 | 3.262,60 | Facilidad Extendida de febrero de 1998 (DEG 2.080 millones, sin girar) | `exfin2.aspx?...date1key=1999-12-31`: «Stand-by Arrangements 593.50»; «Extended Arrangements 2,669.10» |
| 2002-01 | 2002-01-31 | 11.050,46 | Stand-By de marzo de 2000, ampliado en 2001 (DEG 16.937 millones); desembolsos suspendidos desde dic-2001 | `exfin2.aspx?...date1key=2002-01-31`: «Stand-by Arrangements 9,836.56»; «Extended Arrangements 1,213.90»; nota con la cita del informe de la Oficina de Evaluación Independiente (2004) sobre la quinta revisión no completada |

- Antes de cargar, abrir cada página del FMI y copiar la cita textual (el agente las leyó con WebFetch; se vuelven a mirar).
- El vencimiento del EFF de 1998 difiere entre páginas: no se carga el vencimiento.
- El 2001-12 no es un traspaso (Duhalde asume 2002-01): no se carga.
- Comprobar que Herencia muestre los traspasos 1995-07, 1999-12 y 2002-01 (Menem 2, De la Rúa, Duhalde) para estas filas; si la tabla de Herencia empieza más tarde, se amplía solo para las filas que tienen dato y el resto dice «sin dato».

### C2. Cepo
- `cepo` 2003-05 y 2007-12: «Sí, desde el 06-09-2002; tope de US$ 100.000 por mes (más, con permiso del Banco Central)». Citas: Com. «A» 3722 (06-09-2002), puntos a y b; vigencia en 2003: Com. «A» 3998 (15-08-2003), punto 1; en 2007: Com. «A» 4724 (19-10-2007), punto 1, y Com. «A» 4764 (17-01-2008), punto I. Corrección al implementar: la A 4764 no levanta el tope, solo agrega una excepción (compra de títulos públicos); la A 4834 (2008) tampoco. No se sabe con cita cuándo terminó el tope de 2002: las notas lo dicen.
- Mismo criterio que el sitio ya usa (tope o permiso para que una persona compre dólares para ahorro). El encaje del 30 % de 2005 (Decreto 616/2005) es para ingresos de capitales: no cuenta, va en la nota.
- `cepo` 2011-12 sigue «Sí, desde el 31-10-2011»; su nota agrega que desde 2002 ya había un tope para personas y que no se verificó cuándo terminó. Revisar textos de la página y de `docs/specs/herencia.md` que digan que el cepo «empezó» en 2011 y corregirlos.
- No se carga 1995, 1999 ni 2002 (no investigado).

## D. Leyes del Ejecutivo de Menem 1 a CFK 1 (`datos/manual/leyes_ejecutivo.csv`)

| presidente | enviadas | aprobadas | tipo |
|---|---|---|---|
| menem1 | 627 | 389 | las dos aprox. |
| menem2 | 519 | 277 | las dos aprox. |
| delarua | 183 | 144 | las dos aprox. (la tasa sale inflada: decirlo) |
| duhalde | 127 | 77 | las dos aprox. |
| nk | 331 | 196 | enviadas aprox., aprobadas exacta |
| cfk1 | 223 | 122 | enviadas aprox., aprobadas exacta |

- Fuentes: HCDN, «Proyectos presentados desde 1983» (columna «Mensajes y P/L del PEN», Diputados y Senado); «Leyes sancionadas por período parlamentario según iniciativa» (fila Poder Ejecutivo); listados de leyes sancionadas por presidencia de Kirchner y de CFK (iniciativa del PEN). URLs exactas en el informe, copiarlas a `fuente`.
- Aproximación: los totales por período parlamentario se reparten por días entre los mandatos que lo cruzan. Las aprobadas de Menem 1 a Duhalde son las leyes de origen PEN sancionadas durante el mandato (no «de las enviadas en el mandato»). Se dice en `nota` de cada fila.
- El cálculo queda reproducible: copiar `prorrateo.py` del agente a `pipeline/leyes_ejecutivo_prorrateo.py` (lee los PDF bajados a mano, escribe las cifras en pantalla; no corre en el workflow). Volver a correrlo y comparar con la tabla.
- `pipeline/capacidad.py` y el formato: agregar una columna `aprox` (`""`, `"enviadas"`, `"aprobadas"` o `"ambas"`) al CSV y al JSON. La página (tabla, recuadro «Contexto del mandato» e imagen) pone «≈» delante de la cifra aproximada y lo explica en «¿Cómo se cuenta?». Ningún id ni parámetro de URL cambia.
- Comprobar que el CSV desde dic-2011 (calculado con datos de la HCDN) no choca con estas filas: CFK 2 en adelante no se tocan.

## Fuera de alcance
- Universidades por institución 2015-2022 (no hay fuente oficial).
- Escrituras de PBA, CAME y Construya como serie de nivel (no hay).
- Feriados argentinos en X-13.
- Cepo antes de 2002 y FMI antes de 1995.

## Cómo se verifica
1. `python -m ruff check pipeline`; `python pipeline/semaforo.py --bajar` (las cuatro nuevas con su último mes; las tres manuales; método de cada fila); `python pipeline/obtener_datos.py --solo-json` sin error.
2. Validación de X-13 (A3) escrita abajo con la tabla de errores.
3. `python pipeline/extraer_anuarios_spu.py`: controles verdes; UBA y UNC 2008 mirados en el PDF.
4. `pipeline/herencia_informes.py` y `pipeline/capacidad.py` aceptan los datos nuevos.
5. `cd web && npm run tipos && npm run lint && npm run build`.
6. En el navegador (vista `web-out`): `/semaforo/` (filas nuevas, pie, nota del método), `/universidades/` (una universidad con 1998-2014, el hueco, Formosa, Madres), `/presidentes/#herencia` (Menem 2, De la Rúa, Duhalde, Kirchner, CFK 1), `/presidentes/#congreso` (≈ en Menem 1 a CFK 1), a 375 y 1280 px.
7. Revisor.

## Verificación
Sesión principal (2026-11-18): ruff, `--solo-json`, tipos, lint y `npm run build` sin error. En el navegador local (leyendo el contenido, sin capturas: el panel estaba casi oculto): `/semaforo/` con las 7 filas nuevas y sin errores de consola; `/universidades/?u=…UBA` con 1998-2024 y el hueco; `/congreso/?cgi=leyes` y `?cgi=apoyo` con «≈» y el aviso del orden; `/herencia/?p=delarua` (3.263 → 11.050) y `?p=nk` (cepo). Revisor: primera pasada con 3 faltas y 5 errores menores, corregidos; segunda pasada sin problemas. Aprobadas de CFK 1 (122) y Kirchner (195-196) recontadas en los PDF de la HCDN. Sin verificar: aspecto en capturas, 375 px.

Después del push (2026-11-20): X-13 corre en GitHub Actions con el `x13as` de apt (run 44689053604: «x13as instalado con apt»); el `semaforo.json` publicado tiene 26 filas `x13`, 5 `oficial`, 3 `manual`, 1 `promedios` y 1 sin ajuste. Sigue sin compararse la versión de apt contra la b61 validada.


### Semáforo (parte A, hecho 2026-11-18)
**Validación de X-13 (A3).** `python pipeline/semaforo.py --validar-x13` (sin red, con las copias de `datos/cache/`; X-13 ARIMA-SEATS v1.1 b61 del Census por `statsmodels` 0.15.0, log automático, valores atípicos y días hábiles, sin feriados argentinos). Error medio absoluto de la variación mensual contra la serie oficial desestacionalizada, últimos 24 meses con dato oficial, en puntos porcentuales; «signo igual» es el % de meses donde la variación propia tiene el mismo signo que la oficial (lo que decide el color de la celda).

| Serie | Meses | Promedios: error medio (máx.) | X-13: error medio (máx.) | Signo igual: promedios | Signo igual: X-13 | Mejor |
|---|---|---|---|---|---|---|
| Actividad económica (EMAE) | 24 | 1,12 (3,18) | 0,46 (1,15) | 79 % | 83 % | X-13 |
| Producción industrial (IPI) | 24 | 2,75 (6,39) | 0,66 (1,61) | 62 % | 92 % | X-13 |
| Producción minera | 24 | 1,60 (4,28) | 1,03 (3,19) | 71 % | 75 % | X-13 |
| Construcción (ISAC) | 24 | 3,66 (7,39) | 1,35 (3,42) | 67 % | 88 % | X-13 |
| Empleo privado registrado | 24 | 0,10 (0,21) | 0,03 (0,08) | 79 % | 96 % | X-13 |

X-13 gana en las 5 series, así que **`USAR_X13 = True`**. Aviso: es un ajuste con toda la serie a la vista, no en tiempo real, y la serie oficial usa además feriados y Pascua, que acá no están. El control de diez años que imprime la corrida (`control`) da lo mismo: EMAE 0,57 pp, IPI 0,77, minería 0,99, ISAC 1,21 y empleo 0,04 (con promedios eran más). Qué cambia en la página: el método de cada fila queda en `metodo` del JSON y la nota «Cómo se mide» lo dice; mes contra mes sigue usando solo series oficiales (no se amplió, queda como decisión). Sin el binario (Windows sin `X13PATH`) o si X-13 no converge (hoy exportaciones, que cae a promedios) el semáforo usa promedios y lo imprime.

**A1.** `python pipeline/semaforo.py --bajar` (33 series, 0 fallaron):
- `patentamientos`: DNRPA, 2000-01 a 2026-10 (46.390, igual que el control de `mas_series`).
- `petroleo`: Secretaría de Energía, Capítulo IV, 2006-01 a 2026-09 (4.624.779 m³). **Cambio contra la spec**: en vez de bajar los archivos de pozos de 250 a 330 MB, se usa el recurso «Serie histórica de producción de petróleo por cuenca y sub tipo de recurso (Capítulo IV)» del mismo dataset (32 KB, mismo organismo, suma mensual de `prod_pet`); se controla que el total sea la suma de las 5 cuencas (±0,5 %). Se lo contrastó con los CSV de pozos 2025 y 2026 (`python pipeline/semaforo.py --bajar --pozos-locales <carpeta>`, que arma `datos/cache/petroleo_pozos.csv` y no baja nada): 18 de 21 meses coinciden al 0,00 %; jun-26 −0,12 %, ago-26 y sep-26 +0,26 % (el archivo de pozos es más nuevo y tiene rectificaciones). Oct-26 de pozos tiene 20.523 filas contra unas 82.500: incompleto, no se publica (la serie histórica llega a sep-26).
- `leche`: OCLA, hoja «Series Mensuales», 2015-01 a 2026-06 (943,4 millones de litros). La hoja mensual tiene un salto entre dic-2014 y ene-2015 (2015: 12.061 la «Nueva Serie 2018» contra 11.314 la vieja; el anual coincide), por eso se usa solo desde 2015-01.
- `escrituras_caba`: Colegio de Escribanos de la Ciudad, 2015-10 a 2026-09 (6.612 actos, 132 meses seguidos). Cada mes sale del archivo más nuevo publicado (el año en curso o, si no salió, el anterior); el archivo trae ese mes desde 2015 o 2016. Se compara contra el archivo del año anterior: 0 correcciones. Dos rarezas de formato que el código maneja: a veces la primera hoja del libro está vacía (los datos están en «Hoja1») y en diciembre el rótulo «Año AAAA» está en la columna 1 y no en la 0. Sep-26 (6.612 contra 6.998 en sep-25, −5,5 %) coincide con lo que publica el Colegio según la prensa.

**A2.** `datos/manual/semaforo_manual.json` (cada mes con link y cita; sin cita o sin link no se carga; probado en `_manuales`). Cargado:
- `came`: 13 meses, oct-25 a oct-26, solo interanual. Notas de redcame.org.ar leídas con su cita; falta ene-26 en nota de prensa (la cifra, −4,8 %, sale del PDF del índice de enero de CAME; se cargó citando el PDF). Sin variación mensual: CAME no siempre dice que es sin estacionalidad.
- `construya`: 12 meses (oct-25, nov-25, ene-26 a oct-26), interanual y mensual sin estacionalidad, de las notas de Mercado (y de Infobae para jul-26, porque Mercado no apareció). Falta dic-25 (solo en medios secundarios, no se cargó).
- `escrituras_pba`: **1 mes** (sep-26, −10 %, La Nación del 23-10-2026, que cita al Colegio de la Provincia). Los demás meses no se encontraron en una nota que se pudiera leer completa (el Colegio de la Provincia no está indexado y la web de CAME/Mercado no los trae): queda incompleto y es lo primero a cargar a mano.
Se probó con `python pipeline/obtener_datos.py --solo-json` (sin error; 36 indicadores, 3 manuales) y `cd web && npx tsx scripts/chequeo-semaforo.ts` (0 «FALLA»: las celdas coinciden con la cuenta directa, también para los manuales).

**Web.** `npm run tipos` y `npm run lint` sin errores. No se corrió `npm run build` ni se vio en el navegador (prohibido para este agente): el aspecto de las filas nuevas, la ventana con las notas de los manuales y el texto de «Cómo se mide» están sin ver. «Indicadores que no pudimos incluir» ahora lista solo motos y producción de autos.

### Universidades (parte B, hecho 2026-11-18)
- **B1.** `python pipeline/extraer_anuarios_spu.py <carpeta con los PDF>` termina sin error y escribe `datos/manual/universidades_spu.json` (48 universidades, 1998-2014). Anuarios usados: 2008 (PDF págs. 65, 67, 69), 2012 (86, 88, 90), 2013 (116, 118, 120) y 2014 (92, 94, 96), cuadros 2.1.1, 2.1.2 y 2.1.3 de universidades nacionales.
  - Control 1 (exacto, por anuario, cuadro y año): la suma de las universidades da la fila «Total Universidades Nacionales» en los 12 cuadros. Desde el anuario 2012 el IUNA figura entre los institutos (en el 2008, entre las universidades nacionales): se lo suma al total, y así las dos clasificaciones dan lo mismo.
  - Control 2 (por año, sobre el resultado): la suma de las universidades elegidas da el total del cuadro del anuario más reciente que trae ese año, para estudiantes, nuevos inscriptos y egresados de 1998 a 2014.
  - Control 3 (cruce entre anuarios): 0 diferencias en los años que se superponen (2002-2008 entre el 2008, el 2012, el 2013 y el 2014; 2004-2012 entre el 2013 y el 2014). Los anuarios no corrigieron cifras de universidades en esos años.
  - Control 4: toda universidad nacional de los cuadros está en `MAPA` (si aparece una nueva el script falla). Fuera del archivo quedan, a propósito, los institutos (Aeronáutico, Ejército, Naval, Policía Federal, Gendarmería, Seguridad Marítima) y la universidad provincial (Autónoma de Entre Ríos).
  - Dos rarezas de formato del PDF que el script maneja: el anuario 2014 imprime 2014 sin punto de miles (`5190`) y el 2012 imprime Oeste con un solo valor (`1.433` = 2012).
  - **Mirado a ojo en el PDF del anuario 2008** (página renderizada): estudiantes UBA 2008 = 301.599 y UNC 2008 = 102.684 (cuadro 2.1.1, PDF p. 65); nuevos inscriptos UBA 47.566 y UNC 16.936 (p. 67); egresados UBA 16.815 y UNC 7.031 (p. 69). Coinciden con el JSON. También a ojo: totales 2008 de las universidades nacionales 1.255.714 / 261.809 / 62.693.
- **Emparejamiento de nombres.** `python pipeline/universidades.py --sin-red`: «anuarios SPU sin fila en el presupuesto (0)»; las 48 universidades de los anuarios emparejaron con una del presupuesto (el IUNA con la Universidad Nacional de las Artes). Sin anuarios SPU quedan 13 del presupuesto: son las creadas desde 2015 (o sin cifras antes). De las 8 sin archivo en el PIU, Formosa, Jujuy, Salta y Santiago del Estero tienen 1998-2014; Madres de Plaza de Mayo, Pilar, Río Tercero y Delta no tienen ningún dato de estudiantes.
- **B2.** `cd web && npm run tipos && npm run lint` sin errores. La lógica de `armarHistoria` se probó con el JSON real (UBA: 27 columnas 1998-2024 con hueco 2015-2022; Formosa: hueco desde 2015 «sin datos desde 2015»). No se vio en el navegador ni se corrió `npm run build` (prohibido para este agente): el aspecto está sin ver.
- **B3.** La Síntesis 2023-2024 es un PDF de imágenes; se renderizó la página y se leyó a ojo: PDF p. 8 (impresa 8), cuadro «Nuevos inscriptos, reinscriptos, estudiantes y egresados por nivel y sector de gestión. Año 2023», fila Pregrado y grado, Total: estudiantes 2.567.251 (estatal 2.011.498 + privado 555.753), nuevos inscriptos 713.467 (520.819 + 192.648), egresados 139.182 (88.288 + 50.894). La p. 28 repite los tres totales 2023 (gráfico 2013-2023). Las sumas estatal + privado cierran. Cargado en `datos/manual/universidades_alumnos.json` con página y cita; 2024 sigue sin cifra del total del país.

(se completa al implementar)

## Dónde ver los cambios
Local con la vista `web-out` (`http://localhost:3100<ruta>`); publicado en `https://primerolosdatos.com.ar<ruta>` recién después del commit, el push y la corrida completa en verde. Página con links: `docs/cambios/pendientes-de-datos.html`.

1. Presidentes › Herencia
   - 1.1 Menem 2: deuda con el FMI 3.739 millones de DEG y acuerdo de 1992 — `/herencia/?p=menem2`
   - 1.2 De la Rúa: recibe 3.263 y entrega 11.050 millones de DEG — `/herencia/?p=delarua`
   - 1.3 Kirchner y CFK 1: cepo con tope de US$ 100.000 por mes desde 2002 — `/herencia/?p=nk`
   - 1.4 La nota del cepo ya no dice que empezó en 2011 — `/herencia/?p=cfk2`
2. Presidentes › Congreso
   - 2.1 Leyes del Ejecutivo de Menem 1 a CFK 1, con «≈» — `/congreso/?cgi=leyes`
   - 2.2 Leyes por apoyo con «≈» y aviso en el puesto — `/congreso/?cgi=apoyo`
   - 2.3 «¿Cómo se cuenta?» con el reparto por días — `/congreso/?cgi=leyes`
3. Semáforo — `/semaforo/`
   - 3.1 Patentamientos, petróleo, leche y escrituras de la Ciudad
   - 3.2 CAME, Construya y escrituras de la Provincia (a mano, solo variación)
   - 3.3 Ajuste estacional propio con X-13
   - 3.4 Pie «sin fuente legible» solo con motos y autos
4. Universidades
   - 4.1 «Estudiantes a lo largo del tiempo» — `/universidades/?u=Universidad%20de%20Buenos%20Aires`
   - 4.2 Formosa, Jujuy, Salta y Santiago del Estero con 1998-2014 — `/universidades/?u=Universidad%20Nacional%20de%20Formosa`
5. Ficha del dato
   - 5.1 Estudiantes universitarios con 2023 — `/dato/?v=univ_estudiantes`
