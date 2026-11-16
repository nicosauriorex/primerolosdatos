"""
Series de protección social (docs/specs/auh-pensiones.md): AUH, Prestación Alimentar, asignaciones familiares,
pensiones no contributivas y el gasto del Estado en cada una.

Fuentes:
- ANSES vía datos.gob.ar (API de Series de Tiempo): monto de la AUH (165.1_AAUH_0_0_3) y cantidad de niños con AUH y con
  asignación familiar por hijo (189.1_*). Estas últimas vienen en dos tramos: `_44`/`_43` (2009-2013) y `TOTAL_*` (desde 2014);
  se empalman cortando en dic-13/ene-14 (se imprime el salto como control). Los ceros de la fuente son huecos (la prestación
  todavía no existía o no se informó), no «cero niños».
- BESS de la Secretaría de Seguridad Social vía datos.gob.ar: pensiones no contributivas (187.1_*), cantidad vigente a diciembre de
  cada año. Dato anual: se ubica en diciembre (como `deuda_pib`). 2018 es el promedio del año (así lo publica la fuente).
- Subsecretaría de Programación Macroeconómica vía datos.gob.ar: gasto devengado (186.3_*), mensual, en millones de pesos de cada mes.
- Prestación Alimentar (ex Tarjeta Alimentar): no hay serie oficial; es la tabla a mano datos/manual/prestacion_alimentar.json, un
  renglón por cada cambio de monto con su norma y su link. Sin el archivo, `auh_alimentar` y `auh_hogar_4` se omiten.
  El programa empezó en enero de 2020 (Plan Argentina contra el Hambre, Res. 8/2020 del Ministerio de Desarrollo Social): antes de
  ese mes la prestación vale 0. Entre el comienzo y el primer renglón de la tabla (los meses cuya norma no se encontró) la serie queda
  vacía: no se inventa el monto.

Convenciones: montos redondeados (la API trae 156587.99999999997); lo que no tiene dato queda NaN.
Respaldo: datos/cache/proteccion_social.pkl (si la API falla se usa la última copia).
"""
import json
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
RUTA_ALIMENTAR = RAIZ / "datos" / "manual" / "prestacion_alimentar.json"
CAT = ["Empleo, pobreza e ingresos", "Asignaciones y pensiones"]
COMIENZO_ALIMENTAR = pd.Timestamp("2020-01-01")  # comienzo del programa (Res. 8/2020 de Desarrollo Social): antes vale 0

ID_AUH = "165.1_AAUH_0_0_3"
ID_NINOS_AUH = ("189.1_ASIGNACIONADO_II_0_0_44", "189.1_TOTAL_AUHAUH_0_0_9")
ID_NINOS_AAFF = ("189.1_ASIGNACIONADO_II_0_0_43", "189.1_TOTAL_AAFFAFF_0_0_10")
ID_PNC = {"pnc_invalidez": "187.1_PENSIONES_DEZ_0_0_50", "pnc_madres": "187.1_PENSIONES_JOS_0_0_54", "pnc_vejez": "187.1_PENSIONES_JEZ_0_0_46"}
ID_GASTO = {"gasto_auh": "186.3_ASIGNACIONIAL_0_0_43", "gasto_aaff": "186.3_ASIGNACIONRES_0_0_23", "gasto_pnc": "186.3_PENSIONES_VAS_0_0_26"}
# Gasto en pensiones: la unidad es millones de $ en todo el rango (mismo orden que las otras dos), pero en ene y feb de 2004,
# jul-04 y ene-05 el devengado es ~1/300 de lo normal (0,4 a 0,9 contra 100 a 200): no hay dato real. Se corta después del último
# de esos meses y se arranca en feb-05.
GASTO_PNC_DESDE = pd.Timestamp("2005-02-01")
FUENTE_ANSES = "ANSES vía datos.gob.ar, serie "
FUENTE_BESS = "Boletín Estadístico de la Seguridad Social (Secretaría de Seguridad Social) vía datos.gob.ar, serie "
FUENTE_GASTO = "Subsecretaría de Programación Macroeconómica vía datos.gob.ar, serie "
FUENTE_ALIMENTAR = "Ministerio de Capital Humano y ex Ministerio de Desarrollo Social (resoluciones de la Prestación Alimentar)"


def _ceros_huecos(s):
    return s.where(s != 0)


def _empalme(viejo, nuevo, nombre):
    """`viejo` hasta dic-13 y `nuevo` desde ene-14 (ceros = huecos). Imprime el salto dic-13 -> ene-14 y corta si es inverosímil."""
    viejo, nuevo = _ceros_huecos(viejo), _ceros_huecos(nuevo)
    corte = pd.Timestamp("2014-01-01")
    s = pd.concat([viejo[viejo.index < corte], nuevo[nuevo.index >= corte]]).sort_index()
    a, b = s.get(pd.Timestamp("2013-12-01")), s.get(corte)
    if pd.notna(a) and pd.notna(b):
        salto = (b / a - 1) * 100
        print(f"  {nombre}: salto del empalme dic-13 -> ene-14 = {salto:+.2f} %")
        if abs(salto) > 15:
            raise ValueError(f"{nombre}: el empalme de 2013 a 2014 salta {salto:+.1f} %: revisar las series de origen")
    return s


def _anual_a_diciembre(s):
    s = s.dropna()
    return pd.Series(s.values, index=[pd.Timestamp(f.year, 12, 1) for f in s.index])


# ---------------------------------------------------------------- Prestación Alimentar (tabla a mano)
def leer_alimentar(ruta=None):
    """Lee y controla la tabla. Devuelve la lista de períodos [{desde: Timestamp, montos, edad_max, ...}] o None si el archivo no existe."""
    ruta = Path(ruta) if ruta else RUTA_ALIMENTAR
    if not ruta.exists():
        return None
    d = json.loads(ruta.read_text(encoding="utf-8"))
    per = d.get("periodos") or []
    if not per:
        raise ValueError(f"{ruta.name}: no tiene períodos")
    out, ant = [], None
    for i, p in enumerate(per, 1):
        rot = f"{ruta.name}, renglón {i} ({p.get('desde')})"
        if not str(p.get("norma", "")).strip() or not str(p.get("url", "")).strip():
            raise ValueError(f"{rot}: falta la norma o la url (sin cita no se carga)")
        try:
            desde = pd.Timestamp(pd.to_datetime(p["desde"], format="%Y-%m"))
        except Exception as e:  # noqa: BLE001
            raise ValueError(f"{rot}: `desde` tiene que ser AAAA-MM") from e
        if ant is not None and desde <= ant:
            raise ValueError(f"{rot}: las fechas tienen que ir en orden creciente")
        m = p.get("montos")
        if not isinstance(m, list) or len(m) != 3 or any(not isinstance(x, (int, float)) or x <= 0 for x in m):
            raise ValueError(f"{rot}: `montos` tiene que ser una lista de 3 números positivos (1 hijo, 2 hijos, 3 o más)")
        if not (m[0] <= m[1] <= m[2]):  # iguales vale: en 2020 se pagaba lo mismo por 2 que por 3 o más hijos
            raise ValueError(f"{rot}: los montos no pueden bajar con más hijos ({m})")
        if not isinstance(p.get("edad_max"), int) or p["edad_max"] <= 0:
            raise ValueError(f"{rot}: `edad_max` tiene que ser un entero positivo")
        out.append({**p, "desde": desde})
        ant = desde
    return out


def serie_alimentar(per, idx, monto):
    """Serie mensual de monto(período vigente). Antes del comienzo del programa vale 0; entre el comienzo y el primer renglón, NaN."""
    vals = []
    for f in idx:
        vig = [p for p in per if p["desde"] <= f]
        vals.append(float(monto(vig[-1])) if vig else 0.0 if f < COMIENZO_ALIMENTAR else float("nan"))
    return pd.Series(vals, index=idx)


def _monto_hogar_4(p):
    """Alimentar de un hogar con hijos de 6 y 8 años: los que cubra la edad máxima del período (0, 1 o 2 hijos)."""
    n = (6 <= p["edad_max"]) + (8 <= p["edad_max"])
    return 0.0 if n == 0 else p["montos"][n - 1]


# ---------------------------------------------------------------- catálogo
def series(idx, ruta_alimentar=None):
    from catalogo import S, _cacheado_dict  # aquí y no arriba: catalogo importa este módulo
    ids = [ID_AUH, *ID_NINOS_AUH, *ID_NINOS_AAFF, *ID_PNC.values(), *ID_GASTO.values()]
    d = _cacheado_dict("proteccion_social", ids)

    def tiene(*claves):
        faltan = [c for c in claves if c not in d]
        if faltan:
            print(f"  Protección social: faltan {', '.join(faltan)} (sin copia en el respaldo)")
        return not faltan

    out = []
    if tiene(ID_AUH):
        auh = d[ID_AUH].round(0).reindex(idx)
        out.append(S("auh", "Asignación Universal por Hijo (AUH)", CAT, "ars", "$ por mes, por hijo", auh, 1, FUENTE_ANSES + ID_AUH,
                     "Monto pleno de la AUH por hijo (100 %): ANSES paga el 80 % cada mes y el 20 % restante al presentar los controles de salud y escuela. "
                     "No tiene aguinaldo. Los aumentos de 2024 fueron decisiones del gobierno; desde jul-2024 se actualiza cada mes por inflación."))
        per = leer_alimentar(ruta_alimentar)  # ValueError con mensaje claro si la tabla está mal
        if per is None:
            print("  Protección social: falta datos/manual/prestacion_alimentar.json; se omiten auh_alimentar y auh_hogar_4")
        else:
            a1 = serie_alimentar(per, idx, lambda p: p["montos"][0])
            out.append(S("auh_alimentar", "AUH más Prestación Alimentar (un hijo)", CAT, "ars", "$ por mes", (auh + a1).round(0), 1,
                         f"{FUENTE_ANSES}{ID_AUH}; {FUENTE_ALIMENTAR}",
                         "Es la cuenta que publica el Ministerio de Capital Humano: la AUH al 100 % más la Prestación Alimentar de un hijo, para comparar con la canasta "
                         "alimentaria de UN adulto. Hasta oct-2024 la Alimentar no llegaba a los chicos de 14 a 17 años (y hasta abr-2021, solo hasta 6 años); antes de 2020 no existía. De ene-2020 a ene-2021 la serie queda vacía: no encontramos la resolución con los montos de ese período. El aumento de la Alimentar de dic-2022 pudo haber empezado a cobrarse en ene-2023 (la resolución no lo dice)."))
            a4 = serie_alimentar(per, idx, _monto_hogar_4)
            out.append(S("auh_hogar_4", "Lo que cobra un hogar de 4 por AUH y Alimentar", CAT, "ars", "$ por mes", (2 * 0.8 * auh + a4).round(0), 1,
                         f"{FUENTE_ANSES}{ID_AUH}; {FUENTE_ALIMENTAR}",
                         "Es la convención de la UCA: lo que se cobra en mano por dos hijos de 6 y 8 años (el 80 % mensual de la AUH de cada uno, más la Prestación Alimentar "
                         "del hogar si cubre esas edades), para comparar con la canasta alimentaria de toda la familia (hogar de 4). No incluye otros ingresos del hogar. De ene-2020 a ene-2021 queda vacía: no encontramos la resolución con los montos de ese período. El aumento de la Alimentar de dic-2022 pudo haber empezado a cobrarse en ene-2023 (la resolución no lo dice)."))
    if tiene(*ID_NINOS_AUH):
        s = _empalme(d[ID_NINOS_AUH[0]], d[ID_NINOS_AUH[1]], "auh_ninos").round(0).reindex(idx)
        out.append(S("auh_ninos", "Niños con AUH", CAT, "none", "niños", s, 0, f"{FUENTE_ANSES}{ID_NINOS_AUH[0]}, serie {ID_NINOS_AUH[1]}",
                     "Cantidad de prestaciones de AUH (hijos), no de titulares. Dos tramos empalmados: 2009-2013 y desde 2014 (la fuente los publica por separado)."))
    if tiene(*ID_NINOS_AAFF):
        s = _empalme(d[ID_NINOS_AAFF[0]], d[ID_NINOS_AAFF[1]], "aaff_ninos").round(0).reindex(idx)
        out.append(S("aaff_ninos", "Niños con asignación familiar por hijo (trabajadores registrados)", CAT, "none", "niños", s, 0,
                     f"{FUENTE_ANSES}{ID_NINOS_AAFF[0]}, serie {ID_NINOS_AAFF[1]}",
                     "Cantidad de prestaciones de asignación familiar por hijo (SUAF: hijos de trabajadores registrados, jubilados y otros), no de titulares. "
                     "Dos tramos empalmados: 2009-2013 y desde 2014."))
    pnc = {"pnc_invalidez": ("Pensiones por invalidez", "pensiones no contributivas por invalidez laboral (discapacidad)"),
           "pnc_madres": ("Pensiones a madres de 7 o más hijos", "pensiones no contributivas a madres de 7 o más hijos"),
           "pnc_vejez": ("Pensiones no contributivas por vejez", "pensiones no contributivas por vejez")}
    for k, (n, que) in pnc.items():
        sid = ID_PNC[k]
        if not tiene(sid):
            continue
        out.append(S(k, n, CAT, "none", "pensiones", _anual_a_diciembre(d[sid]).round(0).reindex(idx), 0, FUENTE_BESS + sid,
                     f"Cantidad de {que} vigentes a diciembre de cada año (dato anual, se ubica en diciembre). No son altas: la variación entre dos diciembres es altas menos bajas. "
                     "2018 es el promedio del año (así lo publica la fuente). Desde 2024, auditoría de ANDIS (Decreto 843/2024)."))
    gastos = {"gasto_auh": ("Gasto del Estado en AUH", "la Asignación Universal por Hijo"),
              "gasto_aaff": ("Gasto del Estado en asignaciones familiares", "las asignaciones familiares"),
              "gasto_pnc": ("Gasto del Estado en pensiones no contributivas", "las pensiones no contributivas (invalidez, madres de 7 hijos, vejez y graciables)")}
    for k, (n, que) in gastos.items():
        sid = ID_GASTO[k]
        if not tiene(sid):
            continue
        s = _ceros_huecos(d[sid])
        if k == "gasto_pnc":
            s = s[s.index >= GASTO_PNC_DESDE]
        out.append(S(k, n, CAT, "ars", "millones de $", s.round(1).reindex(idx), 0, FUENTE_GASTO + sid,
                     f"Lo que el Estado nacional devengó en {que}, en millones de pesos de cada mes (devengado: puede ser irregular de un mes a otro). "
                     "Sirve para verlo en pesos de hoy y como % del PIB.", agg=True, flujo=True))
    return out


if __name__ == "__main__":
    idx = pd.date_range("1990-01-01", pd.Timestamp.today().normalize().replace(day=1), freq="MS")
    for s in series(idx):
        v = s["v"].dropna()
        print(f"{s['id']}: {len(v)} datos, {v.index[0]:%Y-%m} a {v.index[-1]:%Y-%m}, último {v.iloc[-1]:,.1f}")
