"""
Puestos de trabajo (INDEC), obra pública nacional, empresas con trabajadores registrados (SRT), motos 0 km y usadas y
robos y recuperos de autos (DNRPA) (docs/specs/datos-calientes-3.md, Fase 1A).

Fuentes:
- INDEC, Cuenta de generación del ingreso (CGI), vía datos.gob.ar: puestos de trabajo trimestrales (stock). La API dice
  «millones de pesos» por un error de unidad: son miles de puestos.
- Secretaría de Hacienda, Esquema Ahorro-Inversión-Financiamiento base caja, vía datos.gob.ar: inversión real directa, tres tramos
  de metodología (1993-2006, 2007-2014, 2015 →) que se pegan en una sola serie en millones de pesos corrientes.
- Superintendencia de Riesgos del Trabajo (SRT): xlsx «Serie histórica según ART o empleador autoasegurado - UP», cuadro 1.2.
  Si la URL cambia, se busca en la página de la serie histórica el link que termina en .xlsx y contiene «UP».
- DNRPA (Ministerio de Justicia, datos.jus.gob.ar): inscripciones y transferencias de motos (un CSV con todo el período) y robos y
  recuperos de autos (un ZIP por año con un CSV por mes; se guarda solo el conteo mensual).

Respaldos: datos/cache/trabajo_obra.pkl, srt_empresas.pkl, dnrpa_motos.pkl y dnrpa_robos.pkl.
"""
import io
import json
import re
import unicodedata
import zipfile
from datetime import date

import pandas as pd

import red
from mas_series import _control, _leer_dnrpa, _url_csv

CAT_PUESTOS = ["Empleo, pobreza e ingresos", "Puestos de trabajo (INDEC, trimestral)"]
CAT_EMPRESAS = ["Empleo, pobreza e ingresos", "Empleo registrado (SIPA)"]
CAT_FI = ["Fiscal"]
CAT_CONS = ["Actividad", "Consumo e indicadores de demanda"]
CAT_SEG = ["Sociedad", "Seguridad"]

ID_TOTAL = "324.1_TOTAL_GENEAJO__29"
ID_REG = "324.1_TOTAL_GENEADO__51"
ID_NOREG = "324.1_TOTAL_GENEREG__32"
ID_NOASAL = "324.1_TOTAL_GENESAL__34"
# obra pública: tramo reciente, anual del tramo reciente (para controlar), 2007-2014 y 1993-2006
ID_OBRA_15 = "379.9_GTOS_CAP_I017__36_40"
ID_OBRA_15_ANUAL = "379.3_GTOS_CAP_I017__36_45"
ID_OBRA_07 = "379.8_GTOS_CAP_I014__41_48"
ID_OBRA_93 = "379.7_GTOS_CAP_I006__41_1"
IDS_API = [ID_TOTAL, ID_REG, ID_NOREG, ID_NOASAL, ID_OBRA_15, ID_OBRA_15_ANUAL, ID_OBRA_07, ID_OBRA_93]

URL_SRT = "https://www.srt.gob.ar/estadisticas/series/co/up/Serie_historica_Segun_ART_o_empleador_autoasegurado%20-%20UP.xlsx"
URL_SRT_PAGINA = "https://www.srt.gob.ar/estadisticas/cf_serie_historica_up.php"

CKAN = "https://datos.jus.gob.ar/api/3/action/package_show?id="
PAQUETE_MOTOS = "72d85f23-b751-4d12-935b-25e32ed9445e"
PAQUETE_ROBOS = "a9bdfec2-0af4-433a-b810-38c91275a251"

FUENTE_INDEC = "INDEC, Cuenta de generación del ingreso, vía datos.gob.ar, serie "
FUENTE_HAC = "Secretaría de Hacienda (Ministerio de Economía), Esquema Ahorro-Inversión-Financiamiento base caja, vía datos.gob.ar, series "
FUENTE_SRT = ("Superintendencia de Riesgos del Trabajo (SRT), estadística de unidades productivas según ART (serie histórica), cuadro 1.2, "
              "fila «Parte empleadora afiliada de unidades productivas con personas trabajadoras declaradas (1)»")
FUENTE_DNRPA_MOTOS = ("Dirección Nacional de los Registros Nacionales de la Propiedad del Automotor (Ministerio de Justicia), datos.jus.gob.ar, "
                      "dataset «Estadística de trámites de motovehículos», recurso ")
FUENTE_DNRPA_ROBOS = ("Dirección Nacional de los Registros Nacionales de la Propiedad del Automotor (Ministerio de Justicia), datos.jus.gob.ar, "
                      "dataset «DNRPA. Robos y recuperos de autos» (un ZIP por año; se cuentan los trámites de cada mes)")


def _sin_tildes(t):
    return "".join(c for c in unicodedata.normalize("NFD", str(t)) if unicodedata.category(c) != "Mn").upper().strip()


# ---------------------------------------------------------------- puestos de trabajo
def _puestos(d, idx, out):
    from catalogo import S
    claves = [ID_TOTAL, ID_REG, ID_NOREG, ID_NOASAL]
    faltan = [c for c in claves if c not in d]
    if faltan:
        print(f"  Puestos de trabajo: faltan {', '.join(faltan)} (sin copia en el respaldo); se omiten las series de puestos")
        return
    df = pd.DataFrame({c: d[c] for c in claves}).dropna()
    dif = (df[ID_REG] + df[ID_NOREG] + df[ID_NOASAL] - df[ID_TOTAL]).abs()
    if (dif > 0.01).any():
        raise ValueError("Puestos de trabajo: registrados + no registrados + no asalariados ≠ total (±0,01) en "
                         + ", ".join(f"{f:%Y-%m}" for f in dif[dif > 0.01].index[:6]))
    print(f"  Puestos de trabajo: registrados + no registrados + no asalariados = total en los {len(df)} trimestres (control cumplido, desvío máximo {dif.max():.1e})")
    tot, reg, noreg, noasal = (d[c] for c in claves)
    _control("Puestos totales 1T-16", tot.get(pd.Timestamp("2016-01-01")), 19734.8, 0.0001)
    _control("Puestos totales 4T-25", tot.get(pd.Timestamp("2025-10-01")), 23152.9, 0.0001)
    _control("Puestos totales 2T-26", tot.get(pd.Timestamp("2026-04-01")), 22565.8, 0.0001)
    _control("Puestos no registrados 2T-26", noreg.get(pd.Timestamp("2026-04-01")), 5600.7, 0.0001)
    pct = (noreg / (reg + noreg) * 100).dropna()

    comun = ("Cuenta de generación del ingreso del INDEC, en miles de puestos (la fuente dice «millones de pesos» por un error de unidad). "
             "Cuenta puestos de trabajo, no personas: quien tiene dos trabajos cuenta dos veces. Combina registros administrativos (SIPA y otros) con la EPH, "
             "por eso no coincide ni con la EPH (personas, 31 aglomerados) ni con el SIPA (solo lo formal). "
             "Dato trimestral sin desestacionalizar (se ubica en el primer mes del trimestre): el 4.º trimestre es siempre el pico, "
             "así que conviene comparar con el mismo trimestre de otro año. ")

    def trim(s):
        return s.reindex(idx).round(1)  # stock trimestral: un valor por trimestre, como la EPH (la web lo reconoce como trimestral)

    out.append(S("puestos_total", "Puestos de trabajo totales (formales e informales)", CAT_PUESTOS, "none", "miles de puestos", trim(tot), 1,
                 FUENTE_INDEC + ID_TOTAL, "Todos los puestos de trabajo de la economía: asalariados registrados, asalariados no registrados y no asalariados. " + comun))
    out.append(S("puestos_asal_reg", "Puestos asalariados registrados", CAT_PUESTOS, "none", "miles de puestos", trim(reg), 1,
                 FUENTE_INDEC + ID_REG, "Puestos de asalariados con aportes (en blanco), públicos y privados. " + comun))
    out.append(S("puestos_asal_noreg", "Puestos asalariados no registrados (en negro)", CAT_PUESTOS, "none", "miles de puestos", trim(noreg), -1,
                 FUENTE_INDEC + ID_NOREG, "Puestos de asalariados sin aportes ni registro (trabajo en negro). " + comun))
    out.append(S("puestos_no_asal", "Puestos no asalariados (cuentapropistas y patrones)", CAT_PUESTOS, "none", "miles de puestos", trim(noasal), 0,
                 FUENTE_INDEC + ID_NOASAL, "Puestos de quienes trabajan por cuenta propia o son empleadores, sin relación de dependencia (formales e informales). " + comun))
    out.append(S("puestos_noreg_pct", "Asalariados no registrados (% de los puestos asalariados)", CAT_PUESTOS, "none", "%", pct.reindex(idx).round(2), -1,
                 FUENTE_INDEC + ", ".join([ID_REG, ID_NOREG]),
                 "Qué parte de los puestos de asalariados no está registrada (en negro): no registrados / (registrados + no registrados) × 100. "
                 "Cuenta propia del proyecto con los puestos del INDEC; no incluye a los no asalariados (cuentapropistas y patrones), por eso es menor "
                 "a la tasa de informalidad total. " + comun))


# ---------------------------------------------------------------- obra pública
def _obra(d, idx, out):
    from catalogo import S
    tramos = [(ID_OBRA_93, "1993-2006"), (ID_OBRA_07, "2007-2014"), (ID_OBRA_15, "2015 →")]
    faltan = [i for i, _ in tramos if i not in d]
    if faltan:
        print(f"  Obra pública: faltan {', '.join(faltan)} (sin copia en el respaldo); se omite la serie")
        return
    a, b, c = (d[i] for i, _ in tramos)
    # Empalme: dic-14 → ene-15 y dic-06 → ene-07. Se compara la caída dic→ene de cada tramo con la del empalme
    # (diciembre es estacionalmente alto: aguinaldo y cierre de ejercicio, y enero cae).
    for nombre, ant, nuevo in (("2014→2015", b, c), ("2006→2007", a, b)):
        pasa = ant.index.max()
        r_empalme = nuevo.iloc[0] / ant.iloc[-1]
        previo = [ant[pd.Timestamp(y, 1, 1)] / ant[pd.Timestamp(y - 1, 12, 1)] for y in range(ant.index.min().year + 1, pasa.year + 1)
                  if pd.Timestamp(y, 1, 1) in ant.index and pd.Timestamp(y - 1, 12, 1) in ant.index]
        rango = (min(previo), max(previo))
        pegar = rango[0] * 0.8 <= r_empalme <= rango[1] * 1.2
        print(f"  Obra pública empalme {nombre}: dic→ene en el empalme {r_empalme:.2f}; en los otros años del tramo anterior entre {rango[0]:.2f} y {rango[1]:.2f} "
              + ("(mismo orden: se pegan los tramos)" if pegar else "(fuera de orden: empalme dudoso)"))
        if not pegar:
            raise ValueError(f"Obra pública: el empalme {nombre} cae {r_empalme:.2f}, fuera del rango de otros años ({rango[0]:.2f}-{rango[1]:.2f})")
    s = pd.concat([a, b, c]).sort_index()
    if s.index.duplicated().any():
        raise ValueError("Obra pública: meses repetidos entre tramos")
    if len(s) != len(pd.date_range(s.index.min(), s.index.max(), freq="MS")):
        raise ValueError("Obra pública: faltan meses entre tramos")
    _control("Obra pública dic-14", b.get(pd.Timestamp("2014-12-01")), 4669.7, 0.0001)
    _control("Obra pública ene-15", c.get(pd.Timestamp("2015-01-01")), 4661.9, 0.0001)
    _control("Obra pública dic-24", s.get(pd.Timestamp("2024-12-01")), 204098.0, 0.0001)
    _control("Obra pública sep-26", s.get(pd.Timestamp("2026-09-01")), 288373.1, 0.0001)
    # suma de los meses de cada año cerrado del tramo 2015+ = anual de la API (±0,5 %)
    if ID_OBRA_15_ANUAL in d:
        anual = d[ID_OBRA_15_ANUAL]
        sm = c.groupby(c.index.year).sum()
        sa = pd.Series(anual.values, index=anual.index.year)
        sa = sa[sa.index < c.index.max().year]
        dif = ((sm.reindex(sa.index) / sa - 1) * 100).abs()
        print(f"  Obra pública: suma de los meses vs anual de la API ({ID_OBRA_15_ANUAL}) {sa.index.min()}-{sa.index.max()}: desvío máximo {dif.max():.4f} % "
              + ("(control cumplido)" if dif.max() <= 0.5 else "(NO cumple ±0,5 %)"))
    else:
        print("  Obra pública: sin el anual de la API; no se compara la suma de los meses")
    out.append(S("obra_publica", "Obra pública nacional (inversión real directa)", CAT_FI, "ars", "millones de $", s.round(1).reindex(idx), 0,
                 FUENTE_HAC + f"{ID_OBRA_93} para 1993-2006, {ID_OBRA_07} para 2007-2014 y {ID_OBRA_15} desde 2015",
                 "Lo que el Sector Público Nacional gasta (base caja) en comprar y construir bienes de capital: rutas, edificios, equipos. "
                 "No incluye lo que la Nación gira a las provincias para obras, que está en «Transferencias de capital a provincias». "
                 "En millones de pesos de cada mes: se ve mejor en pesos de hoy o como % del PIB. Es estacional (diciembre es alto, enero bajo). "
                 "Empalma tres tramos de metodología de la Secretaría de Hacienda (1993-2006, 2007-2014 y 2015 en adelante).",
                 agg=True, flujo=True))


# ---------------------------------------------------------------- empresas (SRT)
def _url_srt():
    """La URL de siempre; si no responde un xlsx, se busca en la página de la serie el link .xlsx que contiene «UP»."""
    try:
        b = red.bajar(URL_SRT, timeout=120)
        if b[:4] == b"PK\x03\x04":
            return b
    except Exception as e:  # noqa: BLE001
        print(f"  SRT: la URL conocida falló ({e}); busco el link en la página")
    html = red.bajar(URL_SRT_PAGINA, timeout=60).decode("utf-8", "replace")
    links = [h for h in re.findall(r'href=["\']([^"\']+\.xlsx)["\']', html, flags=re.I) if "UP" in h]
    if not links:
        raise RuntimeError("SRT: no encontré el xlsx de unidades productivas en la página")
    url = links[0] if links[0].startswith("http") else "https://www.srt.gob.ar" + (links[0] if links[0].startswith("/") else "/" + links[0])
    return red.bajar(url.replace(" ", "%20"), timeout=120)


def _bajar_srt():
    df = pd.read_excel(io.BytesIO(_url_srt()), sheet_name="Cuadro 1.2", header=None)
    fila_meses = next(i for i in range(10) if isinstance(df.iloc[i, 1], (pd.Timestamp, date)))
    fila = next(i for i in range(len(df)) if _sin_tildes(df.iloc[i, 0]).startswith("PARTE EMPLEADORA AFILIADA DE UNIDADES PRODUCTIVAS CON PERSONAS"))
    s = pd.Series(df.iloc[fila, 1:].values, index=pd.to_datetime(df.iloc[fila_meses, 1:].values))
    s = pd.to_numeric(s, errors="coerce").dropna()
    return pd.DataFrame({"empresas": s.astype(float)})


def _empresas(idx, out):
    from catalogo import S
    df = red.cache_df("srt_empresas", _bajar_srt)
    if df.empty:
        print("  Empresas SRT: sin el xlsx (sin copia en el respaldo); se omite la serie")
        return
    s = df["empresas"]
    if len(s) != len(pd.date_range(s.index.min(), s.index.max(), freq="MS")):
        raise ValueError("Empresas SRT: faltan meses en la serie")
    _control("Empresas SRT jul-96", s.get(pd.Timestamp("1996-07-01")), 318723, 0)
    _control("Empresas SRT dic-15", s.get(pd.Timestamp("2015-12-01")), 533107, 0)
    _control("Empresas SRT nov-23", s.get(pd.Timestamp("2023-11-01")), 512357, 0)
    _control("Empresas SRT ago-26", s.get(pd.Timestamp("2026-08-01")), 479928, 0)
    out.append(S("empresas_art", "Empresas con trabajadores registrados", CAT_EMPRESAS, "none", "empresas", s.reindex(idx), 1, FUENTE_SRT,
                 "Empleadores (empresas y otras unidades productivas, sin casas particulares) que tienen al menos una persona trabajadora declarada "
                 "con contrato vigente en una ART (Superintendencia de Riesgos del Trabajo). "
                 "La SRT avisa que un cambio de un mes puede venir de rescisiones de contratos o de nóminas vacías: no es lo mismo que empresas que abren o cierran. "
                 "Tampoco es el total de empleadores del país (no incluye a quienes no tienen ART)."))


# ---------------------------------------------------------------- motos
def _bajar_motos():
    rec = json.loads(red.bajar(CKAN + PAQUETE_MOTOS, timeout=60))["result"]["resources"]
    ins, _ = _leer_dnrpa(_url_csv(rec, "Estadística de inscripciones iniciales de motovehículos"), "inscripciones")
    tr, _ = _leer_dnrpa(_url_csv(rec, "Estadística de transferencias de motovehículos"), "transferencias")
    return ins.join(tr, how="outer")


def _motos(idx, out):
    from catalogo import S
    dn = red.cache_df("dnrpa_motos", _bajar_motos)
    if dn.empty:
        print("  Motos: sin los CSV de la DNRPA (sin copia en el respaldo); se omiten las series de motos")
        return
    for col in ("inscripciones", "transferencias"):
        p = dn[col + "_provincias"].dropna()
        if (p < 20).any():
            raise ValueError(f"DNRPA motos {col}: meses con menos de 20 provincias: {list(p[p < 20].index.strftime('%Y-%m'))[:6]}")
        print(f"  DNRPA motos {col}: entre {int(p.min())} y {int(p.max())} provincias por mes (control cumplido)")
    ins, tr = dn["inscripciones"], dn["transferencias"]
    _control("Motos 0 km ene-07", ins.get(pd.Timestamp("2007-01-01")), 28659, 0)
    _control("Motos usadas ene-07", tr.get(pd.Timestamp("2007-01-01")), 8293, 0)
    _control("Motos 0 km dic-25", ins.get(pd.Timestamp("2025-12-01")), 60939, 0)
    _control("Motos usadas dic-25", tr.get(pd.Timestamp("2025-12-01")), 40958, 0)
    _control("Motos 0 km oct-26", ins.get(pd.Timestamp("2026-10-01")), 81713, 0)
    _control("Motos usadas oct-26", tr.get(pd.Timestamp("2026-10-01")), 47335, 0)
    comun = ("Dato de la Dirección Nacional de los Registros Nacionales de la Propiedad del Automotor (DNRPA, Ministerio de Justicia), suma de las 24 provincias, "
             "desde enero de 2007. ")
    out.append(S("motos_0km", "Patentamientos de motos 0 km", CAT_CONS, "none", "motos", ins.dropna().astype(float).reindex(idx), 1,
                 FUENTE_DNRPA_MOTOS + "«Estadística de inscripciones iniciales de motovehículos»",
                 "Motos inscriptas por primera vez en el Registro de Motovehículos en el mes. " + comun, agg=True))
    out.append(S("motos_usadas", "Ventas de motos usadas (transferencias)", CAT_CONS, "none", "motos", tr.dropna().astype(float).reindex(idx), 1,
                 FUENTE_DNRPA_MOTOS + "«Estadística de transferencias de motovehículos»",
                 "Cambios de titular de motos ya inscriptas (compraventas de usadas) registrados en el mes. " + comun, agg=True))


# ---------------------------------------------------------------- robos y recuperos de autos
def _contar_zip(contenido):
    """(DataFrame mensual robos/recuperos, renglones salteados por fecha ilegible, tipos desconocidos) de un ZIP anual con un CSV por mes."""
    z = zipfile.ZipFile(io.BytesIO(contenido))
    filas, salteadas, otros = [], 0, {}
    for nombre in sorted(n for n in z.namelist() if n.lower().endswith(".csv")):
        crudo = z.read(nombre)
        try:
            df = pd.read_csv(io.BytesIO(crudo), encoding="utf-8-sig", usecols=["tramite_tipo", "tramite_fecha"], dtype=str)
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(crudo), encoding="latin-1", usecols=["tramite_tipo", "tramite_fecha"], dtype=str)
        fecha = pd.to_datetime(df["tramite_fecha"], errors="coerce")
        salteadas += int(fecha.isna().sum())
        tipo = df["tramite_tipo"].map(_sin_tildes)
        kind = pd.Series("otro", index=df.index)
        kind[tipo.str.startswith("DENUNCIA DE ROBO O HURTO")] = "robos"
        kind[tipo.str.startswith("COMUNICACION DE RECUPERO")] = "recuperos"
        for t, n in tipo[kind == "otro"].value_counts().items():
            otros[t] = otros.get(t, 0) + int(n)
        g = pd.DataFrame({"mes": fecha.dt.to_period("M").dt.to_timestamp(), "k": kind}).dropna()
        filas.append(g[g["k"] != "otro"].groupby(["mes", "k"]).size().unstack(fill_value=0))
    out = pd.concat(filas).groupby(level=0).sum() if filas else pd.DataFrame()
    for c in ("robos", "recuperos"):
        if c not in out:
            out[c] = 0
    return out[["robos", "recuperos"]].astype(int), salteadas, otros


def _bajar_robos():
    f = red.CACHE / "dnrpa_robos.pkl"
    previo = pd.read_pickle(f) if f.exists() else pd.DataFrame({"robos": [], "recuperos": []}, index=pd.DatetimeIndex([]))
    bajado = dict(previo.attrs.get("bajado", {}))
    rec = json.loads(red.bajar(CKAN + PAQUETE_ROBOS, timeout=60))["result"]["resources"]
    zips = {}
    for r in rec:
        m = re.search(r"-\s*(\d{4})\s*$", r.get("name", ""))
        if m and str(r.get("format", "")).upper() == "ZIP":
            zips[int(m.group(1))] = r["url"]
    if not zips:
        raise RuntimeError("DNRPA robos: no encontré los ZIP por año en el dataset")
    hoy = date.today()
    df = previo.copy()
    for anio in sorted(zips):
        b = bajado.get(str(anio))
        if b and ((anio < hoy.year and b >= f"{anio + 1}-02-01") or b == hoy.isoformat()):
            continue  # año cerrado ya bajado (después de que cerró) o año en curso ya bajado hoy
        print(f"  DNRPA robos: bajando {anio}")
        cuenta, salt, otros = _contar_zip(red.bajar(zips[anio], timeout=300))
        if cuenta.empty or cuenta["robos"].sum() == 0:
            raise ValueError(f"DNRPA robos {anio}: el ZIP no tiene denuncias de robo o hurto")
        if salt:
            print(f"  DNRPA robos {anio}: {salt} renglones salteados por fecha ilegible")
        if otros:
            print(f"  DNRPA robos {anio}: tipos de trámite no contados: {otros}")
        df = pd.concat([df[df.index.year != anio], cuenta]).sort_index()
        bajado[str(anio)] = hoy.isoformat()
    df.attrs["bajado"] = bajado
    return df


def _robos(idx, out):
    from catalogo import S
    df = red.cache_df("dnrpa_robos", _bajar_robos)
    if df.empty:
        print("  Robos de autos: sin los ZIP de la DNRPA (sin copia en el respaldo); se omiten las series de robos y recuperos")
        return
    meses = pd.date_range(df.index.min(), df.index.max(), freq="MS")
    if len(meses) != len(df):
        raise ValueError("DNRPA robos: faltan meses en el conteo: " + ", ".join(f"{m:%Y-%m}" for m in meses.difference(df.index)[:6]))
    r, c = df["robos"], df["recuperos"]
    _control("Robos de autos ene-18", r.get(pd.Timestamp("2018-01-01")), 3066, 0)
    _control("Recuperos de autos ene-18", c.get(pd.Timestamp("2018-01-01")), 97, 0)
    _control("Robos de autos abr-20", r.get(pd.Timestamp("2020-04-01")), 824, 0)
    _control("Recuperos de autos abr-20", c.get(pd.Timestamp("2020-04-01")), 12, 0)
    _control("Robos de autos may-24", r.get(pd.Timestamp("2024-05-01")), 5013, 0)
    _control("Recuperos de autos may-24", c.get(pd.Timestamp("2024-05-01")), 120, 0)
    _control("Robos de autos sep-26", r.get(pd.Timestamp("2026-09-01")), 2464, 0)
    _control("Recuperos de autos sep-26", c.get(pd.Timestamp("2026-09-01")), 169, 0)
    comun = ("Cuenta los trámites de denuncia de robo o hurto inscriptos en los Registros Seccionales del Automotor (DNRPA, Ministerio de Justicia), "
             "no el total de denuncias policiales (el SNIC del Ministerio de Seguridad mide otra cosa); en algunas provincias se registran pocos. "
             "Solo autos: los robos de motos no se publican. ")
    out.append(S("robos_autos", "Robos y hurtos de autos (trámites en el Registro del Automotor)", CAT_SEG, "none", "autos", r.astype(float).reindex(idx), -1,
                 FUENTE_DNRPA_ROBOS, "Autos con denuncia de robo o hurto (o retención indebida) inscripta en el Registro en el mes. " + comun, agg=True))
    out.append(S("recuperos_autos", "Autos robados recuperados (trámites en el Registro)", CAT_SEG, "none", "autos", c.astype(float).reindex(idx), 1,
                 FUENTE_DNRPA_ROBOS, "Comunicaciones de recupero de autos robados inscriptas en el Registro en el mes. Se cuenta en el mes en que se comunica el recupero, "
                 "no en el del robo. " + comun, agg=True))


# ---------------------------------------------------------------- catálogo
def series(idx):
    from catalogo import _cacheado_dict  # aquí y no arriba: catalogo importa este módulo
    d = _cacheado_dict("trabajo_obra", IDS_API)
    out = []
    _puestos(d, idx, out)
    try:  # un empalme dudoso o un hueco entre tramos omite solo obra_publica, no las otras 10 series
        _obra(d, idx, out)
    except (ValueError, TypeError, ZeroDivisionError) as e:
        print(f"  ERROR: obra pública: {e}; se omite obra_publica")
    _empresas(idx, out)
    _motos(idx, out)
    _robos(idx, out)
    return out


if __name__ == "__main__":
    idx = pd.date_range("1990-01-01", pd.Timestamp.today().normalize().replace(day=1), freq="MS")
    for s in series(idx):
        v = s["v"].dropna()
        print(f"{s['id']}: {len(v)} datos, {v.index[0]:%Y-%m} a {v.index[-1]:%Y-%m}, último {v.iloc[-1]:,.2f}   [{' > '.join(s['cat'])}]")
