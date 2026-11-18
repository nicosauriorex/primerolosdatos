"""
Parte del costo de la electricidad que pagan las tarifas (docs/specs/tarifas-y-datos-calientes-4.md, 2A).

Fuentes (CAMMESA, la empresa que administra el mercado eléctrico mayorista):
- Precios medios estacionales (PEST): página cammesaweb.cammesa.com/precios-medios-estacionales/, ZIP «Precios medios Estacionales MEM y TDF»
  (el link ?wpdmdl=<n> se lee de la página). Hoja «Datos»: por mes de transacción, demanda (MWh), monto facturado a precios estacionales ($)
  y precio medio $/MWh, para las distribuidoras del MEM. Mensual desde ene-19.
- Costo de abastecer la electricidad (precio monómico: energía + potencia + servicios + transporte, en US$/MWh): «Variables Relevantes del MEM -
  BASE DE DATOS» (página variables-relevantes-mem/, un ZIP por mes con todo el historial desde ene-18; se toma el más nuevo). Hoja «BD ECONÓMICOS».
- Dólar: A3500 del último día hábil de cada mes (el diario que ya baja macro.py, variable 5 de la API del BCRA).

Las columnas se ubican por su rótulo, no por número. Respaldos (tablas chicas ya armadas): datos/cache/cammesa_pest.pkl y cammesa_monomico.pkl.
"""
import io
import re
import time
import unicodedata
import zipfile

import pandas as pd

import red

PAG_PEST = "https://cammesaweb.cammesa.com/precios-medios-estacionales/"
PAG_VARIABLES = ["https://cammesaweb.cammesa.com/variables-relevantes-mem/", "https://cammesaweb.cammesa.com/historico-variables-relevantes-2025/"]
DESCARGA = "https://cammesaweb.cammesa.com/?wpdmdl="
WPDMDL_PEST = 44426  # el que tenía la página al armar este módulo: respaldo si la página cambia de forma
CAT = ["Fiscal", "Subsidios y tarifas"]
MESES_TXT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def _n(x):
    """Rótulo normalizado: sin acentos, en mayúsculas y con un solo espacio."""
    s = unicodedata.normalize("NFKD", str(x)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().upper()


def _mes_txt(f):
    return f"{MESES_TXT[f.month - 1]}-{f.year % 100:02d}"


def _num(v):
    """Número con coma decimal (es-AR) y un decimal."""
    return f"{v:,.1f}".replace(",", "X").replace(".", ",").replace("X", ".")


# ---------------------------------------------------------------- bajada
def _excel_de_zip(b):
    """pd.ExcelFile del primer .xlsx de un ZIP (o del propio archivo si ya es un Excel)."""
    if zipfile.is_zipfile(io.BytesIO(b)):  # un .xlsx es también un ZIP: si no hay un Excel adentro, es el Excel mismo
        z = zipfile.ZipFile(io.BytesIO(b))
        nombres = [n for n in z.namelist() if n.lower().endswith((".xlsx", ".xls"))]
        if nombres:
            return pd.ExcelFile(io.BytesIO(z.read(nombres[0])))
    return pd.ExcelFile(io.BytesIO(b))


def _bajar(url, timeout=120, intentos=3):
    """red.bajar con reintentos: el servidor de CAMMESA corta la conexión de vez en cuando."""
    for k in range(intentos):
        try:
            return red.bajar(url, timeout=timeout, ua="Mozilla/5.0")
        except OSError:
            if k == intentos - 1:
                raise
            time.sleep(3)


def _pagina(url):
    return _bajar(url, timeout=60).decode("utf-8", "ignore")


def _id_pest():
    try:
        m = re.findall(r"download/precios-medios-estacionales[^\"'?]*/\?wpdmdl=(\d+)", _pagina(PAG_PEST))
        if m:
            return int(max(m, key=int))
    except Exception as e:  # noqa: BLE001
        print(f"  CAMMESA PEST: no pude leer la página ({e}); uso el link conocido")
    return WPDMDL_PEST


def _id_base_variables():
    """Id del ZIP «Base de datos» de Variables Relevantes más nuevo (el nombre del link trae el año y el mes)."""
    for pag in PAG_VARIABLES:
        try:
            m = re.findall(r"download/base-de-datos-variables-relevantes-del-mem-(\d{4})-(\d{2})/\?wpdmdl=(\d+)", _pagina(pag))
        except Exception as e:  # noqa: BLE001
            print(f"  CAMMESA variables relevantes: no pude leer {pag} ({e})")
            continue
        if m:
            a, mes, i = max(m)
            return int(i), f"{a}-{mes}"
    raise RuntimeError("no encontré el link de la base de datos de Variables Relevantes del MEM")


# ---------------------------------------------------------------- lectura
def _fila_enc(d, prueba, col=None):
    """Primera fila cuya(s) celda(s) cumplen la prueba (sobre el rótulo normalizado)."""
    for r in range(min(len(d), 60)):
        cols = range(d.shape[1]) if col is None else [col]
        if any(prueba(_n(d.iat[r, c])) for c in cols):
            return r
    raise RuntimeError("no encontré la fila de encabezado")


def leer_pest(xl):
    """Hoja «Datos» -> DataFrame mensual (índice = mes de transacción): demanda (MWh) y pest ($/MWh del MEM)."""
    d = xl.parse(xl.sheet_names[0], header=None)
    r = _fila_enc(d, lambda t: t == "MES TRANSACCION")
    enc = {c: _n(d.iat[r, c]) for c in range(d.shape[1])}
    c_mes = next(c for c, t in enc.items() if t == "MES TRANSACCION")
    c_dem = next(c for c, t in enc.items() if t.startswith("DEMANDA") and c > c_mes)
    c_pest = next(c for c, t in enc.items() if t.startswith("PEST") and "MEM" in t and "MWH" in t and "TDF" not in t)
    filas = {}
    for i in range(r + 1, len(d)):
        f = pd.to_datetime(d.iat[i, c_mes], errors="coerce")
        v, dem = pd.to_numeric(d.iat[i, c_pest], errors="coerce"), pd.to_numeric(d.iat[i, c_dem], errors="coerce")
        if pd.notna(f) and pd.notna(v) and pd.notna(dem):
            filas[pd.Timestamp(f.year, f.month, 1)] = {"demanda": float(dem), "pest": float(v)}
    out = pd.DataFrame.from_dict(filas, orient="index").sort_index()
    if len(out) < 60 or not out["pest"].between(500, 1_000_000).all():
        raise RuntimeError("PEST: menos de 60 meses o precios fuera de $500-$1.000.000 por MWh: revisar la hoja")
    return out


def leer_monomico(xl):
    """Hoja «BD ECONÓMICOS» -> DataFrame mensual (US$/MWh): energia, potencia, servicios, transporte y total (precio monómico)."""
    hoja = next((s for s in xl.sheet_names if _n(s).startswith("BD ECON")), None)
    if hoja is None:
        raise RuntimeError("no encontré la hoja «BD ECONÓMICOS»")
    d = xl.parse(hoja, header=None)
    r = _fila_enc(d, lambda t: t == "MES", col=1)
    enc = {}
    for c in range(d.shape[1]):
        enc.setdefault(_n(d.iat[r, c]), c)  # la primera aparición: las demás columnas repiten ENERGIA, POTENCIA... de otros costos
    cols = {"energia": enc["ENERGIA"], "potencia": enc["POTENCIA"], "servicios": enc["SERVICIOS"], "transporte": enc["TRANSPORTE"],
            "total": next(c for t, c in enc.items() if t.startswith("PRECIO MONOMICO SPOT"))}
    filas = {}
    for i in range(r + 1, len(d)):
        f = pd.to_datetime(d.iat[i, 1], errors="coerce")
        if pd.isna(f):
            continue
        v = {k: pd.to_numeric(d.iat[i, c], errors="coerce") for k, c in cols.items()}
        if all(pd.notna(x) for x in v.values()):
            filas[pd.Timestamp(f.year, f.month, 1)] = {k: float(x) for k, x in v.items()}
    out = pd.DataFrame.from_dict(filas, orient="index").sort_index()
    if len(out) < 90:
        raise RuntimeError("monómico: menos de 90 meses")
    suma = out[["energia", "potencia", "servicios", "transporte"]].sum(axis=1)
    if (suma - out["total"]).abs().max() > 1 or not out["total"].between(5, 500).all():
        raise RuntimeError("monómico: el total no es la suma de sus componentes (±1 US$/MWh) o está fuera de 5-500 US$/MWh: revisar los rótulos")
    return out


def _bajar_pest():
    i = _id_pest()
    xl = _excel_de_zip(_bajar(DESCARGA + str(i)))
    df = leer_pest(xl)
    print(f"  CAMMESA PEST: ?wpdmdl={i}, hasta {_mes_txt(df.index.max())}")
    return df


def _bajar_monomico():
    i, mes = _id_base_variables()
    xl = _excel_de_zip(_bajar(DESCARGA + str(i), timeout=180))
    df = leer_monomico(xl)
    print(f"  CAMMESA monómico: base {mes} (?wpdmdl={i}), hasta {_mes_txt(df.index.max())}")
    return df


# ---------------------------------------------------------------- cuentas
def dolar_fin_de_mes():
    """A3500 del último día hábil de cada mes (en $ por US$)."""
    import catalogo  # aquí y no arriba: catalogo importa este módulo
    fx = red.cacheado("d_a3500_bcra", lambda: catalogo._bcra(5)).dropna()
    m = fx.groupby(fx.index.to_period("M")).last()
    m.index = m.index.to_timestamp()
    return m


def calcular(pest, mono, fx):
    """-> (estacional US$/MWh, monómico US$/MWh, cobertura %), series mensuales; y avisos de los controles."""
    est = (pest["pest"] / fx.reindex(pest.index)).dropna()
    mon = mono["total"]
    cob = (est / mon.reindex(est.index) * 100).dropna()
    if len(cob) < 60 or not cob.between(5, 150).all():
        malos = cob[~cob.between(5, 150)]
        raise RuntimeError(f"cobertura de la luz fuera de 5 %-150 % o con menos de 60 meses ({len(cob)}): {malos.round(1).to_dict()}")
    return est, mon, cob


def controles(pest, mono, fx, cob):
    """Controles puntuales de la spec: avisan, no cortan. Anual = precio de cada mes ponderado por la demanda del mes."""
    avisos = []
    for mes, esperado in (("2025-06-01", 55.0), ("2025-07-01", 48.9)):
        f = pd.Timestamp(mes)
        if f in cob.index and abs(cob[f] - esperado) > 1.0:
            avisos.append(f"cobertura {_mes_txt(f)}: {cob[f]:.1f} % (control {esperado} %)")
    dem = pest["demanda"]
    est_usd = pest["pest"] / fx.reindex(pest.index)
    for a, esperado in ((2019, 65.5), (2021, 36.9), (2025, 71.2)):
        meses = [f for f in pest.index if f.year == a and f in mono.index and pd.notna(est_usd.get(f))]
        if len(meses) < 12:
            avisos.append(f"cobertura anual {a}: faltan meses ({len(meses)} de 12)")
            continue
        w = dem[meses]
        valor = (est_usd[meses] * w).sum() / (mono["total"][meses] * w).sum() * 100
        if abs(valor - esperado) > 1.5:
            avisos.append(f"cobertura anual {a}: {valor:.1f} % (control {esperado} %)")
    return avisos


# ---------------------------------------------------------------- catálogo
def series(idx):
    from catalogo import S  # ídem
    pest = red.cache_df("cammesa_pest", _bajar_pest)
    mono = red.cache_df("cammesa_monomico", _bajar_monomico)
    if pest.empty or mono.empty:
        print("  Energía (CAMMESA): sin datos ni respaldo; se omiten luz_precio_estacional, luz_costo_monomico y luz_cobertura")
        return []
    fx = dolar_fin_de_mes()
    est, mon, cob = calcular(pest, mono, fx)
    for a in controles(pest, mono, fx, cob):
        print(f"  AVISO energía: {a}")
    u = cob.index.max()
    fx_u = fx[u]
    nota_dolar = f" Pasado a dólares al A3500 del último día hábil de cada mes ({_num(fx_u)} $ por dólar en {_mes_txt(u)})."
    f1 = "CAMMESA, precios medios estacionales (PEST) de las distribuidoras del MEM"
    f2 = "CAMMESA, Variables Relevantes del MEM (base de datos, hoja BD ECONÓMICOS: precio monómico)"
    return [
        S("luz_precio_estacional", "Precio que pagan las distribuidoras por la electricidad (estacional)", CAT, "none", "US$ por MWh", est.reindex(idx), 0,
          f1 + "; dólar A3500 (BCRA)",
          "Lo que las distribuidoras de electricidad le pagan a CAMMESA por la energía que compran: es el precio que fija el Estado y el que después llega a las tarifas. "
          "Promedio del mes ponderado por la demanda (monto facturado sin IVA de energía, potencia, transporte y, desde nov-25, servicios asociados, dividido por la demanda), "
          "sin los cargos de las grandes demandas. Desde nov-25 suma los servicios asociados: ese mes el precio sube sin que cambie la tarifa (quiebre)." + nota_dolar),
        S("luz_costo_monomico", "Costo de abastecer la electricidad (monómico)", CAT, "none", "US$ por MWh", mon.reindex(idx), 0,
          f2,
          "Costo medio mensual de abastecer la electricidad: energía, potencia, servicios y transporte (el «precio monómico» de CAMMESA), en dólares. "
          "Es lo que cuesta de verdad, con o sin subsidio. Sube cuando el gas es caro o hay que importar combustibles, sobre todo en invierno."),
        S("luz_cobertura", "Parte del costo de la electricidad que pagan las tarifas", CAT, "none", "% del costo", cob.reindex(idx), 0,
          "Cálculo propio con CAMMESA (precios estacionales y precio monómico) y BCRA (dólar A3500)",
          "Precio estacional que pagan las distribuidoras (lo que después va a las tarifas) dividido por el costo medio de abastecer la electricidad "
          "(energía, potencia, servicios y transporte), los dos en dólares. Lo que falta para el 100 % lo cubre el Estado (Tesoro, a través de CAMMESA). "
          "Es para toda la demanda que compra al precio estacional, no solo hogares. Desde nov-25 el estacional suma los servicios asociados (quiebre). "
          "Otros centros de estudio (IAE Mosconi) usan otra definición y dan otro número; el IIEP publica la de los hogares del AMBA (serie aparte)." + nota_dolar),
    ]


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    idx = pd.date_range("1990-01-01", pd.Timestamp.today().normalize().replace(day=1), freq="MS")
    ss = series(idx)
    for s in ss:
        v = s["v"].dropna()
        print(f"{s['id']}: {len(v)} datos, {_mes_txt(v.index[0])} a {_mes_txt(v.index[-1])}, último {v.iloc[-1]:,.2f}")
    if ss:
        pest, mono = red.cache_df("cammesa_pest", _bajar_pest), red.cache_df("cammesa_monomico", _bajar_monomico)
        fx = dolar_fin_de_mes()
        cob = next(s for s in ss if s["id"] == "luz_cobertura")["v"].dropna()
        for mes in ("2025-06-01", "2025-07-01"):
            print(f"cobertura {mes[:7]}: {cob[pd.Timestamp(mes)]:.1f} %")
        dem = pest["demanda"]
        est_usd = pest["pest"] / fx.reindex(pest.index)
        for a in (2019, 2021, 2025):
            meses = [f for f in pest.index if f.year == a and f in mono.index]
            w = dem[meses]
            print(f"cobertura anual {a} (ponderada por demanda): {(est_usd[meses] * w).sum() / (mono['total'][meses] * w).sum() * 100:.1f} %")
        print("avisos:", controles(pest, mono, fx, cob) or "ninguno")
        print(next(s for s in ss if s["id"] == "luz_cobertura")["desc"])
