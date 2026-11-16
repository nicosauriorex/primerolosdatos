# Imagen al compartir en las secciones que no la tienen, y el semáforo en la lupa

Estado: implementada (2026-11-16), sin commitear

Sale de `docs/ESTADO.md` («Qué sigue», puntos 5 y 6) y del pedido del usuario del 2026-11-16: «dale segui con las 3 cosas que no esperan datos». La tercera cosa (verificar celular y tema claro) no lleva código: va en «Cómo se verifica».

## Reglas generales
- **Una sola fuente de verdad:** la imagen lleva los mismos números, textos y colores que la pantalla. Se arma con lo que la sección ya calculó, sin repetir cuentas.
- **El mismo mecanismo que Gasto y Provincias:** el `CompartirHoja` del capítulo recibe `onImagen` y abre `PanelGasto` con una función `armar(formato) => DatosImagen`. Esa función tiene que cambiar de identidad solo cuando cambia lo que se ve (`useCallback`). No se toca `lib/imagen.ts`: se usan los lienzos que ya existen (`grilla` para las tablas por presidente y `barras` para las listas).
- **Palabras neutras (D-012):** la frase de la imagen explica qué significa cada color, sin decir «mejor» o «peor» de un presidente, salvo que la pantalla ya use esas palabras para ese dato.
- **El título dice lo que se ve**, con lo que se eligió en pantalla (dato, grupo de comparación, indicador, actividad y año), y la fuente es la misma que la del texto de compartir de ese capítulo.
- **Sin datos no hay imagen:** si no hay nada que dibujar, `CompartirHoja` no recibe `onImagen`.

## Qué se cambia

### 1. Imágenes para compartir
1. **Lo esperado y lo que pasó** (`/contexto/esperado/`, `components/secciones/Contexto.tsx`, función `Esperado`): imagen de la tabla «Por presidente». Lienzo `grilla`, una fila por presidente (solo los que tienen años), tres columnas (Sorpresa Argentina, Sorpresa <grupo>, Diferencia). Cada celda lleva el texto de la pantalla (`signo(...)`) y el tono de `columnaComparable` (`calor` = su `frac`). Título: «<dato>: lo esperado y lo que pasó, por presidente». La frase explica qué es la sorpresa y qué significa el verde para ese dato.
2. **Viento de cola o de frente** (`/contexto/viento/`, misma página, función `Viento`): imagen de la tabla «Por presidente». Lienzo `grilla` sin `calor` (texto en color), una columna por viento, celda = el promedio del mandato como se ve en pantalla («sin datos» → «—»), tono según la marca (`tonoMarca`). La frase: «Promedio del mandato contra el de toda la serie. Verde: a favor; rojo: en contra», y el aviso de que el contexto favorable no dice si se aprovechó.
3. **Resumen por hitos** (`/mandato/`, `components/secciones/Mandato.tsx`): imagen de la tabla de hitos (Mes 0, 6, 12, 24, 36, 48 y Final) con los mismos colores de la tabla de la pantalla (`calor`). Se dibuja siempre la tabla, aunque en pantalla se vean las barras (lo dice la spec de la tanda 8: si la imagen no soporta la forma elegida, va la tabla). La celda Final dice el mes («mes 31»), así que va en el texto o en el período de la fila. Título: «<dato>: resumen por hitos de cada mandato».
4. **Gobierno y Congreso** (`/congreso/`, `components/secciones/GobiernoCongreso.tsx`): imagen del indicador elegido en las columnas (`ColumnasGobiernos`). Lienzo `barras`, una fila por gobierno con su color de presidente (el `id` de la fila es el del presidente) y el valor y el texto de la pantalla. La frase lleva la nota del indicador y la línea de referencia si existe (50 % = mayoría; 1 = igual a su apoyo). Título: «<indicador> por gobierno». Fuente: «informes oficiales cargados a mano (Diputados, Senado, BCN e Infoleg)».
5. **Alícuotas de Ingresos Brutos** (`/provincias/`, `components/secciones/ProvinciasAlicuotas.tsx`): `CompartirHoja` en el capítulo (hoy no tiene ninguno), con texto (`fraseAlicuotas` y la fuente) e imagen. Lienzo `barras`, una fila por provincia en el orden de la pantalla, con el texto de la alícuota y la diferencia con el tope como segundo renglón. La frase lleva el tope del Consenso Fiscal y que es la alícuota teórica de la ley. Las provincias sin un número van en `sinDatos`. Título: «Ingresos Brutos: <actividad>, <año>».

### 2. El semáforo en la lupa
6. **Indicadores del semáforo en el buscador** (`lib/busqueda.ts`, `components/sistema/Buscador.tsx`): el buscador encuentra los indicadores del semáforo de actividad (`semaforo.json`) por su nombre y su grupo, como las filas del parte diario. Resultado: tipo nuevo `semaforo`, etiqueta «Semáforo», detalle «Semáforo de actividad › <grupo>», link `/semaforo/?v=<clave>` (abre ese indicador). Se listan solo los que no salen ya como variable del catálogo: `id` vacío o que no está en el catálogo. El archivo se baja cuando se abre el buscador (no en cada página) y el buscador anda igual si no carga. `ContextoBusqueda` recibe los indicadores como un campo opcional, así `buscar` sigue siendo una función pura. Tope del grupo: 3. La portada usa el mismo buscador: comprobar que también los encuentra.

## Lo que no cambia
- Ningún parámetro de URL ni link compartido cambia de significado.
- `lib/imagen.ts` y `components/PanelGasto.tsx` no se tocan.
- Los textos de compartir que ya existen quedan iguales.

## Cómo se verifica
1. `cd web && npm run tipos` y `npm run build` sin errores.
2. En la vista `web-out`: abrir cada Compartir → Imagen de los cinco capítulos en los tres formatos (1:1, 4:5 y 16:9). Comprobar que no aparecen errores en la consola y que las cifras de la imagen coinciden con la pantalla (se miden leyendo el `DatosImagen`; el aspecto se mira en una captura si el panel se ve).
3. La lupa: «exportaciones», «construcción», «despachos», «cemento» o el nombre de algún indicador del semáforo sin serie del catálogo trae un resultado «Semáforo» que abre ese indicador. Lo mismo desde el buscador de la portada.
4. Celular y tema claro: la vista `web-out` en 375 × 812 y en tema claro, en la portada, una ficha, `/congreso/`, `/contexto/viento/`, `/mandato/`, `/provincias/` y `/semaforo/`. Comprobar que la página no se desplaza hacia los costados, el contraste del texto y que el buscador abre. Lo que solo se puede ver en un teléfono real (botón Atrás, teclado, safe-area) queda en «Sin verificar».
5. Agente `revisor` contra esta spec.

## Verificación (2026-11-16)
- `npm run tipos` y `npm run build` sin errores.
- Las cinco imágenes, abiertas en el navegador (`web-out`, 375 px): se dibujan sin errores en la consola y los textos que dibujan (leídos interceptando `fillText`) coinciden con la pantalla. Corregido al verificar: en Viento los encabezados se cortaban («CRECIMIENT…» dos veces) y la fuente era la del FMI sola (ahora nombres cortos y `fuentesTxt` con las fuentes de cada serie); en Hitos el mes final salía dos veces; en Lo esperado faltaba «n de N años».
- Lupa: «acero», «faena» y «cemento» traen resultados «Semáforo»; `/semaforo/?v=acero` abre el indicador. La portada usa el mismo buscador.
- Celular y tema claro (375 × 812, ocho rutas, sin transiciones): ninguna página se desplaza de costado. Error encontrado y corregido: `.subtabs` tenía fondo `--surface-2` con texto de barra oscura; en tema claro el contraste era 1,4 (ahora `--barra`). El resto de lo marcado eran falsos positivos de la medición (colores `color-mix` y transiciones a medias con el panel oculto).
- Sin ver: el aspecto de las imágenes en una captura (el panel estaba oculto), la vista a 1280 px y, en un teléfono real, el botón Atrás, el teclado y la barra inferior.
- Revisor: sin problemas graves; tres detalles corregidos (palabras «bueno/malo» en la frase de Hitos, «igual con el tope» → «igual al tope», texto de la fuente de Congreso). Dos aceptados: el `!` de Congreso (protegido por `hay[ind]`) y que el buscador reintenta bajar `semaforo.json` en cada foco si falla.

## Dónde ver los cambios
Local: `http://localhost:3100<ruta>` (vista `web-out`). Publicado: `https://primerolosdatos.com.ar<ruta>`, después del commit, el push y la corrida en verde. Página: `docs/cambios/imagenes-y-lupa.html`.

1. Menús
   - 1.1 Subpestañas legibles en tema claro — `/mandato/` (Configuración → Tema claro, en el celular). Agregado por mí: lo encontré al revisar el tema claro.
   - 1.2 La lupa encuentra los indicadores del semáforo — `/` (buscar «acero»). Pediste: «dale segui con las 3 cosas que no esperan datos».
2. Presidentes
   - 2.1 Resumen por hitos → Compartir → Imagen — `/mandato/#mand-hitos`. Pediste: ídem.
   - 2.2 Congreso → Compartir → Imagen — `/congreso/#congreso`. Pediste: ídem.
3. El mundo y la Argentina
   - 3.1 Lo esperado → Compartir → Imagen — `/contexto/esperado/#esperado`. Pediste: ídem.
   - 3.2 Viento → Compartir → Imagen — `/contexto/viento/#viento`. Pediste: ídem.
4. Provincias
   - 4.1 Ingresos Brutos: Compartir (texto e imagen) — `/provincias/?vista=cuentas#pc-ib`. Pediste: ídem.
