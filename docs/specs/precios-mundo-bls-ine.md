# EE.UU. (BLS) y Chile (INE) en precios contra el mundo

Estado: implementada (2026-11-15), en local sin commit.

Origen: pedido del 2026-11-15: «sumá EE.UU. (BLS) y Chile (INE) a precios contra el mundo». Idea de `docs/IDEAS.md` ("EE.UU. y Chile cortados por rubro…").

## Problema
La OCDE dejó de publicar las divisiones del IPC de EE.UU. (desde ene-25) y de Chile (desde ene-24); solo siguen el total y alimentos. En `/contexto/` esos dos países quedan con el estimado congelado en dic-24 y dic-23 en casi todos los rubros.

## Qué se hace
Solo pipeline (`pipeline/precios_mundo.py`). Igual que con la zona euro: la serie de la OCDE sigue hasta su último mes y desde ahí se encadena la variación de la fuente nacional (empalme en el último mes en común). El total y alimentos siguen saliendo de la OCDE. No cambia ningún id ni parámetro de URL.

### EE.UU.: BLS
- API pública v1 sin clave: `POST https://api.bls.gov/publicAPI/v1/timeseries/data/` con `{"seriesid": [...], "startyear", "endyear"}` (hasta 25 series y 10 años por pedido; 25 pedidos por día: se hace uno solo). IPC-U, promedio de ciudades, sin desestacionalizar (`CUUR0000…`). Oct-2025 no existe (cierre del gobierno): queda sin dato.
- La clasificación del BLS no es COICOP. Cada división se arma con grupos del BLS y los **pesos relativos de dic-2024** del propio BLS (tabla "Relative importance… December 2024", IPC-U), como índice de Laspeyres con base en el mes del empalme:

| División | Grupos del BLS (peso dic-24) | Control 2024 (OCDE / BLS, r mensual) |
|---|---|---|
| 02 Bebidas alcohólicas y tabaco | SAF116 alcohólicas (0,835) + SEGA tabaco (0,482) | 4,0 / 3,3 %, r 0,87 |
| 03 Ropa y calzado | SAA | 1,3 / 1,2 %, r 0,99 |
| 04 Vivienda, agua, electricidad y gas | SEHA alquiler (7,499) + SEHC alquiler equivalente (26,282) + SAH2 combustibles y servicios (4,312) | 4,5 / 4,5 %, r 1,00 |
| 05 Equipamiento del hogar | SAH3 | 0,7 / 0,7 %, r 0,95 |
| 06 Salud | SAM salud (8,273) − SEME seguro médico (0,793) | 2,7 / 2,6 %, r 0,88 |
| 07 Transporte | SAT (16,571) − SETE seguro del auto (2,796) | 0,4 / −0,4 %, r 0,85 |
| 08 Comunicación | SAE2 | −1,3 / −1,8 %, r 0,66 |
| 09 Recreación y cultura | SAR | 0,4 / 1,1 %, r 0,94 |
| 10 Educación | SAE1 | 3,8 / 4,0 %, r 0,98 |
| 11 Restaurantes y hoteles | SEFV comidas fuera del hogar | 3,5 / 3,6 %, r 0,96 |
| 12 Bienes y servicios varios | SAG (2,925) − SEGA (0,482) + SETE (2,796) + SEME (0,793) | 6,5 / 6,9 %, r 0,93 |

  Los seguros van a "varios" como en COICOP. Con el alojamiento sumado a restaurantes el ajuste empeoraba (r 0,35): la serie de la OCDE no lo incluye.

### Chile: INE
- Planilla con URL fija, sin clave, que se pisa cada mes: `https://www.ine.gob.cl/docs/default-source/%C3%ADndice-de-precios-al-consumidor/cuadros-estadisticos/base-anual-2023_100/series-de-tiempo/ipc-xls.xlsx` (IPC base 2023 = 100, COICOP 2018, nacional, desde ene-24). Encabezados en la fila 4: `Año, Mes, División, Grupo, Clase, Subclase, Producto, Glosa, Ponderación, Índice`; una fila por división = `División` con dato y `Grupo` vacío. Se lee con `openpyxl` (`read_only`, `reset_dimensions()`).
- La planilla no trae el índice de dic-2023, pero sí la `Variación Mensual (%)` de ene-24 de cada división: dic-23 = índice de ene-24 / (1 + variación / 100). Con ese mes en común se empalma como los demás. (La variación viene con un decimal: error máximo de 0,05 puntos en el empalme.) Control: el empalme por el promedio de 2023 (la base es "promedio 2023 = 100") tiene que dar parecido.
- Divisiones 01 a 07, 10 y 11: mismo contenido en las dos clasificaciones. 12 (varios) = 12 Seguros y servicios financieros + 13 Bienes y servicios diversos del INE, ponderadas con sus pesos (las dos tienen la misma base, así que el promedio ponderado es el agregado). 08 y 09 cambian de contenido (los equipos informáticos pasan de recreación a comunicación) y quedan en dic-23, como en la zona euro.

### Textos
- `fuente` del JSON suma "BLS (EE.UU.); INE (Chile)".
- Campo nuevo `notas_estimado` (país → de dónde sale su inflación por rubro) para USA y CHL; se muestra en el desplegable "Cómo se mide" de `/contexto/`, debajo de la fuente (`PreciosMundo.tsx`; tipo opcional en `lib/preciosMundo.ts`). No va en `notas_pais`, que se muestra en la tabla de valores medidos y habla de lo medido.
- Control de cordura (corregido tras el revisor): si un grupo del BLS o una división del INE salta más de 30 % en un mes, la descarga falla y `cache_json` sigue con la copia anterior; si el empalme de una división saltaría más de 30 %, esa división queda solo con la OCDE y se imprime un AVISO. Ninguno de los dos corta la corrida diaria.
- Las fechas de `notas_estimado` se calculan con el último mes de la OCDE de las divisiones empalmadas. Chile se combina con los índices tal cual (ya están en la base de los pesos, promedio 2023 = 100).
- `pipeline/ver_cache.py` suma `--clave` para mirar una serie dentro de un JSON anidado de la caché (lo necesité para comparar con la OCDE).

## Cómo se verifica
- `python pipeline/precios_mundo.py` no tiene `main`: correr el módulo con red desde un script que llame a `construir_json()` y mirar el resumen: EE.UU. con 02–12 hasta oct-26 (sin oct-25) y Chile con 01–07, 10, 11 y 12 hasta oct-26.
- Controles: la variación de dic-24 → ene-25 en EE.UU. y de dic-23 → ene-24 en Chile no tiene saltos raros (comparar con el mismo mes de otros años); un salto por el empalme de Chile se vería en ene-24.
- `python pipeline/obtener_datos.py --solo-json`, `npm run build` y `/contexto/?pqc=USA`, `/contexto/?pqc=CHL` en la vista local: los rubros llegan a sep/oct-26.

## Verificado (2026-11-15)
- Módulo con red: EE.UU. 02 a 12 hasta oct-26 (sin oct-25, que el BLS no publicó; Transporte y Bienes varios también sin nov-25, falta el seguro del auto); Chile 01 a 07, 10, 11 y 12 hasta oct-26; 08 y 09 de Chile en dic-23.
- Mes del empalme sin saltos raros: EE.UU. dic-24 → ene-25 dentro de lo de otros eneros (ropa 0,9 %, contra 1,9 y 1,2); Chile dic-23 → ene-24 igual (vivienda +10,4 % en 2024 es el descongelamiento de las tarifas eléctricas).
- Control: un salto falso de +104 % en ropa de Chile deja esa división hasta dic-23 con un AVISO, sin cortar.
- `--solo-json`, `npm run tipos` y `npm run build` sin errores. En la vista local: ropa contra EE.UU. "estimado oct-26"; salud contra Chile "estimado oct-26"; promedio de Milei contra EE.UU. "dic-23 a oct-26"; las dos notas en "Cómo se mide"; a 375 px sin desborde; consola sin errores.
- Revisor en dos pasadas: la primera marcó que el control podía cortar toda la corrida diaria (corregido) y tres menores (corregidos); la segunda, sin bloqueantes.
- Sin verificar: el aspecto en captura (el panel del navegador estaba oculto), tema claro, celular real, la corrida en GitHub.

## Dónde ver los cambios
Página: `docs/cambios/precios-mundo-bls-ine.html`. Local con la vista `web-out` (`http://localhost:3100<ruta>`); en el sitio (`https://primerolosdatos.com.ar<ruta>`) recién después del commit, el push y la corrida completa (toca `pipeline/`: unos 10 minutos).
1. El mundo
   1.1 EE.UU. a oct-26 en todos los rubros: `/contexto/?pqr=03&pqc=USA#precios-mundo`
   1.2 Por rubro contra EE.UU.: `/contexto/?pqr=07&pqc=USA#precios-mundo`
   1.3 Chile a oct-26 en diez rubros: `/contexto/?pqr=06&pqc=CHL#precios-mundo`
   1.4 Por país sin mes viejo para Chile y EE.UU.: `/contexto/?pqr=03&pqc=CHL#precios-mundo`
   1.5 "Cómo se mide" con BLS, INE y las dos notas: `/contexto/#precios-mundo`
   1.6 Promedio de Milei contra EE.UU. con todo el mandato: `/contexto/?pqr=04&pqc=USA&pqa=p-milei#precios-mundo`

## Segunda vuelta: Milei faltaba en carne contra EE.UU. (2026-11-15)
Pedido: «si filtro carne contra estados unidos no aparece milei». Causa: los productos de alimentos (carne, pan, leche, frutas, verduras) no tenían inflación mes a mes para EE.UU. (la OCDE nunca los publicó), así que solo estaban las mediciones del Banco Mundial (2017 y 2021) y el mandato de Milei no tenía dato. La página lo salteaba sin decir nada.
- **EE.UU., productos desde el BLS** (`BLS_PROD`): la serie sale entera del BLS desde ene-17, con los pesos de dic-2024: carne = carnes SAF11211 (0,919) + aves SEFF (0,288) (el Banco Mundial mide carne sin pescado); pan = SAF111; leche = lácteos SEFJ (0,741) + huevos SEFH (0,172); frutas = SEFK; verduras = SEFL. `_bls_ipc` baja desde 2017 en tramos de 10 años (límite de la API v1). Como ahora EE.UU. tiene inflación propia de esos rubros, "el mundo" ya no se mueve con el IPC general de EE.UU. en los productos: cambian los valores de carne, pan, leche, frutas y verduras contra el mundo.
- **Regla general: un presidente que falta se dice.** `presidentesSinDato` y `fraseSinPresidentes` (`lib/preciosMundo.ts`): debajo de "Por presidente" y en la imagen al compartir, "Sin Milei: no hay datos de carne en México para ese mandato." (sigue pasando con los productos de México, Colombia y Chile, que no publican esa apertura sin clave o con historia).
- Control: carne contra EE.UU. en el mandato de Alberto da −46 % estimado con el BLS contra −47 % medido por el Banco Mundial en 2021.
- Verificado: módulo con red (los 5 productos de EE.UU. de ene-17 a oct-26), tipos, build; en la vista local carne contra EE.UU. muestra a Milei (−38 % promedio, −32 % al cierre), carne contra el mundo también; carne contra México con el aviso; sin el aviso de "IPC general"; 375 px sin desborde; consola limpia. Revisor: sin bloqueantes; corregidos el aviso que no viajaba en la imagen, un comentario fuera de lugar y la causa del aviso (ahora genérica). Sin verificar: la imagen dibujada (leído en el código: el aviso va en la frase).
- Dónde verlo: 1.7 carne contra EE.UU. por presidente `/contexto/?pqr=carne&pqc=USA&pqv=pres#precios-mundo`; 1.8 aviso con México `/contexto/?pqr=carne&pqc=MEX&pqv=pres#precios-mundo`; 1.9 productos contra el mundo `/contexto/?pqr=carne&pqc=mundo&pqv=pres#precios-mundo`.
