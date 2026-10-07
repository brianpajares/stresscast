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

// Artefactos de lectura "app" embebidos como último valor válido (se verifican contra el manifiesto).
function readVerified(file: string, relative: string): Buffer {
  const buf = readFileSync(resolve(root, "drive", relative));
  const expected = manifest.files.find((f) => f.file === file)?.sha256;
  const actual = createHash("sha256").update(buf).digest("hex");
  if (!expected || expected !== actual) {
    console.error(`Checksum de ${file} no coincide con spec/drive_manifest.json.`);
    process.exit(1);
  }
  return buf;
}

const snapshot = {
  source: "drive/base/base_stresscast.xlsx",
  source_sha256: sha256,
  data_version: entry.version,
  manifest_version: manifest.manifest_version,
  base,
  artifacts: {
    model_card: readVerified("model_card.md", "docs/model_card.md").toString("utf8"),
    report_template: JSON.parse(readVerified("report_template.json", "templates/report_template.json").toString("utf8")),
    engine_config: JSON.parse(readVerified("engine_config.json", "model/engine_config.json").toString("utf8")),
    inputs_schema: JSON.parse(readVerified("inputs.schema.json", "model/inputs.schema.json").toString("utf8")),
  },
};
writeFileSync(resolve(root, "src/engine/bundled-base.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`bundled-base.json OK · data_version=${entry.version} · sha256=${sha256.slice(0, 12)}…`);
