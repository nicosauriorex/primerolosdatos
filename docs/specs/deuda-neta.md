# Deuda neta del Tesoro y el Banco Central

Estado: implementada (2026-11-17), publicada en 8f88945 (corrida completa en verde, run 44221691175)

Pedido del usuario (2026-11-17): trajo un texto con otra forma de medir la deuda consolidada («ah ya se, es porque algunos usan otra metodologia»): Tesoro USD 260.638 millones (deuda bruta menos la que tiene el propio sector público) y Banco Central USD 18.869 millones (pasivos monetarios menos reservas netas). Después: «Subí y buscá fuente» y «Sí, armá la spec».
Fuentes: `docs/investigaciones/deuda-neta-2026-11-17.md`.

## Por qué hace falta
Hoy el sitio tiene la deuda bruta del Tesoro y la «deuda consolidada» propia (D-024). La consolidada es un techo: solo resta lo que el Tesoro le debe al Banco Central en letras y adelantos, y no lo que tienen el FGS, el Banco Nación ni las Lecap del Banco Central, porque no se publica por separado. La deuda neta mide lo que el Estado (Tesoro + Banco Central) le debe a terceros. Es la medida que usan consultoras como Facimex.

## Definiciones
**Tesoro con terceros** (trimestral, desde 2019) = deuda bruta − deuda en manos de agencias del sector público (BCRA, FGS, Banco Nación y otros organismos nacionales; Finanzas solo publica el total) = privados + organismos internacionales y bilaterales.

**Banco Central, pasivos netos de reservas** (mensual, desde abr-24) = pasivos monetarios en dólares − (reservas brutas − swaps con China y el BIS − seguro de depósitos).
- Pasivos monetarios: API del BCRA, variable 1247 (base monetaria + depósitos y otros pasivos monetarios en moneda extranjera), el último día hábil del mes, al A3500 de ese día.
- No se restan los encajes en dólares: ya están dentro de los pasivos monetarios (variable 1254) y se contarían dos veces. Por eso esta resta no usa la estimación de reservas netas del sitio tal cual: usa sus mismas piezas (reservas brutas, variable 1; swaps y seguro de depósitos de `datos/manual/reservas_netas_supuestos.json`, D-021) sin los encajes. El crédito del FMI no se resta: es deuda del Tesoro y ya está en la parte del Tesoro.
- Control con el texto del usuario: al 31/08/2026, 68.006.428 millones de $ / 1.509,47 = 45.053 − (48.259 − 20.000 − 2.000) ≈ 18.800 (el texto dice 18.869). La diferencia de ~70 se acepta (fecha o dólar distinto); si da más de 1.000, se revisa.

**Deuda neta del Tesoro y el Banco Central** (trimestral, desde jun-24) = Tesoro con terceros + Banco Central, pasivos netos de reservas, al cierre de cada trimestre.

Límites que la ficha dice: es una cuenta propia; no resta los depósitos del Tesoro (Facimex sí los resta) ni suma los BOPREAL y repos del Banco Central; la parte del Banco Central depende de supuestos fijos (swaps 20.000, seguro de depósitos 2.000); arranca en jun-24 porque los supuestos de reservas tienen cita desde abr-24.

## Qué se hace

### Fase 1: deuda del Tesoro por acreedor (a mano, trimestral)
1. `datos/manual/deuda_por_acreedor.json`: una entrada por fecha de cierre de trimestre (y cada cierre de año que traiga la presentación), desde 2019 hasta 2T26: `fecha`, `total`, `agencias`, `organismos`, `privados` (millones de US$), `cita` (documento, URL del PDF y página). Se cargan desde las presentaciones gráficas trimestrales de Finanzas (índice en `argentina.gob.ar/economia/finanzas/datos-trimestrales-de-la-deuda`), mirando cada PDF (el texto sale desordenado): no se infieren filas.
2. `pipeline/deuda.py` lee ese archivo con controles que cortan: cita completa; `agencias + organismos + privados = total` (±1); el `total` coincide con la deuda bruta del boletín mensual del mismo mes (±0,5 %); ninguna parte negativa.
3. Series nuevas en «Fiscal › Deuda pública» (tipo `usd`, millones de US$, dato en el último mes del trimestre, `agg`):
   - `deuda_ac_sector_publico` «Deuda del Tesoro en manos del propio Estado» (BCRA, FGS, Banco Nación y otros).
   - `deuda_ac_organismos` «Deuda del Tesoro con organismos internacionales» (FMI, Banco Mundial, BID y bilaterales).
   - `deuda_ac_privados` «Deuda del Tesoro con privados».
   - `deuda_ac_terceros` «Deuda del Tesoro con privados y organismos» (la suma de las dos anteriores).

### Fase 2: Banco Central y deuda neta
4. `pipeline/deuda.py`: baja la variable 1247 con `red.cacheado` (respaldo en `datos/cache/`), toma el último día hábil de cada mes y la pasa a dólares con el A3500 de ese día (el mismo de `pasivos_fin_de_mes`). Reservas brutas (variable 1, ya cacheada) y swaps y seguro de depósitos de `reservas_netas_supuestos.json`, leídos con las funciones de `reservas_netas.py` (no se copia la lógica).
5. Series nuevas (mismo lugar, tipo `usd`, `agg`):
   - `bcra_pasivos_netos` «Pasivos del Banco Central menos reservas» (mensual, desde abr-24). La `desc` muestra la cuenta del último mes.
   - `deuda_neta` «Deuda neta del Tesoro y el Banco Central» (trimestral, desde jun-24). La `desc` muestra la cuenta del último trimestre y los límites.
6. Control que corta: en ago-26, `bcra_pasivos_netos` entre 17.800 y 19.900 (la cifra del texto ±1.000).

### Fase 3: web
7. Nombres y sinónimos en `web/lib/nombres.ts` («deuda neta», «deuda con privados», «deuda intra sector público», «deuda con el FMI y organismos»); las series entran solas a la lupa, la ficha y el Histórico.
8. La info de «Deuda pública» (`web/lib/info.ts`) explica las tres medidas en una línea cada una: bruta (todo lo que debe el Tesoro), consolidada (techo: resta lo que le debe al Banco Central y suma lo que el Banco Central debe en pesos con interés), neta (lo que el Tesoro y el Banco Central le deben a terceros).
9. Plantilla «Deuda bruta, consolidada y neta» en un solo eje (`web/lib/plantillas.ts`) y otra «¿A quién le debe el Tesoro?» con sector público, organismos y privados.
10. Registrar la definición en `docs/DECISIONES.md` (D-031).

## Lo que no cambia
- `deuda_consolidada` y su definición (D-024); las otras series de deuda; ningún id ni parámetro de URL.
- La estimación de reservas netas de Herencia (D-021).

## Fuera de esta spec
- Separar BCRA, FGS y Banco Nación (Finanzas no lo publica; el FGS bloquea la descarga automática).
- Llevar la parte del Banco Central antes de abr-24: hace falta citar swaps y seguro de depósitos de 2019 a 2024 en `reservas_netas_supuestos.json`. Si se hace, la deuda neta arranca en 2019.
- Restar los depósitos del Tesoro.
- Deuda neta al blue, MEP o CCL.

## Cómo se verifica
- Control de la carga a mano: las cifras de 30/06/2026 (474.198 = 197.213 + 99.247 + 177.738) y 31/12/2025 (455.077 = 200.249 + 99.360 + 155.468) mirando el PDF; el control de suma y el de la deuda bruta del boletín pasan en todas las fechas.
- `python pipeline/obtener_datos.py` completo sin error; control de ago-26 de la parte del Banco Central.
- Cuenta a mano de la deuda neta en jun-26 = 99.247 + 177.738 + parte del Banco Central de jun-26.
- `cd web && npm run tipos`, `npm run lint`, `npm run build`; en el navegador: fichas de las series nuevas (`/dato/?v=deuda_neta`, `deuda_ac_terceros`, `bcra_pasivos_netos`), las dos plantillas, la lupa con «deuda neta», 375 px sin desborde, sin errores de consola.

## Cómo se verificó (2026-11-17)
- Carga a mano: 30 fechas (mar-19 a jun-26), cada una leída mirando el cuadro «Deuda bruta de la Administración Central por acreedor» de la presentación de su trimestre (página renderizada como imagen). Las partes suman el total ±1 y los 30 totales coinciden con el boletín mensual (diferencia < 0,001 %). Control de la spec: jun-26 y dic-25 coinciden.
  - 1T23: en la investigación estaban invertidos agencias y multilaterales (no privados): el PDF dice agencias 184.608 y multilaterales 81.302.
  - dic-21: el cuadro dice 72.755 en multilaterales, pero sus propias variaciones (4T21, 1T22, 2T22 y 3T22) dan 72.775 y con eso suma el total: se cargó 72.775 con nota.
  - 31-12-2018 no se carga: el boletín mensual arranca en ene-19 y no hay con qué controlar el total.
- `python pipeline/obtener_datos.py` completo sin error (703 series, ningún respaldo). Banco Central ago-26 = 18.794 (texto del usuario: 18.869). Deuda neta jun-26 = 99.247 + 177.738 + 20.305 = 297.290 (cuenta a mano igual a la serie).
- `npm run tipos`, `npm run lint`, `npm run build` sin error. En el navegador (leyendo el contenido, sin mirar capturas): fichas de las seis series, las dos plantillas, la lupa con «deuda neta» (serie, pasivos del Banco Central y plantilla), 375 px sin desborde, sin errores de consola.
- Revisor: sin problemas graves; corregidos los menores (textos que el cuadro no dice, nombre de una consultora, un sinónimo repetido, aviso si no se puede hacer el control de ago-26).

## Dónde ver los cambios
Local con la vista `web-out` (`http://localhost:3100<ruta>`); publicado en `https://primerolosdatos.com.ar<ruta>` recién después del commit, el push y la corrida completa en verde (toca el pipeline: unos 10 minutos). Página con links: `docs/cambios/deuda-neta.html`.
1. Portada: 1.1 la lupa encuentra «deuda neta», «deuda con privados», «deuda intra sector público» y «deuda con el FMI y organismos» (`/`).
2. Histórico y gráficos listos: 2.1 «Deuda bruta, consolidada y neta» (`/plantillas/?q=deuda+neta`); 2.2 «¿A quién le debe el Tesoro?» (`/plantillas/?q=a+quien+le+debe`); 2.3 las tres medidas explicadas en Cambiar dato → Fiscal → «Sobre Fiscal» (`/historico/?v=deuda_neta`).
3. Ficha: 3.1 `/dato/?v=deuda_neta`; 3.2 `/dato/?v=deuda_ac_terceros`; 3.3 `/dato/?v=bcra_pasivos_netos`; 3.4 `/dato/?v=deuda_ac_sector_publico`; 3.5 `/dato/?v=deuda_ac_organismos`; 3.6 `/dato/?v=deuda_ac_privados`.
