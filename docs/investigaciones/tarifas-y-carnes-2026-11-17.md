# Tarifas, subsidios, carnes y datos que faltaban (2026-11-17)

Pedidos: fase 3 de deuda (parte del costo de la luz que pagan las tarifas), datos calientes que faltan, «la tarifa de luz, de agua y de gas … bs as, cordoba y santa fe, con y sin subsidio, cantidad de gente que recibe el subsidio y los tipos de subsidios» y «un indicador de la tarifa que paga el estado vs el consumidor final».

## A. Electricidad mayorista (CAMMESA) — verificado abriendo los archivos
- **PEST mensual** ($/MWh, sin IVA; energía + potencia + transporte; desde nov-25 suma servicios asociados): ZIP «Precios medios Estacionales MEM y TDF 2019 2026 WEB» (`https://cammesaweb.cammesa.com/?wpdmdl=44426`, página `/pme-res56-23/`), hoja «Datos»; ene-19 → sep-26. Se factura 2 meses después.
- **Monómico** (u$s/MWh; energía + potencia + servicios + transporte): «Base de datos Informe Anual 2025» (`?wpdmdl=52496`), hoja «PRECIOS»: anual 2005-2025 y mensual 2024-2025. 2022 y 2023 con valores rotos en el total. Mensual 2018 → está en «Variables Relevantes del MEM – BASE DE DATOS» (`/variables-relevantes-mem/`), link no conseguido (botones con href="#"): mirarlo en el navegador.
- Dólar: A3500 fin de mes (`175.1_DR_REFE500_0_0_25`).
- Cobertura (PEST en u$s / monómico): 2019 65,5 %; 2020 54,2 %; 2021 36,9 %; 2024 61,6 %; 2025 71,2 %; jul-25 48,9 % (IAE: 49 %); jun-25 55,0 %.
- Reparos: quiebre nov-25; la base y el PDF mensual de CAMMESA difieren (jul-26 96.706 vs 105.299); el IAE (39 % jul-26) usa otra definición: no mezclar. No hay serie oficial descargable de cobertura (solo PDF de CAMMESA, gráficos del IAE e IIEP-UBA).
- Citas: IAE Mosconi, Tendencias N.° 112 (jul-26) p. 5; CAMMESA Resumen jul-26 y Resumen Anual 2025.

## B. Carnes por habitante — verificado en los PDF de MAGyP
Tablero 2024 (p. 8, 2015-2019) y Tablero 2025 (2020-2025, provisorio):

| Año | Vacuna | Aviar | Porcina | Total |
|---|---|---|---|---|
| 2015 | 58,6 | 45,8 | 11,4 | 115,8 |
| 2016 | 55,4 | 43,1 | 12,3 | 110,8 |
| 2017 | 57,3 | 44,5 | 13,7 | 115,5 |
| 2018 | 56,5 | 44,1 | 14,1 | 114,7 |
| 2019 | 51,1 | 45,4 | 14,1 | 110,7 |
| 2020 | 50,68 | 46,79 | 14,34 | 111,81 |
| 2021 | 49,40 | 46,32 | 15,86 | 111,58 |
| 2022 | 50,98 | 46,35 | 16,80 | 114,12 |
| 2023 | 52,72 | 46,46 | 16,82 | 115,99 |
| 2024 | 48,49 | 46,25 | 17,42 | 112,16 |
| 2025 | 49,92 | 47,68 | 18,89 | 116,48 |

- URLs: Tablero 2025 `https://www.magyp.gob.ar/sitio/areas/bovinos/informacion_sectorial/_archivos/000017_Tablero%20de%20consumo%20de%20carnes/000002_Tablero%20consumo%20per%20capita%20de%20carnes%202025.pdf`; Tablero 2024 `https://www.magyp.gob.ar/sitio/areas/aves/estadistica/carne/_archivos/000008_Indicadores%20Actuales/240000_2024/000011_Tablero%20consumo%20per%20capita%20de%20carnes%202024.pdf`.
- Corte 2018/2019 contra AGRO_0244 (2018: 57,94 vs 56,5): marcarlo. Censo 2010 (tablero 2024) vs 2022 (indicadores 2025). Cerdo 2025 = 18,89 (Los Andes decía 19,89 por error).
- No entran: AGRO_0028 (aviar mensual, no coincide), CICCRA, BCR, CEPA.

## C. Fecundidad — entra con reparo
- Automática: Banco Mundial `SP.DYN.TFRT.IN` (estimación de la ONU, WPP), 1960-2024: 2014 2,386; 2019 1,882; 2022 1,482; 2023 1,500; 2024 1,504.
- Cuenta con DEIS (nacimientos por edad de la madre, datos.salud.gob.ar dataset `d1350588-d8bb-4892-b21c-48738311e218`: CSV 2005-2022, 2023 con `;`, 2024) y mujeres por edad del INDEC (proyecciones, solo PDF): 2014 2,37; 2019 1,86; 2022 1,44 (INDEC: «1,4»); 2023 1,34 (DEIS: 1,3); 2024 1,19 (UNFPA 1,2; provisorio).
- Desde 2020 la ONU queda muy arriba de la cuenta oficial (2024: 1,50 vs 1,19). El anuario DEIS no publica la TGF.

## D. Robos de motos — entra (SNIC)
- SNIC, Sistema de Alerta Temprana, delitos contra la propiedad: `https://cloud-snic.minseg.gob.ar/Bases/SAT/PROP/SAT-Propiedad-BU_2017-2024.csv` (51 MB; datos.gob.ar `delitos-contra-la-propiedad-sistema-de-alerta-temprana-estadisticas-criminales`). Filtro `nombre_delito_sat_prop == "Robo de motocicletas"`, suma de `cantidad_hechos`, mensual 2017-2024, 24 jurisdicciones.
- Anuales: 2017 33.312; 2018 33.235; 2019 34.968; 2020 26.637; 2021 25.414; 2022 29.331; 2023 39.224; 2024 44.236 (= Informe SAT 2024). Sin 2025 todavía. Hurto de motos aparte desde 2023.
- DNRPA no tiene robos de motos (comprobado en los CSV).

## E. Universidades — entra a mano con cita (SPU)
- Anuarios SPU (1999/2003, 2006, 2008, 2010) y Síntesis (2016-17, 2020-21, 2021-22), PDF. Estudiantes, nuevos inscriptos y egresados, total país (estatal + privada, pregrado + grado): 1996 949.821 / 268.494 / 42.525 (1995) … 2021 2.549.789 / 710.699 / 142.826. Huecos 2008-2010 y años entre síntesis; egresados del anuario 1999/2003 corridos un año.
- El CSV de DNIYES (2014-2023) no entra: −8 % en estudiantes en años sueltos, sin inscriptos, disciplinas inconsistentes.

## F. Tarifas al usuario y subsidios — no hay serie oficial
- **Mejor fuente: Observatorio de Tarifas y Subsidios del IIEP (UBA-CONICET)**, reporte mensual en PDF (n.° 1 ≈ mar-23; n.° 17 ago-24; n.° 33 dic-25; n.° 40 jul-26), solo AMBA. Índice: `economicas.uba.ar/iiep/informes-y-reportes/tarifas-y-subsidios/`. Ejemplos: `economicas.uba.ar/iiep/wp-content/uploads/2024/08/INFORME-TARIFAS-Y-SUBSIDIOS-AGOSTO-2024.pdf`, `.../uploads/INFORME-IIEP-JULIO-2026.pdf`.
  - Portada: factura de luz N1, de gas N1, de agua sin subsidio y canasta de servicios del AMBA (con impuestos). jul-26: 68.210 / 64.862 / 41.724 / 295.826; dic-25: 44.808 / 22.970 / 32.435 / 183.410; ago-24: 38.137 (300 kWh) / 34.973 / 24.486 / 144.433.
  - **Cobertura de costos (lo que paga el usuario vs. el Estado)**, jul-26: canasta 54 % usuario; luz residencial 63 % / 37 % Estado; gas 57 % / 43 % Estado. Con gráfico de evolución.
  - Reparos: consumo de referencia cambia (300 → 265 kWh), rótulo «sin subsidio» → «N1», gas muy estacional, quiebre ene-26 (SEF).
- Gas, tarifa: cuadros de ENARGAS por distribuidora (Metrogas, Naturgy BAN, Litoral Gas, Ecogas Centro); precio PIST dic-25 Metrogas N1 2,84 / N2 1,02 / N3 1,28 $/m³ (IIEP). Sin serie.
- Agua: AySA solo vía IIEP; Aguas Cordobesas (ERSeP) y Aguas Santafesinas (ENRESS): cuadros sueltos, sin serie.
- Córdoba y Santa Fe: sin serie de factura. Apoyo automático: IPC «Vivienda, agua, electricidad, gas…» por región (`146.3_IVIVIENNAL_DICI_M_52` nacional; Pampeana en la familia 146.x), Santa Fe IPEC `198.1_VIVIENDANDA_2014_0_8`, Córdoba `194.1_PROPIEDADEDAD_2014_0_42` (incluyen alquiler).
- **Subsidios, tipos:** Tarifa Social (2016), segmentación RASE N1/N2/N3 (Decretos 332/22 y 465/24), Subsidios Energéticos Focalizados SEF (Decreto 943/2025, desde ene-26: hasta 3 CBT, bloque de 300/150 kWh al 50 %, bonificación extra 2026), Zona Fría (Ley 27.637, ~1,6 M usuarios de gas), tarifa social de AySA.
- **Subsidios, cantidad:** solo fotos. RASE luz (Jefatura de Gabinete, informe de abr-25, vía IIEP): N1 6.918.821, N2 6.244.657, N3 3.211.792 (16.375.270). De prensa sin verificar: 15.690.128 (dic-23), 16.235.103 (jul-24); tarifa social 2016 2.849.918; 2018 4,1 M. SEF 2026 y por provincia: sin fuente pública (pedido de acceso a la información a Energía).
- Monto de subsidios energéticos: ya en el sitio (`452.2_ENERGIAGIA_0_T_7_79`).
