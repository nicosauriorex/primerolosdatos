# Deuda neta del sector público: fuentes (2026-11-17)

Hecha por `investigador-datos` para la idea «Deuda neta del sector público consolidado» de `docs/IDEAS.md`. Cifras de control tomadas por el agente: las marcadas «sin verificar» no se leyeron de la fuente.

## 1. Deuda bruta del Tesoro según quién la tiene

**Presentación gráfica trimestral de Finanzas (la fuente buena).** Capítulo «Deuda bruta de la Administración Central por acreedor»: agencias del sector público (títulos, préstamos y adelantos en cartera de organismos del Sector Público Nacional: BCRA, FGS, Banco Nación y otros, solo el total), organismos multilaterales y bilaterales, y sector privado (el resto). Millones de US$ al A3500 de fin de período.
- PDF: `https://www.argentina.gob.ar/sites/default/files/presentacion_grafica_2do_trim_26.pdf` (2T26), `presentacion_grafica_ivt_25.pdf` (4T25), `presentacion_gra_fica_1t23.pdf` (1T23). Índice de todas (2019 a 2T26): `https://www.argentina.gob.ar/economia/finanzas/datos-trimestrales-de-la-deuda`.
- Trimestral; cada presentación trae dos fechas (cierre del año anterior y el trimestre). Juntando todas: serie trimestral desde 2019. Gráfico en % del PIB por acreedor de 2004 a 2T26.
- Se baja con curl; el texto del PDF sale desordenado: cargar los números a mano en `datos/manual/` con cita y controlar que sumen el total.
- Control (las sumas cierran exacto; la asignación de filas conviene confirmarla mirando el PDF):
  - 30/06/2026: total 474.198; agencias 197.213 (41,6 %); privados 177.738 (incluye elegible pendiente 2.403); multilaterales y bilaterales 99.247.
  - 31/12/2025: total 455.077; agencias 200.249; privados 155.468; multilaterales 99.360.
  - 31/03/2023: total 398.246; agencias 184.608; privados 132.336; multilaterales 81.302 (corregido el 2026-11-17 mirando el PDF: el agente había invertido agencias y multilaterales).

**Planilla trimestral (`deuda_publica_<fecha>.xlsx`), solo la parte del BCRA:** hoja A.1.1 (adelantos transitorios: 2.758,6 M US$ al 30/06/2026) y A.1.9 (letras en dólares del BCRA: 30.309,9 M US$). No sirve para FGS ni Banco Nación.

**FGS (ANSES):** Informe Estadístico Mensual, `https://www.anses.gob.ar/sites/default/files/YYYY-MM/IEM_FGS_YYYYMM.pdf`, mensual con dos meses de atraso, millones de $ a valor de mercado. ANSES responde 403 a toda descarga automática: solo a mano. Títulos públicos nacionales may-26: 93.140.762 millones de $ (sin verificar).

**No existe (verificado por el agente):** variable de tenencia de títulos del BCRA en la API v4 (revisadas las 1.610); serie del balance del BCRA en datos.gob.ar después de oct-25 (`300.1_AP_ACT_TITNAC_0_M_47`, `300.1_AP_ACT_TITPUB_0_M_14`); apertura por tenedor en la OPC; cifras oficiales separadas de BCRA, FGS y Banco Nación.

## 2. Pasivos monetarios del BCRA
- API v4, variable **1247** (base monetaria + depósitos y otros pasivos monetarios en moneda extranjera): diaria desde 1996, millones de $. 31/08/2026 = 68.006.428 (la cifra del texto pegado); = 1248 (base, 47.451.537) + 1254 (20.554.891).
- Aviso: la 1268 (adelantos) está congelada en 4.091.100 desde agosto (repite el saldo de junio); 155 y 152 valen 0 en 2026; 196 (Lefi) termina el 11/07/2025.

## 3. De dónde sale la metodología
- Coincide con la de Facimex (Bloomberg Línea, «Deuda neta consolidada del Estado argentino sube en el primer trimestre»): pasivos del Tesoro con privados y organismos + pasivos del BCRA (con repos, sin los Bopreal en garantía) − tenencias de agencias públicas − reservas netas − depósitos del Tesoro. 1T26: US$ 254.000 M (36,9 % del PIB).
- El texto atribuido a Infobae y la cifra 484.917 no aparecieron.

## Camino posible
1. Serie trimestral desde 2019 «Deuda del Tesoro con privados y organismos» = bruta − agencias del sector público, cargada a mano desde las presentaciones (unas 30 cifras, con cita).
2. Banco Central: pasivos monetarios (1247) en dólares menos reservas netas (estimación propia, D-021).
3. Las dos juntas: deuda neta consolidada, trimestral. Los depósitos del Tesoro (lo que también resta Facimex) quedan por ver.
