# Series de deuda pública y deuda consolidada Tesoro + Banco Central

Estado: implementada (2026-11-15), fases 1 y 2, publicada en 931167d (corrida completa en verde, run 43786667160); la fase 3 (tarifa eléctrica) se hizo en docs/specs/tarifas-y-datos-calientes-4.md (serie luz_cobertura)

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

## Cómo quedó (2026-11-15)
- `pipeline/deuda.py` (registrado en `catalogo.construir`): 7 series en «Fiscal › Deuda pública»: `deuda_ac_total`, `deuda_ac_me`, `deuda_ac_mn`, `deuda_fmi`, `deuda_letras_bcra` (letras «LETRA BCRA…» + adelantos transitorios), `deuda_pib` y `deuda_consolidada` (D-024). Respaldos `datos/cache/deuda_mensual.xlsx` y `deuda_trimestral.xlsx`. Controles que cortan: moneda local + extranjera = deuda en pago normal, pago normal ≥ 95 % de la bruta, FMI y letras ≤ 30 %, deuda/PIB entre 10 % y 300 %.
- La moneda nacional/extranjera es la de la deuda en pago normal (hoja A.3); por eso el dato a mano de Herencia (% de la deuda bruta) difiere 0,15 a 0,23 p.p.
- Consolidada: pasivos remunerados del último día hábil del mes al A3500 de ese día; una variable que deja de publicarse (último dato distinto de 0 con más de 10 días) deja el mes sin dato en vez de arrastrarse. El % del PIB sale de la escala «% del PIB» de la web.
- Herencia: link «Ver la evolución» (con la unidad si es otra) en deuda bruta, / PIB, moneda extranjera y FMI. `herencia_informes.construir_json(datos)` compara desde 2019 lo cargado a mano con las series (1 % en montos, 0,5 p.p.; FMI no, porque el informe está en DEG): solo avisa.
- Web: nombres y sinónimos (`nombres.ts`), «Deuda pública» en la info de Fiscal, principal del tema Cuentas públicas y dato fijo `deuda-publica-pib`, indicadores en `catalogo.ts`.

**Verificado (2026-11-15):** corrida completa sin error (585 series); cifras de control a jun-26 iguales (474.198; FMI 57.705,5; moneda extranjera 246.535,6; letras 30.306 en may-26); consolidada jun-26 = 474.198 − 33.069 + 143 = 441.273; salto de jul-25 explicado (fin de las Lefi en el Banco Central y suba del dólar de 1.194 a 1.352). Control de Herencia con tolerancia cero: 8 comparaciones, todas dentro de la tolerancia. `npm run tipos`, `previas` y `build` sin error; en el navegador: fichas, botón de información con la cuenta, Herencia con los 4 links, lupa con «deuda publica»; sin desborde a 375 px en 6 rutas, sin errores de consola. Revisor: sin bloqueantes; los menores (unidad del link, aviso del % del PIB propio, pasivos que se arrastraban) corregidos.
**Sin verificar:** aspecto en capturas (el panel del navegador estaba oculto: se midió); la imagen para compartir de las fichas nuevas.

## Dónde ver los cambios
Página con links y casillas: `docs/cambios/series-deuda.html`. Local `http://localhost:3100<ruta>` (vista `web-out`); publicado recién después del commit, el push y la corrida completa en verde (toca `pipeline/`: unos 10 minutos).
1. Menús › Lupa: «deuda publica», «deuda consolidada» — `/`
2. Ficha: `/dato/?v=deuda_ac_total`, `deuda_ac_me`, `deuda_ac_mn`, `deuda_fmi`, `deuda_pib`, `deuda_consolidada`, `deuda_letras_bcra`
3. Temas › Cuentas públicas: principal «Deuda pública bruta (% del PIB)» — `/tema/fiscal/`, `/dato/deuda-publica-pib/`
4. Presidentes › Herencia: links «Ver la evolución» en las filas de deuda — `/herencia/`
