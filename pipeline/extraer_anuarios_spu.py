"""
Extrae de los anuarios de estadísticas universitarias de la SPU los estudiantes, nuevos inscriptos y egresados de cada
universidad nacional (pregrado y grado), 1998-2014, y los escribe en datos/manual/universidades_spu.json.
Se corre una sola vez (o cuando salga un anuario nuevo); NO corre en el workflow. Lo lee pipeline/universidades.py.

Cuadros (instituciones universitarias de gestión estatal): 2.1.1 estudiantes, 2.1.2 nuevos inscriptos, 2.1.3 egresados.
Anuarios (PDF bajados a mano a una carpeta; cada uno con su página):
  2008: PDF págs. 65, 67, 69 (1998-2008)      2012: 86, 88, 90 (2002-2012)
  2013: 116, 118, 120 (2003-2013)             2014: 92, 94, 96 (2004-2014)
Cada año sale del anuario más reciente que lo trae; las diferencias con los anteriores se listan (los anuarios corrigen cifras).

Requiere pdfplumber (pip install pdfplumber; solo para esta extracción, no va a requirements.txt).

Controles (si no cierran, el script falla y no escribe nada):
- por anuario, cuadro y año: suma de las universidades nacionales = fila «Total Universidades Nacionales» del cuadro, exacta
  (desde el anuario 2012 el IUNA figura entre los institutos: se lo suma al total, como en el anuario 2008);
- por año: suma de las universidades elegidas = total del cuadro del anuario elegido;
- toda universidad nacional del cuadro tiene nombre mapeado (MAPA); si aparece una nueva, falla.

Uso:  python pipeline/extraer_anuarios_spu.py <carpeta con los PDF>
La carpeta tiene: a2008/anuario2008.pdf, a2012/anuario2012.pdf, an2013/a.pdf, an2014/a.pdf.
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "datos" / "manual" / "universidades_spu.json"

# (año del anuario, archivo dentro de la carpeta, url, páginas {estudiantes, nuevos, egresados})
DOCUMENTOS = [
    (2008, "a2008/anuario2008.pdf", "https://www.argentina.gob.ar/sites/default/files/anuario_2008.pdf", (65, 67, 69)),
    (2012, "a2012/anuario2012.pdf", "https://www.argentina.gob.ar/sites/default/files/anuario_2012.pdf", (86, 88, 90)),
    (2013, "an2013/a.pdf", "https://www.argentina.gob.ar/sites/default/files/anuario_2013.pdf", (116, 118, 120)),
    (2014, "an2014/a.pdf", "https://www.argentina.gob.ar/sites/default/files/anuario_2014.pdf", (92, 94, 96)),
]
CUADROS = (("est", "2.1.1"), ("nuevos", "2.1.2"), ("egresados", "2.1.3"))

# Nombre abreviado de la SPU -> nombre que usa el presupuesto (pipeline/universidades.py). None = no es universidad nacional
# del presupuesto de este programa y se deja afuera (se lista).
MAPA = {
    "Arturo Jauretche": "Universidad Nacional Arturo Jauretche",
    "Avellaneda": "Universidad Nacional de Avellaneda",
    "Buenos Aires": "Universidad de Buenos Aires",
    "Catamarca": "Universidad Nacional de Catamarca",
    "Centro de la PBA": "Universidad Nacional del Centro de la Provincia de Buenos Aires",
    "Chaco Austral": "Universidad Nacional del Chaco Austral",
    "Chilecito": "Universidad Nacional de Chilecito",
    "Comahue": "Universidad Nacional del Comahue",
    "Córdoba": "Universidad Nacional de Córdoba",
    "Cuyo": "Universidad Nacional de Cuyo",
    "Entre Ríos": "Universidad Nacional de Entre Ríos",
    "Formosa": "Universidad Nacional de Formosa",
    "Gral. San Martín": "Universidad Nacional de San Martín",
    "San Martín": "Universidad Nacional de San Martín",
    "Gral. Sarmiento": "Universidad Nacional de General Sarmiento",
    "Instituto Univ. del Arte": "Universidad Nacional de las Artes",
    "IUNA": "Universidad Nacional de las Artes",
    "José C. Paz": "Universidad Nacional José Clemente Paz",
    "Jujuy": "Universidad Nacional de Jujuy",
    "La Matanza": "Universidad Nacional de La Matanza",
    "La Pampa": "Universidad Nacional de La Pampa",
    "La Plata": "Universidad Nacional de La Plata",
    "La Rioja": "Universidad Nacional de La Rioja",
    "Lanús": "Universidad Nacional de Lanús",
    "Litoral": "Universidad Nacional del Litoral",
    "Lomas de Zamora": "Universidad Nacional de Lomas de Zamora",
    "Luján": "Universidad Nacional de Luján",
    "Mar del Plata": "Universidad Nacional de Mar del Plata",
    "Misiones": "Universidad Nacional de Misiones",
    "Moreno": "Universidad Nacional de Moreno",
    "Nordeste": "Universidad Nacional del Nordeste",
    "Noroeste de la PBA": "Universidad Nacional del Noroeste de la Provincia de Buenos Aires",
    "Oeste": "Universidad Nacional del Oeste",
    "Patagonia Austral": "Universidad Nacional de la Patagonia Austral",
    "Patagonia S. J. Bosco": "Universidad Nacional de la Patagonia San Juan Bosco",
    "Quilmes": "Universidad Nacional de Quilmes",
    "Río Cuarto": "Universidad Nacional de Río Cuarto",
    "Río Negro": "Universidad Nacional de Río Negro",
    "Rosario": "Universidad Nacional de Rosario",
    "Salta": "Universidad Nacional de Salta",
    "San Juan": "Universidad Nacional de San Juan",
    "San Luis": "Universidad Nacional de San Luis",
    "Santiago del Estero": "Universidad Nacional de Santiago del Estero",
    "Sur": "Universidad Nacional del Sur",
    "Tecnológica Nacional": "Universidad Tecnológica Nacional",
    "Tierra del Fuego": "Universidad Nacional de Tierra del Fuego, Antártida e Islas del Atlántico Sur",
    "Tres de Febrero": "Universidad Nacional de Tres de Febrero",
    "Tucumán": "Universidad Nacional de Tucumán",
    "Villa María": "Universidad Nacional de Villa María",
    "Villa Mercedes": "Universidad Nacional de Villa Mercedes",
}

NUM = r"(?:\d+(?:\.\d{3})*|-|…)"   # el anuario 2014 imprime 2014 a veces sin punto de miles («5190»)
TOTAL_NAC = "Total Universidades Nacionales"
TOTAL_INST = "Total Institutos Universitarios"


def _num(t):
    return None if t in ("-", "…") else int(t.replace(".", ""))


def _limpiar(n):
    return re.sub(r"\(\d\)$", "", n).strip()


def _leer_tabla(pdf, pagina, cuadro):
    """Una página del anuario -> (años, {nombre: [valores]}, total_nacionales[]). Solo la sección de universidades nacionales
    (más IUNA, ver abajo); el total devuelto ya suma IUNA cuando el cuadro lo trae aparte."""
    texto = pdf.pages[pagina - 1].extract_text() or ""
    if f"Cuadro {cuadro}" not in texto:
        raise RuntimeError(f"la página {pagina} no es el cuadro {cuadro}")
    anios = None
    filas, total, dentro, extra = {}, None, False, {}
    for linea in texto.splitlines():
        if anios is None:
            m = re.match(r"^((?:(?:19|20)\d\d\s+)+)", linea + " ")
            if m and len(m.group(1).split()) >= 5:
                anios = [int(x) for x in m.group(1).split()]
            continue
        # nombre, un valor por año, la tasa (número con coma o guion) y, a veces, texto de notas pegado de otra columna
        patron = rf"^(.*?)\s+((?:{NUM}\s+){{{len(anios) - 1}}}{NUM})(?:\s+(?:-?\d+,\d+|-))?(?:\s+\S.*)?$"
        m = re.match(patron, linea)
        if m:
            nombre = _limpiar(m.group(1))
            vals = [_num(t) for t in m.group(2).split()]
        else:
            # el anuario 2012 imprime Oeste con un solo valor: «Oeste 1.433 -» = 1.433 en el último año (2012)
            m = re.match(rf"^(Oeste)\s+({NUM})\s+-$", linea)
            if not m:
                continue
            nombre, vals = m.group(1), [None] * (len(anios) - 1) + [_num(m.group(2))]
        if nombre == TOTAL_NAC:
            total, dentro = vals, True
        elif nombre == TOTAL_INST:
            dentro = False
        elif nombre == "IUNA":
            # desde el anuario 2012 el Instituto Universitario Nacional del Arte figura entre los institutos y no entre las
            # universidades nacionales (en el 2008 sí): se lo toma igual y se lo suma al total para que los años cierren
            extra[nombre] = vals
        elif dentro:
            if nombre in filas:
                raise RuntimeError(f"fila repetida «{nombre}» en la página {pagina}")
            filas[nombre] = vals
    if anios is None or total is None:
        raise RuntimeError(f"no se encontró el encabezado de años o la fila «{TOTAL_NAC}» en la página {pagina}")
    return anios, filas, total, extra


def main(carpeta):
    import pdfplumber
    # por documento y cuadro
    leido = {}   # (anio_anuario, clave) -> (anios, filas, total)
    for anio_doc, archivo, url, paginas in DOCUMENTOS:
        with pdfplumber.open(Path(carpeta) / archivo) as pdf:
            for (clave, cuadro), pag in zip(CUADROS, paginas):
                anios, filas, total, extra = _leer_tabla(pdf, pag, cuadro)
                for vals in extra.values():
                    total = [t + (v or 0) for t, v in zip(total, vals)]
                filas.update(extra)
                desconocidas = sorted(n for n in filas if n not in MAPA)
                if desconocidas:
                    raise RuntimeError(f"anuario {anio_doc} cuadro {cuadro}: universidades sin mapear en MAPA: {desconocidas}")
                # control: suma = total de las universidades nacionales
                for i, a in enumerate(anios):
                    suma = sum(v[i] or 0 for v in filas.values())
                    if suma != total[i]:
                        raise RuntimeError(f"anuario {anio_doc} {clave} {a}: la suma de las universidades ({suma:,}) no cierra con "
                                           f"«{TOTAL_NAC}» ({total[i]:,}; diferencia {total[i] - suma:+,})")
                leido[(anio_doc, clave)] = (anios, filas, total)
                print(f"  anuario {anio_doc} cuadro {cuadro} (pág. {pag}): {len(filas)} universidades, {anios[0]}-{anios[-1]}")

    # unión: cada año del anuario más reciente que lo trae; diferencias con los otros
    unis = {}      # n_spu canónico (nombre del presupuesto) -> {clave: {anio: n}}
    nombres_spu = {}
    totales = {}   # anio -> {clave: total del cuadro del anuario elegido}
    diferencias = []
    for clave, _ in CUADROS:
        elegido = {}   # (nombre mapeado, anio) -> (valor, anuario)
        for anio_doc, *_r in sorted(DOCUMENTOS, key=lambda d: d[0]):
            anios, filas, total = leido[(anio_doc, clave)]
            for nombre, vals in filas.items():
                for a, v in zip(anios, vals):
                    k = (MAPA[nombre], a)
                    if v is None:
                        continue
                    nombres_spu.setdefault(MAPA[nombre], nombre)
                    if k in elegido and elegido[k][0] != v:
                        diferencias.append((clave, MAPA[nombre], a, elegido[k][1], elegido[k][0], anio_doc, v))
                    elegido[k] = (v, anio_doc)   # el anuario más reciente pisa
            for a, t in zip(anios, total):
                totales.setdefault(a, {})[clave] = t
        for (n, a), (v, _doc) in elegido.items():
            unis.setdefault(n, {"est": {}, "nuevos": {}, "egresados": {}})[clave][str(a)] = v
    # el total por año se rehace con el mismo criterio: suma de las universidades elegidas (y se compara con el cuadro)
    for a in sorted(totales):
        for clave, _ in CUADROS:
            suma = sum(u[clave].get(str(a), 0) for u in unis.values())
            tot = totales[a][clave]
            if suma != tot:
                raise RuntimeError(f"total {clave} {a}: la suma de las universidades elegidas ({suma:,}) no da el total del cuadro más reciente ({tot:,})")

    print(f"  diferencias entre anuarios en el mismo dato: {len(diferencias)} (se toma el anuario más reciente)")
    por_anuario = {}
    for clave, n, a, d0, v0, d1, v1 in diferencias:
        por_anuario.setdefault((d0, d1), []).append((clave, n, a, v0, v1))
    for (d0, d1), lst in sorted(por_anuario.items()):
        print(f"    anuario {d0} vs {d1}: {len(lst)} (p. ej. {lst[0]})")

    obj = {
        "generado": date.today().isoformat(),
        "fuente": "Secretaría de Políticas Universitarias (SPU), Departamento de Información Universitaria: Anuarios de Estadísticas Universitarias 2008, 2012, 2013 y 2014, cuadros 2.1.1 (estudiantes), 2.1.2 (nuevos inscriptos) y 2.1.3 (egresados), universidades nacionales, carreras de pregrado y grado. Datos del sistema SIU-Araucano.",
        "nota": "Cada año sale del anuario más reciente que lo trae (los anuarios corrigen cifras de años anteriores). Extraído una sola vez con pipeline/extraer_anuarios_spu.py (pdfplumber). Una universidad sin cifra en un año (guion o «…» en el cuadro) no tiene valor ese año. Los totales son la fila «Total Universidades Nacionales» del cuadro del anuario más reciente que trae ese año.",
        "documentos": [
            {"anio_anuario": d, "url": u, "cuadros": {c: p for (_k, c), p in zip(CUADROS, pags)}}
            for d, _f, u, pags in DOCUMENTOS
        ],
        "universidades": [
            {"n_spu": nombres_spu[n], "n": n, **{k: dict(sorted(v.items())) for k, v in series.items()}}
            for n, series in sorted(unis.items())
        ],
        "totales": {str(a): totales[a] for a in sorted(totales)},
        "diferencias_entre_anuarios": [
            {"serie": c, "n": n, "anio": a, "anuario_previo": d0, "valor_previo": v0, "anuario": d1, "valor": v1}
            for c, n, a, d0, v0, d1, v1 in diferencias
        ],
    }
    SALIDA.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  escrito {SALIDA} ({len(unis)} universidades)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
