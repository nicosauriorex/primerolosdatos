# Mantenimiento automático de los datos cargados a mano

Estado: implementada (2026-11-20); publicada en b9fc924

Pedido del usuario (2026-11-20): «El mantenimiento del mes no deberíamos tenerlo como tarea programada? o algún agente haiku ponele que investigue diariamente si llegó algún dato nuevo de los que subimos a mano. […] podría hacerlo él y sino delegarle la tarea a otro.» y «esto debería tener en cuenta las nuevas cosas manuales que agreguemos». Decisiones: corre **en la nube** (no depende de la PC prendida; el usuario abre la red del entorno) y **publica solo** (commit y push a `main` si los controles pasan, y avisa).

## Objetivo
Una rutina diaria en la nube de Claude revisa, con Haiku, si salió un dato nuevo de los que se cargan a mano en `datos/manual/`. Si salió y se puede cargar solo, un subagente Sonnet lo carga con su cita, corre los controles y lo publica. Si no se puede, avisa con qué falta y dónde está. Lo que se agregue a mano en el futuro entra solo, porque la rutina lee una agenda que un control obliga a mantener.

## Qué ve y hace el usuario
1. No hace nada. Todos los días a las 18:00 (21:00 UTC) corre la rutina.
2. Si hubo novedades, le llega una notificación al celular («Cargué IIEP n.° 44 (nov-26) y publiqué» o «Salió la 3ª revisión del FMI: necesito que la mires»), y queda un renglón en `docs/MANTENIMIENTO-REGISTRO.md`.
3. Si no hubo nada, no hay notificación ni commit.
4. Los días en que se carga algo, el sitio se actualiza con la corrida completa que dispara el push (~15 min).

## Requisitos

### Agenda
1. `datos/manual/agenda.json`: una entrada por cada dato con mantenimiento (un archivo puede tener varias entradas, p. ej. `herencia.json`). Campos: `id`, `archivos` (lista), `que`, `frecuencia` (mensual, trimestral, semestral, anual, eventual), `cuando_sale` (texto), `ultimo` (período cargado, texto como lo usa el archivo), `mirar_desde` (AAAA-MM-DD: desde cuándo vale la pena revisar), `donde_mirar` (URLs y búsquedas), `como_reconocer`, `como_cargar` (campos, formato de la cita, trampas), `validar` (comando que lo controla), `solo_json` (true si `--solo-json` lo toma; false si necesita la corrida completa), `modo` (`auto` | `avisar`), `riesgo`. Además una lista `cerrados`: `{archivo, motivo}` para lo que no se actualiza más.
2. Contenido inicial: las 32 entradas y los cerrados del inventario del 2026-11-20 (incluye `vetos.csv`). Las fechas no confirmadas se marcan en `cuando_sale` con «(sin confirmar)».
3. `pipeline/agenda.py`:
   - `--validar`: corta (exit 1) si un archivo de `datos/manual/` no aparece en ninguna entrada ni en `cerrados`, si una entrada nombra un archivo que no existe, si falta un campo, si `modo` o `frecuencia` no son de la lista, si `mirar_desde` no es una fecha o si se repite un `id`.
   - `--pendientes [--hoy AAAA-MM-DD]`: imprime en JSON las entradas con `mirar_desde <= hoy`, ordenadas por fecha.
   - `--cargado <id> --ultimo <período> --mirar-desde <AAAA-MM-DD>`: actualiza esa entrada (lo usa el agente después de cargar).
4. El control obliga a mantener la agenda: `python pipeline/agenda.py --validar` corre en el paso «Revisar código» del workflow (corta la corrida antes de bajar datos) y en el hook `.claude/hooks/lint.mjs` al editar cualquier archivo de `datos/manual/`.
5. `CLAUDE.md` (sección de datos a mano) y el skill `nueva-serie` dicen: al agregar un dato a mano, sumar su entrada a `datos/manual/agenda.json` (o a `cerrados`).

### Rutina en la nube
6. Rutina de Claude Code en la nube, diaria a las 21:00 UTC, entorno con red abierta, repo `nicosauriorex/primerolosdatos`, modelo **Haiku 5.5**, sin conectores. El prompt de la rutina es corto y remite a `docs/MANTENIMIENTO-AGENTE.md` (las instrucciones viven en el repo, versionadas; cambiar el comportamiento no exige tocar la rutina).
7. `docs/MANTENIMIENTO-AGENTE.md`, instrucciones para la rutina:
   1. Preparar: Python 3.14 con `uv` (`pip install uv && uv python install 3.14`, venv, `pip install -r requirements.txt`). Si no se puede, seguir con lo que no necesita el pipeline y decirlo en el aviso.
   2. `python pipeline/agenda.py --validar` y `--pendientes`.
   3. Para cada pendiente (Haiku, barato): mirar `donde_mirar` y decidir si salió un período posterior a `ultimo`. Si no salió, nada (no se escribe ni se commitea).
   4. Si salió y `modo = auto`: lanzar un subagente **Sonnet** con la entrada de la agenda, el documento encontrado y las reglas del punto 8. Cargar, correr `validar` y `python pipeline/obtener_datos.py --solo-json`; actualizar la agenda con `--cargado`.
   5. Si salió y `modo = avisar`, o si el subagente no pudo (control que falla, cifra dudosa, documento ilegible): no tocar los datos; anotar en el registro qué salió, dónde y qué falta.
   6. Publicar: un commit por corrida «Datos a mano: <lista corta>» con los datos, la agenda y el registro; en una rama `claude/datos-a-mano-AAAA-MM-DD-HHMM` (desde la nube no se puede escribir en `main` ni borrar ramas: prueba del 2026-11-20). La pasa a `main` el workflow del requisito 11.
   7. Avisar con una notificación al celular solo si hubo algo (cargado, para mirar o error).
   8. Revisar la corrida anterior: si el último commit «Datos a mano» tiene una corrida de Actions en rojo (API pública de GitHub), decirlo en el aviso.
8. Reglas de carga (no negociables):
   - Solo se tocan `datos/manual/`, `datos/manual/agenda.json` y `docs/MANTENIMIENTO-REGISTRO.md`. Nunca `pipeline/`, `web/`, el workflow ni otros docs.
   - Cada valor nuevo lleva documento, página o cuadro, fecha y URL, en el formato que ya usa el archivo (D-009, D-027). Sin cita, no se carga.
   - Nunca se cambia un valor ya cargado. Si la fuente revisó cifras viejas, se avisa y no se toca.
   - Como mucho 3 entradas cargadas por corrida; el resto queda para el día siguiente.
   - Si el valor nuevo se aleja mucho del anterior (más del doble del mayor salto de los últimos 12 períodos), no se carga: se avisa.
   - Datos privados (UTDT, UCA, CAME, Construya, RIGI no oficial) siguen marcados como privados.
9. `docs/MANTENIMIENTO-REGISTRO.md`: un renglón por novedad, el más nuevo arriba: fecha, id, qué pasó (cargado / para mirar / error), período, documento y commit. Se recorta a mano en una sesión cuando crezca (la rutina no toca otros docs).
10. `docs/ESTADO.md`: «Mantenimiento a mano» pasa a una línea que remite a la agenda y al registro. La rutina no edita `ESTADO.md`.

### Paso a `main`
11. Workflow `.github/workflows/datos-a-mano.yml`, al recibir un push a `claude/datos-a-mano-**`: corta (con `--no-renames`) si la rama toca algo fuera de `datos/manual/` y `docs/MANTENIMIENTO-REGISTRO.md`; hace rebase sobre `main`; corre `agenda.py --validar` y `obtener_datos.py --solo-json`; sube a `main` **sin revisión humana** (decisión del usuario, 2026-11-20; hasta tres intentos con rebase si `main` se movió), borra la rama y, también corta si cambian datos de `datos/manual/` sin que cambie `agenda.json` (falta `--cargado`); si cambiaron datos, dispara `actualizar.yml` (corrida completa; un push que solo toca `datos/` no la dispara sola). Si algo falla, la rama queda, GitHub avisa por mail y la rutina del día siguiente lo informa.

### Control en la PC (respaldo)
12. Tarea programada de la app de Claude en la PC del usuario, diaria a las 18:30 (si la PC está apagada, corre al prenderla). Con `RemoteTrigger` (`list_runs` de la rutina) se fija si la rutina en la nube corrió bien en las últimas 48 h. Si corrió, termina sin decir nada. Si no: la dispara (`run`) y sigue su registro; si eso falla o la rutina termina en error, sigue `docs/MANTENIMIENTO-AGENTE.md` en `C:\dev\Datos argentina` (Python local, misma rama `claude/datos-a-mano-…` y mismo workflow; antes `git pull --rebase`), y avisa al celular qué pasó. Pedido del usuario (2026-11-20): «Sumalo», sobre un respaldo local si falla la nube.

## Datos
- Nuevo `datos/manual/agenda.json` (requisito 1). Nuevo `docs/MANTENIMIENTO-REGISTRO.md`. Ninguna serie cambia de id ni de significado.
- Decisión D-032 en `docs/DECISIONES.md`: mantenimiento a mano automático en la nube, con publicación sin aprobación previa y sus límites.

## Casos borde
- Dos datos el mismo día: un solo commit. Más de 3: se cargan 3, el resto mañana.
- Un dato que necesita la corrida completa (`solo_json: false`): se carga igual; si el pipeline lo rechaza en Actions, la corrida falla y la rutina del día siguiente lo avisa (requisito 7.8).
- `deuda_por_acreedor`: el control exige que el boletín mensual de ese mes ya esté en la caché; si no está, esperar (no es error).
- La fuente da 403 o no responde (también con WebFetch): se anota «no pude mirar» en el registro cada día (sube la rama, pero el workflow no publica si no cambiaron datos) y se avisa al celular al tercer día seguido.
- La corrida diaria de datos sube commits a `main` mientras la rutina trabaja: el workflow del requisito 11 hace rebase sobre `main` antes de subir.
- Un archivo nuevo en `datos/manual/` sin entrada: el workflow corta en «Revisar código» y la rutina no hace nada hasta que se arregle (lo avisa).

## Fuera de alcance
- Sitios que bloquean o piden botón (ERSeP, EPE, Edenor): quedan en `avisar`.
- Juicios políticos (aliados del Congreso) y definiciones técnicas (supuestos de reservas netas): `avisar`.
- Bajar series automáticas nuevas: eso sigue siendo `nueva-serie`.

## Cómo se verifica
1. `python pipeline/agenda.py --validar` pasa; borrar a propósito una entrada lo hace cortar; `ruff` sin errores.
2. `--pendientes --hoy 2026-11-20` lista `tarifas-iiep`, `herencia-cobertura-amba` (el informe 44 del IIEP ya salió) y `semaforo-escrituras-pba` (octubre ya puede estar).
3. Prueba del entorno con la red abierta (hecha el 2026-11-20): 14 de 16 fuentes dan 200 (FMI 403 por Akamai, se mira con WebFetch; la raíz del Monitor RIGI 404), Python 3.14.6 con `uv`, push a `claude/prueba-push` sí, borrar la rama y escribir en `main` no (403).
4. Primera corrida a mano de la rutina (`run`): debe cargar el IIEP n.° 44 con su cita, publicar y avisar; mirar su registro (`get_run_log`), el commit, la corrida de Actions en verde y el dato en el sitio.
5. Revisor contra esta spec.

## Primera corrida (2026-11-20)
- Rutina `trig_0197Rv1WHVyhpmqf2f6ws26J` (diaria 21:00 UTC), primera corrida automática 21:03 UTC, 141 s, sesión `session_01UmdtBM2wQa7GLYKUEb7AXa`. Cargó IIEP n.° 44 (`tarifas_iiep.json`) y la cobertura AMBA 54 % (`herencia.json`) con citas verificadas contra el PDF; dejó `semaforo-escrituras-pba` (octubre todavía no salió); avisó al celular.
- Workflow «Datos a mano» corrida 44817260123 en verde: pasó a main como 9cbba6e, borró la rama, disparó la corrida completa 44817361581.
- Falla encontrada: no corrió `agenda.py --cargado` (mañana habría recargado el #44). Arreglado a mano y con un control nuevo en el workflow (corta si cambian datos sin la agenda) y el paso marcado como obligatorio en `MANTENIMIENTO-AGENTE.md`.
- Para mirar a mano: el #44 dice que la canasta subió 0,8 % contra octubre, pero contra el #43 cargado ($266.456) da +9,3 % (¿el IIEP revisó octubre?). No se tocó el #43.
- La corrida completa que disparó el workflow (44817361581) falló en «Commitear datos»: arrancó mientras corría la del push b9fc924 y las dos subieron la misma caché (conflicto al hacer rebase). Arreglo en `actualizar.yml`: `git pull --rebase -X theirs` (gana la descarga más nueva). Corrida 44819565584 (9361043) en verde: el sitio publicado muestra la cobertura IIEP de 2026-11 (54/58/57 %) y la herencia en 54 % (leído en `tarifas.json` y `herencia_informes.json` publicados).
- Control en la PC: tarea programada `datos-a-mano-respaldo`, diaria 18:30.

## Segunda vuelta (2026-11-20, a la noche)
- Control en la PC verificado: corrió a las 18:32 (11 s), vio la rutina de la nube en verde y terminó sin avisar.
- Corrida sin novedades verificada: sesión `cse_01UmdtBLSbg1ud19A5NZjS7Z` (23:42 UTC, 63 s): validó la agenda, miró el único pendiente (escrituras PBA, sin octubre), no tocó el repo y avisó al celular por la corrida fallida de las 21:06 (ya arreglada en 9361043).
- Canasta #44 resuelta: el IIEP recalculó el transporte hacia atrás (tabla 1: transporte contra dic-23 +1.513 % en el #43 y +1.860 % en el #44, con +3,4 % mensual; canasta +860 % → +950 %, es decir +9,4 %). Luz, gas y agua cierran con el #43. Se dejan las dos portadas, con `aviso` y `cita.aviso` en el #44 y una frase en la descripción de `tarifa_amba_canasta`. Regla nueva en `MANTENIMIENTO-AGENTE.md` (paso 3): si la variación que dice el documento no coincide con la cargada, cargar y dejar `aviso` citado.

## Dónde ver los cambios
1. Tarifas — `/tarifas/`: la canasta y las facturas del AMBA llegan a noviembre de 2026 (IIEP n.° 44). Origen: «agente haiku ponele que investigue diariamente si llegó algún dato nuevo» (primera carga de la rutina).
2. Herencia — `/herencia/`: la cobertura tarifaria del AMBA «hoy» pasa de 57 % a 54 % (IIEP n.° 44). Mismo origen.
3. Sin página: `datos/manual/agenda.json`, `pipeline/agenda.py`, `docs/MANTENIMIENTO-REGISTRO.md`, workflow «Datos a mano (rutina diaria)». Pediste: «esto debería tener en cuenta las nuevas cosas manuales que agreguemos».
Ya publicados (corrida 44819565584 en verde). Página: `docs/cambios/mantenimiento-automatico.html` (Artifact https://claude.ai/artifact/Nws7Yx5XZxxNihxDWbnFNT).
