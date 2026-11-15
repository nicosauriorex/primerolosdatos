# Estado del proyecto

Para retomar en una sesión nueva. Última actualización: 2026-11-15.

**Reglas de este archivo:** máximo ~1 página. Las ideas abiertas están en `docs/IDEAS.md`; las hechas, en `docs/IDEAS-HECHAS.md`. Una línea por bloque, con link a su spec; el detalle (cómo se verificó, qué marcó el revisor, medidas) va a la spec, no acá. Al cerrar una tanda: agregar su línea, sacar de "Sin verificar" lo que se verificó y, si una sección crece, mover lo viejo a `docs/HISTORIAL.md`.

## Dónde estamos
Publicado en https://primerolosdatos.com.ar: herramienta para responder en redes con una imagen, con datos oficiales. Plan y bloques en `docs/ROADMAP.md`; detalle de todo lo anterior al 2026-11-15 en `docs/HISTORIAL.md`.

Últimos bloques (todos publicados, corrida en verde):
- Tanda 11: Congreso en columnas con «Leyes por apoyo»; resaltar un país (y su imagen) en Otros países y «¿Cómo viene?» — 2026-11-15, 4c80be2 — [spec](specs/ajustes-tanda-11.md)
- Tanda 10: la lupa encuentra Herencia y el parte del Banco Central; selector de Herencia agrupado — 2026-11-15, b296c75 — [spec](specs/ajustes-tanda-10.md)
- EE.UU. (BLS) y Chile (INE) en precios contra el mundo, productos de EE.UU. desde el BLS y aviso de presidente sin dato — 2026-11-15, 4078c3e — [spec](specs/precios-mundo-bls-ine.md)
- Chips compactos en todo el sitio (R24) y cierre de Contexto — 2026-11-15, 63d1e40 — [spec](specs/chips-compactos.md)
- Contexto: "El mundo y la Argentina" con subpestañas y barras — 2026-11-15 — [spec](specs/remodelacion-contexto-precios.md)
- Tandas de ajustes 7, 8 y 9 — 2026-11-14/15 — [7](specs/ajustes-tanda-7.md), [8](specs/ajustes-tanda-8.md), [9](specs/ajustes-tanda-9.md)
- Remodelación de UX/UI, etapas 1 a 3.5 y cierre (crítica de Impeccable 21 → 26/40) — 2026-11-13/14 — [sistema](specs/remodelacion-sistema.md), [cierre](specs/remodelacion-cierre.md)
- Mantenimiento del pipeline (`pipeline/red.py`) — 2026-11-14 — [spec](specs/mantenimiento-pipeline.md)

## Qué sigue, en orden
1. **El primer bloque no hecho de la tabla "Próximos bloques" de `docs/ROADMAP.md`** (la única lista de bloques). Hoy: Series de deuda y deuda consolidada (5p, spec lista); después Contar los Compartir (9a), spec pendiente.
2. **Mantenimiento a mano cuando salgan datos nuevos:** herencia (`datos/manual/herencia.json`; nivel de reservas netas del FMI en la 3ª revisión, dic-2026, y saldos de DEG cada mes en `reservas_netas_supuestos.json`); Congreso (cada 1 de marzo, cortes de las dos cámaras y vetos del año); provincias (el III trimestre de la DNAP entra solo: mirar que pase el control).
3. **Pendientes sin fuente o sin decidir:** semáforo (desestacionalizado X-13; CAME, patentamientos, Construya, escrituras, leche, petróleo); gasto (empresas públicas sin fuente; universidades: estudiantes antes de 2023 y las 8 sin datos en el PIU); Congreso (leyes del Ejecutivo de Menem a CFK 1); herencia (cepo de 2003 y 2007, FMI de 1995 a 2002).
4. **Lupa:** el semáforo todavía no está en el buscador (sus indicadores salen de su archivo de datos).
5. **Imagen al compartir que falta:** Gobierno y Congreso, "Lo esperado" y "Viento" en Contexto; Resumen por hitos; alícuotas de provincias. Elecciones ya tiene.

A futuro, sin proponer hasta que el usuario lo pida: bloque 8 (cuentas y comunidad) y 7c-3 (relatos, posts y video), en `docs/ROADMAP.md`.

## Sin verificar (lo que sigue abierto)
- **En general:** tema claro, celular real (Atrás, teclado, safe-area de la barra inferior) y aspecto en capturas de casi todas las páginas: el panel del navegador suele estar oculto y se verifica midiendo.
- **Imágenes compartidas** sin mirar dentro del panel: «¿Cómo viene?» (sin puntos medidos); formatos 1:1/4:5/16:9 de gasto, provincias, universidades y herencia; meses y barras con variación de la ficha; aviso "Sin <presidente>" en la imagen de precios por presidente.
- **Animaciones:** Mes a mes con lápiz, despliegue del parte del Banco Central, carrusel de la portada (con el panel oculto no corren).
- **Datos:**
  - Herencia: "Pasivos remunerados del Banco Central" pasa de 106.150.927 a 233.216 (millones de $ de oct-26, −99,8 %): parece un salto de unidad en la serie, sin revisar.
  - Universidades: lo que declaran en la Cuenta de Inversión 2024 no cierra con lo transferido (la página lo dice).
  - Banco Central: unos cinco días hábiles de atraso en todas las fuentes legibles; falta saber si es lo normal.
  - Precios contra el mundo: "La región" puede quedar con un mes viejo (ropa: dic-23); México corta comunicación, recreación y varios en jul-24; Chile, comunicación y recreación en dic-23; EE.UU. sin oct-25 (cierre del gobierno).
  - Las estimaciones propias de reservas netas dependen de supuestos fijos (swaps 20.000, SEDESA 2.000).

## Avisos y decisiones abiertas
- Para decidir: "12 de 19 datos mejor hoy" en Herencia (¿veredicto?), el color de "compró" y de las tasas en `/bcra/`, el "dólar oficial en pesos de hoy" con color en Herencia.
- Aceptados a propósito: ver "Detalles conocidos y aceptados" en `docs/HISTORIAL.md`.
- Al retirar una serie del catálogo: `gh workflow run actualizar.yml -f aceptar_menos_series=true`.

## Herramientas
- `python pipeline/ver_cache.py <nombre> [--clave …]`: única forma permitida de mirar `datos/cache/`.
- Barridos después de cada tanda: `cd web && npx tsx scripts/barrido-cuentas.ts` y `web/scripts/barrido-navegador.js` (instrucciones en su encabezado; pedir cada ruta con `fetch(ruta, { cache: "reload" })` antes de medir).
- Chequeos de los datos aparte del motor: `npx tsx scripts/chequeo-diario.ts`, `npx tsx scripts/chequeo-semaforo.ts`, `python pipeline/reservas_netas.py --bajar`, `python pipeline/semaforo.py --bajar`.
- Subagentes: Sonnet medio para lo normal, Opus para lo difícil; `investigador-datos` para fuentes. Pendiente: regenerar `DESIGN.md` con el documentador de Impeccable.
