# Datos nuevos: tercera investigación (2026-11-17)

Pedido: seguir con los datos calientes que faltaban (robos, motos, obra pública, vacunas, empleadores) y los pedidos del usuario del 2026-11-17: «puestos de trabajo totales? (formal + informal)», «pobreza en numero de personas? … y pobreza de alta frecuencia», «inversiones rigi anunciadas y ejecutadas?», «piquetes?», «consumo de carne?», «ingresos, alumnos regulares y graduados?», «natalidad, mortalidad?». Lo investigaron dos subagentes `investigador-datos`. La sesión principal comprobó en la API los ids `324.1_TOTAL_GENEAJO__29` (2T-26 = 22.565,8), `324.1_TOTAL_GENEREG__32` (2T-26 = 5.600,7), `379.9_GTOS_CAP_I017__36_40` y el GHO de la OMS (`WHS4_100`, ARG 2025 = 75).

[V] = bajado y leído; [B] = solo búsqueda o prensa.

| Dato | Fuente | Rango | Estado | Decisión |
|---|---|---|---|---|
| Puestos de trabajo totales, asalariados registrados, no registrados y no asalariados | INDEC, CGI, API `324.1_TOTAL_GENEAJO__29`, `_GENEADO__51`, `_GENEREG__32`, `_GENESAL__34` (miles de puestos; la API dice «millones de pesos», es un error) | trimestral 1T-16 → 2T-26 | [V] | entra |
| Motos 0 km y usadas | DNRPA, paquete `72d85f23-b751-4d12-935b-25e32ed9445e` (mismo formato que autos) | mensual ene-07 → oct-26 | [V] | entra |
| Robos y recuperos de autos | DNRPA, paquete `a9bdfec2-0af4-433a-b810-38c91275a251` (ZIP por año, microdatos) | mensual ene-18 → sep-26 | [V] | entra, aclarando que son trámites en los registros, no denuncias policiales |
| Obra pública nacional (inversión real directa, SPN base caja) | API `379.7_GTOS_CAP_I006__41_1` (1993-2006), `379.8_GTOS_CAP_I014__41_48` (2007-2014), `379.9_GTOS_CAP_I017__36_40` (2015 →) | mensual 1993 → sep-26 | [V] | entra; revisar el empalme 2006/2007 |
| Empresas con trabajadores (con ART) | SRT, serie histórica de unidades productivas, cuadro 1.2, fila (1) | mensual jul-96 → ago-26 | [V] | entra |
| Vacunación | OMS/UNICEF (WUENIC), GHO API `WHS4_100` (DTP3), `WHS8_110` (sarampión 1), `MCV2`, `WHS4_543` (BCG) | anual 2000 → 2025 | [V] | entra, diciendo que el Ministerio informa más (otro método) |
| Natalidad, defunciones, nacimientos | DEIS: API `tn_arg` (2000-2024), `hdef_arg` (1914-2023) y xlsx con 2024; nacimientos en CSV de datos.salud.gob.ar (2005-2024) | anual | [V] | entra |
| Pobreza en personas | INDEC, `cuadros_informe_pobreza_MM_AA.xls` (hoja «Poblaciones»), 31 aglomerados | semestral 1S-18 → 1S-26 | [V] | entra + estimación para el país (cuenta propia, D-027) |
| Pobreza de alta frecuencia | Nowcast UTDT (González-Rozada), semestres móviles; UCA ene-24 = 57,4 % (punto suelto) | 2024 → abr-sep 26 | [B] | a mano con cita (pedido del usuario) |
| RIGI | Lista oficial: planilla del Ministerio de Economía (Google Sheet `1eytHJrzUjIFOXI-P1Hx_wbmZiSqPxVle059Djdos6u8`, hoja `dataset`): 30 proyectos, USD 79.649 M; ingresado: solo una presentación del BCRA (USD 762 M netos al 1T-26) | — | [V] lista, [B] ingresado | panel `/rigi/` |
| Piquetes | Diagnóstico Político (privada), anual: 2022 9.778, 2023 8.239, 2024 5.996, 2025 3.893; el Gobierno dice «cero» y Chequeado lo calificó falso | anual | [B] | a mano con cita, con la frase del Gobierno al lado |
| Consumo de carne | MAGyP, «Indicadores bovinos anuales 1914-2025» (PDF; el sitio bloqueó al subagente); CSV abierto hasta 2019; CICCRA (privada) 46,0 kg a ago-26 | anual | [V] CSV viejo | a mano desde el PDF oficial; CICCRA solo si no se consigue |
| Universidades: inscriptos, estudiantes, egresados | Síntesis SPU (PDF, no coincide con el CSV de datos abiertos); PIU 2023-2024 ya en el sitio | — | [V] con reparos | **no entra**: las fuentes no cierran entre sí |

Descartados o pendientes: robos de motos (no publicados), cobertura del Ministerio de Salud en serie (solo triple viral por provincia hasta 2022), tasa global de fecundidad (sin dato oficial abierto), lo efectivamente invertido por el RIGI en serie.

Detalle de cada fuente (URL, columnas, trampas): en los informes de los subagentes, resumidos en `docs/specs/datos-calientes-3.md`.
