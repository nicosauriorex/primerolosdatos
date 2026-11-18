"""
Semáforo de actividad: unos 30 indicadores mensuales para web/public/datos/semaforo.json.
Cada indicador lleva su serie original (`orig`) y su serie sin estacionalidad (`sa`), mensuales desde `f0`.

Sin estacionalidad:
- "oficial": se baja la serie oficial desestacionalizada y la original (INDEC, Sec. de Trabajo).
- "propia": X-13 ARIMA-SEATS (statsmodels + binario del Census) si está disponible y USAR_X13 es True; si no, método clásico
  de promedios móviles en pandas/numpy (ver `desestacionalizar`). Cada indicador dice cuál usó (`metodo`).
- "manual": solo variaciones cargadas a mano de notas de prensa (datos/manual/semaforo_manual.json), cada mes con su cita.
- "ninguno": índice de encuesta (confianza del consumidor): sa = orig.
Las series en pesos ("real") se deflactan con el IPC empalmado del sitio (ipc_empalme de datos/cache/compilado.json).
Cada fuente se guarda en datos/cache/sem_<clave>.csv (las oficiales, además sem_<clave>_sa.csv): si la bajada
falla se usa esa copia, y con `con_red=False` (--solo-json) se arma solo con las copias.

Uso suelto:  python pipeline/semaforo.py --bajar   (baja solo estas series y deja los respaldos, sin armar el JSON)
             python pipeline/semaforo.py --bajar --pozos-locales <carpeta con los CSV de pozos>   (además arma datos/cache/petroleo_pozos.csv y
                 lo compara con la serie histórica; nunca baja los archivos de pozos, que pesan 250 a 330 MB cada uno)
             python pipeline/semaforo.py --validar-x13   (tabla de errores de X-13 contra promedios, con las series oficiales)
"""
import io
import json
import sys
import unicodedata
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd

import red
from salarios import _serie_api

CACHE = red.CACHE
MAX_ATRASO_MESES = 4
MAX_SALTO_PCT = 60  # variación de un mes que ya parece un error de carga
MIN_MESES_PROPIA = 36
VENTANA_PROPIA = 180  # meses que usa el método propio para estimar los factores estacionales
MESES_CONTROL = 120
MIN_FILAS_RESPALDO = 0.8  # una bajada con menos de esta parte de las filas del respaldo se toma como falla
NAFTAS_CONOCIDAS = 5
USAR_X13 = True  # decidido con la validación de docs/specs/pendientes-de-datos.md (A3); False deja el código pero usa solo promedios
MIN_PARTE_POZOS = 0.8  # un mes de pozos con menos de esta parte de las filas de la mediana de los 12 meses anteriores es incompleto
MANUAL = red.CACHE.parent / "manual" / "semaforo_manual.json"

_CSV = "https://infra.datos.gob.ar/catalog/sspm/dataset/{d}/distribution/{d}.{v}/download/{n}"
URL_ACERO = _CSV.format(d=359, v=3, n="datos-historicos-de-la-industria-siderurgica-datos-mensulaes.csv")
URL_NAFTAS = _CSV.format(d=365, v=3, n="actividad-empresas.csv")
URL_PESCA = _CSV.format(d=39, v=3, n="captura-pesquera-por-categorias-valores-mensuales.csv")
URL_MINERIA = "https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipi_minero.xlsx"
URL_OCLA = "https://www.ocla.org.ar/NewsFiles/BaseDeDatosOCLA.xlsx"
LECHE_DESDE = "2015-01"  # la hoja mensual cambia de serie entre dic-2014 y ene-2015 (la «Nueva Serie 2018» de OCLA empieza en 2015)
URL_ENERGIA = "http://datos.energia.gob.ar/api/3/action/package_show?id=c846e79c-026c-4040-897f-1ad3543b407c"
URL_ESCRIBANOS = "https://www.colegio-escribanos.org.ar/noticias/{mes}-{anio}-Comparativo-anual-por-mes.xls"
MESES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
ANIOS_ESCRIBANOS = 3  # de cada mes se prueba el año en curso y los dos anteriores hasta encontrar un archivo publicado

# clave, grupo, nombre público, organismo, unidad, fuente de la serie, ajuste, real, id del catálogo del sitio o None.
# Fuente: ("dgo", id[, id de la original]) | ("csv", url, columna o columnas que se suman) | ("minero",) | ("dnrpa",) | ("petroleo",) | ("leche",) | ("escrituras_caba",)
INDICADORES = [
    ("emae", "General", "Actividad económica (EMAE)", "INDEC", "índice 2004=100",
     ("dgo", "143.3_NO_PR_2004_A_31", "143.3_NO_PR_2004_A_21"), "oficial", False, "143.3_NO_PR_2004_A_31"),
    ("ipi", "Industria", "Producción industrial", "INDEC", "índice 2004=100",
     ("dgo", "453.1_SERIE_DESEADA_0_0_24_58", "453.1_SERIE_ORIGNAL_0_0_14_46"), "oficial", False, "453.1_SERIE_DESEADA_0_0_24_58"),
    # Producción de autos fuera: la serie 41.3_AA_0_A_23 da ~100 mil por mes (ADEFA informa 45 a 55 mil) y repite valores.
    ("acero", "Industria", "Producción de acero", "Cámara Argentina del Acero", "miles de toneladas",
     ("csv", URL_ACERO, "acero_crudo"), "propia", False, None),
    ("hierro", "Industria", "Producción de hierro", "Cámara Argentina del Acero", "miles de toneladas",
     ("csv", URL_ACERO, "hierro_primario_total"), "propia", False, None),
    ("mineria", "Industria", "Producción minera", "INDEC", "índice 2016=100",
     ("minero",), "oficial", False, None),
    ("isac", "Construcción", "Actividad de la construcción (ISAC)", "INDEC", "índice 2004=100",
     ("dgo", "33.2_ISAC_SIN_EDAD_0_M_23_56", "33.2_ISAC_NIVELRAL_0_M_18_63"), "oficial", False, "33.2_ISAC_SIN_EDAD_0_M_23_56"),
    ("cemento", "Construcción", "Ventas de cemento", "AFCP", "miles de toneladas",
     ("dgo", "38.3_CEM_1994_M_7"), "propia", False, "38.3_CEM_1994_M_7"),
    ("gas", "Energía", "Producción de gas", "Secretaría de Energía", "millones de m³",
     ("dgo", "41.3_GN_0_A_11"), "propia", False, "41.3_GN_0_A_11"),
    ("electricidad", "Energía", "Demanda de electricidad", "CAMMESA", "GWh",
     ("dgo", "367.3_DEMANDA_TOTAL__13"), "propia", False, None),
    ("naftas", "Energía", "Venta de naftas", "Secretaría de Energía", "metros cúbicos",
     ("csv", URL_NAFTAS, "prefijo:ventas_naftas_"), "propia", False, None),
    ("faena_vacuna", "Agro y pesca", "Faena vacuna", "Sec. de Agricultura", "cabezas",
     ("dgo", "40.3_VC_0_M_15"), "propia", False, None),
    ("faena_aves", "Agro y pesca", "Faena de aves", "Sec. de Agricultura", "toneladas",
     ("dgo", "40.3_AT_0_M_14"), "propia", False, None),
    ("trigo", "Agro y pesca", "Producción de harina de trigo", "Sec. de Agricultura", "miles de toneladas",
     ("dgo", "41.3_H_0_A_10"), "propia", False, None),
    ("soja", "Agro y pesca", "Molienda de soja", "INDEC (rama del índice industrial)", "índice 2004=100",
     ("dgo", "453.2_MOLIENDA_OSAS_0_0_20_8"), "propia", False, None),
    ("pesca", "Agro y pesca", "Pesca", "Sec. de Agricultura", "toneladas",
     ("csv", URL_PESCA, "total_general"), "propia", False, None),
    ("divisas_agro", "Agro y pesca", "Liquidación de divisas del agro", "CIARA-CEC", "millones de US$",
     ("dgo", "349.2_ACUM_MENSUAL__13"), "propia", False, None),
    ("supermercados", "Consumo", "Ventas en supermercados (reales)", "INDEC", "millones de $ de 2017",
     ("dgo", "455.1_VENTAS_PRETES_0_M_25_98"), "propia", False, "455.1_VENTAS_PRETES_0_M_25_98"),
    ("shoppings", "Consumo", "Ventas en centros de compra (reales)", "INDEC", "miles de $ de 2017",
     ("dgo", "458.1_VENTAS_TOTTES_ABRI_M_33_40"), "propia", False, "458.1_VENTAS_TOTTES_ABRI_M_33_40"),
    ("confianza", "Consumo", "Confianza del consumidor", "UTDT", "puntos (0 a 100)",
     ("dgo", "380.3_ICC_NACIONNAL_0_T_12"), "ninguno", False, "380.3_ICC_NACIONNAL_0_T_12"),
    ("iva", "Fiscal", "Recaudación de IVA (real)", "Min. de Economía", "millones de $ constantes",
     ("dgo", "142.3_IVA_D_2001_M_7"), "propia", True, None),
    ("debcred", "Fiscal", "Impuesto a créditos y débitos (real)", "Min. de Economía", "millones de $ constantes",
     ("dgo", "142.3_CREDI_2001_M_24"), "propia", True, None),
    ("segsocial", "Fiscal", "Aportes a la seguridad social (real)", "Min. de Economía", "millones de $ constantes",
     ("dgo", "142.3_SISTE_2001_M_24"), "propia", True, None),
    ("prest_personales", "Crédito", "Préstamos personales (reales)", "BCRA", "millones de $ constantes",
     ("dgo", "91.1_DETALLE_PRLES_0_0_52"), "propia", True, None),
    ("prest_comerciales", "Crédito", "Préstamos comerciales (reales)", "BCRA", "millones de $ constantes",
     ("dgo", "91.1_PRESTAMOS_LES_0_0_37"), "propia", True, None),
    ("expo", "Comercio exterior", "Exportaciones", "INDEC", "millones de US$",
     ("dgo", "74.3_IET_0_M_16"), "propia", False, "74.3_IET_0_M_16"),
    ("impo", "Comercio exterior", "Importaciones", "INDEC", "millones de US$",
     ("dgo", "74.3_IIT_0_M_25"), "propia", False, "74.3_IIT_0_M_25"),
    ("expo_brasil", "Comercio exterior", "Exportaciones a Brasil", "INDEC", "millones de US$",
     ("dgo", "77.3_IEB_0_A_24"), "propia", False, None),
    ("impo_brasil", "Comercio exterior", "Importaciones desde Brasil", "INDEC", "millones de US$",
     ("dgo", "78.3_IIB_0_A_24"), "propia", False, None),
    ("patentamientos", "Consumo", "Patentamientos de autos", "DNRPA", "autos",
     ("dnrpa",), "propia", False, None),
    ("petroleo", "Energía", "Producción de petróleo", "Secretaría de Energía (Capítulo IV)", "metros cúbicos",
     ("petroleo",), "propia", False, None),
    ("leche", "Agro y pesca", "Producción de leche", "OCLA", "millones de litros",
     ("leche",), "propia", False, None),
    ("escrituras_caba", "Construcción", "Escrituras en la Ciudad de Buenos Aires", "Colegio de Escribanos de la Ciudad", "cantidad de actos",
     ("escrituras_caba",), "propia", False, None),
    ("empleo", "Empleo", "Empleo privado registrado", "Sec. de Trabajo", "miles de personas",
     ("dgo", "151.1_AARIADOTAC_2012_M_26", "151.1_AARIADODAD_2012_M_31"), "oficial", False, "151.1_AARIADOTAC_2012_M_26"),
]


# ---------- bajada ----------

def _a_mes(s):
    """Serie con índice al primer día de cada mes, sin repetidos ni vacíos, ordenada."""
    s = pd.Series(s).astype("float64").dropna()
    s.index = pd.DatetimeIndex(s.index).to_period("M").to_timestamp()
    s = s[~s.index.duplicated(keep="last")].sort_index()
    return s


def _bajar_dgo(sid):
    s = _serie_api(sid)
    if len(s) > 2:
        paso = pd.Series(s.index).diff().dt.days.median()
        if paso < 20:  # diaria: se resume en promedio mensual
            s = s.groupby(s.index.to_period("M").to_timestamp()).mean()
    return _a_mes(s)


def _bajar_csv(url, cols):
    df = pd.read_csv(io.BytesIO(red.bajar(url)), parse_dates=["indice_tiempo"]).set_index("indice_tiempo")
    if isinstance(cols, str) and cols.startswith("prefijo:"):
        pre = cols[len("prefijo:"):]
        cols = [c for c in df.columns if str(c).startswith(pre)]
        if len(cols) != NAFTAS_CONOCIDAS:
            print(f"  Semáforo: posible error, las columnas '{pre}*' son {len(cols)} y eran {NAFTAS_CONOCIDAS} ({cols}); revisar la fuente")
        if not cols:
            raise ValueError(f"no hay columnas '{pre}*'")
    cols = [cols] if isinstance(cols, str) else cols
    faltan = [c for c in cols if c not in df.columns]
    if faltan:
        raise ValueError(f"faltan columnas {faltan}")
    parte = df[cols].apply(pd.to_numeric, errors="coerce")
    # Suma de columnas: el mes cuenta solo si están todas (si falta alguna, la suma subestimaría)
    s = parte.sum(axis=1, min_count=len(cols)).where(parte.notna().all(axis=1))
    return _a_mes(s)


MESES = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
         "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}


def _bajar_minero():
    """IPI minero (INDEC, Cuadro 1): devuelve (original, desestacionalizada). Columnas: 1 año, 2 mes, 3 original, 7 desest."""
    d = pd.read_excel(io.BytesIO(red.bajar(URL_MINERIA)), sheet_name="Cuadro 1", header=None)
    cab = lambda f, c: str(d.iloc[f, c]).lower()  # noqa: E731
    if (d.shape[1] < 8 or "serie original" not in cab(3, 3) or "nivel general" not in cab(4, 3)
            or "desestacionalizada" not in cab(3, 7) or "nivel general" not in cab(4, 7)):
        raise ValueError("el cuadro 1 del IPI minero cambió de columnas (cabeceras distintas de las esperadas)")
    anio = None
    orig, sa = {}, {}
    for _, f in d.iterrows():
        a = f.iloc[1]
        if pd.notna(a):
            try:
                anio = int(str(a).strip().rstrip("*").strip())
            except ValueError:
                pass
        mes = MESES.get(str(f.iloc[2]).strip().lower())
        if anio is None or mes is None:
            continue
        fecha = pd.Timestamp(anio, mes, 1)
        o, s = pd.to_numeric(f.iloc[3], errors="coerce"), pd.to_numeric(f.iloc[7], errors="coerce")
        if pd.notna(o):
            orig[fecha] = float(o)
        if pd.notna(s):
            sa[fecha] = float(s)
    if not orig or not sa:
        raise ValueError("no se encontraron los datos del cuadro 1")
    return _a_mes(pd.Series(orig)), _a_mes(pd.Series(sa))


def _sin_tildes(x):
    return "".join(c for c in unicodedata.normalize("NFD", str(x)) if unicodedata.category(c) != "Mn").lower()


def _bajar_dnrpa_mensual():
    """Inscripciones iniciales de automotores (DNRPA), suma de todas las provincias, reutilizando la bajada de mas_series (caché dnrpa_autos)."""
    import mas_series
    df = red.cache_df("dnrpa_autos", mas_series._bajar_dnrpa)
    if df.empty or "inscripciones" not in df:
        raise ValueError("sin datos de la DNRPA")
    p = df["inscripciones_provincias"].dropna()
    if (p < 20).any():
        raise ValueError("DNRPA: meses con menos de 20 provincias")
    return _a_mes(df["inscripciones"].astype("float64"))


def _bajar_leche():
    """Producción nacional de leche (OCLA, hoja «Series Mensuales»), millones de litros por mes, desde LECHE_DESDE."""
    d = pd.read_excel(io.BytesIO(red.bajar(URL_OCLA, timeout=120)), sheet_name="Series Mensuales")
    col = next((c for c in d.columns if str(c).upper().startswith("PRODUCCION NACIONAL DE LECHE")), None)
    if col is None:
        raise ValueError("la hoja «Series Mensuales» de OCLA ya no tiene la columna de producción nacional de leche")
    s = pd.Series(pd.to_numeric(d[col], errors="coerce").to_numpy(), index=pd.to_datetime(d.iloc[:, 0], errors="coerce")).dropna()
    s = s[s.index.notna()]
    s = _a_mes(s)
    if s.index[0] > pd.Timestamp("2000-01-01") or not 300 < s.mean() < 1500:
        raise ValueError("la serie de leche de OCLA cambió de forma o de unidad")
    return s[s.index >= pd.Timestamp(LECHE_DESDE)]


def _recurso_historico_petroleo():
    rec = json.loads(red.bajar(URL_ENERGIA, timeout=60))["result"]["resources"]
    for r in rec:
        n = _sin_tildes(r.get("name", ""))
        if str(r.get("format", "")).upper() == "CSV" and "serie historica" in n and "petroleo" in n and "cuenca" in n:
            return r["url"]
    raise RuntimeError("no encontré la serie histórica de producción de petróleo en el dataset de la Secretaría de Energía")


def _bajar_petroleo():
    """Producción de petróleo por mes (Secretaría de Energía, Capítulo IV), en metros cúbicos: la «serie histórica de producción de petróleo por cuenca».
    Es la suma mensual de `prod_pet` de los pozos (se controla con los CSV de pozos, ver `control_pozos`) en un archivo chico, así que no se bajan los de 300 MB."""
    df = pd.read_csv(io.BytesIO(red.bajar(_recurso_historico_petroleo(), timeout=120)), encoding="utf-8-sig")
    cuencas = [c for c in df.columns if str(c).startswith("cuenca_")]
    if "indice_tiempo" not in df or "total" not in df or len(cuencas) < 4:
        raise ValueError("la serie histórica de petróleo cambió de columnas")
    dif = (df[cuencas].sum(axis=1) - df["total"]).abs() / df["total"]
    if (dif > 0.005).any():
        raise ValueError("en la serie histórica de petróleo el total no es la suma de las cuencas (±0,5 %)")
    s = _a_mes(pd.Series(pd.to_numeric(df["total"], errors="coerce").to_numpy(), index=pd.to_datetime(df["indice_tiempo"] + "-01")))
    if not 1e6 < s.iloc[-1] < 1e7:
        raise ValueError(f"el último mes de petróleo ({s.iloc[-1]:,.0f} m³) no está en el rango esperado")
    return s


def _escrituras_archivo(mes, anio):
    """{año: actos} de un archivo «<Mes>-<AAAA>-Comparativo-anual-por-mes.xls» (ese mes en todos los años), o None si no está publicado."""
    try:
        b = red.bajar(URL_ESCRIBANOS.format(mes=MESES_ES[mes - 1], anio=anio), timeout=60)
    except Exception:  # noqa: BLE001
        return None
    if not b.startswith(b"\xd0\xcf\x11\xe0"):  # una página de error HTML, no un XLS
        return None
    libro = pd.ExcelFile(io.BytesIO(b), engine="xlrd")
    hoja = "Hoja1" if "Hoja1" in libro.sheet_names else libro.sheet_names[0]  # a veces la primera hoja del libro está vacía
    d = pd.read_excel(libro, sheet_name=hoja, header=None)
    out = {}
    for _, f in d.iterrows():  # el rótulo «Año 2016» está en la columna 0 o en la 1 según el archivo; la cantidad de actos, a su derecha
        for c in range(min(2, len(f))):
            txt = str(f.iloc[c]).strip()
            if txt.startswith("A") and txt[-4:].isdigit() and len(txt) <= 9:
                v = pd.to_numeric(f.iloc[c + 1], errors="coerce")
                if pd.notna(v):
                    out[int(txt[-4:])] = float(v)
                break
    if len(out) < 3 or anio not in out:
        return None
    return out


def _bajar_escrituras_caba():
    """Cantidad de actos de escrituras en la Ciudad de Buenos Aires (Colegio de Escribanos). Cada archivo trae un mes en todos los años desde 2016:
    de cada uno de los 12 meses se toma el archivo más nuevo publicado. Se compara contra el del año anterior en los años que se superponen."""
    hoy = datetime.now(timezone(timedelta(hours=-3))).year
    datos = {}
    for mes in range(1, 13):
        archivos = []
        for anio in range(hoy, hoy - ANIOS_ESCRIBANOS, -1):
            a = _escrituras_archivo(mes, anio)
            if a:
                archivos.append((anio, a))
                if len(archivos) == 2:
                    break
        if not archivos:
            continue
        (_, nuevo) = archivos[0]
        if len(archivos) == 2:
            _, viejo = archivos[1]
            difs = {y: (viejo[y], nuevo[y]) for y in viejo if y in nuevo and abs(viejo[y] - nuevo[y]) > 0.005 * max(viejo[y], 1)}
            if difs:
                print(f"  Escrituras CABA {MESES_ES[mes - 1]}: el archivo más nuevo corrige años anteriores (se usa el nuevo): {difs}")
        for y, v in nuevo.items():
            datos[pd.Timestamp(y, mes, 1)] = v
    if len(datos) < 60:
        raise ValueError("pocos meses de escrituras de la Ciudad")
    return _a_mes(pd.Series(datos))


def _pozos_mensual(rutas):
    """Suma mensual de `prod_pet` (m³) y cantidad de filas de uno o más CSV de pozos (en bloques, sin cargar el archivo entero)."""
    tot = None
    for r in rutas:
        for bloque in pd.read_csv(r, usecols=["anio", "mes", "prod_pet"], chunksize=500_000, encoding="utf-8-sig"):
            bloque["prod_pet"] = pd.to_numeric(bloque["prod_pet"], errors="coerce").fillna(0)
            g = bloque.groupby(["anio", "mes"])["prod_pet"].agg(["sum", "size"])
            tot = g if tot is None else tot.add(g, fill_value=0)
    tot = tot.reset_index()
    tot["mes"] = [f"{int(a)}-{int(m):02d}" for a, m in zip(tot["anio"], tot["mes"])]
    return tot.groupby("mes")[["sum", "size"]].sum().rename(columns={"sum": "m3", "size": "filas"})


def control_pozos(carpeta):
    """Control con los CSV de pozos ya bajados a mano (`--pozos-locales <carpeta>`): arma datos/cache/petroleo_pozos.csv (mes, m3, filas),
    marca los meses incompletos (menos del 80 % de las filas de la mediana de los 12 anteriores) y compara con la serie histórica."""
    from pathlib import Path
    rutas = sorted(Path(carpeta).glob("*.csv"))
    if not rutas:
        raise FileNotFoundError(f"no hay CSV en {carpeta}")
    pz = _pozos_mensual(rutas)
    pz.to_csv(CACHE / "petroleo_pozos.csv")
    hist = _leer_cache("sem_petroleo")
    print(f"  Pozos: {len(pz)} meses ({pz.index[0]} a {pz.index[-1]}), guardados en datos/cache/petroleo_pozos.csv")
    for mes, f in pz.iterrows():
        previas = pz["filas"][pz.index < mes].tail(12)
        incompleto = len(previas) >= 6 and f["filas"] < MIN_PARTE_POZOS * previas.median()
        h = hist.get(pd.Timestamp(mes + "-01")) if hist is not None else None
        dif = f"{(f['m3'] / h - 1) * 100:+.2f} % contra la serie histórica" if h else "sin dato en la serie histórica"
        print(f"    {mes}: {f['m3']:,.0f} m³, {int(f['filas'])} filas{' (INCOMPLETO, no se publica)' if incompleto else ''}; {dif}")


def _leer_cache(nombre):
    f = CACHE / f"{nombre}.csv"
    if not f.exists():
        return None
    return _a_mes(pd.read_csv(f, index_col=0, parse_dates=True).iloc[:, 0])


def _validada(nombre, fn):
    """Envuelve la bajada: vacía, o con menos del 80 % de las filas del respaldo, es una falla (así red.cacheado no pisa el respaldo)."""
    def f():
        s = fn()
        if s is None or len(s) == 0:
            raise ValueError("la bajada vino vacía")
        previa = _leer_cache(nombre)
        if previa is not None and len(s) < MIN_FILAS_RESPALDO * len(previa):
            raise ValueError(f"la bajada trae {len(s)} filas y el respaldo {len(previa)}: parece recortada")
        return s
    return f


def _obtener(clave, fuente, con_red):
    """(original, oficial sin estacionalidad o None). Con red usa red.cacheado; sin red, solo las copias de datos/cache/."""
    tipo = fuente[0]
    pares = []  # (nombre de cache, función de bajada)
    if tipo == "dgo":
        pares.append((f"sem_{clave}", lambda: _bajar_dgo(fuente[1] if len(fuente) == 2 else fuente[2])))
        if len(fuente) == 3:
            pares.append((f"sem_{clave}_sa", lambda: _bajar_dgo(fuente[1])))
    elif tipo == "csv":
        pares.append((f"sem_{clave}", lambda: _bajar_csv(fuente[1], fuente[2])))
    elif tipo == "minero":
        # Una sola descarga para las dos series
        cuadro = {}

        def uno(i):
            if "x" not in cuadro:
                cuadro["x"] = _bajar_minero()
            return cuadro["x"][i]
        pares.append((f"sem_{clave}", lambda: uno(0)))
        pares.append((f"sem_{clave}_sa", lambda: uno(1)))
    elif tipo == "dnrpa":
        pares.append((f"sem_{clave}", _bajar_dnrpa_mensual))
    elif tipo == "petroleo":
        pares.append((f"sem_{clave}", _bajar_petroleo))
    elif tipo == "leche":
        pares.append((f"sem_{clave}", _bajar_leche))
    elif tipo == "escrituras_caba":
        pares.append((f"sem_{clave}", _bajar_escrituras_caba))
    out = []
    for nombre, fn in pares:
        if con_red:
            out.append(_a_mes(red.cacheado(nombre, _validada(nombre, fn))))
        else:
            s = _leer_cache(nombre)
            if s is None:
                raise FileNotFoundError(f"falta datos/cache/{nombre}.csv (hace falta una bajada con red)")
            out.append(s)
    return out[0], (out[1] if len(out) > 1 else None)


# ---------- IPC ----------

def _ipc():
    """IPC empalmado que usa el sitio (ipc_empalme), tomado de datos/cache/compilado.json."""
    d = json.loads((CACHE / "compilado.json").read_text(encoding="utf-8"))
    s = next(x for x in d["series"] if x["id"] == "ipc_empalme")
    fechas = pd.to_datetime([f + "-01" for f in d["fechas"]])
    v = pd.Series(s["v"], index=fechas[s["i0"]:s["i0"] + len(s["v"])], dtype="float64").dropna()
    return v


def deflactar(s, ipc):
    """Valores del último mes del IPC disponible: s / IPC × IPC_último. Meses sin IPC quedan sin dato."""
    base = ipc.iloc[-1]
    return (s / ipc.reindex(s.index) * base).dropna()


# ---------- desestacionalización propia ----------

def _tramo(s):
    """Tramo final continuo de la serie (sin huecos), de MIN_MESES_PROPIA a VENTANA_PROPIA meses; None si no alcanza."""
    s = _a_mes(s)
    if len(s) < MIN_MESES_PROPIA:
        return None
    completo = s.reindex(pd.date_range(s.index[0], s.index[-1], freq="MS"))
    faltan = np.flatnonzero(completo.isna().to_numpy())
    if len(faltan):
        completo = completo.iloc[faltan[-1] + 1:]
    completo = completo.iloc[-VENTANA_PROPIA:]
    return completo if len(completo) >= MIN_MESES_PROPIA else None


def desestacionalizar_promedios(s):
    """Método clásico de descomposición por promedios móviles. Devuelve la serie sin estacionalidad (o None si no se puede).
    - Usa el tramo final continuo (sin huecos) de la serie, con un mínimo de MIN_MESES_PROPIA meses y un máximo de VENTANA_PROPIA.
    - Tendencia: media móvil centrada de 12 meses (2x12: medias en los extremos); necesita 6 meses a cada lado.
    - Factor de cada mes del año: mediana de (serie / tendencia) de ese mes, en logaritmos y normalizado a promedio 1.
      Si hay valores no positivos se usa el método aditivo (diferencias en lugar de cocientes; normalizado a promedio 0).
    - Los factores se estiman con los meses que tienen tendencia, pero se aplican a todos, incluso a los últimos 6.
    No corrige feriados móviles ni días hábiles; los últimos meses pueden cambiar al entrar un dato nuevo."""
    completo = _tramo(s)
    if completo is None:
        return None
    mult = bool((completo > 0).all())
    y = np.log(completo.to_numpy()) if mult else completo.to_numpy()
    n = len(y)
    pesos = np.array([0.5] + [1.0] * 11 + [0.5]) / 12
    tend = np.convolve(y, pesos, mode="valid")  # n-12 valores, alineados con y[6:n-6]
    resto = y[6:n - 6] - tend
    meses = completo.index.month.to_numpy()
    factor = np.zeros(12)
    for m in range(1, 13):
        r = resto[meses[6:n - 6] == m]
        factor[m - 1] = np.median(r) if len(r) else 0.0
    factor -= factor.mean()
    ajustada = y - factor[meses - 1]
    sa = np.exp(ajustada) if mult else ajustada
    return pd.Series(sa, index=completo.index)


_X13 = {}


def x13_disponible():
    """¿Están statsmodels y el binario de X-13 (x13as en el PATH o en X13PATH)? Se mira una sola vez."""
    if "ok" not in _X13:
        try:
            from statsmodels.tsa.x13 import _find_x12
            _X13["ok"] = bool(_find_x12())
        except Exception:  # noqa: BLE001
            _X13["ok"] = False
    return _X13["ok"]


def desestacionalizar_x13(s):
    """X-13 ARIMA-SEATS (statsmodels, binario del Census) sobre el mismo tramo continuo que el método de promedios.
    Logaritmo automático (si hay valores no positivos, sin logaritmo), modelo ARIMA automático, valores atípicos y efecto de días hábiles (`trading=True`).
    No corrige los feriados argentinos. Devuelve la serie sin estacionalidad o None si no hay binario o falla."""
    if not x13_disponible():
        return None
    completo = _tramo(s)
    if completo is None:
        return None
    try:
        from statsmodels.tsa.x13 import x13_arima_analysis
        res = x13_arima_analysis(completo, log=None if bool((completo > 0).all()) else False, outlier=True, trading=True, forecast_periods=None)
        sa = pd.Series(res.seasadj.to_numpy(dtype="float64"), index=completo.index)
    except Exception as e:  # noqa: BLE001
        print(f"  Semáforo: X-13 falló ({' '.join(str(e).replace('*', '').split())[:90]}); se usa el método de promedios")
        return None
    if sa.isna().any() or len(sa) != len(completo):
        return None
    return sa


def desestacionalizar(s):
    """(serie sin estacionalidad o None, método): X-13 si USAR_X13 y hay binario; si no o si falla, promedios móviles ("x13" | "promedios")."""
    if USAR_X13:
        sa = desestacionalizar_x13(s)
        if sa is not None:
            return sa, "x13"
    sa = desestacionalizar_promedios(s)
    return sa, ("promedios" if sa is not None else None)


def variacion_mensual(s):
    """Variación porcentual contra el mes anterior (solo meses consecutivos con valor anterior positivo)."""
    ant = s.shift(1, freq="MS").reindex(s.index)
    return ((s / ant - 1) * 100).where(ant > 0).dropna()


def control(orig, sa_oficial):
    """(error medio absoluto en puntos porcentuales, meses, método) de la variación mensual propia contra la oficial, últimos 10 años."""
    propia, metodo = desestacionalizar(orig)
    if propia is None:
        return None
    a, b = variacion_mensual(propia), variacion_mensual(sa_oficial)
    comun = a.index.intersection(b.index)
    comun = comun[comun >= b.index[-1] - pd.DateOffset(months=MESES_CONTROL - 1)]
    if len(comun) < 12:
        return None
    return round(float((a[comun] - b[comun]).abs().mean()), 2), int(len(comun)), metodo


# ---------- cargados a mano ----------

def _manuales(hoy):
    """Indicadores de solo variación, cargados a mano de notas de prensa (datos/manual/semaforo_manual.json). Un mes sin cita textual
    (o sin link) no se carga. Cada indicador lleva `var_ia` y `var_mm` (listas mensuales desde `f0`) y `registros` con la nota de cada mes."""
    if not MANUAL.exists():
        return []
    cfg = json.loads(MANUAL.read_text(encoding="utf-8"))
    out = []
    for clave, c in cfg["indicadores"].items():
        reg = {}
        for m in c["meses"]:
            ia, mm = m.get("var_ia"), m.get("var_mm")
            if not (m.get("cita") or "").strip() or not (m.get("url") or "").strip():
                print(f"  Semáforo manual: '{clave}' {m.get('mes')} sin cita o sin link: no se carga")
                continue
            if ia is None and mm is None:
                continue
            if any(v is not None and abs(v) > MAX_SALTO_PCT for v in (ia, mm)):
                print(f"  Semáforo manual: '{clave}' {m['mes']} varía más de {MAX_SALTO_PCT} %: revisar la carga")
                continue
            reg[pd.Timestamp(m["mes"] + "-01")] = m
        if not reg:
            print(f"  Semáforo manual: '{clave}' sin meses cargados; queda afuera")
            continue
        ini, fin = min(reg), max(reg)
        idx = pd.date_range(ini, fin, freq="MS")
        atraso = (hoy.year - fin.year) * 12 + hoy.month - fin.month
        if atraso > MAX_ATRASO_MESES:
            print(f"  Semáforo: '{c['nombre']}' ({clave}) tiene último dato de {fin:%Y-%m} ({atraso} meses de atraso)")
        out.append({
            "clave": clave, "grupo": c["grupo"], "nombre": c["nombre"], "fuente": c["fuente"], "unidad": c["unidad"],
            "ajuste": "manual", "metodo": "manual", "real": False, "id": None, "f0": ini.strftime("%Y-%m"),
            "orig": [], "sa": [],
            "var_ia": [reg[d]["var_ia"] if d in reg else None for d in idx],
            "var_mm": [reg[d].get("var_mm") if d in reg else None for d in idx],
            "registros": [{"mes": d.strftime("%Y-%m"), "var_ia": reg[d].get("var_ia"), "var_mm": reg[d].get("var_mm"),
                           "url": reg[d]["url"], "cita": reg[d]["cita"]} for d in sorted(reg)],
        })
    return out


# ---------- armado ----------

def _lista(s, idx):
    return [None if pd.isna(x) or not np.isfinite(x) else round(float(x), 4) for x in s.reindex(idx).to_numpy()]


def _revisar(clave, nombre, orig, sa, hoy):
    ultimo = orig.index[-1] if sa is None else max(orig.index[-1], sa.index[-1])
    atraso = (hoy.year - ultimo.year) * 12 + hoy.month - ultimo.month
    if atraso > MAX_ATRASO_MESES:
        print(f"  Semáforo: '{nombre}' ({clave}) tiene último dato de {ultimo:%Y-%m} ({atraso} meses de atraso)")
    for etiqueta, s in (("original", orig), ("sin estacionalidad", sa)):
        if s is None or len(s) < 2:
            continue
        v = variacion_mensual(s)
        if len(v) and v.index[-1] == s.index[-1] and abs(v.iloc[-1]) > MAX_SALTO_PCT:
            print(f"  Semáforo: '{nombre}' ({clave}), {etiqueta}: el último mes ({s.index[-1]:%Y-%m}) varía {v.iloc[-1]:+.1f} % contra el anterior; revisar la fuente")
    if len(orig) >= 3 and orig.iloc[-1] == orig.iloc[-2] == orig.iloc[-3]:
        print(f"  Semáforo: '{nombre}' ({clave}) repite el mismo valor tres meses seguidos ({orig.iloc[-1]})")


def construir_json(con_red=True):
    ahora = datetime.now(timezone(timedelta(hours=-3)))  # hora argentina
    hoy = pd.Timestamp(ahora.date())
    try:
        ipc = _ipc()
    except Exception as e:  # noqa: BLE001
        ipc = None
        print(f"  Semáforo: error al leer el IPC ({e}); quedan afuera los indicadores en términos reales")
    indicadores, controles = [], []
    for clave, grupo, nombre, fuente_org, unidad, fuente, ajuste, real, sid in INDICADORES:
        try:
            orig, sa_of = _obtener(clave, fuente, con_red)
            if orig.empty:
                print(f"  Semáforo: la serie '{nombre}' ({clave}) está vacía (no disponible); queda afuera")
                continue
            ultimo_bruto = orig.index[-1]
            if real and ipc is None:
                print(f"  Semáforo: '{nombre}' ({clave}) no disponible sin IPC; queda afuera")
                continue
            if real:
                orig = deflactar(orig, ipc)
                if orig.empty:
                    print(f"  Semáforo: '{nombre}' ({clave}) no disponible: no tiene IPC para deflactar; queda afuera")
                    continue
                if orig.index[-1] < ultimo_bruto:
                    print(f"  Semáforo: '{nombre}' ({clave}): el IPC llega a {ipc.index[-1]:%Y-%m}, los últimos meses de la serie no se pudieron deflactar")
            # Sin estacionalidad
            metodo = {"oficial": "oficial", "ninguno": "ninguno"}.get(ajuste)
            if ajuste == "oficial":
                sa = sa_of
                if sa is None:
                    raise ValueError("falta la serie oficial desestacionalizada")
                c = control(orig, sa)
                if c:
                    controles.append({"clave": clave, "error_medio_pp": c[0], "meses": c[1], "metodo": c[2]})
                    print(f"  Semáforo control {clave}: diferencia media {c[0]} pp en {c[1]} meses (propia, {c[2]}, contra oficial)")
                else:
                    print(f"  Semáforo control {clave}: no se pudo calcular")
            elif ajuste == "ninguno":
                sa = orig.copy()
            else:
                sa, metodo = desestacionalizar(orig)
                if sa is None:
                    print(f"  Semáforo: '{nombre}' ({clave}) sin estimación propia (menos de {MIN_MESES_PROPIA} meses seguidos); solo interanual")
            _revisar(clave, nombre, orig, sa, hoy)
            ini = orig.index[0] if sa is None or sa.empty else min(orig.index[0], sa.index[0])
            fin = orig.index[-1] if sa is None or sa.empty else max(orig.index[-1], sa.index[-1])
            idx = pd.date_range(ini, fin, freq="MS")
            indicadores.append({
                "clave": clave, "grupo": grupo, "nombre": nombre, "fuente": fuente_org, "unidad": unidad,
                "ajuste": ajuste, "metodo": metodo,
                "real": real, "id": sid, "f0": ini.strftime("%Y-%m"),
                "orig": _lista(orig, idx), "sa": _lista(sa, idx) if sa is not None else [None] * len(idx),
            })
        except Exception as e:  # noqa: BLE001
            print(f"  Semáforo: '{nombre}' ({clave}) error: no se pudo armar y queda afuera ({e})")
    try:
        # el orden de los grupos de la tabla lo da el de aparición: los manuales van detrás de los automáticos de su grupo
        for m in _manuales(hoy):
            ult = max(i for i, v in enumerate(m["var_ia"]) if v is not None or m["var_mm"][i] is not None)
            print(f"  Semáforo manual {m['clave']}: {len(m['registros'])} meses cargados, último {pd.Timestamp(m['f0'] + '-01') + pd.DateOffset(months=ult):%Y-%m}")
            pos = max((k for k, x in enumerate(indicadores) if x["grupo"] == m["grupo"]), default=len(indicadores) - 1)
            indicadores.insert(pos + 1, m)
    except Exception as e:  # noqa: BLE001
        print(f"  Semáforo: error al leer los indicadores cargados a mano ({e}); quedan afuera")
    if not indicadores:
        raise RuntimeError("ningún indicador del semáforo se pudo armar")
    _validar(indicadores)
    return {"actualizado": ahora.replace(microsecond=0).isoformat(), "control": controles, "indicadores": indicadores}


def _validar(indicadores):
    """Controles de cordura sobre el JSON final: claves únicas, listas del mismo largo, sin NaN, ids y datos presentes."""
    claves = [i["clave"] for i in indicadores]
    if len(set(claves)) != len(claves):
        raise ValueError("claves repetidas en el semáforo")
    for i in indicadores:
        if i["ajuste"] == "manual":
            if len(i["var_ia"]) != len(i["var_mm"]) or not any(v is not None for v in i["var_ia"] + i["var_mm"]):
                raise ValueError(f"{i['clave']}: variaciones cargadas a mano vacías o de distinto largo")
            continue
        if len(i["orig"]) != len(i["sa"]):
            raise ValueError(f"{i['clave']}: orig y sa de distinto largo")
        for v in i["orig"] + i["sa"]:
            if v is not None and not np.isfinite(v):
                raise ValueError(f"{i['clave']}: valor no finito")
        if not any(v is not None for v in i["orig"]):
            raise ValueError(f"{i['clave']}: sin datos")
        if i["ajuste"] == "propia" and not any(v is not None for v in i["sa"]):
            print(f"  Semáforo: '{i['nombre']}' sin serie ajustada; solo interanual")


def bajar():
    """Baja solo las series del semáforo y deja los respaldos en datos/cache/ (sin armar el JSON)."""
    ok, mal = [], []
    for clave, _g, nombre, _o, _u, fuente, *_ in INDICADORES:
        try:
            orig, sa = _obtener(clave, fuente, True)
            ok.append(clave)
            print(f"  {clave}: {len(orig)} meses, {orig.index[0]:%Y-%m} a {orig.index[-1]:%Y-%m}, último {orig.iloc[-1]:.4g}"
                  + (f"; oficial sin est. hasta {sa.index[-1]:%Y-%m}" if sa is not None else ""))
        except Exception as e:  # noqa: BLE001
            mal.append(clave)
            print(f"  {clave}: error, FALLÓ ({e})")
    print(f"Semáforo: {len(ok)} series bajadas, {len(mal)} fallaron {mal if mal else ''}")


def validar_x13():
    """Compara la variación mensual sin estacionalidad de X-13 y la de promedios móviles contra la oficial (últimos 24 meses con dato oficial)
    en las series que tienen ajuste oficial. Imprime una tabla en formato Markdown (error medio absoluto y error máximo, en puntos). Sin red."""
    if not x13_disponible():
        sys.exit("No hay binario de X-13 (x13as en el PATH o X13PATH) o falta statsmodels")
    filas = []
    for clave, _g, nombre, _o, _u, fuente, ajuste, *_ in INDICADORES:
        if ajuste != "oficial":
            continue
        orig, sa_of = _obtener(clave, fuente, False)
        b = variacion_mensual(sa_of)
        prom, x13 = desestacionalizar_promedios(orig), desestacionalizar_x13(orig)
        if prom is None or x13 is None:
            print(f"  {clave}: no se pudo estimar")
            continue
        res = {}
        for nom, sa in (("promedios", prom), ("x13", x13)):
            a = variacion_mensual(sa)
            comun = a.index.intersection(b.index)
            comun = comun[comun >= b.index[-1] - pd.DateOffset(months=23)]
            d = (a[comun] - b[comun]).abs()
            # concordancia de signo con la oficial (lo que decide el color de la celda)
            sig = float((np.sign(a[comun]) == np.sign(b[comun])).mean())
            res[nom] = (float(d.mean()), float(d.max()), sig, len(comun))
        filas.append((nombre, clave, res))
    print("| Serie | Meses | Promedios: error medio (pp) | X-13: error medio (pp) | Promedios: signo igual | X-13: signo igual | Mejor |")
    print("|---|---|---|---|---|---|---|")
    mejor = 0
    for nombre, clave, r in filas:
        p, x = r["promedios"], r["x13"]
        gana = "X-13" if x[0] < p[0] - 1e-9 else ("promedios" if p[0] < x[0] - 1e-9 else "empate")
        mejor += gana in ("X-13", "empate")
        print(f"| {nombre} ({clave}) | {p[3]} | {p[0]:.2f} (máx. {p[1]:.2f}) | {x[0]:.2f} (máx. {x[1]:.2f}) | {p[2] * 100:.0f} % | {x[2] * 100:.0f} % | {gana} |")
    print(f"X-13 igual o mejor en {mejor} de {len(filas)} series")


if __name__ == "__main__":
    if "--validar-x13" in sys.argv:
        validar_x13()
    elif "--bajar" in sys.argv:
        bajar()
        if "--pozos-locales" in sys.argv:
            control_pozos(sys.argv[sys.argv.index("--pozos-locales") + 1])
    else:
        sys.exit("Uso: python pipeline/semaforo.py --bajar [--pozos-locales <carpeta>] | --validar-x13")
