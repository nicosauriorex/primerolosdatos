# Novedades y calendario (bloque 9b)

Estado: en curso
Ideas: Novedades, calendario y predicciones (primera parte)

## Objetivo
Que quien entra vea qué datos oficiales salieron en los últimos días (con la cifra, el cambio y el contexto, listos para compartir) y cuándo sale el próximo. Todo estático: lo arma el pipeline, sin backend.

## Qué ve y hace el usuario
1. En la portada, un bloque corto: «Lo último que salió» (las 3 publicaciones más recientes) y «Lo próximo» (las 3 próximas fechas), con link a `/novedades/`.
2. En `/novedades/` (menú, grupo «Herramientas», primera de la lista):
   - **Lo último que salió**: publicaciones de los últimos 45 días, agrupadas por día (el más reciente arriba). Cada publicación es un renglón: nombre público del dato principal y período («Inflación mensual · octubre 2026»), la cifra, el cambio contra el período anterior y la frase de contexto de la ficha cuando la hay («la más baja desde…»). Si la publicación trae más series (regiones, rubros), «y N datos más» se despliega con sus nombres, cada uno con link. Cada renglón tiene «Ver» (la ficha del dato) y «Compartir».
   - **Lo próximo**: los próximos 45 días, por fecha. Fechas del calendario del INDEC (con hora, «16:00») y, para otras fuentes, «alrededor del día N» marcado como estimado. Cada renglón: nombre público del dato, período que se publica y link a su ficha.
   - Al pie: de dónde sale cada cosa (calendario oficial del INDEC, link; las estimadas, según los días en que entraron los datos antes) y «N informes del INDEC de esas fechas no tienen datos en este sitio».

## Requisitos
1. **Registro de novedades** (`pipeline/novedades.py`): en cada corrida completa (con red), por cada serie mensual, trimestral o anual del catálogo, compara el último período con dato contra el último registrado en `datos/novedades.json`; si es posterior, agrega una entrada `{fecha, id, periodo}` (fecha de la corrida en hora argentina, `AAAA-MM-DD`). Con `--solo-json` no agrega entradas (sí escribe el JSON de la web desde el registro).
2. Quedan afuera del registro: las series armadas desde datos diarios (las que tienen `min`/`max`, dólares, tasas, reservas: ya están en el parte del Banco Central) y cualquier período igual o posterior al mes en curso. Un cambio de valor sin período nuevo (revisión) no es novedad.
3. **Primera vez**: si `datos/novedades.json` no existe, se crea con el último período de cada serie como punto de partida, marcado `"inicial": true`, que no se muestra. `python pipeline/novedades.py --reconstruir` arma el registro recorriendo la historia de git de `datos/cache/compilado.json` (desde el 2026-11-08): la fecha de cada entrada es la del commit en hora argentina. Se corre una vez a mano y el resultado se versiona.
4. `datos/novedades.json` se versiona: el workflow lo agrega al commit de datos (`git add` junto a `datos/cache`).
5. **Publicaciones**: las entradas con la misma fecha, período y `cat[0]` forman una publicación (sin la fuente en la clave: el IPC nacional, el regional y los precios promedio tienen fuentes escritas distintas y son una sola publicación). La fuente de la publicación es la de su dato principal, sin el sufijo «, serie NN.N_XXX» de datos.gob.ar. Su dato principal es el primero de la lista `PRINCIPALES` (los ids de los datos fijos de `web/lib/datos-fijos.ts`, en ese orden) que esté en la publicación; si no hay, el primero en el orden del catálogo.
6. **Calendario del INDEC** (`pipeline/calendario.py`): baja `https://www.indec.gob.ar/Calendario/FiltrosCalendario/mes/<Mes>-<AAAA>/es` (mes en español sin tilde, inicial mayúscula; headers `User-Agent: Mozilla/5.0` y `X-Requested-With: XMLHttpRequest`, por `pipeline/red.py`) para el mes en curso y los dos siguientes; lee día (`div.nro-dia`), informe (`div.text-calendario`) y hora. Guarda el resultado en `datos/cache/calendario_indec.json`; si falla la bajada, usa esa copia (y lo dice en el log con «uso cache»).
7. Cada informe del INDEC se asocia a series del catálogo con una tabla de expresiones regulares en `calendario.py` (`INFORMES = [(regex, [ids])]`): IPC, canastas, EMAE, EPH (desocupación), pobreza, salarios, IPI manufacturero, ISAC, comercio exterior (ICA), UCII, supermercados y los que tengan series en el catálogo. El período que se publica sale del texto («Junio de 2026» → `2026-06`, «Segundo trimestre de 2026» → el último mes del trimestre). Los informes sin series asociadas no se muestran: solo se cuentan.
8. **Fechas estimadas**: para cada grupo (`cat[0]` + `fuente`) que no sea del INDEC y tenga al menos dos publicaciones de períodos mensuales consecutivos en meses distintos, la próxima fecha estimada es el día mediano del mes en que entraron, en el mes siguiente a la última publicación (si ese día ya pasó y no entró, no se muestra). Se marca `"estimado": true`. Mientras falten publicaciones registradas, el grupo no aparece.
9. **JSON de la web** (`web/public/datos/novedades.json`, fuera del hash, como `semaforo.json`): formato de «Datos». Si algo falla, la corrida sigue sin el archivo y la página y el bloque de la portada lo dicen sin romperse.
10. **Página** `/novedades/` (`web/app/novedades/page.tsx` + `web/components/secciones/Novedades.tsx`, cálculos en `web/lib/novedades.ts`): lo descripto en «Qué ve y hace el usuario». La cifra, el cambio y la frase de contexto salen de las funciones de la ficha (`cabeceraFicha` / `contextoDato`), con la variable del dato fijo si el principal lo es y la medida por defecto si no: la misma cifra que muestra la ficha. Nombres de `web/lib/nombres.ts`, números con `web/lib/formato.ts`, fechas «lunes 17 de noviembre».
11. «Ver» lleva a la ficha (la página fija `/dato/<slug>/` si tiene, igual que `fuentes-organismos.ts`). «Compartir» abre el panel de compartir de ese dato: en la misma página si `PanelCompartir` lo permite sin duplicar lógica; si no, la ficha con el panel abierto (parámetro nuevo de URL `compartir=1`, que no cambia el significado de ningún otro).
12. **Portada**: bloque «Novedades» con las 3 publicaciones más recientes (nombre, período, cifra) y las 3 próximas fechas, y link «Ver todas las novedades y el calendario». Va después de las placas de cifras. Si no hay `novedades.json`, el bloque no aparece.
13. La sección entra en `SECCIONES` (`web/lib/secciones.ts`, grupo «herramientas», primera) con nombre «Novedades y calendario» y la encuentra la lupa.
14. Reglas de `.claude/rules/frontend.md`: nada se sale a 360 px, acciones alineadas en la misma columna, chips compactos, sin veredicto en las palabras, verde/rojo con signo.

## Datos
`datos/novedades.json` (versionado):
```json
{"entradas": [{"fecha": "2026-11-13", "id": "ipc_empalme", "periodo": "2026-10"}, {"fecha": "2026-11-08", "id": "x", "periodo": "2026-09", "inicial": true}]}
```
`datos/cache/calendario_indec.json`: `[{"fecha": "2026-11-18", "hora": "16:00", "informe": "texto del INDEC"}]`.

`web/public/datos/novedades.json`:
```json
{
  "generado": "2026-11-16T17:20",
  "publicaciones": [
    {"fecha": "2026-11-13", "periodo": "2026-10", "fuente": "INDEC", "principal": "ipc_empalme", "series": ["ipc_empalme", "..."]}
  ],
  "calendario": [
    {"fecha": "2026-11-18", "hora": "16:00", "informe": "Índice de precios al consumidor (IPC)…", "periodo": "2026-10", "principal": "ipc_empalme", "series": ["..."], "estimado": false},
    {"fecha": "2026-12-03", "hora": null, "informe": null, "periodo": "2026-11", "principal": "x", "series": ["x"], "estimado": true}
  ],
  "indec_sin_datos": 7
}
```
`publicaciones`: últimos 45 días, la más reciente primero. `calendario`: desde hoy hasta 45 días, por fecha.

## Casos borde
- Una serie que entra con dos períodos nuevos de golpe: una entrada por el último período (el anterior no se anuncia).
- Una serie anual o trimestral: el período es el último mes del año o del trimestre; el nombre dice «2025» o «III trimestre 2026» como en el resto del sitio.
- Un informe del INDEC reprogramado: manda la última bajada.
- La publicación del día ya entró y el calendario de hoy sigue diciendo «16:00»: los renglones del calendario cuyo período ya figura en Lo último que salió no se muestran.
- Sin `novedades.json`, o vacío: la página dice «Todavía no hay novedades registradas» y la portada no muestra el bloque.
- Una serie que deja de existir en el catálogo: sus entradas se ignoran al armar el JSON de la web.

## Fuera de alcance
- Predicciones (bloque 9c), avisos por correo o notificaciones.
- Calendarios del Banco Central y de otros ministerios (no hay uno legible de datos; el del BCRA es de informes).
- Imagen para compartir de la página de novedades en sí y vista previa propia en redes.

## Cómo se verifica
- `python pipeline/novedades.py --reconstruir` termina y deja entradas con fechas entre el 2026-11-08 y hoy; `python pipeline/calendario.py --bajar` deja `datos/cache/calendario_indec.json` con fechas de los próximos meses.
- `python pipeline/obtener_datos.py --solo-json` escribe `web/public/datos/novedades.json` con el formato de arriba.
- `cd web && npm run tipos && npm run build`; vista `web-out`: `/novedades/` y la portada a 1280 y 375 px; la cifra de una publicación coincide con la de su ficha; «Ver» y «Compartir» llevan a donde dicen; sin errores de consola ni desborde horizontal.
- El workflow agrega `datos/novedades.json` al commit de datos (leer el YAML; se confirma en la corrida después del push).

## Dónde ver los cambios
Local con la vista `web-out` (`http://localhost:3100<ruta>`); publicado (`https://primerolosdatos.com.ar<ruta>`) recién después del commit, el push y la corrida en verde. Página con casillas: `docs/cambios/novedades-calendario.html`.
1. **Portada** (`/`): 1.1 bloque «Novedades» debajo del carrusel (3 últimas publicaciones y 3 próximas fechas).
2. **Menús** (`/`): 2.1 «Novedades y calendario», primera de Herramientas; la encuentra la lupa.
3. **Novedades y calendario** (`/novedades/`): 3.1 Lo último que salió con cifra, cambio y contexto; 3.2 una publicación por renglón con «y N datos más»; 3.3 Ver y Compartir; 3.4 Lo próximo con el calendario del INDEC; 3.5 estimadas (todavía ninguna); 3.6 pie con las fuentes; 3.7 mensaje sin archivo.
4. **Ficha** (`/dato/inflacion-mensual/`): 4.1 sin cambios a la vista (Compartir reusado).

## Verificación (2026-11-16)
- `novedades.py --reconstruir` (46 commits desde el 2026-11-08), `calendario.py --bajar` (89 informes del INDEC, nov-26 a ene-27) y `--solo-json`: 14 publicaciones y 20 fechas; `npm run tipos` y `npm run build` sin errores.
- Navegador (`web-out`, medido, panel oculto): `/novedades/` con datos reales; la inflación de octubre (2,2 %, +0,3 p.p.) coincide con la ficha; Compartir abre su ventana; sin desborde a 375 px y sin errores de consola.
- Sin ver: el bloque de la portada (con el panel oculto no dispara el IntersectionObserver), el aspecto en capturas y las fechas estimadas (faltan dos meses de registro).
- Revisor: primera pasada con 404 sin mensaje, `desdeCfg`, `useMemo` y control de `PRINCIPALES` (corregidos); segunda pasada sin problemas.
