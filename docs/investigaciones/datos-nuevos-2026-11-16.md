# Datos nuevos para la página: investigación (2026-11-16)

Pedido del usuario: sumar datos "calientes" que mencionan el gobierno, los ministros y la oposición, que le importan a la gente y que el sitio todavía no tiene. Ejemplos que dio: AUH y asignaciones en términos reales y cuánto cubren de la canasta, pensiones por invalidez por gobierno, Malvinas, en qué gastan las universidades (licitaciones) y empleados públicos por provincia/municipio.

Investigado con seis subagentes `investigador-datos`. **Verificado a mano por la sesión principal (API, 2026-11-16):** `165.1_AAUH_0_0_3` (oct-26 = 156.588), `187.1_PENSIONES_DEZ_0_0_50` (2025 = 1.150.450), `189.1_TOTAL_AUHAUH_0_0_9` (may-26 = 4.138.967), `t_snic_1_hechos_arg` (2025 = 3,48), `142.3_DEREC_2001_M_20` (oct-26), `322.3_TURISMO_EMIVO__15` (ago-26), `tmi_arg` (2024 = 8,5) y el xlsx de dotación del INDEC (HTTP 200). El resto lo vieron los subagentes; lo marcado "citado" solo salió en prensa.

## Ranking propuesto (valor × facilidad)

| # | Dato | Fuente | Cubre | Dificultad |
|---|---|---|---|---|
| 1 | AUH en pesos de hoy y como % de la CBA | API `165.1_AAUH_0_0_3` + CBA ya en el sitio | mensual 2009-11 → hoy | baja |
| 2 | Pensiones por invalidez (stock) por gobierno | API `187.1_PENSIONES_DEZ_0_0_50` (+ vejez `_JEZ_0_0_46`, madres de 7 `_JOS_0_0_54`) | anual dic 1999-2025 | baja |
| 3 | Homicidios dolosos (tasa y víctimas) | API `t_snic_1_hechos_arg`, `snic_1_victimas_arg` (y por provincia) | anual 2000-2025 | baja |
| 4 | Empleados públicos nacionales (dotación INDEC) | `indec.gob.ar/ftp/cuadros/economia/serie_dotacion_apn.xlsx` | mensual jul-2022 → sep-2026 | baja |
| 5 | Recaudación por impuesto (retenciones, Ganancias, IVA, Bienes Personales, PAIS) | API `142.3_DEREC_2001_M_20`, `_M_26`, `142.3_GANAN_2001_M_9`, `142.3_IVA_2001_M_3`, `142.3_BIENE_2001_M_17`, `142.3_IMPUESTO_PAIS_0_M_13_92` | mensual 1997 → hoy | baja |
| 6 | Niños con AUH y con asignaciones familiares | API `189.1_TOTAL_AUHAUH_0_0_9`, `189.1_TOTAL_AAFFAFF_0_0_10` (empalmar con `189.1_ASIGNACIONADO_II_0_0_44`/`_43` desde 2009) | mensual | baja-media |
| 7 | Gasto en AUH, asignaciones y pensiones no contributivas (real y % PIB) | API `186.3_ASIGNACIONIAL_0_0_43`, `186.3_ASIGNACIONRES_0_0_23`, `186.3_PENSIONES_VAS_0_0_26` | mensual 2004 → hoy | baja (revisar unidad de los primeros años) |
| 8 | Patentamientos de autos y motos (ya pendiente del semáforo) | datos.jus.gob.ar, dataset `estadistica-de-tramites-de-automotores` (CSV por provincia y mes; el nombre del archivo cambia, leerlo del `package_show`) | autos 2000, motos 2007 → oct-26 | baja-media |
| 9 | Turismo al exterior | API `322.3_TURISMO_EMIVO__15` (Ezeiza y Aeroparque) | mensual 2010 → hoy | baja |
| 10 | Mortalidad infantil | API `tmi_arg` (y por provincia) | anual 1990-2024 | baja |
| 11 | Presos (SNEEP) | datos.jus.gob.ar, `sneep-poblacion-total.csv` | anual 2002-2024 | baja |
| 12 | Importaciones de bienes de consumo | API `74.2_IIBCO_0_T_32` | trimestral 1992 → hoy | baja (revisar última fecha) |
| 13 | Pensiones por invalidez cada 1.000 habitantes por provincia | BESS xlsx `estadisticas_de_seguridad_social_pnc_MM-AAAA.xlsx` hoja 3.3.b; serie provincial en `boletin_provincias_pnc_AAAA.xlsx` | foto mensual; serie 2001-2026 | media (URL con fecha) |
| 14 | AUH + Tarjeta Alimentar sobre la CBA | AUH por API + montos de Alimentar a mano con resolución (`datos/manual/`) | desde 2020 | media |
| 15 | En qué gasta cada universidad (por inciso y partida) y su personal | PIU de la AGN (la misma API CKAN que ya usa `pipeline/universidades.py`): grupos `2-ejecucion-presupuestaria`, `6-personal` | 38-41 universidades 2023-2024, 27 en 2025; personal 50-52 | media |
| 16 | Malvinas: cronología de hechos verificables por gobierno | carga a mano con cita (Cancillería, ONU, CICR, Boletín Oficial) | 1983 → hoy | media |
| 17 | Empleadores (cierre de empresas) | CEP XXI `empleadoras_privadas_total.csv` | mensual 2007 → **oct-2023** (el CSV no tiene lo reciente) | media-alta |
| 18 | ATN y transferencias no automáticas a provincias | Presupuesto Abierto (ya procesado) / API `372.9_GTOS_CAP_T017__50_32` | 2015 → hoy | media |
| 19 | Desregulación, RIGI | solo comunicados; sin comparación entre gobiernos | desde 2024 | alta |

## Por tema

### AUH, asignaciones y Tarjeta Alimentar
- Monto pleno (100 %, el que cobra en mano es el 80 %). La AUE es igual a la AUH. Desde jul-2024 se ajusta por IPC; los saltos de 2024 fueron decisiones extraordinarias.
- **La cuenta del gobierno** (Capital Humano, comunicados del [21-11-2024](https://www.argentina.gob.ar/noticias/capital-humano-cubre-el-100-de-la-canasta-basica-alimentaria), [15-01-2025](https://www.argentina.gob.ar/noticias/capital-humano-mantiene-la-cobertura-del-100-de-la-canasta-basica-alimentaria) y [14-02-2025](https://www.argentina.gob.ar/noticias/capital-humano-mantiene-la-cobertura-del-100-de-la-canasta-basica-alimentaria-0)): AUH al 100 % + Alimentar de 1 hijo contra la CBA de **un adulto equivalente** (nov-24: 90.837 + 52.250 = 143.087 contra 142.149 = 100,7 %; dic-23: 54,8 %). La metodología no está escrita: se deduce de los números (citado, La Capital MdP).
- **La de la UCA/ODSA**: AUH al 80 % + Alimentar contra la CBA del hogar tipo (2 adultos + hijos): 40-68 % en 2026. Fundación Mediterránea, IARAF: parecidos al gobierno. Mostrar las dos convenciones con su definición: el debate "100 % contra 45 %" es de definiciones, no de datos.
- Decreto 421/2025: la Alimentar debe cubrir al menos el 95 % de la CBA. La Alimentar estuvo congelada de may-2024 a 2026 (52.250 / 81.936 / 108.062); en 2026, 72.250 / 113.299 / 149.425 (fecha de vigencia sin resolver: mayo o julio; mirar la Res. 161/2026 en el Boletín Oficial).
- Asignación familiar del SUAF por tramo: no hay serie; solo resoluciones de ANSES. Las asignaciones familiares contributivas cayeron de 5,47 millones (nov-23) a 4,28 millones (may-26) de prestaciones.

### Pensiones por invalidez
- Diciembre de cada año (API): 2003 81.539 · 2007 230.847 · 2015 1.065.241 · 2019 1.040.461 · 2023 1.215.548 · 2025 1.150.450. 2018 viene como promedio (valor fraccionario).
- **No hay altas por año** en ninguna fuente abierta: se compara la variación del stock (altas − bajas) por mandato, y se dice.
- BESS xlsx (hoja 3.1): mensual reciente, "total" y "no suspendidos" (desde 2019). No mezclar con la serie a diciembre.
- Por provincia, cada 1.000 habitantes (sep-26): Chaco 75,8, Santiago del Estero 72,2, Formosa 60,6 … país 24,4, CABA 8,2.
- Contexto con fecha para una línea de tiempo (verificar contra Boletín Oficial / HCDN antes de publicar): Decreto 843/2024, auditoría de ANDIS (2025), cautelar de Catamarca, Ley 27.793 de emergencia en discapacidad (veto, insistencia, Decreto 681/2025), causa Spagnuolo. **Las cifras de bajas (80.000, 110.000) solo están en prensa**: no mostrarlas como oficiales.
- Moratorias: sin serie anual oficial verificada; queda para después.

### Empleo público
- Nacional (INDEC, xlsx): total 341.465 (dic-23) → 266.205 (sep-26), −22,0 %. Meses recientes con "(i)" (imputado). Sin Fuerzas; universidades a confirmar en la nota metodológica. Empieza en jul-2022: no compara con gobiernos anteriores.
- Provincial: **ya está en el proyecto** (`pipeline/provincias_dnap.py` → `provincias_cuentas.json`, campo `emp`, con empleados cada 1.000 habitantes 2005-2025; corte de método en 2017). Falta mostrarlo bien en `/provincias/`.
- Municipal: no hay dato oficial actual. El SIPA no separa niveles ni da el sector público por provincia. Lo único es una foto de mediados de 2023 (nación 711.000, provincias 2,2 millones, municipios 440.000; citado por Chequeado, buscar el informe original). No armar una serie municipal restando fuentes de universos distintos.

### Universidades: en qué gastan
- **COMPR.AR no tiene ninguna universidad** (bajado el CSV de adjudicaciones: 104 SAF, solo la CONEAU), aunque el Decreto 1092/2024 las obliga. Volver a mirar en los próximos cortes.
- Licitaciones: "Universidades Compran" (CIN/SIU, ~36 universidades) tiene una API REST que no se probó; cada universidad tiene su portal (frágiles, sin formato común). Scrapear 61 sitios no es viable. Lo viable: una tabla de links por universidad (portal de compras y auditoría interna, del PIU), corrigiendo los rotos.
- **Lo que sí hay y es uniforme**: el PIU de la AGN publica la ejecución del gasto por inciso y partida (personal ≈ 82-84 %), la cuenta ahorro-inversión (59 universidades, 2023-2025) y el personal docente / no docente / autoridades (2023-2024). UBA 2024: gastó 646.715 millones contra 602.898 transferidos (la diferencia serían recursos propios: cruzar universidad por universidad antes de publicar).
- Contexto: Ley 27.757 (vetada, 2024), Ley 27.795 (promulgada y suspendida por los Decretos 759/760 de 2025, fallo de la Cámara de 2026), dictamen de la Procuración sobre la SIGEN (2024), plan de auditorías de la AGN.

### Malvinas
- La "ley" del usuario: el 4-9-2026 Milei anunció sanciones a petroleras que operan en Malvinas sin autorización (Rockhopper cayó hasta 11,8 % en el día y Navitas hasta 4,5 %, Forbes Argentina). El 17-9-2026 envió el proyecto de **Ley de Defensa de la Soberanía Nacional**, que reemplaza la Ley 26.659 y sube las penas. Tiene dictamen en Diputados (fines de octubre) y, a la fecha, no encontramos que se haya votado: confirmar en hcdn.gob.ar. Endurece las sanciones, no las saca.
- Un puntaje de "qué gobierno avanzó más" sería opinión: las estrategias fueron distintas (acercamiento en 1989-1999 y 2016, reclamo y sanciones en 2007-2015 y ahora). Las resoluciones de la ONU (C-24) salen todos los años por consenso y no dependen del gobierno.
- Propuesta: cronología por gobierno de hechos verificables con cita (acuerdos y comunicados, leyes, resoluciones, soldados identificados en Darwin por el Plan Proyecto Humanitario: 115 + 6), sin puntaje, con la nota "no medimos qué estrategia fue mejor". Carga a mano en `datos/manual/`, como `herencia.json`.

### Otros calientes (barrido)
- **Homicidios**: Milei y Seguridad citan "la tasa más baja de la historia". La API da la tasa de **hechos** (3,48 en 2025); el gobierno cita 3,6 (víctimas, otra fila del informe). Aclarar cuál se muestra.
- **Empleadores**: es el argumento de la oposición (−28.000 desde nov-23, Fundar; citado). El CSV oficial termina en oct-2023: hace falta otra fuente (SRT) para lo reciente.
- **Recaudación por impuesto**: retenciones, fin del PAIS, Ganancias, Bienes Personales; el sitio ya tiene el total.
- **Turismo al exterior, importaciones de consumo**: el debate del atraso cambiario y la apertura.
- **Mortalidad infantil, presos, femicidios** (este último con registros que no coinciden: Corte Suprema, SNIC y no oficiales).
- **RIGI** (anunciado contra lo que entró: USD 46.700 millones aprobados contra ~762 millones ingresados al 1T-2026, citado) y **desregulación** (17.115 artículos según el Ministerio, cifra cuestionada): solo paneles con cita, sin comparación entre gobiernos.
- Sin fuente oficial: alquileres de oferta, salario docente por paritaria, consumo de carne per cápita, boleto de colectivo (habría que armarlo desde resoluciones).
