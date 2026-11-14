# Remodelación, etapa 3.3: Histórico y Presidentes

Estado: implementada y publicada (2026-11-14, a3de357). Sale de `docs/AUDITORIA-DISENO-2026-11-13.md` (secciones "Histórico" y "Presidentes", C2), D-023 y el sistema de `docs/specs/remodelacion-sistema.md` (componentes en `web/components/sistema/`). Sigue a la etapa 3.2 (`docs/specs/remodelacion-fichas.md`), de la que reutiliza `filasMandatosFicha` y `TablaMandatos`.

## Objetivo
- **Histórico**: que el nombre del dato sea el título de la página (hoy "HISTÓRICO" pesa más que el dato), que las siete comparaciones dejen de repetir la misma frase (dos a la vista y el resto en una tabla compacta) y que la configuración quede detrás de una barra que resume la vista.
- **Presidentes**: que la tabla "Una variable, todos los presidentes" mida lo correcto con las tasas (C2: promedio y acumulada, no la diferencia entre dos meses sueltos), que entre en un celular sin deslizarse (filas apiladas de `TablaMandatos`) y sumar una grilla de presidentes × datos clave que se lee como tabla de posiciones.
- **Links viejos**: todo link compartido de `/historico/` y `/presidentes/` sigue abriendo lo mismo, con todos sus parámetros (`v`, `v2…v4`, `d`, `h`, `ms`, `f`, `ag`, `m`, `e`, `bd`, `ej`, `r`, `t`, `pf`, `pl`, `pn`; `pv`, `pr`, `cl`, `pvista`, `pap`, `pam`, `pam2`, `pav`, `t0`/inicio de mandato). Ningún parámetro cambia de significado.

## Requisitos

### Histórico (vista simple: un solo gráfico)

#### H1. El dato es el título (`Historico.tsx`, `Nav.tsx`)
- En `/historico/` la cabecera de página (`CabeceraPagina`) muestra "Histórico" como sobretítulo chico (`<p className="cab-sobre">`, voz `--v-rotulo`), no como `h1`. Las demás páginas no cambian (un conjunto `SIN_H1 = new Set(["historico"])` en `Nav.tsx`).
- La vista simple abre con `CabeceraDato` (nivel 1): título = el de la plantilla si la vista viene de una (`simple.titulo`), si no `tituloGrafico(...)`; cifra y fecha del contexto (`contextoDato`, como hoy, "· Último dato disponible" si corresponde); `info` con la descripción y la fuente de la primera variable. Con más de una variable o base 100, la cifra se reemplaza por la leyenda de hoy (`vs-leyenda`: punto de color, nombre, último valor) dentro de `children` del encabezado, y el título sigue siendo el h1.
- La línea de temporalidad (`textoTemporalidad`) queda debajo del título, en gris chico.
- La vista con 2 a 4 gráficos (`total > 1`) no cambia de diseño en esta etapa, pero tiene un h1 visualmente oculto ("Histórico: N gráficos") para que la página no quede sin h1.

#### H2. Comparaciones: dos a la vista y el resto en tabla (`Historico.tsx`, `lib/historico.ts`)
- De `comparacionesCabecera(...)` (sin cambiar sus cuentas), las de clave `anterior` (período anterior) y `anio` (un año atrás) van como `Delta` en `deltas` de `CabeceraDato`: valor de la diferencia con su unidad (p.p. en tasas, % en niveles, como `fraseUltimoVs`), tono `bueno/malo/neutro` = `cls`, y `contra: "vs <fecha>"`. Si una de las dos no existe, va la que haya.
- Las demás (inicio del período, promedio, mediana, máximo, mínimo) van en un plegable "Más comparaciones" (`<details className="hi-mas">`, cerrado por defecto) con una tabla compacta de 3 columnas: **Contra** (título y fecha si la hay) · **Valor** (`m.fmtC`) · **Diferencia** (la parte numérica de la frase, con su color y signo). Una fila por comparación, sin frases repetidas. A 360 px entra sin deslizar.
- Si hay varias variables, el rótulo "Comparaciones de: <nombre>" queda arriba de los deltas, como hoy.
- Para no repetir lo mismo dos veces: la frase de contexto (`ctx.frases`) que diga lo mismo que un delta no se muestra (hoy ya se pasa `sinContraAnio`/`sinRecord`; sumar lo que haga falta para el período anterior). Queda como `frase` de `CabeceraDato` solo la primera frase restante.

#### H3. BarraVista y la hoja de ajustes (`Historico.tsx`)
- Debajo de la cabecera, `BarraVista` con chips que resumen la vista: período ("2003 – oct 2026" o "oct 2025 – oct 2026"; con meses sueltos, "· Ene, Jul"), frecuencia ("Mensual" / "Trimestral, promedio" / "Anual, cierre"…), "Tabla" si `t=tabla`, "Base 100" si `m=b100`, "Escala log." si `e=log`. Solo lo que no es obvio: el período y la frecuencia siempre; lo demás solo si está activo.
- Tocar un chip o "Ajustes" abre la ventana de Personalizar, que pasa de `Modal` a `Hoja` (abajo en el celular, al costado en la computadora; cruz, Atrás y Escape como toda `Hoja`). Tocar un chip abre la hoja con su sección desplegada (período → "Fechas"; frecuencia, tabla, base 100, escala → "Opciones del gráfico"). El contenido de la hoja es el de hoy (`ContenidoPers`: Variable, Fechas, Opciones del gráfico, Guardar y compartir; "Volver a lo de fábrica" y "Listo" al pie). Quien cierra la hoja antes de cambiar de pantalla sigue cerrando antes (`cerrarAntes`, D-016).
- El botón "Personalizar" de abajo del gráfico se saca (lo reemplaza "Ajustes"). Quedan debajo del gráfico "Presidentes" (franjas, `pf`, como hoy) y "Compartir".

#### H4. El gráfico sin caja y Gráficos listos (`Historico.tsx`)
- La tarjeta del gráfico de la vista simple (`card card-simple`) deja de tener caja con borde: el gráfico va suelto, con la nota (unidad y fuente) y "Expandir" debajo, como hoy.
- Debajo, un `Capitulo` "Gráficos listos con este dato" (h2) con hasta 6 plantillas curadas que usan la primera variable (`p.ids` incluye su id), en `Laminas`/`Lamina` con `evaluar`, y el link "Ver todos los gráficos listos" a `/plantillas/?q=<nombre>`. Igual que el capítulo 6 de la ficha (`FichaDato.tsx`): reutilizar ese código (moverlo a un componente común `web/components/GraficosListos.tsx` y usarlo en los dos lugares). Si no hay plantillas o hay más de una variable, no aparece.
- Con base 100 sigue el "Resumen (de mayor a menor)" debajo, como hoy.

### Presidentes

#### P1. Cálculos (`web/lib/presidentes.ts`, nuevo; sin React)
- `tablaPresidentes(m, e, b, o: { presIds: Set<string>; cl: string[] | null })`: arma lo que necesita `TablaMandatos` a partir de `filasMandatosFicha(m, e, b)` (`lib/ficha.ts`) y le suma:
  - Columnas extra siempre disponibles en "Sumar columnas": **Meses** (`st.n`) y, para una tasa, **Cambio** (cierre − inicio en puntos, `variacionMostrada`, con el tono de `claseVariacion`; es la "variación" de hoy, que deja de ser la principal: C2).
  - Filtra las filas a `presIds` (parámetro `pr`, como hoy).
  - **Columnas pedidas por el link** (`cl`, claves de `COLS`: `ini, fin, var, min, max, prom, med, n`): si `cl` está, las visibles son la principal más las de `cl` que existan para esa serie (`var` en una tasa = "Cambio"). Sin `cl`, las de `filasMandatosFicha` (tasa: Inicio, Cierre, Promedio; nivel: Inicio, Cierre, Variación).
- `GRILLA_DATOS`: la lista fija de 8 datos clave de la grilla, cada uno con el slug de `DATOS_FIJOS` y la métrica que muestra, en este orden: Inflación (`inflacion-mensual`, **acumulada** del mandato), Salario (`salario-mediano-real`, variación), Dólar blue (`dolar-blue`, variación), Actividad (`actividad-economica`, variación), Desocupación (`desocupacion`, cambio en p.p.), Pobreza (`pobreza`, cambio en p.p.), Reservas (`reservas`, variación), Riesgo país (`riesgo-pais`, variación). Si un slug no existe en `S`, la columna no aparece.
- `grillaPresidentes(m, b, S)`: `{ columnas: { slug, nombre, metrica: "Acumulada" | "Variación" | "Cambio", unidad }[], filas: { pres: Pres; celdas: { texto, valor, tono: "bueno" | "malo" | null, href, desde?: string }[] }[] }`, una fila por presidente con datos en al menos una columna, del más nuevo al más viejo.
  - Variación y Cambio: los de `filasMandatosFicha` / `variacionMostrada` (las cuentas cierran con lo que se muestra), tono por `claseVariacion` (`dir` de la serie). Acumulada (inflación): `acumulada(...)` de `lib/ficha.ts`, con tono `malo` si es mayor que la mediana de los presidentes de la columna y `bueno` si es menor (redondeadas como se muestran; igual a la mediana = sin tono). La leyenda lo dice.
  - `texto` con signo ("+12,3 %", "−4,1 p.p.", nunca "−0,0"); `desde` cuando los datos de la serie empiezan después del inicio del mandato ("desde 2016").
  - `href`: la ficha del dato con el presidente marcado: `hrefFijo(slug, { pd: <id del presidente> })`.
- La carga de datos: la grilla necesita los archivos de esas 8 series (`useSeccion` ya carga `"todo"` en Presidentes).

#### P2. "Una variable, todos los presidentes" con `TablaMandatos` (`Presidentes.tsx`, `TablaMandatos.tsx`)
- La tabla actual (`CeldasStats`, `Cabecera`, 9 columnas, marcas "mejor/peor") se reemplaza por `TablaMandatos` con `tablaPresidentes(...)`: en el celular, filas apiladas (nombre y período a la izquierda, la principal grande a la derecha, lo demás debajo); en la computadora, la tabla con la barra divergente en la principal.
- `TablaMandatos` suma, sin cambiar su uso actual en la ficha:
  - `elegidas?: string[]` y `onElegidas?: (claves: string[]) => void` (columnas sumadas controladas desde afuera). En `/presidentes/` escriben el parámetro `cl` (con las claves de `COLS`; "Cambio" se escribe `var`), así un link con `cl` abre las mismas columnas. Sin estas props, el estado es local como hoy.
  - `nota?: ReactNode`: una línea bajo la tabla.
- La bajada del bloque dice qué mide: tasa → "Inicio y cierre de cada mandato y el promedio de todos sus meses"; nivel → "Del inicio al cierre de cada mandato". El párrafo largo de colores y barras se reemplaza por una sola línea: "Verde = mejoró y rojo = empeoró; el signo también está escrito." (sin dirección: "Sin verde ni rojo: subir o bajar no es ni bueno ni malo en sí mismo."). En montos corrientes, la nota de hoy de que los niveles no se comparan.
- Tabla · Velas como `FilaChips` (parámetro `pvista`, como hoy). Las velas no cambian.
- **Compartir** comparte lo que se ve: tabla de una tasa → `{ tipo: "barras", ..., metrica: "prom" }` (como la ficha); tabla de un nivel → igual que hoy; velas → igual que hoy. El orden de las barras es el de las filas.
- Los presidentes (`pr`) y el inicio de mandato (`LineaInicio`) se eligen desde una `BarraVista` del bloque con chips "N de M presidentes" (o "Todos los presidentes") y "Inicio: <texto corto de la base>", que abren una `Hoja` "Presidentes" con el `Seg` de presidentes de hoy (y "Todos"/"Ninguno" si ya existe algo así). El `VentanaConfig` "Presidentes y columnas" de arriba de todo se saca (las columnas se suman desde la tabla misma).
- `CeldasStats`, `Cabecera`, `comparativaDe` y compañía siguen existiendo para la tabla "Un presidente, todas las variables", que no cambia en esta etapa (ver "Fuera").

#### P3. Grilla de presidentes × datos clave (`web/components/sistema/GrillaPresidentes.tsx`, nuevo)
- Bloque nuevo, el primero de la página: `Capitulo` "Todos los presidentes, de un vistazo" (h2) con bajada "Cómo cambió cada dato clave en cada mandato. Tocá una celda para ver el dato." y la `LineaInicio` de la página.
- Tabla real (`<table>`, con `caption` oculto para lectores): filas = presidentes (nombre corto con su raya de color, como `TablaMandatos`; período en gris chico), columnas = los datos de `grillaPresidentes` con el nombre y la métrica debajo en gris ("Inflación / acumulada"). Primera columna fija al deslizar (dentro de su contenedor: la página nunca se desliza de costado).
- Cada celda: el texto con signo, fondo suave del tono (`color-mix` de `--bueno`/`--malo` con transparencia; sin tono = sin fondo) y el texto en color de texto (contraste AA en los dos temas). Es un link a `href` de 44 px de alto como mínimo; `aria-label` "<Dato> con <Presidente>: <texto>". Celda sin dato: "—" sin link.
- `desde`: una marca chica (`*`) y una nota al pie que la explica por columna ("Desocupación: datos desde 2003").
- Leyenda en una línea bajo la tabla: "Verde = mejoró y rojo = empeoró en el mandato. Inflación: verde si quedó por debajo de la mediana de los presidentes."
- Compartir: link (la grilla no tiene imagen en esta etapa; ver "Fuera").
- Entra a 360 px: celdas de ancho mínimo 72 px, la tabla se desliza dentro de su contenedor con fundido a la derecha.

#### P4. Orden de la página `/presidentes/`
1. h1 "Por presidente" (el de `CabeceraPagina`, como hoy).
2. Grilla (P3).
3. "Una variable, todos los presidentes" (P2), como `Capitulo` (h2), sin `.card`.
4. "Un presidente, todas las variables" como hoy, pero como `Capitulo` (h2) sin `.card`.
- Sin cajas con borde alrededor de los bloques.

### CSS (`web/app/globals.css`)
- Clases nuevas con prefijo `hi-` (Histórico) y `gp-` (grilla) o `pres-` (página de presidentes); buscar antes con grep que no existan. Tokens del sistema (voces `--v-*`, colores, espacios), sin colores fijos. Cada bloque nuevo va al final del archivo bajo un comentario con el nombre de la etapa.
- Se borra el CSS que quede sin uso por estos cambios (por ejemplo `.vs-comps*` si nada más lo usa), solo después de comprobar con grep.

## Fuera de esta etapa
- La vista con 2 a 4 gráficos del Histórico (barra de período fija, resumen en celdas): solo el h1 oculto.
- La tabla "Un presidente, todas las variables" (grupos, buscador, Mis variables): sigue con su tabla, sin `.card`.
- Imagen para compartir de la grilla.
- Animación de barras que crecen de a una y "tocar un presidente para ver su recorrido".

## Cómo se verifica
- `npm run tipos` y `npm run build`.
- **Links viejos del Histórico** (cada uno abre lo mismo que antes, sin errores de consola): `/historico/` (inflación mensual), `/historico/?v=<salario>&d=2015-01&h=2023-12&f=A&ag=cierre`, `?ms=1,7`, `?m=b100&v=<dos variables>`, `?t=tabla`, `?e=log`, `?r=prom,med`, `?pf=0`, `?pl=<plantilla>&pn=<nombre>` (título de la plantilla como h1), `?v=a&v2=b` (vista de 2 gráficos con h1 oculto).
- Histórico: un solo h1 con el nombre del dato; los dos deltas con los mismos números que las comparaciones de hoy (período anterior y año atrás); "Más comparaciones" con inicio, promedio, mediana, máximo y mínimo sin frases repetidas; cada chip de la `BarraVista` abre la hoja en su sección; Escape, cruz y Atrás cierran la hoja; "Volver a lo de fábrica" sigue andando; Gráficos listos con la inflación.
- **Links viejos de Presidentes**: `/presidentes/?pv=<inflación>&pr=macri,milei&cl=ini,fin,var,n` (2 filas, columnas Inicio, Cierre, Cambio y Meses además de Promedio), `?pvista=velas`, `?pap=macri&pam=usd`, `?pam2=mis&pav=…`, `#congreso` (sigue yendo a `/congreso/`).
- Cuentas: en `/presidentes/` con la inflación mensual, Inicio, Cierre y Promedio iguales a `/dato/inflacion-mensual/`; Acumulada de Milei igual a la de la ficha (354,0 % el 2026-11-13, o la que dé con los datos del día); con el salario, Variación igual a la de hoy. Grilla: cada celda igual a la principal de la tabla de ese dato en `/presidentes/` (o a la Acumulada, en la inflación); la mediana de la inflación contada a mano.
- Imagen de compartir de la tabla con la inflación (barras de promedio) y con el salario (variación).
- `/historico/` y `/presidentes/` a 360, 390 y 1280 px, tema oscuro y claro: sin desplazamiento horizontal de la página, sin errores de consola, objetivos de 44 px, un solo h1.
- Portada (arreglos de la misma tanda, ver abajo): a 1280 px los cinco chips de "Ir directo a" en un renglón; al escribir "a" en el buscador la lista se abre encima de la página sin moverla (la posición de lo que está debajo no cambia) y se cierra al salir del buscador.
- `impeccable detect` y agente `revisor`.

## Arreglos de la portada (pedido del usuario, 2026-11-14)
- **"Ir directo a"** en la computadora: el rótulo va arriba de los chips y los cinco entran en un renglón (antes "Riesgo país" quedaba solo abajo).
- **Buscador de la portada**: la lista de resultados (y el aviso de "no encontramos") se abre como una capa encima de la página, sin empujarla (`Buscador` con `flotante`), con alto máximo y deslizamiento propio; se cierra al salir del buscador. El buscador global (hoja a pantalla completa) no cambia.
