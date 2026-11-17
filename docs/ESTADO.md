# Estado del proyecto

Para retomar en una sesión nueva. Última actualización: 2026-11-16.

**Reglas de este archivo:** máximo ~1 página. Las ideas abiertas están en `docs/IDEAS.md`; las hechas, en `docs/IDEAS-HECHAS.md`. Una línea por bloque, con link a su spec; el detalle (cómo se verificó, qué marcó el revisor, medidas) va a la spec, no acá. Al cerrar una tanda: agregar su línea, sacar de "Sin verificar" lo que se verificó y, si una sección crece, mover lo viejo a `docs/HISTORIAL.md`.

## Dónde estamos
Publicado en https://primerolosdatos.com.ar: herramienta para responder en redes con una imagen, con datos oficiales. Plan y bloques en `docs/ROADMAP.md`; detalle de todo lo anterior al 2026-11-15 en `docs/HISTORIAL.md`.

Últimos bloques (todos publicados, corrida en verde):
- Cantidades enteras sin decimal («200» femicidios, no «200,0»): `entero` en cada cálculo del motor (todos sus valores enteros; 30 series) y `fmtCant` en valores, diferencias y ejes; promedios y medianas conservan su decimal — 2026-11-17, c4b76b4 (corrida en verde, run 44067698585)
- Imagen al compartir en Lo esperado, Viento, Resumen por hitos, Congreso y alícuotas de Ingresos Brutos; semáforo en la lupa; subpestañas legibles en tema claro — 2026-11-16, 3ba7993 (corrida en verde, run 43966469194) — [spec](specs/imagenes-y-lupa.md)
- Tanda 14: el valor de una barra al pasar el mouse o tocarla (R32) en Resumen por hitos, Congreso año por año y Gasto por mes — 2026-11-16, 3ba7993 (corrida en verde, run 43966469194) — [spec](specs/ajustes-tanda-14.md)
- Tanda 13 (Novedades): pestañas Novedades / Calendario, grilla chica con resumen del día (panel en PC, ventana en el celular), días desplegables, series en caja deslizable, Agendar (Google Calendar e .ics); compartir un dato suma mes anterior y hace un año (texto e imagen; reglas R30 y R31) — 2026-11-16, fe1b069 (corrida en verde, run 43956106566) — [spec](specs/ajustes-tanda-13.md)
- Predicciones (9c): `/predicciones/` con la inflación del mes, mediana de la gente después de predecir, REM del Banco Central e historia; funciones `/api/prediccion(es)` con Turnstile — 2026-11-16, bb22f77 (corrida completa en verde, run 43939206761; la página y el REM están publicados, `/api/predicciones` responde 503 hasta crear la base) — [spec](specs/predicciones.md)
- Novedades y calendario (9b): `/novedades/` con lo que salió (cifra, cambio, contexto, Compartir) y el calendario del INDEC, bloque en la portada; registro `datos/novedades.json` (D-026) — 2026-11-16, 24d0366 (corrida completa en verde, run 43931777809; el registro se lee y se guarda en el commit de datos) — [spec](specs/novedades-calendario.md)
- Contar los Compartir (9a): función de Pages + D1, tira «¿Por qué lo compartís?» que se apaga en Configuración, `npm run conteos` — 2026-11-16, 26eec12 (corrida completa en verde, run 43913974906; publicado sin la base: `/api/compartir` responde 503 hasta crearla) — [spec](specs/contar-compartir.md)
- Subsidios al transporte, transferencias no automáticas a provincias, patentamientos y autos usados, demanda eléctrica, becas, seguro de desempleo, gasto nacional por función (% del PIB), siniestros viales y femicidios (a mano, Corte Suprema): 17 series; además «1 resultado» en el buscador — 2026-11-16, 438ea3c (corrida completa en verde, run 43896968685) — [spec](specs/datos-calientes-2.md)
- Recaudación por impuesto, homicidios, mortalidad infantil, presos, empleo público nacional, turismo e importaciones de consumo: 20 series y tema «Seguridad y salud»; además, las series anuales dicen el año («2025») en vez de «dic-25» en todo el sitio — 2026-11-16, 9da1c52 (corrida completa en verde, run 43873660350) — [spec](specs/datos-sociedad-recaudacion.md)
- AUH, Tarjeta Alimentar, cobertura de la canasta (cuenta de Capital Humano y de la UCA) y pensiones por invalidez: 11 series; además, enteros exactos en los JSON, fuente de las dos series cuando un dato se mide en otro y cierre de mandato en series anuales — 2026-11-16, 1c926a3 (corrida completa en verde, run 43857957032) — [spec](specs/auh-pensiones.md)
- Revisión de 931167d y 91aec1b (sin bugs graves): cuasifiscal sin «LEFI» en el nombre (la variable 55 solo tiene pases y LELIQ; el 0,0 % desde ago-24 es correcto), deuda / PIB sin «fin de año», celda vacía de adelantos no borra el mes de la consolidada — 2026-11-16, 5eaf7e0
- Tanda 12: el dato actual primero (Cambiar dato, Ajustes con una sección «Variables»), moneda y escala en desplegables, títulos de ventanas junto a la cruz, arreglo de las ventanas que no guardaban lo elegido al cerrarse, consolidada y cuasifiscal en Cuentas públicas — 2026-11-15, 91aec1b — [spec](specs/ajustes-tanda-12.md)
- Series de deuda (Finanzas, mensual desde 2019) y deuda consolidada Tesoro + Banco Central (cuenta propia, D-024) — 2026-11-15, 931167d — [spec](specs/series-deuda.md)
- Tanda 11: Congreso en columnas con «Leyes por apoyo»; resaltar un país (y su imagen) en Otros países y «¿Cómo viene?» — 2026-11-15, 4c80be2 — [spec](specs/ajustes-tanda-11.md)
- Tanda 10: la lupa encuentra Herencia y el parte del Banco Central; selector de Herencia agrupado — 2026-11-15, b296c75 — [spec](specs/ajustes-tanda-10.md)
- EE.UU. (BLS) y Chile (INE) en precios contra el mundo, productos de EE.UU. desde el BLS y aviso de presidente sin dato — 2026-11-15, 4078c3e — [spec](specs/precios-mundo-bls-ine.md)
- Chips compactos en todo el sitio (R24) y cierre de Contexto — 2026-11-15, 63d1e40 — [spec](specs/chips-compactos.md)
- Contexto: "El mundo y la Argentina" con subpestañas y barras — 2026-11-15 — [spec](specs/remodelacion-contexto-precios.md)
- Tandas de ajustes 7, 8 y 9 — 2026-11-14/15 — [7](specs/ajustes-tanda-7.md), [8](specs/ajustes-tanda-8.md), [9](specs/ajustes-tanda-9.md)
- Remodelación de UX/UI, etapas 1 a 3.5 y cierre (crítica de Impeccable 21 → 26/40) — 2026-11-13/14 — [sistema](specs/remodelacion-sistema.md), [cierre](specs/remodelacion-cierre.md)
- Mantenimiento del pipeline (`pipeline/red.py`) — 2026-11-14 — [spec](specs/mantenimiento-pipeline.md)

## Qué sigue, en orden
1. **Base D1 y Turnstile: hechos** (2026-11-16, c6aa266; corrida en verde, run 43958334535). Probado en producción el 2026-11-16: hay una predicción real guardada con Turnstile (ipc-2026-11, 1,5 %, desde un celular) y un Compartir de prueba (`link_copiado` en `/dato/inflacion-mensual/`, con «¿Por qué?» = curiosidad) entró a la base; `npm run conteos` arreglado (corría `npx` por shell sin comillas y la consulta se cortaba; ahora llama a wrangler con node). Publicado en 562ce5b (corrida en verde, run 43960555035), con la explicación de la caída real de pasivos remunerados en el ⓘ de Herencia. El paso «crear proyecto» falla sin efecto porque el proyecto ya existe (`continue-on-error`). La tabla "Próximos bloques" de `docs/ROADMAP.md` quedó toda hecha: lo que sigue sale de esta lista o de un pedido nuevo. De la spec de deuda queda opcional la fase 3 (tarifa eléctrica de CAMMESA).
2. **Datos nuevos «calientes»:** hechos AUH y pensiones, recaudación / seguridad / empleo público y la segunda investigación ([spec](specs/datos-calientes-2.md)). Quedan afuera robos (la serie oficial termina en 2022), obra pública por inciso, motos, mayoristas y vacunas.
3. **Mantenimiento a mano cuando salgan datos nuevos:** herencia (`datos/manual/herencia.json`; nivel de reservas netas del FMI en la 3ª revisión, dic-2026, y saldos de DEG cada mes en `reservas_netas_supuestos.json`); Congreso (cada 1 de marzo, cortes de las dos cámaras y vetos del año); provincias (el III trimestre de la DNAP entra solo: mirar que pase el control).
4. **Pendientes sin fuente o sin decidir:** semáforo (desestacionalizado X-13; CAME, patentamientos, Construya, escrituras, leche, petróleo); gasto (empresas públicas sin fuente; universidades: estudiantes antes de 2023 y las 8 sin datos en el PIU); Congreso (leyes del Ejecutivo de Menem a CFK 1); herencia (cepo de 2003 y 2007, FMI de 1995 a 2002).

A futuro, sin proponer hasta que el usuario lo pida: bloque 8 (cuentas y comunidad) y 7c-3 (relatos, posts y video), en `docs/ROADMAP.md`.

## Sin verificar (lo que sigue abierto)
- **Predicciones:** Turnstile con un token fallido, el primer cierre real (15 de diciembre) y el paso a «resultado» cuando entre el dato.
- **Tanda 13:** un .ics abierto en un calendario real; la imagen 4:5 con las comparaciones; el foco del teclado al abrir y cerrar ventanas (`Modal` no lo mueve, en todo el sitio).
- **Novedades:** el bloque de la portada (no se vio: panel oculto), las fechas estimadas (aparecen cuando cada fuente tenga dos meses registrados, hacia enero) y la primera entrada nueva del registro en una corrida (la del push dio 0, sin datos nuevos).
- **Conteos:** el botón de Compartir real hasta la base (se probó el pedido al servidor, no el clic: el portapapeles falla con el panel oculto) y la pregunta con el menú de compartir de un celular real.
- **En general:** celular real (Atrás, teclado, safe-area de la barra inferior) y aspecto en capturas de casi todas las páginas: el panel del navegador suele estar oculto y se verifica midiendo. Tema claro y 375 px medidos en ocho rutas el 2026-11-16 (sin desborde; contraste arreglado en las subpestañas).
- **Imágenes nuevas** (Lo esperado, Viento, hitos, Congreso, Ingresos Brutos): textos verificados, aspecto sin mirar en captura.
- **Imágenes compartidas** sin mirar dentro del panel: «¿Cómo viene?» (sin puntos medidos); formatos 1:1/4:5/16:9 de gasto, provincias, universidades y herencia; meses y barras con variación de la ficha; aviso "Sin <presidente>" en la imagen de precios por presidente.
- **Animaciones:** Mes a mes con lápiz, despliegue del parte del Banco Central, carrusel de la portada (con el panel oculto no corren).
- **Datos:**
  - Universidades: lo que declaran en la Cuenta de Inversión 2024 no cierra con lo transferido (la página lo dice).
  - Banco Central: unos cinco días hábiles de atraso en todas las fuentes legibles; falta saber si es lo normal.
  - Precios contra el mundo: "La región" puede quedar con un mes viejo (ropa: dic-23); México corta comunicación, recreación y varios en jul-24; Chile, comunicación y recreación en dic-23; EE.UU. sin oct-25 (cierre del gobierno).
  - Deuda: el % del PIB de la web (dólar promedio, PIB de 12 meses) difiere unas décimas del de Finanzas (lo dice la ficha); imagen para compartir de las fichas nuevas sin mirar.
  - Femicidios 2018 y 2020 salen del gráfico del informe 2025 (sin frase textual).
  - Las estimaciones propias de reservas netas dependen de supuestos fijos (swaps 20.000, SEDESA 2.000).

## Avisos y decisiones abiertas
- Para decidir: "12 de 19 datos mejor hoy" en Herencia (¿veredicto?), el color de "compró" y de las tasas en `/bcra/`, el "dólar oficial en pesos de hoy" con color en Herencia.
- Aceptados a propósito: ver "Detalles conocidos y aceptados" en `docs/HISTORIAL.md`.
- Al retirar una serie del catálogo: `gh workflow run actualizar.yml -f aceptar_menos_series=true`.

## Herramientas
- Conteos de compartir: `cd web && npm run conteos` (necesita `wrangler login`); local con funciones y D1: vista `web-funciones` (`npm run funciones`, puerto 8788).
- `python pipeline/ver_cache.py <nombre> [--clave …]`: única forma permitida de mirar `datos/cache/`.
- Barridos después de cada tanda: `cd web && npx tsx scripts/barrido-cuentas.ts` y `web/scripts/barrido-navegador.js` (instrucciones en su encabezado; pedir cada ruta con `fetch(ruta, { cache: "reload" })` antes de medir).
- Chequeos de los datos aparte del motor: `npx tsx scripts/chequeo-diario.ts`, `npx tsx scripts/chequeo-semaforo.ts`, `python pipeline/reservas_netas.py --bajar`, `python pipeline/semaforo.py --bajar`.
- Subagentes: Sonnet medio para lo normal, Opus para lo difícil; `investigador-datos` para fuentes. Pendiente: regenerar `DESIGN.md` con el documentador de Impeccable.
