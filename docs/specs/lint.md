# Lint: Ruff en el pipeline y ESLint en la web

Estado: implementada (2026-11-17)

## Objetivo

Que los errores que hoy aparecen recién al correr (un nombre mal escrito en el pipeline, una dependencia que falta en un hook de React) o que dependen de que alguien se acuerde de una regla (números con `formato.ts`, nada de `<select>` nativo) los marque una herramienta. Se marcan en el momento en que un agente edita el archivo y otra vez en el workflow, antes de publicar.

## Medición previa (2026-11-17)

Medido con Ruff 0.17.5 y ESLint 9 + `eslint-plugin-react-hooks` 5, instalados aparte (no en el proyecto):

- **Ruff** (`F`, `E722`): 2 variables sin usar (F841). No hay nombres sin definir ni `except:` vacíos. Los 12 `except Exception` (BLE001) quedan afuera a propósito: son caídas al respaldo de `datos/cache/`.
- **Hooks**: 0 `rules-of-hooks`. Hay 4 `exhaustive-deps`: `components/GraficoDiario.tsx:27`, `components/secciones/Inicio.tsx:259` y `:288`, y `components/secciones/Plantillas.tsx:147`. Además hay comentarios `eslint-disable` que ya no hacen nada (DatosProvider:82, Movimiento:77, Historico:89, Inicio:259/288, Mandato:120, Plantillas:147) y dos que nombran reglas que no existen en esta configuración (`@next/next/no-img-element` en PanelCompartir:265 y `@typescript-eslint/no-unused-vars` en `lib/gasto.ts:354`).
- **Formato de números fuera de `lib/formato.ts`**: hay 4 casos: `Herencia.tsx:63` (`toLocaleString`), `Inicio.tsx:56` (`nf2`, repite el de `formato.ts`), `lib/diario.ts:401` (igual a `nfDec`) y `lib/provinciasAlicuotas.ts:80` (`nfA`).
- **Descartado tras medir**: no se prohíbe `toFixed`, porque los 15 usos son coordenadas de dibujo (SVG, alturas en %) y no números que se muestran. Tampoco hay regla para `title=`: los 22 usos son legítimos (texto cortado, botones) y el lint no puede saber si un `title` muestra el valor de una barra. Esa regla (R32) la sigue cuidando el `revisor`.

## Qué ve y hace el usuario

Nada cambia en el sitio: los números de Herencia, Inicio, Banco Central y Provincias se siguen viendo igual.

1. Un agente (sesión principal o subagente) edita un `.py` del pipeline o un `.ts`/`.tsx` de `web/`. El hook corre el lint de ese archivo y, si hay errores, el agente los recibe en el momento.
2. Antes de un commit se corren `npm run lint` (en `web/`) y `python -m ruff check pipeline`.
3. En GitHub Actions, si el código pushado tiene un error de lint, la corrida falla en un paso "Revisar código" antes de bajar datos y no se publica nada.

## Requisitos

### Ruff (pipeline)

1. `ruff.toml` en la raíz: `target-version = "py314"`, `include = ["pipeline/**/*.py"]` y `lint.select = ["F", "E722"]`. Nada de formateo (`ruff format` no se usa).
2. Ruff fijado en `ruff==0.17.5`, en un archivo nuevo `requirements-dev.txt` (no en `requirements.txt`, que es lo que necesita el pipeline para correr).
3. Las 2 F841 se corrigen (se borra la variable o se usa, según el caso). Al terminar, `python -m ruff check pipeline` sale sin errores.

### ESLint (web)

4. Dependencias de desarrollo en `web/package.json`: `eslint@^9`, `@typescript-eslint/parser` (solo el parser) y `eslint-plugin-react-hooks@^5`.
   **Al implementar:** typescript-eslint 8 no acepta TypeScript 7: pide `typescript <6.1` y falla al cargarse. Se resolvió así:
   - `@typescript/typescript6` (la API de TypeScript 6 que publica Microsoft) como dependencia de desarrollo;
   - al principio de `eslint.config.mjs`, el `require("typescript")` de los paquetes `@typescript-eslint/*` y `ts-api-utils` se redirige a ese paquete (con `Module._resolveFilename`);
   - `web/.npmrc` con `legacy-peer-deps=true`, para que `npm ci` no falle por el peer.

   `tsc` y `npm run tipos` siguen con TypeScript 7. Es frágil ante cambios de versión de typescript-eslint: si el lint se rompe por eso, sale con error en el workflow y en el hook (no pasa en silencio). Cuando typescript-eslint acepte TypeScript 7, se saca todo esto.
5. `web/eslint.config.mjs` (configuración plana) para `app/`, `components/` y `lib/` (`.ts` y `.tsx`). Quedan afuera `scripts/`, `functions/`, `out/`, `.next/` y `node_modules/`. No se activa ningún conjunto "recommended": solo las reglas de esta lista.
6. `react-hooks/rules-of-hooks` y `react-hooks/exhaustive-deps` en `error`.
7. `linterOptions.reportUnusedDisableDirectives: "error"`: se borran los `eslint-disable` que ya no hacen nada y los dos que nombran reglas inexistentes.
8. Las 4 `exhaustive-deps` se corrigen sin cambiar el comportamiento. Si sumar la dependencia cambia cuándo corre el efecto (por ejemplo, porque `cargar` es una función nueva en cada render), se resuelve con `useCallback` o con un `eslint-disable-next-line react-hooks/exhaustive-deps -- <por qué>`, y la razón es obligatoria. Cada caso se anota en el informe con la solución elegida.
   **Al implementar**, los cuatro casos se resolvieron con `eslint-disable-next-line` y su motivo. Ninguno llevó `useCallback`, porque eso tocaba `DatosProvider`:
   - `GraficoDiario.tsx`: `periodo` es un objeto nuevo en cada render; manda `clavePeriodo`.
   - `Inicio.tsx`, filas de tema y destacadas: `cargar` y `archivosDe` cambian con `version`, y sumarlos volvería a pedir archivos. Además, `clave` resume a `lista`.
   - `Plantillas.tsx`: el buscador toma el texto de la URL una sola vez, al montar.

   Los tres comentarios viejos estaban dentro de un `/* */` en la misma línea y no hacían efecto.
9. Script `"lint": "eslint app components lib --max-warnings 0"` en `web/package.json`.

### Reglas propias (`no-restricted-syntax`, en `error`)

Cada mensaje está en español y dice qué usar en su lugar.

10. **Sin `<select>` nativo**: `JSXOpeningElement[name.name="select"]`. Mensaje: usar `Selector`, `Seg` o `Desplegable` de `components/ui.tsx`.
11. **Números solo con `lib/formato.ts`**: se marcan `CallExpression[callee.property.name="toLocaleString"]` y `NewExpression` de `Intl.NumberFormat`, en todo el alcance salvo `lib/formato.ts` (excepción por `files`). No se tocan `toLocaleDateString` ni `toLocaleTimeString`.
12. Los 4 casos medidos pasan a `formato.ts`. `Inicio.nf2` y `diario.ts:401` usan `nf2` y `nfDec(dec)`. `provinciasAlicuotas.nfA` y `Herencia.fmtUS` usan una función existente de `formato.ts` que dé el mismo texto o, si no hay, una nueva exportada desde ahí. El texto que se ve tiene que ser idéntico: mismos decimales, mismo signo «−».
13. **Sin colores hex en JSX**: un color hex (`#rgb`, `#rrggbb`, `#rrggbbaa`) en los atributos que llevan color (`style`, `fill`, `stroke`, `color`, `stopColor`…), también dentro de un texto más largo (`"1px solid #ccc"`, un degradado). Ajuste del revisor: al principio era cualquier atributo, y eso marcaba `href="#cafe"`. Mensaje: usar las variables CSS (`--series-N`, tokens de `globals.css`). El dibujo en canvas fuera de JSX no se marca (por ejemplo, el respaldo `"#8a9…"` de `Grafico.tsx:390`).

### Workflow

14. En `.github/workflows/actualizar.yml`, un paso nuevo "Revisar código" después de `setup-node` y **antes** de "Bajar datos". Corre en los dos modos (`sitio` y completo) y hace `pip install -r requirements-dev.txt`, `python -m ruff check pipeline` y `cd web && npm ci && npm run lint`. Si falla, la corrida termina ahí: no baja datos, no commitea y no publica.
15. Como `npm ci` pasa a este paso, se saca del paso "Compilar el sitio" (no se instala dos veces).

### Agentes

16. Hook `PostToolUse` en `.claude/settings.json` (matcher `Edit|Write`) que corre `node .claude/hooks/lint.mjs`. El script:
    - lee el JSON de stdin y toma `tool_input.file_path`;
    - si es un `.py` dentro de `pipeline/`, corre `python -m ruff check <archivo>`;
    - si es un `.ts`/`.tsx` dentro de `web/app`, `web/components` o `web/lib`, corre `web/node_modules/.bin/eslint <archivo>` con `cwd` en `web/`;
    - en cualquier otro caso, o si Ruff o ESLint no están instalados, sale con 0 sin decir nada;
    - si hay errores, los escribe en stderr y sale con 2, así el agente los ve.

    Funciona en Windows (rutas con `\` y con espacios: la carpeta es `Datos argentina`) y en Linux.
17. Documentación:
    - en `CLAUDE.md` (Comandos), `python -m ruff check pipeline`, `cd web && npm run lint` y `pip install -r requirements-dev.txt`;
    - en `.claude/rules/frontend.md`, la línea "Tras cualquier cambio" pasa a `npm run tipos && npm run lint && npm run build`;
    - en `.claude/rules/pipeline.md`, una línea con `python -m ruff check pipeline`;
    - en `.claude/rules/frontend.md`, una nota de que las reglas de `<select>`, números y colores las controla el lint (`web/eslint.config.mjs`).
18. Decisión ya registrada como D-028 en `docs/DECISIONES.md`; al implementar, solo actualizarla si algo cambia.

## Datos

No hay datos nuevos. Archivos nuevos: `ruff.toml`, `requirements-dev.txt`, `web/eslint.config.mjs` y `.claude/hooks/lint.mjs`.

## Casos borde

- **Un push con un error de lint frena también la actualización diaria de datos**: la corrida programada usa el mismo código. Se acepta: el aviso llega por la corrida en rojo y se arregla con un push. No se separa el lint en otro workflow.
- **Un push que solo toca `docs/` o `CLAUDE.md`** no dispara el workflow (sigue igual). Hoy un push que solo toque `ruff.toml` o `requirements-dev.txt` no dispararía nada: se agregan los dos al filtro `paths` del workflow y a la lista de modo completo, para que un cambio de reglas se pruebe en la corrida.
- **Hook sin dependencias instaladas** (sesión nueva, sin `npm ci` ni Ruff): no bloquea ni da error. El control queda a cargo del workflow.
- **El hook en archivos de `web/scripts/` o `web/functions/`**: no corre (están fuera del alcance de la regla 5).
- **`eslint-disable` nuevos**: solo `eslint-disable-next-line <regla> -- <motivo>`, con motivo. Los que no hacen falta los marca la regla 7.

## Fuera de alcance

- Formateo automático (Prettier, `ruff format`) y reglas de estilo.
- `typescript-eslint` recomendado, reglas de Next (`@next/next/*`) y accesibilidad (`jsx-a11y`): se pueden sumar después, con una medición previa como esta.
- Prohibir `toFixed` y controlar `title=` (descartados al medir; ver arriba).
- Lint de `web/scripts/` y `web/functions/`.
- `except Exception` en el pipeline (BLE001).

## Cómo se verifica

1. `pip install -r requirements-dev.txt && python -m ruff check pipeline` sale con 0.
2. `cd web && npm ci && npm run lint && npm run tipos && npm run build` sale sin errores.
3. Cada regla propia marca un caso de prueba: en un archivo temporal de `web/components/` (se borra después), un `<select>`, `(1).toLocaleString()`, `new Intl.NumberFormat()` y `style={{ color: "#fff" }}`. `npm run lint` marca los 4 con su mensaje en español. Un `toFixed(1)` y un `toLocaleDateString()` no se marcan.
4. El hook se prueba editando un `.py` con un nombre sin definir y un `.tsx` con un `<select>`: el agente recibe el error. Después se deshace la edición. Un archivo de `docs/` no dispara nada.
5. Números iguales antes y después, comparando en el navegador (vista `web-out`) el texto de las cifras:
   - `/herencia/`: columna en dólares de la tabla;
   - portada `/`: la cifra con dos decimales de Inicio;
   - `/bcra/`: cifras del parte;
   - la sección de Provincias con alícuotas.
6. Después del push, la corrida muestra el paso "Revisar código" en verde. No se fuerza una corrida en rojo en `main`.

## Dónde ver los cambios

En el sitio no cambia nada que se vea; los renglones del sitio son para comprobar que los números siguen iguales. Página con casillas: `docs/cambios/lint.html` (Artifact). Local: `http://localhost:3100<ruta>`. Publicado: `https://primerolosdatos.com.ar<ruta>`, después del push y la corrida en verde.

1. **Portada**
   - 1.1 Cifras abreviadas en millones con `nf2` de `formato.ts`: `/#mas-buscados`. Agregado por mí (regla de números).
2. **Presidentes · Herencia**
   - 2.1 Cuenta de reservas netas con `nf0`: `/herencia/`. Agregado por mí.
3. **Provincias**
   - 3.1 Alícuotas y su diferencia con `nfHasta2`: `/provincias/?vista=cuentas`. Agregado por mí.
4. **Banco Central**
   - 4.1 Eje de los gráficos con `nfDec`: `/bcra/`. Agregado por mí.
   - 4.2 El mismo eje en el semáforo: `/semaforo/`. Agregado por mí.
5. **Fuera del sitio**
   - 5.1 Paso «Revisar código» en la corrida de GitHub Actions. Pediste: «paso en actualizar.yml…».
   - 5.2 Ruff. Pediste: «Ruff en pipeline/».
   - 5.3 ESLint con hooks. Pediste: «ESLint en web/ con rules-of-hooks y exhaustive-deps».
   - 5.4 Reglas propias. Pediste: «reglas propias con no-restricted-syntax».
   - 5.5 Hook al editar. Elegido en la entrevista.

## Verificación (2026-11-17)

- `python -m ruff check pipeline`: 0.
- `npm ci` (desde cero) + `npm run lint` + `npm run tipos` + `npm run build`: 0.
- Reglas propias: los casos de prueba marcan `<select>`, `toLocaleString`, `new Intl.NumberFormat` y hex en `style`/`fill`, también dentro de un texto. No marcan `toFixed`, `toLocaleDateString`, `href="#cafe"` ni `data-x="#add"`.
- Hook:
  - frena con rc 2 un `.py` con F821 y un `.tsx` con errores (rutas relativas y absolutas de Windows);
  - deja pasar con 0 lo limpio y lo fuera de alcance;
  - probado también dentro de una sesión real de Claude Code: devolvió el F821 al escribir el archivo.
- Formatos viejos contra nuevos: 20.012 números, 0 diferencias.
- Texto de `/`, `/bcra/`, `/semaforo/` y `/provincias/?vista=cuentas`: idéntico antes y después. En `/herencia/` la única diferencia fue el botón «Volver», que depende de cómo se llegó a la página.
- Revisor: sin problemas graves. Se corrigieron:
  - el selector de hex (atributos de color y dentro de textos);
  - `python3` como alternativa en el hook;
  - la expresión de barras del hook;
  - la desviación de TS 7 y las soluciones de hooks anotadas acá y en D-028.

  Quedaron sin tocar, a propósito: `toLocaleString` también marca fechas (hoy no hay usos) y dos `eslint-disable` viejos sin motivo en Inicio y Plantillas (la regla de motivo es solo para los nuevos).
- Sin verificar: la corrida de GitHub Actions con el paso nuevo (después del push).
