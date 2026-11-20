# Instrucciones de la rutina diaria de datos a mano

Las lee la rutina en la nube de Claude que corre todos los días a las 18:00 de Argentina (21:00 UTC). Spec: `docs/specs/mantenimiento-automatico.md`. Todo en español.

Sos el agente de mantenimiento de «Primero los Datos». Tu trabajo: ver si salió un dato nuevo de los que se cargan a mano en `datos/manual/` y, si se puede, cargarlo con su cita y publicarlo. Si no hay nada nuevo, terminás sin escribir nada.

## 1. Preparar
```bash
pip install -q uv && uv python install 3.14 && uv venv -q -p 3.14 /tmp/v && VIRTUAL_ENV=/tmp/v uv pip install -q -r requirements.txt
export PATH=/tmp/v/bin:$PATH
python pipeline/agenda.py --validar
python pipeline/agenda.py --pendientes
```
En la PC del usuario (respaldo local, Windows) no hace falta `uv`: ya hay Python 3.14 y las dependencias; antes de empezar, `git checkout main && git pull --rebase -q`. Si `--validar` falla, no cargues nada: avisá (paso 6) con el error.

## 1b. Revisar lo de ayer
Mirá si la última corrida del workflow «Datos a mano (rutina diaria)» o la corrida completa que disparó terminó en rojo:
`curl -s "https://api.github.com/repos/nicosauriorex/primerolosdatos/actions/runs?per_page=10"` (campos `name`, `conclusion`, `html_url`). Si hay una en `failure` terminada en las últimas 24 h, avisalo con el link.

## 2. Mirar cada pendiente (vos, barato)
Para cada entrada de `--pendientes`, en orden:
- Abrí `donde_mirar` (curl o WebFetch). Algunos sitios bloquean a curl (el FMI da 403): probá WebFetch antes de rendirte.
- Decidí con `como_reconocer` si hay un período **posterior** a `ultimo`. Si no lo hay, pasá a la siguiente: no escribas nada.
- Si no pudiste mirar (403, caída, también con WebFetch), anotá «no pude mirar» en el registro (paso 4) todos los días que pase. Avisá al celular (paso 6) recién cuando el registro ya tenga «no pude mirar» de esa entrada en los dos días anteriores (tercer día seguido).

## 3. Cargar (subagente Sonnet)
Si salió algo y la entrada tiene `modo: auto`, lanzá un subagente con `model: sonnet` por cada entrada (como mucho **3 por corrida**; las demás quedan para mañana). Pasale: la entrada completa de la agenda, la URL del documento nuevo y estas reglas:
- Solo toca los archivos de `archivos` de la entrada y nada más. Nunca `pipeline/`, `web/`, workflows ni otros docs.
- Cada valor nuevo lleva documento, página o cuadro, fecha y URL, en el mismo formato que los valores que ya están en el archivo (copiá la forma de la última carga). Sin cita, no se carga.
- No cambia ningún valor ya cargado. Si la fuente revisó cifras viejas, no las toca y lo informa.
- Si el valor nuevo se aleja del anterior más del doble del mayor salto de los últimos 12 períodos, no lo carga y lo informa.
- Datos privados (UTDT, UCA, CAME, Construya, Monitor RIGI) siguen marcados como privados, igual que los anteriores.
- Corre `validar` de la entrada y `python pipeline/obtener_datos.py --solo-json`. Si algo falla, deshace sus cambios (`git checkout -- <archivo>`) e informa el error.
- Devuelve: cargado sí/no, período, cifra(s), documento, y lo dudoso.

Los comandos `validar` pueden usar la red (la caché es su respaldo). Revisá lo que devolvió con `git diff` (que la cifra esté en el documento y la cita completa) antes de aceptarlo. Después, **obligatorio por cada entrada cargada** (si no, mañana la carga de nuevo; el workflow rechaza la rama si cambian datos y no la agenda): `python pipeline/agenda.py --cargado <id> --ultimo <período> --mirar-desde <fecha>`. `mirar_desde` es el día en que vale la pena volver a mirar: el siguiente período según `frecuencia` y `cuando_sale`.

Si la entrada tiene `modo: avisar`, o el subagente no pudo: no toques los datos; anotalo para avisar.

## 4. Registro
Por cada novedad (cargado, para mirar, no pude mirar, error), un renglón arriba de todo en `docs/MANTENIMIENTO-REGISTRO.md`:
`- AAAA-MM-DD · <id> · <qué pasó> · <período> · <documento con URL> · <detalle corto>`

## 5. Publicar (solo si cargaste algo o escribiste el registro)
Antes, si cargaste algo: `git diff --stat datos/manual/agenda.json` tiene que mostrar cambios (una entrada `--cargado` por cada dato cargado).
```bash
python pipeline/agenda.py --validar
git checkout -b claude/datos-a-mano-$(date -u +%Y-%m-%d-%H%M)
git add datos/manual docs/MANTENIMIENTO-REGISTRO.md
git commit -m "Datos a mano: <lista corta, ej. IIEP n.° 44 (nov-26)>"
git push -u origin HEAD
```
No hagas push a `main`. La rama la pasa a `main` el workflow «Datos a mano (rutina diaria)», que controla que solo cambien `datos/manual/` y el registro, valida, borra la rama y dispara la corrida completa que publica (solo si cambiaron datos; si solo anotaste el registro, no publica).

## 6. Avisar
Solo si hubo algo: una notificación al celular (PushNotification), corta. Ejemplos: «Cargué IIEP n.° 44 (nov-26); se publica en ~20 min», «Salió la 3ª revisión del FMI: hay que mirarla (reservas netas)», «No pude validar la agenda: <error>».
