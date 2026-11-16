# Predicciones (bloque 9c)

Estado: implementada (2026-11-16), sin publicar. Para que guarde en el sitio faltan la base D1 y Turnstile (requisito 15)
Ideas: Novedades, calendario y predicciones (segunda parte)

Pedido del usuario (2026-11-16): «Sí, la spec» (de 9c). Decisiones que tomó al escribirla:
- Solo se predice la **inflación mensual** del INDEC; la base queda lista para sumar otros datos.
- La mediana de la gente se ve **después de predecir** (o con «Ver sin predecir», que no cuenta).
- **Sin ranking**: cada uno ve su propio acierto, guardado en su navegador; no hay cuentas ni alias.

## Objetivo
Que la gente diga cuánto cree que va a dar la inflación del mes antes de que la publique el INDEC, y después ver tres cifras juntas: lo que esperaba la gente (mediana), lo que esperaban los analistas (REM del Banco Central) y el dato real. Es contenido que vuelve todos los meses y se comparte. Usa la base D1 y las funciones de 9a (D-025), con Turnstile contra bots, sin datos personales. Si el servicio falla, la página muestra lo estático (REM, dato real e historia del REM) y avisa que lo de la gente no está disponible.

## Qué ve y hace el usuario
1. Entra a `/predicciones/` (menú, «Herramientas», después de Novedades) o desde el renglón del IPC en Novedades («Predecí») o desde la ficha de la inflación mensual.
2. **Ronda abierta**: «¿Cuánto va a dar la inflación de noviembre 2026?» · «El INDEC la publica el jueves 11 de diciembre a las 16:00. Podés cambiar tu predicción hasta entonces.»
   - Un campo numérico con un decimal, en %, con botones − y + de a 0,1 y la última inflación publicada como valor inicial de referencia («Octubre: 2,2 %»), no precargada en el campo.
   - Botón **Predecir**. Turnstile verifica en segundo plano (modo gestionado: casi siempre sin hacer nada; si pide un toque, aparece ahí mismo).
   - Debajo, en chico: «Ver sin predecir».
3. Después de predecir (o de «Ver sin predecir»):
   - **La gente**: mediana, cantidad de predicciones y el rango donde está la mitad del medio (percentiles 25 y 75), con un histograma de barras de a 0,1 p.p. Si hay menos de 10 predicciones: «Todavía son N: la mediana se muestra desde 10».
   - **Los analistas (REM)**: la mediana del REM para ese mes y la fecha del relevamiento.
   - **Tu predicción**: la tuya, con «Cambiar». Si entró por «Ver sin predecir», un botón «Predecir».
   - **Compartir**: link de la página y texto para copiar («La gente espera 2,1 % de inflación para noviembre; los analistas del REM, 2,0 %. ¿Vos? primerolosdatos.com.ar/predicciones/»). Se cuentan con `contarCompartir` (9a).
4. **Ronda cerrada esperando el dato** (desde la hora de publicación hasta que el pipeline lo trae, unos minutos): «Se cerró. El INDEC publica a las 16:00» con la mediana final.
5. **Resultado** (cuando el dato ya está): «Noviembre 2026: dio 2,3 %. La gente esperaba 2,1 % (0,2 p.p. menos); el REM, 2,0 % (0,3 p.p. menos). Vos dijiste 2,4 % (0,1 p.p. más).» Sin «ganó» ni «acertó»: diferencias con signo (D-012). Se ve arriba hasta que abre la ronda siguiente, que va al lado.
6. **Historia**: tabla con un renglón por ronda cerrada: mes, dato real, mediana de la gente (y cantidad), REM, tu predicción si la hiciste, y las diferencias. Arriba de la tabla, el error medio absoluto de la gente y del REM en las rondas que tienen las dos cifras. Antes de la primera ronda con gente, la tabla muestra solo REM contra dato real de los últimos 12 meses (historia del REM).

## Requisitos

### Rondas (pipeline, estático)
1. **`pipeline/predicciones.py`** arma `web/public/datos/predicciones.json` (fuera del hash, como `novedades.json`), en las dos corridas (con y sin red). Si falla, la corrida sigue sin el archivo.
2. Una **ronda** por mes de referencia de la inflación mensual (`ipc_empalme`, variación mensual: la misma cifra que la ficha `/dato/inflacion/`). Id: `ipc-AAAA-MM` (mes de referencia).
   - **Abre** cuando el pipeline registra el dato del mes anterior (fecha de esa publicación en `datos/novedades.json`, a la hora de la publicación del calendario; si no se conoce, a las 00:00 de ese día, hora argentina).
   - **Cierra** a la fecha y hora de publicación del IPC de ese mes en el calendario del INDEC (`datos/cache/calendario_indec.json`, el mismo informe que reconoce `calendario.py`). Si el calendario todavía no la trae, `cierra` va en `null` y la ronda queda abierta: el pipeline la cierra en la corrida en que aparece la fecha (siempre antes, porque el calendario cubre tres meses).
   - Hay como máximo **una ronda abierta**. Las rondas cerradas se guardan en el JSON aunque no tengan predicciones (para la historia del REM).
3. Cada ronda lleva `rem`: mediana del REM para ese mes de referencia, del último relevamiento publicado antes del cierre, con la cantidad de analistas y la fecha del relevamiento (ver «Fuente del REM»). Sin dato del REM, `rem: null` y la página lo dice («El REM no tiene ese mes»).
4. Cada ronda cerrada con dato publicado lleva `real` (la variación mensual que muestra la ficha, con un decimal como la publica el INDEC). Las diferencias se calculan en el navegador.
5. Un dato que el INDEC corrige después (revisión) no cambia `real` de rondas viejas: `real` es el primer valor publicado, que el pipeline guarda en el registro `datos/predicciones.json` (versionado, como `datos/novedades.json`; el workflow lo agrega al commit de datos).

### Base y funciones (servidor)
6. **Migración** `web/db/0002_predicciones.sql` (tabla en «Datos»).
7. **`POST /api/prediccion`** (`web/functions/api/prediccion.ts`): recibe `{ ronda, votante, valor, token, celular }`.
   - Mismas reglas que 9a: origen, 2 KB, sin IP, user agent ni cookies, 503 si no hay base (`_comun.ts`, se reutiliza).
   - `votante`: UUID v4 que genera el navegador **por ronda** (no une rondas entre sí).
   - `valor`: número entre **−5 y 30**, redondeado a un decimal en el servidor. Fuera de rango: 400 «Valor fuera de rango».
   - `ronda`: tiene que ser la ronda abierta según `predicciones.json`, que la función lee con `env.ASSETS.fetch("/datos/predicciones.json")` (la misma copia que ve el navegador). Si la hora actual pasó `cierra`: 409 «La ronda ya cerró». Ronda desconocida: 400.
   - `token`: se verifica contra `https://challenges.cloudflare.com/turnstile/v0/siteverify` con el secreto `TURNSTILE_SECRET` (variable secreta de Pages), **sin** mandar la IP (`remoteip` no se usa). Si falla: 403 «Verificación fallida». Si falta el secreto: 503.
   - Guarda con `INSERT … ON CONFLICT (ronda, votante) DO UPDATE SET valor = excluded.valor, cambiado = excluded.cambiado`: cambiar la predicción reemplaza la anterior. Responde 200 con el resumen del requisito 8 (así no hace falta otro pedido).
8. **`GET /api/predicciones?ronda=ipc-AAAA-MM`** (`web/functions/api/predicciones.ts`): devuelve `{ ronda, n, mediana, p25, p75, histograma: [[valor, cantidad]…] }` (mediana y percentiles con un decimal; con `n < 10`, solo `n`). Sin `ronda`: lista de las rondas con predicciones `[{ ronda, n, mediana }]` para la historia. `cache-control: public, max-age=60`. Sin Turnstile (solo lee). Origen libre (es público), pero mismo límite de método.
9. La mediana y los percentiles se calculan en SQL o en la función sobre todas las filas de la ronda; con miles de filas sigue siendo un solo pedido. El histograma agrupa por valor (ya viene redondeado a 0,1).
10. Las predicciones que llegan **después** de `cierra` no se guardan aunque el JSON publicado esté viejo: la función compara contra `cierra`, que es una hora fija; si `cierra` es `null`, la ronda acepta.

### Navegador
11. **`web/lib/predicciones.ts`**: tipos del JSON, estado de la ronda (abierta, esperando el dato, con resultado), diferencias, error medio absoluto, y lo guardado en el navegador:
    - `localStorage["pld:predicciones"]`: `{ [ronda]: { votante, valor, visto } }` (`visto`: entró por «Ver sin predecir»). Lectura y escritura con `try/catch`, como `misPlantillas.ts`: sin almacenamiento se puede predecir igual, pero no se recuerda (y la página lo dice en una línea).
    - `TURNSTILE_SITEKEY`: clave pública. En `localhost` usa la clave de prueba de Cloudflare que siempre pasa (`1x00000000000000000000AA`; el secreto de prueba `1x0000000000000000000000000000000AA` va en `web/.dev.vars`, que se versiona solo con esa clave de prueba).
12. **Página** `/predicciones/` (`web/app/predicciones/page.tsx` + `web/components/secciones/Predicciones.tsx`): lo descripto en «Qué ve y hace el usuario».
    - El script de Turnstile (`https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`) se carga **solo** al tocar Predecir o al enfocar el campo, no al abrir la página.
    - Números con `web/lib/formato.ts`, nombres con `web/lib/nombres.ts`, fechas «jueves 11 de diciembre».
    - El campo acepta coma o punto; rechaza en el navegador lo mismo que el servidor, con el mensaje al lado del campo.
    - Estados de error: sin conexión o 503 («Las predicciones no están disponibles ahora; el REM y la historia sí»), 409 (pasa al estado «Se cerró»), 403 («No pudimos verificar que no seas un robot. Probá de nuevo»).
    - En la vista `web-out` (puerto 3100) no hay funciones: la página muestra la parte estática y el aviso de no disponible, sin errores en la consola (no pide `/api/` fuera de los mismos hosts que `conteo.ts`).
13. **Entradas**: en `SECCIONES` (`web/lib/secciones.ts`, «herramientas», después de Novedades) con nombre «Predicciones»; la encuentra la lupa. En `/novedades/`, el renglón del calendario del IPC lleva «Predecí» si la ronda está abierta. En la ficha de la inflación mensual, una línea con link mientras la ronda está abierta. Ningún parámetro de URL nuevo.
14. Reglas de `.claude/rules/frontend.md`: nada se sale a 360 px, chips compactos, acciones alineadas, verde/rojo solo con signo y sin veredicto en las palabras.

### Publicación
15. Pasos manuales, una sola vez (los hace el usuario):
    - Crear la base D1 si todavía no existe (requisito 8 de `contar-compartir.md`).
    - En el panel de Cloudflare → Turnstile: crear un widget «primerolosdatos» para `primerolosdatos.com.ar` y `duelo-de-datos.pages.dev`, modo **Gestionado**. Copiar la clave del sitio a `TURNSTILE_SITEKEY` en `web/lib/predicciones.ts` y guardar el secreto con `npx wrangler pages secret put TURNSTILE_SECRET --project-name=duelo-de-datos`.

    Queda escrito en el encabezado de `web/wrangler.toml` y en `docs/ESTADO.md` (Herramientas). Sin la base o sin el secreto, la página publica igual y dice que no está disponible.
16. El paso de migraciones del workflow ya aplica `0002` (idempotente); no cambia el workflow salvo agregar `datos/predicciones.json` al `git add` del commit de datos.
17. `npm run conteos` suma una sección «Predicciones»: por ronda, cantidad, mediana y cuántas se cambiaron.

## Datos

`web/db/0002_predicciones.sql`:
```sql
CREATE TABLE IF NOT EXISTS predicciones (
  ronda    TEXT NOT NULL,     -- ipc-2026-11
  votante  TEXT NOT NULL,     -- UUID del navegador, uno por ronda
  valor    REAL NOT NULL,     -- % con un decimal, entre -5 y 30
  creado   TEXT NOT NULL,     -- UTC redondeado a la hora
  cambiado TEXT,              -- UTC redondeado a la hora, si se cambió
  celular  INTEGER NOT NULL,
  PRIMARY KEY (ronda, votante)
);
```
Una fila pesa unos 100 bytes; el plan gratis alcanza con margen.

`datos/predicciones.json` (registro versionado): `{"reales": {"ipc-2026-10": 2.2}}`, el primer valor publicado de cada mes.

`web/public/datos/predicciones.json`:
```json
{
  "generado": "2026-11-16T17:20",
  "rondas": [
    {"id": "ipc-2026-11", "serie": "ipc_empalme", "periodo": "2026-11", "abre": "2026-11-13T16:00-03:00", "cierra": "2026-12-11T16:00-03:00",
     "rem": {"mediana": 1.7, "n": 45, "relevamiento": "2026-10-30"}, "real": null},
    {"id": "ipc-2026-10", "serie": "ipc_empalme", "periodo": "2026-10", "abre": "…", "cierra": "2026-11-13T16:00-03:00",
     "rem": {"mediana": 1.8, "n": 45, "relevamiento": "2026-10-30"}, "real": 2.2}
  ]
}
```
Las rondas cerradas viejas, sin fecha en el calendario guardado, llevan un `cierra` aproximado (día 15 del mes siguiente, 16:00): solo sirve para que no se lean como abiertas.

`rondas`: la abierta primero y después las cerradas, de la más nueva a la más vieja, hasta 24 meses (las anteriores a la primera ronda con gente sirven para la historia del REM).

## Fuente del REM
Investigado el 2026-11-16 (agente `investigador-datos`, archivos bajados y abiertos). Ninguna API sirve: la del BCRA solo tiene la variable 29 (12 meses) y las series del REM de datos.gob.ar se cortaron en 2025.

- **Archivo:** histórico del REM, URL fija, ~1,6 MB, toda la historia en formato largo: `https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/informes/relevamiento-expectativas-mercado-historico.xlsx`. Se baja con `pipeline/red.py` y se guardan **solo las filas del IPC mensual** en `datos/cache/rem_ipc_mensual.csv` (fecha de pronóstico, período, mediana, n: unos KB, no el Excel de 1,6 MB, porque `datos/cache/` se versiona); si falla la bajada, se usa esa copia («uso cache» en el log). Solo en la corrida con red; `--solo-json` lee la copia.
- **Hoja** `Base de Datos Completa`, encabezado en la fila 2 y datos desde la 3. Columnas: A = fecha de pronóstico (último día del relevamiento), B = variable, C = referencia, D = período (primer día del mes), E = mediana, …, N = cantidad de participantes. Ubicar las columnas **por el texto del encabezado**, no por letra, y fallar con un mensaje claro si no están (los archivos ya cambiaron de forma otras veces).
- **Filas:** variable `Precios minoristas (IPC nivel general; INDEC)` y referencia `var. % mensual`. Desde el relevamiento del 2016-06-30.
- **Qué relevamiento usar en cada ronda:** el último con fecha de pronóstico + 7 días anterior a `cierra`. El informe sale entre el 4 y el 5 del mes siguiente al relevamiento; el IPC, alrededor del 12. Por ejemplo, para nov-26 sirve el relevamiento de fines de noviembre, publicado a principios de diciembre. En `rem` se guardan `mediana`, `n` y `relevamiento` (la fecha de pronóstico). La página dice «Relevamiento del 30 de octubre (45 analistas)».
- **Ejemplo** (relevamiento del 2026-10-30, publicado el 2026-11-05): oct-26 1,8; nov-26 1,7; dic-26 1,84 (se muestra con un decimal: 1,8).
- **Control** (como en `herencia_informes.py`): que la ronda abierta tenga REM y que la mediana esté entre −5 y 30. Si no pasa, `rem: null` y una línea en el log.
- El mismo archivo trae dólar, desocupación y PIB para cuando se sumen otros datos (fuera de alcance).

## Casos borde
- **Varias pestañas o dos predicciones seguidas:** el mismo `votante` de la ronda: la segunda reemplaza a la primera.
- **Alguien borra el almacenamiento y vuelve a votar:** cuenta dos veces. Turnstile hace caro automatizarlo y la mediana no se mueve con unos pocos valores. Se acepta; si se ve abuso en `npm run conteos`, se agrega la regla gratis de límite de pedidos de Cloudflare sobre `/api/prediccion`.
- **Valores en el borde (−5, 30):** se aceptan; la mediana no se mueve por ellos.
- **El INDEC reprograma la publicación:** manda la última bajada del calendario; si la adelanta, el cierre se adelanta en la corrida siguiente (puede quedar un rato abierta con el dato ya publicado: el pipeline corre 16:10 y 17:15, así que como mucho unos minutos después de una publicación sin aviso; se acepta).
- **Publicación a las 16:00 y el dato entra a las 16:10:** entre las dos, estado «Se cerró, esperando el dato».
- **El REM no tiene el mes** (por ejemplo, el mes en curso no está en el relevamiento): `rem: null`.
- **Sin funciones (web-out, base sin crear, caída):** la página muestra REM, dato real e historia del REM; la mediana de la gente y el formulario dicen que no están disponibles. La historia de la gente de rondas cerradas también depende de la función.
- **Primer mes:** la historia muestra solo REM contra el dato real.
- **D-012:** se muestran diferencias, no quién ganó.

## Fuera de alcance
- Otros datos (dólar, desocupación, actividad): la tabla y las rondas ya tienen `serie`, se suman en otra spec.
- Ranking, alias, cuentas o avisos cuando sale el dato.
- Imagen para compartir y vista previa propia en redes de `/predicciones/` (otra tanda, con `PanelCompartir`).
- Guardar la mediana de la gente en el JSON estático (todo sale de la función).

## Cómo se verifica
1. `python pipeline/obtener_datos.py --solo-json` escribe `web/public/datos/predicciones.json` con la ronda abierta (nov-26, `cierra` en la fecha del calendario) y las cerradas con REM y dato real; los valores del REM coinciden con el Excel del informe.
2. `cd web && npm run tipos && npm run tipos:funciones && npm run build`, sin errores.
3. Local con funciones (vista `web-funciones`, `npm run funciones`, puerto 8788, con la clave de prueba de Turnstile): predecir, ver la mediana (con 10 votantes cargados por `curl` con tokens de prueba), cambiar la predicción (la fila se reemplaza), «Ver sin predecir».
4. `curl` contra 8788: valor 31 → 400; ronda cerrada (editar a mano `cierra` en el JSON local) → 409; token inválido con la clave de prueba que siempre falla (`2x0000000000000000000000000000000AA`) → 403; origen ajeno → 403; `GET /api/predicciones` sin `ronda` devuelve la lista; ninguna respuesta pone cookies; la tabla no tiene IP ni user agent.
5. En `web-out` (3100): la parte estática se ve y la consola no muestra errores de red.
6. A 375 y 1280 px: sin desborde; el campo y los botones se pueden usar con el teclado; el estado «Resultado» se ve cambiando `real` en el JSON local.
7. Después del push: corrida en verde con la migración `0002`; con la base y el secreto creados, una predicción real en `https://primerolosdatos.com.ar/predicciones/` y `npm run conteos -- --dias 1` la muestra.

## Cómo se verificó (2026-11-16)
- `python pipeline/predicciones.py --bajar` (REM: 844 filas del IPC mensual) y `python pipeline/obtener_datos.py --solo-json`: 25 rondas; abierta `ipc-2026-11` (abre 2026-11-12 16:00, cierra 2026-12-15 16:00 según el calendario del INDEC, REM 1,7 con 45 analistas); oct-26 con real 2,2 y REM 1,8. Marzo 2025 (REM 2,6, dato 3,7) coincide con lo conocido.
- `npm run tipos`, `npm run tipos:funciones` y `npm run build` sin errores; `/predicciones/` entra al sitemap.
- Local con funciones (8788, migración `0002` aplicada, clave de prueba de Turnstile), con `curl`: 200 con resumen, mediana desde 10 (12 cargadas: 2,3; p25 2,1; p75 2,4), cambio que reemplaza la fila, 400 con valor 31, 409 con ronda cerrada o vencida, 403 con origen ajeno, 405 con DELETE, GET lista con `public, max-age=60` y sin cookies.
- Navegador (medido; una captura a 375 px): predecir desde el formulario muestra mediana, histograma con tu barra, REM, tu predicción y Compartir; sin desborde a 375 px; línea en `/dato/inflacion-mensual/` y «Predecí» en `/novedades/`; con `cierra` vencido, «se cerró» con la mediana final; en `web-out` (3100) el aviso de no disponible, sin pedidos a `/api/` ni errores de consola.
- Sin verificar: Turnstile con token fallido (403) y con la clave real, el sitio publicado (falta la base y el widget), un celular real.
- Revisor: primera pasada marcó el sitemap, el pie de la tabla («entre paréntesis»), tu barra invisible en el histograma, el 409 que recargaba y la fecha de hoy en hora local; corregido. Segunda pasada sin problemas.

## Dónde ver los cambios
Página: `docs/cambios/predicciones.html`. Local con la vista `web-funciones` (`http://localhost:8788<ruta>`; en la 3100 se ve sin la parte de la gente); publicado (`https://primerolosdatos.com.ar<ruta>`) después del commit, el push y la corrida en verde, y la parte de la gente recién con la base D1 y Turnstile.
1. **Menús**: 1.1 «Predicciones» en Herramientas y en la lupa (`/predicciones/`). Pediste: «Sí, la spec».
2. **Ficha del dato**: 2.1 línea «Predecí la inflación de…» (`/dato/inflacion-mensual/`). Agregado por mí.
3. **Predicciones** (`/predicciones/`): 3.1 ronda abierta con fecha del INDEC; 3.2 mediana e histograma después de predecir; 3.3 «Ver sin predecir»; 3.4 REM; 3.5 tu predicción y Compartir; 3.6 resultado sin veredicto; 3.7 historia del REM con error medio; 3.8 Turnstile sin datos personales.
4. **Novedades y calendario**: 4.1 «Predecí» en el renglón de la inflación (`/novedades/`). Agregado por mí.
