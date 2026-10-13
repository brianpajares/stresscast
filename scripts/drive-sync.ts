/**
 * npm run drive:sync — sube drive/ a GOOGLE_DRIVE_FOLDER_ID conservando la jerarquía (FR-19, docs/DRIVE_SETUP.md §4).
 *
 *  - Autentica con la service account (GOOGLE_SERVICE_ACCOUNT_EMAIL / _PRIVATE_KEY).
 *  - Crea carpetas faltantes y sube/actualiza SOLO los archivos del manifiesto (spec/drive_manifest.json).
 *  - Verifica el SHA-256 local contra el manifiesto ANTES de subir y descarga para verificar DESPUÉS.
 *  - No borra nada remoto (no existe modo --prune): los archivos ajenos al manifiesto se respetan.
 *  - Sale con código != 0 ante cualquier discrepancia.
 *
 * Flags: --dry-run (solo muestra el plan).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DriveClient } from "../src/lib/server/drive/client-core";
import { driveManifest, relativeDrivePath } from "../src/lib/server/drive/manifest";

const MIME: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  md: "text/markdown",
  json: "application/json",
};

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

async function main() {
  const dry = process.argv.includes("--dry-run");
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const folder = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const root = resolve(__dirname, "..");

  // 1) Integridad local primero: nada se sube si el repo no coincide con el manifiesto.
  const plan = driveManifest.files.map((entry) => {
    const rel = relativeDrivePath(entry);
    const bytes = new Uint8Array(readFileSync(resolve(root, "drive", rel)));
    const actual = sha(bytes);
    if (actual !== entry.sha256) {
      console.error(`✗ ${entry.file}: checksum local ${actual.slice(0, 12)}… != manifiesto ${entry.sha256.slice(0, 12)}…`);
      process.exit(1);
    }
    return { entry, rel, bytes };
  });
  console.log(`✓ ${plan.length}/${plan.length} checksums locales coinciden con spec/drive_manifest.json`);

  if (dry) {
    for (const p of plan) console.log(`  [dry-run] ${driveManifest.root}${p.rel}`);
    return;
  }
  if (!email || !key || !folder) {
    console.error("Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_DRIVE_FOLDER_ID.");
    process.exit(2);
  }

  const drive = new DriveClient({ email, privateKey: key.replace(/\\n/g, "\n"), rootFolderId: folder }, { write: true });
  for (const { entry, rel, bytes } of plan) {
    const parts = rel.split("/");
    const name = parts.pop() as string;
    let parent = drive.rootFolderId;
    for (const dir of parts) parent = (await drive.ensureFolder(parent, dir)).id;
    const uploaded = await drive.upsertFile(parent, name, bytes, MIME[entry.format] ?? "application/octet-stream");
    const back = await drive.download(uploaded.id);
    if (sha(back) !== entry.sha256) {
      console.error(`✗ ${entry.file}: el contenido remoto no coincide tras la subida`);
      process.exit(1);
    }
    console.log(`✓ ${driveManifest.root}${rel}  (sha256 ${entry.sha256.slice(0, 12)}… verificado)`);
  }
  console.log(`\nDrive sincronizado: ${plan.length}/${plan.length} archivos verificados · manifest ${driveManifest.manifest_version}`);
}

main().catch((e) => {
  console.error("drive:sync falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
