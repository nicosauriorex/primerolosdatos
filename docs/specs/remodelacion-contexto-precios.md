# Contexto internacional: precios contra el mundo, en un solo capítulo

Estado: implementada (2026-11-15) y publicada en a74107c (corrida en verde). Aprobada con lo recomendado en A, B y C ("Sí, implementá").

Sale de los pedidos 19 y 20 de la tanda 9 (`docs/IDEAS.md`, tanda 9, renglón "Contexto internacional") y del pedido 19 viejo ("falta un gráfico de líneas con los precios por producto de Argentina contra otros países", que ya existe pero queda lejos).

## Qué pasa hoy (lectura del código)

En `/contexto/` los precios aparecen **dos veces, con dos estados distintos**:

1. Arriba, `PreguntaPrecios.tsx`: "Precios: la Argentina contra cada país". Píldora de rubro (`pqr`), barras divergentes neutras de la Argentina contra cada país (`comparacionRubro`), cada barra con el renglón "Argentina 95,0 · Bolivia 76,6 (mundo = 100)", "Otros países (solo medido en 2021)" plegado, "Con un salario mediano se compran…" y el botón "Ver la evolución de este rubro", que cambia `pmr` y **salta** al capítulo de más abajo.
2. Después del índice, `PreciosMundo.tsx`: "Precios en el mundo". Otro rubro (`pmr`), Ajustes (rubro, dólar) y Países (`pmp`), el gráfico de líneas mundo = 100 con **dos series por país** (línea punteada "estimado" y puntos "medido") y una leyenda que repite cada país dos veces, "Por rubro" y "Algunos productos" (tocar una fila también salta hacia arriba) y la tabla de valores medidos.

Por eso: el salto entre los dos bloques parece llevar a otra página (pedido "navegación limpia como la ficha"); hay dos rubros elegidos a la vez; los países sin IPC por rubro (Uruguay, Paraguay, Bolivia, Perú, Ecuador, China) solo tienen puntos de 2017 y 2021; y la leyenda dice lo mismo dos veces.

Datos que limitan el diseño (`precios_mundo.json`):
- Medido por el Banco Mundial: 2017 y 2021, los 13 países, todos los rubros.
- Estimado mes a mes (ene-2017 a hoy): solo Estados Unidos, zona euro, Brasil, Chile, México y Colombia, y no en todos los rubros (la carne, solo zona euro y Brasil).
- Por eso "promedio de una presidencia" solo existe para Macri (desde ene-2017, no desde dic-2015), Alberto Fernández y Milei; y para los países solo medidos, el año medido que cae en el mandato (2017 → Macri, 2021 → Alberto; Milei, ninguno).

## Propuesta

Un solo capítulo **"Precios contra el mundo"** reemplaza a los dos bloques (sale `PreguntaPrecios` como bloque aparte; queda un componente, `PreciosMundo.tsx`, con un solo estado de rubro). Orden, de arriba abajo:

```
Precios contra el mundo                                   [Compartir]
La carne es 47 % más barata en la Argentina que en la zona euro (oct-26).

[Rubro: Carne ▾] [Período: Hoy ▾] [Comparar desde: Argentina ▾]  [Ajustes]

             más barato ←  igual  → más caro
Zona euro    ███████████|                −47 %
                                         más barato
Brasil             █████|                −18 %
                                         más barato
Estados Unidos          |████            +12 %
                                         más caro
...
▸ Otros países (solo medido en 2021)

¿Cómo viene?   (el mismo rubro, en el lugar)
  [gráfico de líneas: una línea por país, color = país; punto en 2017 y 2021]
  Leyenda: ■ Argentina ■ Zona euro ■ Brasil …   — línea: estimado · ●: medido

Todos los rubros contra <país elegido>
  Comida … Ropa … Transporte …   (tocar una fila cambia el rubro de arriba, sin saltar)

▸ Valores medidos por el Banco Mundial
▸ Cómo se mide
```

### 1. Las barras (pedidos: más claro, países en el eje vertical, verde o rojo, sin el renglón de niveles)
- Una fila por país, el nombre a la izquierda (eje vertical), la barra desde el cero y, a la derecha, la cifra con signo y **debajo, en palabras, "más caro" o "más barato"** (o "igual").
- Color: **verde o rojo según el lado** (ver decisión A), siempre con la palabra, nunca solo color (regla del sitio).
- Sin el renglón "Argentina 95,0 · Bolivia 76,6 (mundo = 100)". Los niveles pasan al globo de la fila al tocarla y a la tabla de valores medidos.
- La fecha va una sola vez en la frase de arriba; solo las filas con otra fecha (medido en 2021) la dicen.
- Tocar una fila elige ese país como "contra quién" de la frase y de "Todos los rubros" (como hoy `pqc`).

### 2. Período (pedido: filtro de año o promedio de cada presidencia)
Píldora "Período" con tres grupos:
- **Hoy** (último mes, por defecto).
- **Un año**: 2017 a 2025 cerrados y el año en curso; promedio de los meses del año (la misma regla `promAnio` de 6 meses mínimos).
- **Promedio de un presidente**: Macri (desde ene-2017, dicho en la opción), Alberto Fernández y Milei (hasta hoy). Promedio de los niveles mensuales del mandato.
Los países solo medidos aparecen si su año medido cae en el período (2017 o 2021) y lo dicen en la fila. Un período sin datos para el rubro avisa en lugar de mostrar barras vacías.

### 3. Comparar países entre sí (pedido)
Píldora "Comparar desde": Argentina (por defecto) o cualquier país con estimado. La lectura no cambia: cada barra dice cuánto más caro o barato es el país de referencia **contra** el país de la fila (hoy: "Argentina contra cada país"). Con Brasil elegido, la Argentina pasa a ser una fila más (resaltada) y la frase dice "La carne está 30 % más barata en Brasil que en la zona euro". La cuenta es la misma de hoy con otro país en el lugar de la Argentina: el nivel de cada uno contra el mundo = 100 ya es comparable entre sí. "La región" no incluye al país de referencia.

### 4. Imagen al compartir (pedido)
El Compartir del capítulo saca una imagen con las barras tal como se ven (rubro, período, país de referencia, dólar), la frase arriba y la fuente: lienzo `barras` existente de `lib/imagen.ts` en modo divergente, con una vista nueva en `lib/imagen-contexto.ts`. Palabras neutras en la imagen: "más caro / más barato", sin "mejor/peor" (D-012). Si el lienzo `barras` no tiene modo divergente, se le suma (sin cambiar cómo se ven las barras de presidentes).

### 5. Sin "Con un salario mediano se compran…" (pedido)
Sale de este capítulo. Los kilos por salario siguen en la portada ("Preguntale") y en el Histórico; acá no se repiten.

### 6. Evolución en el lugar, sin saltos (pedido "navegación limpia como la ficha")
- "¿Cómo viene?" queda **debajo de las barras, dentro del mismo capítulo**, siempre con el rubro de arriba: no hay botón "Ver la evolución" ni `scrollIntoView`.
- "Todos los rubros" (hoy "Por rubro" y "Algunos productos") cambia el rubro de arriba **sin mover la página**; la fila tocada queda resaltada y, si las barras quedaron fuera de pantalla, un aviso chico "Rubro cambiado a Ropa · Ver arriba" (sin salto automático).
- Un solo parámetro de rubro: `pqr`. Links viejos con `pmr` siguen funcionando (si no hay `pqr`, se toma `pmr`); `#precios-mundo` y `#pregunta` llevan al capítulo.

### 7. Gráfico "¿Cómo viene?" sin leyendas repetidas (pedido)
- **Una sola serie por país**: línea donde hay estimado y punto en los años medidos, del mismo color; la leyenda nombra cada país una vez y una clave fija dice "línea: estimado · punto: medido".
- Los países sin estimado no se ofrecen en el gráfico (en Países figuran deshabilitados con su motivo, como hoy); siguen en las barras como "solo medido".
- Con "Comparar desde" otro país, el gráfico sigue en mundo = 100 (no cambia de escala) y la línea del país de referencia va más gruesa.

### 8. Dólar y países, en Ajustes
Ajustes: Dólar (oficial / blue) y Países del gráfico. Un solo botón Ajustes por capítulo (R19).

## Barrido (cada pedido como regla en toda la sección)
- **Leyendas**: `Comparar` usa línea punteada para el país 9 en adelante y repite colores; pasar a un color por país sin punteado (y si son más de 8, avisar en lugar de reciclar).
- **Saltos dentro de la página**: `#precios-mundo` y el índice de los cuatro contextos siguen siendo anclas (son navegación pedida); no queda ningún otro `scrollIntoView` disparado por un botón.
- **Imagen**: Comparar, Esperado y Viento comparten solo link y texto; sumar imagen queda **fuera de esta propuesta** (anotarlo en `docs/IDEAS.md`) salvo que el usuario lo pida.
- **Período por presidente**: Comparar, Esperado y Viento ya tienen su tabla por presidente; no cambian.

## Lo que no cambia
- Las cuentas de nivel (`niveles`, `comparacionRubro`, `difPct` con los valores mostrados) y los datos del pipeline.
- Los capítulos Comparar, Lo esperado y Viento (salvo la leyenda de Comparar).
- Los links compartidos: `pqr`, `pqc`, `pmd`, `pmp`, `pmr` siguen mostrando lo mismo (el rubro y el país); `#pregunta` y `#precios-mundo` van al capítulo nuevo.

## Decisiones abiertas (para el usuario)
- **A. Color de las barras.** Recomendado: verde = más barato en el país de referencia, rojo = más caro (mirada de quien compra), siempre con la palabra. Alternativa: color neutro como hoy y la palabra debajo (la remodelación de Contexto lo dejó neutro porque más barato no es mejor ni peor para todos: para quien exporta o cobra en dólares es al revés).
- **B. Título de `/contexto/`.** Quedó pendiente de la remodelación. Propuesta: "El mundo y la Argentina" (hoy "Contexto internacional").
- **C. Los países solo medidos (Uruguay, Paraguay, Bolivia, Perú, Ecuador, China)**: recomendado plegados abajo como hoy ("Otros países, medido en 2021"); alternativa: mezclados en la lista con su fecha.

## Decisiones tomadas (2026-11-15)
- A: verde = el país de referencia es más barato que el de la fila; rojo = más caro; con la palabra "más barato"/"más caro" debajo de la cifra. En la imagen, las mismas palabras (sin mejor/peor).
- B: la página se llama "El mundo y la Argentina" (ruta `/contexto/` igual).
- C: países solo medidos, plegados abajo ("Otros países, medido en <año>").

## Contrato entre partes
Parámetros de URL: `pqr` rubro (si falta, se toma `pmr`; por defecto `carne`), `pqc` país contra el que habla la frase (por defecto `EA`, si no hay, `mundo`), `pqd` país de referencia (por defecto `ARG`), `pqa` período (`""` hoy, `"2021"` un año, `"p-<id de presidente>"`), `pmd` dólar, `pmp` países del gráfico. Inválidos → por defecto.

`web/lib/preciosMundo.ts` exporta (además de lo que ya tiene, que sigue):
```ts
export type Periodo = { tipo: "hoy" } | { tipo: "anio"; anio: number } | { tipo: "pres"; id: string; i0: string; i1: string };   // i0/i1: "AAAA-MM" recortados a d.fechas
export interface OpcionPeriodo { id: string; n: string; grupo: "Hoy" | "Un año" | "Presidente"; nota?: string }   // id = valor de pqa
export function opcionesPeriodo(d: DatosPM, PRES: Pres[], F: string[]): OpcionPeriodo[];   // presidentes con al menos 6 meses dentro de d.fechas; nota "desde ene-17" si se recorta
export function periodoDe(id: string | null, d: DatosPM, PRES: Pres[], F: string[]): Periodo;   // inválido → hoy
export const RUBRO_DICHO: Record<string, { dicho: string; caro: string; barato: string }>;   // los 18 rubros
export const DICHO_PAIS: (d: DatosPM, ent: string) => string;   // "la Argentina", "la zona euro", "Brasil", "el mundo", "la región"
export function referencias(d: DatosPM, arg: ArgPM, rid: string, dolar: Dolar): string[];   // ARG + países con estimado en ese rubro
export interface FilaPrecio {
  ent: string; nombre: string; nivelRef: number; nivelOtro: number;
  dif: number;                 // % entero = (nivelRef / nivelOtro − 1) × 100 con los niveles a un decimal (como difPct)
  fecha: string;               // texto ya listo: "oct-26", "2021", "medido en 2021", "promedio 2020–2023"
  modo: "estimado" | "medido"; entran?: string[];
}
export function compararPrecios(d: DatosPM, arg: ArgPM, rid: string, ref: string, periodo: Periodo, dolar: Dolar): { filas: FilaPrecio[]; soloMedido: FilaPrecio[]; fechaTxt: string };
// filas: cada país con estimado (sin la referencia; con ARG si ref ≠ ARG), "mundo" (100) y "region" (REGION sin la ref).
// hoy = último mes común (como comparacionRubro); año = promedio de los meses comunes del año (mín. 6); pres = promedio de los meses comunes del mandato (mín. 6).
// soloMedido: países sin estimado del rubro, con el año medido más reciente que cae en el período (hoy: el último); fuera del período, no aparecen.
// fechaTxt: lo que va en la frase ("estimado oct-26", "promedio 2021", "promedio de Alberto Fernández, 2020–2023").
export function frasePrecios(d: DatosPM, rid: string, ref: string, fila: FilaPrecio, fechaTxt: string, dolar: Dolar): string;
// "La carne está 47 % más barata en la Argentina que en la zona euro (estimado oct-26, dólar oficial)."  Sin adjetivos de juicio.
```
`comparacionRubro` y `respuestaPregunta` quedan como envoltorios de lo nuevo (ref ARG, hoy) mientras alguien los use; si nadie los usa, se borran.

`web/lib/imagen-contexto.ts` (nuevo) exporta:
```ts
export type VistaCtx = { tipo: "ctx-precios"; titulo: string; frase: string; filas: FilaPrecio[]; soloMedido: FilaPrecio[]; refNombre: string; dolar: Dolar; fuente: string };
export const esVistaCtx: (v: unknown) => v is VistaCtx;
export function armarImagenCtx(v: VistaCtx, o: { formato: FormatoImg; comentario: string }): DatosImagen | null;   // lienzo "barras" con cls bueno/malo, variacion "−47 %", nota "más barato"
```
y se engancha en `lib/imagen-presidentes.ts` igual que `VistaElec` (unión de `VistaPres`, despacho en `armarImagenPres` e `idsDeVistaPres`), así `BotonCompartir` de `PanelCompartir.tsx` la acepta sin cambios.

`web/components/sistema/ListaBarras.tsx`: `FilaBarra` suma `nota?: string` (renglón chico debajo de la cifra, a la derecha). Nadie más cambia.

## Archivos
- `web/lib/preciosMundo.ts`: `comparacionRubro` con país de referencia y período (hoy, año, presidente); opciones de período; frase con referencia. Una sola fuente de verdad: la frase, las barras y la imagen salen de acá.
- `web/components/secciones/PreciosMundo.tsx`: el capítulo único (barras, "¿Cómo viene?", "Todos los rubros", plegados). `PreguntaPrecios.tsx` se borra o queda como piezas internas.
- `web/components/secciones/Contexto.tsx`: un solo bloque de precios; índice con tres entradas más la de precios; leyenda de Comparar.
- `web/lib/imagen-contexto.ts` (nuevo) y, si hace falta, el modo divergente de `barras` en `lib/imagen.ts`.
- `web/components/sistema/ListaBarras.tsx`: tono verde/rojo opcional y texto debajo de la cifra (si se elige A recomendado), sin cambiar a quien no lo pide.
- `web/app/estilos/contexto.css`: CSS de la parte nueva; borrar `.pq-*` y `.ctxr-*` que queden sin uso.

## Cómo se verifica
- `npm run tipos` y `npm run build`.
- `/contexto/` a 360, 390 y 1280 px: un solo h1, sin desborde, consola limpia; las barras se ven sin deslizar en el celular.
- Cuenta a mano sobre `precios_mundo.json`: carne 2021, Argentina contra Estados Unidos (−47 %, la de la remodelación anterior) y la misma con "Comparar desde: Brasil".
- Período "Alberto Fernández": promedio de los niveles mensuales 2020–2023 contado a mano para un país; con 2021 dentro, los países solo medidos aparecen.
- Tocar un rubro de "Todos los rubros": la posición de la página no cambia (`scrollY` igual), el rubro de arriba sí.
- Links viejos: `?pmr=carne&pmd=blue&pmp=USA,EA#precios-mundo`, `?pqr=03&pqc=BRA#pregunta`, `?pqr=zzz&pqc=zzz` → muestran lo mismo que antes o el valor por defecto.
- Imagen: el Compartir del capítulo saca las barras con las mismas cifras que la pantalla, en 1:1 y 4:5.
- Revisor contra esta spec.

## Dónde ver los cambios
Local: `http://localhost:3100<ruta>` con la vista `web-out`. Publicado: `https://primerolosdatos.com.ar<ruta>`, recién después del commit, el push y la corrida en verde. Página con links: `docs/cambios/contexto-precios.html`.

1. **Menús**
   1.1 La sección se llama "El mundo y la Argentina" — `/contexto/`. (Decisión B.)
2. **El mundo y la Argentina** (`/contexto/`)
   2.1 Un solo capítulo "Precios contra el mundo" — `/contexto/#precios-mundo`.
   2.2 Barras con el país a la izquierda, verde/rojo y "más caro / más barato" — `/contexto/#precios-mundo`.
   2.3 Sin el renglón de niveles; la fecha solo donde es distinta — `/contexto/#precios-mundo`.
   2.4 Período (hoy, año, presidente) — `/contexto/?pqa=p-af#precios-mundo`.
   2.5 Comparar desde otro país — `/contexto/?pqd=BRA#precios-mundo`.
   2.6 Compartir con imagen — `/contexto/?pqr=03#precios-mundo`.
   2.7 Sin "Con un salario mediano se compran…" — `/contexto/#precios-mundo`.
   2.8 "¿Cómo viene?" en el lugar, leyenda una vez por país — `/contexto/#precios-mundo`.
   2.9 "Todos los rubros" cambia el de arriba sin mover la página — `/contexto/?pqr=06#precios-mundo`.
   2.10 Período de un presidente desde el mes en que asumió — `/contexto/?pqa=p-milei#precios-mundo`. (Agregado: contaba desde el mes anterior.)
   2.11 "La Argentina y otros países" sin líneas punteadas — `/contexto/#comparar`. (Barrido.)
3. **Por presidente**: 3.1 el link de "Contexto del mandato" dice "Ver precios contra el mundo" — `/presidentes/#pres-uno`.
4. **Gráficos listos**: 4.1 la lámina de precios contra el mundo abre el capítulo nuevo — `/plantillas/`.

Distinto de lo propuesto: la línea del país de referencia no va más gruesa (el gráfico no lo permite sin tocar `Grafico.tsx`; se distingue por el color) y el globo del gráfico sigue nombrando por separado lo estimado y lo medido de cada país (la leyenda, una sola vez). "La región" en "Hoy" puede tener un mes viejo (ropa: dic-23) porque toma el último mes en que los cuatro países tienen dato; la fila lo dice.

## Segunda vuelta (2026-11-15, comentarios del usuario sobre la primera, antes del commit)
Pedido, con sus palabras: «cuando decía gráfico de barra me refería a algo así (obvio con la estética de la app)» (imagen: barras horizontales con el nombre a la izquierda, rejilla vertical y eje con números abajo); «el gráfico de barra por rubro (si no hay nada filtrado compararía contra algo por default, el mundo ponele), otro al lado por región y otro al lado por presidente… apreto carne contra Europa y ahí veo por presidente quién era más barata (tipo gráficos interactivos)… si no se puede, un solo gráfico… apretando los botones vayas cambiando la vista… y eso te cambiaría el tipo de filtro: si estoy viendo por rubro no tiene sentido un filtro de rubro»; «abajo estaría el cómo viene… que también ofrezca el filtro pero que se ajuste a lo que se apretó arriba»; «dividiría la sección… en distintas subpestañas tipo lo de presidente… y sus íconos».

### V1. Tres gráficos de barras enlazados
- Componente nuevo `web/components/sistema/GraficoBarrasH.tsx`: barras horizontales como la imagen, con la estética del sitio: nombre a la izquierda (cortado con "…" y el nombre completo en `title`), rejilla vertical tenue con marcas redondas y sus números abajo, línea del cero `--cero`, barra con degradado desde el cero (verde si el valor es negativo = más barato, rojo si es positivo; R "verde = mejor" con texto: cifra al final de la barra y "más barato/más caro" debajo), fila elegida resaltada, filas tocables (botón, 44 px), aparece al entrar en pantalla y respeta "reducir movimiento".
- **Por país** (rubro elegido; período): cada país contra la referencia (lo de la primera vuelta). Tocar un país lo elige como "contra".
- **Por rubro** (contra el país elegido; período): los 18 rubros. Tocar un rubro lo elige.
- **Por presidente** (rubro y país elegidos): Macri (desde ene-17), Alberto Fernández y Milei, promedio de su mandato. Sin período (no tiene sentido).
- Computadora (≥ 1100 px): los tres uno al lado del otro; tocar una barra cambia los otros dos ("carne" en Por rubro + "zona euro" en Por país → Por presidente muestra carne contra la zona euro). Celular y tablet: un solo gráfico con tres botones (Por país · Por rubro · Por presidente) en una `FilaChips`; parámetro `pqv` (`pais` por defecto, `rubro`, `pres`).
- Cada gráfico muestra arriba solo los filtros que tienen sentido para él (Por país: Rubro; Por rubro: Contra; Por presidente: Rubro y Contra) como píldoras; arriba de todo, comunes: Comparar desde, Período (no afecta a Por presidente, y lo dice) y Ajustes (dólar).
- La frase de arriba sigue siendo una (rubro + contra + período); el índice de los cuatro contextos se va (lo reemplazan las subpestañas).
- Contra por defecto: **sigue la zona euro** (un link compartido sin `pqc` tiene que seguir diciendo lo mismo); "El mundo" es la primera opción de la lista de "Contra".
- Compartir: un ícono por gráfico (en la computadora se ven tres) que saca la imagen de ese gráfico (`VistaCtx` con `enc` "País", "Rubro" o "Presidente").

### V2. "¿Cómo viene?" con sus propios filtros, que siguen a los de arriba
- Píldoras Rubro y Países propias. Sin tocar, usan el rubro de arriba y los países referencia + contra (si es un país). Parámetros `pvr` (rubro del gráfico) y `pmp` (países, el de siempre). Al cambiar el rubro o el contra de arriba, se borran `pvr`/`pmp` y el gráfico vuelve a seguirlos. Un link viejo con `pmp` mantiene sus países.

### V3. Subpestañas, como Presidentes
- Rutas: `/contexto/` **Precios** (etiqueta de precio), `/contexto/paises/` **Otros países** (globo), `/contexto/esperado/` **Lo esperado** (diana), `/contexto/viento/` **Viento** (viento). Barra de subsecciones igual a la de Presidentes (`Nav.tsx`), con íconos finos nuevos en `iconosTemas.tsx`. El título de la página sigue "El mundo y la Argentina".
- Links viejos: `/contexto/#comparar`, `#esperado`, `#viento` → la subpestaña con la misma consulta; `?cpd|cpb|cpp` sin parámetros de precios → `/contexto/paises/`; `?cg|cd` → `/contexto/esperado/`; `?cpr=<pres>` (el link de "Contexto del mandato") → `/contexto/paises/?cpr=…`. `#precios-mundo` y `#pregunta` quedan en `/contexto/`. El sitemap suma las tres rutas.
- "Cómo se mide" (asignación de años, vecinos) va al pie de las tres subpestañas del FMI.

### Contrato de la segunda vuelta
`web/lib/preciosMundo.ts` suma:
```ts
export function compararPorRubro(d: DatosPM, arg: ArgPM, ref: string, contra: string, periodo: Periodo, dolar: Dolar): { filas: FilaPrecio[]; fechaTxt: string };   // ent = id de rubro, nombre = d.rubros[rid].n; los 18 que tengan dato
export function compararPorPresidente(d: DatosPM, arg: ArgPM, rid: string, ref: string, contra: string, PRES: Pres[], F: string[], dolar: Dolar): FilaPrecio[];   // ent = id de presidente, nombre = Pres.n, fecha "ene-17 a nov-19"; en orden cronológico
```
`web/lib/imagen-contexto.ts`: `VistaCtx` suma `enc?: string` (encabezado de la columna de nombres; por defecto "País") y `orden?: "valor" | "fijo"` (presidentes en orden cronológico).
`web/components/sistema/GraficoBarrasH.tsx`:
```ts
export interface BarraH { id: string; nombre: string; valor: number | null; texto: string; nota?: string; sub?: string; tono?: "bueno" | "malo" | null }
export function GraficoBarrasH(p: { filas: BarraH[]; etiqueta: string; elegida?: string | string[]; onElegir?: (id: string) => void; fmtEje: (v: number) => string; escala?: [string, string] /* ["← más barato", "más caro →"] */ }): JSX.Element;
```
`PreciosMundo` sigue con la firma `{ m, p, set, PRES }`.

### Cómo quedó la segunda vuelta (verificado)
Tres subagentes (cálculos y `GraficoBarrasH`; subpestañas; pantalla de Precios). Verificado en la vista local: tipos y build; a 1280 px los tres gráficos en columnas (captura) y a 375 px uno con los botones Por país · Por rubro · Por presidente (captura), sin desborde y con un h1; tocar "Salud" en Por rubro cambia la frase, las píldoras y borra `pvr`; redirecciones `#comparar`, `#viento`, `?cg&cd`, `?cpr` a su subpestaña con la consulta; `#precios-mundo`, `#pregunta`, `pmr`/`pmp` viejos e inválidos; imagen de Por presidente dibujada (captura). Revisor: sin bloqueantes; corregidos el alto de la barra de subpestañas en la computadora (las anclas quedaban tapadas), el orden de la imagen (ahora igual a la pantalla), la frase de Por rubro sin paréntesis vacíos y código sin uso (`ListaBarras` vuelve a como estaba). Ajustado después de verlo: la cifra y "más barato/más caro" en una columna fija a la derecha, nombres en hasta dos renglones, tres marcas en el eje, y en el celular el Compartir en el renglón de las píldoras.
Decisión que quedó (sin pedir): tocar una barra de Por presidente elige el período de ese presidente para Por país y Por rubro (cruce de filtros, como pediste para rubro y país).
Sin verificar: tema claro, celular real, las píldoras con rubros largos en la columna de 1100 px, las imágenes de Por país y Por rubro (la de Por presidente sí).

Dónde ver la segunda vuelta (local `http://localhost:3100<ruta>`; publicado recién después del push):
5. **El mundo y la Argentina**
   5.1 Subpestañas con íconos: Precios, Otros países, Lo esperado, Viento — `/contexto/`, `/contexto/paises/`, `/contexto/esperado/`, `/contexto/viento/`.
   5.2 Tres gráficos de barras enlazados (computadora) — `/contexto/`.
   5.3 En el celular, un gráfico con Por país · Por rubro · Por presidente — `/contexto/?pqv=rubro`.
   5.4 Cada gráfico con sus filtros y su Compartir — `/contexto/?pqv=pres`.
   5.5 "¿Cómo viene?" con Rubro y Países propios que siguen a los de arriba — `/contexto/?pqr=03#precios-mundo`.
   5.6 Links viejos a los bloques llevan a su subpestaña — `/contexto/#comparar`.

## Tercera vuelta (2026-11-15, comentarios sobre la segunda, antes del commit)
Pedido, con sus palabras: «hay muchos botones y filtros grandes que ocupan mucho tamaño… no digo de sacar los filtros pero que visualmente no ocupen tanto… capaz haya que rediseñar a nivel app o solo para esta sección… o proponé»; «apreto Brasil para filtrar; si lo aprieto de vuelta debería sacar el filtro»; «poner el por rubro primero, que es el más largo, luego por país y luego por presidente»; «las subpestañas quedan abajo desalineadas»; «pasar a Argentina y el mundo a una sección como las de inicio / histórico / por presidentes… y lo de buscar pasarlo arriba al lado de la configuración y solo con la lupa… que siga el formato de presidentes».

### T1. Filtros chicos (en esta sección; propuesta para el resto del sitio después de verlo)
- Las píldoras de Precios (`ctxr-pildora`) pasan a un chip compacto: 32 px de alto a la vista (área de toque de 44 px con un `::before` invisible, como `.info-btn`), texto `--t-sm`, rótulo apagado y valor en negrita en el mismo renglón, borde fino y fondo de superficie (no el celeste lleno), flecha chica. Ajustes de Precios, un chip igual con ícono de controles. Las píldoras de cada gráfico, igual de chicas y en el renglón del título del gráfico cuando entran.
- Lo mismo para `vistabar-ajustes` solo dentro de `/contexto/` (las otras páginas no cambian hasta que el usuario apruebe la propuesta).

### T2. Tocar de nuevo saca el filtro
- En los tres gráficos, tocar la barra ya elegida vuelve al valor por defecto: Por país → contra por defecto (`pqc` null), Por rubro → rubro por defecto (`pqr` null), Por presidente → período Hoy (`pqa` null). `aria-pressed` ya lo anuncia.

### T3. Orden: Por rubro, Por país, Por presidente
- En las tres columnas y en los botones del celular. `pqv` no cambia de significado (sin parámetro sigue siendo Por país).

### T4. "El mundo" en el menú, con el formato de Presidentes
- `ITEMS_MENU` (`sistema/BarraInferior.tsx`): Inicio, Histórico, Presidentes, **El mundo** (ícono globo; lleva a `/contexto/`; marca activa en las cuatro subpestañas), Más. Buscar sale del menú.
- Buscar: botón de lupa solo con ícono (con `aria-label` "Buscar" y la tecla "/") en la barra de arriba, al lado de Configurar, en la computadora y en el celular.
- En la computadora, "El mundo" abre un menú desplegable con las cuatro subpestañas (como Presidentes) y la fila de subpestañas no se muestra (como Presidentes); en el celular, la fila de subpestañas aparece debajo de la barra (como Presidentes), alineada con el contenido.
- Se borran `subtabs-fija` y el `scroll-padding-top` agregado en la segunda vuelta.
- "Más": si lista las subsecciones de Presidentes, que liste las del mundo igual; sin duplicar.

### Cómo quedó la tercera vuelta (verificado)
Dos subagentes (menú; Precios). Verificado en la vista local: tipos y build; 1280 px (captura): menú Inicio · Histórico · Presidentes · El mundo · Más, El mundo marcado con desplegable de cuatro subpestañas, lupa al lado de Configurar, sin fila de subpestañas; chips de 32 px; orden Por rubro · Por país · Por presidente con los tres gráficos a la misma altura (las píldoras de cada gráfico van siempre en su renglón, ajuste mío al verlo); tocar Brasil dos veces pone y saca `pqc`; 375 px (captura): lupa 44×32 arriba, barra inferior con El mundo, fila de subpestañas como la de Presidentes, botones de vista de 32 px; barrido de 21 rutas a 360 px sin desborde, un h1, con lupa y la sección marcada; la lupa abre el buscador y Escape lo cierra; la barra de arriba entra sin desbordar a 768, 820, 900 y 1000 px. Revisor sin bloqueantes; corregidos el texto de la página de sistema y la separación entre renglones de chips (12 px, para que las áreas de toque no se pisen). Sin verificar: tema claro, celular real, tablet táctil ≥ 768 px (la fila de subpestañas se ve y `--nav-h` no la cuenta; ya pasaba con Presidentes).
Propuesta abierta: llevar los chips compactos (32 px a la vista, 44 px de toque, borde fino) al resto del sitio (Ajustes y píldoras de Presidentes, Ranking, Elecciones, Herencia, Histórico).

Dónde ver la tercera vuelta (local `http://localhost:3100<ruta>`; publicado recién después del push):
6. **Menús**: 6.1 "El mundo" en el menú de arriba y en la barra de abajo, con desplegable — `/contexto/`; 6.2 Buscar como lupa al lado de Configurar — cualquier página.
7. **El mundo y la Argentina**: 7.1 filtros chicos — `/contexto/`; 7.2 tocar de nuevo saca el filtro — `/contexto/?pqc=BRA`; 7.3 orden Por rubro, Por país, Por presidente — `/contexto/`.
