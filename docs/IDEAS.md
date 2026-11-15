# Ideas (backlog sin priorizar)

Notas del usuario, ordenadas por tema. No son specs: antes de implementar cualquiera se pasa por `/spec`.

Solo lo que sigue abierto. Lo hecho (secciones tachadas, ideas con ✅ y la lista "Hecho") está en `docs/IDEAS-HECHAS.md`: al terminar una idea, tacharla con la fecha y moverla allá con su sección.

## Principios (2026-11-08)
- **Mobile first**: la mayoría entra desde el celular.
- Simple para el que quiere ver un dato, configurable al detalle para el que quiere. Que la pantalla no se sature de botones: las opciones avanzadas van escondidas (ej. un botón "Configurar gráfico").
- Lo visual importa ("todo entra por los ojos"): más adelante, una propuesta de diseño distinta.

## Capacidad de gobierno (2026-11-09)
→ spec: docs/specs/capacidad-de-gobierno.md (bloque 6d)
Indicadores de cuánto pudo hacer cada presidente de lo que quería, para juzgar resultados con ese contexto.
- Pendiente, fuera de la spec del 6d: cambios de gabinete, quórum en sesiones clave, años sin Presupuesto aprobado, aliados según votaciones nominales.

## Presidentes y mandato
- Meses de mandato: **animación** que va dibujando la evolución desde el inicio al final, descargable como video. (Animación hecha 2026-11-08; falta el video, bloque 7.)
  (Estas dos → spec: docs/specs/presidentes-ranking-curiosidades.md; el video va con el bloque 7.)

## Ranking de presidentes y curiosidades
→ spec: docs/specs/presidentes-ranking-curiosidades.md (el consumo de carne va con el bloque 6b)
- Sumar datos de consumo (ej. consumo de carne por habitante) si hay fuente.

## Compartir gráficos
→ spec: docs/specs/responder-con-imagen.md (bloque 7a: botón Compartir con imagen, título, texto de contexto automático, marca del sitio) y docs/specs/imagen-presidentes.md (bloque 7b: Por presidente, Ranking y Meses de mandato). Quedan afuera: el pedido de donación, publicar en Comunidad y el video.
- Antes de compartir: "¿Te sirve la información? Podés ayudar donando".
- Opción de publicarlo en la pestaña **Comunidad** con título, comentario y si el dato le parece positivo, negativo o neutro.
- Pensado para compartir en Twitter/X y otras redes.

## Responder y verificar afirmaciones en redes (2026-11-08)
→ spec: docs/specs/responder-con-imagen.md (solo "imagen lista para pegar" y "mejor dato desde…"; sin sello ni cita del tuit). El resto sigue pendiente (bloque 7c).
Uso central: alguien escribe en redes "Milei fundió la economía" y otra persona responde con la página.
- **Link que lleva a la vista justa**: la respuesta apunta a un gráfico o página ya armado con los filtros del caso (ej. el mandato desde T con las variables clave).
- **Modo "Contestar un relato"** (en el inicio o sección propia): se escribe la frase ("la ley X destruyó el salario") y la página arma la info para responderla. La imagen sale así:
  - Arriba, la cita del comentario original (con usuario y red social, opcional).
  - Abajo, los datos que lo contrastan.
  - Al final, un **sello**: verdadero / falso / neutral.
- **Chequear un anuncio oficial**: se pega el tuit de un funcionario ("la economía subió tanto") y la página dice si es cierto y qué tan bueno es el dato: *"mejor dato en X meses / desde tal fecha / de toda la serie"*.
- **Cuenta de X que responde sola** (bot): detecta tweets de funcionarios o cuentas oficiales sobre un dato (ej. Caputo: "la economía creció tanto") y responde con la imagen y el link. Ver "Sugerencias de Claude" por límites y riesgos.
- **Posts automáticos de datos fijos** (empezar por acá): el BCRA publica todos los días a la tarde compras de divisas, reservas y tasas. La página publica o responde con el dato verificado y su contexto histórico ("mayores compras desde…").
- **Todo configurable**: elegir qué mostrar o no (evolución por meses de mandato, si es el mejor dato de tanto tiempo, comparación contra la proyección, etc.).

## Contar los Compartir y preguntar por qué (2026-11-15)
- Contar cada vez que alguien aprieta "Compartir" en un gráfico (qué dato, qué vista, qué período) para ver qué interesa.
- Después de compartir, una pregunta opcional de un toque: por qué lo comparte (lo considero bueno, malo, que mejoró, que empeoró, curiosidad, neutral…).
- Opinión de Claude (2026-11-15): es la forma más barata de tener backend (un Worker y una base D1 de Cloudflare, gratis) y deja armada la base para las predicciones del bloque 9. Orden sugerido: esto → novedades y calendario (estáticos) → predicciones → comunidad (bloque 8) solo si el sitio tiene tráfico.

## Comunidad
(A futuro, sin recomendar: bloque 8 sacado del plan el 2026-11-15; el debate ya se da en X.)
- Registro anónimo.
- Posts con votos a favor y en contra (se ven las dos cantidades) y comentarios. Al publicar se marca si el dato es positivo, negativo o neutro.
  Ej.: alguien filtra el período de Milei, muestra cómo evolucionó el dólar y comenta.
- Se puede responder un comentario **con otro dato** (otro gráfico), y gana el que tenga más votos.
  Ej.: "le fue re mal a la economía tal año" → le responden "pero bajó la inflación".
- Si un comentario tiene más votos que el post, es un **ratio**.
- Rankings: lo más debatido del mes y de la historia, ranking de ratios, lo más votado en contra, etc.

## Novedades, calendario y predicciones
- Sección con los datos nuevos que van entrando, para que la gente opine.
- Calendario de próximas publicaciones con fecha (INDEC tiene calendario; para el resto, el día promedio en que suele salir).
- La gente deja su predicción (ej. inflación de noviembre) y la página muestra la **mediana** (un valor absurdo no la mueve). Limitar valores imposibles (ej. 1.000.000% de inflación).

## Precios en términos de salarios
- Ver índices de precios medidos en salarios: cuántos bienes / servicios se compran con un salario, etc.
  (→ spec: docs/specs/plantillas-y-vistas.md, como plantillas "cuánto compra un salario"; los índices del IPC medidos en salarios quedan pendientes.)
- Galería pública de plantillas hechas por la gente (cuando haya cuentas).

## Dato del día con agentes que navegan (2026-11-12)
- Para el parte del Banco Central: las fuentes legibles por un programa traen reservas y compras con unos cinco días hábiles de demora (ver `docs/specs/parte-diario-bcra.md`). Idea del usuario, para más adelante: programar agentes que naveguen y busquen el dato del día por su cuenta (comunicado y redes del BCRA, medios), a la hora en que se publica. A definir: cómo se marca un dato tomado así (no es la serie oficial), cómo se verifica y qué pasa cuando llega el dato oficial.

## Gasto e impuestos de las provincias y la Nación (2026-11-12)
→ specs: docs/specs/gasto-nacion.md (Nación por partida y por entidad, con universidades; hecha, ver "Hecho") y docs/specs/provincias.md (bloqueada en parte: el sitio de la DNAP no carga).
Idea del usuario. Agregado el mismo día: ~~ver el presupuesto de cada entidad pública (por ejemplo en qué gastan las universidades) y aclarar si lo tienen sin rendir~~ ✅ 2026-11-13 (lo que se puede: ver "Hecho").
- Un ranking de provincias. (Lo que se puede hoy, el gasto de la Nación en cada provincia por habitante: ✅ 2026-11-13, `/provincias/`, fase 1 de docs/specs/provincias.md; el ranking de las cuentas de cada provincia sigue bloqueado.)
- A resolver: fuentes (Presupuesto Abierto para la Nación; ejecución presupuestaria y recaudación provincial por tributo de la Dirección Nacional de Asuntos Provinciales; leyes impositivas de cada provincia para alícuotas y exenciones); cómo comparar (por habitante, como % del producto de la provincia, en pesos de hoy); el sitio hoy no tiene datos por provincia salvo el IPC por región: es un bloque nuevo, con su propio archivo de datos como el parte del BCRA. Comparar alícuotas con exenciones es mucho más difícil que comparar recaudación.

## Sugerencias de Claude (a discutir)
- Comparación internacional, fuentes a investigar (con `investigador-datos`): IPC por división COICOP de EE.UU. (BLS), Eurostat (HICP por categoría) y OECD; el Banco Mundial y el FMI para PBI y otras variables. Los vecinos (Brasil, Chile, Uruguay, Paraguay, Bolivia) a veces solo tienen el IPC general desde fuentes unificadas, así que la comparación por categoría puede quedar limitada. Las divisiones COICOP no son idénticas entre países, y para comparar **niveles** de precios (no solo variaciones) hacen falta paridad de poder adquisitivo o tipo de cambio real. Mostrar siempre en base 100 o en variación para no comparar manzanas con naranjas.
- Capacidad de gobierno, fuentes: HCDN y Senado publican composición de bloques y leyes; Boletín Oficial para decretos y vetos. La parte difícil es "propios y aliados" (los bloques cambian y hay criterio de por medio): definir una regla clara y publicarla. "Leyes que quiso sacar" tampoco sale de una base: hay que definir qué cuenta (proyectos del Ejecutivo ingresados, por ejemplo) y es mejor mostrar el número crudo antes que un puntaje.
- Para que sea justo, las dos comparaciones (internacional y capacidad de gobierno) se muestran para todos los presidentes con el mismo criterio.
- Moderación desde el día 1 si hay comentarios públicos: reportar, ocultar con X reportes, límite de posts por usuario/día.
- Que cada post de la comunidad guarde los filtros exactos del gráfico, así cualquiera lo abre y lo puede modificar.
- Proyecciones: el FMI publica las ediciones viejas del World Economic Outlook (abril y octubre de cada año), así que se puede reconstruir "qué se esperaba" para cada año y país sin depender de recortes de diarios.
- Configuración global guardada primero en el navegador (sin cuentas); cuando haya cuentas, se sincroniza.
- Verificador, por etapas (de más fácil a más difícil):
  1. "Es el mejor dato desde X" y la imagen compartible: es cálculo puro sobre las series que ya hay, sin IA ni servidor.
  2. Plantillas de relatos frecuentes ("fundió la economía", "el salario cayó", "la inflación…") que mapean a un conjunto fijo de indicadores. Se elige el relato de una lista.
  3. Frase libre: requiere interpretar el texto (IA) y un backend. Es lo caro y lo riesgoso; dejarlo para el final.
- El sello **verdadero/falso** funciona para afirmaciones medibles ("el salario real cayó") pero no para opiniones ("fundió la economía"). Para esas, mejor "Los datos muestran…" / "No concluyente", y siempre con el criterio visible (qué indicador, qué período, contra qué se compara). La credibilidad es lo más valioso del sitio.
- Que funcione igual para cualquier presidente y para afirmaciones a favor y en contra; si se ve como herramienta de un solo lado, pierde valor como fuente.
- Con el sitio estático hay que generar las imágenes de forma estática (plantillas prearmadas) o en el cliente (canvas); las dinámicas necesitan backend. Las vistas previas de links en X (og:image) son 16:9 aprox., así que la imagen horizontal sirve también como preview del link.
- Bot en X:
  - Responder solo a cuentas, y automáticamente, choca con las reglas de X: la API de pago tiene costo, y las respuestas automáticas no pedidas a terceros se consideran spam y pueden suspender la cuenta. Verificar las condiciones vigentes antes de diseñar nada.
  - Más seguro: que **publique en su propia cuenta** datos recurrentes (el BCRA, el IPC cuando sale) y que las respuestas a tweets ajenos las dispare una persona con un clic ("Responder con esto"), o por mención (@cuenta + tweet).
  - Los datos del BCRA diarios ya tienen fuente conocida; sumar compras de divisas y reservas como series nuevas (skill `nueva-serie`, agente `investigador-datos`) es el primer paso, y sirve también para el sitio.
  - Un bot que publica solo necesita un proceso programado (el workflow de GitHub Actions de actualización diaria podría disparar el post). Verlo con la spec `actualizacion-diaria`.
- Las plantillas pueden ser la base de todo: la búsqueda guiada, la página de inicio y "otros gráficos interesantes" muestran plantillas.

## Series de deuda y deuda consolidada (2026-11-15)
→ spec: docs/specs/series-deuda.md
- «no tenemos series para ver la evolución de las variables esas que están en herencia?» y «deuda consolidada»: la suma de los pasivos del Banco Central y los del Tesoro.
