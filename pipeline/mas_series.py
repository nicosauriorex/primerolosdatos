"""
Subsidios al transporte, transferencias a provincias, becas, seguro de desempleo, demanda eléctrica, patentamientos y autos usados,
gasto nacional por función, siniestros viales y (opcional) femicidios (docs/specs/datos-calientes-2.md).

Fuentes:
- Secretaría de Hacienda, Informe Mensual de Ingresos y Gastos (IMIG, base caja) vía datos.gob.ar: subsidios al transporte y transferencias a provincias.
  Corrientes = 5 mensuales (educación, salud, seguridad social, desarrollo social, otras); de capital = 6 rubros mensuales «Transferencias a provincias»
  (transporte, otros, educación, energía, vivienda, agua y alcantarillado). No hay un total anual publicado: el control compara cada componente y la suma
  contra sus anuales.
- Secretaría de Política Económica (becas, seguro de desempleo, devengado), CAMMESA (demanda eléctrica), Ministerio de Seguridad SNIC (siniestros viales).
- DNRPA (Ministerio de Justicia, datos.jus.gob.ar): inscripciones iniciales y transferencias de automotores. La URL de cada CSV cambia todos los meses:
  se resuelve con el package_show de CKAN.
- Presupuesto Abierto: datos/cache/gasto_nacion_finfun.csv (lo baja gasto_nacion.py).
- datos/manual/femicidios.json (opcional): si no existe, no se agrega la serie.

Respaldos: datos/cache/mas_series.pkl y dnrpa_autos.pkl.
"""
import io
import json
import re

import pandas as pd

import red
from proteccion_social import _anual_a_diciembre

CAT_FI = ["Fiscal"]
CAT_TRANSF = ["Fiscal", "Transferencias a provincias"]
CAT_GASTO = ["Fiscal", "Gasto por función"]
CAT_PS = ["Empleo, pobreza e ingresos", "Asignaciones y pensiones"]  # la de AUH y pensiones
CAT_ACT = ["Actividad"]
CAT_CONS = ["Actividad", "Consumo e indicadores de demanda"]
CAT_VIAL = ["Sociedad", "Seguridad vial"]
CAT_SEG = ["Sociedad", "Seguridad"]

ID_TRANSPORTE = "452.2_TRANSPORTERTE_0_T_10_32"
# componentes mensuales -> su anual
ID_CORR = {"Educación": ("452.2_TRANSFERENION_0_T_46_94", "452.2_TRANSFERENION_0_T_46_88"),
           "Salud": ("452.2_TRANSFERENLUD_0_T_42_88", "452.2_TRANSFERENLUD_0_T_42_72"),
           "Seguridad Social": ("452.2_TRANSFERENIAL_0_T_53_66", "452.2_TRANSFERENIAL_0_T_53_38"),
           "Desarrollo Social": ("452.2_TRANSFERENIAL_0_T_54_58", "452.2_TRANSFERENIAL_0_T_54_54"),
           "Otras transferencias": ("452.2_TRANSFERENRAS_0_T_42_55", "452.2_TRANSFERENRAS_0_T_42_60")}
ID_CAP = {"Transporte": ("452.3_CAPITAL_TRIAS_0_M_43_35", "452.2_CAPITAL_TRIAS_0_T_43_86"),
          "Otros": ("452.3_CAPITAL_OTIAS_0_M_38_72", "452.2_CAPITAL_OTIAS_0_T_38_29"),
          "Educación": ("452.3_CAPITAL_EDIAS_0_M_42_42", "452.2_CAPITAL_EDIAS_0_T_42_100"),
          "Energía": ("452.3_CAPITAL_ENIAS_0_M_40_18", "452.2_CAPITAL_ENIAS_0_T_40_15"),
          "Vivienda": ("452.3_CAPITAL_VIIAS_0_M_41_41", "452.2_CAPITAL_VIIAS_0_T_41_93"),
          "Agua potable y alcantarillado": ("452.3_CAPITAL_AGIAS_0_M_59_12", "452.2_CAPITAL_AGIAS_0_T_59_13")}
ID_BECAS = "186.3_BECASCAS_0_0_5"
ID_SEGURO = "186.2_SEGURO_DESLEO_0_0_16"
ID_DEMANDA = "367.3_DEMANDA_TOTAL__13"
ID_VIAL_TASA = "t_snic_3_victimas_arg"
ID_VIAL = "snic_3_victimas_arg"

PAQUETE_DNRPA = "1ab0cc03-ab9b-4520-975c-5757d87d1061"
URL_PAQUETE = "https://datos.jus.gob.ar/api/3/action/package_show?id=" + PAQUETE_DNRPA
FINFUN = {  # id de la serie -> (columna del CSV de Presupuesto Abierto, nombre de la función ahí, nombre público)
    "gasto_salud": ("finalidad3_funcion1", "Salud", "Gasto nacional en salud (% del PIB)"),
    "gasto_educacion": ("finalidad3_funcion4", "Educación y Cultura", "Gasto nacional en educación y cultura (% del PIB)"),
    "gasto_ciencia": ("finalidad3_funcion5", "Ciencia, Tecnología e Innovación", "Gasto nacional en ciencia y técnica (% del PIB)"),
    "gasto_seguridad": ("finalidad2_funcion2", "Seguridad Interior", "Gasto nacional en seguridad interior (% del PIB)"),
    "gasto_defensa": ("finalidad2_funcion1", "Defensa", "Gasto nacional en defensa (% del PIB)"),
}

FUENTE_HAC = "Secretaría de Hacienda (Ministerio de Economía), Informe Mensual de Ingresos y Gastos, vía datos.gob.ar, serie "
FUENTE_SERIES = FUENTE_HAC.replace(", serie ", ", series ")
FUENTE_SPE = "Secretaría de Política Económica (Ministerio de Economía) vía datos.gob.ar, serie "
FUENTE_DNRPA = "Dirección Nacional de los Registros Nacionales de la Propiedad del Automotor (Ministerio de Justicia), datos.jus.gob.ar, dataset «Estadística de trámites de automotores», "
FUENTE_SNIC = "Ministerio de Seguridad de la Nación, SNIC, vía datos.gob.ar, serie "
FUENTE_GASTO = "Presupuesto Abierto (Dirección General de Sistemas de Información Financiera, Ministerio de Economía), serie_finfun_anual.csv"
MANUAL_FEMICIDIOS = red.CACHE.parent / "manual" / "femicidios.json"


def _control(nombre, real, esperado, tol=0.001):
    """Valor de control de la spec (un mes puntual). Solo avisa: la fuente puede revisar un dato viejo y eso no debe
    tirar abajo la corrida diaria; los controles estructurales (sumas, rangos, provincias) sí la cortan."""
    if pd.isna(real) or abs(real / esperado - 1) > tol:
        print(f"  AVISO: {nombre} = {real}, esperado {esperado:,} (¿la fuente revisó el dato?)")
        return
    print(f"  {nombre} = {esperado:,} (control cumplido)")


# ---------------------------------------------------------------- transferencias a provincias
def _suma_componentes(d, comp):
    """Suma mensual de los componentes; solo los meses en que están todos."""
    df = pd.DataFrame({k: d[v[0]] for k, v in comp.items() if v[0] in d})
    if df.shape[1] != len(comp):
        return None
    return df.sum(axis=1, min_count=len(comp)).dropna()


def _controlar_anuales(nombre, d, comp):
    """Suma anual de los mensuales = anual de la API (±0,5 %), componente por componente y en total, en los años cerrados. No corta la corrida."""
    ult_mes = max(d[v[0]].index.max() for v in comp.values())
    peores = []
    tot_m, tot_a = None, None
    for k, (m, a) in comp.items():
        if m not in d or a not in d:
            print(f"  {nombre}: falta el anual de {k}; no se compara")
            return
        sm = d[m].groupby(d[m].index.year).sum()
        sa = pd.Series(d[a].values, index=d[a].index.year)
        sa = sa[sa.index < ult_mes.year]
        tot_m = sm.reindex(sa.index) if tot_m is None else tot_m + sm.reindex(sa.index)
        tot_a = sa if tot_a is None else tot_a + sa
        dif = (sm.reindex(sa.index) - sa).abs()
        malos = dif[dif > 0.005 * sa.abs().clip(lower=1)]
        if len(malos):
            peores.append(f"{k}: " + ", ".join(f"{y}" for y in malos.index))
    tot = ((tot_m / tot_a - 1) * 100).abs()
    if peores:
        print(f"  {nombre}: componentes que no coinciden con su anual (±0,5 %): " + "; ".join(peores))
    print(f"  {nombre}: suma de los mensuales vs suma de los anuales {tot.index.min()}-{tot.index.max()}: desvío máximo {tot.max():.3f} % "
          + ("(control cumplido)" if tot.max() <= 0.5 else "(NO cumple ±0,5 %)"))


# ---------------------------------------------------------------- DNRPA
def _url_csv(recursos, prefijo):
    for r in recursos:
        if r.get("name", "").startswith(prefijo) and str(r.get("format", "")).upper() == "CSV":
            return r["url"]
    raise RuntimeError(f"no encontré el recurso «{prefijo}…» en el dataset de la DNRPA")


def _leer_dnrpa(url, prefijo_col):
    df = pd.read_csv(io.BytesIO(red.bajar(url, timeout=180)), encoding="utf-8-sig")
    anio = next(c for c in df.columns if c.startswith("anio_"))
    mes = next(c for c in df.columns if c.startswith("mes_"))
    cant = next(c for c in df.columns if c.startswith("cantidad_"))
    prov = next(c for c in df.columns if c.startswith("provincia_") and c != "provincia_id" and not c.startswith("provincia_id"))
    df["fecha"] = pd.to_datetime(dict(year=df[anio], month=df[mes], day=1))
    g = df.groupby("fecha")
    out = pd.DataFrame({prefijo_col: g[cant].sum(), prefijo_col + "_provincias": g[prov].nunique()})
    return out, sorted(df["tipo_vehiculo"].dropna().unique())


def _bajar_dnrpa():
    paquete = json.loads(red.bajar(URL_PAQUETE, timeout=60))
    rec = paquete["result"]["resources"]
    ins, tipos_i = _leer_dnrpa(_url_csv(rec, "Estadística de inscripciones iniciales"), "inscripciones")
    tr, tipos_t = _leer_dnrpa(_url_csv(rec, "Estadística de transferencias"), "transferencias")
    df = ins.join(tr, how="outer")
    df.attrs["tipos"] = {"inscripciones": tipos_i, "transferencias": tipos_t}
    return df


def _controlar_dnrpa(df):
    for col in ("inscripciones", "transferencias"):
        p = df[col + "_provincias"].dropna()
        if (p < 20).any():
            raise ValueError(f"DNRPA {col}: meses con menos de 20 provincias: {list(p[p < 20].index.strftime('%Y-%m'))[:6]}")
        print(f"  DNRPA {col}: entre {int(p.min())} y {int(p.max())} provincias por mes (control cumplido)")
    ins = df["inscripciones"]
    _control("Patentamientos ene-00", ins.get(pd.Timestamp("2000-01-01")), 46926, 0)
    _control("Patentamientos oct-25", ins.get(pd.Timestamp("2025-10-01")), 52559, 0)
    if pd.Timestamp("2026-10-01") in ins.index:
        _control("Patentamientos oct-26", ins.get(pd.Timestamp("2026-10-01")), 46390, 0)


# ---------------------------------------------------------------- gasto por función
def _gasto_funcion():
    """DataFrame de % del PIB por serie, indexado por año (cerrado). Lee el CSV de Presupuesto Abierto sin bajarlo."""
    import gasto_nacion
    fin = gasto_nacion.cargar_finfun(False)
    fin = fin.sort_values("ejercicio_presupuestario").set_index("ejercicio_presupuestario")
    fin = fin[fin["pib"].notna() & (fin.index < pd.Timestamp.today().year)]
    cols = [c for c in fin.columns if re.fullmatch(r"finalidad\d+_funcion\d+", c)]
    return fin, cols


def _controlar_gasto(fin, cols, pct):
    import gasto_nacion
    # el total de las funciones coincide con el de la serie larga de /gasto/ (mismo archivo): se compara el cálculo propio con el de gasto_nacion
    larga = gasto_nacion._serie_larga(fin.reset_index(), {})
    tot_larga = {f["n"]: f["v"] for f in larga["finalidades"]}
    tot_propio = fin[cols].fillna(0).sum(axis=1) / 1e6
    suma_larga = [sum(f["v"][i] for f in larga["finalidades"]) for i in range(len(larga["anios"]))]
    dif = max(abs(a - b) / b for a, b in zip(suma_larga, tot_propio.sort_index().values) if b)
    print(f"  Gasto por función: suma de todas las funciones = total de la serie larga de /gasto/ (desvío máximo {dif:.2e})")
    if dif > 1e-3:
        raise ValueError("Gasto por función: la suma no coincide con la serie larga de /gasto/")
    del tot_larga
    for k, p in pct.items():
        if ((p < 0) | (p > 5)).any():
            raise ValueError(f"Gasto por función {k}: % del PIB fuera de 0-5 ({p.min():.2f}-{p.max():.2f})")
    sal = pct["gasto_salud"]
    # lo que muestra /gasto/ para Salud en 2024 (serie larga, millones de pesos / PIB en millones)
    f3 = next(f for f in larga["finalidades"] if f["n"] == "Finalidad 3")
    h = next((x for x in f3["h"] if x["n"] == "Función 3.1"), None)
    if h is not None:
        i = larga["anios"].index(2024)
        print(f"  Gasto por función: salud 2024 = {sal.loc[2024]:.3f} % del PIB; en /gasto/ = {h['v'][i] / larga['pib'][i] * 100:.3f} %")
    else:
        print(f"  Gasto por función: salud 2024 = {sal.loc[2024]:.3f} % del PIB")
    print("  Gasto por función: todos entre 0 y 5 % del PIB (control cumplido): "
          + ", ".join(f"{k.split('_')[1]} {p.iloc[-1]:.2f} %" for k, p in pct.items()))


# ---------------------------------------------------------------- femicidios (opcional)
def _femicidios():
    """Lee datos/manual/femicidios.json. Devuelve una Serie anual (víctimas) y el texto de fuente, o None si no hay archivo o no alcanza."""
    if not MANUAL_FEMICIDIOS.exists():
        return None
    d = json.loads(MANUAL_FEMICIDIOS.read_text(encoding="utf-8"))
    ok = [a for a in d.get("anios", []) if all(a.get(k) not in (None, "") for k in ("anio", "victimas", "documento", "pagina", "cita"))]
    if len(ok) < 8:
        print(f"  Femicidios: solo {len(ok)} años con documento, página y cita (hacen falta 8); se omite la serie")
        return None
    s = pd.Series({pd.Timestamp(int(a["anio"]), 1, 1): float(a["victimas"]) for a in ok}).sort_index()
    return _anual_a_diciembre(s), d.get("fuente", "Registro Nacional de Femicidios de la Justicia Argentina (Corte Suprema, Oficina de la Mujer)")


# ---------------------------------------------------------------- catálogo
def series(idx, pob=None):
    from catalogo import S, _cacheado_dict, _trim_a_mes  # aquí y no arriba: catalogo importa este módulo
    ids = [ID_TRANSPORTE, ID_BECAS, ID_SEGURO, ID_DEMANDA, ID_VIAL_TASA, ID_VIAL]
    for comp in (ID_CORR, ID_CAP):
        ids += [x for par in comp.values() for x in par]
    d = _cacheado_dict("mas_series", ids)
    out = []

    def tiene(*claves):
        faltan = [c for c in claves if c not in d]
        if faltan:
            print(f"  Más series: faltan {', '.join(faltan)} (sin copia en el respaldo)")
        return not faltan

    # Subsidios al transporte
    if tiene(ID_TRANSPORTE):
        t = d[ID_TRANSPORTE]
        _control("Subsidios al transporte sep-26", t.get(pd.Timestamp("2026-09-01")), 246807.4)
        _control("Subsidios al transporte ago-26", t.get(pd.Timestamp("2026-08-01")), 290327.8)
        out.append(S("sub_transporte", "Subsidios al transporte", CAT_FI, "ars", "millones de $", t.round(1).reindex(idx), 0, FUENTE_HAC + ID_TRANSPORTE,
                     "Plata del Estado nacional para que los colectivos y trenes (sobre todo del AMBA) cobren boletos más baratos de lo que cuestan. "
                     "Es lo efectivamente pagado en el mes (base caja), en millones de pesos de cada mes: se ve mejor en pesos de hoy o como % del PIB. "
                     "Los subsidios a la energía están aparte y su dato es trimestral.", agg=True, flujo=True))

    # Transferencias a provincias
    comun_transf = ("Son las transferencias que el gobierno nacional decide mes a mes (no automáticas): no incluyen la coparticipación ni otras transferencias fijadas por ley. "
                    "Base caja (lo pagado), en millones de pesos de cada mes: se ve mejor en pesos de hoy. Fuente: Informe Mensual de Ingresos y Gastos, Secretaría de Hacienda. ")
    cor = cap = None
    if tiene(*[v[0] for v in ID_CORR.values()]):
        cor = _suma_componentes(d, ID_CORR)
        _controlar_anuales("Transferencias corrientes", d, ID_CORR)
        out.append(S("transf_prov_corrientes", "Transferencias corrientes a provincias (no automáticas)", CAT_TRANSF, "ars", "millones de $", cor.round(1).reindex(idx), 0,
                     FUENTE_SERIES + ", ".join(v[0] for v in ID_CORR.values()),
                     "Plata que la Nación gira a las provincias para gastos del día a día: educación, salud, seguridad social (cajas de jubilaciones no transferidas), desarrollo social y otras. "
                     + comun_transf + "Suma de 5 series.", agg=True, flujo=True))
    if tiene(*[v[0] for v in ID_CAP.values()]):
        cap = _suma_componentes(d, ID_CAP)
        _controlar_anuales("Transferencias de capital", d, ID_CAP)
        out.append(S("transf_prov_capital", "Transferencias de capital a provincias (obras)", CAT_TRANSF, "ars", "millones de $", cap.round(1).reindex(idx), 0,
                     FUENTE_SERIES + ", ".join(v[0] for v in ID_CAP.values()),
                     "Plata que la Nación gira a las provincias para obras: transporte, educación, energía, vivienda, agua y alcantarillado y otras. "
                     + comun_transf + "Suma de 6 series.", agg=True, flujo=True))
    if cor is not None and cap is not None:
        tot = (cor + cap).dropna()
        out.append(S("transf_prov", "Transferencias no automáticas a provincias (corrientes + capital)", CAT_TRANSF, "ars", "millones de $", tot.round(1).reindex(idx), 0,
                     FUENTE_SERIES + ", ".join([v[0] for v in ID_CORR.values()] + [v[0] for v in ID_CAP.values()]),
                     "Suma de las transferencias corrientes (gastos del día a día) y de capital (obras) que la Nación gira a las provincias. "
                     + comun_transf + "Solo figuran los meses en que están las dos partes.", agg=True, flujo=True))

    # Becas y seguro de desempleo
    if tiene(ID_BECAS):
        b = d[ID_BECAS]
        _control("Becas oct-26", b.get(pd.Timestamp("2026-10-01")), 35332.6)
        out.append(S("becas", "Gasto en becas (Progresar y otras)", CAT_PS, "ars", "millones de $", b.round(1).reindex(idx), 0, FUENTE_SPE + ID_BECAS,
                     "Lo que el Estado nacional gasta (devengado) en becas por vulnerabilidad social, como las Becas Progresar para estudiantes, en millones de pesos de cada mes: "
                     "se ve mejor en pesos de hoy. Secretaría de Política Económica.", agg=True, flujo=True))
    if tiene(ID_SEGURO):
        s = d[ID_SEGURO]
        _control("Seguro de desempleo 3T-26", s.get(pd.Timestamp("2026-07-01")), 133239.6)
        out.append(S("seguro_desempleo", "Gasto en seguro de desempleo", CAT_PS, "ars", "millones de $", _trim_a_mes(s, idx, repartir=True).round(1), 0, FUENTE_SPE + ID_SEGURO,
                     "Lo que ANSES paga a quienes perdieron un empleo registrado (devengado), en millones de pesos de cada mes: se ve mejor en pesos de hoy. "
                     "El dato es trimestral y se reparte en partes iguales entre los 3 meses. Secretaría de Política Económica.", agg=True, flujo=True))

    # Demanda eléctrica
    if tiene(ID_DEMANDA):
        e = d[ID_DEMANDA]
        _control("Demanda de electricidad sep-26", e.get(pd.Timestamp("2026-09-01")), 11209.9)
        out.append(S("demanda_electrica", "Demanda de electricidad", CAT_ACT, "none", "GWh", e.round(1).reindex(idx), 1, "CAMMESA vía datos.gob.ar, serie " + ID_DEMANDA,
                     "Toda la energía eléctrica pedida al sistema mayorista (CAMMESA) en el mes, en gigavatios-hora. Depende mucho del clima (sube en verano y en invierno): "
                     "conviene compararla con el mismo mes de otros años.", agg=True))

    # Patentamientos y autos usados
    dn = red.cache_df("dnrpa_autos", _bajar_dnrpa)
    if dn.empty:
        print("  Más series: sin los CSV de la DNRPA (sin copia en el respaldo); se omiten patentamientos y transferencias de autos")
    else:
        _controlar_dnrpa(dn)
        tipos = dn.attrs.get("tipos")
        if tipos:
            print(f"  DNRPA: tipo_vehiculo en inscripciones = {tipos['inscripciones']}; en transferencias = {tipos['transferencias']}")
        comun = ("Dato de la Dirección Nacional de los Registros Nacionales de la Propiedad del Automotor (DNRPA, Ministerio de Justicia), suma de todas las provincias. "
                 "El archivo agrupa todo en «Automotores» y no distingue tipos de vehículo (el registro automotor incluye autos y utilitarios; las motos tienen otro registro). ")
        out.append(S("patentamientos", "Patentamientos de autos 0 km", CAT_CONS, "none", "autos", dn["inscripciones"].dropna().astype(float).reindex(idx), 1,
                     FUENTE_DNRPA + "recurso «Estadística de inscripciones iniciales de automotores»",
                     "Autos y utilitarios 0 km inscriptos por primera vez en el Registro del Automotor en el mes. " + comun, agg=True))
        out.append(S("transferencias_autos", "Ventas de autos usados (transferencias)", CAT_CONS, "none", "autos", dn["transferencias"].dropna().astype(float).reindex(idx), 1,
                     FUENTE_DNRPA + "recurso «Estadística de transferencias de automotores»",
                     "Cambios de titular de autos ya inscriptos (compraventas de usados) registrados en el mes. " + comun, agg=True))

    # Gasto por función
    try:
        fin, cols = _gasto_funcion()
        pct = {k: (fin[c].fillna(0) / fin["pib"] * 100) for k, (c, _, _) in FINFUN.items()}
        _controlar_gasto(fin, cols, pct)
        for k, (c, f, n) in FINFUN.items():
            p = pct[k]
            v = pd.Series(p.values, index=[pd.Timestamp(int(a), 12, 1) for a in p.index]).round(3)
            out.append(S(k, n, CAT_GASTO, "none", "% del PIB", v.reindex(idx), 0, FUENTE_GASTO,
                         f"Gasto devengado de la Administración Pública Nacional en «{f}», como % del PIB del año (se divide el gasto en pesos de cada año por el PIB de ese año, "
                         "por eso no hace falta ajustar por inflación). Presupuesto Abierto, Ministerio de Economía. No incluye lo que gastan las provincias y los municipios "
                         "(en educación y salud, la mayor parte). Dato anual, se ubica en diciembre; el año en curso no figura hasta que cierra."))
    except FileNotFoundError:
        print("  Más series: no está gasto_nacion_finfun.csv; se omiten las series de gasto por función")

    # Siniestros viales
    if tiene(ID_VIAL, ID_VIAL_TASA):
        r = (d[ID_VIAL] / d[ID_VIAL_TASA]).dropna()
        r = r[(r.index.year >= 2014) & (r.index.year <= 2025)]
        if ((r < 400) | (r > 480)).any():
            raise ValueError(f"Siniestros viales: víctimas / tasa fuera de 400-480 ({r.min():.0f}-{r.max():.0f})")
        print(f"  Siniestros viales: víctimas / tasa entre {r.min():.0f} y {r.max():.0f} en 2014-2025 (control cumplido)")
        _control("Siniestros viales tasa 2025", d[ID_VIAL_TASA].get(pd.Timestamp("2025-01-01")), 7.72, 0.001)
        _control("Siniestros viales tasa 2024", d[ID_VIAL_TASA].get(pd.Timestamp("2024-01-01")), 7.68, 0.001)
        _control("Siniestros viales 2025", d[ID_VIAL].get(pd.Timestamp("2025-01-01")), 3583, 0)
        _control("Siniestros viales 2024", d[ID_VIAL].get(pd.Timestamp("2024-01-01")), 3555, 0)
        desc = ("Muertes en hechos de tránsito registrados por las fuerzas de seguridad (Sistema Nacional de Información Criminal, Ministerio de Seguridad). "
                "Puede diferir de la Agencia Nacional de Seguridad Vial, que cuenta también a quienes mueren hasta 30 días después. Dato anual, se ubica en diciembre. ")
        t = _anual_a_diciembre(d[ID_VIAL_TASA][d[ID_VIAL_TASA].index.year >= 2014])
        v = _anual_a_diciembre(d[ID_VIAL][d[ID_VIAL].index.year >= 2014])
        out.append(S("siniestros_viales_tasa", "Muertes en siniestros viales cada 100.000 habitantes", CAT_VIAL, "none", "víctimas cada 100.000 habitantes",
                     t.round(2).reindex(idx), -1, FUENTE_SNIC + ID_VIAL_TASA, desc + "Es la tasa, que descuenta el crecimiento de la población."))
        out.append(S("siniestros_viales", "Muertes en siniestros viales", CAT_VIAL, "none", "víctimas", v.round(0).reindex(idx), -1, FUENTE_SNIC + ID_VIAL,
                     desc + "Cantidad de personas muertas en el año."))

    # Femicidios (opcional: solo si está datos/manual/femicidios.json con cita por año)
    fem = _femicidios()
    if fem is not None:
        s, fuente = fem
        out.append(S("femicidios", "Víctimas directas de femicidio", CAT_SEG, "none", "víctimas", s.reindex(idx), -1, fuente,
                     "Mujeres y otras víctimas directas de femicidio por año según el Registro Nacional de Femicidios de la Justicia Argentina (Oficina de la Mujer, Corte Suprema). "
                     "Sale de las causas judiciales, no de las noticias: los observatorios de ONG que cuentan casos de los medios dan cifras más altas. "
                     "No incluye los femicidios vinculados (personas asesinadas para dañar a una mujer), que el registro cuenta aparte; incluye mujeres trans y travestis desde 2016. "
                     "2014-2016 son datos provisorios que la propia Corte toma con cautela (probable subregistro en 2014 y 2015, sin empalme con 2017 en adelante); "
                     "2017-2020 son las cifras revisadas del informe 2025, que difieren levemente de las publicadas en su momento. "
                     "Cargado a mano desde los informes del registro (cada año con su documento y página). Dato anual, se ubica en diciembre."))
    return out


if __name__ == "__main__":
    idx = pd.date_range("1990-01-01", pd.Timestamp.today().normalize().replace(day=1), freq="MS")
    for s in series(idx):
        v = s["v"].dropna()
        print(f"{s['id']}: {len(v)} datos, {v.index[0]:%Y-%m} a {v.index[-1]:%Y-%m}, último {v.iloc[-1]:,.2f}   [{' > '.join(s['cat'])}]")
