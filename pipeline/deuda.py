"""
Series de deuda pública (docs/specs/series-deuda.md) y la deuda consolidada del Tesoro y el Banco Central (D-024).

Fuentes (Secretaría de Finanzas):
- Boletín mensual de deuda: página datos-mensuales-de-la-deuda/datos, archivo boletin_mensual_<dd>_<mm>_<aaaa>*.xlsx (el nombre
  cambia cada mes: se lee la página y se toma el link). Hoja A.1: deuda bruta de la Administración Central por instrumento
  (total, FMI, letras del Tesoro en el Banco Central y adelantos transitorios). Hoja A.3: deuda en situación de pago normal por
  moneda (local y extranjera). Millones de US$, mensual desde ene-19. Los últimos meses vienen como texto "jul-26 (*)": preliminares.
- Planilla trimestral de deuda: página datos-trimestrales-de-la-deuda, archivo deuda_publica_<dd>-<mm>-<aaaa>*.xlsx (se toma la
  fecha más nueva). Hoja A.4.7: deuda bruta / PIB, anual 2000-2025 (se ubica en diciembre) y trimestral desde 2026 (en el último
  mes del trimestre).

Las filas se ubican por su rótulo, no por número (el Excel cambia de forma). Respaldos: datos/cache/deuda_mensual.xlsx y
deuda_trimestral.xlsx (el original); si la página o la bajada fallan, se usa la copia.

Consolidada (cuenta propia): deuda bruta − letras y adelantos del Tesoro en el Banco Central + pasivos remunerados del Banco
Central (variables 1258, 155, 152 y 196, el último día hábil del mes) pasados a dólares al A3500 del mismo día.
"""
import io
import re
import unicodedata

import pandas as pd

import red

PAG_MENSUAL = "https://www.argentina.gob.ar/economia/finanzas/datos-mensuales-de-la-deuda/datos"
PAG_TRIMESTRAL = "https://www.argentina.gob.ar/economia/finanzas/datos-trimestrales-de-la-deuda"
BASE = "https://www.argentina.gob.ar"
CAT = ["Fiscal", "Deuda pública"]
FUENTE = "Secretaría de Finanzas, boletín mensual de deuda pública"
VARS_PASIVOS = (1258, 155, 152, 196)  # las mismas que bcra_pasivos_rem: LEBAC/NOBAC y otras letras, pases pasivos, LELIQ, LEFI
MESES = {"ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8, "sep": 9, "set": 9, "oct": 10, "nov": 11, "dic": 12}
MESES_TXT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def _n(x):
    """Rótulo normalizado: sin acentos, en mayúsculas y con un solo espacio."""
    s = unicodedata.normalize("NFKD", str(x)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().upper()


def _mes_txt(f):
    return f"{MESES_TXT[f.month - 1]}-{f.year % 100:02d}"


def _fmt(v):
    return f"{v:,.0f}".replace(",", ".")


# ---------------------------------------------------------------- bajada (con respaldo)
def _link(pagina, patron, clave=None):
    html = red.bajar(pagina, timeout=60).decode("utf-8", "ignore")
    links = re.findall(r'href="([^"]+\.xlsx)"', html)
    cand = [u for u in links if re.search(patron, u.rsplit("/", 1)[-1], re.I)]
    if not cand:
        raise RuntimeError(f"no encontré el Excel ({patron}) en {pagina}")
    u = max(cand, key=clave) if clave else cand[0]
    return u if u.startswith("http") else BASE + u


def _bajar_excel(nombre, pagina, patron, clave=None):
    """Bytes del Excel; si la página o la bajada fallan, los del respaldo datos/cache/<nombre>.xlsx."""
    f = red.CACHE / f"{nombre}.xlsx"
    try:
        url = _link(pagina, patron, clave)
        b = red.bajar(url, timeout=120)
        pd.ExcelFile(io.BytesIO(b))  # que sea un Excel legible antes de pisar el respaldo
        f.write_bytes(b)
        red.guardar_meta(nombre, {"url": url})
        print(f"  Deuda: {url.rsplit('/', 1)[-1]}")
    except Exception as e:  # noqa: BLE001
        if not f.exists():
            raise
        print(f"  {nombre}: error al bajar ({e}); uso cache {f.name}")
        red.RESPALDOS.add(nombre)
        b = f.read_bytes()
    return b


def _fecha_trim(u):
    m = re.search(r"(\d{2})-(\d{2})-(\d{4})", u.rsplit("/", 1)[-1])
    return (m.group(3), m.group(2)) if m else ("0", "0")


# ---------------------------------------------------------------- lectura
def _columnas_meses(d):
    """Fila de encabezado (la primera con 12 o más meses) -> ({columna: mes}, meses preliminares)."""
    for r in range(min(len(d), 40)):
        cols, prelim = {}, set()
        for c in d.columns:
            x = d.iat[r, c]
            if isinstance(x, (pd.Timestamp,)) or hasattr(x, "year") and hasattr(x, "month") and not isinstance(x, str):
                cols[c] = pd.Timestamp(x.year, x.month, 1)
            elif isinstance(x, str):
                m = re.fullmatch(r"\s*([a-z]{3})[-/ ](\d{2,4})\s*(\(\*\))?\s*", x.lower())
                if m and m.group(1) in MESES:
                    a = int(m.group(2))
                    f = pd.Timestamp(a + 2000 if a < 100 else a, MESES[m.group(1)], 1)
                    cols[c] = f
                    if m.group(3):
                        prelim.add(f)
        if len(cols) >= 12:
            return r, cols, prelim
    raise RuntimeError("no encontré la fila de meses")


def _fila(d, r0, cols, prueba, todas=False):
    """Serie de la(s) fila(s) cuyo rótulo (columna 1) cumple `prueba`; con todas=True suma todas las que la cumplen."""
    filas = [r for r in range(r0 + 1, len(d)) if prueba(_n(d.iat[r, 1]))]
    if not filas:
        raise RuntimeError("no encontré la fila pedida")
    if not todas:
        filas = filas[:1]
    def celda(c):
        """Suma de las filas en esa columna; una celda vacía cuenta 0 (sin adelantos ese mes) y solo sin ningún número queda sin dato."""
        nums = [x for x in (pd.to_numeric(d.iat[r, c], errors="coerce") for r in filas) if pd.notna(x)]
        return float(sum(nums)) if nums else float("nan")
    return pd.Series({f: celda(c) for c, f in cols.items()}).sort_index()


def leer_mensual(b):
    """Del boletín mensual: {total, fmi, letras_bcra, me, mn, pago_normal} (pd.Series mensuales) y los meses preliminares."""
    a1 = pd.read_excel(io.BytesIO(b), sheet_name="A.1", header=None)
    r0, cols, prelim = _columnas_meses(a1)
    out = {
        "total": _fila(a1, r0, cols, lambda t: t.startswith("A- DEUDA BRUTA")),
        "fmi": _fila(a1, r0, cols, lambda t: t == "FMI"),
        "letras_bcra": _fila(a1, r0, cols, lambda t: t.startswith("LETRA BCRA") or t.startswith("ADELANTOS TRANSITORIOS"), todas=True),
    }
    a3 = pd.read_excel(io.BytesIO(b), sheet_name="A.3", header=None)
    r3, cols3, prelim3 = _columnas_meses(a3)
    out["pago_normal"] = _fila(a3, r3, cols3, lambda t: t.startswith("DEUDA BRUTA EN SITUACION DE PAGO NORMAL"))
    out["mn"] = _fila(a3, r3, cols3, lambda t: t.startswith("MONEDA LOCAL"))
    out["me"] = _fila(a3, r3, cols3, lambda t: t == "MONEDA EXTRANJERA")
    _controles(out)
    return out, prelim | prelim3


def _controles(s):
    """Si la planilla cambió de forma, mejor cortar que publicar cifras mal leídas."""
    if len(s["total"].dropna()) < 80 or s["total"].min() <= 0:
        raise RuntimeError("deuda bruta: menos de 80 meses o valores no positivos")
    dif = (s["me"] + s["mn"] - s["pago_normal"]).abs().max()
    if dif > 1:
        raise RuntimeError(f"moneda local + extranjera no da la deuda en pago normal (dif. {dif:.1f})")
    if ((s["pago_normal"] / s["total"]).dropna() < 0.95).any():
        raise RuntimeError("la deuda en pago normal es menos del 95 % de la bruta: revisar los rótulos")
    for k in ("fmi", "letras_bcra"):
        if ((s[k] / s["total"]).dropna() > 0.3).any() or (s[k] < 0).any():
            raise RuntimeError(f"{k}: más del 30 % de la deuda bruta o negativo: revisar los rótulos")


def leer_pib(b):
    """Deuda bruta / PIB en %: anual en diciembre, trimestral en el último mes del trimestre."""
    d = pd.read_excel(io.BytesIO(b), sheet_name="A.4.7", header=None)
    fila_enc = next(r for r in range(len(d)) if _n(d.iat[r, 2]) == "INDICADORES")
    fila = next(r for r in range(len(d)) if _n(d.iat[r, 2]) == "DEUDA BRUTA DE LA ADMINISTRACION CENTRAL")
    v = {}
    for c in range(3, d.shape[1]):
        enc, x = str(d.iat[fila_enc, c]), pd.to_numeric(d.iat[fila, c], errors="coerce")
        if pd.isna(x):
            continue
        t = re.search(r"(\d)\w*\.?\s*TRIM\.?\s*(\d{4})", _n(enc))
        a = re.fullmatch(r"\s*(\d{4})(\.0)?\s*(\(\d\))?\s*", enc)
        if t:
            v[pd.Timestamp(int(t.group(2)), int(t.group(1)) * 3, 1)] = x * 100
        elif a:
            v[pd.Timestamp(int(a.group(1)), 12, 1)] = x * 100
    s = pd.Series(v).sort_index()
    if len(s) < 20 or not s.between(10, 300).all():
        raise RuntimeError("deuda / PIB: menos de 20 datos o fuera de 10 %-300 %")
    return s


# ---------------------------------------------------------------- consolidada
def pasivos_fin_de_mes():
    """Pasivos remunerados del Banco Central en millones de US$ el último día hábil de cada mes (al A3500 de ese día)."""
    import catalogo  # aquí y no arriba: catalogo importa este módulo
    fx = red.cacheado("d_a3500_bcra", lambda: catalogo._bcra(5)).dropna()
    partes = [red.cacheado(f"bcra_{v}", lambda v=v: catalogo._bcra(v)) for v in VARS_PASIVOS]
    dias = fx.index
    def al_dia(p):
        """Valor vigente cada día del A3500: 0 antes de que exista la variable; NaN (no se arrastra) si su último dato distinto de 0 quedó viejo."""
        p = p.dropna()
        v = p.reindex(dias.union(p.index)).ffill().reindex(dias)
        v[dias < p.index.min()] = 0
        if p.iloc[-1] != 0:
            v[dias > p.index.max() + pd.Timedelta(days=10)] = float("nan")
        return v

    tot = sum(al_dia(p) for p in partes)  # un mes con una variable vieja sale sin dato en la consolidada
    fin = tot.groupby(dias.to_period("M")).last()
    fxm = fx.groupby(dias.to_period("M")).last()
    fin.index = fin.index.to_timestamp()
    fxm.index = fxm.index.to_timestamp()
    return fin, fxm


# ---------------------------------------------------------------- catálogo
def series(idx):
    from catalogo import S  # ídem
    b = _bajar_excel("deuda_mensual", PAG_MENSUAL, r"^boletin_mensual_\d{2}_\d{2}_\d{4}")
    m, prelim = leer_mensual(b)
    ult = m["total"].dropna().index.max()
    prel = sorted(f for f in prelim if f in m["total"].index)
    nota = (f" Los últimos meses ({_mes_txt(prel[0])} a {_mes_txt(prel[-1])}) son preliminares: Finanzas los puede corregir." if len(prel) > 1
            else f" El dato de {_mes_txt(prel[0])} es preliminar: Finanzas lo puede corregir." if prel else "")
    fin_mes = " Saldo a fin de cada mes; lo que está en otras monedas, al tipo de cambio de ese día."
    out = [
        S("deuda_ac_total", "Deuda bruta de la Administración Central", CAT, "usd", "millones de US$", m["total"].reindex(idx), -1, FUENTE + " (hoja A.1)",
          "Todo lo que debe el Tesoro nacional: bonos, letras, organismos internacionales (FMI incluido) y otros préstamos, en pesos y en moneda extranjera."
          + fin_mes + " En «% del PIB» esta página la divide por el PIB de 12 meses con el dólar oficial promedio (cálculo propio): puede diferir unas décimas de la cifra de Finanzas, que está en «Deuda pública bruta / PIB»."
          + nota, agg=True),
        S("deuda_ac_me", "Deuda pública en moneda extranjera", CAT, "usd", "millones de US$", m["me"].reindex(idx), -1, FUENTE + " (hoja A.3)",
          "Parte de la deuda del Tesoro en dólares, euros, yenes, DEG y otras monedas extranjeras. Es la que no se puede pagar con pesos. Solo la deuda en situación de pago normal."
          + fin_mes + nota, agg=True),
        S("deuda_ac_mn", "Deuda pública en moneda nacional", CAT, "usd", "millones de US$", m["mn"].reindex(idx), 0, FUENTE + " (hoja A.3)",
          "Parte de la deuda del Tesoro en pesos (con o sin ajuste por inflación), pasada a dólares al tipo de cambio de fin de mes. Solo la deuda en situación de pago normal."
          + nota, agg=True),
        S("deuda_fmi", "Deuda con el FMI", CAT, "usd", "millones de US$", m["fmi"].reindex(idx), -1, FUENTE + " (hoja A.1, fila FMI)",
          "Lo que el Tesoro le debe al Fondo Monetario Internacional, pasado a dólares (el FMI presta en DEG, su moneda de cuenta)." + fin_mes + nota, agg=True),
        S("deuda_letras_bcra", "Deuda del Tesoro con el Banco Central (letras y adelantos)", CAT, "usd", "millones de US$", m["letras_bcra"].reindex(idx), 0,
          FUENTE + " (hoja A.1, filas LETRA BCRA y adelantos transitorios)",
          "Letras intransferibles que el Tesoro le dio al Banco Central a cambio de reservas, más los adelantos transitorios. Es deuda de una parte del Estado con otra."
          + nota, agg=True),
    ]
    try:
        pib = leer_pib(_bajar_excel("deuda_trimestral", PAG_TRIMESTRAL, r"^deuda_publica_\d{2}-\d{2}-\d{4}", clave=_fecha_trim))
        out.append(S("deuda_pib", "Deuda bruta de la Administración Central / PIB", CAT, "none", "% del PIB", pib.reindex(idx), -1,
                     "Secretaría de Finanzas, datos trimestrales de la deuda (hoja A.4.7)",
                     "Deuda bruta del Tesoro como porcentaje del PIB, calculada por Finanzas. Dato de fin de año (se ubica en diciembre) hasta 2025 y de fin de trimestre desde 2026."))
    except Exception as e:  # noqa: BLE001
        print(f"  Deuda / PIB: no disponible ({e})")
    try:
        pas, fx = pasivos_fin_de_mes()
        pas_usd = (pas / fx).reindex(m["total"].index)
        cons = (m["total"] - m["letras_bcra"] + pas_usd).dropna()
        u = cons.index.max()
        dolar = f"{fx[u]:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        cuenta = (f" La cuenta a {_mes_txt(u)}: deuda bruta {_fmt(m['total'][u])} − letras y adelantos en el Banco Central {_fmt(m['letras_bcra'][u])}"
                  f" + pasivos remunerados del Banco Central {_fmt(pas_usd[u])} ({_fmt(pas[u])} millones de $ a {dolar} $ por dólar)"
                  f" = {_fmt(cons[u])} millones de US$.")
        out.append(S("deuda_consolidada", "Deuda consolidada del Tesoro y el Banco Central", CAT, "usd", "millones de US$", cons.reindex(idx), -1,
                     "Cálculo propio con Secretaría de Finanzas (boletín mensual de deuda) y BCRA (pasivos remunerados, variables 1258, 155, 152 y 196; dólar A3500)",
                     "Cuenta propia, no es un dato oficial. Deuda del Tesoro menos lo que el Tesoro le debe al Banco Central (letras y adelantos: al consolidar es deuda de una parte del Estado con otra) más la deuda en pesos del Banco Central que paga interés (pases, Leliq, Lefi, Lebac), pasada a dólares al oficial del último día hábil de cada mes."
                     " Es un techo: las Lecap y otros títulos en pesos que tiene el Banco Central no se publican aparte y no se restan."
                     " En jul-25 las Lefi pasaron al Tesoro: desde ahí están en la deuda del Tesoro y no en los pasivos del Banco Central (no se cuentan dos veces, pero cambia la composición)."
                     + cuenta + nota, agg=True))
    except Exception as e:  # noqa: BLE001
        print(f"  Deuda consolidada: no disponible ({e})")
    print(f"  Deuda: hasta {_mes_txt(ult)}; preliminares: {', '.join(_mes_txt(f) for f in prel) or 'ninguno'}")
    return out


if __name__ == "__main__":
    idx = pd.date_range("1990-01-01", pd.Timestamp.today().normalize().replace(day=1), freq="MS")
    for s in series(idx):
        v = s["v"].dropna()
        print(f"{s['id']}: {len(v)} datos, {_mes_txt(v.index[0])} a {_mes_txt(v.index[-1])}, último {v.iloc[-1]:,.1f}")
    print(next(s for s in series(idx) if s["id"] == "deuda_consolidada")["desc"])
