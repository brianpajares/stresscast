import "server-only";
import { features } from "../env";
import { sharedMemoryStore } from "./memory";
import { SupabaseStore, supabaseServiceClient } from "./supabase";
import type { ReportStore } from "./types";

let supabaseStore: SupabaseStore | null = null;

/**
 * Resuelve el store activo:
 *  - STORE_DRIVER=memory (solo desarrollo/E2E; en producción exige ALLOW_MEMORY_STORE=true) => memoria.
 *  - Supabase configurado => Postgres con RLS.
 *  - Nada configurado => null (modo demostración sin base de datos: enlaces stateless).
 */
export function getStore(): ReportStore | null {
  if (process.env.STORE_DRIVER === "memory" && (process.env.NODE_ENV !== "production" || process.env.ALLOW_MEMORY_STORE === "true")) {
    return sharedMemoryStore();
  }
  if (features().supabase) {
    supabaseStore ??= new SupabaseStore(supabaseServiceClient());
    return supabaseStore;
  }
  return null;
}

export type { ReportStore } from "./types";
