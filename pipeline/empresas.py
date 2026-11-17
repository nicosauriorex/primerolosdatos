"""
Empresas por tamaño y empresas que abren y cierran (docs/specs/empresas-por-tamano.md, Fase 1).

Fuentes:
- SRT (Superintendencia de Riesgos del Trabajo): xlsx «Serie histórica según tamaño de la nómina del empleador - UP», cuadros 4.2
  (empleadores por tramo de trabajadores) y 4.1 (trabajadores cubiertos por tramo). Mensual desde jul-96. Los 13 tramos de la fuente se
  agrupan en seis. Si la URL cambia, se busca en la página de la serie histórica el link .xlsx que contiene «Tama» y «nomina».
- OEDE (Secretaría de Trabajo): xlsx «Flujos de creación y destrucción de empleo», hojas T4 (empresas: aperturas, cierres, empresas con
  empleo) y T1 (puestos creados y destruidos, empleo total), series con estacionalidad. Trimestral desde 2T-96. La página del OEDE da
  403 sin User-Agent de navegador. El número del archivo (…_3.xlsx) cambia con cada actualización: se toma el más alto de la página.

Filas y columnas se ubican por texto (tramos, encabezados), nunca por número.
Respaldos: datos/cache/srt_tamano.pkl y oede_flujos.pkl (la tabla ya armada).
"""
import io
import re
import unicodedata
from datetime import date

import pandas as pd

import red
from mas_series import _control

CAT_TAM = ["Empleo, pobreza e ingresos", "Empresas por tamaño (SRT)"]
CAT_OEDE = ["Empleo, pobreza e ingresos", "Empresas que abren y cierran (OEDE, trimestral)"]

URL_SRT_TAM = "https://www.srt.gob.ar/estadisticas/series/co/up/Serie_historica_Segun_Tama%C3%B1o_de_la_nomina_del_empleador%20-%20UP.xlsx"
URL_SRT_PAGINA = "https://www.srt.gob.ar/estadisticas/cf_serie_historica_up.php"
URL_OEDE_PAGINA = "https://www.argentina.gob.ar/trabajo/estadisticas/oede-estadisticas-nacionales"
URL_OEDE_BASE = "https://www.argentina.gob.ar"
UA_NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

FUENTE_SRT = ("Superintendencia de Riesgos del Trabajo (SRT), estadística de unidades productivas según tamaño de la nómina del empleador "
              "(serie histórica), cuadros 4.2 (empleadores) y 4.1 (trabajadores)")
FUENTE_OEDE = ("Secretaría de Trabajo, Observatorio de Empleo y Dinámica Empresarial (OEDE), «Flujos de creación y destrucción de empleo» "
               "(registros del SIPA), ")

# 13 tramos de la fuente (clave normalizada → nombre corto) y cómo se agrupan en seis
TRAMOS = ["1", "2", "3 A 5", "6 A 10", "11 A 25", "26 A 40", "41 A 50", "51 A 100", "101 A 500", "501 A 1500", "1501 A 2500", "2501 A 5000", "MAS DE 5000"]
GRUPOS = [  # (sufijo del id, texto del nombre, tramos que suma)
    ("t1", "1 trabajador", ["1"]),
    ("t2a5", "2 a 5", ["2", "3 A 5"]),
    ("t6a10", "6 a 10", ["6 A 10"]),
    ("t11a50", "11 a 50", ["11 A 25", "26 A 40", "41 A 50"]),
    ("t51a500", "51 a 500", ["51 A 100", "101 A 500"]),
    ("t501", "más de 500", ["501 A 1500", "1501 A 2500", "2501 A 5000", "MAS DE 5000"]),
]


def _norm(t):
    """Mayúsculas, sin tildes, espacios simples; los números sueltos (1, 2.0) quedan como «1», «2»."""
    if isinstance(t, float) and t == int(t):
        t = int(t)
    t = "".join(c for c in unicodedata.normalize("NFD", str(t)) if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", t).upper().strip()


# ---------------------------------------------------------------- SRT por tamaño
def _bajar_xlsx_srt():
    """La URL de siempre; si no responde un xlsx, se busca en la página de la serie el link .xlsx con «Tama» y «nomina»."""
    try:
        b = red.bajar(URL_SRT_TAM, timeout=120)
        if b[:4] == b"PK\x03\x04":
            return b
    except Exception as e:  # noqa: BLE001
        print(f"  SRT tamaño: la URL conocida falló ({e}); busco el link en la página")
    html = red.bajar(URL_SRT_PAGINA, timeout=60).decode("utf-8", "replace")
    links = [h for h in re.findall(r'href=["\']([^"\']+\.xlsx)["\']', html, flags=re.I)
             if "tama" in _norm(h).lower() and "nomina" in _norm(h).lower()]
    if not links:
        raise RuntimeError("SRT tamaño: no encontré el xlsx por tamaño de la nómina en la página")
    url = links[0] if links[0].startswith("http") else "https://www.srt.gob.ar" + (links[0] if links[0].startswith("/") else "/" + links[0])
    return red.bajar(url.replace(" ", "%20"), timeout=120)


def _leer_cuadro(xls, hoja, prefijo_total):
    """DataFrame fecha × (13 tramos + «TOTAL») de un cuadro de la SRT. Los tramos y la fila de total se buscan por texto en la columna A."""
    df = pd.read_excel(xls, sheet_name=hoja, header=None)
    fila_f = next(i for i in range(10) if isinstance(df.iloc[i, 1], (pd.Timestamp, date)))
    fechas = pd.to_datetime(df.iloc[fila_f, 1:].values)
    rotulos = [_norm(x) if pd.notna(x) else "" for x in df.iloc[:, 0]]
    cols = {}
    for t in TRAMOS:
        fila = next((i for i in range(fila_f + 1, len(df)) if rotulos[i] == t), None)
        if fila is None:
            raise RuntimeError(f"SRT tamaño, {hoja}: no encontré el tramo «{t}»")
        cols[t] = df.iloc[fila, 1:].values
    fila = next((i for i in range(fila_f + 1, len(df)) if rotulos[i].startswith(prefijo_total)), None)
    if fila is None:
        raise RuntimeError(f"SRT tamaño, {hoja}: no encontré la fila de total «{prefijo_total}»")
    cols["TOTAL"] = df.iloc[fila, 1:].values
    out = pd.DataFrame(cols, index=fechas).apply(pd.to_numeric, errors="coerce")
    return out.dropna(how="all").astype(float)


def _bajar_srt_tamano():
    xls = io.BytesIO(_bajar_xlsx_srt())
    emp = _leer_cuadro(xls, "Cuadro 4.2", "PARTE EMPLEADORA AFILIADA DE UNIDADES PRODUCTIVAS CON PERSONAS")
    trab = _leer_cuadro(xls, "Cuadro 4.1", "PERSONAS TRABAJADORAS EN UNIDADES PRODUCTIVAS")
    return pd.concat({"emp": emp, "trab": trab}, axis=1)


def _tamano(idx, out):
    from catalogo import S
    df = red.cache_df("srt_tamano", _bajar_srt_tamano)
    if df.empty:
        print("  Empresas por tamaño (SRT): sin el xlsx (sin copia en el respaldo); se omiten las series por tamaño")
        return
    emp, trab = df["emp"], df["trab"]
    for nom, t in (("empleadores", emp), ("trabajadores", trab)):
        if len(t) != len(pd.date_range(t.index.min(), t.index.max(), freq="MS")):
            raise ValueError(f"Empresas por tamaño (SRT): faltan meses en {nom}")
    # controles estructurales (cortan): la suma de los 13 tramos es el total de la propia hoja, y el de empleadores es el de empresas_art
    # (la propia SRT trae desfasados algunos meses de 1996-97: se avisa y el control corta desde 1998)
    corte = pd.Timestamp("1998-01-01")
    for nom, t in (("empleadores", emp), ("trabajadores", trab)):
        dif = (t[TRAMOS].sum(axis=1) - t["TOTAL"]).abs()
        viejos = dif[(dif > 0) & (dif.index < corte)]
        if len(viejos):
            print(f"  AVISO: Empresas por tamaño (SRT): en {len(viejos)} meses de 1996-97 la suma de los tramos de {nom} no da el total de la hoja "
                  f"({', '.join(f'{f:%Y-%m} ({v:,.0f})' for f, v in viejos.items())}); es un desfasaje de la fuente")
        dif = dif[dif.index >= corte]
        if (dif > 0).any():
            raise ValueError(f"Empresas por tamaño (SRT): la suma de los 13 tramos de {nom} ≠ total de la hoja en "
                             + ", ".join(f"{f:%Y-%m}" for f in dif[dif > 0].index[:6]))
        print(f"  Empresas por tamaño (SRT): suma de los 13 tramos de {nom} = total de la hoja desde 1998-01 ({(t.index >= corte).sum()} meses, control cumplido)")
    f_art = red.CACHE / "srt_empresas.pkl"
    if f_art.exists():
        art = pd.read_pickle(f_art)["empresas"]
        com = emp.index.intersection(art.index)
        dif = (emp.loc[com, TRAMOS].sum(axis=1) - art.loc[com]).abs()
        dif = dif[dif.index >= corte]
        # solo avisa: el respaldo de empresas_art puede ser de otra corrida (la SRT revisa meses viejos) y el control duro es el total de la hoja
        if (dif > 0).any():
            print("  AVISO: Empresas por tamaño (SRT): la suma de tramos ≠ el respaldo de empresas_art (cuadro 1.2) en "
                  + ", ".join(f"{f:%Y-%m} ({v:,.0f})" for f, v in dif[dif > 0].items()) + " (¿revisión de la SRT o respaldo viejo?)")
        else:
            print(f"  Empresas por tamaño (SRT): suma de tramos = empresas_art (cuadro 1.2) en los {len(com)} meses en común desde 1998-01 (control cumplido)")
    else:
        print("  Empresas por tamaño (SRT): sin el respaldo de empresas_art; se compara solo con el total de la hoja 4.2")

    tot_e = emp[TRAMOS].sum(axis=1)
    tot_t = trab[TRAMOS].sum(axis=1)
    n23, ult = pd.Timestamp("2023-11-01"), emp.index.max()
    _control("Empleadores nov-23 (suma de tramos)", tot_e.get(n23), 512357, 0)
    _control("Empleadores ago-26 (suma de tramos)", tot_e.get(pd.Timestamp("2026-08-01")), 479928, 0)
    _control("Empleadores de 1 trabajador nov-23", emp["1"].get(n23), 181390, 0)
    _control("Empleadores de más de 5000 ago-26", emp["MAS DE 5000"].get(pd.Timestamp("2026-08-01")), 114, 0)
    _control("Trabajadores en empresas de más de 5000 ago-26", trab["MAS DE 5000"].get(pd.Timestamp("2026-08-01")), 2560401, 0)
    _control("Trabajadores cubiertos ago-26", tot_t.get(pd.Timestamp("2026-08-01")), 9389184, 0)

    g_e = pd.DataFrame({k: emp[tr].sum(axis=1) for k, _, tr in GRUPOS})
    g_t = pd.DataFrame({k: trab[tr].sum(axis=1) for k, _, tr in GRUPOS})
    if n23 in g_e.index and ult in g_e.index:
        var = g_e.loc[ult] - g_e.loc[n23]
        print(f"  Variación de empleadores por grupo, nov-23 → {ult:%Y-%m}: "
              + "; ".join(f"{k} {v:+,.0f}" for k, v in var.items()) + f"; total {var.sum():+,.0f}; 1 a 5 trabajadores {var['t1'] + var['t2a5']:+,.0f}")

    comun = ("Empleadores (empresas y otras unidades productivas, sin casas particulares) con al menos un trabajador declarado en una ART "
             "(Superintendencia de Riesgos del Trabajo), según cuántos trabajadores tienen. Son variaciones netas por tramo: una empresa que achica "
             "pasa a un tramo menor, así que la baja de un tramo no es lo mismo que empresas que cierran. La SRT avisa que un cambio de un mes "
             "puede venir de rescisiones de contratos o de nóminas vacías. ")
    aviso500 = ("En noviembre de 2025 dejaron de figurar con ART 43.426 trabajadores del Ministerio de Economía de Chubut "
                "(cambio de cobertura, no despidos). ")
    for k, txt, _ in GRUPOS:
        extra = aviso500 if k == "t501" else ""
        nombre_e = "Empresas con " + (txt if k == "t1" else txt + " trabajadores")
        nombre_t = "Trabajadores en empresas de " + txt
        out.append(S(f"empresas_{k}", nombre_e, CAT_TAM, "none", "empresas", g_e[k].reindex(idx), 0, FUENTE_SRT,
                     f"Cantidad de empleadores con {'1 trabajador declarado' if k == 't1' else txt + ' trabajadores declarados'}. " + comun + extra))
        out.append(S(f"trab_empresas_{k}", nombre_t, CAT_TAM, "none", "trabajadores", g_t[k].reindex(idx), 0, FUENTE_SRT,
                     f"Trabajadores cubiertos por una ART que están en empleadores de {txt if k == 't1' else txt + ' trabajadores'}. " + comun + extra))
    chicas = ((g_e["t1"] + g_e["t2a5"]) / tot_e * 100).round(2)
    out.append(S("empresas_chicas_pct", "Empresas de 1 a 5 trabajadores (% del total)", CAT_TAM, "none", "%", chicas.reindex(idx), 0, FUENTE_SRT,
                 "Qué parte de los empleadores con ART tiene entre 1 y 5 trabajadores: (empleadores de 1 + de 2 a 5) / total × 100. Cuenta propia del "
                 "proyecto con datos de la SRT. " + comun))


# ---------------------------------------------------------------- OEDE flujos
def _url_oede():
    """Link del xlsx de flujos en la página del OEDE (puede venir con un prefijo «blank:#»); el de número más alto."""
    html = red.bajar(URL_OEDE_PAGINA, headers={"User-Agent": UA_NAVEGADOR}, timeout=60).decode("utf-8", "replace")
    links = re.findall(r'href=["\'](?:blank:#)?([^"\']*flujos_de_creacion_y_destruccion_de_empleo_(\d+)\.xlsx)["\']', html, flags=re.I)
    if not links:
        raise RuntimeError("OEDE: no encontré el xlsx de flujos de creación y destrucción de empleo en la página")
    ruta = max(links, key=lambda x: int(x[1]))[0]
    return ruta if ruta.startswith("http") else URL_OEDE_BASE + (ruta if ruta.startswith("/") else "/" + ruta)


def _hoja_oede(xls, hoja, pedidos):
    """Serie trimestral por cada pedido: {nombre: (texto del grupo, texto de la columna)}; se ubican por texto en las dos filas de encabezado
    (el grupo se arrastra a las columnas vecinas) y los trimestres por «N.º trim AAAA» en la columna A."""
    df = pd.read_excel(xls, sheet_name=hoja, header=None)
    f_per = next(i for i in range(15) if _norm(df.iloc[i, 0]) == "PERIODO")
    propio = df.iloc[f_per].map(lambda x: _norm(x) if pd.notna(x) else "")  # el texto de la propia celda, sin arrastrar
    grupo = df.iloc[f_per].ffill().map(lambda x: _norm(x) if pd.notna(x) else "")
    sub = df.iloc[f_per + 1].map(lambda x: _norm(x) if pd.notna(x) else "")
    fechas = {}
    for i in range(f_per + 2, len(df)):
        m = re.match(r"\s*(\d)\D*?trim\D*(\d{4})", str(df.iloc[i, 0]), flags=re.I)
        if m:
            fechas[i] = pd.Timestamp(int(m.group(2)), (int(m.group(1)) - 1) * 3 + 1, 1)
    cols = {}
    for nombre, (g, c) in pedidos.items():
        # con subencabezado: grupo arrastrado + texto de la columna; sin él: la columna que tiene el grupo en su propia celda
        cand = [j for j in range(1, df.shape[1]) if (grupo[j].startswith(g) and sub[j] == c) if c] if c else                [j for j in range(1, df.shape[1]) if propio[j].startswith(g)]
        if len(cand) != 1:
            raise RuntimeError(f"OEDE {hoja}: la columna «{g} / {c}» salió {len(cand)} veces (se esperaba una)")
        cols[nombre] = pd.Series(pd.to_numeric(df.iloc[list(fechas), cand[0]], errors="coerce").values, index=list(fechas.values()))
    return pd.DataFrame(cols).dropna(how="all")


def _bajar_oede():
    b = red.bajar(_url_oede(), headers={"User-Agent": UA_NAVEGADOR}, timeout=120)
    if b[:4] != b"PK\x03\x04":
        raise RuntimeError("OEDE: lo bajado no es un xlsx")
    xls = io.BytesIO(b)
    t4 = _hoja_oede(xls, "T4", {"aperturas": ("EMPRESAS CREADORAS", "APERTURAS"), "cierres": ("EMPRESAS DESTRUCTORAS", "CIERRES"),
                                "con_empleo": ("EMPRESAS CON EMPLEO", "")})
    t1 = _hoja_oede(xls, "T1", {"puestos_cierres": ("DESTRUCCION BRUTA", "CIERRES"), "puestos_contraccion": ("DESTRUCCION BRUTA", "CONTINUADORAS"),
                                "empleo_total": ("EMPLEO TOTAL", "")})
    return t4.join(t1, how="outer")


def _oede(idx, out):
    from catalogo import S
    df = red.cache_df("oede_flujos", _bajar_oede)
    if df.empty:
        print("  OEDE: sin el xlsx de flujos (sin copia en el respaldo); se omiten las series de aperturas y cierres")
        return
    falt = df[["aperturas", "cierres", "puestos_cierres", "puestos_contraccion"]].isna().any(axis=1)
    if falt.any():
        raise ValueError("OEDE: trimestres sin dato en T4 o T1: " + ", ".join(f"{f:%Y-%m}" for f in df.index[falt][:6]))
    if len(df) != len(pd.date_range(df.index.min(), df.index.max(), freq="QS-JAN")):
        raise ValueError("OEDE: faltan trimestres en la tabla")
    pxc = (df["puestos_cierres"] / df["cierres"]).round(2)
    if ((pxc < 1) | (pxc > 10)).any():
        raise ValueError(f"OEDE: puestos por empresa que cierra fuera de 1-10 ({pxc.min()}-{pxc.max()}) en "
                         + ", ".join(f"{f:%Y-%m}" for f in pxc[(pxc < 1) | (pxc > 10)].index[:6]))
    print(f"  OEDE: puestos por empresa que cierra entre {pxc.min():.2f} y {pxc.max():.2f} en los {len(pxc)} trimestres (control cumplido)")
    t1, t2 = pd.Timestamp("2026-01-01"), pd.Timestamp("2023-04-01")
    _control("OEDE aperturas 1T-26", df["aperturas"].get(t1), 15231, 0)
    _control("OEDE cierres 1T-26", df["cierres"].get(t1), 18013, 0)
    _control("OEDE puestos por cierres 1T-26", df["puestos_cierres"].get(t1), 43458, 0)
    _control("OEDE puestos por contracción 1T-26", df["puestos_contraccion"].get(t1), 225462, 0)  # T1 (con estacionalidad); en T2, sin estacionalidad, es 230.305
    _control("OEDE empleo total 1T-26", df["empleo_total"].get(t1), 6617693, 0)
    _control("OEDE cierres 2T-23", df["cierres"].get(t2), 22102, 0)
    _control("OEDE puestos por cierres 2T-23", df["puestos_cierres"].get(t2), 52160, 0)

    comun = ("«Cierre» quiere decir que la empresa (CUIT) dejó de declarar empleados en el SIPA: no es una baja en ARCA ni una quiebra. El OEDE avisa "
             "que los cierres recientes se revisan (un cierre se confirma cuando la empresa no vuelve a declarar). Sector privado, sin casas particulares. "
             "Dato trimestral con estacionalidad (se ubica en el primer mes del trimestre): conviene comparar con el mismo trimestre de otro año. ")

    ult = df[["empleo_total", "con_empleo"]].dropna().iloc[-1]
    prom = float(ult["empleo_total"]) / float(ult["con_empleo"])
    ult_trim = f"{(ult.name.month - 1) // 3 + 1}.º trimestre de {ult.name.year}"

    def trim(s):
        return s.reindex(idx)  # un valor por trimestre, como los puestos de trabajo del INDEC: sin repetir ni repartir

    out.append(S("cierres_empresas", "Empresas que cerraron en el trimestre", CAT_OEDE, "none", "empresas", trim(df["cierres"].astype(float)), -1,
                 FUENTE_OEDE + "tabla T4, empresas destructoras de empleo: cierres",
                 "Empresas privadas que declararon empleados en el trimestre anterior y en este ya no. " + comun))
    out.append(S("aperturas_empresas", "Empresas que abrieron en el trimestre", CAT_OEDE, "none", "empresas", trim(df["aperturas"].astype(float)), 1,
                 FUENTE_OEDE + "tabla T4, empresas creadoras de empleo: aperturas",
                 "Empresas privadas que empezaron a declarar empleados en el trimestre (no existían en el SIPA con empleo el trimestre anterior). " + comun))
    out.append(S("puestos_por_cierre", "Puestos que tenía cada empresa que cerró", CAT_OEDE, "none", "puestos por empresa", trim(pxc), 0,
                 FUENTE_OEDE + "tablas T1 (puestos destruidos por cierres) y T4 (cierres); cuenta propia del proyecto",
                 "Puestos de trabajo destruidos por cierres dividido por las empresas que cerraron en el trimestre: el tamaño promedio de las empresas que se van. " + comun
                 + f"La empresa privada promedio tiene unos {prom:.0f} puestos (empleo total / empresas con empleo, {ult_trim}), así que las que cierran son mucho más chicas que el promedio."))
    out.append(S("puestos_perdidos_cierres", "Puestos perdidos por cierres de empresas", CAT_OEDE, "none", "puestos", trim(df["puestos_cierres"].astype(float)), -1,
                 FUENTE_OEDE + "tabla T1, destrucción bruta de empleo: cierres",
                 "Puestos de trabajo registrados que desaparecen porque la empresa que los tenía cerró en el trimestre. " + comun))
    out.append(S("puestos_perdidos_contraccion", "Puestos perdidos en empresas que siguen abiertas", CAT_OEDE, "none", "puestos",
                 trim(df["puestos_contraccion"].astype(float)), -1,
                 FUENTE_OEDE + "tabla T1, destrucción bruta de empleo: continuadoras",
                 "Puestos de trabajo registrados que se pierden en empresas que siguen declarando empleados (achican la nómina, sin cerrar). " + comun))


# ---------------------------------------------------------------- catálogo
def series(idx):
    out = []
    for nombre, f in (("empresas por tamaño (SRT)", _tamano), ("aperturas y cierres (OEDE)", _oede)):
        try:  # un control estructural roto omite solo su fuente, no la otra
            f(idx, out)
        except (ValueError, TypeError, ZeroDivisionError, RuntimeError, KeyError) as e:
            print(f"  ERROR: {nombre}: {e}; se omiten esas series")
    return out


if __name__ == "__main__":
    idx = pd.date_range("1990-01-01", pd.Timestamp.today().normalize().replace(day=1), freq="MS")
    ss = series(idx)
    print(f"{len(ss)} series")
    for s in ss:
        v = s["v"].dropna()
        print(f"{s['id']}: {len(v)} datos, {v.index[0]:%Y-%m} a {v.index[-1]:%Y-%m}, último {v.iloc[-1]:,.2f}   [{' > '.join(s['cat'])}]")
