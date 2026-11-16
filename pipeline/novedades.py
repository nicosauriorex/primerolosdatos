"""
Novedades y calendario (bloque 9b): qué datos oficiales salieron y cuándo sale el próximo.

- datos/novedades.json (versionado): registro {"entradas": [{"fecha", "id", "periodo", "inicial"?}]}. En cada corrida con red,
  por cada serie mensual/trimestral/anual del catálogo, si su último período con dato es posterior al último registrado se
  agrega una entrada con la fecha de la corrida (hora argentina). Quedan afuera las series armadas desde datos diarios
  (tienen min/max) y los períodos del mes en curso o posteriores. Primera vez: se crea con el último período de cada serie
  como punto de partida (inicial: true, no se muestra).
- construir_json(): arma web/public/datos/novedades.json (publicaciones de los últimos 45 días y calendario de los próximos 45).
- Calendario: INDEC (pipeline/calendario.py) y fechas estimadas para otras fuentes (día mediano en que entraron antes).

Uso suelto:  python pipeline/novedades.py --reconstruir   (arma el registro desde la historia de git de compilado.json)
"""
import calendar
import json
import re
import statistics
import subprocess
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import calendario

RAIZ = Path(__file__).resolve().parent.parent
REGISTRO = RAIZ / "datos" / "novedades.json"
COMPILADO = "datos/cache/compilado.json"
DATOS_FIJOS = RAIZ / "web" / "lib" / "datos-fijos.ts"
AR = timezone(timedelta(hours=-3))
DIAS = 45
DESDE_HISTORIA = "2026-11-08"


# ---------- períodos ----------
def _mes_a_n(p):
    return int(p[:4]) * 12 + int(p[5:7]) - 1


def _n_a_mes(n):
    return f"{n // 12:04d}-{n % 12 + 1:02d}"


def _periodo_serie(s, fechas):
    """Último período 'AAAA-MM' con dato de la serie, o None. Las series con min/max (armadas desde datos diarios) no entran."""
    if "min" in s or "max" in s:
        return None
    v = s.get("v") or []
    ult = None
    for i in range(len(v) - 1, -1, -1):
        if v[i] is not None:
            ult = i
            break
    if ult is None:
        return None
    k = s["i0"] + ult
    return fechas[k] if 0 <= k < len(fechas) else None


# Series que se recalculan solas cuando entra otro dato (no son una publicación): el PIB de 12 meses se extiende con el IPC.
NO_SON_PUBLICACION = {"pib_nom_anual"}


def _ultimos_periodos(datos, hoy):
    """{id: último período} de las series que cuentan para novedades (excluye el mes en curso y posteriores)."""
    mes_hoy = f"{hoy.year:04d}-{hoy.month:02d}"
    r = {}
    for s in datos["series"]:
        p = _periodo_serie(s, datos["fechas"])
        if p and p < mes_hoy and s["id"] not in NO_SON_PUBLICACION:
            r[s["id"]] = p
    return r


# ---------- registro ----------
def cargar_registro():
    if REGISTRO.exists():
        return json.loads(REGISTRO.read_text(encoding="utf-8"))
    return None


def guardar_registro(reg):
    REGISTRO.write_text(json.dumps(reg, ensure_ascii=False, separators=(",", ":")).replace('},{"fecha"', '},\n{"fecha"'), encoding="utf-8")


def _aplicar(reg, datos, hoy):
    """Suma al registro las entradas de lo que llegó con `datos` (fecha = hoy). Devuelve cuántas sumó."""
    ultimo = {}
    for e in reg["entradas"]:
        if e["id"] not in ultimo or e["periodo"] > ultimo[e["id"]]:
            ultimo[e["id"]] = e["periodo"]
    nuevas = 0
    for sid, p in _ultimos_periodos(datos, hoy).items():
        if sid not in ultimo:
            continue  # serie que entra al catálogo: no es novedad de datos
        if p > ultimo[sid]:
            reg["entradas"].append({"fecha": hoy.isoformat(), "id": sid, "periodo": p})
            nuevas += 1
    return nuevas


def registrar(datos, hoy=None):
    """Con red: suma las novedades de esta corrida al registro (lo crea con puntos de partida si no existe)."""
    hoy = hoy or datetime.now(AR).date()
    reg = cargar_registro()
    if reg is None:
        reg = {"entradas": [{"fecha": hoy.isoformat(), "id": sid, "periodo": p, "inicial": True} for sid, p in _ultimos_periodos(datos, hoy).items()]}
        print(f"Novedades: registro creado con {len(reg['entradas'])} puntos de partida.")
    else:
        # series nuevas en el catálogo: punto de partida, no novedad
        conocidas = {e["id"] for e in reg["entradas"]}
        for sid, p in _ultimos_periodos(datos, hoy).items():
            if sid not in conocidas:
                reg["entradas"].append({"fecha": hoy.isoformat(), "id": sid, "periodo": p, "inicial": True})
        n = _aplicar(reg, datos, hoy)
        print(f"Novedades: {n} entradas nuevas.")
    guardar_registro(reg)
    return reg


def reconstruir():
    """Arma el registro recorriendo la historia de git de compilado.json (más viejo primero)."""
    out = subprocess.run(["git", "log", "--reverse", f"--since={DESDE_HISTORIA}T00:00:00-03:00", "--format=%H %cI", "--", COMPILADO],
                         cwd=RAIZ, capture_output=True, text=True, check=True).stdout.split("\n")
    commits = [l.split() for l in out if l.strip()]
    print(f"{len(commits)} commits de {COMPILADO}")
    reg = None
    for h, iso in commits:
        try:
            raw = subprocess.run(["git", "show", f"{h}:{COMPILADO}"], cwd=RAIZ, capture_output=True, check=True).stdout
            datos = json.loads(raw.decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            print(f"  {h[:7]}: no se pudo leer ({e}); se salta")
            continue
        dia = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(AR).date()
        if reg is None:
            reg = {"entradas": [{"fecha": dia.isoformat(), "id": sid, "periodo": p, "inicial": True} for sid, p in _ultimos_periodos(datos, dia).items()]}
            print(f"  {h[:7]} {dia}: base con {len(reg['entradas'])} series")
            continue
        conocidas = {e["id"] for e in reg["entradas"]}
        for sid, p in _ultimos_periodos(datos, dia).items():
            if sid not in conocidas:
                reg["entradas"].append({"fecha": dia.isoformat(), "id": sid, "periodo": p, "inicial": True})
        n = _aplicar(reg, datos, dia)
        if n:
            print(f"  {h[:7]} {dia}: {n} entradas")
    if reg is None:
        raise SystemExit("No hay historia para reconstruir.")
    guardar_registro(reg)
    print(f"Registro escrito: {len(reg['entradas'])} entradas ({sum(1 for e in reg['entradas'] if not e.get('inicial'))} novedades) en {REGISTRO}")


# ---------- publicaciones ----------
def _principales():
    """Ids de los datos fijos de web/lib/datos-fijos.ts, en ese orden y sin repetir."""
    try:
        t = DATOS_FIJOS.read_text(encoding="utf-8")
    except OSError as e:
        raise RuntimeError(f"Novedades: no se pudo leer {DATOS_FIJOS} para elegir el dato principal de cada publicación ({e})")
    t = re.sub(r"//[^\n]*", "", t)  # sin comentarios: un ex(" citado en un comentario no cuenta
    vistos = []
    for m in re.finditer(r'\bex\("([^"]+)"', t):
        if m.group(1) not in vistos:
            vistos.append(m.group(1))
    if len(vistos) < 5:  # control de cordura: hoy son más de 20; si la lectura se rompe, el principal cambiaría sin aviso
        raise RuntimeError(f"Novedades: solo {len(vistos)} datos fijos leídos de {DATOS_FIJOS}; revisar el formato de ex(...)")
    return vistos


def _principal(ids, orden_catalogo, principales):
    for p in principales:
        if p in ids:
            return p
    return min(ids, key=lambda i: orden_catalogo[i])


def _fuente(s):
    """Fuente sin el número de serie ('INDEC vía datos.gob.ar, serie 33.2_ISAC_...' -> 'INDEC vía datos.gob.ar'): así las series de un mismo organismo se agrupan."""
    return re.split(r",\s*serie\s", s.get("fuente", ""))[0].strip()


def _publicaciones(reg, catalogo, orden, principales):
    """Todas las publicaciones del registro (sin las iniciales): misma fecha, período y cat[0].
    Sin la fuente en la clave: el IPC nacional, el regional y los precios promedio salen el mismo día con fuentes escritas distintas
    y son una sola publicación. La fuente de la publicación es la de su dato principal."""
    grupos = {}
    for e in reg["entradas"]:
        if e.get("inicial") or e["id"] not in catalogo or e["id"] in NO_SON_PUBLICACION:
            continue
        s = catalogo[e["id"]]
        grupos.setdefault((e["fecha"], e["periodo"], s["cat"][0]), []).append(e["id"])
    pubs = []
    for (fecha, periodo, cat0), ids in grupos.items():
        pr = _principal(ids, orden, principales)
        resto = sorted((i for i in ids if i != pr), key=lambda i: orden[i])
        fuente = _fuente(catalogo[pr])
        pubs.append({"fecha": fecha, "periodo": periodo, "fuente": fuente, "cat": cat0, "principal": pr, "series": [pr] + resto})
    pubs.sort(key=lambda p: (p["fecha"], p["cat"], p["fuente"], p["periodo"]), reverse=True)
    return pubs


def _estimadas(pubs, hoy, catalogo):
    """Próximas fechas estimadas de los grupos (cat[0] + fuente) que no son del INDEC."""
    grupos = {}
    for p in pubs:
        if "INDEC" in p["fuente"].upper():
            continue
        grupos.setdefault((p["cat"], p["fuente"]), []).append(p)
    r = []
    limite = hoy + timedelta(days=DIAS)
    for g in grupos.values():
        g.sort(key=lambda p: p["periodo"])
        cadena = [g[-1]]  # publicaciones de períodos mensuales consecutivos terminando en la última
        for p in reversed(g[:-1]):
            if _mes_a_n(p["periodo"]) == _mes_a_n(cadena[0]["periodo"]) - 1:
                cadena.insert(0, p)
            else:
                break
        meses = {c["fecha"][:7] for c in cadena}
        if len(cadena) < 2 or len(meses) < 2:
            continue
        dia = int(statistics.median(int(c["fecha"][8:10]) for c in cadena))
        ult = date.fromisoformat(cadena[-1]["fecha"])
        y, m = (ult.year, ult.month + 1) if ult.month < 12 else (ult.year + 1, 1)
        f = date(y, m, min(dia, calendar.monthrange(y, m)[1]))
        if f < hoy or f > limite:
            continue
        ult_p = cadena[-1]
        r.append({"fecha": f.isoformat(), "hora": None, "informe": None, "periodo": _n_a_mes(_mes_a_n(ult_p["periodo"]) + 1),
                  "principal": ult_p["principal"], "series": ult_p["series"], "estimado": True})
    return r


def construir_json(datos, hoy=None, con_red=True):
    """dict para web/public/datos/novedades.json (ver docs/specs/novedades-calendario.md, «Datos»)."""
    ahora = datetime.now(AR)
    hoy = hoy or ahora.date()
    reg = cargar_registro() or {"entradas": []}
    catalogo = {s["id"]: s for s in datos["series"]}
    orden = {s["id"]: i for i, s in enumerate(datos["series"])}
    principales = _principales()
    pubs = _publicaciones(reg, catalogo, orden, principales)
    desde = (hoy - timedelta(days=DIAS)).isoformat()
    recientes = [{k: p[k] for k in ("fecha", "periodo", "fuente", "principal", "series")} for p in pubs if p["fecha"] >= desde]

    # calendario del INDEC
    ultimo_dato = {}
    for e in reg["entradas"]:
        if e["id"] not in ultimo_dato or e["periodo"] > ultimo_dato[e["id"]]:
            ultimo_dato[e["id"]] = e["periodo"]
    for s in datos["series"]:  # lo que ya está en el catálogo cuenta aunque el registro no lo tenga
        p = _periodo_serie(s, datos["fechas"])
        if p and p > ultimo_dato.get(s["id"], ""):
            ultimo_dato[s["id"]] = p
    hasta = (hoy + timedelta(days=DIAS)).isoformat()
    cal = []
    sin_datos = 0
    por_informe = {}
    for x in calendario.cargar(con_red, hoy):
        por_informe[(x["fecha"], x["informe"])] = x  # si se reprogramó, manda la última bajada
    for x in sorted(por_informe.values(), key=lambda x: (x["fecha"], x.get("hora") or "", x["informe"])):
        if not (hoy.isoformat() <= x["fecha"] <= hasta):
            continue
        ids = [i for i in calendario.series_de(x["informe"]) if i in catalogo]
        per = calendario.periodo_de(x["informe"])
        if not ids:
            sin_datos += 1
            continue
        if per is None:
            continue
        pr = _principal(ids, orden, principales)
        if ultimo_dato.get(pr, "") >= _n_a_mes(_mes_a_n(per) - calendario.tolerancia(x["informe"])):
            continue  # ya salió: figura en «Lo último que salió»
        cal.append({"fecha": x["fecha"], "hora": x.get("hora"), "informe": x["informe"], "periodo": per, "principal": pr,
                    "series": [pr] + [i for i in ids if i != pr], "estimado": False})
    cal += _estimadas(pubs, hoy, catalogo)
    cal.sort(key=lambda c: (c["fecha"], c["hora"] or "99", c["estimado"]))
    return {"generado": ahora.strftime("%Y-%m-%dT%H:%M"), "publicaciones": recientes, "calendario": cal, "indec_sin_datos": sin_datos}


if __name__ == "__main__":
    if "--reconstruir" in sys.argv:
        reconstruir()
    else:
        print(__doc__)
