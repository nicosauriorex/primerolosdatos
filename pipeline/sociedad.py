"""
Series de recaudación por impuesto, seguridad, justicia, salud, empleo público y turismo (docs/specs/datos-sociedad-recaudacion.md).

Fuentes:
- Secretaría de Hacienda vía datos.gob.ar (tabla 142.3, recursos tributarios por tributo, mensual, millones de $ de cada mes).
  El «Derechos importación otros» (142.3_DEREC_2001_M_26) es la única línea de derechos de importación de la tabla: se verificó que
  IVA + Ganancias + Bienes Personales + derechos (exportación e importación) + cheque + seguridad social + internos + combustibles
  quedan a menos del 1 % del total de recursos tributarios (lo que resta es PAIS y otros impuestos), o sea que no falta otra línea.
- Ministerio de Seguridad (SNIC) vía datos.gob.ar: homicidios dolosos, anual. Ministerio de Salud (DEIS): mortalidad infantil, anual.
- Ministerio de Justicia, SNEEP (CSV en datos.jus.gob.ar): personas presas a fin de cada año.
- INDEC, serie_dotacion_apn.xlsx: dotación de la administración pública nacional y de empresas y sociedades del Estado, mensual desde jul-22.
- INDEC (Encuesta de Turismo Internacional e Intercambio Comercial Argentino) vía datos.gob.ar: turismo por avión e importaciones de consumo.

Los datos anuales van en diciembre (como pnc_invalidez). Trimestrales: _trim_a_mes. Si una fuente falla y no hay respaldo, se omiten sus series.
Respaldos: datos/cache/sociedad.pkl, sneep.pkl y dotacion_apn.pkl.
"""
import io
import re
import unicodedata

import pandas as pd

import red
from proteccion_social import _anual_a_diciembre

CAT_REC = ["Fiscal", "Recaudación por impuesto"]
CAT_SEG = ["Sociedad", "Seguridad"]
CAT_JUS = ["Sociedad", "Justicia"]
CAT_SAL = ["Sociedad", "Salud"]
CAT_EMP = ["Empleo, pobreza e ingresos", "Empleo público"]
CAT_TUR = ["Sector externo", "Turismo"]
CAT_EXT = ["Sector externo"]  # las importaciones ya están en la raíz, sin subcategoría

URL_SNEEP = "https://datos.jus.gob.ar/dataset/70fc10e1-aa70-4dc9-9dfb-478875f684d8/resource/7d10bdae-a3a8-416e-96ce-094c96ecf7d9/download/sneep-poblacion-total.csv"
URL_DOTACION = "https://www.indec.gob.ar/ftp/cuadros/economia/serie_dotacion_apn.xlsx"

ID_TOTAL = "142.3_TOTAL_2001_M_26"
ID_REC = {  # id de la serie -> (id de la API, nombre, qué es)
    "rec_iva": ("142.3_IVA_2001_M_3", "Recaudación de IVA", "el IVA (impuesto al valor agregado)"),
    "rec_ganancias": ("142.3_GANAN_2001_M_9", "Recaudación de Ganancias", "el impuesto a las Ganancias"),
    "rec_retenciones": ("142.3_DEREC_2001_M_20", "Retenciones a las exportaciones (derechos de exportación)", "los derechos de exportación (las «retenciones»)"),
    "rec_importacion": ("142.3_DEREC_2001_M_26", "Derechos de importación", "los derechos de importación (aranceles)"),
    "rec_bienes_personales": ("142.3_BIENE_2001_M_17", "Recaudación de Bienes Personales", "el impuesto sobre los Bienes Personales"),
    "rec_pais": ("142.3_IMPUESTO_PAIS_0_M_13_92", "Recaudación del impuesto PAIS", "el impuesto PAIS (Para una Argentina Inclusiva y Solidaria)"),
    "rec_cheque": ("142.3_CREDI_2001_M_24", "Impuesto al cheque (débitos y créditos)", "el impuesto sobre los créditos y débitos en cuenta corriente (impuesto al cheque)"),
    "rec_seguridad_social": ("142.3_SISTE_2001_M_24", "Aportes y contribuciones a la seguridad social", "los aportes y contribuciones a la seguridad social"),
}
# Aclaración propia de algunos impuestos, para no engañar.
NOTA_REC = {
    "rec_pais": " Creado por la Ley 27.541 (publicada el 23-dic-2019) por cinco períodos fiscales: de 2025 en adelante lo que figura son pagos atrasados y ajustes (hay meses negativos).",
    "rec_importacion": " La tabla de Hacienda lo rotula «Derechos importación otros»; es la única línea de importación y, junto con las demás, cierra con el total de recursos tributarios.",
}
ID_SNIC = {"homicidios_tasa": "t_snic_1_victimas_arg", "homicidios_victimas": "snic_1_victimas_arg", "homicidios_hechos_tasa": "t_snic_1_hechos_arg"}
ID_TMI = "tmi_arg"
ID_TUR = {"turismo_emisivo": "322.3_TURISMO_EMIVO__15", "turismo_receptivo": "322.3_TURISMO_REIVO__17"}
ID_IMP_CONSUMO = "74.2_IIBCO_0_T_32"

FUENTE_HAC = "Secretaría de Hacienda (Ministerio de Economía) vía datos.gob.ar, serie "
FUENTE_SNIC = "Ministerio de Seguridad de la Nación, SNIC, vía datos.gob.ar, serie "
FUENTE_TMI = "Dirección de Estadísticas e Información en Salud (Ministerio de Salud) vía datos.gob.ar, serie "
FUENTE_SNEEP = "Ministerio de Justicia, SNEEP (datos.jus.gob.ar, dataset «sneep-poblacion-total»)"
FUENTE_DOT = "INDEC con la Secretaría de Transformación del Estado, archivo serie_dotacion_apn.xlsx"
FUENTE_TUR = "INDEC, Encuesta de Turismo Internacional, vía datos.gob.ar, serie "

MESES = {"ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dic": 12}


# ---------------------------------------------------------------- SNEEP (presos)
def _bajar_sneep():
    df = pd.read_csv(io.BytesIO(red.bajar(URL_SNEEP, timeout=120)), encoding="utf-8-sig")
    df["indice_tiempo"] = df["indice_tiempo"].astype(int)
    return df.set_index("indice_tiempo")


def _controlar_sneep(df):
    """total_arg = provincias + spf (±0,5 %). La fuente no siempre lo cumple: se imprimen los años que no y no se corta la corrida."""
    partes = [c for c in df.columns if c != "total_arg"]
    dif = (df[partes].sum(axis=1) / df["total_arg"] - 1) * 100
    malos = dif[dif.abs() > 0.5]
    if len(malos):
        print("  SNEEP: total_arg no coincide con provincias + SPF (±0,5 %) en: " + ", ".join(f"{a} ({d:+.1f} %)" for a, d in malos.items()))
    else:
        print("  SNEEP: total_arg = provincias + SPF en todos los años (±0,5 %)")


# ---------------------------------------------------------------- dotación INDEC
def _fecha_dotacion(v):
    """Fecha de la fila 3 del xlsx: viene como fecha o como texto «nov-22 (i)» (i = imputado). Devuelve (Timestamp, imputado)."""
    if isinstance(v, (pd.Timestamp,)) or hasattr(v, "year"):
        return pd.Timestamp(v.year, v.month, 1), False
    t = str(v).strip().lower()
    m = re.match(r"([a-z]+)\.?-(\d{2})\s*(\(i\))?", t)
    if not m or m.group(1) not in MESES:
        raise ValueError(f"fecha de la dotación no reconocida: {v!r}")
    return pd.Timestamp(2000 + int(m.group(2)), MESES[m.group(1)], 1), bool(m.group(3))


def _ascii(s):
    return unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().strip().lower()


def _bajar_dotacion():
    raw = pd.read_excel(io.BytesIO(red.bajar(URL_DOTACION, timeout=180)), sheet_name=0, header=None)
    col0 = [_ascii(x) for x in raw[0]]
    r0 = [_ascii(x) for x in raw[1]].index("personas")  # el rótulo «Personas» está en la columna de datos, una fila debajo de las fechas
    fechas = [(_fecha_dotacion(v) if pd.notna(v) else None) for v in raw.iloc[r0 - 1, 1:]]
    filas = {"total": "total", "administracion publica nacional": "apn", "empresas y sociedades": "empresas"}
    out = {}
    for i in range(r0 + 1, len(raw)):
        k = filas.get(col0[i])
        if k and k not in out:
            out[k] = pd.to_numeric(raw.iloc[i, 1:], errors="coerce").values
    if set(out) != set(filas.values()):
        raise RuntimeError(f"dotación: faltan filas {set(filas.values()) - set(out)}")
    ok = [j for j, f in enumerate(fechas) if f is not None]
    df = pd.DataFrame({k: v[ok] for k, v in out.items()}, index=pd.DatetimeIndex([fechas[j][0] for j in ok]))
    df["imputado"] = [fechas[j][1] for j in ok]
    return df.dropna(subset=["total"])


def _controlar_dotacion(df):
    dif = (df["total"] - df["apn"] - df["empresas"]).abs()
    if (dif > 1).any():
        raise ValueError(f"Dotación: total distinto de APN + empresas en {list(dif[dif > 1].index.strftime('%Y-%m'))}")
    j = df.loc[pd.Timestamp("2022-07-01")]
    if (j["total"], j["apn"], j["empresas"]) != (341692, 230592, 111100):
        raise ValueError(f"Dotación jul-22 = {tuple(j[['total', 'apn', 'empresas']])}, esperado (341692, 230592, 111100)")
    print(f"  Dotación: total = APN + empresas en {len(df)} meses; jul-22 = 341.692 / 230.592 / 111.100 (control cumplido)")


# ---------------------------------------------------------------- controles de recaudación y homicidios
def _controlar_recaudacion(d):
    tot = d.get(ID_TOTAL)
    partes = {k: d[v[0]] for k, v in ID_REC.items() if v[0] in d}
    if tot is None or not partes:
        print("  Recaudación: sin total para controlar")
        return
    df = pd.DataFrame(partes).fillna(0)
    suma = df.sum(axis=1)
    exceso = (suma / tot.reindex(df.index) - 1) * 100
    malos = exceso[exceso > 0.5]
    if len(malos):
        raise ValueError(f"Recaudación: la suma de los impuestos pasa el total en {list(malos.index.strftime('%Y-%m'))} (hasta {malos.max():+.2f} %)")
    print(f"  Recaudación: la suma de los {len(partes)} impuestos nunca pasa el total (máximo {exceso.max():+.2f} %, mínimo {exceso.min():+.2f} %)")


def _controlar_homicidios(victimas, tasa):
    rel = (victimas / tasa).dropna()
    r = rel[(rel.index.year >= 2014) & (rel.index.year <= 2025)]
    if len(r) and ((r < 360) | (r > 480)).any():
        raise ValueError(f"Homicidios: víctimas / tasa fuera de 360-480 (entre {r.min():.0f} y {r.max():.0f})")
    print(f"  Homicidios: víctimas / tasa (población en cientos de miles) entre {r.min():.0f} y {r.max():.0f} en 2014-2025 (control cumplido)")


# ---------------------------------------------------------------- catálogo
def series(idx, pob=None):
    from catalogo import S, _cacheado_dict, _trim_a_mes  # aquí y no arriba: catalogo importa este módulo
    ids = [ID_TOTAL] + [v[0] for v in ID_REC.values()] + list(ID_SNIC.values()) + [ID_TMI] + list(ID_TUR.values()) + [ID_IMP_CONSUMO]
    d = _cacheado_dict("sociedad", ids)
    out = []

    def tiene(*claves):
        faltan = [c for c in claves if c not in d]
        if faltan:
            print(f"  Sociedad: faltan {', '.join(faltan)} (sin copia en el respaldo)")
        return not faltan

    # Recaudación
    _controlar_recaudacion(d)
    for k, (sid, n, que) in ID_REC.items():
        if not tiene(sid):
            continue
        v = d[sid].round(1)
        if k == "rec_pais":
            v = v[v.index >= "2019-12-01"]  # antes de que existiera la fuente trae ceros, no datos
        out.append(S(k, n, CAT_REC, "ars", "millones de $", v.reindex(idx), 0, FUENTE_HAC + sid,
                     f"Lo que ARCA (ex AFIP) recaudó por {que} en el mes, en millones de pesos de cada mes (no de hoy): se ve mejor en pesos de hoy o como % del PIB. "
                     "Que suba o baje no es ni bueno ni malo en sí." + NOTA_REC.get(k, ""), agg=True, flujo=True))

    # Homicidios
    desc_hom = ("Del Sistema Nacional de Información Criminal (Ministerio de Seguridad). Dato anual, se ubica en diciembre. ")
    if tiene(ID_SNIC["homicidios_tasa"], ID_SNIC["homicidios_victimas"]):
        _controlar_homicidios(d[ID_SNIC["homicidios_victimas"]], d[ID_SNIC["homicidios_tasa"]])
    if tiene(ID_SNIC["homicidios_tasa"]):
        sid = ID_SNIC["homicidios_tasa"]
        out.append(S("homicidios_tasa", "Homicidios dolosos cada 100.000 habitantes", CAT_SEG, "none", "víctimas cada 100.000 habitantes",
                     _anual_a_diciembre(d[sid]).reindex(idx), -1, FUENTE_SNIC + sid,
                     desc_hom + "Es la tasa de víctimas (personas muertas), la que suele citar el gobierno."))
    if tiene(ID_SNIC["homicidios_victimas"]):
        sid = ID_SNIC["homicidios_victimas"]
        out.append(S("homicidios_victimas", "Víctimas de homicidios dolosos", CAT_SEG, "none", "víctimas",
                     _anual_a_diciembre(d[sid]).round(0).reindex(idx), -1, FUENTE_SNIC + sid, desc_hom + "Cantidad de personas asesinadas en el año."))
    if tiene(ID_SNIC["homicidios_hechos_tasa"]):
        sid = ID_SNIC["homicidios_hechos_tasa"]
        out.append(S("homicidios_hechos_tasa", "Homicidios dolosos cada 100.000 habitantes (hechos)", CAT_SEG, "none", "hechos cada 100.000 habitantes",
                     _anual_a_diciembre(d[sid]).reindex(idx), -1, FUENTE_SNIC + sid,
                     desc_hom + "Cuenta casos (hechos): un hecho puede tener varias víctimas, por eso da un poco menos que la tasa de víctimas."))

    # Mortalidad infantil
    if tiene(ID_TMI):
        out.append(S("mortalidad_infantil", "Mortalidad infantil", CAT_SAL, "none", "muertes cada 1.000 nacidos vivos", _anual_a_diciembre(d[ID_TMI]).reindex(idx), -1,
                     FUENTE_TMI + ID_TMI,
                     "Muertes de menores de un año cada 1.000 nacidos vivos (Dirección de Estadísticas e Información en Salud, Ministerio de Salud). "
                     "Dato anual, se ubica en diciembre; el último año sale con unos dos años de atraso."))

    # Presos
    sneep = red.cache_df("sneep", _bajar_sneep)
    if sneep.empty:
        print("  Sociedad: sin SNEEP (sin copia en el respaldo); se omiten presos y presos_tasa")
    else:
        _controlar_sneep(sneep)
        p = _anual_a_diciembre(pd.Series(sneep["total_arg"].values, index=[pd.Timestamp(int(a), 1, 1) for a in sneep.index]).astype(float))
        out.append(S("presos", "Personas presas", CAT_JUS, "none", "personas", p.reindex(idx), 0, FUENTE_SNEEP,
                     "Personas privadas de la libertad en cárceles provinciales y federales a fin de cada año (Sistema Nacional de Estadísticas sobre Ejecución de la Pena, "
                     "Ministerio de Justicia). No incluye a las detenidas en comisarías. Dato anual, se ubica en diciembre."))
        if pob is None or pob.dropna().empty:
            print("  Sociedad: no hay población a mano; se omite presos_tasa")
        else:
            tasa = (p.reindex(idx) / pob.reindex(idx) * 100000).dropna()
            out.append(S("presos_tasa", "Personas presas cada 100.000 habitantes", CAT_JUS, "none", "presos cada 100.000 habitantes", tasa.reindex(idx), 0,
                         f"{FUENTE_SNEEP}; población: INDEC, proyecciones",
                         "Personas presas a fin de cada año (SNEEP, Ministerio de Justicia) cada 100.000 habitantes de la población estimada por el INDEC en diciembre. "
                         "No incluye a las detenidas en comisarías. Dato anual, se ubica en diciembre."))

    # Empleo público nacional
    dot = red.cache_df("dotacion_apn", _bajar_dotacion)
    if dot.empty:
        print("  Sociedad: sin la dotación del INDEC (sin copia en el respaldo); se omiten las series de empleo público")
    else:
        _controlar_dotacion(dot)
        n_i = int(dot["imputado"].sum())
        comun = (f"Dotación de la administración pública nacional (APN) y de las empresas y sociedades del Estado (INDEC, con la Secretaría de Transformación del Estado). "
                 "Empieza en jul-2022: no permite comparar con gobiernos anteriores. Alcance: el archivo no incluye universidades nacionales (solo dos radios universitarias) "
                 "y los entes de Defensa y Seguridad (Estados Mayores, Gendarmería, Prefectura, PSA) figuran con cifras chicas (por ejemplo Gendarmería 752 en jul-22), "
                 "por lo que no parecen contar al personal militar y policial; el INDEC no lo aclara. "
                 f"{n_i} meses son estimaciones del INDEC por imputación («(i)», cuando un ente no informó se repite su última dotación) y se toman igual. "
                 "La cantidad de entes que informan bajó de 149 a 121 (fusiones, disoluciones y traspasos), lo que también mueve el total.")
        for k, col, n in [("empleo_publico_nacional", "total", "Empleados públicos nacionales"),
                          ("empleo_publico_apn", "apn", "Empleados de la administración pública nacional"),
                          ("empleo_publico_empresas", "empresas", "Empleados de empresas y sociedades del Estado")]:
            out.append(S(k, n, CAT_EMP, "none", "personas", dot[col].astype(float).reindex(idx), 0, FUENTE_DOT, comun))

    # Turismo
    for k, n, dr, que in [("turismo_emisivo", "Argentinos que viajan al exterior en avión", 0, "Argentinos (residentes) que salieron del país"),
                          ("turismo_receptivo", "Turistas extranjeros que llegan en avión", 1, "Turistas no residentes que llegaron al país")]:
        sid = ID_TUR[k]
        if tiene(sid):
            out.append(S(k, n, CAT_TUR, "none", "miles de pasajeros", d[sid].round(1).reindex(idx), dr, FUENTE_TUR + sid,
                         f"{que} por el Aeropuerto de Ezeiza y Aeroparque, en miles de pasajeros por mes (Encuesta de Turismo Internacional, INDEC). "
                         "No cuenta los viajes por tierra, río o mar ni por otros aeropuertos.", agg=True))

    # Importaciones de consumo
    if tiene(ID_IMP_CONSUMO):
        out.append(S("imp_consumo", "Importaciones de bienes de consumo", CAT_EXT, "usd", "millones de US$", _trim_a_mes(d[ID_IMP_CONSUMO], idx, repartir=True), 0,
                     "INDEC, Intercambio Comercial Argentino, vía datos.gob.ar, serie " + ID_IMP_CONSUMO,
                     "Lo que el país importó en bienes de consumo (INDEC). El dato es trimestral y se reparte en partes iguales entre los 3 meses.",
                     agg=True, flujo=True))
    return out


if __name__ == "__main__":
    idx = pd.date_range("1990-01-01", pd.Timestamp.today().normalize().replace(day=1), freq="MS")
    import catalogo
    pob = next((s["v"] for s in catalogo.datos_gob(idx) if s["id"] == "poblacion"), None)
    for s in series(idx, pob):
        v = s["v"].dropna()
        print(f"{s['id']}: {len(v)} datos, {v.index[0]:%Y-%m} a {v.index[-1]:%Y-%m}, último {v.iloc[-1]:,.2f}")
