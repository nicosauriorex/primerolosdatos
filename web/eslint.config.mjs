// Lint de la web: solo hooks de React y tres reglas propias (ver docs/specs/lint.md). No hay conjunto "recommended".
import Module from "node:module";
import reactHooks from "eslint-plugin-react-hooks";

// El proyecto usa TypeScript 7 (sin la API de JavaScript que necesita el parser) y typescript-eslint pide TypeScript < 6.1.
// Solución de Microsoft: el parser carga la API de TypeScript 6 (`@typescript/typescript6`, devDependency) en lugar de `typescript`.
// `tsc` y `npm run tipos` siguen usando TypeScript 7.
const resolverOriginal = Module._resolveFilename;
Module._resolveFilename = function (pedido, padre, ...resto) {
  if (pedido === "typescript" && /typescript-eslint|ts-api-utils/.test(padre?.filename ?? "")) pedido = "@typescript/typescript6";
  return resolverOriginal.call(this, pedido, padre, ...resto);
};
const { default: parser } = await import("@typescript-eslint/parser");

const HEX = "#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})";

const SIN_SELECT = {
  selector: 'JSXOpeningElement[name.name="select"]',
  message: "No usar <select> nativo: usar Selector, Seg o Desplegable de components/ui.tsx.",
};
const SOLO_FORMATO = [
  {
    selector: 'CallExpression[callee.property.name="toLocaleString"]',
    message: "No formatear números con toLocaleString: usar nf0, nf1, nf2, nfDec(n) o fmtNum de lib/formato.ts.",
  },
  {
    selector: 'NewExpression[callee.object.name="Intl"][callee.property.name="NumberFormat"]',
    message: "No crear Intl.NumberFormat fuera de lib/formato.ts: usar nf0, nf1, nf2, nfDec(n) o fmtNum (o agregar el formato ahí).",
  },
];
// Solo en los atributos que llevan color (así `href="#cafe"` no se marca), y también dentro de un texto más largo ("1px solid #ccc").
const ATRIB_COLOR = "JSXAttribute[name.name=/^(style|fill|stroke|color|stopColor|floodColor|lightingColor)$/]";
const SIN_HEX = [
  {
    selector: `${ATRIB_COLOR} Literal[value=/${HEX}\\b/]`,
    message: "No poner colores hex en JSX: usar las variables CSS (--series-N, tokens de globals.css).",
  },
  {
    selector: `${ATRIB_COLOR} TemplateElement[value.cooked=/${HEX}\\b/]`,
    message: "No poner colores hex en JSX: usar las variables CSS (--series-N, tokens de globals.css).",
  },
];

export default [
  { ignores: ["out/**", ".next/**", "node_modules/**", "scripts/**", "functions/**"] },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    languageOptions: {
      parser: parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "no-restricted-syntax": ["error", SIN_SELECT, ...SOLO_FORMATO, ...SIN_HEX],
    },
  },
  {
    // formato.ts es la única fuente de los formatos de número: acá sí se puede (un bloque nuevo reemplaza la lista entera).
    files: ["lib/formato.ts"],
    rules: { "no-restricted-syntax": ["error", SIN_SELECT, ...SIN_HEX] },
  },
];
