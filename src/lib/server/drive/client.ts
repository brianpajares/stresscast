import "server-only";
import { getEnv } from "../env";
import type { DriveConfig } from "./client-core";

export * from "./client-core";

export function driveConfigFromEnv(): DriveConfig | null {
  const e = getEnv();
  if (!e.GOOGLE_SERVICE_ACCOUNT_EMAIL || !e.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || !e.GOOGLE_DRIVE_FOLDER_ID) return null;
  return {
    email: e.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // Los proveedores serializan los saltos de línea como `\n` literales.
    privateKey: e.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
    rootFolderId: e.GOOGLE_DRIVE_FOLDER_ID,
  };
}
