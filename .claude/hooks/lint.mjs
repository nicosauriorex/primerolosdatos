// Hook PostToolUse (Edit|Write): corre Ruff o ESLint sobre el archivo recién editado.
// Sin dependencias. Si hay errores, los copia a stderr y sale con 2 para que el agente los vea.
// Si la herramienta no está instalada, o el archivo no es del alcance, sale con 0 sin decir nada.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

let entrada = "";
for await (const trozo of process.stdin) entrada += trozo;

let archivo = "";
try {
  archivo = JSON.parse(entrada.replace(/^﻿/, ""))?.tool_input?.file_path ?? ""; // sin BOM (lo agrega PowerShell 5.1 al pasar texto por tubería)
} catch {
  process.exit(0);
}
if (typeof archivo !== "string" || !archivo) process.exit(0);

// Ruta absoluta con separadores del sistema, y relativa a la raíz con "/".
const absoluta = path.resolve(raiz, archivo.replace(/[\\/]/g, path.sep));
const rel = path.relative(raiz, absoluta).split(path.sep).join("/");
if (rel.startsWith("..") || path.isAbsolute(rel) || !existsSync(absoluta)) process.exit(0);

function terminar(r) {
  if (r.error || r.status === null) process.exit(0); // no se pudo ejecutar: no bloquea
  if (r.status === 0) process.exit(0);
  const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  process.stderr.write(salida);
  process.exit(2);
}

if (/^pipeline\/.+\.py$/.test(rel)) {
  // `python` en Windows y en el workflow; `python3` en un Linux que no tenga `python`.
  const py = ["python", "python3"].find((p) => spawnSync(p, ["-m", "ruff", "--version"], { cwd: raiz, encoding: "utf8" }).status === 0);
  if (!py) process.exit(0); // Ruff no instalado
  terminar(spawnSync(py, ["-m", "ruff", "check", absoluta], { cwd: raiz, encoding: "utf8" }));
} else if (/^web\/(app|components|lib)\/.+\.tsx?$/.test(rel)) {
  const web = path.join(raiz, "web");
  const win = process.platform === "win32";
  const eslint = path.join(web, "node_modules", ".bin", win ? "eslint.cmd" : "eslint");
  if (!existsSync(eslint) || !existsSync(path.join(web, "eslint.config.mjs"))) process.exit(0);
  const relWeb = path.relative(web, absoluta).split(path.sep).join("/");
  // En Windows un .cmd necesita shell: se citan las rutas por los espacios.
  const r = win
    ? spawnSync(`"${eslint}" "${relWeb}"`, { cwd: web, encoding: "utf8", shell: true })
    : spawnSync(eslint, [relWeb], { cwd: web, encoding: "utf8" });
  terminar(r);
}
process.exit(0);
