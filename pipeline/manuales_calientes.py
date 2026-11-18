"""
Datos cargados a mano con su cita (docs/specs/datos-calientes-3.md, fase 1D; decisión D-027):
- datos/manual/pobreza_alta_frecuencia.json: Nowcast de Pobreza de la UTDT (privado, semestres móviles) y puntos de la UCA/ODSA.
- datos/manual/piquetes.json: cortes de calle y ruta por año según Diagnóstico Político (privada) y las afirmaciones del Gobierno con sus chequeos.
- datos/manual/carne.json: consumo de carne vacuna, aviar, porcina y total por habitante (Secretaría de Agricultura).
- datos/manual/universidades_alumnos.json: estudiantes, nuevos inscriptos y egresados universitarios por año (SPU).
- datos/manual/rigi.json: proyectos aprobados del RIGI (planilla del Ministerio de Economía + fecha de cada resolución) y lo ingresado según el BCRA.

Regla: sin documento y cita no se carga. Los valores que el subagente marcó como no abiertos (solo extracto del buscador) no entran.
No baja nada: con --solo-json funciona igual. escribir_rigi(destino) arma web/public/datos/rigi.json.
"""
import json
import os
from pathlib import Path

import pandas as pd

MANUAL = Path(os.environ.get("DATOS_MANUAL_DIR") or Path(__file__).resolve().parent.parent / "datos" / "manual")  # la variable es solo para pruebas
CAT_POB = ["Empleo, pobreza e ingresos", "Pobreza (EPH, semestral)"]  # la misma de las tasas de pobreza del INDEC (catalogo.py, indec_social)
CAT_SEG = ["Sociedad", "Seguridad"]
CAT_CONS = ["Actividad", "Consumo e indicadores de demanda"]
CAT_EXT = ["Sector externo"]
CAT_EDU = ["Sociedad", "Educación"]


def _leer(nombre):
    f = MANUAL / nombre
    if not f.exists():
        print(f"  Datos a mano: falta {f.name}; se omite")
        return None
    return json.loads(f.read_text(encoding="utf-8"))


def _mes(texto):
    return pd.Timestamp(texto[:7] + "-01")


def _con_cita(v):
    return bool(v.get("url")) and bool(v.get("cita"))


# ---------------------------------------------------------------- pobreza UTDT
def _pobreza_utdt():
    d = _leer("pobreza_alta_frecuencia.json")
    if d is None:
        return None
    filas = [v for v in d.get("nowcast_utdt_vigente", []) + d.get("nowcast_utdt_historico", [])
             if _con_cita(v) and v.get("pobreza") is not None and v.get("tipo") != "referencia"]
    # una ventana puede tener varias versiones: vale la publicada más tarde
    por_mes = {}
    for v in sorted(filas, key=lambda x: x.get("fecha", "")):
        por_mes[_mes(v["hasta"])] = float(v["pobreza"])
    if len(por_mes) < 5:
        print(f"  Pobreza UTDT: solo {len(por_mes)} ventanas con cita; se omite")
        return None
    s = pd.Series(por_mes).sort_index()
    if not ((s > 0) & (s < 100)).all():
        raise ValueError("Pobreza UTDT: valores fuera de 0-100")
    uca = [v for v in d.get("uca_odsa", []) if _con_cita(v)]
    return s, uca


# ---------------------------------------------------------------- piquetes
def _piquetes():
    d = _leer("piquetes.json")
    if d is None:
        return None
    ok = [v for v in d.get("valores_anuales", []) if _con_cita(v) and str(v.get("verificado", "")).startswith("abierto")]
    fuera = [v["anio"] for v in d.get("valores_anuales", []) if v not in ok]
    if fuera:
        print(f"  Piquetes: sin cita abierta, no se cargan {fuera}")
    if len(ok) < 5:
        print(f"  Piquetes: solo {len(ok)} años con cita; se omite")
        return None
    s = pd.Series({pd.Timestamp(int(v["anio"]), 12, 1): float(v["piquetes"]) for v in ok}).sort_index()
    return s, d.get("afirmaciones", [])


# ---------------------------------------------------------------- carne
def _estado_ok(v):
    e = str(v.get("estado", "")).lower()
    return e.startswith("confirmado") or e.startswith("verificado")


def _carne():
    """Devuelve ({clave: Serie anual en diciembre}, hist). Claves: vacuna, aviar, porcina, total (las nuevas solo si el archivo las trae)."""
    d = _leer("carne.json")
    if d is None:
        return None
    vals = {"vacuna": {}, "aviar": {}, "porcina": {}, "total": {}}
    hist = d.get("serie_historica_oficial") or {}
    for v in hist.get("valores", []):
        fecha, valor = (v if isinstance(v, (list, tuple)) else (v.get("fecha") or v.get("anio"), v.get("valor") or v.get("vacuna")))
        if valor is not None:
            vals["vacuna"][pd.Timestamp(int(str(fecha)[:4]), 12, 1)] = float(valor)
    for v in d.get("serie_tablero_oficial", []):
        if not _estado_ok(v):
            continue
        for k in vals:
            if v.get(k) is not None:
                vals[k][pd.Timestamp(int(v["anio"]), 12, 1)] = float(v[k])
    # 2015-2018 del tablero 2024: solo pollo, cerdo y total (la vacuna de esos años sigue siendo AGRO_0244, por el corte 2018/2019)
    for v in (d.get("tablero_2024_2015_2018") or {}).get("valores", []):
        if not _estado_ok(v):
            continue
        for k in ("aviar", "porcina", "total"):
            if v.get(k) is not None:
                vals[k].setdefault(pd.Timestamp(int(v["anio"]), 12, 1), float(v[k]))
    if len(vals["vacuna"]) < 10:
        print(f"  Carne: solo {len(vals['vacuna'])} años; se omite")
        return None
    out = {}
    for k, m in vals.items():
        if not m:
            continue
        s = pd.Series(m).sort_index()
        if not ((s > 5) & (s < 130)).all():
            raise ValueError(f"Carne ({k}): valores fuera de 5-130 kg por habitante")
        out[k] = s
    return out, hist


# ---------------------------------------------------------------- universidades
def _universidades():
    d = _leer("universidades_alumnos.json")
    if d is None:
        return None
    filas = [v for v in _lista(d, "registros", "anios", "valores", "serie") if v.get("anio") is not None]
    campos = {"univ_estudiantes": ("estudiantes",), "univ_nuevos_inscriptos": ("nuevos_inscriptos", "inscriptos"), "univ_egresados": ("egresados",)}
    out = {}
    for id_, claves in campos.items():
        m = {}
        for v in filas:
            for c in claves:
                if v.get(c) is not None:
                    m[pd.Timestamp(int(v["anio"]), 12, 1)] = float(v[c])
                    break
        if m:
            s = pd.Series(m).sort_index()
            if (s <= 0).any():
                raise ValueError(f"Universidades ({id_}): valores no positivos")
            out[id_] = s
    return out or None


def _lista(d, *claves):
    if isinstance(d, list):
        return d
    for k in claves:
        if isinstance(d.get(k), list):
            return d[k]
    return []


# ---------------------------------------------------------------- RIGI
def _rigi():
    d = _leer("rigi.json")
    if d is None:
        return None
    proyectos = d.get("proyectos", [])
    total = sum(float(p.get("monto") or 0) for p in proyectos)
    print(f"  RIGI: {len(proyectos)} proyectos, US$ {total:,.0f} millones comprometidos")
    return d


def series(idx):
    from catalogo import S
    out = []

    u = _pobreza_utdt()
    if u is not None:
        s, uca = u
        txt_uca = "; ".join(f"{v['periodo']}: {str(v['pobreza']).replace('.', ',')} % ({v.get('tipo', '')})" for v in uca)
        out.append(S("pobreza_utdt", "Pobreza: estimación mensual de la UTDT (semestre móvil)", CAT_POB, "none", "% de personas", s.reindex(idx), -1,
                     "Universidad Torcuato Di Tella, Nowcast de Pobreza (Martín González-Rozada), estimación privada; cada valor sale de una nota de prensa que cita el informe",
                     "Estimación privada de la pobreza en los 31 aglomerados del INDEC, hecha mes a mes con datos de la EPH simulados con ingresos proyectados. "
                     "Cada valor es un semestre móvil (los 6 meses que terminan en el mes del gráfico), por eso no se compara mes contra mes. No es el dato oficial: "
                     "el INDEC publica la pobreza por semestre. La UTDT revisa sus estimaciones; se muestra la última versión publicada de cada ventana, así que conviven "
                     "ventanas publicadas en fechas distintas (algunas ya revisadas, otras como pronóstico de ese momento) y no son una serie hecha de una sola vez. "
                     "No hay archivo descargable: cada valor sale de una nota que cita el informe. "
                     + (f"La UCA (Observatorio de la Deuda Social) publicó puntos sueltos: {txt_uca}. El 57,4 % de enero de 2024 fue una simulación, no una medición." if uca else "")))

    p = _piquetes()
    if p is not None:
        s, _afirm = p  # las frases del Gobierno y los chequeos quedan en datos/manual/piquetes.json, no se muestran (pedido del usuario, 2026-11-17)
        out.append(S("piquetes", "Piquetes (cortes de calle y ruta)", CAT_SEG, "none", "cortes por año", s.reindex(idx), -1,
                     "Diagnóstico Político (consultora privada), citado por Chequeado y otros medios",
                     "Cantidad de cortes de calle y ruta en protestas, según el conteo de la consultora privada Diagnóstico Político, que cuenta cada interrupción total o parcial "
                     "de una vía pública que informan los medios de todo el país (más de un centenar), sin importar cuánto dure. No hay conteo oficial publicado del Ministerio de Seguridad. "
                     "Los años sin una cita abierta quedan vacíos. Dato anual, se ubica en diciembre."))

    c = _carne()
    if c is not None:
        ss, hist = c
        corte = ("Hasta 2018 es la serie de indicadores bovinos de la Secretaría de Agricultura; desde 2019 la Secretaría usa otro cálculo (tablero de consumo per cápita): "
                 "2018 da 57,9 kg con el cálculo viejo y 2019 da 51,1 con el nuevo, así que una parte de esa diferencia puede venir del cambio de cálculo y no de que se coma menos. ")
        n_ult = max(ss["vacuna"].index).year
        fuente = ("Secretaría de Agricultura, Ganadería y Pesca: serie " + str(hist.get("id_serie", "AGRO_0244")) + " vía datos.gob.ar (1990-2018) y "
                  f"tableros de consumo per cápita de carnes (2019-{n_ult})")
        out.append(S("carne_vacuna", "Consumo de carne vacuna por habitante", CAT_CONS, "none", "kg por habitante por año", ss["vacuna"].reindex(idx), 1, fuente,
                     "Consumo aparente de carne vacuna (producción menos exportaciones más importaciones) dividido por la población, en kilos por habitante por año. "
                     + corte + "Los datos recientes son provisorios y la Secretaría los revisa. Dato anual, se ubica en diciembre."))
        nuevas = [("carne_aviar", "aviar", "Consumo de pollo por habitante", "carne de pollo (aviar)"),
                  ("carne_porcina", "porcina", "Consumo de cerdo por habitante", "carne de cerdo (porcina)"),
                  ("carne_total", "total", "Consumo de carnes por habitante (vacuna, pollo y cerdo)", "carnes (vacuna, pollo y cerdo juntas)")]
        for id_, k, nombre, que in nuevas:
            if k in ss:
                out.append(S(id_, nombre, CAT_CONS, "none", "kg por habitante por año", ss[k].reindex(idx), 1,
                             f"Secretaría de Agricultura, Ganadería y Pesca, tableros de consumo per cápita de carnes ({ss[k].index.min().year}-{ss[k].index.max().year})",
                             f"Consumo aparente de {que} dividido por la población, en kilos por habitante por año, según el tablero de la Secretaría de Agricultura. "
                             "Datos recientes provisorios. Dato anual, se ubica en diciembre."))

    u = _universidades()
    if u is not None:
        textos = {"univ_estudiantes": ("Estudiantes universitarios", "estudiantes", "estudian en"),
                  "univ_nuevos_inscriptos": ("Nuevos inscriptos en universidades", "nuevos inscriptos", "se inscriben por primera vez en"),
                  "univ_egresados": ("Egresados universitarios", "egresados", "se reciben en")}
        for id_, s in u.items():
            nombre, plural, verbo = textos[id_]
            faltan = [a for a in range(s.index.min().year, s.index.max().year + 1) if pd.Timestamp(a, 12, 1) not in s.index]
            out.append(S(id_, nombre, CAT_EDU, "none", "personas", s.reindex(idx), 1,
                         "Secretaría de Políticas Universitarias (Ministerio de Capital Humano), anuarios y síntesis de estadísticas universitarias",
                         f"Cantidad de {plural}: personas que {verbo} universidades e institutos universitarios estatales y privados, pregrado y grado, total del país. "
                         "Dato anual, se ubica en diciembre. Los años sin dato quedan vacíos (no se interpola)"
                         + (f": faltan {', '.join(map(str, faltan))}." if faltan else ".")))

    r = _rigi()
    if r is not None:
        con_fecha = [pp for pp in r.get("proyectos", []) if pp.get("fecha") and pp.get("monto")]
        sin_fecha = [pp["nombre"] for pp in r.get("proyectos", []) if not pp.get("fecha")]
        if con_fecha:
            m = pd.Series([float(pp["monto"]) for pp in con_fecha], index=[_mes(pp["fecha"]) for pp in con_fecha]).groupby(level=0).sum().sort_index()
            acum = m.cumsum().reindex(idx).ffill()
            acum[acum.index < m.index.min()] = None
            ult = max(_mes(pp["fecha"]) for pp in con_fecha)
            acum[acum.index > ult] = None
            out.append(S("rigi_aprobado", "Inversión comprometida en proyectos RIGI aprobados (acumulada)", CAT_EXT, "none", "millones de US$", acum, 1,
                         "Ministerio de Economía, planilla de proyectos RIGI aprobados, con la fecha de cada resolución de aprobación",
                         "Suma de la inversión que comprometieron las empresas en los proyectos aprobados en el Régimen de Incentivo para Grandes Inversiones (RIGI), "
                         "acumulada según el mes de la resolución que aprobó cada uno. Es lo comprometido, no lo invertido: lo efectivamente ingresado no tiene serie oficial "
                         "(el Banco Central informó US$ 762 millones netos hasta el primer trimestre de 2026). Lista de proyectos en /rigi/."
                         + (f" Sin fecha de aprobación encontrada (no suma acá): {', '.join(sin_fecha)}." if sin_fecha else "")))
    return out


def construir_rigi():
    """El contrato de web/public/datos/rigi.json (spec datos-calientes-3, fase 1D)."""
    d = _leer("rigi.json")
    if d is None:
        return None
    proys = []
    for p in d.get("proyectos", []):
        proys.append({"nombre": p.get("nombre"), "empresa": p.get("empresa"), "provincias": p.get("provincias") or [],
                      "sector": p.get("sector"), "monto": p.get("monto"), "empleos": p.get("empleos"),
                      "fecha": p.get("fecha"), "norma": p.get("norma")})
    ing = d.get("ingresado")
    ingresado = None
    if ing and ing.get("neto") is not None:
        ingresado = {"bruto": ing.get("bruto"), "egresos": ing.get("egresos"), "neto": ing.get("neto"), "hasta": ing.get("hasta"),
                     "texto": "Banco Central, presentación del vicepresidente Vladimir Werning («Argentina: Programa Económico Fase 4», abril de 2026), citada por Chequeado: "
                              "flujos en el mercado de cambios de los proyectos aprobados, acumulados. En la presentación las cifras están en un gráfico.",
                     "url": "https://chequeado.com/el-explicador/el-gobierno-anuncio-en-paris-2-nuevos-rigi-cuantos-proyectos-se-aprobaron-y-cuantos-dolares-ingresaron-hasta-ahora/"}
    return {"actualizado": d.get("actualizado"),
            "fuente": {"texto": "Ministerio de Economía, planilla oficial de proyectos RIGI aprobados; fecha de aprobación de cada resolución (argentina.gob.ar/normativa y Boletín Oficial)",
                       "url": "https://www.argentina.gob.ar/economia/rigi"},
            "proyectos": proys, "ingresado": ingresado,
            "nota": "Montos comprometidos por las empresas al pedir la adhesión, en millones de dólares. Un proyecto en varias provincias se cuenta una vez. "
                    "Lo ingresado según el Banco Central es la única cifra oficial de lo efectivamente invertido; no hay serie publicada."}


def escribir_rigi(destino):
    j = construir_rigi()
    if j is None:
        return
    (Path(destino) / "rigi.json").write_text(json.dumps(j, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  RIGI: rigi.json con {len(j['proyectos'])} proyectos")


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    idx = pd.date_range("1990-01-01", pd.Timestamp.today().normalize().replace(day=1), freq="MS")
    for x in series(idx):
        v = x["v"].dropna()
        print(x["id"], v.index.min().date(), v.index.max().date(), len(v), "último", v.iloc[-1])
    j = construir_rigi()
    print("rigi.json:", len(j["proyectos"]), "proyectos; ingresado", j["ingresado"])
