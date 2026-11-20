"""Agenda de mantenimiento de los datos cargados a mano (datos/manual/agenda.json).

Uso:
  python pipeline/agenda.py                       resumen: cuántas entradas y cuántas están pendientes hoy
  python pipeline/agenda.py --validar             controla que cada archivo de datos/manual/ figure en la agenda (sale con 1 si no)
  python pipeline/agenda.py --pendientes [--hoy AAAA-MM-DD]
                                                  imprime en JSON las entradas con mirar_desde <= hoy, ordenadas por fecha
  python pipeline/agenda.py --cargado <id> --ultimo <período> --mirar-desde <AAAA-MM-DD>
                                                  actualiza esa entrada después de cargar un dato

Spec: docs/specs/mantenimiento-automatico.md
"""
import argparse
import json
import sys
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MANUAL = RAIZ / "datos" / "manual"
AGENDA = MANUAL / "agenda.json"

CAMPOS = ["id", "archivos", "que", "frecuencia", "cuando_sale", "ultimo", "mirar_desde", "donde_mirar",
          "como_reconocer", "como_cargar", "validar", "solo_json", "modo", "riesgo"]
FRECUENCIAS = ["mensual", "trimestral", "semestral", "anual", "eventual"]
MODOS = ["auto", "avisar"]


def _leer():
    with open(AGENDA, encoding="utf-8") as f:
        return json.load(f)


def _fecha(txt):
    """Devuelve la fecha si txt es AAAA-MM-DD válida, o None."""
    if not isinstance(txt, str) or len(txt) != 10:
        return None
    try:
        return date.fromisoformat(txt)
    except ValueError:
        return None


def problemas():
    """Lista de problemas de la agenda (vacía si está bien)."""
    if not AGENDA.exists():
        return ["Falta datos/manual/agenda.json."]
    try:
        ag = _leer()
    except json.JSONDecodeError as e:
        return [f"datos/manual/agenda.json no es un JSON válido: {e}"]
    p = []
    entradas = ag.get("entradas")
    cerrados = ag.get("cerrados")
    if not isinstance(entradas, list):
        return ["agenda.json: 'entradas' tiene que ser una lista."]
    if not isinstance(cerrados, list):
        return ["agenda.json: 'cerrados' tiene que ser una lista."]
    ids = set()
    cubiertos = set()
    for i, e in enumerate(entradas):
        nombre = e.get("id", f"#{i + 1}") if isinstance(e, dict) else f"#{i + 1}"
        if not isinstance(e, dict):
            p.append(f"Entrada {nombre}: tiene que ser un objeto.")
            continue
        for c in CAMPOS:
            if c not in e:
                p.append(f"Entrada {nombre}: falta el campo '{c}'.")
        if "id" in e:
            if e["id"] in ids:
                p.append(f"Entrada {nombre}: el id está repetido.")
            ids.add(e["id"])
        if "frecuencia" in e and e["frecuencia"] not in FRECUENCIAS:
            p.append(f"Entrada {nombre}: frecuencia '{e['frecuencia']}' no es una de {', '.join(FRECUENCIAS)}.")
        if "modo" in e and e["modo"] not in MODOS:
            p.append(f"Entrada {nombre}: modo '{e['modo']}' no es una de {', '.join(MODOS)}.")
        if "mirar_desde" in e and _fecha(e["mirar_desde"]) is None:
            p.append(f"Entrada {nombre}: mirar_desde '{e['mirar_desde']}' no es una fecha AAAA-MM-DD.")
        if "solo_json" in e and not isinstance(e["solo_json"], bool):
            p.append(f"Entrada {nombre}: solo_json tiene que ser true o false.")
        for c in ("archivos", "donde_mirar"):
            if c in e and (not isinstance(e[c], list) or not e[c]):
                p.append(f"Entrada {nombre}: '{c}' tiene que ser una lista con al menos un elemento.")
        for c in ("que", "cuando_sale", "ultimo", "como_reconocer", "como_cargar", "validar", "riesgo"):
            if c in e and (not isinstance(e[c], str) or not e[c].strip()):
                p.append(f"Entrada {nombre}: '{c}' está vacío.")
        for a in e.get("archivos", []) if isinstance(e.get("archivos"), list) else []:
            if not (RAIZ / a).is_file():
                p.append(f"Entrada {nombre}: el archivo {a} no existe.")
            cubiertos.add(a)
    for i, c in enumerate(cerrados):
        if not isinstance(c, dict) or not c.get("archivo") or not c.get("motivo"):
            p.append(f"Cerrado #{i + 1}: tiene que tener 'archivo' y 'motivo'.")
            continue
        if not (RAIZ / c["archivo"]).is_file():
            p.append(f"Cerrado {c['archivo']}: el archivo no existe.")
        cubiertos.add(c["archivo"])
    for f in sorted(MANUAL.iterdir()):
        rel = f"datos/manual/{f.name}"
        if f.is_file() and f.name != AGENDA.name and rel not in cubiertos:
            p.append(f"{rel} no está en la agenda: sumá su entrada a datos/manual/agenda.json (o a 'cerrados' si ya no se actualiza).")
    return p


def pendientes(hoy):
    """Entradas con mirar_desde <= hoy, ordenadas por esa fecha."""
    ent = [e for e in _leer()["entradas"] if e["mirar_desde"] <= hoy.isoformat()]
    return sorted(ent, key=lambda e: (e["mirar_desde"], e["id"]))


def cargado(id_, ultimo, mirar_desde):
    ag = _leer()
    for e in ag["entradas"]:
        if e["id"] == id_:
            e["ultimo"] = ultimo
            e["mirar_desde"] = mirar_desde
            break
    else:
        sys.exit(f"No hay ninguna entrada con id '{id_}' en la agenda.")
    with open(AGENDA, "w", encoding="utf-8", newline="\n") as f:
        json.dump(ag, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{id_}: último = {ultimo}; mirar desde {mirar_desde}.")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Agenda de mantenimiento de los datos cargados a mano.")
    ap.add_argument("--validar", action="store_true", help="controla que todo archivo de datos/manual/ figure en la agenda")
    ap.add_argument("--pendientes", action="store_true", help="imprime en JSON las entradas para mirar hoy")
    ap.add_argument("--hoy", help="fecha AAAA-MM-DD para --pendientes (por defecto, hoy)")
    ap.add_argument("--cargado", metavar="ID", help="id de la entrada que se acaba de cargar")
    ap.add_argument("--ultimo", help="período cargado, con el texto que usa la entrada")
    ap.add_argument("--mirar-desde", help="próxima fecha para revisar, AAAA-MM-DD")
    a = ap.parse_args()

    if a.cargado:
        if not a.ultimo or not a.mirar_desde:
            sys.exit("--cargado necesita --ultimo y --mirar-desde.")
        if _fecha(a.mirar_desde) is None:
            sys.exit(f"--mirar-desde '{a.mirar_desde}' no es una fecha AAAA-MM-DD.")
        cargado(a.cargado, a.ultimo, a.mirar_desde)
        return
    if a.validar:
        pr = problemas()
        if pr:
            print(f"La agenda tiene {len(pr)} problema(s):", file=sys.stderr)
            for x in pr:
                print(f"  - {x}", file=sys.stderr)
            sys.exit(1)
        ag = _leer()
        print(f"Agenda en orden: {len(ag['entradas'])} entradas y {len(ag['cerrados'])} archivos cerrados.")
        return
    hoy = date.today()
    if a.hoy:
        hoy = _fecha(a.hoy)
        if hoy is None:
            sys.exit(f"--hoy '{a.hoy}' no es una fecha AAAA-MM-DD.")
    if a.pendientes:
        print(json.dumps(pendientes(hoy), ensure_ascii=False, indent=2))
        return
    ag = _leer()
    pend = pendientes(hoy)
    print(f"Agenda: {len(ag['entradas'])} entradas, {len(ag['cerrados'])} archivos cerrados.")
    print(f"Para mirar al {hoy.isoformat()}: {len(pend)} ({', '.join(e['id'] for e in pend) or 'ninguna'}).")


if __name__ == "__main__":
    main()
