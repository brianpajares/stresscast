import "server-only";
import { Redis } from "@upstash/redis";
import { getEnv } from "../env";
import { driveManifest } from "./manifest";
import type { BundleStore, ModelBundle } from "./loader";

/**
 * Persistencia opcional (Upstash Redis) de la última versión VÁLIDA del bundle: sobrevive a arranques en
 * frío entre instancias serverless. Solo se escribe tras verificar checksum + auto-test, por eso se confía al leer.
 */
export function redisBundleStore(): BundleStore | null {
  const e = getEnv();
  if (!e.UPSTASH_REDIS_REST_URL || !e.UPSTASH_REDIS_REST_TOKEN) return null;
  const redis = new Redis({ url: e.UPSTASH_REDIS_REST_URL, token: e.UPSTASH_REDIS_REST_TOKEN });
  const key = `sc:model-bundle:${driveManifest.manifest_version}`;
  return {
    async load() {
      const v = await redis.get<ModelBundle | string>(key);
      if (!v) return null;
      return (typeof v === "string" ? JSON.parse(v) : v) as ModelBundle;
    },
    async save(bundle) {
      await redis.set(key, JSON.stringify(bundle));
    },
  };
}
