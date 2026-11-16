# Subsidios al transporte, transferencias a provincias, patentamientos, demanda eléctrica, gasto por función y siniestros viales

Estado: implementada (2026-11-16), publicada en 438ea3c (corrida completa en verde, run 43896968685; /dato/transferencias-provincias/ y /dato/siniestros-viales/ comprobadas en el sitio)

Pedido del usuario (2026-11-16): «manda a investigar si hay otra cosa interesante para mostrar. capaz hay cosas que va a haber que traer mas manual pero mientras pongamos la fuente esta bien» y, al abrir esta sesión, «seguí con la spec de los datos de docs/investigaciones/datos-nuevos-2-2026-11-16.md». Se toma la recomendación de la investigación (1, 2, 3, 6 y 7, después 4) más los que salen de la misma API sin esfuerzo (becas, seguro de desempleo, siniestros viales).

Todo entra como series del catálogo (ficha, Histórico, Por presidente, lupa, imagen), sin páginas nuevas. Lo nuevo en la interfaz: subcategorías nuevas y principales en los temas que ya existen.

## Fuentes (verificadas por la sesión principal el 2026-11-16)

| Serie | Fuente / id | Rango | Control |
|---|---|---|---|
| Subsidios económicos al transporte | API `452.2_TRANSPORTERTE_0_T_10_32` (IMIG, Hacienda, base caja, millones de $) | mensual ene-16 → | sep-26 = 246.807,4; ago-26 = 290.327,8 |
| Transferencias corrientes a provincias | suma de las 5 mensuales del IMIG: Educación `452.2_TRANSFERENION_0_T_46_94`, Salud `452.2_TRANSFERENLUD_0_T_42_88`, Seguridad Social `452.2_TRANSFERENIAL_0_T_53_66`, Desarrollo Social `452.2_TRANSFERENIAL_0_T_54_58`, Otras `452.2_TRANSFERENRAS_0_T_42_55` (solo «Otras» sep-26 = 152.590,6; la suma de las 5, 249.874,2) | mensual ene-16 → | la suma anual tiene que dar el total anual de la tabla (buscar el id anual del total «Transferencias corrientes a provincias» del IMIG; si no existe, comparar componente por componente con sus anuales `…_A_`/`P1Y`, ±0,5 %) |
| Transferencias de capital a provincias | suma de las mensuales `452.3_CAPITAL_*_M_*` «Transferencias a provincias»: transporte `452.3_CAPITAL_TRIAS_0_M_43_35`, otros `452.3_CAPITAL_OTIAS_0_M_38_72`, educación `452.3_CAPITAL_EDIAS_0_M_42_42`, energía `452.3_CAPITAL_ENIAS_0_M_40_18`, vivienda `452.3_CAPITAL_VIIAS_0_M_41_41`, agua y alcantarillado `452.3_CAPITAL_AGIAS_0_M_59_12` | mensual → ago-26 | buscar en la API si hay más rubros «Gastos de capital. <rubro>. Transferencias a provincias» mensuales y sumarlos todos; control igual que el de arriba con los anuales `452.2_CAPITAL_*_P1Y` |
| Becas (Progresar y otras por vulnerabilidad) | API `186.3_BECASCAS_0_0_5` (devengado, millones de $) | mensual 2004 → oct-26 | oct-26 = 35.332,6 |
| Seguro de desempleo | API `186.2_SEGURO_DESLEO_0_0_16` (devengado, millones de $; la API lo da trimestral) | trimestral 2004 → 3T-26 | 3T-26 = 133.239,6 |
| Demanda de electricidad | API `367.3_DEMANDA_TOTAL__13` (CAMMESA, GWh) | mensual 2001 → sep-26 | sep-26 = 11.209,9 |
| Patentamientos (autos 0 km) | DNRPA, datos.jus.gob.ar, dataset `1ab0cc03-ab9b-4520-975c-5757d87d1061`, recurso «Estadística de inscripciones iniciales de automotores - 200001 - AAAAMM» (CSV ~360 KB por provincia y mes; columnas `anio_inscripcion_inicial`, `mes_inscripcion_inicial`, `cantidad_inscripciones_iniciales`). **La URL cambia cada mes** (lleva la fecha): resolverla con `https://datos.jus.gob.ar/api/3/action/package_show?id=1ab0cc03-ab9b-4520-975c-5757d87d1061` buscando el recurso cuyo nombre empieza con «Estadística de inscripciones iniciales» | mensual ene-00 → oct-26 | ene-00 = 46.926; oct-25 = 52.559; oct-26 = 46.390 (suma de provincias) |
| Transferencias de autos usados | mismo dataset, recurso «Estadística de transferencias de automotores - …» (mismas columnas con `transferencia`) | mensual 2000 → oct-26 | control al implementar |
| Gasto nacional por función | `datos/cache/gasto_nacion_finfun.csv` (ya lo baja `pipeline/gasto_nacion.py`, `cargar_finfun`): devengado anual desde 2004, en pesos, con el PIB nominal | anual 2004 → 2025 | la suma de todas las columnas `finalidadX_funcionY` del año = total de la serie larga que ya muestra `/gasto/` |
| Muertes en siniestros viales | API `t_snic_3_victimas_arg` (cada 100.000 habitantes) y `snic_3_victimas_arg` (víctimas) | anual 2014 → 2025 | 2025 = 7,72 y 3.583; 2024 = 7,68 y 3.555 |

Descartados (decirlo en el informe, no implementar):
- **Femicidios:** el registro del Ministerio de Justicia (dataset `27bb9b2c…`) termina en 2019 y no hay serie en la API. Queda como dato a cargar a mano desde el Registro Nacional de Femicidios de la Justicia Argentina (Corte Suprema, Oficina de la Mujer): ver fase 3, opcional.
- **Robos:** `snic_rt_arg` termina en 2022 (no llega a este gobierno).
- **Subsidios a la energía mensuales** (`452.2_ENERGIAGIA_0_T_7_56`): la serie de energía que ya está en el catálogo es la trimestral `452.2_ENERGIAGIA_0_T_7_79`. No se cambia (su id es el de la API y los links compartidos tienen que seguir mostrando lo mismo); la de transporte entra mensual. Que la descripción de transporte diga que la de energía es trimestral.
- Ventas en mayoristas, utilitarios, motos, vacunas, soja, SIPA por sector, SRT: poco valor o sin fuente directa (siguen en la investigación).

## Qué se hace

### Fase 1. Pipeline: `pipeline/mas_series.py` (`series(idx, pob=None)`, llamado desde `catalogo.construir` igual que `sociedad`)
Mismo molde que `pipeline/sociedad.py`: series de la API con `_cacheado_dict("mas_series", ids)`; los CSV de la DNRPA con `red.cacheado` / `red.cache_df` (nunca `urlopen` fuera de `red.py`; si el `package_show` o el CSV fallan, se usa el respaldo; si no hay respaldo, se omiten esas series con un aviso, sin romper la corrida). Anuales en diciembre con `_anual_a_diciembre` (importada de `proteccion_social`), trimestrales con `_trim_a_mes` (`repartir=True` en los flujos).

| id | Nombre | cat | tipo | unidad | dir | Opciones |
|---|---|---|---|---|---|---|
| `sub_transporte` | Subsidios al transporte | la misma cat que «Subsidios económicos a la energía» en `pipeline/catalogo.py` (hoy `FI` = `["Fiscal"]`); si conviene, crear `["Fiscal", "Subsidios"]` y mover la de energía ahí también (la cat sí puede cambiar, el id no) | ars | millones de $ | 0 | agg, flujo |
| `transf_prov_corrientes` | Transferencias corrientes a provincias (no automáticas) | `["Fiscal", "Transferencias a provincias"]` | ars | millones de $ | 0 | agg, flujo |
| `transf_prov_capital` | Transferencias de capital a provincias (obras) | ídem | ars | millones de $ | 0 | agg, flujo |
| `transf_prov` | Transferencias no automáticas a provincias (corrientes + capital) | ídem | ars | millones de $ | 0 | agg, flujo; solo los meses en que están las dos partes |
| `becas` | Gasto en becas (Progresar y otras) | la cat de AUH / Tarjeta Alimentar (buscarla en `pipeline/proteccion_social.py`) | ars | millones de $ | 0 | agg, flujo |
| `seguro_desempleo` | Gasto en seguro de desempleo | ídem | ars | millones de $ | 0 | agg, flujo, trim_flujo |
| `demanda_electrica` | Demanda de electricidad | `["Actividad", "Energía"]` si ya existe una cat de energía (petróleo, gas: buscarla); si no, `["Actividad"]` | none | GWh | 1 | agg |
| `patentamientos` | Patentamientos de autos 0 km | `["Actividad", "Consumo e indicadores de demanda"]` (la de supermercados) | none | autos | 1 | agg |
| `transferencias_autos` | Ventas de autos usados (transferencias) | ídem | none | autos | 1 | agg |
| `gasto_salud` | Gasto nacional en salud (% del PIB) | `["Fiscal", "Gasto por función"]` | none | % del PIB | 0 | anual |
| `gasto_educacion` | Gasto nacional en educación y cultura (% del PIB) | ídem | none | % del PIB | 0 | |
| `gasto_ciencia` | Gasto nacional en ciencia y técnica (% del PIB) | ídem | none | % del PIB | 0 | |
| `gasto_seguridad` | Gasto nacional en seguridad interior (% del PIB) | ídem | none | % del PIB | 0 | |
| `gasto_defensa` | Gasto nacional en defensa (% del PIB) | ídem | none | % del PIB | 0 | |
| `siniestros_viales_tasa` | Muertes en siniestros viales cada 100.000 habitantes | `["Sociedad", "Seguridad vial"]` | none | víctimas cada 100.000 habitantes | -1 | |
| `siniestros_viales` | Muertes en siniestros viales | ídem | none | víctimas | -1 | |

Gasto por función: las columnas salen de los nombres que ya usa `gasto_nacion.py` (`nombres_fin`, del JSON del gasto); confirmar qué `finalidadX_funcionY` es cada una (salud, educación y cultura, ciencia y técnica, seguridad interior, defensa) leyendo esos nombres, no suponiéndolo. % del PIB = devengado del año / `pib` de la misma fila × 100. El año en curso (sin cerrar) no entra. Se calcula en pesos de cada año dividido el PIB del año: no hace falta deflactar.

`dir`: gasto y subsidios neutros (0); patentamientos, autos usados y demanda eléctrica 1 (más actividad); siniestros -1.

Descripciones (`desc`) para un lector común, diciendo lo que importa para no engañar:
- Subsidios al transporte: plata del Estado nacional para que colectivos y trenes (sobre todo del AMBA) cobren menos de lo que cuestan; base caja (lo pagado), Informe Mensual de Ingresos y Gastos de Hacienda. Se ve mejor en pesos de hoy o en % del PIB. Los de energía están aparte y son trimestrales.
- Transferencias a provincias: las que el gobierno nacional decide (no automáticas): no incluye la coparticipación ni otras transferencias por ley. Corrientes: para gastos del día a día (educación, salud, seguridad social de cajas no transferidas, desarrollo social y otras); de capital: para obras. Base caja, IMIG.
- Becas: Progresar y otras becas por vulnerabilidad, devengado (Secretaría de Política Económica). Seguro de desempleo: lo que paga ANSES a quienes perdieron un empleo registrado; dato trimestral repartido en los 3 meses.
- Demanda de electricidad: toda la energía eléctrica pedida al sistema mayorista (CAMMESA) en el mes; depende mucho del clima (sube en verano e invierno), así que se compara contra el mismo mes de otros años.
- Patentamientos: autos y utilitarios 0 km inscriptos por primera vez en el Registro del Automotor (DNRPA, Ministerio de Justicia), suma de todas las provincias. Autos usados: transferencias de dominio registradas. Confirmar en el CSV qué tipos de vehículo cuenta (`tipo_vehiculo`; hoy solo dice «Automotores»: si incluye motos o maquinaria, decirlo).
- Gasto por función: gasto devengado de la Administración Pública Nacional en esa función, en % del PIB del año (Presupuesto Abierto). No incluye lo que gastan provincias y municipios (en educación y salud, la mayor parte). Dato anual, se ubica en diciembre.
- Siniestros viales: muertes en hechos de tránsito registrados por las fuerzas de seguridad (SNIC, Ministerio de Seguridad). Puede diferir de la Agencia Nacional de Seguridad Vial, que cuenta también a quienes mueren hasta 30 días después. Anual, en diciembre.
- `fuente`: organismo y número de serie como en `sociedad.py`; DNRPA con el nombre del dataset; gasto por función con «Presupuesto Abierto, serie_finfun_anual.csv».

Controles de cordura (fallan la corrida si no se cumplen, salvo donde se dice):
- Los valores de control de la tabla de fuentes: solo avisan (decidido al implementar: una revisión de un mes viejo por parte del organismo no debe cortar la corrida diaria y llevarse las 16 series).
- Transferencias corrientes y de capital: suma de los componentes mensuales del año = anual de la API (±0,5 %) en los años cerrados desde 2016; si la API no tiene anuales para comparar, imprimirlo y no fallar.
- Patentamientos: ningún mes con menos de 20 provincias (que no falte media provincia por un error de lectura); oct-26 = 46.390.
- Gasto por función: cada % del PIB entre 0 y 5; salud 2024 cerca de lo que muestra `/gasto/` para la misma función (imprimir los dos).
- Siniestros: víctimas / tasa entre 400 y 480 (población en cientos de miles) en 2014-2025.

Ids nuevos a `datos/series_esperadas.txt`.

### Fase 2. Web
1. `web/lib/catalogo.ts` y `web/lib/nombres.ts`: las subcategorías nuevas («Transferencias a provincias», «Gasto por función», «Seguridad vial», «Subsidios» si se crea) con nombre público; nombres claros y sinónimos de búsqueda: subsidios, colectivos, boleto, trenes, transporte, gobernadores, provincias, fondos discrecionales, ATN, obras en provincias, becas, progresar, seguro de desempleo, desempleo, luz, electricidad, consumo eléctrico, cammesa, autos, 0 km, patentamientos, ventas de autos, usados, educación, salud, ciencia, conicet, defensa, seguridad, accidentes de tránsito, siniestros viales, muertes en rutas.
2. `web/lib/temas.ts`: principales nuevos en los temas que ya existen: Cuentas públicas → «Transferencias no automáticas a provincias» (real) y «Subsidios al transporte» (real); Actividad → «Patentamientos»; Seguridad y salud → «Muertes en siniestros viales cada 100.000 habitantes». Revisar `web/lib/info.ts` (texto largo de Fiscal, Actividad y Sociedad) y sumar un párrafo corto por grupo nuevo.
3. `web/lib/plantillas.ts`: «Transferencias a provincias en pesos de hoy» (corrientes y capital), «Gasto en salud, educación y ciencia (% del PIB)», «Patentamientos» y «Subsidios: transporte y energía en pesos de hoy» si las plantillas permiten mezclar una mensual y una trimestral (si no, solo transporte).
4. `web/lib/datos-fijos.ts`: `subsidios-transporte` (`sub_transporte`, real), `transferencias-provincias` (`transf_prov`, real), `patentamientos`, `demanda-electrica`, `gasto-ciencia`, `siniestros-viales` (`siniestros_viales_tasa`).

### Fase 3 (opcional). Femicidios a mano
Solo si se puede citar cada año: `datos/manual/femicidios.json` con las víctimas directas de femicidio por año (2014 →) del Registro Nacional de Femicidios de la Justicia Argentina (Corte Suprema, Oficina de la Mujer), cada año con documento (URL del informe), página y la cifra tal como dice el informe. Serie `femicidios` en `["Sociedad", "Seguridad"]`, `dir` -1, anual en diciembre, `fuente` con el informe. Si no se consiguen al menos 8 años con cita, no se carga y se dice en el informe. Lo busca un subagente `investigador-datos`; la sesión principal abre al menos dos de las citas para comprobarlas.

## Fuera de esta spec
Obra pública por inciso (bienes de uso) en serie larga: `gasto_nacion` solo tiene años desde 2018 y por inciso; queda para otra spec. Robos, motos, vacunas, mayoristas, utilitarios, SIPA por sector, SRT.

## Cómo se verifica
1. `python pipeline/obtener_datos.py` termina sin error, el total de series sube en las agregadas (616 → ~633) y `verificar_series.py` pasa. Los controles de cordura se imprimen y pasan.
2. Valores de control de la tabla de fuentes en el JSON de la web.
3. `cd web && npm run tipos && npm run previas && npm run build`.
4. En `web-out`: ficha y Por presidente de cada serie nueva, los temas con sus principales, la lupa con «colectivos», «gobernadores», «patentamientos», «progresar», «luz», «conicet», «accidentes de tránsito», las plantillas nuevas y las páginas `/dato/<slug>/`. A 360 px sin desborde ni errores de consola.
5. Revisor contra esta spec.

## Verificación (2026-11-16)
- Pipeline completo sin error (tres corridas): 633 series (17 nuevas, femicidios incluida), `verificar_series.py` OK. Controles: transferencias corrientes y de capital = sus anuales de la API en 2016-2025 (desvío 0,000 %); DNRPA con 24 provincias todos los meses; gasto por función = serie larga de `/gasto/` (salud 2024 = 0,761 % en los dos); siniestros víctimas / tasa entre 427 y 464; valores de control de la tabla, todos cumplidos.
- Decisiones al implementar: «Transferencias de capital» suma 6 rubros (se agregó agua y alcantarillado, `452.3_CAPITAL_AGIAS_0_M_59_12`; con él cierra con los anuales); no hay total anual de transferencias en la API, el control es por componente; `sub_transporte` queda en «Fiscal» junto a la de energía (no se creó «Fiscal › Subsidios»); `demanda_electrica` en «Actividad» (no hay «Actividad › Energía»); la DNRPA solo dice «Automotores» (no separa autos, utilitarios ni motos: lo dice la descripción); los valores de control puntuales pasaron a aviso.
- Femicidios (fase 3): 12 años (2014-2025) del Registro Nacional de Femicidios de la Justicia Argentina, cada uno con documento, página y cita en `datos/manual/femicidios.json`. La sesión principal abrió el informe 2025 (p. 3: 200 víctimas directas; p. 5: 252 en 2017, 260 en 2019 y la aclaración de que las cifras se revisaron) y el 2024 (p. 10: 228). 2018 y 2020 salen del gráfico del informe 2025 (sin frase textual).
- Web: tipos, previas (46 de 46) y build sin error. En el navegador (leyendo el contenido y midiendo, sin capturas): fichas `/dato/<slug>/` nuevas, Por presidente de transferencias, temas Cuentas públicas, Actividad y Seguridad y salud con sus principales, gráficos listos, lupa (colectivos, gobernadores, patentamientos, progresar, luz, conicet, accidentes de tránsito, femicidios); a 360 px sin desborde ni errores de consola.
- Revisor: primera pasada marcó el nombre de femicidios sin «directas» y la fuente sin el informe (corregidos); segunda pasada sin problemas.

Cambios generales que salieron al verificar:
- La fuente de las transferencias perdía la primera serie al mostrarse (la web quita «, serie X»): ahora dice «series a, b, …» y `fuente-publica.ts` la acorta entera en las imágenes.
- El buscador y Cambiar dato dicen «1 resultado» (antes «1 resultados»).

Detalle conocido, sin corregir: las cantidades enteras menores de 1.000 se muestran con un decimal («200,0» víctimas de femicidio), porque el formato general del sitio no sabe qué series son cantidades enteras.

## Dónde ver los cambios
Local con la vista `web-out` (`http://localhost:3100<ruta>`); en el sitio (`https://primerolosdatos.com.ar<ruta>`) recién después del commit, el push y la corrida completa en verde. Lista con links: `docs/cambios/datos-calientes-2.html`.
1. Buscar: la lupa encuentra colectivos, gobernadores, patentamientos, progresar, luz, conicet, accidentes de tránsito, femicidios; «1 resultado» — `/`
2. Histórico: gráficos listos `/plantillas/?q=provincias`, `/plantillas/?q=subsidios`, `/plantillas/?q=ciencia`; becas `/historico/?v=becas~real~~compra~`; autos usados `/historico/?v=transferencias_autos~asis~~compra~`
3. Ficha: `/dato/subsidios-transporte/`, `/dato/transferencias-provincias/`, `/dato/patentamientos/`, `/dato/demanda-electrica/`, `/dato/gasto-ciencia/`, `/dato/siniestros-viales/`; femicidios `/historico/?v=femicidios~asis~~compra~`
4. Temas: `/tema/fiscal/`, `/tema/actividad/`, `/tema/sociedad/`
5. Por presidente: `/dato/transferencias-provincias/#fi-pres`, `/dato/subsidios-transporte/#fi-pres`
