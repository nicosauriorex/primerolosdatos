# Remodelación, etapa 3.4: Contexto

Estado: implementada en local (2026-11-14), sin publicar. Sale de `docs/AUDITORIA-DISENO-2026-11-13.md` (sección "Contexto", C4 y "Límites de los datos"), D-023 y el sistema de `docs/specs/remodelacion-sistema.md` (componentes en `web/components/sistema/`). Sigue a la etapa 3.3 (`docs/specs/remodelacion-historico-presidentes.md`).

## Objetivo
- Que `/contexto/` (hoy 11.400 px que arrancan con las "sorpresas" del FMI) **abra con una pregunta respondida**: "¿Es más cara la carne en la Argentina que en la zona euro?", con la respuesta en una cifra, Argentina contra cada país en barras centradas en "igual", y cuántos kilos de asado compra un salario.
- Que las palabras de la pregunta se puedan cambiar (carne → pan, leche, ropa…; zona euro → el mundo, la región, Estados Unidos, Brasil…).
- Debajo, **un índice con los cuatro contextos**, cada uno con su frase-respuesta, y cada bloque abriendo con esa misma frase. Lo largo (sorpresas año por año, notas de método), plegado.
- Arreglar C4 en todo el bloque de precios: decir contra qué es "más barato" y no usar celeste/naranja como si uno fuera mejor que el otro.
- **Cada cifra sale de `precios_mundo.json` (y del catálogo) con las funciones de `web/lib/preciosMundo.ts`**: la pregunta, la lista y el detalle usan la misma cuenta (`niveles`), no hay números escritos a mano.
- **Links viejos**: todo link de `/contexto/` sigue abriendo lo mismo, con sus parámetros (`cg`, `cpr`, `cd`, `cpd`, `cpp`, `cpb`, `pmd`, `pmr`, `pmp`) y anclas (`#esperado`, `#comparar`, `#precios-mundo`, `#viento`). Ningún parámetro cambia de significado. Las plantillas `pm-*` (`/contexto/?pmr=<rubro>#precios-mundo`) y el recuadro del mandato (`/contexto/?cpr=<pres>`, `/contexto/#precios-mundo`) siguen andando.

## Límites (no prometer lo que no hay)
- No hay precio en euros por kilo: la respuesta es "X % más barata que en la zona euro (estimado)", nunca "cuesta € Y".
- "Zona euro" en lo medido es el promedio simple de Alemania, Francia, Italia y España (`notas_pais.EA`); se dice en el ⓘ.
- Uruguay, Paraguay, Bolivia, Perú, Ecuador y China no tienen IPC por rubro (`sin_datos`): solo tienen el valor medido de 2021 (y 2017). No entran en la comparación del mes; van aparte, rotulados "medido en 2021".
- Kilos por salario: solo para los rubros que tienen un precio promedio del INDEC (GBA); con los demás rubros esa línea no aparece. No se compara con salarios de otros países (no hay serie).

## Requisitos

### L1. Cálculos (`web/lib/preciosMundo.ts`; sin React)
- `PREG_RUBROS`: rubros que se pueden elegir en la pregunta, con cómo se dicen en la oración y su concordancia: `{ rid, dicho, caro, barato, producto? }[]`, en este orden:
  - `carne` "la carne" (cara/barata, producto `pp_gba_asado`, "kilos de asado"), `pan` "el pan y los cereales" (caros/baratos, `pp_gba_pan_frances`, "kilos de pan"), `leche` "la leche, los quesos y los huevos" (caros/baratos, `pp_gba_leche_fresca_entera_sachet`, "litros de leche"), `frutas` "la fruta" (cara/barata, `pp_gba_manzana_deliciosa`, "kilos de manzana"), `verduras` "la verdura" (cara/barata, `pp_gba_papa`, "kilos de papa"), `01` "la comida" (cara/barata), `03` "la ropa" (cara/barata), `04` "la vivienda y los servicios" (caros/baratos), `06` "la salud" (cara/barata), `07` "el transporte" (caro/barato), `11` "comer afuera" (caro/barato), `total` "vivir" (caro/barato; oración "¿Es más caro vivir en la Argentina…?").
  - Los ids de producto se comprueban contra el catálogo (`m.SER[id]`); si un id no existe, el rubro queda sin línea de kilos (no se inventa otro).
- `PREG_CONTRA`: contra quién: `{ id, dicho, ents: string[] }[]`: `EA` "la zona euro", `mundo` "el mundo" (nivel 100 por definición), `region` "la región" (promedio simple de los países de América Latina con estimado ese mes: Brasil, Chile, México, Colombia), `USA` "Estados Unidos", `BRA` "Brasil", `CHL` "Chile", `MEX` "México", `COL` "Colombia". Los que no estén en `d.paises` o no tengan estimado no se ofrecen.
- `comparacionRubro(d, arg, rid, dolar)`: `{ filas: FilaComparacion[]; soloMedido: FilaComparacion[] }` con `FilaComparacion = { ent, nombre, nivelArg, nivelOtro, dif, fecha, modo: "estimado" | "medido" }`:
  - Para cada país con estimado (y "el mundo" y "la región"): el **último mes en que la Argentina y ese país tienen estimado** (`niveles(...).est`), con los dos niveles de ese mes. "El mundo" usa el último mes con estimado de la Argentina y `nivelOtro = 100`. "La región" usa el último mes en que los cuatro países tienen estimado (si alguno no llega, el último mes en que al menos dos tienen; y la fila dice cuáles entraron).
  - `dif = (r1(nivelArg) / r1(nivelOtro) − 1) × 100`, redondeado a entero (las cuentas cierran con los niveles que se muestran, con un decimal).
  - `soloMedido`: los países de `sin_datos`, con el último año medido en el que también hay nivel de la Argentina (con el mismo dólar), `modo: "medido"`.
  - Todo con el dólar elegido (`pmd`), como el resto del bloque.
- `respuestaPregunta(d, arg, rid, contra, dolar)`: la fila de `comparacionRubro` del `contra` elegido, más la frase: "<Dicho con mayúscula> está N % más <barata|cara> en la Argentina que en <contra>" (o "cuesta lo mismo" si `|dif| < 1`), con la fecha ("estimado oct-2026") y el dólar ("dólar oficial"). Para "vivir": "Vivir en la Argentina es N % más barato que en <contra>". Sin adjetivos de juicio (D-012).
- `fraseRubroMundo(d, arg, rid, dolar)`: para el índice y la apertura del bloque de precios: "En <mes>, el consumo de los hogares en la Argentina estaba N % más <barato|caro> que el promedio del mundo (estimado, dólar oficial)."
- Kilos por salario: se reutiliza `respuestaCompra(m, producto, "sipa_med")` de `web/lib/oraciones.ts` tal cual (misma cifra que en "Preguntale" de la portada). No se escribe otra cuenta.

### L2. Frases de los otros contextos (`web/lib/contexto.ts`; sin React)
Una función por bloque, que el índice y la apertura de cada bloque usan (una sola fuente):
- `fraseComparar(d)`: "Desde 2000, el PIB de la Argentina creció X % y el del mundo, Y %." con `crecimientoIndice`/`indiceCrecimiento` sobre los años cerrados (hasta `ultimoCerrado`), entero, cuentas con los valores mostrados.
- `fraseEsperado(d, grupo)`: el promedio de la sorpresa de crecimiento de la Argentina en todos los años con proyección de abril: "Entre <primer año> y <último>, la Argentina creció en promedio X puntos por año <más|menos> de lo que proyectaba el FMI en abril; <el grupo>, Y puntos <más|menos>." (con `filasEsperado` y los valores como se muestran en la tabla).
- `fraseViento(m, d, pres)`: para el último presidente con datos: "Con <nombre corto>, N de los M indicadores de afuera estuvieron a favor y K en contra (contra el promedio de toda la serie)." con `vientosPres` y `MARCA_TXT` (sin contar los "sin" ni el petróleo, que no tiene marca).
- Si falta el dato de una frase, devuelve `null` y el índice muestra solo el título.

### P1. La pregunta (`web/components/secciones/PreguntaPrecios.tsx`, nuevo)
- Primer bloque de la página, `Capitulo` (h2) cuyo título es la pregunta armada: "¿Es más cara la carne en la Argentina que en la zona euro?". Las dos palabras variables son **huecos** como los de "Preguntale" de la portada (`ListaHueco` de `Oraciones.tsx`, que se exporta para reutilizarla; mismo aspecto, flechas, Escape, Atrás). El h2 lleva el texto completo para lectores (los botones con `aria-label` "Rubro" y "Comparar con").
- Debajo, la respuesta en el lugar (mismo patrón visual que `RespuestaVista` de la portada; exportarla o extraerla a un componente común sin cambiar su aspecto): cifra grande "54 % más barata", y en gris "que en la zona euro · estimado oct-2026 · dólar oficial". Si no hay estimado, "No hay datos para esta combinación."
- `InfoPunto` junto a la cifra: qué es el nivel de precios (Banco Mundial, ICP 2017 y 2021, llevado a cada mes con la inflación del rubro y el tipo de cambio), que es estimado, que no es un precio por kilo y qué es la zona euro.
- **Argentina contra cada uno**: `ListaBarras` divergente (el cero es "igual"), una fila por entrada de `comparacionRubro(...).filas` ordenadas de donde la Argentina es más barata a donde es más cara; `texto` "−54 %" / "+12 %" (con signo; "0 %" sin signo), `sub` "Argentina 62,5 · Zona euro 136,0 (mundo = 100) · oct-2026" (la fecha solo si difiere de la de la respuesta); fila del `contra` elegido resaltada (`resaltar`). Tono **neutro** (sin `tono`: color de acento), porque más barato no es mejor ni peor para todos (C4). Tocar una fila la elige como `contra`.
- Debajo de la lista, plegado (`<details>`) "Otros países (solo medido en 2021)": los de `soloMedido`, con el mismo formato y el año.
- **Kilos por salario** (solo si el rubro tiene producto y `respuestaCompra` devuelve algo): una línea "Con un salario mediano se compran 110 kilos de asado (oct-2026)" con su `Delta` contra hace un año, y link "Ver en el Histórico" (`hrefCompra` de `oraciones.ts`).
- Acciones del capítulo: `CompartirHoja` con el link de la vista (con `pqr`, `pqc`, `pmd`) y el texto = la frase de la respuesta más la fuente. Sin imagen en esta etapa (ver "Fuera").
- "Ver la evolución de este rubro" lleva a `#precios-mundo` con `pmr=<rubro>` (el detalle de abajo se abre en ese rubro).
- Parámetros nuevos (en `web/lib/url.ts` si ahí se registran, y con valor por defecto si son inválidos): `pqr` (rubro de la pregunta, por defecto `carne`; inválido → `carne`), `pqc` (contra, por defecto `EA`; inválido o sin datos → `EA`, y si `EA` no tiene datos, `mundo`). No se usa `pmr` para la pregunta: `pmr` sigue siendo el rubro del detalle.
- Carga: necesita el catálogo con las series de `IDS_PM`, `sipa_med` y los productos de `PREG_RUBROS` (sumarlos a lo que pide `useSeccion` en `Contexto.tsx`) y `precios_mundo.json` (`usePreciosMundo`). Mientras carga, `Cargando` con el alto reservado (la página no salta).

### P2. Índice de los cuatro contextos (`Contexto.tsx`)
- Después de la pregunta, un `nav` con `aria-label="Los cuatro contextos"` y cuatro filas enteras tocables (mismo patrón que `indice-fila` de la portada: nombre en negrita, la frase-respuesta en una línea debajo, flecha a la derecha), en este orden, cada una al ancla de su bloque:
  1. Precios en el mundo (`#precios-mundo`) — `fraseRubroMundo` con el total.
  2. La Argentina y otros países (`#comparar`) — `fraseComparar`.
  3. Lo esperado y lo que pasó (`#esperado`) — `fraseEsperado` con el grupo elegido (`cg`).
  4. Viento de cola o de frente (`#viento`) — `fraseViento`.
- No es fijo al deslizar (nada tapa un dato; la barra inferior ya ocupa el pie en el celular). En la computadora, dos columnas.
- Los bloques se reordenan en ese mismo orden (hoy: Esperado, Comparar, Precios, Viento). Las anclas no cambian; el salto a `#ancla` al terminar de cargar sigue andando.

### P3. Cada bloque abre con su respuesta y sin caja (`Contexto.tsx`, `PreciosMundo.tsx`)
- Los cuatro bloques pasan de `div.card` + `cab-bloque` a `Capitulo` (h2, con el mismo `id` de ancla), con `acciones` = `CompartirHoja` (link al ancla con los parámetros de la vista; reemplaza `BotonLink`) y, como primera línea, la frase-respuesta de L2 en la voz de bajada destacada (`ctx-respuesta`). Sin bordes ni cajas alrededor de los bloques.
- Las notas largas de cada bloque (cómo se mide, de dónde salen las proyecciones, cómo se marcan a favor/en contra, la de "Medido/Estimado") pasan a `InfoPunto` junto al título del gráfico o a un plegado "Cómo se mide" al final del bloque. A la vista queda como máximo una línea de nota por gráfico (unidad y lo imprescindible para leerlo).
- El plegado de la página "Cómo se asignan los años y qué es «Vecinos»" pasa al final de la página, con la fuente, como "Cómo se mide" (mismo texto).
- **Controles**:
  - Lo esperado: `FilaChips` para el dato (`cd`) y otra para el grupo (`cg`); el selector de grupo de arriba de todo se saca de ahí y vive en este bloque (es el único que lo usa). Mismos valores y mismos parámetros.
  - La Argentina y otros países: `BarraVista` con chips "Crecimiento" (dato), "N países" y, en los índices, "Base 100 desde 2000" / "Valor"; tocar un chip o "Ajustes" abre una `Hoja` "Ajustes" con los controles de hoy (Dato, Ver como, Año base, Países). Mismos parámetros (`cpd`, `cpb`, `cpp`).
  - Precios en el mundo (detalle): `BarraVista` con "Rubro: <nombre>", "Dólar oficial|blue" y "N países"; `Hoja` con Rubro, Dólar y Países (los de hoy, con los deshabilitados y su motivo). Mismos parámetros (`pmr`, `pmd`, `pmp`).
  - Viento: el botón "Presidentes: sí/no" de cada gráfico queda igual.
- **Las sorpresas del FMI, plegadas**: en Lo esperado quedan a la vista la frase, el gráfico y la tabla por presidente; la lista "Con <presidente>, la Argentina rindió…" pasa dentro de un plegado "Presidente por presidente, en palabras", junto al "Ver año por año" que ya existe.
- **Listas "Por rubro" y "Algunos productos"** (`PreciosMundo.tsx`): pasan de `pm-fila` a `ListaBarras` divergente con tono neutro (C4): `valor = r1(nivel) − 100`, `texto` "38 % más barato" / "12 % más caro" (contra el mundo, con el número que cierra con el nivel mostrado: 100 − 62 = 38), `sub` "nivel 62 · estimado oct-2026", fila del rubro del detalle resaltada; tocar una fila elige ese rubro (`pmr`) y lleva al detalle, como hoy. El rótulo de la lista dice contra qué: "Contra el promedio del mundo (= 100)".
- Las tablas por presidente de Lo esperado, Comparar y Viento siguen como tablas (`tablewrap fija`), con la fila de `cpr` resaltada como hoy.

### P4. Orden de `/contexto/`
1. h1 "Contexto internacional" (`CabeceraPagina`, como hoy) y la bajada de hoy, en una línea más corta si entra.
2. La pregunta (P1).
3. Índice (P2).
4. Precios en el mundo · La Argentina y otros países · Lo esperado y lo que pasó · Viento de cola o de frente (P3).
5. "Cómo se mide" y la fuente.

### CSS (`web/app/globals.css`)
- Clases nuevas con prefijo `ctx-` (página) o `pq-` (pregunta); buscar antes con grep que no existan (`contexto-plegado` ya existe y lo usa también el recuadro del mandato: no tocarla). Tokens del sistema, sin colores fijos. Bloque nuevo al final del archivo bajo un comentario "Remodelación 3.4: Contexto".
- Borrar el CSS que quede sin uso (`.pm-lista`, `.pm-fila`, `.pm-barra`, `.pm-medio`, `.pm-rel`, `.pm-n`, `.pm-v` si nada más los usa), solo después de comprobar con grep.

## Fuera de esta etapa
- Imagen para compartir de la pregunta y de los bloques de Contexto (por ahora link y texto).
- Pasar las tablas por presidente de Contexto a `TablaMandatos`.
- El recuadro "Contexto del mandato" (`ContextoMandato.tsx`) y `/mandato/`: no cambian.
- Precio en euros por kilo, salarios de otros países, gráfico de líneas de precios relativos en base 100 (idea abierta en `docs/IDEAS.md`).

## Cómo se verifica
- `npm run tipos` y `npm run build`.
- **Cada cifra sale de `precios_mundo.json`**: con un script de Python (sin red) sobre `web/public/datos/precios_mundo.json` y los niveles medidos, comprobar a mano una fila medida (carne 2021: Argentina 61,7 contra zona euro 135,8 → −55 %) contra la fila "medido" equivalente que muestra la página con el dólar oficial; y que el nivel de la Argentina de la pregunta (carne, zona euro) es el mismo que muestran la lista "Algunos productos" y el detalle de carne para ese mes. La línea de kilos de asado da lo mismo que "Preguntale" en la portada.
- La pregunta: cambiar el rubro (carne → pan → vivir) y el contra (zona euro → el mundo → Brasil) cambia el h2, la cifra y la fila resaltada, y escribe `pqr`/`pqc`; con "el mundo" la cifra es 100 − nivel; un rubro sin producto no muestra kilos; `?pqr=zzz&pqc=zzz` abre carne contra zona euro; los huecos se cierran con Escape y Atrás y devuelven el foco.
- **Links viejos**: `/contexto/?cg=latam&cd=infl`, `?cpd=pibr&cpb=1990&cpp=BRA,CHL`, `?pmr=carne&pmd=blue&pmp=USA,EA#precios-mundo` (salta al detalle de carne con el blue), `?cpr=macri` (fila resaltada en las tablas), `#esperado`, `#comparar`, `#viento`, una plantilla `pm-*` desde `/plantillas/`; sin errores de consola.
- Índice: las cuatro frases con números que coinciden con los de cada bloque (crecimiento desde 2000 contra la tabla; sorpresa promedio contra "Ver año por año"; vientos contra la fila del último presidente); cada fila lleva a su bloque.
- Cada `BarraVista` abre su hoja; Escape, cruz y Atrás la cierran; los cambios escriben los mismos parámetros que hoy.
- Alto de la página a 360 px menor que hoy (hoy ~11.400 px) y la respuesta de la pregunta visible sin deslizar a 390 px.
- `/contexto/` a 360, 390 y 1280 px, tema oscuro y claro: sin desplazamiento horizontal de la página, sin errores de consola, objetivos de 44 px, un solo h1.
- `impeccable detect` y agente `revisor`.
