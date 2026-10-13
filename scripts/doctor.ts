/**
 * npm run doctor — revisa la configuración del entorno contra los gates de lanzamiento.
 * Imprime estado y pistas (nunca valores de secretos). Sale con código 1 si hay fallos.
 */
import { runChecks, summarizeChecks } from "../src/lib/doctor-checks";

const checks = runChecks(process.env);
const icon = { ok: "✓", warn: "!", fail: "✗" } as const;
for (const c of checks) {
  console.log(`${icon[c.status]} ${c.label.padEnd(48)} ${c.status.toUpperCase().padEnd(5)} ${c.status === "ok" ? "" : c.hint}`);
}
const s = summarizeChecks(checks);
console.log(`\n${s.ok} ok · ${s.warn} avisos · ${s.fail} fallos`);
process.exit(s.fail > 0 ? 1 : 0);
