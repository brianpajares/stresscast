import manifestJson from "@spec/drive_manifest.json";

export interface DriveManifestFile {
  file: string;
  drive_path: string;
  purpose: string;
  format: string;
  reader: "app" | "build";
  sha256: string;
  version: string;
}

export interface DriveManifest {
  app_slug: string;
  root: string;
  manifest_version: string;
  generated_at: string;
  files: DriveManifestFile[];
}

/**
 * Manifiesto canónico BUNDLED (DRIVE_SETUP §5.1): el checksum esperado vive en el repositorio,
 * no en Drive. Un cambio de artefacto exige nueva versión de manifiesto + checksum + deploy.
 */
export const driveManifest = manifestJson as DriveManifest;

export const APP_ARTIFACTS: DriveManifestFile[] = driveManifest.files.filter((f) => f.reader === "app");

/** Ruta relativa a la carpeta raíz de la app (`/Apps/stresscast/`). */
export function relativeDrivePath(entry: DriveManifestFile, manifest: DriveManifest = driveManifest): string {
  const root = manifest.root.endsWith("/") ? manifest.root : `${manifest.root}/`;
  if (!entry.drive_path.startsWith(root)) {
    throw new Error(`drive_path fuera de la raíz del manifiesto: ${entry.drive_path}`);
  }
  return entry.drive_path.slice(root.length);
}
