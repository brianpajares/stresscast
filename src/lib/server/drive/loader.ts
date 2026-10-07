import { isDeepStrictEqual } from "node:util";
import { calculate } from "@/engine/calculate";
import { parseModelBaseXlsx } from "@/engine/model-base";
import { bundledSnapshot } from "@/engine/bundled";
import type { ModelBase } from "@/engine/types";
import vectors from "@spec/test_vectors.json";
import { APP_ARTIFACTS, relativeDrivePath, type DriveManifest, type DriveManifestFile, driveManifest } from "./manifest";
import { sha256Hex } from "../sha";

/**
 * Cargador de artefactos desde Google Drive (FR-17, FR-18; docs/DRIVE_SETUP.md §5):
 *  1. manifiesto bundled/canónico  2. descargar bytes  3. SHA-256 == manifiesto (si no, RECHAZAR)
 *  4. cache con fetched_at + versión  5. TTL 24 h  6. Drive caído => última versión válida
 *  7. checksum inválido => conservar la última válida, nunca reemplazarla.
 * Capas de último valor válido: memoria → persistencia opcional (Redis) → snapshot embebido en el build.
 */
export type DriveCacheState = "fresh" | "stale_valid" | "unavailable";

export interface BundleMeta {
  source: "drive" | "persisted" | "bundled";
  cache: DriveCacheState;
  manifest_version: string;
  data_version: string;
  fetched_at: string | null;
  checksums: Record<string, string>;
}

export interface ModelBundle {
  base: ModelBase;
  modelCard: string;
  reportTemplate: unknown;
  engineConfig: { model_id: string; version: string; [k: string]: unknown };
  inputsSchema: unknown;
  meta: BundleMeta;
}

export class DriveIntegrityError extends Error {
  constructor(
    readonly file: string,
    readonly reason: "checksum_mismatch" | "missing" | "self_test_failed" | "unexpected_model",
  ) {
    super(`drive_integrity_${reason}:${file}`);
    this.name = "DriveIntegrityError";
  }
}

export interface BundleStore {
  load(): Promise<ModelBundle | null>;
  save(bundle: ModelBundle): Promise<void>;
}

export interface LoaderDeps {
  manifest: DriveManifest;
  /** null => Drive no configurado (se sirve el snapshot embebido). */
  fetchArtifact: ((entry: DriveManifestFile) => Promise<Uint8Array>) | null;
  store: BundleStore | null;
  now: () => number;
  ttlMs: number;
  onAlert?: (code: string, fields?: Record<string, string>) => void;
}

const EXPECTED_MODEL = { model_id: "stresscast_cbi_work_scenario_v1", version: "1.0.0" } as const;

interface VectorCase {
  inputs: Record<string, unknown>;
  expected: unknown;
}

/** Auto-test de seguridad: la base cargada debe reproducir los 20 golden vectors antes de usarse. */
export function baseSelfTest(base: ModelBase): boolean {
  try {
    const cases = (vectors as unknown as { cases: VectorCase[] }).cases;
    return cases.every((c) => isDeepStrictEqual(calculate(c.inputs, base), c.expected));
  } catch {
    return false;
  }
}

function dataVersion(manifest: DriveManifest): string {
  return manifest.files.find((f) => f.file === "base_stresscast.xlsx")?.version ?? "unknown";
}

export function bundledBundle(manifest: DriveManifest = driveManifest): ModelBundle {
  const a = bundledSnapshot.artifacts;
  return {
    base: bundledSnapshot.base,
    modelCard: a.model_card,
    reportTemplate: a.report_template,
    engineConfig: a.engine_config,
    inputsSchema: a.inputs_schema,
    meta: {
      source: "bundled",
      cache: "unavailable",
      manifest_version: manifest.manifest_version,
      data_version: bundledSnapshot.data_version,
      fetched_at: null,
      checksums: Object.fromEntries(manifest.files.filter((f) => f.reader === "app").map((f) => [f.file, f.sha256])),
    },
  };
}

export function createDriveLoader(deps: LoaderDeps) {
  let current: { bundle: ModelBundle; fetchedAtMs: number } | null = null;
  let inflight: Promise<ModelBundle> | null = null;

  async function fetchAndVerify(): Promise<ModelBundle> {
    if (!deps.fetchArtifact) throw new Error("drive_not_configured");
    const bytes: Record<string, Uint8Array> = {};
    const checksums: Record<string, string> = {};
    for (const entry of APP_ARTIFACTS_OF(deps.manifest)) {
      let data: Uint8Array;
      try {
        data = await deps.fetchArtifact(entry);
      } catch (e) {
        if (e instanceof DriveIntegrityError) throw e;
        throw Object.assign(new Error(`drive_fetch_failed:${entry.file}`), { cause: e });
      }
      const hash = sha256Hex(data);
      if (hash !== entry.sha256) throw new DriveIntegrityError(entry.file, "checksum_mismatch");
      bytes[entry.file] = data;
      checksums[entry.file] = hash;
    }

    const text = (name: string) => new TextDecoder().decode(bytes[name]);
    const base = parseModelBaseXlsx(bytes["base_stresscast.xlsx"]);
    const engineConfig = JSON.parse(text("engine_config.json")) as ModelBundle["engineConfig"];
    if (engineConfig.model_id !== EXPECTED_MODEL.model_id || engineConfig.version !== EXPECTED_MODEL.version) {
      throw new DriveIntegrityError("engine_config.json", "unexpected_model");
    }
    if (!baseSelfTest(base)) throw new DriveIntegrityError("base_stresscast.xlsx", "self_test_failed");

    return {
      base,
      modelCard: text("model_card.md"),
      reportTemplate: JSON.parse(text("report_template.json")),
      engineConfig,
      inputsSchema: JSON.parse(text("inputs.schema.json")),
      meta: {
        source: "drive",
        cache: "fresh",
        manifest_version: deps.manifest.manifest_version,
        data_version: dataVersion(deps.manifest),
        fetched_at: new Date(deps.now()).toISOString(),
        checksums,
      },
    };
  }

  async function refresh(): Promise<ModelBundle> {
    try {
      const bundle = await fetchAndVerify();
      current = { bundle, fetchedAtMs: deps.now() };
      try {
        await deps.store?.save(bundle);
      } catch {
        /* la persistencia es opcional */
      }
      return bundle;
    } catch (error) {
      if (error instanceof DriveIntegrityError) {
        // Un checksum/modelo inesperado es CRÍTICO: se rechaza y se conserva la última versión válida.
        deps.onAlert?.(error.reason === "unexpected_model" ? "unexpected_model_version" : "drive_integrity_rejected", {
          file: error.file,
          reason: error.reason,
        });
      } else {
        deps.onAlert?.("drive_unavailable", { reason: error instanceof Error ? error.message.slice(0, 80) : "unknown" });
      }
      const last = current?.bundle ?? (await deps.store?.load().catch(() => null)) ?? null;
      if (last) return { ...last, meta: { ...last.meta, cache: "stale_valid" } };
      return bundledBundle(deps.manifest);
    }
  }

  async function load(): Promise<ModelBundle> {
    if (!deps.fetchArtifact) return bundledBundle(deps.manifest);

    if (current && deps.now() - current.fetchedAtMs < deps.ttlMs) {
      return { ...current.bundle, meta: { ...current.bundle.meta, cache: "fresh" } };
    }

    // Arranque en frío: intenta la persistencia antes de ir a Drive.
    if (!current && deps.store) {
      const persisted = await deps.store.load().catch(() => null);
      const at = persisted?.meta.fetched_at ? Date.parse(persisted.meta.fetched_at) : NaN;
      if (persisted && Number.isFinite(at) && deps.now() - at < deps.ttlMs && persisted.meta.manifest_version === deps.manifest.manifest_version) {
        current = { bundle: persisted, fetchedAtMs: at };
        return { ...persisted, meta: { ...persisted.meta, source: "persisted", cache: "fresh" } };
      }
      if (persisted) current = { bundle: persisted, fetchedAtMs: Number.isFinite(at) ? at : 0 };
    }

    inflight ??= refresh().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  return { load, __state: () => current };
}

function APP_ARTIFACTS_OF(manifest: DriveManifest): DriveManifestFile[] {
  return manifest === driveManifest ? APP_ARTIFACTS : manifest.files.filter((f) => f.reader === "app");
}

export { relativeDrivePath };
