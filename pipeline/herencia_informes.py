"""Herencia, fase 2 (docs/specs/herencia.md): datos oficiales que están en informes (PDF o planillas), cargados a mano.

Lee datos/manual/herencia.json (versionado), revisa que cada dato tenga su cita completa y devuelve lo que se escribe en
web/public/datos/herencia_informes.json. Sin red: corre igual con --solo-json.

Formato de cada dato: clave, nombre, unidad, traspaso ("AAAA-MM", mes de asunción del que recibe, o "hoy"), valor (número o texto),
fecha_dato ("AAAA-MM-DD"), organismo, documento, url, pagina, cita (texto tal cual del documento) y nota (opcional).
Sin documento, URL, página y cita, el dato no se carga: se corta con un error que dice cuál falta.
"""
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ARCHIVO = RAIZ / "datos" / "manual" / "herencia.json"
OBLIGATORIOS = ("clave", "traspaso", "valor", "unidad", "fecha_dato", "organismo", "documento", "url", "pagina", "cita")
CAMPOS_WEB = OBLIGATORIOS + ("nota",)


# Datos a mano que también son series del catálogo (docs/specs/series-deuda.md): clave -> (id de serie, cómo se compara).
# Desde 2019 (cuando empieza la serie mensual) se controla que coincidan; FMI no: el informe está en DEG y la serie en dólares.
CONTROL_SERIES = {"deuda_bruta_usd": ("deuda_ac_total", "rel"), "deuda_bruta_pib": ("deuda_pib", "pp"), "deuda_moneda_ext": ("deuda_ac_me", "parte")}
TOLERANCIA = {"rel": 0.01, "pp": 0.5, "parte": 0.5}  # 1 % en montos; medio punto en porcentajes (Finanzas revisa meses viejos)


def controlar_series(datos_manual, compilado) -> list[str]:
    """Diferencias entre los datos a mano y las series del catálogo (desde 2019). Devuelve los avisos (vacío si todo coincide)."""
    fechas = compilado["fechas"]
    ser = {s["id"]: s for s in compilado["series"]}

    def valor(sid, mes):
        s = ser.get(sid)
        if not s or mes not in fechas:
            return None
        i = fechas.index(mes) - s["i0"]
        return s["v"][i] if 0 <= i < len(s["v"]) else None

    avisos = []
    for d in datos_manual:
        if d["clave"] not in CONTROL_SERIES or not isinstance(d["valor"], (int, float)) or d["fecha_dato"] < "2019-01":
            continue
        sid, modo = CONTROL_SERIES[d["clave"]]
        mes = d["fecha_dato"][:7]
        if modo == "parte":
            me, mn = valor("deuda_ac_me", mes), valor("deuda_ac_mn", mes)
            v = me / (me + mn) * 100 if me is not None and mn is not None else None
        else:
            v = valor(sid, mes)
        if v is None:
            continue
        dif = abs(d["valor"] / v - 1) if modo == "rel" else abs(d["valor"] - v)
        if dif > TOLERANCIA[modo]:
            avisos.append(f"{d['clave']} {d['traspaso']} ({mes}): a mano {d['valor']}, serie {sid} {v:.2f}")
    return avisos


def construir_json(compilado=None) -> dict | None:
    """Los datos para la web, o None si no hay archivo. Lanza ValueError si algún dato está incompleto o repetido.
    Con `compilado` (los datos del catálogo) controla los datos a mano contra sus series y avisa si no coinciden (no corta)."""
    if not ARCHIVO.exists():
        return None
    crudo = json.loads(ARCHIVO.read_text(encoding="utf-8"))
    datos = crudo["datos"] if isinstance(crudo, dict) else crudo
    vistos, salida = set(), []
    for n, d in enumerate(datos, 1):
        falta = [c for c in OBLIGATORIOS if d.get(c) in (None, "")]
        if falta:
            raise ValueError(f"datos/manual/herencia.json, dato {n} ({d.get('clave')}, {d.get('traspaso')}): falta {', '.join(falta)}")
        if d["traspaso"] != "hoy" and not re.fullmatch(r"\d{4}-\d{2}", d["traspaso"]):
            raise ValueError(f"dato {n}: traspaso '{d['traspaso']}' no es AAAA-MM ni 'hoy'")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d["fecha_dato"]):
            raise ValueError(f"dato {n}: fecha_dato '{d['fecha_dato']}' no es AAAA-MM-DD")
        if not str(d["url"]).startswith("https://"):
            raise ValueError(f"dato {n}: la url tiene que ser https://")
        llave = (d["clave"], d["traspaso"])
        if llave in vistos:
            raise ValueError(f"dato {n}: {llave} está repetido")
        vistos.add(llave)
        salida.append({c: d[c] for c in CAMPOS_WEB if d.get(c) not in (None, "")})
    if compilado:
        for a in controlar_series(datos, compilado):
            print(f"AVISO Herencia: el dato a mano no coincide con la serie: {a}")
    return {"actualizado": crudo.get("actualizado") if isinstance(crudo, dict) else None, "datos": salida}


if __name__ == "__main__":
    j = construir_json()
    print("sin archivo" if j is None else f"{len(j['datos'])} datos de informes, sin errores")
