# Hoja de ruta

Cómo se trabaja: idea en `docs/IDEAS.md` → spec en `docs/specs/` (sesión de specs) → implementación en una sesión nueva → se tacha la idea. Cuando alguien pregunta "¿qué sigue?", se toma el primer bloque de la tabla de abajo que no esté hecho.

## Hecho

| Fase | Qué | Estado |
|---|---|---|
| 0 | Ordenar proyecto, git, config de Claude | Hecho (2026-11-07) |
| 1 | Stack decidido (D-001); subir a GitHub, publicar en Cloudflare, pipeline automático diario (ver detalle abajo) | Hecho (2026-11-08) |
| 2 | Migrar el frontend a Next.js sin perder funciones | Hecho (2026-11-08), con dominio propio https://primerolosdatos.com.ar |

## Próximos bloques, en orden (2026-11-08)

Del 1 al 5 no necesitan backend ni datos nuevos: se pueden ir publicando de a uno. El cambio de diseño visual (5e) va antes del 7, para que lo que se comparta en redes ya tenga el diseño nuevo. Los números con letra (5b, 5c…) se agregaron después y van en el orden de la tabla.

| # | Bloque | Ideas (secciones de IDEAS.md) | Backend | Estado |
|---|---|---|---|---|
| 1 | Histórico en el celular | Histórico: celular y gráficos | No | Hecho (2026-11-08) — [spec](specs/historico-celular.md) |
| 2 | Medidas y opciones más simples | Histórico: medidas y opciones (las primeras seis) | No | Hecho (2026-11-08) — [spec](specs/medidas-y-opciones.md) |
| 3 | Configuración global | Presidentes y mandato: inicio de mandato por presidente (T±N), preferencias guardadas en el navegador, afecta a todas las secciones | No | Hecho (2026-11-08) — [spec](specs/configuracion-global.md) |
| 4 | Plantillas y vistas | Plantillas con buscador por palabra, hasta 4 gráficos por vista, "Otros gráficos interesantes", Curiosidades pasa a plantillas, precios medidos en salarios | No | Hecho (2026-11-08) — [spec](specs/plantillas-y-vistas.md) |
| 5 | Inicio y búsqueda guiada | Inicio y búsqueda guiada: página de inicio, elegir tema → principales → subgrupos, página por tema, oración guiada | Sí | Hecho (2026-11-08) — [spec](specs/inicio-y-temas.md) |
| 6a | Ranking, curiosidades y voto estimado | Ranking de presidentes y curiosidades; Elecciones (voto estimado); vista de un presidente con variables elegidas; animación del mandato (sin video) | No | Hecho (2026-11-08) — [spec](specs/presidentes-ranking-curiosidades.md) |
| 5b | Correcciones del Histórico | Correcciones pedidas (2026-11-09): sacar "Otros gráficos interesantes" (pasan a variables y plantillas), hasta 4 gráficos uno al lado del otro | No | Hecho (2026-11-09) — [spec](specs/correcciones-historico.md) |
| 6b | Contexto internacional | Contexto para juzgar a un presidente (proyecciones del FMI, vecinos); Comparación internacional: PBI y otras variables del FMI, base 100 desde 2000; consumo de carne | No (datos nuevos en el pipeline) | Hecho 2026-11-09 (sin consumo de carne ni proyecciones de abril posteriores a 2022) — [spec](specs/contexto-internacional.md) |
| 6c | Precios por categoría contra otros países | Comparación internacional: nivel en dólares de cada rubro del IPC contra el mundo y otros países (Banco Mundial ICP + estimación) | No (datos nuevos: BLS, Eurostat, institutos de los vecinos) | Hecho (2026-11-09) — [spec](specs/precios-en-el-mundo.md) |
| 5c | Ajustes del Histórico | Ajustes de interfaz pedidos (2026-11-09): Histórico (ventana "Configurar variable", leyenda con resaltado, zoom con escala y líneas recalculadas, barra de período fija solo con varios gráficos, cierre al agrupar, precios contra salario) y Presidentes en la línea de tiempo (franjas de color por presidente, colores en la configuración global) | No | Hecho (2026-11-09) — [spec](specs/ajustes-historico.md) |
| 5d | Ajustes de Presidentes, Ranking, Mandato y Elecciones | Ajustes de interfaz pedidos (2026-11-09): variación absoluta, dos detalles abiertos a la vez, "lo mejor y lo peor" y el ranking pasan de Curiosidades a Ranking, precio teórico y mes 0 integrados, escala que acompaña la animación, valor actual en la dispersión, corte de r elegible y proyección ponderada | No | Hecho (2026-11-09) — [spec](specs/ajustes-presidentes.md) |
| 6d | Capacidad de gobierno | Capacidad de gobierno: legisladores propios y aliados, leyes pedidas vs. aprobadas, DNU, vetos | No (datos cargados a mano desde informes de HCDN, Senado y BCN; DNU de Infoleg) | Hecho salvo leyes del Ejecutivo antes de dic-2011 (2026-11-13): bancas y bloques 1989-2026 de las dos cámaras, vetos totales y parciales; código, DNU y leyes desde 2011 del 2026-11-09 — [spec](specs/capacidad-de-gobierno.md) |
| 5e | Diseño visual y portada | Diseño visual y animación (2026-11-09): portada contada al bajar (scrollytelling), tipografías, links como botones o tarjetas, flecha Volver, verde/rojo según bueno/malo, renglones partidos, tarjetas de resumen deslizables | No | Hecho (2026-11-10; crítica 29/40, objetivo 32 pendiente) — [spec](specs/diseno-visual.md) |
| 7a | Responder con una imagen | Compartir gráficos; Responder y verificar afirmaciones (etapa 1: "mejor dato desde X" + imagen): imagen compartible, contexto automático del dato y vista simple del Histórico | No | Hecho (2026-11-10) — [spec](specs/responder-con-imagen.md) |
| 7b | Imagen desde las secciones de presidentes | Compartir gráficos: imagen desde Por presidente (una variable entre presidentes y un presidente con varias variables), Ranking y Meses de mandato | No | Hecho (2026-11-10) — [spec](specs/imagen-presidentes.md) |
| 5f | Ajustes del gráfico y del Histórico (tanda 2) | Ajustes pedidos al recorrer la página (2026-11-10): línea de referencia bajo el cursor, zoom, barra de zoom en el eje X, temporalidad a la vista, Personalizar en tres botones, tarjetas de resumen | No | Hecho (2026-11-10) — [spec](specs/ajustes-grafico.md) |
| 7d | Personalizar la imagen compartible | Ajustes pedidos (2026-11-10): período, líneas y marcadores, presidentes y tarjetas a elección | No | Hecho (2026-11-10) — [spec](specs/personalizar-imagen.md) |
| 5g | Ajustes de tablas, presidentes y temas | Ajustes pedidos (2026-11-10): columna fija, mandato bajo el nombre, mejor y peor sin depender del tono, inicio de mandato en una oración, Congreso con página propia, cabecera de los temas | No | Hecho (2026-11-10) — [spec](specs/ajustes-tablas.md) |
| 5h | Simplificación del sitio | Auditoría 2026-11-10, etapa 3: nombres públicos de las series, inflación como una sola entrada, región como filtro, "Gráficos listos", Ranking con el puntaje relegado, aviso en Elecciones, detalles de lectura | No | Hecho (2026-11-11) — [spec](specs/simplificacion.md) |
| 5i | Ajustes de la tanda 3 | Ajustes pedidos al recorrer la página, tanda 3 (2026-11-11): placas de la portada, cabecera y listas de los temas, resumen del Histórico, copiar tabla, frases elegibles en la imagen, barras y velas en Por presidente, Meses de mandato en tres botones, Elecciones plegada, compartir en Contexto. Además, datos al día: respaldo del IPC cuando la API de INDEC no responde, corridas a las 16:10 y 17:15, filtro de cotizaciones sueltas | No | Hecho (2026-11-11) — [spec](specs/ajustes-tanda-3.md) |
| 5j | Ajustes de la tanda 4 y barrido de errores parecidos | Ajustes pedidos al recorrer la página, tanda 4 (2026-11-11): diez reglas de interfaz, 13 casos y un barrido por código para encontrar errores del mismo tipo | No | Hecho (2026-11-11) — [spec](specs/ajustes-tanda-4.md) |
| 5k | La ficha del dato y ajustes de la tanda 5 | Ajustes pedidos, tanda 5 (2026-11-12): un dato elegido se ve en Histórico, Por presidente y Meses de mandato a la vez (temas, preguntas y ruta propia); comparaciones en la cabecera del Histórico; Personalizar como ventana; teclado, opciones sin efecto y barrido | No | Hecho (2026-11-12) — [spec](specs/ajustes-tanda-5.md) |
| 5l | Ajustes de la tanda 7 | Ajustes pedidos al recorrer la portada (2026-11-14): botones sin caja, placas, buscador de variables, Histórico, ficha, tabla por presidente, temas, Banco Central y Preguntale | No | Hecho (2026-11-14) — [spec](specs/ajustes-tanda-7.md) |
| 5m | Ajustes de la tanda 8 | Ajustes pedidos (2026-11-14): alineación, Compartir en un solo lugar, píldoras, ficha, presidentes, Banco Central, herencia fiscal, Ranking, Elecciones y Contexto | No | Hecho (2026-11-15) — [spec](specs/ajustes-tanda-8.md) |
| 5n | Ajustes de la tanda 9 | Ajustes pedidos (2026-11-15): cabecera del dato sin vacío, Cómo verlo en la ficha, línea del cero, frases sin contradicción, Compartir (resaltar, grilla, armá el tuyo), un solo Ajustes por capítulo, herencia, Ranking, Elecciones, Banco Central, menús con íconos. Contexto internacional queda para una propuesta de remodelación | No | Hecho (2026-11-15) — [spec](specs/ajustes-tanda-9.md) |
| 5o | Ajustes de la tanda 10 | La lupa encuentra los datos de Herencia (deuda pública, FMI, reservas netas, cepo…) y del parte diario del Banco Central; Herencia baja al ancla; selector de Herencia agrupado | No | Hecho (2026-11-15) — [spec](specs/ajustes-tanda-10.md) |
| 5p | Series de deuda y deuda consolidada | Deuda pública bruta, en moneda extranjera y con el FMI como series mensuales (Finanzas, desde 2019); deuda / PIB anual; deuda consolidada Tesoro + Banco Central (cuenta propia) | No | Hecho (2026-11-15), fases 1 y 2 — [spec](specs/series-deuda.md) |
| 5q | Ajustes de la tanda 12 | El dato actual primero en «Cambiar dato» y «Ajustes» con todas sus formas de verlo (moneda, % del PIB, en términos de); consolidada y cuasifiscal en Cuentas públicas | No | Hecho (2026-11-15) — [spec](specs/ajustes-tanda-12.md) |
| 5o | Chips compactos y cierre de Contexto | Chips de 32 px con toque de 44 en todo el sitio (R24, `.chip-c`); links viejos de precios contra el mundo; zona euro al día (Eurostat ECOICOP 2) | No | Hecho (2026-11-15) — [spec](specs/chips-compactos.md) |
| 7c-1 | Vista previa de los links en redes | Página fija por dato (`/dato/<slug>/`) con título con la cifra e imagen generada al publicar; imagen general del sitio; sitemap | No | Hecho (2026-11-12) — [spec](specs/vista-previa-links.md) |
| 7c-2 | Parte diario del Banco Central | Página `/bcra/` con los datos del día (reservas, compra de dólares, dólar, tasas, base y depósitos), su variación y contexto, imagen, texto para copiar y vista previa en redes; primer contenido diario del sitio | No (datos diarios que el pipeline ya bajaba) | Hecho (2026-11-12) — [spec](specs/parte-diario-bcra.md) |
| 10 | Semáforo de actividad | Tabla de 29 indicadores mensuales con su variación (interanual; mes contra mes solo con ajuste oficial), índice de difusión, imagen y vista previa en redes | No (30 series nuevas en el pipeline, archivo aparte) | Hecho (2026-11-12) — [spec](specs/semaforo-actividad.md) |
| 11 | Herencia: recibido contra entregado | Sección en Presidentes: cómo estaba cada variable al asumir y al entregar; fase 1 con series oficiales, fase 2 con datos de informes cargados a mano, fase 3 estimaciones | No (2 series nuevas de datos.gob.ar) | Hecho (2026-11-12): series, datos de informes, reservas netas del FMI y estimación propia — [spec](specs/herencia.md) |
| 12 | En qué gasta la Nación | Gasto nacional por finalidad, organismo, tipo de gasto y provincia, año por año; universidades con lo que hay | No (datos de Presupuesto Abierto, archivo aparte) | Hecho (fases 1 a 3, 2026-11-12 y 2026-11-13); la fase 4 (empresas públicas) queda sin fuente — [spec](specs/gasto-nacion.md) |
| 13 | Provincias | La Nación en cada provincia (fase 1); cuentas de cada provincia y ranking (bloqueado: falta la fuente de la DNAP) | No | Fase 1 hecha (2026-11-13): `/provincias/`, gasto de la Nación en cada provincia por habitante; fase 2 hecha (2026-11-13): `/provincias/?vista=cuentas`, cuentas de cada provincia de la DNAP; fase 3 hecha (2026-11-13): alícuotas teóricas de Ingresos Brutos 2024-2025 en la misma vista; fase 4 hecha (2026-11-13): 2026 acumulado al último trimestre en la misma vista — [spec](specs/provincias.md) |
| 9a | Contar los Compartir | Contar los Compartir y preguntar por qué: cuántas veces se comparte cada dato y vista, pregunta opcional de un toque después de compartir. Worker y D1 de Cloudflare (plan gratis), sin datos personales; si falla, la página sigue igual | Sí (mínimo) | Hecho (2026-11-16), falta crear la base D1 — [spec](specs/contar-compartir.md) |
| 9b | Novedades y calendario | Novedades, calendario y predicciones (primera parte): datos nuevos que van entrando y calendario de próximas publicaciones. Estático, sin backend | No | Spec lista, en curso — [spec](specs/novedades-calendario.md) |
| 9c | Predicciones | Novedades, calendario y predicciones (segunda parte): predicción de la gente con la mediana, contra el REM y el dato real. Usa la base de 9a, con Turnstile contra bots | Sí | Sin spec |

Después de la auditoría del 2026-11-10 ([informe](AUDITORIA-2026-11-10.md)) el bloque 7 pasó a ser la prioridad: es lo que convierte al sitio en una herramienta para responder en redes. El 6d se cargó el 2026-11-13 (faltan solo las leyes del Ejecutivo anteriores a dic-2011, sin fuente con aprobadas).

## A futuro (no recomendar)

Quedan anotados para no olvidarlos, pero no entran en "¿Qué sigue?" ni se proponen hasta que el usuario los pida (decidido el 2026-11-13).

| # | Bloque | Ideas (secciones de IDEAS.md) | Backend | Estado |
|---|---|---|---|---|
| 8 | Cuentas y comunidad | Comunidad: posts, votos, comentarios, ratios, rankings, moderación. Sacado del plan el 2026-11-15: el debate ya se da en X, pide moderación diaria y choca con D-012 (sin veredicto). Retomar solo si 9a y 9c muestran que hay gente que vuelve | Sí | Sin spec |
| 7c-3 | Relatos, posts y video | "Contestar un relato"; posts automáticos en X; video de la animación del mandato. Decisiones abiertas: sello verdadero/falso (choca con D-012), cuenta y clave de la API de X | A definir | Sin spec |

## Pendientes sueltos de las fases 1 y 2
- Opcional: `www.primerolosdatos.com.ar` (CNAME + redirección) y correo con el dominio.
- Reservar `primerolosdatos` en X e Instagram.

(El detalle de las fases 1 y 2, hechas el 2026-11-07/08, está en `docs/HISTORIAL.md`.)
