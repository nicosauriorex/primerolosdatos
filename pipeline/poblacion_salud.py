"""
Natalidad, nacimientos, defunciones, mortalidad, vacunación y personas pobres (docs/specs/datos-calientes-3.md, fase 1B y D-027).

Fuentes:
- Ministerio de Salud (DEIS) vía datos.gob.ar: tasa de natalidad (tn_arg) y defunciones (hdef_arg); el xlsx de datos.salud.gob.ar de la serie
  histórica de defunciones completa los años que la API todavía no trae.
- DEIS, datos.salud.gob.ar, dataset de nacidos vivos registrados: un CSV por período, con un renglón por combinación de características
  (suma de nacimientos_cantidad por año, por residencia de la madre). El de 2005-2022 pesa 68 MB: en el respaldo se guarda solo el conteo por año y
  grupo de edad de la madre (columnas g1 a g9 de deis_nacimientos; el total por año sale de sumarlas).
- Banco Mundial (indicador SP.DYN.TFRT.IN, estimación de la ONU): hijos por mujer, anual desde 1960.
- INDEC, proyecciones de población (cargadas a mano en datos/manual/mujeres_por_edad.json): mujeres por grupo quinquenal de edad, para la
  fecundidad de cuenta propia (docs/specs/tarifas-y-datos-calientes-4.md, 2C).
- OMS y UNICEF (WUENIC), API del Observatorio Mundial de la Salud (GHO): cobertura de vacunas.
- INDEC, cuadros de pobreza por semestre (cuadros_informe_pobreza_MM_AA.xls): personas pobres e indigentes de los 31 aglomerados urbanos.
  Una URL inexistente devuelve 200 con una página HTML: se valida la cabecera OLE antes de leer.
- Estimación para todo el país: tasa de pobreza de personas del INDEC (31 aglomerados) × población total (D-027).

Anuales en diciembre; semestrales como las tasas de pobreza de catalogo.indec_social (1.er semestre en enero, 2.º en julio).
Respaldos: datos/cache/poblacion_salud.pkl (APIs), deis_nacimientos.pkl, deis_defunciones.pkl, oms_vacunas.json, indec_pobreza_personas.pkl, bm_fecundidad.json.
"""
import io
import json
import re
import urllib.error
from pathlib import Path

import pandas as pd

import red
from mas_series import _control
from proteccion_social import _anual_a_diciembre

CAT_POB = ["Sociedad", "Población"]
CAT_SAL = ["Sociedad", "Salud"]
CAT_POBREZA = ["Empleo, pobreza e ingresos", "Pobreza (EPH, semestral)"]

ID_NATALIDAD = "tn_arg"
ID_DEFUNCIONES = "hdef_arg"

URL_PAQUETE_SALUD = "https://datos.salud.gob.ar/api/3/action/package_show?id="
PAQUETE_NACIMIENTOS = "d1350588-d8bb-4892-b21c-48738311e218"
PAQUETE_DEFUNCIONES = "76ce7d19-921d-4d17-bb20-73c1fe55f07e"
NACIMIENTOS_DESDE = 2005
RUTA_MUJERES = Path(__file__).resolve().parent.parent / "datos" / "manual" / "mujeres_por_edad.json"
GRUPOS_TGF = ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49"]
URL_BM_FECUNDIDAD = "https://api.worldbank.org/v2/country/ARG/indicator/SP.DYN.TFRT.IN?format=json&per_page=100"

URL_GHO = "https://ghoapi.azureedge.net/api/{}?$filter=SpatialDim eq 'ARG'"
VACUNAS = {  # id de la serie -> (código GHO, nombre, qué mide, población objetivo)
    "vacuna_dtp3": ("WHS4_100", "Vacunación: 3.ª dosis de DTP (difteria, tétanos y tos convulsa)", "la tercera dosis de la vacuna DTP (difteria, tétanos y tos convulsa)", "% de niños de 1 año"),
    "vacuna_sarampion1": ("WHS8_110", "Vacunación: 1.ª dosis contra el sarampión", "la primera dosis de la vacuna contra el sarampión", "% de niños"),
    "vacuna_sarampion2": ("MCV2", "Vacunación: 2.ª dosis contra el sarampión", "la segunda dosis de la vacuna contra el sarampión", "% de niños"),
    "vacuna_bcg": ("WHS4_543", "Vacunación: BCG (tuberculosis, al nacer)", "la vacuna BCG contra la tuberculosis, que se da al nacer", "% de recién nacidos"),
}
CONTROL_VACUNAS = {"vacuna_dtp3": {2010: 94, 2023: 66, 2025: 75}, "vacuna_sarampion1": {2010: 95, 2025: 82},
                   "vacuna_sarampion2": {2010: 94, 2025: 46}, "vacuna_bcg": {2010: 99, 2025: 81}}

URL_POBREZA = "https://www.indec.gob.ar/ftp/cuadros/sociedad/cuadros_informe_pobreza_{mm}_{aa}.xls"
POBREZA_DESDE = (2018, 1)  # 1.er semestre de 2018
HOJA_POBLACIONES = "Poblaciones (Ex cuadro 4.2)"

FUENTE_DEIS = "Dirección de Estadísticas e Información en Salud (Ministerio de Salud) vía datos.gob.ar, serie "
FUENTE_NAC = "Dirección de Estadísticas e Información en Salud (Ministerio de Salud), datos.salud.gob.ar, dataset «Nacidos vivos registrados en la República Argentina»"
FUENTE_BM = "Banco Mundial, indicador SP.DYN.TFRT.IN (Perspectivas de la Población Mundial de la ONU, WPP)"
FUENTE_TGF = (FUENTE_NAC + " (nacimientos por edad de la madre) e INDEC, proyecciones de población (mujeres por grupo de edad: base 2010 para 2010-2021 y base 2022 desde 2022)")
FUENTE_DEF = ("Dirección de Estadísticas e Información en Salud (Ministerio de Salud), serie hdef_arg de datos.gob.ar y planilla "
              "«Serie histórica de defunciones ocurridas en Argentina por jurisdicción 1914-2024» de datos.salud.gob.ar")
FUENTE_GHO = "OMS y UNICEF (WUENIC), Observatorio Mundial de la Salud de la OMS, indicador "
FUENTE_POBREZA = "INDEC, cuadros del informe de pobreza e indigencia (cuadros_informe_pobreza_MM_AA.xls), hoja de poblaciones por semestre"


def _ascii(s):
    import unicodedata
    return unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().strip().lower()


def _paquete(id_paquete):
    import json as _json
    return _json.loads(red.bajar(URL_PAQUETE_SALUD + id_paquete, timeout=60))["result"]["resources"]


# ---------------------------------------------------------------- nacimientos (DEIS)
def _leer_nacimientos(contenido):
    """Nacimientos por año y grupo de edad de la madre de un CSV de DEIS. Devuelve (DataFrame año × g1..g9, renglones leídos, renglones salteados).
    El grupo es el número con que empieza «edad_madre_grupo» (1 menor de 15, 2 15-19, 3 20-24, 4 25-29, 5 30-34, 6 35-39, 7 40-44, 8 45 y más, 9 sin especificar).
    El separador puede ser «,» o «;»."""
    primera = contenido[:2000].decode("utf-8-sig", errors="replace").splitlines()[0]
    sep = ";" if primera.count(";") > primera.count(",") else ","
    df = pd.read_csv(io.BytesIO(contenido), sep=sep, encoding="utf-8-sig", on_bad_lines="skip",
                     usecols=lambda c: c.strip().lower() in ("anio", "nacimientos_cantidad", "edad_madre_grupo"))
    df.columns = [c.strip().lower() for c in df.columns]
    lineas = contenido.count(b"\n") + (0 if contenido.endswith(b"\n") else 1) - 1  # sin el encabezado
    saltadas = max(lineas - len(df), 0)
    df["nacimientos_cantidad"] = pd.to_numeric(df["nacimientos_cantidad"], errors="coerce")
    g = df["edad_madre_grupo"].astype(str).str.extract(r"^\s*(\d)")[0].fillna("9")
    df["g"] = "g" + g.where(g != "0", "9")
    tabla = df.groupby(["anio", "g"])["nacimientos_cantidad"].sum().unstack(fill_value=0.0)
    for k in range(1, 10):
        if f"g{k}" not in tabla:
            tabla[f"g{k}"] = 0.0
    return tabla[[f"g{k}" for k in range(1, 10)]], len(df), saltadas


def _bajar_nacimientos():
    """Nacimientos por año y grupo de edad de la madre (g1..g9) y total: solo baja los años que no están en el respaldo con sus grupos
    (el CSV de 2005-2022 pesa 68 MB; un respaldo viejo que solo tenía el total obliga a bajarlo una vez)."""
    f = red.CACHE / "deis_nacimientos.pkl"
    previo = pd.read_pickle(f) if f.exists() else pd.DataFrame()
    cols = [f"g{k}" for k in range(1, 10)]
    tabla = previo[cols].copy() if all(c in previo for c in cols) else pd.DataFrame(columns=cols, dtype=float)
    tabla.index = tabla.index.astype(int)
    recursos = []
    for r in _paquete(PAQUETE_NACIMIENTOS):
        if str(r.get("format", "")).upper() != "CSV":
            continue
        anios = [int(a) for a in re.findall(r"(?<!\d)(20\d\d)(?!\d)", r.get("name", ""))]
        if anios:
            recursos.append((min(anios), max(anios), r))
    recursos.sort(key=lambda x: x[0] - x[1])  # primero los que cubren más años (el de 2005-2022 antes que los sueltos de 2017 y 2018)
    cubiertos = set(tabla.index)
    for a, b, r in recursos:
        faltan = set(range(a, b + 1)) - cubiertos
        if not faltan:
            continue
        s, n, saltadas = _leer_nacimientos(red.bajar(r["url"], timeout=300))
        print(f"  Nacimientos: {a}-{b}: {n:,} renglones leídos, {saltadas:,} salteados ({saltadas / max(n + saltadas, 1) * 100:.2f} %)".replace(",", "."))
        if n and saltadas / (n + saltadas) > 0.005:
            print(f"  AVISO: Nacimientos {a}-{b}: se salteó más del 0,5 % de las líneas del CSV")
        for anio, fila in s.iterrows():
            if int(anio) not in tabla.index:
                tabla.loc[int(anio)] = fila.values
        cubiertos |= set(int(x) for x in s.index)
    if tabla.empty:
        raise RuntimeError("nacimientos: no se encontró ningún CSV")
    tabla = tabla.sort_index().astype(float)
    tabla.insert(0, "nacimientos", tabla[cols].sum(axis=1))
    return tabla


def _tgf(nac, mujeres):
    """Tasa global de fecundidad = 5 × Σ (nacimientos del grupo / mujeres del grupo), grupos de 15-19 a 45-49. Los menores de 15 se suman a 15-19 y los
    «sin especificar» se reparten en proporción. `nac`: DataFrame año × g1..g9; `mujeres`: {año: {"15-19": n, ...}}. Devuelve Serie por año (solo años con las dos fuentes)."""
    out = {}
    for anio, fila in nac.iterrows():
        m = mujeres.get(int(anio))
        if not m:
            continue
        sin = fila["g9"]
        con = fila[[f"g{k}" for k in range(1, 9)]].sum()
        if con <= 0:
            continue
        k = (con + sin) / con
        grupos = [fila["g1"] + fila["g2"]] + [fila[f"g{i}"] for i in range(3, 9)]
        out[int(anio)] = 5 * sum(b * k / m[g] for b, g in zip(grupos, GRUPOS_TGF))
    return pd.Series(out, dtype=float).sort_index()


def _leer_mujeres(ruta=None):
    """{año: {grupo: mujeres}} de datos/manual/mujeres_por_edad.json, o None si no existe o no es válido (avisa)."""
    ruta = Path(ruta) if ruta else RUTA_MUJERES
    if not ruta.exists():
        print(f"  Fecundidad: falta {ruta.name} (mujeres por edad, a mano); se omite fecundidad")
        return None
    try:
        out = {}
        for r in json.loads(ruta.read_text(encoding="utf-8"))["anios"]:
            g = {k: float(r["grupos"][k]) for k in GRUPOS_TGF}
            if any(v <= 0 for v in g.values()):
                raise ValueError(f"{r['anio']}: un grupo sin mujeres")
            out[int(r["anio"])] = g
    except (KeyError, ValueError, TypeError) as e:
        print(f"  Fecundidad: {ruta.name} no tiene el formato esperado ({e!r}); se omite fecundidad")
        return None
    return out


# ---------------------------------------------------------------- fecundidad ONU (Banco Mundial)
def _bajar_fecundidad_bm():
    d = json.loads(red.bajar(URL_BM_FECUNDIDAD, timeout=60))
    filas = d[1] if isinstance(d, list) and len(d) > 1 and d[1] else []
    out = {str(int(x["date"])): float(x["value"]) for x in filas if x.get("value") is not None}
    if not out:
        raise RuntimeError("Banco Mundial SP.DYN.TFRT.IN: sin datos para ARG")
    return out


# ---------------------------------------------------------------- defunciones (xlsx de DEIS)
def _bajar_defunciones():
    cand = []
    for r in _paquete(PAQUETE_DEFUNCIONES):
        m = re.search(r"1914-(\d{4})", r.get("name", "") + " " + r.get("url", ""))
        if m and str(r.get("format", "")).upper() == "XLSX":
            cand.append((int(m.group(1)), r["url"]))
    if not cand:
        raise RuntimeError("no encontré la planilla de defunciones 1914-AAAA en datos.salud.gob.ar")
    url = max(cand)[1]
    raw = pd.read_excel(io.BytesIO(red.bajar(url, timeout=120)), sheet_name=0, header=None)
    if "argentina" not in _ascii(raw.iloc[0, 1]):
        raise RuntimeError(f"defunciones: la columna 1 de la planilla es «{raw.iloc[0, 1]}», esperaba la república argentina")
    s = pd.Series(pd.to_numeric(raw.iloc[1:, 1], errors="coerce").values, index=pd.to_datetime(raw.iloc[1:, 0]).dt.year).dropna()
    return pd.DataFrame({"defunciones": s.astype(float)})


# ---------------------------------------------------------------- vacunas (OMS)
def _bajar_vacunas():
    out = {}
    for k, (cod, *_) in VACUNAS.items():
        d = json.loads(red.bajar(URL_GHO.format(cod).replace(" ", "%20"), timeout=60))["value"]
        out[cod] = {str(int(x["TimeDim"])): float(x["NumericValue"]) for x in d if x.get("NumericValue") is not None}
        if not out[cod]:
            raise RuntimeError(f"OMS {cod}: sin datos para ARG")
    return out


# ---------------------------------------------------------------- pobreza en personas (INDEC)
def _num(v):
    """Número de una celda: viene como número o como texto con puntos de miles; «(1)» y otras marcas devuelven None."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, str):
        t = v.strip().replace(".", "")
        return int(t) if t.isdigit() else None
    return float(v)


def _leer_cuadro_pobreza(contenido):
    """(año, semestre, pobres, indigentes, población cubierta) del total de 31 aglomerados, en personas."""
    if contenido[:4] != b"\xd0\xcf\x11\xe0":
        return None
    xl = pd.ExcelFile(io.BytesIO(contenido))
    hoja = HOJA_POBLACIONES if HOJA_POBLACIONES in xl.sheet_names else next((h for h in xl.sheet_names if h.strip() == "Cuadro 4.2"), None)
    if hoja is None:
        raise RuntimeError(f"no encontré la hoja de poblaciones (hojas: {xl.sheet_names[:12]})")
    raw = xl.parse(hoja, header=None)
    cabecera = " ".join(_ascii(c) for c in raw.iloc[:8].values.ravel() if isinstance(c, str))
    m = re.search(r"(primer|segundo) semestre de (\d{4})", cabecera)
    if not m:
        raise RuntimeError(f"hoja «{hoja}»: no encontré el semestre en el título")
    sem, anio = (1 if m.group(1) == "primer" else 2), int(m.group(2))
    miles = "en miles" in cabecera
    fila = next((i for i in range(len(raw)) if isinstance(raw.iloc[i, 0], str) and _ascii(raw.iloc[i, 0]).startswith("total 31 aglomerados")), None)
    if fila is None:
        raise RuntimeError(f"hoja «{hoja}»: no encontré la fila «Total 31 aglomerados urbanos»")
    vals = [x for x in (_num(v) for v in raw.iloc[fila, 1:]) if x is not None]
    if len(vals) != 6:
        raise RuntimeError(f"hoja «{hoja}»: esperaba 6 cifras en el total de 31 aglomerados y encontré {len(vals)}")
    hog, pers, pob_hog, pobres, ind_hog, indig = [v * (1000 if miles else 1) for v in vals]
    if not (indig < pobres < pers and ind_hog < pob_hog < hog):
        raise RuntimeError(f"hoja «{hoja}»: las cifras no cierran (indigentes < pobres < población): {vals}")
    return anio, sem, pobres, indig, pers


def _bajar_pobreza_personas():
    """Tabla semestre -> (pobres, indigentes, población cubierta). Solo baja los semestres que no están en el respaldo; el semestre
    de un archivo `09_AA` es el 1.º de AA y el de `03_AA` es el 2.º de AA-1."""
    f = red.CACHE / "indec_pobreza_personas.pkl"
    tabla = pd.read_pickle(f) if f.exists() else pd.DataFrame(columns=["pobres", "indigentes", "poblacion_cubierta"])
    hoy = pd.Timestamp.today()
    respondio = False
    for aa in range(hoy.year, POBREZA_DESDE[0] - 1, -1):
        for mm in ("09", "03"):
            anio, sem = (aa, 1) if mm == "09" else (aa - 1, 2)
            clave = f"{anio}-{sem}"
            if (anio, sem) < POBREZA_DESDE or clave in tabla.index:
                continue
            try:
                c = red.bajar(URL_POBREZA.format(mm=mm, aa=f"{aa % 100:02d}"), timeout=120)
            except urllib.error.HTTPError:
                respondio = True  # el servidor contestó: ese archivo todavía no existe
                continue
            respondio = True
            r = _leer_cuadro_pobreza(c)
            if r is None:
                print(f"  Pobreza en personas: {mm}_{aa % 100:02d} no existe (el INDEC devuelve una página en vez del xls); falta el semestre {sem}.º de {anio}")
                continue
            if (r[0], r[1]) != (anio, sem):
                raise RuntimeError(f"pobreza en personas: {mm}_{aa % 100:02d} trae {r[1]}.º semestre de {r[0]}, esperaba {sem}.º de {anio}")
            tabla.loc[clave] = [r[2], r[3], r[4]]
    if not respondio:
        raise RuntimeError("sin respuesta del INDEC")
    return tabla.sort_index()


def _controlar_pobreza(tabla, tasas):
    """pobres / población cubierta × 100 = tasa de pobreza publicada (±0,2 puntos), en cada semestre que esté en las dos tablas."""
    malos, n = [], 0
    for clave, fila in tabla.iterrows():
        a, s = (int(x) for x in clave.split("-"))
        t = tasas.get(pd.Timestamp(a, 1 if s == 1 else 7, 1))
        if t is None or pd.isna(t):
            continue
        n += 1
        calc = fila["pobres"] / fila["poblacion_cubierta"] * 100
        if abs(calc - t) > 0.2:
            malos.append(f"{s}S-{a}: {calc:.2f} vs {t}")
    if malos:
        raise ValueError("Pobreza en personas: pobres / población cubierta distinto de la tasa publicada (±0,2): " + "; ".join(malos))
    print(f"  Pobreza en personas: pobres / población cubierta = tasa publicada (±0,2 puntos) en los {n} semestres que están en las dos tablas (control cumplido)")


def _fecha_semestre(clave):
    a, s = (int(x) for x in clave.split("-"))
    return pd.Timestamp(a, 1 if s == 1 else 7, 1)


def _fecundidad(idx, out, nac):
    from catalogo import S
    if "g9" not in nac:
        print("  Fecundidad: el respaldo de nacimientos no tiene grupos de edad; se omite fecundidad")
        return
    mujeres = _leer_mujeres()
    if mujeres is None:
        return
    tgf = _tgf(nac, mujeres)
    if tgf.empty:
        print("  Fecundidad: no hay años con nacimientos y mujeres por edad a la vez; se omite fecundidad")
        return
    for a, v in ((2014, 2.37), (2019, 1.86), (2022, 1.44), (2023, 1.34), (2024, 1.19)):
        real = tgf.get(a)
        if real is None or abs(real - v) > 0.03:
            print(f"  AVISO: Fecundidad {a} = {real if real is None else round(real, 3)}, esperado {v} (±0,03)")
        else:
            print(f"  Fecundidad {a} = {real:.3f} (esperado {v} ±0,03: control cumplido)")
    s = pd.Series(tgf.values, index=[pd.Timestamp(int(a), 1, 1) for a in tgf.index])
    out.append(S("fecundidad", "Fecundidad: hijos por mujer (nacimientos y población oficiales)", CAT_POB, "none", "hijos por mujer", _anual_a_diciembre(s).round(2).reindex(idx), 0, FUENTE_TGF,
                 "Cuenta propia: por cada grupo de edad de 15 a 49 años (de a cinco), nacimientos del año divididos por las mujeres de ese grupo, todo sumado y multiplicado por 5. "
                 "Los nacimientos son los registrados por el Ministerio de Salud según la edad de la madre (los de madres menores de 15 se suman al grupo de 15-19 y los de edad no especificada se reparten en proporción); "
                 "las mujeres, las proyecciones de población del INDEC (base 2010 hasta 2021 y base 2022 desde 2022: el cambio de proyección mueve un poco la serie en 2022). "
                 "Difiere de la estimación de la ONU (serie vecina): la ONU estima y desde 2020 sus valores quedan más altos que lo que surge de los registros. "
                 "El último año es provisorio, porque se siguen inscribiendo nacimientos tarde. Dato anual, se ubica en diciembre."))


# ---------------------------------------------------------------- catálogo
def series(idx, pob=None):
    from catalogo import S, _cacheado_dict  # aquí y no arriba: catalogo importa este módulo
    d = _cacheado_dict("poblacion_salud", [ID_NATALIDAD, ID_DEFUNCIONES])
    out = []
    hay_pob = pob is not None and not pob.dropna().empty
    if not hay_pob:
        print("  Población y salud: no hay población a mano; se omiten mortalidad, pobres_pais e indigentes_pais")

    # Natalidad
    if ID_NATALIDAD in d:
        nat = d[ID_NATALIDAD]
        _control("Natalidad 2010", nat.get(pd.Timestamp("2010-01-01")), 18.7)
        _control("Natalidad 2024", nat.get(pd.Timestamp("2024-01-01")), 8.9)
        out.append(S("natalidad", "Tasa de natalidad", CAT_POB, "none", "nacimientos cada 1.000 habitantes", _anual_a_diciembre(nat).reindex(idx), 0, FUENTE_DEIS + ID_NATALIDAD,
                     "Nacidos vivos de cada año cada 1.000 habitantes (Dirección de Estadísticas e Información en Salud, Ministerio de Salud). "
                     "Dato anual, se ubica en diciembre; el último año sale con unos dos años de atraso."))
    else:
        print(f"  Población y salud: falta {ID_NATALIDAD} (sin copia en el respaldo); se omite natalidad")

    # Fecundidad de la ONU (Banco Mundial)
    bm = red.cache_json("bm_fecundidad", _bajar_fecundidad_bm)
    if not bm:
        print("  Población y salud: sin datos del Banco Mundial (sin copia en el respaldo); se omite fecundidad_onu")
    else:
        s = pd.Series({pd.Timestamp(int(a), 1, 1): v for a, v in bm.items()}).sort_index()
        _control("Fecundidad ONU 2014", s.get(pd.Timestamp("2014-01-01")), 2.386, 0.0005)
        _control("Fecundidad ONU 2024", s.get(pd.Timestamp("2024-01-01")), 1.504, 0.0005)
        out.append(S("fecundidad_onu", "Fecundidad: hijos por mujer (estimación de la ONU)", CAT_POB, "none", "hijos por mujer", _anual_a_diciembre(s).round(3).reindex(idx), 0, FUENTE_BM,
                     "Cantidad de hijos que tendría en promedio una mujer a lo largo de su vida si tuviera los hijos que hoy tienen las mujeres de cada edad. "
                     "Es una estimación de las Naciones Unidas (Perspectivas de la Población Mundial) que difunde el Banco Mundial: no sale de los nacimientos registrados en el país, "
                     "y desde 2020 queda bastante más alta que la cuenta con los datos oficiales argentinos (serie vecina). Con unos 2,1 hijos por mujer la población se mantiene sin migración. "
                     "Dato anual, se ubica en diciembre."))

    # Nacimientos
    nac = red.cache_df("deis_nacimientos", _bajar_nacimientos)
    if nac.empty:
        print("  Población y salud: sin los CSV de nacimientos (sin copia en el respaldo); se omite nacimientos")
    else:
        tn = nac["nacimientos"]
        _control("Nacimientos 2010", tn.get(2010), 756176, 0)
        _control("Nacimientos 2024", tn.get(2024), 413135, 0)
        s = _anual_a_diciembre(pd.Series(tn.values, index=[pd.Timestamp(int(a), 1, 1) for a in tn.index]))
        out.append(S("nacimientos", "Nacimientos", CAT_POB, "none", "nacidos vivos", s.reindex(idx), 0, FUENTE_NAC,
                     "Nacidos vivos registrados en el país en el año, contados por la provincia donde vive la madre (Dirección de Estadísticas e Información en Salud, Ministerio de Salud). "
                     "No es el mismo criterio que las defunciones, que se cuentan donde ocurren. Dato anual, se ubica en diciembre; sale con unos dos años de atraso."))

        _fecundidad(idx, out, nac)

    # Defunciones y mortalidad
    xl = red.cache_df("deis_defunciones", _bajar_defunciones)
    api = pd.Series(d[ID_DEFUNCIONES].values, index=d[ID_DEFUNCIONES].index.year) if ID_DEFUNCIONES in d else pd.Series(dtype=float)
    plan = xl["defunciones"] if not xl.empty else pd.Series(dtype=float)
    if api.empty and plan.empty:
        print("  Población y salud: sin defunciones (ni API ni planilla en el respaldo); se omiten defunciones y mortalidad")
    else:
        comun = api.index.intersection(plan.index)
        dif = (api[comun] - plan[comun]).abs()
        if len(dif):
            print(f"  Defunciones: API y planilla coinciden en {int((dif <= 0.5).sum())} de {len(comun)} años" + ("" if (dif <= 0.5).all() else f"; difieren en {list(dif[dif > 0.5].index)}"))
        tot = api.combine_first(plan).sort_index()
        print(f"  Defunciones: años {tot.index.min()}-{tot.index.max()} (API hasta {api.index.max() if len(api) else '—'}, planilla hasta {plan.index.max() if len(plan) else '—'})")
        for a, v in ((2021, 436799), (2023, 353428), (2024, 376405)):
            _control(f"Defunciones {a}", tot.get(a), v, 0)
        s = _anual_a_diciembre(pd.Series(tot.values, index=[pd.Timestamp(int(a), 1, 1) for a in tot.index]))
        out.append(S("defunciones", "Defunciones", CAT_POB, "none", "muertes", s.reindex(idx), 0, FUENTE_DEF,
                     "Muertes ocurridas en el país en el año, cualquiera sea la provincia de residencia de la persona (Dirección de Estadísticas e Información en Salud, Ministerio de Salud). "
                     "No es el mismo criterio que los nacimientos, que se cuentan por residencia de la madre. En 2020-2022 hay exceso de mortalidad por el covid. "
                     "Dato anual, se ubica en diciembre; sale con más de un año de atraso."))
        if hay_pob:
            m = (s.reindex(idx) / pob.reindex(idx) * 1000).dropna()
            out.append(S("mortalidad", "Tasa de mortalidad", CAT_POB, "none", "muertes cada 1.000 habitantes", m.round(2).reindex(idx), 0,
                         FUENTE_DEF + "; población: INDEC, proyecciones",
                         "Cuenta propia: defunciones del año divididas por la población que el INDEC estima para diciembre de ese año, por 1.000. "
                         "Puede diferir levemente de la tasa que publica el Ministerio, que usa la población a mitad de año. "
                         "En 2020-2022 hay exceso de mortalidad por el covid. Dato anual, se ubica en diciembre."))

    # Vacunas
    vac = red.cache_json("oms_vacunas", _bajar_vacunas)
    if not vac:
        print("  Población y salud: sin datos de la OMS (sin copia en el respaldo); se omiten las vacunas")
    else:
        for k, (cod, n, que, u) in VACUNAS.items():
            if cod not in vac:
                print(f"  Población y salud: falta {cod} en el respaldo de la OMS; se omite {k}")
                continue
            s = pd.Series({pd.Timestamp(int(a), 1, 1): v for a, v in vac[cod].items()}).sort_index()
            if ((s < 0) | (s > 100)).any():
                raise ValueError(f"Vacunas {k}: valores fuera de 0-100 ({s.min()}-{s.max()})")
            for a, v in CONTROL_VACUNAS[k].items():
                _control(f"{k} {a}", s.get(pd.Timestamp(a, 1, 1)), v, 0)
            out.append(S(k, n, CAT_SAL, "none", u, _anual_a_diciembre(s).reindex(idx), 1, FUENTE_GHO + cod,
                         f"Cobertura de {que} en Argentina según la estimación de la OMS y UNICEF (WUENIC), que cada año revisa la serie hacia atrás. "
                         "El Ministerio de Salud informa coberturas más altas con su registro nominal de vacunación (NOMIVAC; en 2025 dijo quíntuple 91,6 % y BCG 93,5 %): "
                         "son métodos distintos, no un error. Dato anual, se ubica en diciembre."))

    # Pobreza en personas
    tabla = red.cache_df("indec_pobreza_personas", _bajar_pobreza_personas)
    # tasas oficiales de personas (las mismas series de catalogo.indec_social, de su respaldo)
    tp = red.cache_df("indec_pobreza", lambda: (_ for _ in ()).throw(RuntimeError("se usa el respaldo que arma catalogo.indec_social")))
    tasas = {}
    if not tp.empty:
        t31 = tp[tp["area_geografica_nom"] == "T_31_A"].copy()
        t31["fecha"] = pd.to_datetime(t31["anio"].astype(int).astype(str) + "-" + t31["semestre"].map({1: "01", 2: "07"}) + "-01")
        tasas = {c: t31.set_index("fecha")[c].astype(float) for c in ("tasa_pobreza_personas", "tasa_indigencia_personas")}
    # Si el control pobres / población cubierta = tasa no cierra, se omiten solo las dos series de 31 aglomerados (no todo el grupo).
    control_ok = True
    if not tabla.empty and tasas:
        try:
            _controlar_pobreza(tabla, tasas["tasa_pobreza_personas"])
        except ValueError as e:
            print(f"  ERROR: {e}; se omiten pobres_31 e indigentes_31")
            control_ok = False
    if tabla.empty:
        print("  Población y salud: sin los cuadros de pobreza del INDEC (sin copia en el respaldo); se omiten pobres_31 e indigentes_31")
    elif control_ok:
        _control("Pobres 31 aglomerados 1S-18", tabla["pobres"].get("2018-1"), 7581118, 0)
        _control("Pobres 31 aglomerados 2S-24", tabla["pobres"].get("2024-2"), 11337979, 0)
        _control("Pobres 31 aglomerados 1S-26", tabla["pobres"].get("2026-1"), 9729000, 0)
        _control("Población cubierta 1S-26", tabla["poblacion_cubierta"].get("2026-1"), 30143000, 0)
        fechas = [_fecha_semestre(c) for c in tabla.index]
        faltan = [f"{(2 if f.month == 7 else 1)}S-{f.year}" for f in pd.date_range(min(fechas), max(fechas), freq="6MS") if f not in fechas]
        if faltan:
            print(f"  Pobreza en personas: semestres sin dato: {', '.join(faltan)}")
        cub = tabla["poblacion_cubierta"].iloc[-1] / 1e6
        ult = tabla.index[-1].split("-")
        ult_txt = f"{ult[1]}.º semestre de {ult[0]}"
        comun = ("Dato semestral del INDEC (se ubica en enero y julio). El INDEC mide la pobreza solo en 31 aglomerados urbanos "
                 f"(unos {cub:.0f} millones de personas, cerca de dos tercios de la población del país): no cuenta a las ciudades chicas ni a la zona rural. "
                 f"Los datos del {ult_txt} son provisorios si así lo marca el INDEC. ")
        for k, col, n, que, dr in [("pobres_31", "pobres", "Personas pobres (31 aglomerados urbanos)", "pobres (con ingresos por debajo de la canasta básica total)", -1),
                                   ("indigentes_31", "indigentes", "Personas indigentes (31 aglomerados urbanos)", "indigentes (con ingresos por debajo de la canasta básica alimentaria)", -1)]:
            v = pd.Series(tabla[col].astype(float).values, index=fechas)
            out.append(S(k, n, CAT_POBREZA, "none", "personas", v.reindex(idx), dr, FUENTE_POBREZA,
                         f"Cantidad de personas {que} en los 31 aglomerados urbanos que mide la Encuesta Permanente de Hogares. " + comun
                         + "Falta el 2.º semestre de 2019: el INDEC no publicó ese archivo en su servidor."))

    # Estimación para todo el país (D-027)
    if tasas and hay_pob:
        for k, col, n, que in [("pobres_pais", "tasa_pobreza_personas", "Personas pobres en todo el país (estimación propia)", "pobres"),
                               ("indigentes_pais", "tasa_indigencia_personas", "Personas indigentes en todo el país (estimación propia)", "indigentes")]:
            t = tasas[col].reindex(idx)
            v = (t / 100 * pob.reindex(idx)).dropna().round(-3)
            out.append(S(k, n, CAT_POBREZA, "none", "personas", v.reindex(idx), -1, FUENTE_POBREZA + "; población: INDEC, proyecciones",
                         f"Estimación propia, no es una cifra oficial: tasa de personas {que} de los 31 aglomerados que mide el INDEC por la población total del país de ese mes. "
                         "Supone que el resto del país (ciudades chicas y zona rural, cerca de un tercio de la población) tiene la misma tasa que los 31 aglomerados, algo que no se sabe. "
                         "La cifra oficial es la de 31 aglomerados, que está en la serie vecina. Dato semestral (se ubica en enero y julio), redondeado a miles."))
    elif not tasas:
        print("  Población y salud: sin las tasas de pobreza del INDEC; se omiten pobres_pais e indigentes_pais")
    return out


if __name__ == "__main__":
    idx = pd.date_range("1990-01-01", pd.Timestamp.today().normalize().replace(day=1), freq="MS")
    import catalogo
    pob = next((s["v"] for s in catalogo.datos_gob(idx) if s["id"] == "poblacion"), None)
    for s in series(idx, pob):
        v = s["v"].dropna()
        print(f"{s['id']}: {len(v)} datos, {v.index[0]:%Y-%m} a {v.index[-1]:%Y-%m}, último {v.iloc[-1]:,.2f}   [{' > '.join(s['cat'])}]")
