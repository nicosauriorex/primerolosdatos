"""
Reproduce las cifras aproximadas de datos/manual/leyes_ejecutivo.csv (Menem 1 a Duhalde y las enviadas de Kirchner y CFK 1).

Los totales de la HCDN vienen por período parlamentario, no por mandato: se reparten por días entre los mandatos que cada
período cruza. Las cifras de entrada se copiaron a mano de dos informes de la Dirección de Información Parlamentaria:
  - «Proyectos presentados desde 1983» (CantProyPresDesde1983.pdf): columna «Mensajes y P/L del PEN», Diputados + Senado.
  - «Leyes sancionadas por período parlamentario según iniciativa» (Estadistica_leyes_83-23.pdf): fila Poder Ejecutivo.
No usa red ni escribe archivos: imprime las cifras para compararlas con el CSV. No corre en el workflow.

Uso: python pipeline/leyes_ejecutivo_prorrateo.py
"""
import datetime as dt

# Períodos parlamentarios: del 107 al 112 de mayo a abril (el 112 termina en febrero de 1995); del 113 en adelante de marzo a febrero.
INICIO = {107: "1989-05-01", 108: "1990-05-01", 109: "1991-05-01", 110: "1992-05-01", 111: "1993-05-01", 112: "1994-05-01",
          113: "1995-03-01", 114: "1996-03-01", 115: "1997-03-01", 116: "1998-03-01", 117: "1999-03-01", 118: "2000-03-01",
          119: "2001-03-01", 120: "2002-03-01", 121: "2003-03-01", 122: "2004-03-01", 123: "2005-03-01", 124: "2006-03-01",
          125: "2007-03-01", 126: "2008-03-01", 127: "2009-03-01", 128: "2010-03-01", 129: "2011-03-01"}
FIN = {107: "1990-04-30", 108: "1991-04-30", 109: "1992-04-30", 110: "1993-04-30", 111: "1994-04-30", 112: "1995-02-28",
       113: "1996-02-29", 114: "1997-02-28", 115: "1998-02-28", 116: "1999-02-28", 117: "2000-02-29", 118: "2001-02-28",
       119: "2002-02-28", 120: "2003-02-28", 121: "2004-02-29", 122: "2005-02-28", 123: "2006-02-28", 124: "2007-02-28",
       125: "2008-02-29", 126: "2009-02-28", 127: "2010-02-28", 128: "2011-02-28", 129: "2012-02-29"}
# Enviadas: Mensajes y P/L del PEN (Diputados + Senado) por período.
ENVIADAS = {107: 59 + 35, 108: 30 + 78, 109: 47 + 94, 110: 27 + 45, 111: 37 + 69, 112: 30 + 64, 113: 27 + 58, 114: 31 + 65,
            115: 53 + 91, 116: 39 + 86, 117: 54 + 73, 118: 32 + 55, 119: 38 + 46, 120: 51 + 42, 121: 32 + 44, 122: 28 + 49,
            123: 21 + 34, 124: 18 + 61, 125: 23 + 57, 126: 37 + 21, 127: 29 + 42, 128: 21 + 12, 129: 12 + 43}
# Aprobadas: leyes sancionadas con origen en el PEN por período (solo hasta el 120: de ahí en adelante se cuentan una por una).
APROBADAS = {107: 67, 108: 70, 109: 53, 110: 53, 111: 58, 112: 74, 113: 74, 114: 67, 115: 52, 116: 57, 117: 68, 118: 82,
             119: 58, 120: 66}
MANDATOS = {
    "Menem 1": ("1989-07-08", "1995-07-07"),
    "Menem 2": ("1995-07-08", "1999-12-09"),
    "De la Rúa": ("1999-12-10", "2001-12-20"),
    "Duhalde": ("2001-12-21", "2003-05-24"),
    "Kirchner": ("2003-05-25", "2007-12-09"),
    "CFK 1": ("2007-12-10", "2011-12-09"),
}


def repartir(tabla, desde, hasta):
    """Suma de tabla[período] por la fracción (uniforme por días) de cada período que cae entre `desde` y `hasta`."""
    total, partes = 0.0, {}
    for p, valor in tabla.items():
        ini, fin = dt.date.fromisoformat(INICIO[p]), dt.date.fromisoformat(FIN[p])
        dias = (fin - ini).days + 1
        sup, inf = max(ini, desde), min(fin, hasta)
        if inf >= sup:
            f = ((inf - sup).days + 1) / dias
            total += valor * f
            partes[p] = round(f, 2)
    return round(total), partes


def main():
    for nombre, (a, b) in MANDATOS.items():
        env, p_env = repartir(ENVIADAS, dt.date.fromisoformat(a), dt.date.fromisoformat(b))
        apr, p_apr = repartir(APROBADAS, dt.date.fromisoformat(a), dt.date.fromisoformat(b))
        print(f"{nombre:10s} {a}..{b}  enviadas ~{env}  aprobadas ~{apr}")
        print("    períodos de las enviadas:", p_env)
        print("    períodos de las aprobadas:", p_apr or "(sin reparto: se cuentan una por una)")


if __name__ == "__main__":
    main()
