"""
Arma la tabla mensual (salarios, IPC, dólares) y el catálogo de series, y escribe los JSON de la web.

Fuentes de este módulo:
- Precios promedio GBA: INDEC, https://www.indec.gob.ar/ftp/cuadros/economia/sh_ipc_precios_promedio.xls
- IPC nacional: datos.gob.ar, serie 148.3_INIVELNAL_DICI_M_26 (la baja salarios.py, con respaldo en datos/cache/).
- Opcional: si existe la variable de entorno INDEC_TOKEN (o un archivo .indec_token.txt en la raíz del
  proyecto con el token adentro), precios e IPC se toman de la tabla `ipc_nacional` de
  https://api.indec.gob.ar/v1/ (requiere registro en api.indec.gob.ar), que se baja una sola vez por corrida.
  Los salarios siguen saliendo de datos.gob.ar (la API de INDEC solo tiene el índice de salarios).
Toda descarga pasa por red.py (con respaldo en datos/cache/).
"""
import hashlib
import io
import json
import os
import sys
from pathlib import Path

import pandas as pd

import capacidad
import catalogo
import contexto
import diario
import macro
import precios_mundo
import red
import salarios
import semaforo
import novedades
import universidades
import provincias
import provincias_dnap
import gasto_mensual
import gasto_nacion
import herencia_informes
import reservas_netas

RAIZ = Path(__file__).resolve().parent.parent  # carpeta del proyecto
OUT = RAIZ / "datos"
OUT.mkdir(exist_ok=True)

CORTES = ["Asado", "Cuadril", "Nalga", "Paleta", "Carne picada común"]
XLS = "https://www.indec.gob.ar/ftp/cuadros/economia/sh_ipc_precios_promedio.xls"


def _a_fecha(df):
    return pd.to_datetime(df["periodo"].astype(str).str[:6], format="%Y%m")


def _ipc_nivel_general(tabla):
    """IPC nivel general nacional (índice) de la tabla `ipc_nacional` de INDEC. Serie vacía si no hay."""
    vacia = pd.Series(dtype=float, name="ipc")
    if tabla.empty:
        return vacia
    ng = tabla[tabla["descripcion"].str.contains("nivel general", case=False, na=False)
               & tabla["tipo_de_indicador"].str.contains("ndice", case=False, na=False)
               & tabla["region"].str.contains("nacional", case=False, na=False)].copy()
    if ng.empty:
        return vacia
    ng["fecha"] = _a_fecha(ng)
    return ng.groupby("fecha")["valor"].mean().rename("ipc")


def precios_e_ipc_de_tabla(tabla):
    """Precios promedio de los cortes (región GBA) e IPC nivel general nacional, sacados de la tabla `ipc_nacional` de INDEC
    (catalogo.tabla_ipc_indec). Lanza si la tabla no trae precios o IPC."""
    pp = tabla[tabla["tipo_de_indicador"].str.contains("precio", case=False, na=False)].copy() if not tabla.empty else tabla
    if pp.empty:
        raise RuntimeError("la API no devolvió precios promedio")
    pp["fecha"] = _a_fecha(pp)
    gba = pp[pp["region"].str.contains("GBA|Gran Buenos Aires", case=False, na=False)]
    precios = {}
    for corte in CORTES:
        s = gba[gba["descripcion"].str.strip().str.lower() == corte.lower()]
        if not s.empty:
            precios[corte] = s.groupby("fecha")["valor"].mean()
    faltan = set(CORTES) - set(precios)
    if faltan:
        print("API INDEC: sin precio para", sorted(faltan),
              "| regiones:", sorted(pp["region"].dropna().unique()),
              "| ej. productos:", sorted(gba["descripcion"].dropna().unique())[:40])
    ipc = _ipc_nivel_general(tabla)
    if ipc.empty:
        raise RuntimeError("la API no devolvió el IPC nivel general nacional")
    return pd.DataFrame(precios).sort_index(), ipc


def _leer_precios_xls():
    raw = pd.read_excel(io.BytesIO(red.bajar(XLS, timeout=60)), sheet_name="GBA", header=None)
    # Fila 2: años ("Año 2016"), fila 3: meses. Construir fechas por columna.
    years = raw.iloc[2].ffill()
    months = raw.iloc[3]
    meses = {m: i + 1 for i, m in enumerate(
        ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
         "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"])}
    fechas = {}
    for c in range(2, raw.shape[1]):
        y = "".join(ch for ch in str(years[c]) if ch.isdigit())[:4]  # "Año 2016" o 2023
        m = str(months[c]).strip()
        if len(y) == 4 and m in meses:
            fechas[c] = pd.Timestamp(int(y), meses[m], 1)
    out = {}
    for _, row in raw.iterrows():
        name = str(row[0]).strip()
        if name in CORTES:
            out[name] = pd.Series({f: pd.to_numeric(row[c], errors="coerce") for c, f in fechas.items()})
    if not out:  # vacío: falla (así red.cache_df no pisa el respaldo bueno)
        raise RuntimeError("el Excel de precios promedio no trae los cortes esperados")
    return pd.DataFrame(out).sort_index()


def precios_indec():
    """Precios promedio de los cortes en GBA (Excel de INDEC), con respaldo en datos/cache/."""
    df = red.cache_df("indec_precios_promedio_xls", _leer_precios_xls)
    if df.empty:
        raise RuntimeError("no se pudo bajar el Excel de precios promedio de INDEC y no hay copia guardada")
    return df


def prorratear_sac(s: pd.Series, devolver_base: bool = False):
    """Saca el aguinaldo de junio/diciembre y lo reparte en los 6 meses del semestre.

    base(jun) = media geométrica de may y jul (o may si no hay jul); idem dic con nov/ene.
    SAC del semestre = valor observado - base. Cada mes del semestre recibe
    base_mes * (1 + SAC / suma(bases del semestre)).
    """
    s = s.dropna().copy()
    base = s.copy()
    for f in s.index[s.index.month.isin([6, 12])]:
        prev, nxt = f - pd.DateOffset(months=1), f + pd.DateOffset(months=1)
        if prev in s.index and nxt in s.index:
            base[f] = (s[prev] * s[nxt]) ** 0.5
        elif prev in s.index:
            base[f] = s[prev] * (s[prev] / s.get(prev - pd.DateOffset(months=1), s[prev]))
    prorr = base.copy()
    for f in s.index[s.index.month.isin([6, 12])]:
        sem = pd.date_range(f - pd.DateOffset(months=5), f, freq="MS")
        sem = [m for m in sem if m in base.index]
        sac = s[f] - base[f]
        ratio = sac / base[sem].sum()
        prorr[sem] = base[sem] * (1 + ratio)
    # Semestre en curso sin junio/dic publicado: aguinaldo estimado como 1/12
    ult = s.index.max()
    if ult.month not in (6, 12):
        ini = pd.Timestamp(ult.year, 1 if ult.month < 6 else 7, 1)
        abiertos = base.index[base.index >= ini]
        prorr[abiertos] = base[abiertos] * 13 / 12
    return (prorr, base) if devolver_base else prorr


def main():
    pr = precios_indec()
    fuente = "Excel INDEC + IPC de datos.gob.ar"
    # IPC nacional de datos.gob.ar: la misma bajada (con respaldo) que usa salarios.ipc_empalmado
    ipc = red.cacheado("ipc_nac", lambda: salarios._serie_api(salarios.IDS["ipc_nac"]))
    token = os.environ.get("INDEC_TOKEN", "").strip()
    for nombre in (".indec_token", "indec_token.txt", ".indec_token.txt"):
        archivo_token = RAIZ / nombre
        if not token and archivo_token.exists():
            token = archivo_token.read_text(encoding="utf-8-sig").strip()
    # Tabla ipc_nacional de INDEC: se baja una sola vez por corrida (la usa también catalogo.ipc_indec)
    tabla = catalogo.tabla_ipc_indec(token)
    bajada = bool(token) and not tabla.empty and "ipc_indec_completo" not in red.RESPALDOS  # de la API en esta corrida (no del respaldo)
    if bajada:
        try:
            pr_api, ipc_api = precios_e_ipc_de_tabla(tabla)
            # Control: diferencia entre la API y las fuentes anteriores en los meses comunes
            for c in pr_api:
                comun = pr_api[c].dropna().index.intersection(pr[c].dropna().index)
                if len(comun):
                    dif = (pr_api.loc[comun, c] / pr.loc[comun, c] - 1).abs().max()
                    print(f"API INDEC {c}: {len(pr_api[c].dropna())} meses, dif. máx. vs Excel {dif:.2%}")
            pr = pr_api.combine_first(pr)  # la API manda; el Excel completa meses faltantes
            ipc = ipc_api.combine_first(ipc)
            fuente = "API INDEC (api.indec.gob.ar)"
        except Exception as e:  # noqa: BLE001
            print(f"API INDEC no disponible ({e}); uso las fuentes anteriores.")
    elif token:
        print("API INDEC no disponible (se usa la copia guardada); uso las fuentes anteriores.")
    else:
        print("Sin INDEC_TOKEN: uso Excel de INDEC + IPC de datos.gob.ar.")
    if not fuente.startswith("API INDEC"):
        # La API no respondió (o no hay token): se completa el IPC nacional con la última copia guardada de la API,
        # que suele traer meses que la serie de datos.gob.ar todavía no tiene. Solo agrega o pisa meses si la copia coincide en los comunes.
        try:
            ipc_cache = _ipc_nivel_general(tabla)
            comun = ipc_cache.dropna().index.intersection(ipc.dropna().index)
            dif = (ipc_cache[comun] / ipc[comun] - 1).abs().max() if len(comun) else None
            if len(ipc_cache) and dif is not None and dif < 0.005:
                antes = ipc.dropna().index.max()
                ipc = ipc_cache.combine_first(ipc)
                print(f"IPC nacional: completo con la copia guardada de la API de INDEC (de {antes:%Y-%m} a {ipc.dropna().index.max():%Y-%m}; dif. máx. {dif:.3%})")
                fuente += " + copia guardada de la API de INDEC"
            elif len(ipc_cache):
                print(f"IPC nacional: la copia guardada de la API no coincide con datos.gob.ar (dif. máx. {dif}); no se usa.")
        except Exception as e:  # noqa: BLE001
            print(f"IPC nacional: no se pudo leer la copia guardada de la API ({e}).")
    print("Fuente de precios e IPC:", fuente)
    ipc_nac_override = ipc.dropna()
    sal = salarios.construir(prorratear_sac, ipc_nac_override)
    idx = pd.date_range("1990-01-01", sal.index.max(), freq="MS")
    sal = sal.reindex(idx)
    mer = macro.construir(sal.index)
    for k in mer.columns:  # fx_oficial/fx_blue y el resto de las columnas de mercado (salarios.py ya no arma dólares)
        sal[k] = mer[k]
    sal.to_csv(OUT / "mensual.csv", float_format="%.4f")

    series = catalogo.construir(sal, token)
    series += contexto.series_mensuales(idx)  # categoría "Contexto internacional" (D-008)
    # Sin token (o si la API falla) los precios de carne de GBA salen del Excel de INDEC
    ids = {s["id"] for s in series}
    for c in CORTES:
        sid = f"pp_gba_{catalogo.slug(c)}"
        if sid not in ids:
            series.append(catalogo.S(sid, f"{c} (GBA)", ["Precios", "Precios promedio por producto (INDEC)", "GBA"], "ars", "$ por kg",
                                     pr[c].reindex(idx), -1, "INDEC, sh_ipc_precios_promedio.xls", f"Precio promedio del kg de {c.lower()} en GBA."))
    datos = catalogo.a_json(series, idx)
    print(f"Catálogo: {len(datos['series'])} series en total")
    # Copia compilada: respaldo versionado para regenerar los JSON de la web sin red (--solo-json)
    (OUT / "cache" / "compilado.json").write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    escribir_json_web(datos, contexto.construir_json(), precios_mundo.construir_json(), capacidad.construir_json())
    print(f"Resumen de red: {red.DESCARGAS} descargas; respaldos usados: "
          + (", ".join(sorted(red.RESPALDOS)) if red.RESPALDOS else "ninguno"))


# Series transversales que usan los cálculos de todas las secciones (se cargan siempre).
# Se completa al portar los cálculos de src/app.js (POB, PIB_AN, deflactores).
IDS_BASE = {"ipc_empalme", "cpi_usa", "fx_oficial", "fx_blue", "fx_mep", "fx_ccl", "poblacion", "pib_nom_anual"}


def escribir_json_web(datos, ctx=None, pm=None, cap=None, con_red=True):
    """Escribe web/public/datos/: catalogo.json (metadatos + archivo de cada serie + fechas),
    base.json (series transversales) y un <categoria>.json por cada cat[0]. `ctx` (datos anuales del FMI) va aparte en contexto.json."""
    destino = RAIZ / "web" / "public" / "datos"
    destino.mkdir(parents=True, exist_ok=True)
    for viejo in destino.glob("*.json"):
        viejo.unlink()
    grupos = {}
    meta = []
    for s in datos["series"]:
        archivo = "base" if s["id"] in IDS_BASE else catalogo.slug(s["cat"][0])
        valores = {k: s[k] for k in ("i0", "v", "min", "max") if k in s}
        grupos.setdefault(archivo, {})[s["id"]] = valores
        meta.append({**{k: v for k, v in s.items() if k not in valores}, "archivo": archivo})
    h = hashlib.sha1()
    for archivo, series in sorted(grupos.items()):
        txt = json.dumps(series, ensure_ascii=False, separators=(",", ":"))
        (destino / f"{archivo}.json").write_text(txt, encoding="utf-8")
        h.update(txt.encode("utf-8"))
    if ctx:
        txt = json.dumps(ctx, ensure_ascii=False, separators=(",", ":"))
        (destino / "contexto.json").write_text(txt, encoding="utf-8")
        h.update(txt.encode("utf-8"))
    if pm:  # precios en el mundo (bloque 6c)
        txt = json.dumps(pm, ensure_ascii=False, separators=(",", ":"))
        (destino / "precios_mundo.json").write_text(txt, encoding="utf-8")
        h.update(txt.encode("utf-8"))
    if cap:  # capacidad de gobierno (bloque 6d): sale de datos/manual/, sin red
        txt = json.dumps(cap, ensure_ascii=False, separators=(",", ":"))
        (destino / "capacidad.json").write_text(txt, encoding="utf-8")
        h.update(txt.encode("utf-8"))
    # Parte diario del BCRA: sale de los CSV de datos/cache/ (sin red). Va fuera del hash: cambia todos los días y no es parte de los datos mensuales.
    # Si falla (CSV roto, columna distinta) no corta la corrida: la web queda sin el parte.
    try:
        txt = json.dumps(diario.construir_json(), ensure_ascii=False, separators=(",", ":"))
        (destino / "diario_bcra.json").write_text(txt, encoding="utf-8")
    except Exception as e:
        print(f"Parte diario del BCRA: no se pudo armar, se sigue sin diario_bcra.json ({e}).")
    # Semáforo de actividad: con red baja las series (con respaldo en datos/cache/sem_*.csv); sin red (--solo-json) usa solo los respaldos.
    # Va fuera del hash, como el parte diario. Si falla, la corrida sigue sin semaforo.json.
    try:
        txt = json.dumps(semaforo.construir_json(con_red), ensure_ascii=False, separators=(",", ":"))
        (destino / "semaforo.json").write_text(txt, encoding="utf-8")
    except Exception as e:
        print(f"Semáforo de actividad: no se pudo armar, se sigue sin semaforo.json ({e}).")
    # Novedades y calendario (bloque 9b): con red suma al registro datos/novedades.json lo que llegó en esta corrida y baja el calendario del
    # INDEC (respaldo datos/cache/calendario_indec.json); sin red (--solo-json) solo escribe el JSON desde el registro y la copia.
    # Va fuera del hash. Si falla, la corrida sigue sin novedades.json.
    try:
        if con_red:
            novedades.registrar(datos)
        txt = json.dumps(novedades.construir_json(datos, con_red=con_red), ensure_ascii=False, separators=(",", ":"))
        (destino / "novedades.json").write_text(txt, encoding="utf-8")
    except Exception as e:
        print(f"Novedades: no se pudo armar, se sigue sin novedades.json ({e}).")
    # Gasto de la Nación (Presupuesto Abierto): con red baja los años que faltan (respaldos en datos/cache/gasto_nacion_*); sin red usa solo los respaldos.
    # Va fuera del hash. Si falla, la corrida sigue sin gasto_nacion*.json.
    try:
        for nombre, obj in gasto_nacion.construir_json(con_red).items():
            (destino / nombre).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    except Exception as e:
        print(f"Gasto de la Nación: no se pudo armar, se sigue sin gasto_nacion*.json ({e}).")
    # Gasto de la Nación, fase 2: cómo viene el año en curso (credito-mensual, respaldos en datos/cache/gasto_mensual_*). Va fuera del hash.
    # Si un control contra el anual no pasa o algo falla, la corrida sigue sin gasto_nacion_mensual.json.
    try:
        for nombre, obj in gasto_mensual.construir_json(con_red).items():
            (destino / nombre).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    except Exception as e:
        print(f"Gasto de la Nación (mensual): no se pudo armar, se sigue sin gasto_nacion_mensual.json ({e}).")
    # Gasto de la Nación, fase 3: transferencias a cada universidad (de los respaldos de gasto_nacion_*) y estudiantes del PIU de la AGN
    # (respaldos datos/cache/universidades_*; una bajada por día como mucho). Va fuera del hash. Si un control no pasa o algo falla,
    # la corrida sigue sin universidades.json.
    try:
        for nombre, obj in universidades.construir_json(con_red).items():
            (destino / nombre).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    except Exception as e:
        print(f"Universidades: no se pudo armar, se sigue sin universidades.json ({e}).")
    # Provincias, fase 1: lo que la Nación gasta en cada provincia (de los respaldos de gasto_nacion_*), población de INDEC y el gasto
    # consolidado de las provincias en % del PIB (respaldos datos/cache/provincias_*; una bajada por día como mucho). Va fuera del hash.
    # Si un control no pasa o algo falla, la corrida sigue sin provincias*.json.
    try:
        for nombre, obj in provincias.construir_json(con_red).items():
            (destino / nombre).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    except Exception as e:
        print(f"Provincias: no se pudo armar, se sigue sin provincias*.json ({e}).")
    # Provincias, fase 2: las cuentas de cada provincia (ingresos, gastos, finalidad, recaudación por impuesto, empleo y deuda) de la
    # DNAP (respaldos datos/cache/provincias_dnap_*; una bajada por día como mucho). Va fuera del hash. Si un control no pasa o algo
    # falla, la corrida sigue sin provincias_cuentas.json. Fase 3: las alícuotas de Ingresos Brutos (provincias_alicuotas.json), que
    # salen o fallan por separado de las cuentas.
    try:
        for nombre, obj in provincias_dnap.construir_json(con_red).items():
            (destino / nombre).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    except Exception as e:
        print(f"Provincias (cuentas): no se pudo armar, se sigue sin provincias_cuentas.json ({e}).")
    # Herencia, fase 2: datos de informes cargados a mano (datos/manual/herencia.json), sin red. Va fuera del hash.
    # Un dato sin cita completa corta solo este archivo: la corrida sigue y la página muestra las series sin los datos de informes.
    try:
        inf = herencia_informes.construir_json(datos)
        if inf is not None:
            (destino / "herencia_informes.json").write_text(json.dumps(inf, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    except Exception as e:
        print(f"Herencia (datos de informes): no se pudo armar, se sigue sin herencia_informes.json ({e}).")
    # Reservas netas, estimación propia con el método del FMI (herencia, fase 3): con red baja los encajes (variable 1243); sin red usa el respaldo.
    # Va fuera del hash. Si falla, la corrida sigue sin reservas_netas.json.
    try:
        (destino / "reservas_netas.json").write_text(json.dumps(reservas_netas.construir_json(con_red), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    except Exception as e:
        print(f"Reservas netas: no se pudo armar, se sigue sin reservas_netas.json ({e}).")
    # "version" cambia con cada dato nuevo: la web la agrega a cada pedido para no mezclar cachés viejos y nuevos.
    (destino / "catalogo.json").write_text(
        json.dumps({"version": h.hexdigest()[:10], "fechas": datos["fechas"], "series": meta}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8")
    print(f"JSON web: {len(grupos)} archivos de datos, {len(meta)} series en {destino}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--solo-json":  # regenera web/public/datos/ desde datos/cache/compilado.json, sin red
        escribir_json_web(json.loads((OUT / "cache" / "compilado.json").read_text(encoding="utf-8")), contexto.cargar_cache(), precios_mundo.cargar_cache(), capacidad.construir_json(con_red=False), con_red=False)
    else:
        sys.exit(main())
