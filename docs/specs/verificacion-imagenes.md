# Tanda de verificación: imágenes compartidas, Novedades y animaciones

Estado: implementada y publicada (2026-11-17, 29dbd1f; corrida en verde, run 44147580068)

Sale de `docs/ESTADO.md` («Sin verificar») y del pedido del usuario del 2026-11-17: «Tanda de verificación». Se miraron en captura las imágenes que nunca se habían visto. Cada imagen se sacó del lienzo con `toDataURL`, así que se ve aunque el panel del navegador esté oculto. También se miraron el bloque de Novedades de la portada y las animaciones. Lo que estaba mal se corrigió con una regla general, no solo en el caso encontrado.

## Reglas generales
- **La leyenda dice cómo se pinta.** Si la frase dice «verde: pasó más de lo esperado», el color sale del signo, no de la mitad de la columna.
- **Toda imagen dice «Fuente:» antes de la fuente**, aunque quien la arma pase solo el nombre (`lib/imagen.ts`, `conFuente`).
- **Si la frase nombra una referencia, el dibujo la muestra.** En el lienzo `barras` se agrega un `ref` opcional: una línea punteada con su nombre arriba.
- **Un número sin unidad no se entiende.** La imagen dice la unidad y, con «mismo punto de partida», desde qué valor arrancan todos.
- **Un nombre no se corta con «…»**, sobre todo si dos filas quedarían iguales: en la imagen se usa un nombre corto (`img`).
- **Nada de dos paréntesis seguidos** en el título de una variable: el último pasa a ir después de una coma.

## Qué se cambia
1. **Lo esperado y lo que pasó** (`components/secciones/Contexto.tsx`): el verde y el rojo de la sorpresa salen del signo (sin color si se lee «0,0»), en la pantalla y en la imagen. Antes salían de la mitad de la columna: había celdas «0,0» en rojo, aunque la leyenda dice «rojo: pasó menos». La intensidad sigue siendo la distancia al mayor de la columna. La leyenda pasa a decir «Más intenso: más lejos de lo esperado».
2. **Resumen por hitos** (`lib/imagen-hitos.ts`): el pie dice la unidad del dato (como la imagen del gráfico de Meses de mandato). Con «mismo punto de partida», la nota dice «todos arrancan desde 955,0 (el mes 0 de Milei, nov-23)». Antes decía solo «mismo punto de partida», en minúscula y sin unidad.
3. **Congreso** (`lib/capacidad.ts`, `lib/imagen.ts`): la línea del 50 % = mayoría está dibujada sobre las barras. Antes la frase la nombraba y el dibujo no la tenía. La fuente arranca con «Fuente: Informes…».
4. **Ingresos Brutos** (`lib/provinciasAlicuotas.ts`): línea del tope del Consenso Fiscal sobre las barras. El renglón de abajo se rotula «Sin una sola cifra: Tierra del Fuego (0,25% + 1,25% FFSS)»; antes decía «Sin datos», aunque el dato existe. Si a una provincia le falta la alícuota, sigue diciendo «Sin datos». La frase dice «industria manufacturera» en minúscula; antes decía «industria Manufacturera».
5. **Barras en general** (`lib/imagen.ts`): alto máximo de fila de 100 a 150 px, para que el formato vertical con pocas filas (Gasto: 5) no deje media imagen vacía. Los nombres de una misma imagen van todos del mismo tamaño (`tamComun`, mínimo 0,8 del normal); antes, cada nombre largo se achicaba solo.
6. **Herencia** (`lib/herencia.ts`, `lib/herencia-informes.ts`, `lib/imagen-presidentes.ts`): campo `img` con un nombre corto (hasta unos 29 caracteres) para las 19 filas con nombre largo. Antes, «Reservas netas, estimación propia con el…» salía igual en dos filas, y en el formato horizontal se cortaban unas diez. La página no cambia: el nombre largo sigue en la tabla.
7. **Títulos de variables** (`lib/imagen-datos.ts`, `tituloVariable`): «Salario promedio de empleos estables (RIPTE), pesos de hoy» y «Deuda pública bruta (Administración Central), % del PIB», en Novedades (portada y página) y en las imágenes que usan ese título.

## Lo que no cambia
- Ningún parámetro de URL ni link compartido cambia de significado.
- Los valores y los cálculos son los mismos: solo cambian textos, colores de «Lo esperado» y el dibujo de las imágenes.

## Cómo se verifica
- `npm run tipos` y `npm run build` sin error.
- En `web-out`, cada imagen abierta y mirada en captura (la imagen del lienzo en grande): Lo esperado (1:1 y 16:9), Viento, Resumen por hitos, Congreso, Ingresos Brutos, Gasto (1:1, 4:5 y 16:9), Provincias (4:5 y 16:9), Universidades (4:5) y Herencia (4:5 y 16:9).
- Novedades: los títulos leídos en `/novedades/` y en la portada.

### Resultado (2026-11-17)
- Verificado en captura: todo lo de «Qué se cambia» (1 a 7) y el bloque de Novedades de la portada (antes nunca visto).
- Sin cambios necesarios: Viento, Provincias (con 24 filas, el horizontal va en dos columnas), Universidades (el total en «millones» es a propósito: en «billones» la fila más chica se leería «$ 0,07 billones»).
- **Sin verificar:** las animaciones (carrusel de la portada, despliegue del parte del Banco Central, «Mes a mes» con lápiz). Con el panel del navegador oculto no corren ni el `IntersectionObserver` ni las animaciones CSS: se comprobó que el observador no responde ni con una prueba aparte, así que no es un error del sitio. En el celular (táctil), el carrusel no avanza solo por diseño (R5).

## Dónde ver los cambios
Local: `http://localhost:3100<ruta>` (vista `web-out`). Publicado: `https://primerolosdatos.com.ar<ruta>`, después del commit, el push y la corrida en verde. Página: `docs/cambios/verificacion-imagenes.html`.

1. Portada
   - 1.1 Novedades sin dos paréntesis seguidos — `/#novedades`. Agregado por mí: lo vi al mirar el bloque en la verificación.
2. Presidentes
   - 2.1 Resumen por hitos → Compartir → Imagen: unidad y punto de partida — `/mandato/#mand-hitos`. Agregado por mí: «955,0» no decía qué era.
   - 2.2 Congreso → Compartir → Imagen: línea del 50 % y «Fuente:» — `/congreso/#congreso`. Agregado por mí: la frase nombraba una línea que no estaba.
   - 2.3 Herencia → Compartir → Imagen: nombres enteros (vertical y horizontal) — `/herencia/`. Agregado por mí: dos filas salían iguales.
3. El mundo y la Argentina
   - 3.1 Lo esperado: verde y rojo según el signo, en la tabla y en la imagen — `/contexto/esperado/#esperado`. Agregado por mí: había «0,0» en rojo.
4. Gasto
   - 4.1 Imagen vertical sin vacío y nombres del mismo tamaño — `/gasto/` → Compartir → Imagen → Vertical 4:5. Agregado por mí: regla general de las barras.
5. Provincias
   - 5.1 Ingresos Brutos → Compartir → Imagen: línea del tope, «Sin una sola cifra», «industria manufacturera» — `/provincias/?vista=cuentas#pc-ib`. Agregado por mí.
6. Novedades
   - 6.1 Títulos sin dos paréntesis seguidos — `/novedades/`. Agregado por mí: el mismo caso que 1.1.
