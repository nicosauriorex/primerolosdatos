# Mantenimiento del pipeline

Estado: implementada (2026-11-14)

Sale de la auditoría del 2026-11-10 (`docs/AUDITORIA-2026-11-10.md`, M7) y del punto 6 de "Qué sigue" en `docs/ESTADO.md`. No cambia nada de lo que ve el público: mismas series, mismos ids, mismos valores. Cambia cómo se baja.

## Qué se encontró (relevado el 2026-11-14)

1. **Descargas sin respaldo al arrancar.** `obtener_datos.py` `main()` llama a `api_series()` (datos.gob.ar: salario promedio, mediano e IPC nacional) y a `precios_indec()` (Excel de precios promedio de INDEC) sin caché: si cualquiera de las dos falla, se cae toda la corrida. Además `api_series()` es redundante: de lo que baja solo se usa el IPC, que `salarios.py` ya baja con caché (`ipc_nac`); los dos salarios no se usan.
2. **La tabla `ipc_nacional` de la API de INDEC se pide 3 veces**: dos en `obtener_datos.precios_e_ipc_api_indec` (precios promedio y nivel general) y una completa en `catalogo.ipc_indec` (índices y precios promedio), que ya contiene lo de las otras dos.
3. **Bajadas repetidas del dólar.** `salarios.construir` baja el A3500 mensual (`fx_a3500`) y el blue de Bluelytics (`fx_blue`), pero `main()` pisa esas dos columnas con las de `macro.construir`, que baja otra vez el A3500 mensual (mismo archivo `fx_a3500`) y Bluelytics diario. Las de `salarios.py` no se usan para nada.
4. **Helpers repetidos.** Para bajar: `obtener_datos.get`, `salarios._get`, `capacidad._bajar`, `contexto._bajar` (sin User-Agent propio: el FMI lo rechaza), `precios_mundo._bajar` (User-Agent de navegador). Para el caché: `salarios._cacheado` (CSV), `catalogo._cache_df` (pickle), `contexto._cache_json` y `precios_mundo._cache_json` (iguales). Consultas a INDEC: `obtener_datos.indec_query` y `catalogo._indec` (la misma). `_guardar_meta` en 5 módulos (una línea, cambia el nombre del archivo). Los `_num` de `gasto_nacion`, `provincias_dnap` y `universidades` hacen cosas distintas: quedan como están.
5. **Ya resuelto, no se toca:**
   - UTDT: las 10 series (confianza del consumidor y en el gobierno, con sus subíndices) llegan a oct-2026 en el sitio publicado y los ids coinciden con los de la API (buscados el 2026-11-14). El corte en 2005 de la auditoría ya no existe.
   - `bcra_4` lo usa el parte diario (`diario.py`, depósitos minoristas).
   - `soja_chi` (CBOT, diario) y `ctx_soja` (Banco Mundial, mensual) se usan las dos (`plantillas.ts`, `contexto.ts`): quedan.

## Requisitos

**R1. Ninguna descarga sin respaldo.** Se borra `api_series()`. El IPC nacional de datos.gob.ar sale de la misma bajada con caché de `salarios.py` (`ipc_nac`). `precios_indec()` pasa por el caché (`cache_df("indec_precios_promedio_xls", …)`). Con la red cortada (R6) la corrida completa termina igual, con los respaldos.

**R2. La tabla `ipc_nacional` de INDEC se baja una vez por corrida.** Una sola función en `catalogo.py` (`tabla_ipc_indec(token)`, con memoria dentro de la corrida) que la baja completa con `cache_df("ipc_indec_completo", …)`, como hoy hace `ipc_indec`. `main()` saca de ese DataFrame los precios de los cortes de GBA y el IPC nivel general nacional, y `catalogo.ipc_indec` usa el mismo DataFrame. Se borran `indec_query`, `precios_e_ipc_api_indec` e `ipc_nacional_de_cache` de `obtener_datos.py` (la lógica de filtrar queda en una función que recibe el DataFrame).
   Se conserva el comportamiento de hoy según de dónde vino la tabla:
   - Bajada en esta corrida (hay token y la API respondió): la API manda (precios con `combine_first` sobre el Excel; IPC sobre el de datos.gob.ar), se imprime el control de diferencia contra el Excel por corte, y la fuente es "API INDEC (api.indec.gob.ar)".
   - Vino del respaldo (sin token o la API falló): solo se completa el IPC si coincide con datos.gob.ar en los meses comunes (diferencia < 0,5 %), igual que hoy; la fuente agrega "+ copia guardada de la API de INDEC". Los precios del respaldo no reemplazan al Excel (como hoy).
   Para saber de dónde vino, el módulo de red lleva la lista de respaldos usados (R4).

**R3. Cada fuente del dólar se baja una vez.** `salarios.construir` deja de bajar el A3500 mensual y Bluelytics y de armar `fx_oficial`/`fx_blue` (las arma `macro.py`, como ya pasa). Se borran `_blue`, `FX_A3500` y lo que quede sin uso en `salarios.py`. Además `cacheado` recuerda lo bajado en la corrida (R4), así que otra llamada con el mismo nombre no vuelve a bajar.

**R4. Un solo módulo de red y caché: `pipeline/red.py`.**
```python
CACHE                     # datos/cache/ (lo crea si falta)
UA = "primero-los-datos-script"
RESPALDOS: set[str]       # nombres que en esta corrida salieron del respaldo porque la bajada falló
DESCARGAS: int            # cantidad de pedidos HTTP de la corrida (para el resumen final)

def bajar(url, data=None, headers=None, timeout=90, ua=UA) -> bytes
    # ua=None: User-Agent por defecto de urllib (lo necesita el FMI). headers puede pisar el User-Agent.
    # Si la variable de entorno PIPELINE_SIN_RED=1, lanza un error sin conectarse (R6).
def cacheado(nombre, fn) -> pd.Series        # = salarios._cacheado (CSV); recuerda el resultado por nombre dentro de la corrida y devuelve una copia
def cache_df(nombre, fn) -> pd.DataFrame     # = catalogo._cache_df (pickle); vacío si falla y no hay respaldo
def cache_json(nombre, fn) -> dict | None    # = contexto/precios_mundo._cache_json
def guardar_meta(nombre, meta)               # escribe CACHE / f"{nombre}_meta.json" como hoy (indent=1, sort_keys)
```
   - Todos los módulos usan `red.bajar` y estas funciones; se borran las copias (`get`, `_get`, `_bajar` de capacidad, contexto y precios_mundo, `_cacheado`, `_cache_df`, `_cache_json`, `_guardar_meta`). Cada módulo conserva su User-Agent: contexto con `ua=None`, precios_mundo y los pedidos que hoy mandan "Mozilla/5.0" con `ua="Mozilla/5.0"`; los timeouts quedan como están en cada llamada.
   - Los nombres de archivo del caché no cambian (los respaldos versionados siguen sirviendo).
   - `catalogo._cacheado_dict`, `semaforo._leer_cache`/`_validada` y las bajadas por día de gasto, provincias y universidades quedan con su lógica, usando `red.CACHE`/`red.bajar`.
   - Al terminar `main()` se imprime un resumen: cantidad de descargas y la lista de `RESPALDOS` (o "ninguno").
   - Se actualiza `.claude/rules/pipeline.md`: "Toda descarga pasa por `red.cacheado` / `red.cache_df` / `red.cache_json`".

**R5. Sin cambios para el público.** Mismos archivos en `web/public/datos/`, mismas series, ids, textos (`fuente`, `desc`) y valores que la corrida de referencia, salvo datos nuevos que hayan salido entre las dos corridas (diarios del día). `--solo-json` funciona igual.

**R6. Prueba sin red.** Con `PIPELINE_SIN_RED=1` la corrida completa (`python pipeline/obtener_datos.py`) termina sin error usando los respaldos, y la lista de respaldos del resumen nombra cada fuente. Si alguna parte no tiene respaldo y corta la corrida, se arregla (o se anota si no se puede).

Límite conocido: la lista de respaldos del resumen solo nombra lo que pasa por `red.cacheado`/`cache_df`/`cache_json`. Gasto, provincias, universidades, capacidad, `catalogo._cacheado_dict` y el semáforo sin red usan su propio respaldo (con su propio aviso en el log) y no figuran en ella.

## Fuera de alcance
- Los `_num` distintos de cada módulo, `semaforo._validada`, la lógica de bajada por día de gasto/provincias/universidades.
- Renombrar ids engañosos (`ipc_<región>_s_bienes`): los links compartidos no pueden cambiar.
- El ajuste estacional del semáforo (otro bloque).

## Cómo se verifica
1. Corrida completa de referencia **antes** de tocar el código (hecha el 2026-11-14, salida copiada al scratchpad de la sesión).
2. Corrida completa después: termina sin error; el resumen muestra las descargas y "Respaldos: ninguno" (o los que fallaron de verdad, con el motivo en el log).
3. Comparar `web/public/datos/` y `datos/mensual.csv` contra la referencia con un script: mismos archivos, mismas series e ids, mismos `fuente`/`desc`/`u`/`cat`; valores iguales salvo los últimos puntos de series diarias. Explicar cada diferencia.
4. Contar en el código que `ipc_nacional`, Bluelytics y el A3500 mensual se piden una vez (y en el log, una línea por cada uno).
5. `PIPELINE_SIN_RED=1 python pipeline/obtener_datos.py` termina sin error (R6) y después volver a correr con red (para no dejar los respaldos viejos como salida).
6. `python pipeline/obtener_datos.py --solo-json`, `npm run build` y abrir el sitio local: portada, Histórico con inflación y salario, `/bcra/`, `/semaforo/` sin errores de consola.
7. `grep` de `urlopen` en `pipeline/`: solo en `red.py`.
