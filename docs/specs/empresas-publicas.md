# Empresas públicas: cuánto les transfiere el Tesoro y cuánta gente trabaja

Estado: implementada (2026-11-20), sin publicar
Ideas: "presupuesto de cada entidad pública" (IDEAS-HECHAS.md, 2026-11-13: quedaba sin dato «empresas públicas»). Es la fase 4 de [gasto](gasto-nacion.md).

## Objetivo
Que se vea cuánto pone el Tesoro en cada empresa pública cada mes desde 2019 (gasto corriente y de capital), cuánta gente trabaja en cada una, y cómo cambió con cada presidente. Va como series del catálogo (Histórico, ficha, Por presidente, imagen, Herencia) y como una vista «Empresas públicas» dentro de `/gasto/`.

## Fuente (probada el 2026-11-20)
- Monitor de transferencias a empresas públicas de la Oficina de Presupuesto del Congreso (OPC): `https://opc.gob.ar/Archivos/monitores/monitor_empresas_publicas.html` (unos 800 KB). El HTML trae el xlsx `monitor_empresas_publicas_datos.xlsx` en base64 dentro de `const b64 = '…'`. Se saca con una expresión regular y `base64.b64decode`; pandas lo lee con openpyxl.
- Hoja «Transferencias» (3.018 filas): `Ejercicio_Presupuestario, Mes, Mes_Nombre, Empresa, Clasificacion_Economica` («Gastos Corrientes» / «Gastos de Capital»), `Credito_Vigente_mill, Devengado_mill`. Millones de pesos corrientes, devengado del e-SIDIF. Desde ene-2019; hoy hasta oct-2026. 32 empresas, una es «Sin discriminar».
- Hoja «Ocupación» (2.795 filas; el nombre de la hoja trae tilde: buscarla por posición o sin tildes): `Ejercicio_Presupuestario, Mes, Mes_Nombre, Empresa, Ocupacion_agentes, Fuente` (`SIRHU` o `Presupuesto`). Hoy hasta ago-2026. El conjunto de empresas cambia un poco de un mes a otro (348 a 387 filas por año) y hay empresas que figuran en una hoja y no en la otra (VENG y Playas Ferroviarias solo en Ocupación).
- Cifras comprobadas: devengado total 2019 = 139.942; 2023 = 2.242.139; 2024 = 4.217.849; 2025 = 3.382.033 (millones). 2024 corrientes 3.172.899 y capital 1.044.950. Empleados: 72.560 en dic-25 y 69.347 en ago-26 (suma de las empresas de ese mes).
- El devengado mensual salta mucho (2026: 140.823 en julio, 507.411 en junio): las series son flujos y se leen mejor en 12 meses o por año.

## Aportes de capital (agregado el 2026-11-20, pedido del usuario al ver Aerolíneas)
El monitor de la OPC cuenta solo transferencias (inciso 5). Entre 2019 y 2022 el Tesoro financió a Aerolíneas con **aportes de capital** (inciso 6, partida principal «Aportes de capital y compra de acciones»), que no entran. Devengado en Presupuesto Abierto (millones): Aerolíneas 23.126 (2019), 42.623 (2020), 63.551 (2021), 72.908 (2022); Austral 549 (2019) y 1.062 (2020); Fabricaciones Militares S.E. 200 (2019); INTeA 700 (2023). El resto de los aportes de capital va a organismos internacionales (CAF, BID, FONPLATA…) y fondos fiduciarios: no son empresas y no entran.

A. **Fuente**: `credito-mensual-<AÑO>.zip` de Presupuesto Abierto (`pipeline/gasto_mensual.py` ya lo baja y lo lee por partes: reusar su `URL_MENSUAL`, `_get` y la lectura con `chunksize`), 2019 al año en curso. Filtro: `principal_desc` contiene «aportes de capital» (sin importar mayúsculas), agrupado por `subparcial_desc`, año e `impacto_presupuestario_mes`, columna `credito_devengado` (decimales con coma). Respaldo versionado `datos/cache/empresas_publicas_aportes.csv` (`anio, mes, empresa, devengado`, ya con el nombre de la OPC); los años cerrados no se vuelven a bajar; el año en curso, como mucho una vez por día. `--solo-json` usa solo el respaldo.
B. **Qué entra**: diccionario a mano `subparcial_desc` → empresa de la OPC: «Aerolineas Argentinas S.A.» y «Austral Lineas Aereas - Cielos del Sur S.A.» → Aerolíneas Argentinas (Austral se fusionó con Aerolíneas en 2020; se dice en la nota); «Fabricaciones Militares Sociedad del Estado» → Fabricaciones Militares; «Innovaciones Tecnológicas Agropecuarias S.A. (INTeA S.A.)» → la de la OPC con ese nombre. Un destinatario que no está en el diccionario y no es un organismo internacional ni un fondo fiduciario (nombre con «S.A.», «S.E.», «Sociedad del Estado» o «S.A.U.») se imprime como aviso para sumarlo a mano; no corta la corrida.
C. **Series**: `emp_pub_total` y las de cada empresa pasan a ser transferencias **más** aportes de capital (todavía no se publicaron: los ids no cambian de significado para nadie). Serie nueva `emp_pub_aportes` (Aportes de capital a empresas públicas), mismas propiedades que `emp_pub_corrientes`. Quedan 13 series. Las `desc` dicen que el total suma transferencias y aportes de capital, y de dónde sale cada parte.
D. **Archivo**: cada empresa y `total` llevan además `"apo": [por mes]` (millones, 1 decimal, mismo largo que `meses`; ceros donde no hay). Si el respaldo de aportes no existe, `apo` va en ceros y se avisa.
E. **Controles**: los de la OPC siguen sobre las transferencias (2024 = 4.217.849 y 2025 = 3.382.033); nuevos: aportes a Aerolíneas 2021 = 63.551 y 2022 = 72.908 (±1); corrientes + capital + aportes = total de cada mes.
F. **Sitio**: en `/gasto/?vista=empresas` los aportes son una tercera capa del gráfico por año («Aportes de capital», con su propio color de serie) y entran en el transferido de cada empresa, en el total, en la variación y en el transferido por empleado. La palabra para el público: «lo que puso el Tesoro» (transferencias y aportes de capital); la nota plegada explica la diferencia (un aporte de capital es comprar acciones de la empresa: en el presupuesto es un activo, no un gasto) y que Austral está dentro de Aerolíneas.

## Qué ve y hace el usuario
1. En el Histórico, la lupa y los temas encuentra «Transferencias a empresas públicas» y sus series hijas, como cualquier serie: pesos de hoy, dólares, % del PIB, por presidente, imagen.
2. En `/gasto/`, el `Seg` de arriba suma una tercera opción, **«Empresas públicas»** (`vista=empresas`). Muestra:
   - Tres tarjetas del último año cerrado (o el período que elija): transferido en pesos de hoy; variación real contra el año anterior; empleados al último mes con dato y su cambio en 12 meses.
   - Un gráfico por año 2019 a hoy en pesos de hoy, con corrientes y capital apilados. El año en curso va marcado «ene a <mes>» y se compara contra los mismos meses del año anterior.
   - La lista de empresas con barras: transferido en pesos de hoy, % del total, variación real, empleados y transferido por empleado. Orden por monto (por defecto), variación o empleados. Buscador. Al tocar una empresa se abre su serie por año (pesos de hoy) y su gente por mes.
   - Compartir: imagen con las tres tarjetas y las diez empresas que se ven, más el link.
   - Nota plegada: qué es una transferencia del Tesoro (no es lo que gasta la empresa ni su resultado); que solo entran las empresas que reciben plata del Tesoro; de dónde salen los empleados (SIRHU o Presupuesto); fuente y fecha.
3. En Herencia, una fila nueva «Transferencias a empresas públicas, % del PIB» en el grupo «Cuentas públicas».

## Requisitos

### Pipeline
1. `pipeline/empresas_publicas.py`: baja el HTML, saca el xlsx y lo agrega. Una bajada por día como mucho; respaldos versionados en `datos/cache/empresas_publicas_transferencias.csv` y `datos/cache/empresas_publicas_ocupacion.csv` (las dos hojas como vienen, con nombres de empresa limpios) y la fecha en `datos/cache/empresas_publicas_meta.json`. Si la página no responde, no tiene `const b64` o el xlsx cambió de columnas, avisa y usa los respaldos (patrón de `universidades.py`). `--solo-json` arma todo desde los respaldos.
2. Nombres: tildes bien (la lectura tiene que salir en utf-8: «Energía Argentina S.A.»), nombre del público corto con el técnico en `t` («AySA» / «Agua y Saneamientos Argentinos S.A. (AYSA S.A.)»). Diccionario a mano en el script. **Trenes Argentinos** = Sociedad Operadora Ferroviaria (SOF) + ADIF + Ferrocarriles Argentinos + Desarrollo del Capital Humano Ferroviario; en la lista va como un grupo que se abre en sus cuatro.
3. Series del catálogo (`tipo: "ars"`, `u: "millones de $"`, `agg: True`, `flujo: True`, `dir: 0`; fuente «OPC, Monitor de transferencias a empresas públicas (e-SIDIF)»; categoría nueva bajo cuentas públicas, la que ya use el catálogo para el gasto, con subcategoría «Empresas públicas»), devengado mensual desde ene-19:
   - `emp_pub_total` Transferencias a empresas públicas (todas)
   - `emp_pub_corrientes` y `emp_pub_capital`
   - `emp_pub_energia_argentina` (ex ENARSA), `emp_pub_trenes` (las cuatro de arriba), `emp_pub_aysa`, `emp_pub_rio_turbio`, `emp_pub_correo`, `emp_pub_belgrano_cargas`, `emp_pub_rta` (Radio y Televisión Argentina), `emp_pub_aerolineas`
   - `emp_pub_empleados`: empleados de las empresas públicas (`tipo: "none"`, `u: "personas"`, `agg: False`, `flujo: False`, `entero`). Total del mes solo si están todas las empresas que reportan ese año; si falta alguna, el mes queda vacío (no se rellena). Anotar en la salida del script cuántos meses quedan vacíos.
   Los ids son nuevos y no cambian de significado nunca. Las `desc` dicen qué es (transferencia del Tesoro, devengado) y qué no (no es el gasto de la empresa).
4. Archivo aparte `web/public/datos/empresas_publicas.json` para la vista de `/gasto/`, fuera del hash (como `universidades.json`); si falla, la corrida sigue sin él:
   ```
   { "generado", "fuente", "actualizado": "AAAA-MM-DD",
     "meses": ["2019-01", ...],            // hasta el último mes con transferencias
     "meses_ocup": ["2019-01", ...],       // hasta el último con empleados
     "empresas": [ { "n", "t"?, "grupo"?: "Trenes Argentinos",
                     "corr": [por mes], "cap": [por mes], "vig": [vigente por mes],
                     "ocup": [por mes, null sin dato], "fuente_ocup": "SIRHU"|"Presupuesto"|null } ],
     "total": { "corr", "cap", "vig", "ocup" } }
   ```
   Millones de pesos con 1 decimal; las empresas que solo están en Ocupación llevan ceros en las transferencias.
5. Controles (si uno no pasa, no se escriben ni las series ni el archivo, se avisa y la corrida sigue): devengado 2024 = 4.217.849 y 2025 = 3.382.033 (±1 millón, por redondeo); corrientes + capital = total cada mes; la suma de las empresas da el total cada mes; Trenes = la suma de sus cuatro. Control blando (solo se imprime): el devengado del año contra las transferencias a empresas públicas de Presupuesto Abierto (`datos/cache/gasto_nacion_<AÑO>.csv`, árbol `en_que`, las partidas de transferencias a empresas públicas, corrientes y de capital) y contra el SSPM, dataset 378 de datos.gob.ar, si se puede leer. Anotar la diferencia en esta spec.
6. Se llama desde `obtener_datos.py` en la corrida completa y en `--solo-json`. Entrada en `datos/manual/agenda.json` no hace falta (es automático); sí en el calendario de novedades si el registro lo pide (mirar `novedades.py`).

### Sitio
7. `/gasto/?vista=empresas`. Si falta `empresas_publicas.json`, la opción no aparece y un link con `vista=empresas` muestra el año completo (igual que `vista=mes`). Los demás parámetros de `/gasto/` no cambian de significado; los nuevos de esta vista (`emp` empresa abierta, `orden`, `anio`) van en la URL con `web/lib/url.ts`.
8. Cálculos en `web/lib/empresas-publicas.ts` (pesos de hoy con el IPC de `base.json` mes a mes; año en curso contra los mismos meses del año anterior; transferido por empleado = transferido del año / empleados promedio del año), carga en un hook como `useGasto`. Componente nuevo `web/components/GastoEmpresas.tsx`; `Gasto.tsx` solo suma la opción y lo llama.
9. Lista: hasta 10 filas y «Otras» (las cuentas cierran: la suma de lo que se ve da el total); Trenes Argentinos como grupo que se abre; «Sin discriminar» va dentro de «Otras». Una variación sobre una base chica se trata como en la fase 2 de gasto («—» con la explicación). Empresas sin empleados: «sin dato». Transferido por empleado solo con empleados en al menos 6 meses del año.
10. Sin veredicto (D-012): ni verde ni rojo en montos, variaciones o empleados. Palabras del público («lo que pone el Tesoro», no «devengado» en el título; el término técnico en la nota).
11. Herencia: fila `empresas_publicas` en `web/lib/herencia.ts`, grupo «Cuentas públicas», `id: "emp_pub_total"`, `medidas: [{ med: "real", esc: "pib" }, { med: "real" }]`, `anioCerrado: true`, nota «Serie desde 2019.». Macri queda con «recibió» sin dato (como las demás series que empiezan tarde).
12. Lupa y temas: las series nuevas en `web/lib/nombres.ts` con sinónimos (ENARSA, IEASA, trenes, ferrocarriles, Aerolíneas, Correo, AySA, Río Turbio, televisión pública) y en el tema de cuentas públicas. Link a la vista desde la ficha de `emp_pub_total` y desde el pie de `/gasto/`.
13. Imagen al compartir (`web/lib/gasto.ts` o el archivo nuevo) y vista previa en redes de `/gasto/?vista=empresas` si las previas ya distinguen vistas de `/gasto/`; si no, alcanza con la de `/gasto/`.
14. Reglas de siempre: formato es-AR con `formato.ts`, 360 px sin desborde, sin `<select>` nativo, chips compactos, reglas de `.claude/rules/frontend.md`.

## Casos borde
- Último mes con pocas transferencias: la fuente trae meses completos (cierra al mes), pero el año en curso es parcial: siempre comparar contra los mismos meses del año anterior y decir «ene a oct».
- Empresas que se crean, se cierran o se fusionan (ENARSA → IEASA → Energía Argentina; ATC, residual): se respeta el nombre de la fuente y se dice en la nota si una empresa no tiene datos todos los años.
- Ocupación con un mes que falta para una empresa: hueco en esa empresa; el total del mes, vacío (requisito 3).
- Meses en que el vigente es cero y hay devengado (o al revés): se muestran como vienen; no se calcula % ejecutado en esta vista.
- Si la OPC cambia el HTML: se usa el respaldo y el pipeline avisa; el sitio dice la fecha del dato.

## Fuera de alcance
- El gasto propio, los ingresos o el resultado de cada empresa (balances): otra fuente, otra spec.
- Empresas con participación estatal que no reciben transferencias (YPF, bancos públicos).
- Empresas provinciales.
- Ponderar si una transferencia está bien o mal.

## Cómo se verifica
1. `python pipeline/empresas_publicas.py` con red pasa los controles; sin red usa los respaldos; `python pipeline/obtener_datos.py --solo-json` arma las series y el archivo.
2. Catálogo: las 12 series nuevas están y `emp_pub_total` 2024 suma 4.217.849.
3. `cd web && npm run tipos && npm run lint && npm run previas && npm run build`.
4. Navegador (`web-out`): `/gasto/?vista=empresas` a 360 y 1280 px (tarjetas, gráfico, lista con Trenes abierto, una empresa abierta, buscador, orden); `/gasto/` y `/gasto/?vista=mes` siguen igual; un link con `vista=empresas` sin el archivo cae en el año completo; Histórico con `emp_pub_total` en % del PIB y por presidente; Herencia con la fila nueva; la lupa encuentra «ENARSA» y «trenes».
5. Barridos (`barrido-cuentas.ts`, `barrido-navegador.js`) y `revisor`.

## Resultado de la implementación (2026-11-20)
- Controles duros: 2024 = 4.217.848,8 y 2025 = 3.382.032,8 (tolerancia 1); corrientes + capital, suma de empresas y Trenes cierran en los 94 meses. Los controles corren antes de pisar los respaldos (un dato malo no reemplaza al último bueno) y hay un intento de bajada por día como mucho, aunque falle.
- Empleados: una empresa cuenta entre su primer y su último mes con dato (Polo Tecnológico empieza en oct-23 y no vacía el total); 0 meses vacíos. La misma regla para el grupo Trenes en el sitio.
- Control blando contra Presupuesto Abierto: no hay partida propia de empresas; van dentro de «Transferencias a otras entidades del Sector Público Nacional» y «Aportes de capital». Es un tope: 2024, empresas 4.217.849 contra 7.807.500; 2025, 3.382.033 contra 8.566.601. SSPM 378: no se hizo (queda pendiente, no bloquea).
- `--solo-json`: las `emp_pub_*` salen siempre de los respaldos (`empresas_publicas.inyectar_series`), así entran sin la corrida completa. Novedades: las toma solas (el registro mira todas las series del catálogo).
- Aceptado: el link de la ficha aparece aunque falte `empresas_publicas.json` (cae en el año completo de `/gasto/`). La vista previa en redes es la de `/gasto/`.
- Aportes de capital (sección de arriba): Aerolíneas con Austral 23.675,5 (2019), 43.685,0 (2020), 63.551,0 (2021), 72.908,3 (2022); Fabricaciones Militares 200 (2019); INTeA 700 (2023); Polo Tecnológico 7 (2025, sumado al ver el aviso). Primera bajada de los 8 archivos mensuales: unos 53 s. Las series pasan a llamarse «Fondos del Tesoro a …» (incluyen aportes); corrientes y capital siguen siendo solo transferencias. 13 series.
- Verificado: tipos, lint, build, `barrido-cuentas.ts` sin hallazgos, `barrido-navegador.js` a 360 y 1280 px en la vista (sin desborde; «Ajustes» cortado ya estaba en `/gasto/`; el eje marcado en SVG se ve entero en la captura), ficha, Herencia y Trenes abierto en el navegador. Revisor: dos pasadas.

## Dónde ver los cambios
Página: `docs/cambios/empresas-publicas.html`. Local `http://localhost:3100<ruta>` (vista `web-out`); publicado recién después del push y la corrida completa (toca `pipeline/`).
1. Portada: 1.1 la lupa encuentra ENARSA, trenes, Aerolíneas, Correo, AySA, Río Turbio — `/`.
2. Histórico: 2.1 `/historico/?v=emp_pub_total`; 2.2 corrientes y capital `/historico/?v=emp_pub_corrientes,emp_pub_capital`; 2.3 aportes de capital `/historico/?v=emp_pub_aportes`; 2.4 empleados `/historico/?v=emp_pub_empleados`.
3. Ficha: 3.1 `/dato/?v=emp_pub_total` (link a la vista); 3.2 Aerolíneas con aportes `/dato/?v=emp_pub_aerolineas`; 3.3 Energía Argentina; 3.4 Trenes; 3.5 AySA y las demás.
4. Herencia: 4.1 fila nueva en Cuentas públicas — `/herencia/`.
5. En qué gasta la Nación: 5.1 `/gasto/?vista=empresas`; 5.2 Trenes abierto; 5.3 ADIF abierta; 5.4 Aerolíneas 2021 con aportes; 5.5 nombres «Fondos del Tesoro»; 5.6 todas; 5.7 link al pie de `/gasto/`.
