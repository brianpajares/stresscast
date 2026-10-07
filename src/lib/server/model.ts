import "server-only";
import { calculate } from "@/engine/calculate";
import type { CalculationResult } from "@/engine/types";
import { createDriveLoader, type ModelBundle } from "./drive/loader";
import { DriveClient, driveConfigFromEnv } from "./drive/client";
import { driveManifest, relativeDrivePath, type DriveManifestFile } from "./drive/manifest";
import { redisBundleStore } from "./drive/redis-store";
import { driveCacheTtlMs } from "./env";
import { alertOps } from "./alerts";

let loader: ReturnType<typeof createDriveLoader> | null = null;

function driveFetcher(): ((entry: DriveManifestFile) => Promise<Uint8Array>) | null {
  const cfg = driveConfigFromEnv();
  if (!cfg) return null;
  const client = new DriveClient(cfg);
  return async (entry) => {
    const file = await client.resolveFile(relativeDrivePath(entry, driveManifest));
    if (!file) throw new Error(`drive_missing:${entry.file}`);
    return client.download(file.id);
  };
}

function getLoader() {
  loader ??= createDriveLoader({
    manifest: driveManifest,
    fetchArtifact: driveFetcher(),
    store: redisBundleStore(),
    now: () => Date.now(),
    ttlMs: driveCacheTtlMs(),
    onAlert: alertOps,
  });
  return loader;
}

/** Bundle de artefactos validado (Drive con checksum → última válida → snapshot embebido). */
export function getModelBundle(): Promise<ModelBundle> {
  return getLoader().load();
}

/** Cálculo oficial del servidor: motor determinista sobre la base vigente. */
export async function calculateWithBundle(inputs: unknown): Promise<{ result: CalculationResult; bundle: ModelBundle }> {
  const bundle = await getModelBundle();
  return { result: calculate(inputs, bundle.base), bundle };
}
