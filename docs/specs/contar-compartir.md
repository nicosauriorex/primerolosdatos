# Contar los Compartir y preguntar por qué

Estado: implementada (2026-11-16), publicada en 26eec12 (corrida completa en verde, run 43913974906); sin la base D1 todavía: `/api/compartir` responde 503 (requisito 8)
Ideas: Contar los Compartir y preguntar por qué (2026-11-15)

Pedido del usuario (2026-11-16): «Spec de 9a»; sobre la pregunta: «tras cada acción pero que se pueda habilitar y deshabilitar». Lo demás sale de las opciones recomendadas: cuenta cada acción que sale bien y los números los ve solo el usuario por ahora.

## Objetivo
Saber qué datos y vistas comparte la gente y por qué, para decidir qué mejorar y qué contenido empujar. Es el primer backend del sitio, el mínimo posible: una función de Cloudflare Pages en el mismo dominio y una base D1, en el plan gratis (D-025). Deja armada la base para las predicciones (9c). Sin datos personales, y si el servicio falla, la página sigue igual.

## Qué ve y hace el usuario
1. Comparte algo como siempre: imagen (compartir, descargar o copiar), link, texto o tabla.
2. Si la acción salió bien (no si canceló o falló), el sitio la anota en segundo plano. No ve nada distinto, salvo lo del paso 3.
3. Junto con el aviso de siempre («Imagen descargada», «Link copiado»…) aparece abajo una tira chica: «¿Por qué lo compartís?» con seis botones: **Es bueno**, **Es malo**, **Mejoró**, **Empeoró**, **Curiosidad**, **Otro**, más un link **No preguntar más**.
4. Si toca un botón, la tira dice «Gracias» y se va (1,5 s). Si no toca nada, se va sola a los 8 s. Con Escape o la cruz, se va sin respuesta.
5. **No preguntar más** apaga la pregunta y la tira avisa «Listo. Podés volver a activarla en Configuración» (3 s).
6. En **Configuración**, un grupo nuevo «Compartir» con «Preguntar por qué compartís»: Sí / No (por defecto Sí) y una línea: «Contamos cuántas veces se comparte cada dato y vista, sin guardar quién sos.»
7. El dueño del sitio ve los números con un comando local (`npm run conteos`).

## Requisitos

### Base y función (servidor)
1. **Base D1** `pld-compartir`, con la migración `web/db/0001_compartidos.sql` (tabla de la sección Datos). `web/wrangler.toml` del proyecto de Pages `duelo-de-datos` con `pages_build_output_dir = "out"`, el enlace `DB` a esa base y `migrations_dir = "db"`.
2. **`POST /api/compartir`** (`web/functions/api/compartir.ts`): recibe `{ id, accion, ruta, vista?, dato?, formato?, celular }`, valida y guarda una fila. Responde 204. Validación, si algo no cumple responde 400 sin guardar:
   - `id`: UUID v4 (regex).
   - `accion`: una de la lista de Datos.
   - `ruta`: empieza con `/`, máx. 120 caracteres, sin `?` ni `#`.
   - `vista`: máx. 500 caracteres; `dato`: máx. 80; `formato`: `1x1` | `4x5` | `16x9` | null; `celular`: booleano.
   - Cuerpo de más de 2 KB: 413.
   - Encabezado `Origin` distinto de `https://primerolosdatos.com.ar`, `https://*.duelo-de-datos.pages.dev` o `http://localhost:8788`: 403.
   - Un `id` repetido no duplica (`INSERT OR IGNORE`).
3. **`POST /api/compartir/porque`** (`web/functions/api/compartir/porque.ts`): recibe `{ id, porque }` y hace `UPDATE … SET porque = ? WHERE id = ? AND porque IS NULL AND creado >= <hace 2 horas>`. Responde 204 aunque no actualice nada; 400 si `porque` no está en la lista. Mismas reglas de origen y tamaño que el anterior.
4. **Ninguna** de las dos funciones guarda la IP, el user agent, cookies ni encabezados. `creado` se guarda **redondeado a la hora** (UTC, `AAAA-MM-DDTHH:00Z`). Ninguna pone cookies.
5. Cualquier otro método o ruta bajo `/api/` responde 405 o 404. El resto del sitio se sigue sirviendo estático como hoy: comprobar que `/`, `/dato/<slug>/` y una ruta inexistente (404 de Next) se ven igual que antes.
6. Las funciones tienen su propio `web/functions/tsconfig.json` con `@cloudflare/workers-types` (devDependency). El `tsconfig.json` de la web excluye `functions`, para que `npm run tipos` y `npm run build` no cambien. Un `npm run tipos:funciones` las chequea.

### Publicación (workflow)
7. En `.github/workflows/actualizar.yml`:
   - Antes de publicar, un paso «Migraciones de la base»: `d1 migrations apply pld-compartir --remote` con `workingDirectory: web`. Es idempotente, así que corre siempre.
   - El paso de publicar pasa a `workingDirectory: web` con `command: pages deploy out --project-name=duelo-de-datos --branch=main`, para que tome `functions/` y `wrangler.toml`.
   - El modo rápido (solo `web/`) también publica las funciones.
8. **Una sola vez, a mano** (lo hace el usuario o la sesión principal con su OK):
   - `npx wrangler login`.
   - `npx wrangler d1 create pld-compartir` y copiar el `database_id` a `web/wrangler.toml`.
   - Si la corrida falla por permisos, agregar «D1: Edit» a la clave `CLOUDFLARE_API_TOKEN` en el panel de Cloudflare.

   Queda escrito en el encabezado de `web/wrangler.toml` y en `docs/ESTADO.md` (Herramientas).

### Navegador
9. **`web/lib/conteo.ts`**: `contarCompartir({ accion, dato?, formato?, href? })`:
   - Arma `id = crypto.randomUUID()`, `ruta = location.pathname` y `vista`: la query del link que se comparte (`href`) o, si no hay, `location.search`, sin el `?`.
   - Manda el POST con `fetch(…, { method: "POST", keepalive: true, headers: { "content-type": "application/json" } })`, sin `await`, y traga cualquier error: no escribe en la consola ni muestra nada.
   - Después emite el evento `pld:compartido` con `{ id }` en `window`, **solo si la configuración `preguntarPorque` es verdadera**.
   - `contarPorque(id, porque)` hace el segundo POST igual.
10. **Solo manda** si `location.hostname` es `primerolosdatos.com.ar`, termina en `.duelo-de-datos.pages.dev`, o es `localhost` con puerto `8788` (`wrangler pages dev`). En la vista `web-out` (puerto 3100) no manda nada, pero la tira **sí** aparece, para poder verla. Así no hay errores 404 en la consola de los barridos.
11. **Qué se cuenta**: cada vez que una de estas acciones devuelve éxito. Buscar todas las llamadas con `grep` sobre `compartir(`, `compartirImagen(`, `copiarImagen(`, `descargarImagen(`, `copiarTexto(` y `copiarY(` (hoy: `PanelCompartir`, `CompartirHoja`, `PanelGasto`, `PanelParte`, `PanelSemaforo`, `PreciosMundo`, `Historico`, `Plantillas`, `BarraPlantilla`, `BotonLink`). En cada una, llamar a `contarCompartir` con la acción que corresponde:

    | Resultado | `accion` |
    |---|---|
    | `compartirImagen` → «compartida» | `imagen_compartida` |
    | `descargarImagen` → «descargada» | `imagen_descargada` |
    | `copiarImagen` → «copiada» | `imagen_copiada` |
    | `compartir` (link) → «compartido» | `link_compartido` |
    | `compartir` (link) → «copiado», o el «Link» de `CompartirHoja` | `link_copiado` |
    | texto del dato copiado | `texto` |
    | «Copiar la tabla» | `tabla` |

    `dato` es el id de la serie o el slug de la página cuando el componente lo tiene (ficha, Histórico con una serie, `/bcra/` = `bcra`, `/semaforo/` = `semaforo`, gasto, precios del mundo con el rubro); si no, va vacío. Con «cancelado» o «error» no se cuenta ni se pregunta. Abrir el panel o la hoja de Compartir **no** cuenta. Si alguna llamada no es un compartir (por ejemplo, copiar algo interno), dejarla sin contar y decirlo en el informe.
12. **`web/components/sistema/PreguntaPorque.tsx`**, montado una sola vez en `web/app/layout.tsx`: escucha `pld:compartido` y muestra la tira del paso 3.
    - Fija abajo, centrada, encima de la barra inferior del celular (respetar `safe-area-inset-bottom` y la altura de esa barra) y por encima de los modales de compartir (`z-index` mayor que el del modal).
    - Tokens del sistema visual («La Transmisión», D-011) y botones `.chip-c` (R24).
    - `role="status"`. **No** se lleva el foco: se llega con Tab. Escape cierra si el foco está adentro.
    - No entra en el historial (D-016): no la cierra Atrás.
    - Un evento nuevo mientras está abierta la reemplaza con el `id` nuevo y reinicia los 8 s.
    - Con el cursor encima o el foco adentro, los 8 s no corren.
    - Con `prefers-reduced-motion`, aparece sin animación.
13. **Configuración**: campo nuevo `preguntarPorque: boolean` en `Config` (`web/lib/config.ts`, `DEFECTO` en `true`). La validación de una configuración guardada vieja lo completa con `true` sin perder lo demás (`VERSION` sube solo si la validación lo necesita). Grupo «Compartir» en la ventana de Configuración (`ConfigProvider.tsx`) con el texto del paso 6. «No preguntar más» escribe `false` en la misma configuración.
14. Todo texto en español, con voseo como el resto del sitio.

### Para ver los números
15. **`web/scripts/conteos.mjs`** (`npm run conteos`; `--dias N`, por defecto 30): corre `npx wrangler d1 execute pld-compartir --remote --json --command …` y muestra en la terminal, con números es-AR:
    - total y por día de los últimos N días;
    - por acción;
    - las 20 rutas + vista más compartidas;
    - por dato, la cantidad y el reparto de porqués (con «sin respuesta»);
    - el porcentaje que contesta la pregunta.

    Necesita `npx wrangler login` una vez; si falta, lo dice en una línea en vez de un error largo.

## Datos

`web/db/0001_compartidos.sql`:

```sql
CREATE TABLE IF NOT EXISTS compartidos (
  id      TEXT PRIMARY KEY,   -- UUID del navegador; solo une el porqué con su acción
  creado  TEXT NOT NULL,      -- UTC redondeado a la hora: 2026-11-16T15:00Z
  accion  TEXT NOT NULL,      -- imagen_compartida | imagen_descargada | imagen_copiada | link_compartido | link_copiado | texto | tabla
  ruta    TEXT NOT NULL,      -- /dato/inflacion/
  vista   TEXT,               -- query del link compartido, sin «?» (dato, vista, período, moneda…)
  dato    TEXT,               -- id de serie o slug, si se conoce
  formato TEXT,               -- 1x1 | 4x5 | 16x9 (solo imágenes)
  celular INTEGER NOT NULL,   -- 1 si el ancho de pantalla es < 768 px
  porque  TEXT                -- bueno | malo | mejoro | empeoro | curiosidad | otro; NULL = sin respuesta
);
CREATE INDEX IF NOT EXISTS compartidos_creado ON compartidos (creado);
CREATE INDEX IF NOT EXISTS compartidos_dato ON compartidos (dato);
```

Nada en el navegador fuera de la configuración que ya existe (`pld:config`): no hay id de visitante. El plan gratis de D1 (5 GB, 100.000 escrituras por día) alcanza con margen. Una fila pesa unos 300 bytes.

## Casos borde
- **Sin conexión, bloqueador de anuncios o la función caída:** el `fetch` falla en silencio y compartir funciona igual. La tira aparece igual, porque depende de la configuración y no del servidor. El porqué se pierde sin aviso.
- **Doble toque en Descargar:** son dos acciones, dos filas. Es aceptable.
- **El usuario cierra la pestaña enseguida:** `keepalive` deja que el pedido termine.
- **`navigator.share` en el celular:** el resultado llega cuando se cierra el menú del sistema; la tira aparece después, no encima del menú.
- **Respuesta tardía (más de 2 horas) o segunda respuesta al mismo id:** no se guarda (requisito 3).
- **Alguien manda pedidos a mano:** pasan la validación pero pueden inflar los números. Se acepta en esta etapa (no hay premio por inflarlos). Si pasa, se agrega la regla gratis de límite de pedidos de Cloudflare sobre `/api/` o Turnstile (que llega con 9c).
- **Configuración guardada antes de este cambio:** pregunta (`true`) y no pierde lo demás.
- **Vista `web-out` (puerto 3100):** la tira se ve y no se manda nada (requisito 10).
- **D-012 (sin veredicto):** la pregunta es sobre la intención de quien comparte; el sitio no muestra ni usa esas respuestas para calificar un dato.

## Fuera de alcance
- Página pública o renglón «lo más compartido» en el sitio: se decide cuando haya volumen.
- Contar visitas, clics u otra cosa que no sea compartir.
- Turnstile, cuentas, panel de administración y borrado de filas.
- Una opción para no ser contado: no se guarda nada personal. Si el usuario la pide después, va como `contar: false` en la configuración.
- Pasar el sitio a OpenNext/Workers (D-002 sigue: export estático + funciones de Pages).

## Cómo se verifica
1. `cd web && npm run tipos && npm run tipos:funciones && npm run build`, sin errores.
2. Local con las funciones:
   ```
   cd web && npx wrangler d1 migrations apply pld-compartir --local && npx wrangler pages dev out --port 8788
   ```
   En `http://localhost:8788` hacer cada acción de la tabla del requisito 11 en `/dato/inflacion/`, `/historico/`, `/bcra/`, `/semaforo/`, `/gasto/` y precios del mundo. Después:
   ```
   npx wrangler d1 execute pld-compartir --local --command "select accion, ruta, vista, dato, formato, celular, porque, creado from compartidos order by rowid desc limit 20"
   ```
   Tiene que haber una fila por acción, con `creado` redondeado a la hora y el porqué elegido.
3. Cancelar el menú del sistema (o simular «error»): no hay fila ni tira.
4. `curl` contra 8788:
   - origen ajeno → 403;
   - `accion` inventada → 400;
   - cuerpo de 3 KB → 413;
   - `GET /api/compartir` → 405;
   - un porqué sobre un id ya contestado no cambia la fila.
5. En la pestaña de red: el POST no lleva cookies y la respuesta no pone ninguna. En la tabla no hay ninguna columna con IP ni user agent.
6. La tira:
   - aparece con cada acción y se va a los 8 s;
   - con el cursor encima no se va;
   - Escape la cierra;
   - en 375 px queda encima de la barra inferior sin taparla;
   - «No preguntar más» la apaga y Configuración muestra «No»;
   - con «No» sigue contando (hay fila) y no aparece;
   - con «Sí» vuelve.
7. En `web-out` (3100): la tira aparece y la consola no muestra errores de red (barrido del navegador).
8. Después del push:
   - la corrida en verde, con el paso de migraciones;
   - una descarga real en `https://primerolosdatos.com.ar/dato/inflacion/`;
   - `npm run conteos -- --dias 1` la muestra.

## Cómo se verificó (2026-11-16)
- `npm run tipos`, `npm run tipos:funciones` y `npm run build` sin errores.
- `npm run funciones` (vista `web-funciones`, `wrangler pages dev` en 8788 con D1 local):
  - con `curl`: 204 al guardar, 204 sin duplicar con el mismo id, 403 sin origen o con origen ajeno, 400 con acción o porqué inventado, 413 con 3 KB, 405 con GET y 404 en `/api/otra`;
  - un segundo porqué no pisa al primero;
  - ninguna respuesta lleva `set-cookie`;
  - `/`, `/dato/actividad-economica/` y `/historico/` dan 200.
- En el navegador:
  - Link copiado → fila `link_copiado` con el porqué «mejoro».
  - Imagen descargada → fila con el id de la serie, `1x1` y `celular` 1.
  - Texto copiado con la pregunta apagada → fila sin tira.
  - «No preguntar más» y Configuración (Sí / No) funcionan.
  - A 375 px la tira queda 12 px sobre la barra inferior, con fondo opaco y sin desborde.
  - Escape con el foco en la tira la cierra sin cerrar la ventana de compartir.
  - Sin errores en la consola.
- Sin verificar: menú del sistema real en el celular (`imagen_compartida`, `link_compartido`), envío en el sitio publicado y `npm run conteos` contra la base remota (todavía no existe).
- Revisor: primera pasada marcó el workflow sin red de seguridad si falta la base, límites de largo que perdían filas, el comentario huérfano y Escape que cerraba también el modal; corregido.

## Dónde ver los cambios
Página: `docs/cambios/contar-compartir.html`. En local hace falta la vista `web-funciones` (`cd web && npm run build && npm run funciones`, puerto 8788); en la de siempre (3100) la tira aparece pero no se guarda nada. En el sitio, después del commit, el push y la corrida en verde; para que se guarde, además, crear la base (requisito 8).

1. **Menús**
   - 1.1 Configuración → grupo «Compartir»: «Preguntar por qué compartís» Sí / No. Ruta: `/` (abrir Configuración). Pediste: «tras cada accion pero que se pueda habilitar y deshabilitar».
2. **Histórico**
   - 2.1 «Copiar la tabla» se cuenta. Ruta: `/historico/`. Agregado por mí: todo lo que se comparte se cuenta.
3. **Ficha del dato**
   - 3.1 La tira «¿Por qué lo compartís?» después de cada acción. Ruta: `/dato/actividad-economica/`. Pediste: lo mismo que en 1.1.
   - 3.2 «No preguntar más» en la misma tira. Pediste: lo mismo que en 1.1.
   - 3.3 Cada compartir que sale bien se anota, sin datos personales. Pediste (idea del 2026-11-15): «Contar cada vez que alguien aprieta "Compartir" en un gráfico».
4. **Presidentes y precios contra el mundo**
   - 4.1 Las imágenes se cuentan con su dato o su tipo de vista. Ruta: `/presidentes/`. Agregado por mí: para saber qué vista interesa.
5. **Gasto, Semáforo y Banco Central**
   - 5.1 Las imágenes también se cuentan. Ruta: `/bcra/`. Agregado por mí: regla general.
