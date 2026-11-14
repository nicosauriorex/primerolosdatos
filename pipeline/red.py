"""
Red y caché del pipeline: toda descarga pasa por acá.

- bajar(): un pedido HTTP (con User-Agent propio). Con PIPELINE_SIN_RED=1 no se conecta (prueba con los respaldos).
- cacheado / cache_df / cache_json: intentan bajar y, si falla, usan la última copia guardada en datos/cache/.
  Recuerdan el resultado por nombre dentro de la corrida: pedir dos veces lo mismo no baja dos veces.
- RESPALDOS: nombres que en esta corrida salieron del respaldo. DESCARGAS: pedidos HTTP de la corrida.
"""
import copy
import json
import os
import urllib.request
from pathlib import Path

import pandas as pd

CACHE = Path(__file__).resolve().parent.parent / "datos" / "cache"
CACHE.mkdir(parents=True, exist_ok=True)
UA = "primero-los-datos-script"

RESPALDOS: set[str] = set()
DESCARGAS: int = 0
_MEMORIA: dict = {}


def bajar(url, data=None, headers=None, timeout=90, ua=UA):
    """Bytes de la respuesta. ua=None deja el User-Agent por defecto de urllib (el FMI lo necesita); `headers` puede pisar el User-Agent."""
    global DESCARGAS
    if os.environ.get("PIPELINE_SIN_RED") == "1":
        raise RuntimeError("PIPELINE_SIN_RED=1: sin red, no se baja " + str(url)[:80])
    h = {} if ua is None else {"User-Agent": ua}
    h.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=h)
    DESCARGAS += 1
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def cacheado(nombre, fn):
    """Serie (CSV): intenta bajar con fn(); si falla usa la última copia guardada; si no hay, lanza el error."""
    clave = ("csv", nombre)
    if clave in _MEMORIA:
        return _MEMORIA[clave].copy()
    f = CACHE / f"{nombre}.csv"
    try:
        s = fn()
        s.to_csv(f)
    except Exception as e:  # noqa: BLE001
        if not f.exists():
            raise
        print(f"  {nombre}: error al bajar ({e}); uso cache {f.name}")
        s = pd.read_csv(f, index_col=0, parse_dates=True).iloc[:, 0]
        RESPALDOS.add(nombre)
    _MEMORIA[clave] = s
    return s.copy()


def cache_df(nombre, fn):
    """DataFrame (pickle): como cacheado, pero si falla y no hay copia devuelve un DataFrame vacío."""
    clave = ("pkl", nombre)
    if clave in _MEMORIA:
        return _MEMORIA[clave].copy()
    f = CACHE / f"{nombre}.pkl"
    try:
        df = fn()
        df.to_pickle(f)
    except Exception as e:  # noqa: BLE001
        if f.exists():
            print(f"  {nombre}: error al bajar ({e}); uso cache")
            df = pd.read_pickle(f)
            RESPALDOS.add(nombre)
        else:
            print(f"  {nombre}: no disponible ({e})")
            return pd.DataFrame()
    _MEMORIA[clave] = df
    return df.copy()


def cache_json(nombre, fn):
    """dict (JSON): como cacheado; si falla y no hay copia devuelve None."""
    clave = ("json", nombre)
    if clave in _MEMORIA:
        return copy.deepcopy(_MEMORIA[clave])
    f = CACHE / f"{nombre}.json"
    try:
        d = fn()
        f.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    except Exception as e:  # noqa: BLE001
        if f.exists():
            print(f"  {nombre}: error al bajar ({e}); uso cache {f.name}")
            d = json.loads(f.read_text(encoding="utf-8"))
            RESPALDOS.add(nombre)
        else:
            print(f"  {nombre}: no disponible ({e})")
            return None
    _MEMORIA[clave] = d
    return copy.deepcopy(d)


def guardar_meta(nombre, meta):
    (CACHE / f"{nombre}_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
