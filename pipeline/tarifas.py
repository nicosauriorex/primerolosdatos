"""
Tarifas de luz, gas y agua y quién paga la energía (docs/specs/tarifas-y-datos-calientes-4.md, fase 2B; decisión D-027, D-029).
Todo sale de datos a mano con cita (datos/manual/), no baja nada: con --solo-json funciona igual.
- tarifas_iiep.json: Observatorio de Tarifas y Subsidios del IIEP (UBA-CONICET), AMBA, mensual -> 7 series (series(idx)).
- tarifas_cuadros*.json: facturas típicas desde los cuadros tarifarios (AMBA, Córdoba, Santa Fe) -> tarifas.json.
- subsidios_energia.json: tipos de subsidio y cuántos los reciben -> tarifas.json.
Archivo que falta: aviso y se omite. Control estructural roto (factura mal sumada, subsidio mayor que sin subsidio): ValueError.
La carpeta de datos a mano se puede cambiar con la variable de entorno DATOS_MANUAL_DIR (para pruebas).
"""
import json
import os
from pathlib import Path

import pandas as pd

MANUAL = Path(os.environ.get("DATOS_MANUAL_DIR") or Path(__file__).resolve().parent.parent / "datos" / "manual")
CAT = ["Fiscal", "Subsidios y tarifas"]
URL_IIEP = "https://economicas.uba.ar/iiep/informes-y-reportes/tarifas-y-subsidios/"
CONSUMOS = {"luz": "250 kWh por mes", "gas": "50 m³ por mes", "agua": "la factura de una vivienda tipo (cada cuadro dice cuál)"}
# (id, nombre, campo del registro, tipo, unidad, de qué habla)
_DEF = [
    ("tarifa_amba_luz", "Factura de luz de un hogar del AMBA sin subsidio (IIEP)", "luz_n1", "ars", "$ por mes", "la luz sin subsidio (nivel N1)"),
    ("tarifa_amba_gas", "Factura de gas de un hogar del AMBA sin subsidio (IIEP)", "gas_n1", "ars", "$ por mes", "el gas sin subsidio (nivel N1)"),
    ("tarifa_amba_agua", "Factura de agua de un hogar del AMBA (IIEP)", "agua", "ars", "$ por mes", "el agua"),
    ("tarifa_amba_canasta", "Canasta de servicios públicos de un hogar del AMBA (IIEP)", "canasta", "ars", "$ por mes", "la canasta de servicios públicos"),
    ("cobertura_hogar_canasta", "Parte del costo de los servicios que pagan los hogares del AMBA (IIEP)", "cobertura_canasta", "none", "% del costo", "la canasta de servicios"),
    ("cobertura_hogar_luz", "Parte del costo de la luz que pagan los hogares del AMBA (IIEP)", "cobertura_luz", "none", "% del costo", "la luz"),
    ("cobertura_hogar_gas", "Parte del costo del gas que pagan los hogares del AMBA (IIEP)", "cobertura_gas", "none", "% del costo", "el gas"),
]


def _leer(nombre):
    f = MANUAL / nombre
    if not f.exists():
        print(f"  Tarifas: falta {f.name}; se omite")
        return None
    return json.loads(f.read_text(encoding="utf-8"))


def _lista(d, *claves):
    if isinstance(d, list):
        return d
    for k in claves:
        if isinstance(d.get(k), list):
            return d[k]
    return []


def _registros_iiep():
    d = _leer("tarifas_iiep.json")
    if d is None:
        return []
    out = [r for r in _lista(d, "registros", "reportes") if r.get("mes") and r.get("url")]
    return sorted(out, key=lambda r: r["mes"])


def series(idx):
    from catalogo import S
    regs = _registros_iiep()
    if not regs:
        return []
    ult = regs[-1]
    out = []
    for id_, nombre, campo, tipo, u, que in _DEF:
        por_mes = {pd.Timestamp(r["mes"][:7] + "-01"): float(r[campo]) for r in regs if r.get(campo) is not None}
        if not por_mes:
            continue
        s = pd.Series(por_mes).sort_index()
        if (s <= 0).any() or (tipo == "none" and (s > 150).any()):
            raise ValueError(f"{id_}: valores fuera de rango")
        base = "Estimación de una universidad (Observatorio de Tarifas y Subsidios del IIEP, UBA-CONICET), no un dato oficial: se carga a mano de cada reporte mensual con su cita. "
        if tipo == "none":
            desc = (base + f"Parte del costo de {que} que pagan los hogares del AMBA; el resto lo cubre el Estado con subsidios. "
                    "Está solo en los meses en que el reporte da el número en el texto. "
                    "No es lo mismo que la cobertura de CAMMESA (toda la demanda, solo electricidad, en dólares). "
                    + ("El dato de abril de 2024 es el promedio ponderado de todos los usuarios residenciales de gas, no el del hogar del AMBA de los meses siguientes. "
                       "Desde enero de 2026 rige el nuevo esquema de subsidios (SEF); según el IIEP, la cobertura dio un salto con ese cambio de esquema. " if id_ == "cobertura_hogar_gas" else
                       "Desde enero de 2026 rige el nuevo esquema de subsidios (SEF); según el IIEP, la cobertura dio un salto con ese cambio de esquema. "))
        else:
            desc = (base + f"Factura mensual de un hogar del AMBA por {que}, con impuestos, para el consumo de referencia del IIEP "
                    "(que cambió con el tiempo: por ejemplo 300 kWh de luz y después 265 kWh). "
                    "El gas depende mucho de la estación: conviene compararlo con el mismo mes de otro año. Está en pesos de cada mes: se puede ver en pesos de hoy."
                    + (" En noviembre de 2026 (reporte n.° 44) el IIEP recalculó el gasto en transporte de los meses anteriores sin publicar la serie nueva: "
                       "por eso la canasta salta 9,3 % contra el octubre cargado, aunque el IIEP informa una suba de 0,8 % contra su octubre recalculado." if id_ == "tarifa_amba_canasta" else ""))
        out.append(S(id_, nombre, CAT, tipo, u, s.reindex(idx), 0,
                     f"Observatorio de Tarifas y Subsidios, IIEP (UBA-CONICET), Reportes de Tarifas y Subsidios (el último, n.° {ult.get('numero', '')}; cada mes sale de su reporte)",
                     desc))
    return out


# ---------------------------------------------------------------- cuadros tarifarios
# Los archivos a mano nombran el lugar de varias formas; la página usa amba / cordoba / santa_fe.
LUGARES = {"amba": "amba", "metrogas": "amba", "edenor": "amba", "aysa": "amba", "caba": "amba", "buenos_aires": "amba",
           "cordoba": "cordoba", "córdoba": "cordoba", "santa_fe": "santa_fe", "santafe": "santa_fe", "santa fe": "santa_fe"}


def _lugar(x):
    k = str(x or "").strip().lower()
    if k not in LUGARES:
        raise ValueError(f"Tarifas: lugar desconocido en un cuadro: {x!r}")
    return LUGARES[k]


NOMBRE_LUGAR = {"amba": "AMBA", "cordoba": "Córdoba", "santa_fe": "Santa Fe"}
MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def _txt_corte(c):
    import re
    return re.sub(r"(\d{4})-(\d{2})", lambda m: f"{MESES[int(m.group(2)) - 1]}-{m.group(1)}", str(c or ""))


def _agrupar_faltantes(faltantes):
    """Un renglón por servicio y motivo, con los lugares, cortes y categorías juntos (los archivos repiten el motivo por lugar y año)."""
    grupos, sueltos = {}, []
    for f in faltantes:
        if not isinstance(f, dict):
            sueltos.append({"servicio": None, "texto": str(f)})
            continue
        motivo = (f.get("motivo") or f.get("texto") or f.get("nota") or "").strip()
        g = grupos.setdefault((f.get("servicio"), motivo), {"lugares": [], "cortes": [], "categorias": []})
        lug = LUGARES.get(str(f.get("lugar") or "").strip().lower())
        for k, v in (("lugares", lug), ("cortes", f.get("corte") or f.get("vigencia")), ("categorias", f.get("categoria"))):
            if v and v not in g[k]:
                g[k].append(v)
    out = []
    for (serv, motivo), g in grupos.items():
        ns = [NOMBRE_LUGAR[x] for x in ("amba", "cordoba", "santa_fe") if x in g["lugares"]]
        lugares = ", ".join(ns[:-1]) + " y " + ns[-1] if len(ns) > 1 else "".join(ns)
        cortes = ", ".join(_txt_corte(c) for c in sorted(g["cortes"], key=lambda c: (c == "vigente", c)))
        cats = set(g["categorias"])
        cat = "sin y con subsidio" if cats >= {"sin_subsidio", "con_subsidio"} or "ambas" in cats else               ("con subsidio" if cats == {"con_subsidio"} else "sin subsidio" if cats == {"sin_subsidio"} else "")
        donde = " · ".join(x for x in (lugares, cortes, cat) if x)
        out.append({"servicio": serv, "texto": f"{donde}: {motivo}" if donde else motivo})
    return out + sueltos


def _por_escalones(esc, consumo):
    """Energía de un consumo con precios por tramos: [[kWh del tramo (None = el resto), $/unidad], ...]."""
    total, resto = 0.0, consumo
    for tramo, precio in esc:
        q = resto if tramo is None else min(resto, float(tramo))
        total += q * float(precio)
        resto -= q
        if resto <= 0:
            break
    if resto > 1e-9:
        raise ValueError(f"Tarifas: los escalones no cubren un consumo de {consumo}")
    return total


def _cuadros():
    regs, faltantes, notas = [], [], []
    archivos = sorted(MANUAL.glob("tarifas_cuadros*.json"))
    if not archivos:
        print("  Tarifas: faltan los tarifas_cuadros*.json; se omiten los cuadros")
    for f in archivos:
        d = json.loads(f.read_text(encoding="utf-8"))
        regs += _lista(d, "registros")
        faltantes += d.get("faltantes") or []
        if isinstance(d, dict) and d.get("nota"):
            notas.append(d["nota"])
    out = []
    for r in regs:
        fijo, var, cons, esc = r.get("cargo_fijo"), r.get("cargo_variable"), r.get("consumo"), r.get("escalones")
        if (var is None and not esc) or cons is None:
            faltantes.append({"servicio": r.get("servicio"), "lugar": r.get("lugar"), "vigencia": r.get("vigencia"),
                              "categoria": r.get("categoria"), "motivo": r.get("cita") or "sin datos"})
            continue
        if not r.get("norma") or not r.get("cita"):
            print(f"  Tarifas: cuadro sin norma o cita ({r.get('servicio')}, {r.get('lugar')}, {r.get('vigencia')}); no se carga")
            continue
        calc = float(fijo or 0) + (_por_escalones(esc, float(cons)) if esc else float(var) * float(cons))
        if r.get("factura") is not None and abs(float(r["factura"]) - calc) > 1:
            raise ValueError(f"Tarifas: factura mal sumada en {r.get('servicio')} {r.get('lugar')} {r.get('vigencia')} {r.get('categoria')}: "
                             f"cargada {r['factura']}, calculada {calc:.2f}")
        out.append({"servicio": r["servicio"], "lugar": _lugar(r["lugar"]), "empresa": r.get("empresa"), "vigencia": r["vigencia"], "categoria": r["categoria"],
                    "corte": r.get("corte") or str(r["vigencia"])[:7], "consumo": cons, "factura": round(calc, 2), "norma": r["norma"], "cita": r["cita"],
                    **({"nota": r["nota"]} if r.get("nota") else {})})
    por = {}
    for r in out:
        por.setdefault((r["servicio"], r["lugar"], r["corte"]), {})[r["categoria"]] = r["factura"]
    for k, v in por.items():
        if "con_subsidio" in v and "sin_subsidio" in v and v["con_subsidio"] > v["sin_subsidio"] + 1:
            raise ValueError(f"Tarifas: con subsidio ({v['con_subsidio']}) mayor que sin subsidio ({v['sin_subsidio']}) en {k}")
    # un faltante deja de serlo si después se cargó ese corte (por ejemplo, desde otro archivo)
    cargado = {(r["servicio"], r["lugar"], r["corte"], r["categoria"]) for r in out}

    def resuelto(f):
        if not isinstance(f, dict):
            return False
        lug = LUGARES.get(str(f.get("lugar") or "").strip().lower())
        cats = ["sin_subsidio", "con_subsidio"] if f.get("categoria") in ("ambas", None, "") else [f.get("categoria")]
        return all((f.get("servicio"), lug, f.get("corte"), c) in cargado for c in cats)
    faltantes = [f for f in faltantes if not resuelto(f)]
    return out, _agrupar_faltantes(faltantes), notas


def _cobertura_cammesa(c):
    """Acepta un dict {mes, luz, url}, una Series mensual (último dato) o None."""
    if c is None:
        return None
    if isinstance(c, pd.Series):
        v = c.dropna()
        if v.empty:
            return None
        return {"mes": v.index[-1].strftime("%Y-%m"), "luz": round(float(v.iloc[-1]), 1), "url": "https://cammesaweb.cammesa.com/"}
    return c


def construir_tarifas(cobertura_cammesa=None):
    """El contrato de web/public/datos/tarifas.json (spec tarifas-y-datos-calientes-4, 2B). Sin ningún archivo devuelve None."""
    cuadros, faltantes, notas_c = _cuadros()
    regs = _registros_iiep()
    sub = _leer("subsidios_energia.json")
    if not cuadros and not regs and sub is None:
        return None
    iiep = None
    for r in reversed(regs):
        if any(r.get(k) is not None for k in ("cobertura_canasta", "cobertura_luz", "cobertura_gas")):
            iiep = {"mes": r["mes"], "canasta": r.get("cobertura_canasta"), "luz": r.get("cobertura_luz"), "gas": r.get("cobertura_gas"), "url": r["url"]}
            break
    fechas = [d for d in ([r.get("fecha") for r in regs] + [(sub or {}).get("actualizado")]) if d]
    fuentes = []
    if regs:
        fuentes.append({"texto": "Observatorio de Tarifas y Subsidios, IIEP (UBA-CONICET): reportes mensuales", "url": URL_IIEP})
    vistos = set()
    for c in cuadros:
        if c["norma"] not in vistos:
            vistos.add(c["norma"])
            fuentes.append({"texto": f"Cuadro tarifario de {c['empresa'] or c['lugar']} ({c['servicio']}, {c['vigencia']})", "url": c["norma"]})
    for t in (sub or {}).get("tipos", []):
        if t.get("norma") and t["norma"] not in vistos:
            vistos.add(t["norma"])
            fuentes.append({"texto": t.get("nombre", "Norma"), "url": t["norma"]})
    nota = ("Las facturas de los cuadros son sin impuestos (los impuestos cambian por municipio): cargo fijo más cargo variable por el consumo de referencia, recalculadas acá. "
            "Los valores del IIEP son de una universidad, con impuestos y con su propio consumo de referencia. "
            "No hay serie oficial de facturas ni de cuántos hogares reciben cada subsidio. " + " ".join(notas_c))
    return {"actualizado": max(fechas) if fechas else None, "cuadros": cuadros, "consumos": CONSUMOS, "faltantes": faltantes,
            "cobertura": {"iiep": iiep, "cammesa": _cobertura_cammesa(cobertura_cammesa)},
            "tipos": (sub or {}).get("tipos", []), "cantidades": (sub or {}).get("cantidades", []),
            "fuentes": fuentes, "nota": nota.strip()}


def escribir_tarifas(destino, cobertura_cammesa=None):
    j = construir_tarifas(cobertura_cammesa)
    if j is None:
        return
    (Path(destino) / "tarifas.json").write_text(json.dumps(j, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  Tarifas: tarifas.json con {len(j['cuadros'])} cuadros, {len(j['tipos'])} tipos de subsidio, {len(j['faltantes'])} faltantes")


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    idx = pd.date_range("2019-01-01", pd.Timestamp.today().normalize().replace(day=1), freq="MS")
    for x in series(idx):
        v = x["v"].dropna()
        print(x["id"], v.index.min().date(), v.index.max().date(), len(v), "último", v.iloc[-1])
    j = construir_tarifas()
    if j is None:
        print("tarifas.json: sin datos")
    else:
        print("tarifas.json:", len(j["cuadros"]), "cuadros;", len(j["tipos"]), "tipos;", len(j["cantidades"]), "cantidades;", len(j["faltantes"]), "faltantes")
        print("cobertura:", j["cobertura"])
