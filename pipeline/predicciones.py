"""
Predicciones (bloque 9c): rondas de la inflación mensual del INDEC con lo que esperaban los analistas (REM del Banco Central).

- Baja el histórico del REM (Excel, ~1,6 MB) con red.py y guarda solo las filas del IPC mensual en datos/cache/rem_ipc_mensual.csv
  (respaldo versionado: fecha de pronóstico, período, mediana, n). Sin red (--solo-json) o si falla la bajada, usa esa copia.
- datos/predicciones.json (versionado): {"reales": {"ipc-2026-10": 2.2}}: el primer valor publicado de cada mes. Un dato que el INDEC
  corrija después no cambia las rondas viejas.
- construir_json(datos): arma web/public/datos/predicciones.json (ver docs/specs/predicciones.md, «Datos»).
  Una ronda por mes de referencia: abre cuando entró el dato del mes anterior (datos/novedades.json) y cierra a la hora de publicación
  del IPC en el calendario del INDEC (datos/cache/calendario_indec.json); si el calendario todavía no la trae, cierra = null.

Uso suelto:  python pipeline/predicciones.py --bajar
"""
import io
import json
import re
import sys
import unicodedata
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

import calendario
import novedades
import red

RAIZ = Path(__file__).resolve().parent.parent
REGISTRO = RAIZ / "datos" / "predicciones.json"
CSV_REM = red.CACHE / "rem_ipc_mensual.csv"
URL_REM = "https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/informes/relevamiento-expectativas-mercado-historico.xlsx"
HOJA = "Base de Datos Completa"
SERIE = "ipc_empalme"
AR = timezone(timedelta(hours=-3))
MESES = 24
REM_MIN, REM_MAX = -5, 30


def _norm(t):
    """Minúsculas y solo letras/dígitos ASCII: los acentos mal leídos (�) desaparecen y se compara igual."""
    t = unicodedata.normalize("NFKD", str(t)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9;.()% ]", "", t.lower()).strip()


# ---------- REM ----------
def _extraer_rem(contenido):
    """Excel del REM -> DataFrame (fecha, periodo 'AAAA-MM', mediana, n) solo del IPC nivel general, var. % mensual."""
    df = pd.read_excel(io.BytesIO(contenido), sheet_name=HOJA, header=1)
    cols = {}
    for c in df.columns:
        n = _norm(c)
        if n.startswith("fecha de pron"):
            cols["fecha"] = c
        elif n == "variable":
            cols["variable"] = c
        elif n == "referencia":
            cols["ref"] = c
        elif n.startswith("per") and "periodo" not in cols and len(n) <= 8:
            cols["periodo"] = c
        elif n == "mediana":
            cols["mediana"] = c
        elif n.startswith("cantidad de participantes"):
            cols["n"] = c
    faltan = {"fecha", "variable", "ref", "periodo", "mediana", "n"} - set(cols)
    if faltan:
        raise RuntimeError(f"REM: no están las columnas {sorted(faltan)} en la hoja {HOJA}; encabezados: {list(df.columns)}")
    var = df[cols["variable"]].map(_norm)
    ref = df[cols["ref"]].map(_norm)
    f = df[var.str.startswith("precios minoristas (ipc nivel general;") & (ref == "var. % mensual")]
    out = pd.DataFrame({
        "fecha": pd.to_datetime(f[cols["fecha"]]).dt.strftime("%Y-%m-%d"),
        "periodo": pd.to_datetime(f[cols["periodo"]]).dt.strftime("%Y-%m"),
        "mediana": pd.to_numeric(f[cols["mediana"]]),
        "n": pd.to_numeric(f[cols["n"]]).astype(int),
    }).dropna().sort_values(["fecha", "periodo"]).reset_index(drop=True)
    if len(out) < 50:
        raise RuntimeError(f"REM: solo {len(out)} filas del IPC mensual; el formato del Excel cambió")
    return out


def cargar_rem(con_red=True):
    """DataFrame del REM del IPC mensual. Con red baja y reescribe el CSV; si falla, usa la copia. Sin red, solo la copia."""
    if con_red:
        try:
            df = _extraer_rem(red.bajar(URL_REM, timeout=180))
            df.to_csv(CSV_REM, index=False)
            return df
        except Exception as e:  # noqa: BLE001
            print(f"  rem_ipc_mensual: error al bajar ({e}); uso cache {CSV_REM.name}")
    if not CSV_REM.exists():
        return None
    return pd.read_csv(CSV_REM, dtype={"fecha": str, "periodo": str})


def _rem_de(df, periodo, cierra):
    """Mediana del último relevamiento (fecha + 7 días anterior a `cierra`) para ese período, o None."""
    if df is None:
        return None
    limite = (cierra.date() if cierra else datetime.now(AR).date())
    f = df[df["periodo"] == periodo]
    f = f[pd.to_datetime(f["fecha"]).dt.date + timedelta(days=7) < limite]
    if f.empty:
        return None
    r = f.iloc[-1]
    m = float(r["mediana"])
    if not (REM_MIN <= m <= REM_MAX):
        print(f"  Predicciones: REM de {periodo} fuera de rango ({m}); se descarta")
        return None
    return {"mediana": round(m, 1), "n": int(r["n"]), "relevamiento": r["fecha"]}


# ---------- registro de reales ----------
def _cargar_reales():
    if REGISTRO.exists():
        return json.loads(REGISTRO.read_text(encoding="utf-8")).get("reales", {})
    return {}


def _guardar_reales(reales):
    txt = json.dumps({"reales": dict(sorted(reales.items()))}, ensure_ascii=False, indent=1)
    REGISTRO.write_text(txt, encoding="utf-8")


def _mensual(datos):
    """{'AAAA-MM': variación mensual del IPC con un decimal} de ipc_empalme (misma cuenta que variacion() de web/lib/motor.ts)."""
    s = next((x for x in datos["series"] if x["id"] == SERIE), None)
    if s is None:
        raise RuntimeError(f"Predicciones: no está la serie {SERIE}")
    fechas, v, i0 = datos["fechas"], s["v"], s["i0"]
    r = {}
    for i in range(1, len(v)):
        a, b = v[i - 1], v[i]
        k = i0 + i
        if a is None or b is None or a <= 0 or not (0 <= k < len(fechas)):
            continue
        r[fechas[k]] = round((b / a - 1) * 100, 1)
    return r


# ---------- calendario y registro de novedades ----------
def _cierres():
    """{período: datetime} de la publicación del IPC en el calendario (si se reprogramó, manda la última bajada)."""
    r = {}
    for x in calendario.cargar(False):
        if SERIE in calendario.series_de(x["informe"]) and calendario.series_de(x["informe"])[0] == SERIE:
            per = calendario.periodo_de(x["informe"])
            if per:
                r[per] = datetime.fromisoformat(f"{x['fecha']}T{x.get('hora') or '00:00'}").replace(tzinfo=AR)
    return r


def _entradas():
    """{período: fecha de entrada (date)} del registro de novedades; las iniciales no tienen fecha real."""
    reg = novedades.cargar_registro() or {"entradas": []}
    return {e["periodo"]: date.fromisoformat(e["fecha"]) for e in reg["entradas"] if e["id"] == SERIE and not e.get("inicial")}


def _iso(d):
    return d.isoformat(timespec="minutes") if d else None


def construir_json(datos, con_red=True):
    ahora = datetime.now(AR)
    mensual = _mensual(datos)
    if not mensual:
        raise RuntimeError("Predicciones: sin variaciones mensuales del IPC")
    ultimo = max(mensual)
    reales = _cargar_reales()
    nuevos = 0
    for per in sorted(mensual)[-MESES:]:
        k = f"ipc-{per}"
        if k not in reales:  # primer valor publicado que vemos de ese mes; no se pisa después
            reales[k] = mensual[per]
            nuevos += 1
    if nuevos and (con_red or not REGISTRO.exists()):
        _guardar_reales(reales)
    cierres = _cierres()
    entradas = _entradas()
    rem = cargar_rem(con_red)
    hoy_n = novedades._mes_a_n(ultimo)
    rondas = []
    for d in range(1, -MESES, -1):  # d=1: la abierta; después los últimos 24 meses
        per = novedades._n_a_mes(hoy_n + d)
        ant = novedades._n_a_mes(hoy_n + d - 1)
        cierra = cierres.get(per)
        if cierra is None and per in entradas:  # cerrada fuera de la ventana del calendario: la fecha en que el pipeline la registró
            cierra = datetime.combine(entradas[per], datetime.min.time()).replace(tzinfo=AR)
        if cierra is None and d <= 0:  # ronda vieja sin fecha conocida (el registro la tiene como punto de partida): aproximada, día 15 del mes siguiente
            y, m = divmod(novedades._mes_a_n(per) + 1, 12)
            cierra = datetime(y, m + 1, 15, 16, 0, tzinfo=AR)
        abre = None
        if ant in entradas:
            hora = cierres[ant].time() if ant in cierres else datetime.min.time()
            abre = datetime.combine(entradas[ant], hora).replace(tzinfo=AR)
        r = {"id": f"ipc-{per}", "serie": SERIE, "periodo": per, "abre": _iso(abre), "cierra": _iso(cierra),
             "rem": _rem_de(rem, per, cierra), "real": reales.get(f"ipc-{per}") if d <= 0 else None}
        rondas.append(r)
    abierta = rondas[0]
    if abierta["rem"] is None:
        print(f"  Predicciones: la ronda abierta {abierta['id']} no tiene REM")
    return {"generado": ahora.strftime("%Y-%m-%dT%H:%M"), "rondas": rondas}


if __name__ == "__main__":
    if "--bajar" in sys.argv:
        df = cargar_rem(True)
        print(f"{0 if df is None else len(df)} filas del REM del IPC mensual en {CSV_REM}")
        if df is not None:
            print(df.tail(6).to_string())
    else:
        print(__doc__)
