# Series de deuda pública y deuda consolidada Tesoro + Banco Central

Estado: spec lista (2026-11-15), sin implementar

Pedido del usuario (2026-11-15): «no tenemos series para ver la evolución de las variables esas que están en herencia? y deuda neta porque tampoco tenemos… arma una propia que sea la suma de los pasivos del bcra + los pasivos del tesoro» y después «en realidad era deuda consolidada no neta».

Hoy la deuda pública, la deuda con el FMI y la deuda en moneda extranjera solo están en Herencia, cargadas a mano un dato por traspaso. Esta spec las vuelve series del catálogo (ficha, Histórico, Por presidente, lupa) y agrega una cuenta propia: la deuda consolidada del Tesoro y el Banco Central.

## Fuentes (relevadas por `investigador-datos`, 2026-11-15)

| Serie | Fuente | Frecuencia y rango | Unidad |
|---|---|---|---|
| Deuda bruta de la Administración Central (total; fila 10 de la hoja A.1) | Secretaría de Finanzas, boletín mensual de deuda (Excel). Página: `argentina.gob.ar/economia/finanzas/datos-mensuales-de-la-deuda/datos`. El nombre del .xlsx cambia cada mes: el pipeline lee la página y toma el link | Mensual, ene-19 en adelante; los últimos 3 meses son preliminares («(*)») | millones de US$ |
| Deuda en moneda nacional y en moneda extranjera (hoja A.3, pago normal) | El mismo Excel | Mensual, desde ene-19 | millones de US$ |
| Deuda con el FMI (hoja A.1, fila «FMI») | El mismo Excel | Mensual, desde ene-19 | millones de US$ |
| Letras del Tesoro en manos del Banco Central (fila «LETRA BCRA») y adelantos transitorios (fila de adelantos) | El mismo Excel | Mensual, desde ene-19 | millones de US$ |
| Deuda bruta / PIB | Finanzas, planilla trimestral de deuda (hoja A.4.7) | Anual 2000-2025 y trimestral desde 2026 | % del PIB |
| Precio estacional y costo monómico de la electricidad | CAMMESA (Excel «Precio Medio Estacional» y «Precios Mensuales») | Mensual, desde 2019 / 2022 | $/MWh y US$/MWh |

Las filas se ubican por su rótulo, no por número (el Excel cambia de forma). Cifras de control a jun-26: total 474.198, FMI 57.706, moneda extranjera 246.536, letras del Banco Central 30.306 (may-26).

Sin serie oficial: reservas netas (ya está la estimación propia, D-021). Cepo, puts, BOPREAL y acuerdos con el FMI siguen siendo datos de informe (no son series).

## Qué se hace

### Fase 1: series de deuda (catálogo)
1. Pipeline nuevo `pipeline/deuda.py` (skill `nueva-serie`): baja el boletín mensual, guarda la copia en `datos/cache/`, y arma las series `deuda_ac_total`, `deuda_ac_me` (moneda extranjera), `deuda_ac_mn` (moneda nacional), `deuda_fmi`, `deuda_letras_bcra` (letras del Tesoro en el Banco Central más adelantos transitorios). Categoría pública: «Deuda» dentro de Fiscal. Los meses preliminares van marcados en la ficha.
2. `deuda_pib`: anual desde 2000 (y trimestral desde 2026) de la planilla trimestral.
3. Herencia: las filas «Deuda pública bruta», «/ PIB», «en moneda extranjera» y «Deuda con el FMI» pasan a llevar link «Ver la evolución» a su serie (las cifras de cada traspaso siguen saliendo del informe cargado a mano, que cubre desde 1989). Desde 2019 se controla que el dato a mano y la serie coincidan (control en `pipeline/herencia_informes.py`).
4. Lupa: las series entran solas (son del catálogo); sinónimos en `web/lib/nombres.ts`.

### Fase 2: deuda consolidada Tesoro + Banco Central (cuenta propia)
- **Definición:** deuda bruta de la Administración Central − letras del Tesoro y adelantos en manos del Banco Central + pasivos remunerados del Banco Central (pases, Leliq, Lefi, Lebac) pasados a dólares al tipo de cambio oficial de cada mes. Se resta lo que el Tesoro le debe al Banco Central porque, al consolidar, es una deuda de una parte del Estado con otra: si no, se contaría dos veces.
- Nombre público: «Deuda consolidada del Tesoro y el Banco Central». Mensual desde ene-19, millones de US$; también en % del PIB.
- **Límites que la ficha dice:** es una cuenta propia, no un dato oficial; es un techo, porque las Lecap y otros títulos en pesos que tiene el Banco Central no se publican aparte y no se restan; las Lefi pasaron al Tesoro en jul-25 (desde ahí están en la deuda del Tesoro y ya no en los pasivos del Banco Central: no se cuentan dos veces, pero la composición cambia).
- Registrar la definición en `docs/DECISIONES.md` (D-0xx).

### Fase 3 (opcional, después): tarifa eléctrica
Serie mensual «Parte del costo de la electricidad que pagan las tarifas» (precio estacional / costo monómico, pasado a la misma moneda con el dólar oficial). Hay que revisar antes los quiebres (servicios asociados desde nov-25) y que el monómico es de grandes usuarios.

## Lo que no cambia
- Las cifras de Herencia por traspaso (vienen de informes con cita, desde 1989).
- Ningún id ni parámetro de URL existente.

## Cómo se verifica
- `python pipeline/obtener_datos.py` completo sin error; las cifras de control de arriba coinciden.
- Ficha de cada serie nueva en `/dato/?v=deuda_ac_total~…`; Herencia con link «Ver la evolución»; lupa con «deuda publica» y «deuda consolidada».
- Consolidada a jun-26 cerca de 474.198 − ~33.000 + pasivos remunerados en dólares; la cuenta paso a paso se ve en la ficha.

## Dónde ver los cambios
(se completa al implementar)
