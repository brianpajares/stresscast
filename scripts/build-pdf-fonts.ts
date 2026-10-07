/**
 * Genera src/lib/pdf/fonts.generated.ts: Inter (OFL) embebida como data URL para @react-pdf/renderer.
 * Embebemos las fuentes (en vez de leer del disco en runtime) para que el PDF funcione igual en
 * serverless sin depender del tracing de archivos. Inter cubre “−”, “—”, “…” y los acentos ES/PT.
 *
 * Uso: npm run pdf:fonts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const weights = [400, 600, 700] as const;
const lines = [
  "/* Generado por scripts/build-pdf-fonts.ts — no editar a mano. Inter © Rasmus Andersson, SIL OFL 1.1. */",
  "export const INTER_WOFF_BASE64 = {",
];
for (const w of weights) {
  const file = resolve(root, `node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff`);
  lines.push(`  ${w}: "${readFileSync(file).toString("base64")}",`);
}
lines.push("} as const;", "");
writeFileSync(resolve(root, "src/lib/pdf/fonts.generated.ts"), lines.join("\n"));
console.log("fonts.generated.ts OK");
