/**
 * Genera src/engine/bundled-base.json a partir de drive/base/base_stresscast.xlsx.
 * El snapshot es el "último valor válido" embebido en el build: garantiza que la
 * app calcule aunque Google Drive esté caído y nunca haya habido cache.
 *
 * Uso: npm run model:base
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseModelBaseXlsx } from "../src/engine/model-base";

const root = resolve(__dirname, "..");
const xlsxPath = resolve(root, "drive/base/base_stresscast.xlsx");
const manifest = JSON.parse(readFileSync(resolve(root, "spec/drive_manifest.json"), "utf8")) as {
  manifest_version: string;
  files: { file: string; sha256: string; version: string }[];
};

const bytes = new Uint8Array(readFileSync(xlsxPath));
const sha256 = createHash("sha256").update(bytes).digest("hex");
const entry = manifest.files.find((f) => f.file === "base_stresscast.xlsx");
if (!entry || entry.sha256 !== sha256) {
  console.error(`Checksum de base_stresscast.xlsx no coincide con spec/drive_manifest.json (${sha256}).`);
  process.exit(1);
}

const base = parseModelBaseXlsx(bytes);
const snapshot = {
  source: "drive/base/base_stresscast.xlsx",
  source_sha256: sha256,
  data_version: entry.version,
  manifest_version: manifest.manifest_version,
  base,
};
writeFileSync(resolve(root, "src/engine/bundled-base.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`bundled-base.json OK · data_version=${entry.version} · sha256=${sha256.slice(0, 12)}…`);
