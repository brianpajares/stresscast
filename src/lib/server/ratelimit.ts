import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getEnv, rateLimitPerMinute } from "./env";
import { pseudonymousKey } from "./http";
import { logOps } from "./log";

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Rate limit por IP pseudónima (FR-28). Upstash Redis cuando está configurado (distribuido);
 * si no, ventana deslizante en memoria por instancia como mejor esfuerzo (no distribuida).
 * Un fallo de Upstash degrada al limitador local en lugar de bloquear el servicio.
 */
const limiters = new Map<string, Ratelimit>();
let redis: Redis | null = null;

function upstash(limit: number, scope: string): Ratelimit | null {
  const e = getEnv();
  if (!e.UPSTASH_REDIS_REST_URL || !e.UPSTASH_REDIS_REST_TOKEN) return null;
  redis ??= new Redis({ url: e.UPSTASH_REDIS_REST_URL, token: e.UPSTASH_REDIS_REST_TOKEN });
  const id = `${scope}:${limit}`;
  let rl = limiters.get(id);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, "60 s"),
      prefix: `sc:rl:${scope}`,
      analytics: false,
    });
    limiters.set(id, rl);
  }
  return rl;
}

const memory = new Map<string, number[]>();

function memoryLimit(key: string, limit: number, now = Date.now()): RateLimitResult {
  const windowMs = 60_000;
  const hits = (memory.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    memory.set(key, hits);
    return { ok: false, limit, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) };
  }
  hits.push(now);
  memory.set(key, hits);
  // Evita crecimiento sin límite en instancias longevas.
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.every((t) => now - t >= windowMs)) memory.delete(k);
  }
  return { ok: true, limit, remaining: limit - hits.length, retryAfterSeconds: 0 };
}

export async function rateLimit(
  req: Request,
  scope: string,
  limit: number = rateLimitPerMinute(),
): Promise<RateLimitResult> {
  const key = pseudonymousKey(req, scope);
  const rl = upstash(limit, scope);
  if (rl) {
    try {
      const r = await rl.limit(key);
      return {
        ok: r.success,
        limit: r.limit,
        remaining: r.remaining,
        retryAfterSeconds: r.success ? 0 : Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)),
      };
    } catch (error) {
      logOps("ratelimit_backend_error", { scope, error: error instanceof Error ? error.name : "unknown" });
    }
  }
  return memoryLimit(key, limit);
}

/** Solo tests. */
export function __resetMemoryLimiter(): void {
  memory.clear();
}

export { memoryLimit as __memoryLimit };
