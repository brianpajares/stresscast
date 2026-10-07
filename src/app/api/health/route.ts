import { MODEL_VERSION } from "@/engine/types";
import { getModelBundle } from "@/lib/server/model";
import { features } from "@/lib/server/env";
import { json } from "@/lib/server/http";
import { APP_VERSION } from "@/lib/site";

export const dynamic = "force-dynamic";

/** GET /api/health: estado sin datos sensibles (spec/openapi.yaml). */
export async function GET() {
  let driveCache: "fresh" | "stale_valid" | "unavailable" = "unavailable";
  let modelVersion: string = MODEL_VERSION;
  try {
    const bundle = await getModelBundle();
    driveCache = bundle.meta.cache;
    modelVersion = bundle.engineConfig.version;
  } catch {
    /* si el cargador falla por completo, se informa degradado */
  }
  // `ok` si Drive no está configurado (modo snapshot embebido por diseño) o si la cache es válida.
  const driveConfigured = features().drive;
  const status = driveConfigured && driveCache !== "fresh" ? "degraded" : "ok";
  return json({ status, app_version: APP_VERSION, model_version: modelVersion, drive_cache: driveCache });
}
