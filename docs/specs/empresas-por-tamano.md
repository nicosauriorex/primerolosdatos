# Empresas por tamaño: cuántas cierran y de qué tamaño

Estado: implementada (2026-11-17), sin publicar

Pedido del usuario (2026-11-17): «fijate si tenemos empleados por empresa. porque a veces cierran empresas (cuits) con 1 solo empleado o sin. y se usa eso para decir que cierran empresas. o como lo podemos contrastar», y después «Yes, spec and implement».
Investigación: `docs/investigaciones/empresas-por-tamano-2026-11-17.md` (fuentes bajadas; la sesión principal recalculó la tabla de la SRT: de las 32.429 empresas menos entre nov-23 y ago-26, 26.808 tenían de 1 a 5 trabajadores).

Todo entra como series del catálogo (ficha, Histórico, Por presidente, lupa, imagen), sin páginas nuevas.

## Fase 1. Pipeline: `pipeline/empresas.py` (`series(idx)`)
Mismo molde y reglas que `pipeline/trabajo_obra.py` (léelo: respaldo con `red`, `_control` que solo avisa, controles estructurales que cortan, `S` de `catalogo`). Se engancha en `catalogo.construir` (lo hace la sesión principal). Si una de las dos fuentes falla y no hay respaldo, se omiten solo sus series.

### A. SRT, serie histórica según tamaño de la nómina (mensual jul-96 →)
xlsx `https://www.srt.gob.ar/estadisticas/series/co/up/Serie_historica_Segun_Tama%C3%B1o_de_la_nomina_del_empleador%20-%20UP.xlsx`; si falla, buscar en `https://www.srt.gob.ar/estadisticas/cf_serie_historica_up.php` el `href` `.xlsx` que contenga «Tama» y «nomina». Hojas `Cuadro 4.2` (empleadores por tramo) y `Cuadro 4.1` (trabajadores cubiertos por tramo); fechas en la fila 5 (índice 4); tramos en las filas 6-18, columna A, con tildes rotas y espacios (normalizar y buscar por prefijo): `1`, `2`, `3 a 5`, `6 a 10`, `11 a 25`, `26 a 40`, `41 a 50`, `51 a 100`, `101 a 500`, `501 a 1500`, `1501 a 2500`, `2501 a 5000`, `Más de 5000`. Respaldo `srt_tamano` (solo la tabla ya armada: fecha × tramo × {empleadores, trabajadores}).

Se agrupan en seis tramos:

| id empleadores | id trabajadores | Tramo | Suma de |
|---|---|---|---|
| `empresas_t1` | `trab_empresas_t1` | 1 trabajador | `1` |
| `empresas_t2a5` | `trab_empresas_t2a5` | 2 a 5 | `2`, `3 a 5` |
| `empresas_t6a10` | `trab_empresas_t6a10` | 6 a 10 | `6 a 10` |
| `empresas_t11a50` | `trab_empresas_t11a50` | 11 a 50 | `11 a 25`, `26 a 40`, `41 a 50` |
| `empresas_t51a500` | `trab_empresas_t51a500` | 51 a 500 | `51 a 100`, `101 a 500` |
| `empresas_t501` | `trab_empresas_t501` | más de 500 | `501 a 1500`, `1501 a 2500`, `2501 a 5000`, `Más de 5000` |

Nombres: «Empresas con 1 trabajador», «Empresas con 2 a 5 trabajadores», …, «Empresas con más de 500 trabajadores»; «Trabajadores en empresas de 1 trabajador», «Trabajadores en empresas de 2 a 5», …. Además `empresas_chicas_pct`: «Empresas de 1 a 5 trabajadores (% del total)».

cat `["Empleo, pobreza e ingresos", "Empresas por tamaño (SRT)"]`; tipo none; unidades «empresas» / «trabajadores» / «%»; dir 0 (que haya más o menos empresas chicas no es mejor ni peor por sí solo; los totales de empresas y trabajadores ya tienen su serie con dir 1).

Controles (cortan): la suma de los 13 tramos de empleadores = `empresas_art` (cuadro 1.2 fila (1)) todos los meses en que están las dos (leer el valor del respaldo `srt_empresas` de `trabajo_obra.py` o volver a calcularlo; si no se puede, comparar con la fila de total (1) de la misma hoja 4.2); la suma de trabajadores = la fila «Personas trabajadoras en unidades productivas (1)» de la hoja 4.1. Controles puntuales (avisan): empleadores nov-23 = 512.357 y ago-26 = 479.928 (suma de tramos); tramo `1` nov-23 = 181.390; `Más de 5000` ago-26 = 114 empleadores y 2.560.401 trabajadores; trabajadores ago-26 = 9.389.184. Imprimir la variación por grupo entre nov-23 y el último mes (tiene que dar 1 a 5: −26.808 de −32.429 con datos a ago-26).

`desc` común (para un lector común): empleadores (empresas y otras unidades productivas, sin casas particulares) con al menos un trabajador declarado en una ART, según cuántos trabajadores tienen; son variaciones netas por tramo: una empresa que achica pasa a un tramo menor, así que la baja de un tramo no es igual a empresas que cierran; la SRT avisa que un cambio de un mes puede venir de rescisiones o de nóminas vacías. En el tramo de más de 500: en nov-2025 dejaron de figurar con ART 43.426 trabajadores del Ministerio de Economía de Chubut (cambio de cobertura, no despidos).

### B. OEDE, flujos de creación y destrucción de empleo y demografía de empresas (trimestral 2T-96 →)
Página `https://www.argentina.gob.ar/trabajo/estadisticas/oede-estadisticas-nacionales` (pedir con User-Agent de navegador; sin él da 403): buscar el `href` de `flujos_de_creacion_y_destruccion_de_empleo_*.xlsx` (viene con un prefijo `blank:#` que hay que sacar; el número cambia con cada actualización). Hoy: `https://www.argentina.gob.ar/sites/default/files/flujos_de_creacion_y_destruccion_de_empleo_3.xlsx`. Hojas con estacionalidad: `T4` (empresas: aperturas, cierres, stock con empleo) y `T1` (puestos creados por aperturas y expansión, destruidos por cierres y contracción, empleo total). Leer la estructura del archivo y ubicar filas/columnas por texto, no por número. Respaldo `oede_flujos` (la tabla armada).

| id | Nombre | unidad | dir | Cálculo |
|---|---|---|---|---|
| `cierres_empresas` | Empresas que cerraron en el trimestre | empresas | -1 | T4, cierres |
| `aperturas_empresas` | Empresas que abrieron en el trimestre | empresas | 1 | T4, aperturas |
| `puestos_por_cierre` | Puestos que tenía cada empresa que cerró | puestos por empresa | 0 | puestos destruidos por cierres (T1) / cierres (T4), 2 decimales |
| `puestos_perdidos_cierres` | Puestos perdidos por cierres de empresas | puestos | -1 | T1 |
| `puestos_perdidos_contraccion` | Puestos perdidos en empresas que siguen abiertas | puestos | -1 | T1, destrucción por contracción |

cat `["Empleo, pobreza e ingresos", "Empresas que abren y cierran (OEDE, trimestral)"]`. Trimestrales con un valor por trimestre en el primer mes (como la EPH y los puestos de trabajo: `s.reindex(idx)`, sin repetir ni repartir).

Controles puntuales (avisan): 1T-26 aperturas 15.231, cierres 18.013, puestos por cierres 43.458, contracción 225.462 (T1, con estacionalidad; el 230.305 del informe es la serie sin estacionalidad, T2), empleo total 6.617.693; 2T-23 cierres 22.102 y puestos 52.160. Control de cordura (corta): `puestos_por_cierre` entre 1 y 10 en todos los trimestres.

`desc`: «cierre» quiere decir que la empresa (CUIT) dejó de declarar empleados en el SIPA; no es una baja en ARCA ni una quiebra; el OEDE avisa que los cierres recientes se revisan (un cierre se confirma cuando la empresa no vuelve a declarar). Sector privado, sin casas particulares. Datos con estacionalidad: comparar con el mismo trimestre de otro año. En `puestos_por_cierre`: la empresa privada promedio tiene unos 12 puestos (empleo total / empresas con empleo, 1T-26), así que las que cierran son mucho más chicas que el promedio.

## Fase 2. Web
1. `web/lib/nombres.ts`: nombres públicos de las 18 series, las dos subcategorías y sinónimos: empresas que cierran, cierre de empresas, cierran empresas, pymes, microempresas, cuits, empresas chicas, monotributistas con empleados, aperturas de empresas, tamaño de empresas, despidos, achican.
2. `web/lib/plantillas.ts`: «Empresas por tamaño» (los seis tramos de empleadores, `asis`), «Trabajadores según el tamaño de la empresa» (los seis de trabajadores), «Empresas que abren y cierran» (aperturas y cierres), «Puestos perdidos: cierres y empresas que achican» (las dos de puestos perdidos).
3. `web/lib/datos-fijos.ts`: `empresas-que-cierran` (`cierres_empresas`), `puestos-por-cierre` (`puestos_por_cierre`), `empresas-chicas` (`empresas_chicas_pct`).
4. `web/lib/info.ts`: un párrafo corto en Empleo: cuántas empresas hay, de qué tamaño son las que se van y qué quiere decir «cierre».
5. En la `desc` de `empresas_art` (pipeline, `trabajo_obra.py`): agregar «Por tamaño: ver Empresas por tamaño (SRT)».

## Cómo se verifica
1. `python pipeline/obtener_datos.py` sin error; 18 series nuevas (678 en total); `verificar_series.py` OK; los controles pasan; la variación nov-23 → ago-26 por grupo se imprime y da 1 a 5 = −26.808.
2. `cd web && npm run tipos && npm run previas && npm run build`.
3. En `web-out`: las tres fichas nuevas, las cuatro plantillas, «Datos trimestrales» en las del OEDE, la lupa con «cierran empresas» y «pymes»; 360 px sin desborde; sin errores de consola.
4. Revisor contra esta spec.

## Verificación (2026-11-17)
- Pipeline completo sin error: 678 series (18 nuevas), `verificar_series.py` OK. Controles: suma de tramos = total de la hoja 4.2 y 4.1 desde 1998 (antes, desfasajes de la fuente: avisa); nov-23 512.357, ago-26 479.928, tramo 1 nov-23 181.390, más de 5000 ago-26 114 / 2.560.401, trabajadores ago-26 9.389.184; variación nov-23 → ago-26: 1 a 5 = −26.808 de −32.429 (también recalculada por la sesión principal desde el xlsx); OEDE 1T-26 aperturas 15.231, cierres 18.013, puestos por cierres 43.458, contracción 225.462 (T1; el 230.305 de la investigación era T2, sin estacionalidad), empleo 6.617.693; puestos por cierre entre 2,08 y 4,31 en los 120 trimestres. Aviso esperado: la SRT revisó jul-26 (31 empleadores) respecto del respaldo de `empresas_art`.
- Web: tipos, previas (61 de 61) y build sin error. En el navegador (leyendo el contenido, sin capturas): `/dato/puestos-por-cierre/` (2,41, «Datos trimestrales»), `/dato/empresas-chicas/` (70,9 %), las cuatro plantillas en `/plantillas/?q=empresas`; sin errores de consola.
- Revisor: marcó subcategorías con siglas (se agregaron nombres públicos), la frase de `info.ts` que se leía como cierres (ahora «bajaron en», variación neta), dos errores de redacción y el «12 puestos» fijo (ahora se calcula del último trimestre); corregidos.
- Conocido: en la plantilla «Empresas por tamaño» los tramos grandes (unos 1.500 empleadores) quedan casi planos al lado del de 1 trabajador (165.000): cada tramo tiene su ficha.

## Dónde ver los cambios
Local con la vista `web-out` (`http://localhost:3100<ruta>`); en el sitio recién después del commit, el push y la corrida completa en verde. Lista con links: `docs/cambios/empresas-por-tamano.html`.
1. Portada y menús: la lupa encuentra «cierran empresas», «pymes», «microempresas» — `/`
2. Histórico: `/plantillas/?q=empresas` (empresas por tamaño, trabajadores según el tamaño, empresas que abren y cierran, puestos perdidos)
3. Ficha: `/dato/empresas-que-cierran/`, `/dato/puestos-por-cierre/`, `/dato/empresas-chicas/`
4. Temas: `/tema/empleo/` (el ⓘ explica qué es un «cierre»)
