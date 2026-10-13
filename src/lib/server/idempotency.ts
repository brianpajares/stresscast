import "server-only";
import { Redis } from "@upstash/redis";
import { getEnv } from "./env";

/**
 * Reclamo idempotente de claves cuando NO hay base de datos (modo stateless): evita duplicar el email de
 * entrega ante reintentos. Con Upstash es distribuido (SET NX EX); sin él, es memoria por instancia (mejor esfuerzo).
 * Devuelve `true` si esta llamada es la primera en reclamar la clave.
 */
const memory = new Map<string, number>();
let redis: Redis | null = null;

export async function claimKey(scope: string, key: string, ttlSeconds = 86_400): Promise<boolean> {
  const full = `sc:idem:${scope}:${key}`;
  const e = getEnv();
  if (e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN) {
    try {
      redis ??= new Redis({ url: e.UPSTASH_REDIS_REST_URL, token: e.UPSTASH_REDIS_REST_TOKEN });
      return (await redis.set(full, "1", { nx: true, ex: ttlSeconds })) === "OK";
    } catch {
      /* cae a memoria */
    }
  }
  const now = Date.now();
  for (const [k, exp] of memory) if (exp < now) memory.delete(k);
  if (memory.has(full)) return false;
  memory.set(full, now + ttlSeconds * 1000);
  return true;
}
