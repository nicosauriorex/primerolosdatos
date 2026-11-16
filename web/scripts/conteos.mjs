// Muestra en la terminal los conteos de compartidos (base D1 pld-compartir, remota).
// Uso: npm run conteos [-- --dias N]   (por defecto 30). Necesita `npx wrangler login` una vez.
import { spawnSync } from "node:child_process";

const num = new Intl.NumberFormat("es-AR");
const pct = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

function argDias() {
  const i = process.argv.indexOf("--dias");
  const n = i >= 0 ? Number(process.argv[i + 1]) : 30;
  return Number.isInteger(n) && n > 0 && n <= 3650 ? n : 30;
}
const dias = argDias();

function consulta(sql) {
  const r = spawnSync("npx", ["wrangler", "d1", "execute", "pld-compartir", "--remote", "--json", "--command", sql], {
    encoding: "utf8",
    shell: true,
    cwd: new URL("..", import.meta.url),
  });
  const salida = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  if (r.status !== 0) {
    if (/not authenticated|wrangler login|CLOUDFLARE_API_TOKEN|authentication/i.test(salida))
      fallar("Wrangler no está logueado: corré `npx wrangler login` (una vez) y probá de nuevo.");
    if (/PENDIENTE-wrangler-d1-create|database_id/i.test(salida))
      fallar("Falta el database_id real en web/wrangler.toml (ver el encabezado del archivo).");
    fallar("No se pudo consultar la base: " + (salida.trim().split("\n").filter(Boolean).slice(-1)[0] ?? "error desconocido"));
  }
  try {
    const ini = r.stdout.indexOf("[");
    const json = JSON.parse(r.stdout.slice(ini));
    return json[0]?.results ?? [];
  } catch {
    fallar("La respuesta de wrangler no se pudo leer.");
  }
}

function fallar(msg) {
  console.error(msg);
  process.exit(1);
}

function tabla(titulo, filas, cols) {
  console.log(`\n${titulo}`);
  if (!filas.length) return console.log("  (sin datos)");
  for (const f of filas) console.log("  " + cols.map((c, i) => (i === 0 ? String(c(f)).padEnd(34) : String(c(f)).padStart(8))).join(" "));
}

const desde = `datetime('now', '-${dias} days')`;
const donde = `creado >= strftime('%Y-%m-%dT%H:00Z', ${desde})`;

const total = consulta(`SELECT COUNT(*) AS n, SUM(porque IS NOT NULL) AS contestados FROM compartidos WHERE ${donde}`)[0] ?? { n: 0, contestados: 0 };
console.log(`Compartidos de los últimos ${num.format(dias)} días: ${num.format(total.n)}`);
if (total.n) console.log(`Contestan la pregunta: ${num.format(total.contestados ?? 0)} (${pct.format(((total.contestados ?? 0) / total.n) * 100)} %)`);

tabla(
  "Por día",
  consulta(`SELECT substr(creado,1,10) AS dia, COUNT(*) AS n FROM compartidos WHERE ${donde} GROUP BY dia ORDER BY dia DESC`),
  [(f) => f.dia, (f) => num.format(f.n)],
);
tabla(
  "Por acción",
  consulta(`SELECT accion, COUNT(*) AS n FROM compartidos WHERE ${donde} GROUP BY accion ORDER BY n DESC`),
  [(f) => f.accion, (f) => num.format(f.n)],
);
tabla(
  "Las 20 rutas + vista más compartidas",
  consulta(
    `SELECT ruta || CASE WHEN vista IS NULL THEN '' ELSE '?' || vista END AS rv, COUNT(*) AS n FROM compartidos WHERE ${donde} GROUP BY rv ORDER BY n DESC LIMIT 20`,
  ),
  [(f) => (f.rv.length > 33 ? f.rv.slice(0, 32) + "…" : f.rv), (f) => num.format(f.n)],
);

console.log("\nPor dato (cantidad y porqués)");
const datos = consulta(
  `SELECT COALESCE(dato, '(sin dato)') AS dato, COUNT(*) AS n,
     SUM(porque = 'bueno') AS bueno, SUM(porque = 'malo') AS malo, SUM(porque = 'mejoro') AS mejoro,
     SUM(porque = 'empeoro') AS empeoro, SUM(porque = 'curiosidad') AS curiosidad, SUM(porque = 'otro') AS otro,
     SUM(porque IS NULL) AS sin
   FROM compartidos WHERE ${donde} GROUP BY dato ORDER BY n DESC LIMIT 30`,
);
if (!datos.length) console.log("  (sin datos)");
for (const f of datos) {
  const partes = [
    ["es bueno", f.bueno],
    ["es malo", f.malo],
    ["mejoró", f.mejoro],
    ["empeoró", f.empeoro],
    ["curiosidad", f.curiosidad],
    ["otro", f.otro],
    ["sin respuesta", f.sin],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k} ${num.format(v)}`);
  console.log(`  ${String(f.dato).padEnd(34)} ${num.format(f.n).padStart(6)}  ${partes.join(", ")}`);
}

// Predicciones (bloque 9c): por ronda, cantidad, mediana y cuántas se cambiaron. Si la tabla no existe todavía, se omite.
console.log("\nPredicciones");
const filasPred = consultaOpcional("SELECT ronda, valor, cambiado IS NOT NULL AS cambio FROM predicciones ORDER BY ronda DESC, valor");
if (!filasPred || !filasPred.length) console.log("  (sin datos)");
else {
  const porRonda = new Map();
  for (const f of filasPred) {
    if (!porRonda.has(f.ronda)) porRonda.set(f.ronda, []);
    porRonda.get(f.ronda).push(f);
  }
  for (const [ronda, filas] of porRonda) {
    const v = filas.map((f) => f.valor).sort((a, b) => a - b);
    const m = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
    const cambiadas = filas.filter((f) => f.cambio).length;
    console.log(`  ${ronda.padEnd(34)} ${num.format(v.length).padStart(6)}  mediana ${pct.format(m)} %, cambiadas ${num.format(cambiadas)}`);
  }
}

function consultaOpcional(sql) {
  const r = spawnSync("npx", ["wrangler", "d1", "execute", "pld-compartir", "--remote", "--json", "--command", sql], {
    encoding: "utf8",
    shell: true,
    cwd: new URL("..", import.meta.url),
  });
  if (r.status !== 0) return null;
  try {
    return JSON.parse(r.stdout.slice(r.stdout.indexOf("[")))[0]?.results ?? [];
  } catch {
    return null;
  }
}
