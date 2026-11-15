# Ajustes, tanda 10: la lupa encuentra los datos de Herencia y del parte del Banco Central

Estado: implementada (2026-11-15), sin publicar

Pedido del usuario (2026-11-15), con una captura de la lupa buscando «deuda publica»: «hay datos que capaz están en herencia que no aparecen en la lupa. ponele deuda publica, deuda neta, etc.»

## Regla general

- **R25. Todo dato que se ve en el sitio se encuentra desde la lupa.** Si una página muestra un dato que no es una serie del catálogo (cargado a mano, cuenta propia o archivo aparte), el buscador lo lista con un link que abre ese dato en su página.

## Qué se cambia

1. **Herencia en la lupa** (`web/lib/busqueda.ts`): un grupo nuevo de resultados, etiqueta «Herencia», con
   - las filas cargadas a mano de informes (`FILAS_INFORME`: deuda pública bruta, en % del PIB y en moneda extranjera, deuda y acuerdo con el FMI, cepo, puts, BOPREAL, importaciones pendientes, tarifas, precios acordados, reservas netas del FMI y del Banco Central, cobertura del AMBA) → `/herencia/?vista=traspasos&v=inf.<clave>#traspasos`;
   - las dos estimaciones propias de reservas netas → `/herencia/#her-est` (no tienen vista de traspasos);
   - las cuentas propias de la tabla (pasivos remunerados / base monetaria, resultado fiscal + cuasifiscal) → `/herencia/?vista=traspasos&v=<clave>#traspasos`.
   Las demás filas de la tabla son series del catálogo y ya salían como dato o variable.
2. **Parte diario del Banco Central en la lupa**: las ocho variables de `/bcra/` (compra de dólares, reservas, dólar minorista y mayorista, tasas TAMAR y BADLAR, base monetaria, depósitos), etiqueta «Diario» → `/bcra/?v=<clave>` (la página ya abre la fila). `lib/diario.ts` exporta `nombresDiario()`.
3. **Orden**: datos principales; las filas propias (Herencia y parte diario) con todas las palabras en el nombre, primero las que empiezan con la primera palabra («compras» → compra de dólares antes que el cepo); variables del catálogo; las filas propias que coinciden solo por sinónimos; gráficos listos; temas y secciones. Máximo 4 de Herencia (las cuatro reservas netas entran juntas) y 2 del parte.
4. **Sinónimos** propios de cada fila (por ejemplo «leliq» encuentra pasivos remunerados / base monetaria; «cepo», las restricciones para comprar dólares; «tasa plazo fijo», TAMAR y BADLAR).
5. **Herencia va al ancla después de cargar** (`Herencia.tsx`): un link con `#traspasos` o `#her-est` baja hasta ese bloque cuando existe (antes no existía al cargar la página y quedaba arriba). Reintenta cada 100 ms hasta 3 s.

## Lo que no cambia

- Ningún id ni parámetro de URL cambia de significado.
- «Deuda neta» no existe en el sitio: no hay serie oficial cargada; la lupa no inventa un resultado.
- El semáforo (`/semaforo/`) arma sus indicadores desde su archivo de datos (no hay lista fija en el código): queda fuera de esta tanda.

## Cómo se verifica

- `npm run tipos` y `npm run build` sin errores. ✅
- `buscar()` por consola (`npx tsx`): «deuda publica», «fmi», «reservas netas», «cepo», «leliq», «compras», «tasa plazo fijo», «dolar». ✅
- En la vista local: la lupa de la portada con «deuda publica», «compras», «reservas», «fmi» (leído del DOM; el panel estaba oculto, el aspecto no se vio). ✅
- `/herencia/?vista=traspasos&v=inf.fmi_deuda#traspasos` y `…v=pasivos_base#traspasos`: abre la variable y el bloque queda arriba (64 px, debajo de la barra); `/herencia/#her-est` abre el bloque de estimaciones. ✅

## Dónde ver los cambios (por sección, en el orden del menú)

En local: vista `web-out` (`http://localhost:3100` + la ruta). Publicado: `https://primerolosdatos.com.ar` + la ruta, después del commit, el push y la corrida en verde.

1. **Buscar (lupa)**, en cualquier página o en la portada:
   - 1.1 «deuda publica» → Deuda pública bruta, en % del PIB y en moneda extranjera (etiqueta Herencia). Pediste: «ponele deuda publica, deuda neta, etc.»
   - 1.2 «fmi», «reservas netas», «cepo», «leliq» → filas de Herencia. Agregado por mí: regla general, todas las filas de Herencia que no son series.
   - 1.3 «compras», «tasa plazo fijo», «dolar mayorista» → variables del parte diario (etiqueta Diario). Agregado por mí: el parte del Banco Central tenía el mismo problema.
2. **Herencia** `/herencia/?vista=traspasos&v=inf.deuda_bruta_usd#traspasos`:
   - 2.1 La página baja sola hasta «Cada traspaso presidencial». Agregado por mí: bug encontrado, el ancla no funcionaba porque el bloque se arma después de cargar.

## Segunda vuelta (2026-11-15, comentarios del usuario)

Pedidos: «el filtro de herencia es feo como muestra todas las variables. agrupa un poco y desplegables» · «la lupa si pongo deuda public lo primero que me muestra es la inflación regulados» · series para ver la evolución y deuda consolidada → spec aparte: `docs/specs/series-deuda.md`.

6. **Ajustes de Herencia, «Todos los traspasos»** (`Herencia.tsx`, `globals.css`): las variables van en plegables por grupo (Banco Central, Dólar, Cuentas públicas, Precios, Deuda y sector externo, Social, Estimaciones) con la cantidad al lado; abierto el grupo de la variable elegida. Los botones ya no repiten el grupo. Rótulos sin repetir («(informes) (informes)», «según el FMI (FMI)»).
7. **Lupa con palabras a medias** (`busqueda.ts`): el respaldo de datos principales con solo algunas de las palabras se usa únicamente si no hay ningún resultado con todas. «deuda public» ya no trae inflación de regulados ni resultado fiscal primero.

Verificado en la vista local (leyendo el DOM, panel oculto): Ajustes en `/herencia/?vista=traspasos&v=inf.deuda_bruta_usd` con 7 grupos y «Deuda y sector externo» abierto con la deuda bruta marcada; lupa con «deuda public» → las tres de deuda pública primero.

Dónde verlo: 3.1 `/herencia/?vista=traspasos&v=inf.deuda_bruta_usd` → Ajustes. 1.4 lupa con «deuda public».
