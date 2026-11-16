"""
Calendario de publicaciones del INDEC: baja https://www.indec.gob.ar/Calendario/FiltrosCalendario/mes/<Mes>-<AAAA>/es
para el mes en curso y los dos siguientes y lo guarda en datos/cache/calendario_indec.json
([{"fecha": "2026-11-18", "hora": "16:00", "informe": "texto del INDEC"}]). Si la bajada falla usa esa copia.

Cada informe se asocia a series del catálogo con la tabla INFORMES (regex sobre el texto -> ids). El período
que se publica sale del texto ("Junio de 2026" -> 2026-06; "Segundo trimestre de 2026" -> 2026-06).

Uso suelto:  python pipeline/calendario.py --bajar
"""
import html
import json
import re
import sys
from datetime import date, datetime, timedelta, timezone

import red

ARCHIVO = "calendario_indec"
URL = "https://www.indec.gob.ar/Calendario/FiltrosCalendario/mes/{mes}-{anio}/es"
HEADERS = {"User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest"}
MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
AR = timezone(timedelta(hours=-3))

# (regex sobre el texto del informe, ids de series del catálogo). El primero de la lista es el principal si no
# está en PRINCIPALES de novedades.py; el orden de PRINCIPALES manda. Un informe puede coincidir con una sola fila (la primera).
INFORMES = [
    (r"[ÍI]ndice de precios al consumidor", ["ipc_empalme", "inflacion", "inflacion_ia"]),
    (r"Valorizaci[óo]n mensual de la canasta b[áa]sica", ["can_cba", "can_cbt", "can_cba_h2", "can_cbt_h2"]),
    (r"Estimador mensual de actividad econ[óo]mica", ["dg_143_3_no_pr_2004_a_31"]),
    (r"Mercado de trabajo\. Tasas", ["dg_42_3_eph_puntuatal_0_m_30", "dg_44_2_ectet_0_t_30", "dg_43_2_ectat_0_t_33", "dg_52_2_asdj_0_0_37"]),
    (r"Indicadores de condiciones de vida de los hogares", ["pob_tasa_pobreza_personas", "pob_tasa_indigencia_personas", "pob_tasa_pobreza_hogares", "pob_tasa_indigencia_hogares"]),
    (r"[ÍI]ndice de salarios", ["dg_149_1_tl_indiios_octu_0_21", "dg_149_1_tl_regiado_octu_0_16", "dg_149_1_sor_priado_octu_0_25"]),
    (r"IPI manufacturero", ["dg_453_1_serie_deseada_0_0_24_58"]),
    (r"Indicadores de coyuntura de la actividad de la construcci[óo]n", ["dg_33_2_isac_sin_edad_0_m_23_56"]),
    (r"Encuesta de supermercados", ["dg_455_1_ventas_pretes_0_m_25_98"]),
    (r"Encuesta nacional de centros de compras", ["dg_458_1_ventas_tottes_abri_m_33_40"]),
    (r"Intercambio comercial argentino", ["dg_74_3_iet_0_m_16", "dg_74_3_iit_0_m_25", "dg_saldo_comercial"]),
    (r"Balanza de pagos", ["dg_160_2_tl_cuennte_0_t_22"]),
    (r"Informe de avance del nivel de actividad", ["dg_3_2_ogp_d_2004_t_17"]),
    (r"Dotaci[óo]n de personal de la administraci[óo]n p[úu]blica", ["empleo_publico_nacional", "empleo_publico_apn", "empleo_publico_empresas"]),
    (r"Estad[íi]sticas de turismo internacional", ["turismo_emisivo", "turismo_receptivo"]),
]

_TRIM = {"primer": 3, "segundo": 6, "tercer": 9, "cuarto": 12}
_SEM = {"primer": 6, "segundo": 12}
_MES = {m.lower(): i + 1 for i, m in enumerate(MESES)}
_MES["setiembre"] = 9


def _sin_tilde(t):
    return t.translate(str.maketrans("áéíóúÁÉÍÓÚ", "aeiouAEIOU"))


def parsear(frag, anio, mes):
    """Fragmento HTML de un mes -> [{fecha, hora, informe}]."""
    items = []
    dia = None
    informe = None
    for m in re.finditer(r'class="nro-dia">\s*(\d+)\s*<|class="cal-content text-calendario[^"]*">(.*?)</div>', frag, re.S):
        if m.group(1):
            dia = int(m.group(1))
            informe = None
            continue
        txt = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", m.group(2)))).strip()
        if dia is None or not txt:
            continue
        h = re.fullmatch(r"(\d{1,2}):(\d{2})\s*hs\.?", txt)
        if h:
            if informe is not None and informe["hora"] is None:
                informe["hora"] = f"{int(h.group(1)):02d}:{h.group(2)}"
            continue
        informe = {"fecha": date(anio, mes, dia).isoformat(), "hora": None, "informe": txt}
        items.append(informe)
    return items


def _bajar_meses(hoy):
    items = []
    y, m = hoy.year, hoy.month
    for _ in range(3):
        frag = red.bajar(URL.format(mes=_sin_tilde(MESES[m - 1]), anio=y), headers=HEADERS).decode("utf-8", errors="replace")
        r = parsear(frag, y, m)
        if not r:
            raise RuntimeError(f"calendario de {MESES[m - 1]} {y} sin informes")
        items += r
        m += 1
        if m == 13:
            m, y = 1, y + 1
    return items


def cargar(con_red=True, hoy=None):
    """Lista de informes del calendario; con red la baja (respaldo: la última copia). Sin red (--solo-json) usa la copia."""
    hoy = hoy or datetime.now(AR).date()
    if con_red:
        d = red.cache_json(ARCHIVO, lambda: _bajar_meses(hoy))
    else:
        f = red.CACHE / f"{ARCHIVO}.json"
        d = json.loads(f.read_text(encoding="utf-8")) if f.exists() else None
    return d or []


def periodo_de(texto):
    """'... Junio de 2026' -> '2026-06'; '... Segundo trimestre de 2026' -> '2026-06'; '... 2025' (anual) -> '2025-12'; si no se entiende, None."""
    t = _sin_tilde(texto).lower()
    m = re.search(r"(primer|segundo|tercer|cuarto) trimestre(?: de)? (\d{4})", t)
    if m:
        return f"{m.group(2)}-{_TRIM[m.group(1)]:02d}"
    m = re.search(r"(primer|segundo) semestre(?: de)? (\d{4})", t)
    if m:
        return f"{m.group(2)}-{_SEM[m.group(1)]:02d}"
    m = re.search(r"\b(" + "|".join(_MES) + r")(?: de)? (\d{4})", t)
    if m:
        return f"{m.group(2)}-{_MES[m.group(1)]:02d}"
    m = re.search(r"\b(?:ano|año)? ?(20\d{2})\s*$", t)
    if m:
        return f"{m.group(1)}-12"
    return None


def tolerancia(texto):
    """Meses de diferencia entre el período del informe y el mes en que la serie lo guarda (trimestrales y semestrales no caen en el último mes)."""
    t = _sin_tilde(texto).lower()
    return 2 if "trimestre" in t else 1 if "semestre" in t else 0


def series_de(texto):
    for rx, ids in INFORMES:
        if re.search(rx, texto, re.I):
            return ids
    return []


if __name__ == "__main__":
    if "--bajar" in sys.argv:
        d = red.cache_json(ARCHIVO, lambda: _bajar_meses(datetime.now(AR).date()))
        print(f"{len(d or [])} informes; {len({x['fecha'] for x in d or []})} fechas")
        for x in d or []:
            print(x["fecha"], x["hora"], x["informe"][:110], "->", series_de(x["informe"]), periodo_de(x["informe"]))
