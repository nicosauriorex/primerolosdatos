"""
Cuánto transfiere el Tesoro a las empresas públicas y cuánta gente trabaja en ellas (fase 4 de docs/specs/gasto-nacion.md;
spec docs/specs/empresas-publicas.md).

Fuente: Monitor de transferencias a empresas públicas de la Oficina de Presupuesto del Congreso (OPC),
https://opc.gob.ar/Archivos/monitores/monitor_empresas_publicas.html. El HTML trae el xlsx en base64 dentro de `const b64 = '...'`:
hoja «Transferencias» (empresa, mes, gasto corriente o de capital, crédito vigente y devengado, millones de pesos corrientes del e-SIDIF)
y hoja «Ocupación» (agentes por empresa y mes, de SIRHU o del Presupuesto). Las hojas se leen por posición.

Aportes de capital (inciso 6, partida «Aportes de capital y compra de acciones»; la OPC solo cuenta transferencias): salen de
credito-mensual-<AÑO>.zip de Presupuesto Abierto (mismo archivo que usa gasto_mensual.py), devengado por destinatario (`subparcial_desc`)
y mes, solo de las empresas del diccionario APORTES_A_EMPRESA. Años cerrados, una sola vez; el año en curso, a lo sumo una vez por día.

Respaldos versionados en datos/cache/ (una bajada por día como mucho; sin red o si la página cambió se usan):
- empresas_publicas_transferencias.csv y empresas_publicas_ocupacion.csv: las dos hojas, con los nombres de empresa limpios;
- empresas_publicas_aportes.csv: anio, mes, empresa (nombre de la OPC), devengado de los aportes de capital;
- empresas_publicas_meta.json: el día de la última bajada y, en "aportes", de cada año cuándo se bajó/intentó y qué fecha declara el archivo.

Salidas:
- series(idx): las 13 series emp_pub_* del catálogo (transferencias más aportes de capital, devengado mensual en millones de pesos corrientes, y empleados).
- construir_json(con_red): {"empresas_publicas.json": objeto} para la vista de /gasto/ (contrato en el requisito 4 de la spec).

Controles duros (si uno no pasa, este módulo levanta RuntimeError y la corrida sigue sin series ni archivo): devengado 2024 y 2025
contra las cifras comprobadas; corrientes + capital = total cada mes; la suma de las empresas = total cada mes; Trenes = suma de sus cuatro;
aportes a Aerolíneas 2021 y 2022 contra las cifras comprobadas; corrientes + capital + aportes = total más aportes de cada mes.
Controles blandos (solo se imprimen): contra Presupuesto Abierto y contra el SSPM (dataset 378 de datos.gob.ar).

Uso suelto:  python pipeline/empresas_publicas.py            (con red, arma en memoria y muestra tamaños; no escribe en web/)
             python pipeline/empresas_publicas.py --sin-red  (igual, solo con los respaldos)
"""
import base64
import io
import json
import re
import sys
import unicodedata
import zipfile
from datetime import date

import pandas as pd

from gasto_mensual import URL_MENSUAL
from gasto_nacion import _fecha_actualizacion, anio_cerrado
import red

CACHE = red.CACHE
URL = "https://opc.gob.ar/Archivos/monitores/monitor_empresas_publicas.html"
FUENTE_SERIE = "OPC, Monitor de transferencias a empresas públicas (e-SIDIF)"
FUENTE_TOTAL = FUENTE_SERIE + "; aportes de capital: Presupuesto Abierto (DGSIAF, Ministerio de Economía)"
FUENTE_APORTES = "Presupuesto Abierto (DGSIAF, Ministerio de Economía): aportes de capital y compra de acciones, devengado"
FUENTE_TXT = ("Oficina de Presupuesto del Congreso (OPC), Monitor de transferencias a empresas públicas: devengado del e-SIDIF, "
              "en millones de pesos corrientes. Aportes de capital: Presupuesto Abierto (DGSIAF, Ministerio de Economía). "
              "Empleados: SIRHU o Presupuesto, según la empresa.")
CAT = ["Fiscal", "Empresas públicas"]
F_TRANSF = CACHE / "empresas_publicas_transferencias.csv"
F_OCUP = CACHE / "empresas_publicas_ocupacion.csv"
F_META = CACHE / "empresas_publicas_meta.json"
F_APORTES = CACHE / "empresas_publicas_aportes.csv"
COLS_AP = ["anio", "mes", "empresa", "devengado"]
COLS_XLSX_AP = ["impacto_presupuestario_anio", "impacto_presupuestario_mes", "principal_desc", "subparcial_desc", "credito_devengado",
                "ultima_actualizacion_fecha"]
COLS_T = ["anio", "mes", "empresa", "clasificacion", "vigente", "devengado"]
COLS_O = ["anio", "mes", "empresa", "ocupacion", "fuente"]
COLS_XLSX_T = ["Ejercicio_Presupuestario", "Mes", "Mes_Nombre", "Empresa", "Clasificacion_Economica", "Credito_Vigente_mill", "Devengado_mill"]
COLS_XLSX_O = ["Ejercicio_Presupuestario", "Mes", "Mes_Nombre", "Empresa", "Ocupacion_agentes", "Fuente"]
CORRIENTES, CAPITAL = "Gastos Corrientes", "Gastos de Capital"
SIN_DISCRIMINAR = "Sin discriminar"
PRIMER_ANIO = 2019
TOL = 1.0                     # millones de pesos
CONTROL_ANUAL = {2024: 4217849.0, 2025: 3382033.0}   # devengado total comprobado contra el monitor (millones)
CONTROL_APORTES = {2021: 63551.0, 2022: 72908.0}     # aportes de capital a Aerolíneas comprobados contra Presupuesto Abierto (millones)
GRUPO_TRENES = "Trenes Argentinos"

# Nombre técnico de la fuente (ya limpio) -> nombre corto para el público. Lo que no figura se muestra tal cual.
CORTO = {
    "Administración General de Puertos S.E.": "Puertos (AGP)",
    "Administración de Infraestructuras Ferroviarias S.A (ADIF)": "ADIF",
    "Aerolíneas Argentinas S.A.": "Aerolíneas Argentinas",
    "Agencia de Publicidad del Estado Sociedad Anónima (APE S.A)": "Agencia de Publicidad del Estado",
    "Agua y Saneamientos Argentinos S.A. (AYSA S.A.)": "AySA",
    "Argentina Televisora Color (ATC S.A.)": "ATC (ex TV Pública)",
    "Belgrano Cargas y Logística": "Belgrano Cargas",
    "Casa de Moneda": "Casa de Moneda",
    "Construcción de Viviendas para Armada Argentina-Coviara": "Coviara",
    "Contenidos Artísticos e Informativos S.A.": "Contenidos Artísticos e Informativos",
    "Corredores Viales S.A.": "Corredores Viales",
    "Correo Argentino": "Correo Argentino",
    "DIOXITEK S.A.": "Dioxitek",
    "Desarrollo del Capital Humano Ferroviario S.A": "Capital Humano Ferroviario",
    "EDUC.AR S.A.": "Educ.ar",
    "Emprendimientos Energéticos Binacionales S.A. - (EBISA)": "EBISA",
    "Empresa Argentina de Navegación Aérea S.A.": "EANA (navegación aérea)",
    "Empresa Argentina de Soluciones Satelitales S.A. (AR-SAT)": "ARSAT",
    "Energía Argentina S.A.": "Energía Argentina (ex ENARSA)",
    "Fabricaciones Militares S.A.": "Fabricaciones Militares",
    "Ferrocarriles Argentinos": "Ferrocarriles Argentinos",
    "Fábrica Argentina de Aviones General San Martín": "FAdeA (aviones)",
    "Innovaciones Tecnológicas Agropecuarias S.A.": "INTEA",
    "Intercargo S.A.": "Intercargo",
    "Lotería Nacional S.E.": "Lotería Nacional",
    "Nucleoeléctrica Argentina S.A.": "Nucleoeléctrica",
    "PLAYAS FERROVIARIAS DE BUENOS AIRES S.A.": "Playas Ferroviarias de Buenos Aires",
    "Polo Tecnologico Constituyentes S.A.": "Polo Tecnológico Constituyentes",
    "Radio Universidad Nacional del Litoral": "Radio Universidad del Litoral",
    "Radio y Televisión Argentina S.A.": "Radio y Televisión Argentina",
    "Servicio de Radio y Televisión de la Universidad de Córdoba S.A. (SRT-UNC)": "Radio y TV de la UNC",
    "Sin discriminar": "Sin discriminar",
    "Sociedad Operadora Ferroviaria S.A (SOF)": "Operadora Ferroviaria (SOF)",
    "TANDANOR S.A.": "Tandanor",
    "VENG S.A.": "VENG",
    "Yacimiento Carbonífero Río Turbio": "Río Turbio (YCRT)",
    "Yacimientos Mineros Agua de Dionisio YMAD": "YMAD",
}
TRENES = ["Sociedad Operadora Ferroviaria S.A (SOF)", "Administración de Infraestructuras Ferroviarias S.A (ADIF)",
          "Ferrocarriles Argentinos", "Desarrollo del Capital Humano Ferroviario S.A"]
E_ENERGIA, E_AYSA, E_RIO_TURBIO = "Energía Argentina S.A.", "Agua y Saneamientos Argentinos S.A. (AYSA S.A.)", "Yacimiento Carbonífero Río Turbio"
E_CORREO, E_BELGRANO, E_RTA, E_AEROLINEAS = "Correo Argentino", "Belgrano Cargas y Logística", "Radio y Televisión Argentina S.A.", "Aerolíneas Argentinas S.A."
E_FABMIL, E_INTEA = "Fabricaciones Militares S.A.", "Innovaciones Tecnológicas Agropecuarias S.A."

# Destinatario de un aporte de capital en Presupuesto Abierto (`subparcial_desc`, normalizado: sin tildes ni mayúsculas) -> empresa de la OPC.
# Se busca el fragmento dentro del nombre normalizado, porque el nombre cambia según el año. Austral se fusionó con Aerolíneas en 2020.
APORTES_A_EMPRESA = {
    "aerolineas argentinas": E_AEROLINEAS,
    "austral lineas aereas": E_AEROLINEAS,
    "fabricaciones militares": E_FABMIL,
    "innovaciones tecnologicas agropecuarias": E_INTEA,
    "polo tecnologico constituyentes": "Polo Tecnologico Constituyentes S.A.",
}
# Un destinatario sin mapear que parece una empresa (S.A., S.E., S.A.U., Sociedad del Estado) se avisa para sumarlo a mano.
PARECE_EMPRESA = re.compile(r"(?<![a-z])s\.? ?[ae]\.?(?: ?u\.?)?(?![a-z])|sociedad del estado|sociedad anonima")

# id, nombre, empresas, qué es (para la desc)
SERIES_EMPRESA = [
    ("emp_pub_energia_argentina", "Fondos del Tesoro a Energía Argentina (ex ENARSA)", [E_ENERGIA], "a Energía Argentina S.A. (la ex ENARSA)"),
    ("emp_pub_trenes", "Fondos del Tesoro a Trenes Argentinos", TRENES,
     "a Trenes Argentinos: la Sociedad Operadora Ferroviaria (SOF), ADIF, Ferrocarriles Argentinos y Desarrollo del Capital Humano Ferroviario"),
    ("emp_pub_aysa", "Fondos del Tesoro a AySA", [E_AYSA], "a Agua y Saneamientos Argentinos (AySA)"),
    ("emp_pub_rio_turbio", "Fondos del Tesoro a Río Turbio (YCRT)", [E_RIO_TURBIO], "a Yacimiento Carbonífero Río Turbio"),
    ("emp_pub_correo", "Fondos del Tesoro al Correo Argentino", [E_CORREO], "al Correo Argentino"),
    ("emp_pub_belgrano_cargas", "Fondos del Tesoro a Belgrano Cargas", [E_BELGRANO], "a Belgrano Cargas y Logística"),
    ("emp_pub_rta", "Fondos del Tesoro a Radio y Televisión Argentina", [E_RTA], "a Radio y Televisión Argentina (RTA)"),
    ("emp_pub_aerolineas", "Fondos del Tesoro a Aerolíneas Argentinas", [E_AEROLINEAS], "a Aerolíneas Argentinas"),
]


def _fallo(msg):
    raise RuntimeError(f"empresas públicas: {msg}")


# ---------- bajada ----------

def _meta():
    return json.loads(F_META.read_text(encoding="utf-8")) if F_META.exists() else {}


def _limpiar(nombre):
    return re.sub(r"\s+", " ", str(nombre)).strip()


def _leer_xlsx(html):
    """HTML del monitor (texto) -> (DataFrame de transferencias, DataFrame de ocupación) con columnas COLS_T y COLS_O."""
    m = re.search(r"const\s+b64\s*=\s*'([^']+)'", html)
    if not m:
        _fallo("el HTML del monitor no tiene `const b64`")
    xl = pd.ExcelFile(io.BytesIO(base64.b64decode(m.group(1))))
    if len(xl.sheet_names) < 2:
        _fallo(f"el xlsx tiene {len(xl.sheet_names)} hoja(s), se esperaban 2")
    t, o = xl.parse(0), xl.parse(1)
    if list(t.columns) != COLS_XLSX_T:
        _fallo(f"la hoja de transferencias cambió de columnas: {list(t.columns)}")
    if list(o.columns) != COLS_XLSX_O:
        _fallo(f"la hoja de ocupación cambió de columnas: {list(o.columns)}")
    t = t.drop(columns="Mes_Nombre")
    t.columns = COLS_T
    o = o.drop(columns="Mes_Nombre")
    o.columns = COLS_O
    for d in (t, o):
        d["empresa"] = d["empresa"].map(_limpiar)
    t["clasificacion"] = t["clasificacion"].map(_limpiar)
    o["fuente"] = o["fuente"].map(_limpiar)
    if len(t) < 1000 or len(o) < 1000:
        _fallo(f"el xlsx trae muy pocas filas ({len(t)} y {len(o)})")
    return t, o


def bajar():
    """Baja el monitor y deja los respaldos. Si algo falla levanta (el que llama usa los respaldos)."""
    CACHE.mkdir(parents=True, exist_ok=True)
    html = red.bajar(URL, timeout=120).decode("utf-8", errors="replace")
    t, o = _leer_xlsx(html)
    ap, anios_ap = _cargar_aportes()
    _armar(t.copy(), o.copy(), ap, anios_ap)   # los controles corren antes de pisar los respaldos: un dato malo no reemplaza al último bueno
    t.to_csv(F_TRANSF, index=False, encoding="utf-8")
    o.to_csv(F_OCUP, index=False, encoding="utf-8")
    print(f"  empresas públicas: monitor de la OPC bajado ({len(t)} filas de transferencias, {len(o)} de ocupación)")


def _actualizar_respaldos(con_red):
    meta = _meta()
    hoy = date.today().isoformat()
    hay = F_TRANSF.exists() and F_OCUP.exists()
    if con_red and (not hay or meta.get("intentado", meta.get("bajado")) != hoy):
        meta["intentado"] = hoy   # una bajada (o un intento fallido) por día como mucho
        red.guardar_meta("empresas_publicas", meta)
        try:
            bajar()
            meta["bajado"] = hoy
            red.guardar_meta("empresas_publicas", meta)
        except Exception as e:  # noqa: BLE001
            if not hay:
                raise RuntimeError(f"empresas públicas: no se pudo bajar el monitor y no hay respaldo ({e})") from e
            print(f"  AVISO empresas públicas: no se pudo bajar el monitor ({e}); uso el respaldo")
    elif not hay:
        raise RuntimeError("empresas públicas: no hay respaldo (datos/cache/empresas_publicas_*)")


def _cargar():
    t = pd.read_csv(F_TRANSF, keep_default_na=False, encoding="utf-8")
    o = pd.read_csv(F_OCUP, keep_default_na=False, encoding="utf-8")
    return t, o


# ---------- aportes de capital (Presupuesto Abierto) ----------

def _normalizar(nombre):
    """Sin tildes, en minúsculas y con espacios simples: 'Aerolíneas  Argentinas S.A.' -> 'aerolineas argentinas s.a.'."""
    sin = "".join(c for c in unicodedata.normalize("NFKD", str(nombre)) if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", sin).strip().lower()


def _empresa_del_aporte(subparcial):
    n = _normalizar(subparcial)
    for fragmento, empresa in APORTES_A_EMPRESA.items():
        if fragmento in n:
            return empresa
    return None


def _cargar_aportes():
    """-> (DataFrame anio, mes, empresa, devengado del respaldo, o vacío si no hay; años cuyo respaldo se bajó)."""
    if not F_APORTES.exists():
        return pd.DataFrame(columns=COLS_AP), set()
    ap = pd.read_csv(F_APORTES, keep_default_na=False, encoding="utf-8")
    anios = {int(a) for a, m in _meta().get("aportes", {}).items() if m.get("bajado")}
    return ap, anios


def _bajar_aportes_anio(anio):
    """Baja credito-mensual-<anio>.zip y devuelve (DataFrame COLS_AP de las empresas del diccionario, fecha que declara el archivo).
    Se lee por partes y solo lo necesario; el ZIP y el CSV crudo no se guardan."""
    raw = red.bajar(URL_MENSUAL.format(a=anio), timeout=600)
    z = zipfile.ZipFile(io.BytesIO(raw))
    nombre = next(n for n in z.namelist() if n.lower().endswith(".csv"))
    partes, fechas = [], set()
    with z.open(nombre) as fh:
        for chunk in pd.read_csv(fh, encoding="utf-8-sig", dtype=str, usecols=lambda c: c in COLS_XLSX_AP, chunksize=200_000):
            falta = set(COLS_XLSX_AP) - set(chunk.columns)
            if falta:
                _fallo(f"el archivo mensual {anio} no trae las columnas {sorted(falta)}")
            fechas.update(chunk["ultima_actualizacion_fecha"].dropna().unique())
            chunk = chunk[(pd.to_numeric(chunk["impacto_presupuestario_anio"], errors="coerce") == anio)
                          & chunk["principal_desc"].fillna("").str.contains("aportes de capital", case=False, regex=False)].copy()
            if chunk.empty:
                continue
            chunk["mes"] = pd.to_numeric(chunk["impacto_presupuestario_mes"], errors="coerce").fillna(0).astype(int)
            chunk["devengado"] = pd.to_numeric(chunk["credito_devengado"].astype(str).str.replace(",", ".", regex=False), errors="coerce").fillna(0.0)
            chunk["sub"] = chunk["subparcial_desc"].fillna("")
            partes.append(chunk.groupby(["sub", "mes"])["devengado"].sum().reset_index())
    if not partes:
        _fallo(f"el archivo mensual {anio} no trae filas de aportes de capital")
    g = pd.concat(partes).groupby(["sub", "mes"])["devengado"].sum().reset_index()
    g = g[(g["mes"] >= 1) & (g["mes"] <= 12)]
    g["empresa"] = g["sub"].map(_empresa_del_aporte)
    sin = g[g["empresa"].isna() & (g["devengado"] != 0)].groupby("sub")["devengado"].sum()
    for sub, v in sin.items():
        if PARECE_EMPRESA.search(_normalizar(sub)):
            print(f"  AVISO empresas públicas: aporte de capital {anio} a «{sub}» ({v:,.0f} millones) parece una empresa y no está en APORTES_A_EMPRESA")
    g = g[g["empresa"].notna()]
    out = g.groupby(["empresa", "mes"])["devengado"].sum().reset_index()
    out["anio"] = anio
    out["devengado"] = out["devengado"].round(4)
    out = out[out["devengado"] != 0][COLS_AP].sort_values(["mes", "empresa"]).reset_index(drop=True)
    return out, _fecha_actualizacion(pd.Series(list(fechas)))


def _actualizar_aportes(con_red):
    """Baja los años que faltan (los cerrados una sola vez, el año en curso a lo sumo una vez por día) y deja el respaldo.
    Nunca levanta: si un año falla o no pasa los controles se usa el respaldo (los aportes son opcionales)."""
    if not con_red or not (F_TRANSF.exists() and F_OCUP.exists()):
        return
    hoy = date.today().isoformat()
    meta = _meta()
    apm = meta.setdefault("aportes", {})
    actual, _ = _cargar_aportes()
    for anio in range(PRIMER_ANIO, date.today().year + 1):
        m = apm.setdefault(str(anio), {})
        if (m.get("bajado") and anio_cerrado(anio, m.get("actualizado"))) or m.get("intentado") == hoy:
            continue
        m["intentado"] = hoy   # una bajada (o un intento fallido) por día como mucho
        red.guardar_meta("empresas_publicas", meta)
        try:
            nuevo, declarada = _bajar_aportes_anio(anio)
            comb = pd.concat([actual[actual["anio"] != anio], nuevo], ignore_index=True)
            anios = {int(a) for a, x in apm.items() if x.get("bajado")} | {anio}
            t, o = _cargar()
            _armar(t, o, comb, anios)   # los controles corren antes de pisar el respaldo
            comb.sort_values(["anio", "mes", "empresa"]).to_csv(F_APORTES, index=False, encoding="utf-8")
            actual = comb
            m["bajado"], m["actualizado"] = hoy, declarada
            print(f"  empresas públicas: aportes de capital {anio} bajados ({len(nuevo)} filas, archivo del {declarada})")
        except Exception as e:  # noqa: BLE001
            print(f"  AVISO empresas públicas: no se pudieron bajar los aportes de capital {anio} ({e}); uso el respaldo")
        red.guardar_meta("empresas_publicas", meta)


# ---------- armado ----------

def _mes(a, m):
    return f"{int(a):04d}-{int(m):02d}"


def _lista_meses(primero, ultimo):
    return [d.strftime("%Y-%m") for d in pd.date_range(primero + "-01", ultimo + "-01", freq="MS")]


def _armar(t, o, ap=None, anios_ap=()):
    """Arma las estructuras mensuales y corre los controles duros. Devuelve un dict con todo lo que usan series() y el JSON.
    `ap`: aportes de capital (COLS_AP; None o vacío = sin aportes); `anios_ap`: años cuyo respaldo de aportes se bajó."""
    ap = pd.DataFrame(columns=COLS_AP) if ap is None else ap[ap["anio"] >= PRIMER_ANIO].copy()
    t = t[t["anio"] >= PRIMER_ANIO].copy()
    o = o[o["anio"] >= PRIMER_ANIO].copy()
    t["ym"] = [_mes(a, m) for a, m in zip(t["anio"], t["mes"])]
    o["ym"] = [_mes(a, m) for a, m in zip(o["anio"], o["mes"])]
    meses = _lista_meses(t["ym"].min(), t["ym"].max())
    meses_ocup = _lista_meses(o["ym"].min(), o["ym"].max())
    if t["ym"].nunique() != len(meses):
        _fallo("faltan meses en la hoja de transferencias")
    if o["ym"].nunique() != len(meses_ocup):
        _fallo("faltan meses en la hoja de ocupación")
    mal = set(t["clasificacion"]) - {CORRIENTES, CAPITAL}
    if mal:
        _fallo(f"clasificación económica desconocida: {sorted(mal)}")

    def pivot(clasif, col):
        d = t[t["clasificacion"] == clasif].pivot_table(index="empresa", columns="ym", values=col, aggfunc="sum")
        return d.reindex(columns=meses).fillna(0.0)

    corr, cap, vig = pivot(CORRIENTES, "devengado"), pivot(CAPITAL, "devengado"), t.pivot_table(index="empresa", columns="ym", values="vigente", aggfunc="sum").reindex(columns=meses).fillna(0.0)
    ocup = o.pivot_table(index="empresa", columns="ym", values="ocupacion", aggfunc="sum").reindex(columns=meses_ocup)
    ap["ym"] = [_mes(a, m) for a, m in zip(ap["anio"], ap["mes"])]
    fuera = ap[~ap["ym"].isin(meses)]
    if float(fuera["devengado"].abs().sum()) > 0:
        print(f"  AVISO empresas públicas: aportes de capital en meses sin datos de la OPC ({', '.join(sorted(fuera['ym'].unique()))}); no se suman")
    apo = ap[ap["ym"].isin(meses)].pivot_table(index="empresa", columns="ym", values="devengado", aggfunc="sum").reindex(columns=meses).fillna(0.0)
    nombres = sorted(set(t["empresa"]) | set(o["empresa"]) | set(apo.index))
    corr, cap, vig, apo = (d.reindex(nombres).fillna(0.0) for d in (corr, cap, vig, apo))
    ocup = ocup.reindex(nombres)

    # total independiente (sobre la hoja) para controlar contra la suma de partes
    total_hoja = t.groupby("ym")["devengado"].sum().reindex(meses)
    total_c = corr.sum()
    total_k = cap.sum()
    # controles duros
    dif = (total_c + total_k - total_hoja).abs().max()
    if dif > 1e-6:
        _fallo(f"corrientes + capital no da el total del mes (diferencia máxima {dif:,.3f})")
    suma_emp = (corr + cap).sum()
    dif = (suma_emp - total_hoja).abs().max()
    if dif > 1e-6:
        _fallo(f"la suma de las empresas no da el total del mes (diferencia máxima {dif:,.3f})")
    trenes_hoja = t[t["empresa"].isin(TRENES)].groupby("ym")["devengado"].sum().reindex(meses).fillna(0.0)
    trenes_sum = sum((corr.loc[e] + cap.loc[e]) for e in TRENES)
    if (trenes_hoja - trenes_sum).abs().max() > 1e-6:
        _fallo("Trenes Argentinos no da la suma de sus cuatro empresas")
    print(f"  control corrientes + capital = total, suma de empresas = total y Trenes = sus cuatro: pasan en {len(meses)} meses")
    total_ap_hoja = ap[ap["ym"].isin(meses)].groupby("ym")["devengado"].sum().reindex(meses).fillna(0.0)
    dif = (total_c + total_k + apo.sum() - (total_hoja + total_ap_hoja)).abs().max()
    if dif > 1e-6:
        _fallo(f"corrientes + capital + aportes no da el total del mes (diferencia máxima {dif:,.3f})")
    for a, esperado in CONTROL_APORTES.items():
        if a not in anios_ap:
            continue
        v = float(apo.loc[E_AEROLINEAS, [m for m in meses if m.startswith(str(a))]].sum()) if E_AEROLINEAS in apo.index else 0.0
        print(f"  control aportes a Aerolíneas {a}: {v:,.1f} (esperado {esperado:,.0f}; tolerancia {TOL:.0f})")
        if abs(v - esperado) > TOL:
            _fallo(f"aportes a Aerolíneas {a}: {v:,.1f}, se esperaba {esperado:,.0f}")
    for a, esperado in CONTROL_ANUAL.items():
        v = float(total_hoja[[m for m in meses if m.startswith(str(a))]].sum())
        print(f"  control devengado {a}: {v:,.1f} (esperado {esperado:,.0f}; tolerancia {TOL:.0f})")
        if abs(v - esperado) > TOL:
            _fallo(f"devengado {a}: {v:,.1f}, se esperaba {esperado:,.0f}")

    # empleados: el total del mes solo si están todas las empresas que reportan antes y después de ese mes
    # (una empresa que empieza o deja de figurar no vacía el total; un hueco en medio de sus meses, sí)
    total_ocup, vacios = {}, []
    con_dato = ocup.notna()
    con_dato = con_dato[con_dato.any(axis=1)]   # las que no tienen ningún mes de empleados no cuentan
    primero = con_dato.idxmax(axis=1)
    ultimo = con_dato.iloc[:, ::-1].idxmax(axis=1)
    for m in meses_ocup:
        vigentes = con_dato.index[(primero <= m) & (ultimo >= m)]
        col = ocup.loc[vigentes, m]
        if col.isna().any():
            total_ocup[m] = None
            vacios.append(m)
        else:
            total_ocup[m] = float(col.sum())
    print(f"  empleados: {len(meses_ocup)} meses ({meses_ocup[0]} a {meses_ocup[-1]}); {len(vacios)} meses con total vacío"
          + (f" ({', '.join(vacios)})" if vacios else ""))
    fuente_ocup = o.sort_values("ym").groupby("empresa")["fuente"].last().to_dict()
    return {"meses": meses, "meses_ocup": meses_ocup, "corr": corr, "cap": cap, "apo": apo, "vig": vig, "ocup": ocup, "total_ocup": total_ocup,
            "fuente_ocup": fuente_ocup, "vacios": vacios, "nombres": nombres}


def _blandos(a):
    """Controles blandos: solo se imprimen. Nunca levantan."""
    try:
        meses = a["meses"]
        for anio in (2024, 2025):
            tot = float(sum((a["corr"][m].sum() + a["cap"][m].sum()) for m in meses if m.startswith(str(anio))))
            f = CACHE / f"gasto_nacion_{anio}.csv"
            if not f.exists():
                continue
            d = pd.read_csv(f, keep_default_na=False)
            e = d[d["arbol"] == "en_que"]
            otras = float(e.loc[e["n2"].str.startswith("Transferencias a otras entidades del Sector P"), "credito_devengado"].sum())
            aportes = float(e.loc[e["n2"].str.startswith("Aportes de capital"), "credito_devengado"].sum())
            print(f"  blando Presupuesto Abierto {anio}: empresas {tot:,.0f}; «Transferencias a otras entidades del SPN» {otras:,.0f} "
                  f"+ «Aportes de capital y compra de acciones» {aportes:,.0f} = {otras + aportes:,.0f} (las empresas son una parte; diferencia {otras + aportes - tot:+,.0f})")
    except Exception as e:  # noqa: BLE001
        print(f"  blando Presupuesto Abierto: no se pudo comparar ({e})")


def _cargar_armar(con_red):
    CACHE.mkdir(parents=True, exist_ok=True)
    _actualizar_respaldos(con_red)
    _actualizar_aportes(con_red)
    t, o = _cargar()
    ap, anios_ap = _cargar_aportes()
    if not F_APORTES.exists():
        print("  AVISO empresas públicas: no hay respaldo de aportes de capital (datos/cache/empresas_publicas_aportes.csv); van en cero")
    a = _armar(t, o, ap, anios_ap)
    _blandos(a)
    return a


# ---------- series del catálogo ----------

def _serie_mensual(valores_por_mes, idx):
    return pd.Series({pd.Timestamp(m + "-01"): v for m, v in valores_por_mes.items()}, dtype="float64").reindex(idx)


def series(idx, con_red=False):
    """Las 13 series emp_pub_* del catálogo, sobre el índice mensual `idx`. Con control roto levanta RuntimeError."""
    from catalogo import S
    a = _cargar_armar(con_red)
    total = a["corr"].sum() + a["cap"].sum() + a["apo"].sum()
    desc_base = ("Lo que el Tesoro Nacional destinó %s (devengado), en millones de pesos de cada mes: transferencias (gastos corrientes y de capital, "
                 "monitor de la OPC con datos del e-SIDIF) más aportes de capital (compra de acciones de la empresa, Presupuesto Abierto). "
                 "No es lo que gasta la empresa ni su resultado: es la plata que le puso el Estado. "
                 "Sale a saltos de un mes a otro: conviene mirarla en 12 meses o por año. Solo incluye las empresas que reciben plata del Tesoro. Desde enero de 2019.")
    def mk(id_, n, serie, que):
        return S(id_, n, CAT, "ars", "millones de $", _serie_mensual(serie.to_dict(), idx), 0, FUENTE_TOTAL, desc_base % que, agg=True, flujo=True)
    cola = "Sale a saltos de un mes a otro: conviene mirarla en 12 meses o por año. Desde enero de 2019."
    desc_parte = ("Lo que el Tesoro Nacional transfirió %s (devengado, monitor de la OPC con datos del e-SIDIF), en millones de pesos de cada mes. "
                  "Es una parte del total que destina el Tesoro a las empresas (transferencias más aportes de capital). "
                  "No es lo que gasta la empresa ni su resultado. " + cola)
    desc_aportes = ("Aportes de capital (compra de acciones, inciso 6) que el Tesoro Nacional hizo a las empresas públicas (devengado), en millones de pesos de cada mes. "
                    "Entre 2019 y 2022 fue la forma en que se financió a Aerolíneas Argentinas (incluye Austral, que se fusionó con ella en 2020); también hubo aportes a "
                    "Fabricaciones Militares (2019) e INTeA (2023). Se suma a las transferencias del monitor de la OPC para dar el total que destina el Tesoro. "
                    "No incluye los aportes a organismos internacionales ni a fondos fiduciarios. " + cola)

    def mk_parte(id_, n, serie, desc, fuente):
        return S(id_, n, CAT, "ars", "millones de $", _serie_mensual(serie.to_dict(), idx), 0, fuente, desc, agg=True, flujo=True)
    out = [mk("emp_pub_total", "Fondos del Tesoro a empresas públicas", total, "a todas las empresas públicas"),
           mk_parte("emp_pub_corrientes", "Transferencias corrientes a empresas públicas", a["corr"].sum(),
                    desc_parte % "a las empresas públicas para gastos corrientes (operar, pagar sueldos, cubrir déficit)", FUENTE_SERIE),
           mk_parte("emp_pub_capital", "Transferencias de capital a empresas públicas", a["cap"].sum(),
                    desc_parte % "a las empresas públicas para gastos de capital (inversiones y obras)", FUENTE_SERIE),
           mk_parte("emp_pub_aportes", "Aportes de capital a empresas públicas", a["apo"].sum(), desc_aportes, FUENTE_APORTES)]
    for id_, n, empresas, que in SERIES_EMPRESA:
        out.append(mk(id_, n, sum(a["corr"].loc[e] + a["cap"].loc[e] + a["apo"].loc[e] for e in empresas), que))
    emp = _serie_mensual(a["total_ocup"], idx)
    out.append(S("emp_pub_empleados", "Empleados de las empresas públicas", CAT, "none", "personas", emp, 0, FUENTE_SERIE,
                 "Cantidad de agentes que trabajan en las empresas públicas que reciben fondos del Tesoro (SIRHU o Presupuesto, según la empresa), "
                 "suma de todas las empresas que informan ese año. Si en un mes falta alguna, el mes queda vacío. Desde enero de 2019."))
    return out


# ---------- archivo para /gasto/ ----------

def _r1(x):
    return round(float(x), 1)


def _empresa_json(a, nombre):
    ocup = a["ocup"].loc[nombre]
    return {"n": CORTO.get(nombre, nombre), **({"t": nombre} if CORTO.get(nombre, nombre) != nombre else {}),
            **({"grupo": GRUPO_TRENES} if nombre in TRENES else {}),
            "corr": [_r1(x) for x in a["corr"].loc[nombre]], "cap": [_r1(x) for x in a["cap"].loc[nombre]],
            "apo": [_r1(x) for x in a["apo"].loc[nombre]],
            "vig": [_r1(x) for x in a["vig"].loc[nombre]],
            "ocup": [None if pd.isna(x) else int(x) for x in ocup],
            "fuente_ocup": a["fuente_ocup"].get(nombre)}


def construir_json(con_red=True):
    """{"empresas_publicas.json": objeto}. Si un control duro no pasa, levanta RuntimeError."""
    a = _cargar_armar(con_red)
    meta = _meta()
    empresas = [_empresa_json(a, n) for n in a["nombres"]]
    empresas.sort(key=lambda e: (-sum(e["corr"]) - sum(e["cap"]) - sum(e["apo"]), e["n"]))

    def tot(campo):
        return [_r1(sum(e[campo][i] for e in empresas)) for i in range(len(a["meses"]))]

    obj = {"generado": date.today().isoformat(), "fuente": FUENTE_TXT, "actualizado": meta.get("bajado") or date.today().isoformat(),
           "meses": a["meses"], "meses_ocup": a["meses_ocup"], "empresas": empresas,
           "total": {"corr": tot("corr"), "cap": tot("cap"), "apo": tot("apo"), "vig": tot("vig"),
                     "ocup": [None if a["total_ocup"][m] is None else int(a["total_ocup"][m]) for m in a["meses_ocup"]]}}
    return {"empresas_publicas.json": obj}


def inyectar_series(datos):
    """Para --solo-json: reemplaza en el compilado (dict de catalogo.a_json) las series emp_pub_* por las armadas desde los respaldos,
    así las series nuevas entran sin la corrida completa. Si falla, deja el compilado como estaba."""
    import catalogo
    try:
        idx = pd.DatetimeIndex([pd.Timestamp(f + "-01") for f in datos["fechas"]], freq="MS")
        nuevas = catalogo.a_json(series(idx, con_red=False), idx)["series"]
    except Exception as e:  # noqa: BLE001
        print(f"  Empresas públicas: no se pudieron armar las series ({e}); el catálogo queda como estaba.")
        return datos
    datos["series"] = [s for s in datos["series"] if not s["id"].startswith("emp_pub_")] + nuevas
    return datos


if __name__ == "__main__":
    res = construir_json(con_red="--sin-red" not in sys.argv)
    for nombre, obj in sorted(res.items()):
        txt = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        print(f"{nombre}: {len(txt.encode('utf-8')) / 1024:.0f} KB")
