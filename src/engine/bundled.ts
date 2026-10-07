/**
 * Snapshot embebido de la base del modelo (última versión válida conocida en build).
 * Se regenera con `npm run model:base` desde drive/base/base_stresscast.xlsx.
 */
import snapshot from "./bundled-base.json";
import type { ModelBase } from "./types";

export interface BundledSnapshot {
  source: string;
  source_sha256: string;
  data_version: string;
  manifest_version: string;
  base: ModelBase;
}

export const bundledSnapshot = snapshot as unknown as BundledSnapshot;
export const bundledModelBase: ModelBase = bundledSnapshot.base;
