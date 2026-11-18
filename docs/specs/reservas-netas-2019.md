# Reservas netas y deuda neta desde 2019

Estado: implementada (2026-11-18), publicada en 43e806e (corrida completa en verde, run 44354866744)

Pedido del usuario (2026-11-18): «Sí, deuda 2019» (la idea de `docs/IDEAS.md`, «Datos calientes, preguntas y pedidos (2026-11-17)»: bajar a 2019 la parte del Banco Central y la deuda neta citando swaps y seguro de depósitos).
Fuentes: informes de país del FMI bajados por el usuario el 2026-11-18 (texto leído página por página con pypdf; «PDF pág.» es la página del PDF, no la impresa).

## Por qué hace falta
La estimación propia de reservas netas (D-021) y todo lo que usa sus supuestos arrancan en abr-24, porque los swaps y el seguro de depósitos solo tenían cita desde ahí. Por eso:
- `bcra_pasivos_netos` empieza en abr-24 y `deuda_neta` en jun-24, aunque la deuda por acreedor ya está desde mar-19;
- en Herencia, la estimación propia solo se ve en la columna «Hoy» de Milei: no hay qué recibió ni qué entregó nadie.

## Supuestos nuevos (con cita, `datos/manual/reservas_netas_supuestos.json`)
Cada tramo vale desde su fecha hasta el siguiente. Montos en millones de US$.

| Desde | Swaps (China y BIS) | Cita |
|---|---|---|
| 2019-01 | 22.100 | CR 22/92, PDF pág. 15: Swap lines 22.1 (fin de 2019; se usa para todo 2019) |
| 2020-12 | 22.900 | CR 22/92, PDF pág. 15: 22.9 (fin de 2020) |
| 2021-12 | 23.400 | CR 22/322, PDF pág. 12: 23.4 (fin de 2021) |
| 2022-03 | 23.600 | CR 22/322, PDF pág. 12: 23.6 (fin de marzo y 23-09-2022) |
| 2022-12 | 21.900 | CR 23/312, PDF pág. 12: 21.9 (PBOC 18.8, BIS 3.0) |
| 2023-06 | 21.000 | CR 23/312, PDF pág. 12: 21.0 (PBOC 18.0, BIS 3.0) |
| 2023-08 | 20.900 | CR 23/312, PDF pág. 12: 20.9 (15-08-2023; se usa hasta mar-24) |
| 2024-04 | 18.300 | ya cargado (CR 24/167) |

Seguro de depósitos: 1.800 desde 2019-01 (CR 22/322, PDF pág. 12: Other 1.8, «Includes deposit insurance fund», fin de 2021; CR 23/312, PDF pág. 12: Sedesa 1.8 en 2022 y 2023). Para 2019 y 2020 el FMI no lo separa de los encajes (CR 22/92, pág. 15): se usa el mismo valor, y la ficha lo dice.

El crédito del FMI no se resta antes de abr-25: la definición del acuerdo de 2022 (pasivos de menos de un año) no lo incluye, igual que la cuenta actual.

## Controles nuevos (contra el FMI, misma definición)
| Fecha | FMI | Cuenta propia | Diferencia | Cita |
|---|---|---|---|---|
| 2019-12-30 | 12.400 | 12.039 | −361 | CR 22/92, PDF pág. 15 |
| 2020-12-30 | 3.800 | 3.804 | +4 | CR 22/92, PDF pág. 15 |
| 2021-12-30 | 2.300 | 2.380 | +80 | CR 22/322, PDF pág. 12 |
| 2022-12-30 | 8.800 | 8.834 | +34 | CR 23/312, PDF pág. 12 |
| 2023-06-30 | −5.200 | −5.152 | +48 | CR 23/312, PDF pág. 12 |
| 2023-08-15 | −10.300 | −9.360 | +940 | CR 23/312, PDF pág. 12 |
| 2023-12-29 | −9.200 | −8.723 | +477 | CR 24/37, PDF pág. 65 |

Quedan afuera a propósito:
- el 2,0 al 23-09-2022 (CR 22/322): está «a tipos de programa» y da −2.575 contra la cuenta a precios del día;
- el 21,2 de mar-19 (CR 19/99) y los del acuerdo de 2018 (CR 19/232): esa definición también restaba los desembolsos del FMI y los encajes de otra forma, así que no se comparan con esta cuenta.

## Qué se hace
1. `datos/manual/reservas_netas_supuestos.json`: `inicio` pasa a 2019-01-01, más los tramos y controles de arriba (hecho al escribir la spec, para medir los controles).
   - Se agrega `traspasos`: `{"2019-12": "2019-12-10", "2023-12": "2023-12-10"}`, que son el mes del traspaso (la misma clave que usan los datos de informes en Herencia) y la fecha de asunción.
2. `pipeline/reservas_netas.py`:
   - escribe `traspasos` en `reservas_netas.json`: por cada traspaso, la cuenta completa (`_cuenta`) del último día hábil anterior a la asunción;
   - `fuentes` nombra todos los informes usados;
   - la lista `supuestos` se ordena por concepto y fecha. Como pasa a tener 9 tramos de swaps, la ventana muestra los tramos de cada concepto juntos.
3. `pipeline/deuda.py`: los textos «desde abr-24» y «desde jun-24» salen de los datos (el primer mes de cada serie), no fijos. La ficha de `deuda_neta` y de `bcra_pasivos_netos` dice que en 2019 y 2020 el seguro de depósitos es un supuesto (el FMI no lo separa).
4. `web/lib/herencia-informes.ts`:
   - `ReservasNetas` suma `traspasos?: Record<string, ComponentesRN>`;
   - `filaRNPropia(rn, PRES, k, cual)` arma recibió (`traspasos[p.ini]`) y entregó (`traspasos[sig.ini]`, o el último dato si es el presidente en funciones), con el cambio (`cambioInforme`). Si no hay ninguno de los dos, no hay fila;
   - `sinDato`: «la estimación empieza en 2019».
   - En la ventana de la estimación (`Herencia.tsx`), los valores de traspaso se muestran con su fecha.
   - Ningún id ni parámetro de URL cambia.
5. `web/lib/info.ts`: «trimestral, desde jun-24» pasa a «trimestral, desde mar-19».
6. `docs/specs/deuda-neta.md` (límites y pendiente) y `docs/DECISIONES.md` (D-021, una línea con los supuestos de 2019-2024).

## Cómo se verifica
- `python pipeline/reservas_netas.py`: los 7 controles nuevos dentro de ±1.000 (el corte de aviso sigue en 3.000), y los de 2024-2025 sin cambios.
- `python pipeline/obtener_datos.py --solo-json` sin errores; en `web/public/datos/reservas_netas.json`, `mensual` empieza en 2019-01 y hay `traspasos` 2019-12 y 2023-12.
- `bcra_pasivos_netos` desde ene-19 y `deuda_neta` desde mar-19: con la corrida completa (con `--solo-json` se reusan los valores compilados). Localmente: `deuda.pasivos_netos_bcra()` da 94 meses desde 2019-01.
- `npm run tipos`, `npm run lint`, `npm run build`.
- En `/herencia/` (vista `web-out`): Macri entrega, Alberto recibe y entrega, y Milei recibe y tiene «hoy», en las dos definiciones (FMI y Banco Central); la ventana muestra los supuestos agrupados.

## Cómo se verificó (2026-11-18)
- `python pipeline/reservas_netas.py`: los 7 controles nuevos dan entre −361 y +940 y los de 2024-2025 no cambian. Traspasos: 11.434 al 9/12/2019 y −10.929 al 7/12/2023.
- `deuda.pasivos_netos_bcra()`: 94 meses desde 2019-01, y el control de ago-26 pasa.
- `--solo-json`, `ruff`, `npm run tipos`, `npm run lint` y `npm run build`: sin errores.
- `/herencia/` en el navegador (leído, sin captura):
  - Macri: «sin dato» y entregó 11.434;
  - Alberto: 11.434 → −10.929 (−22.363);
  - Milei: −10.929 → hoy;
  - la ventana de un traspaso muestra la cuenta de ese día;
  - 375 px sin desborde y sin errores en la consola.
- Revisor: sin errores. Marcó cuatro líneas de `deuda-neta.md` que seguían con el inicio viejo (arregladas). Notó que la ventana de un traspaso de 2019 o 2023, con la definición del Banco Central, lista los controles de 2025: se deja así, porque son las únicas fechas en que publicó el Banco Central.
- Después del push: corrida completa en verde (run 44354866744); `reservas_netas.json` publicado arranca en 2019-01 con los traspasos 2019-12 y 2023-12, y el catálogo publicado dice «desde ene-19» (`bcra_pasivos_netos`) y «desde mar-19» (`deuda_neta`). El aspecto de `/herencia/` en el sitio no se miró en captura.

## Dónde ver los cambios
Página: `docs/cambios/reservas-netas-2019.html`. Local: `http://localhost:3100<ruta>`, con la vista `web-out`. Publicado: `https://primerolosdatos.com.ar<ruta>`, después del push y de la corrida completa.
1. Presidentes › Herencia
   - 1.1 Milei recibe −10.929 (`/herencia/?p=mm`).
   - 1.2 Alberto: 11.434 → −10.929 (`/herencia/?p=af`).
   - 1.3 Macri entrega 11.434 (`/herencia/?p=macri`).
   - 1.4 La ventana de cada traspaso muestra la cuenta de ese día.
   - 1.5 Controles y supuestos nuevos en la ventana.
2. Ficha del dato
   - 2.1 Pasivos del Banco Central menos reservas, desde ene-19 (`/dato/?v=bcra_pasivos_netos`).
   - 2.2 Deuda neta, desde mar-19 (`/dato/?v=deuda_neta`).
3. Cambiar dato › Fiscal
   - 3.1 «Sobre Fiscal» dice que la deuda neta va desde mar-19 (`/historico/?v=deuda_neta`).
