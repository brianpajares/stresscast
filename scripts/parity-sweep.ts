/**
 * Gate de paridad Python <-> TypeScript sobre las 78.125 combinaciones válidas.
 * Ejecuta model/engine_reference.py (oracle) y compara cada número con el motor TS.
 *
 * Uso: npm run test:parity   (requiere python3 en PATH)
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { calculate, bundledModelBase, ITEM_KEYS } from "../src/engine";

const root = resolve(__dirname, "..");
const pythonCandidates = process.platform === "win32" ? ["python", "py"] : ["python3", "python"];

let stdout: string | null = null;
for (const py of pythonCandidates) {
  const res = spawnSync(py, [resolve(root, "scripts/parity_dump.py")], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  if (res.status === 0 && res.stdout) {
    stdout = res.stdout;
    break;
  }
}
if (stdout === null) {
  console.error("No se pudo ejecutar el oracle Python (¿python3 en PATH?).");
  process.exit(2);
}

const DEGREE = ["very_low", "low", "somewhat", "high", "very_high"];
const FREQ = ["never", "seldom", "sometimes", "often", "always"];
const scales = [DEGREE, DEGREE, DEGREE, FREQ, FREQ, FREQ, FREQ];

const lines = stdout.trimEnd().split("\n");
if (lines.length !== 78125) {
  console.error(`Se esperaban 78125 líneas del oracle; llegaron ${lines.length}`);
  process.exit(1);
}

let mismatches = 0;
const report = (n: number, msg: string) => {
  if (mismatches < 10) console.error(`#${n}: ${msg}`);
  mismatches++;
};

lines.forEach((line, n) => {
  const [score, band, improve, noChange, worsen, ki, kw, delta, s1, s2, drivers, burdens] = line.split("|");
  // índice base-5, primer ítem = dígito más significativo
  const digits: number[] = [];
  let rest = n;
  for (let i = 6; i >= 0; i--) {
    digits[i] = rest % 5;
    rest = Math.floor(rest / 5);
  }
  const input: Record<string, string> = { country: "US" };
  ITEM_KEYS.forEach((k, i) => (input[k] = scales[i][digits[i]]));
  const r = calculate(input, bundledModelBase);

  const cmp = (name: string, got: number | string, want: string) => {
    const ok = typeof got === "number" ? got === Number(want) : got === want;
    if (!ok) report(n, `${name}: TS=${got} PY=${want} input=${JSON.stringify(input)}`);
  };
  cmp("score", r.score, score);
  cmp("band", r.reference_band, band);
  cmp("improve", r.scenario_30d.improve, improve);
  cmp("no_change", r.scenario_30d.no_change, noChange);
  cmp("worsen", r.scenario_30d.worsen, worsen);
  cmp("k_improve", r.scenario_30d.k_improve, ki);
  cmp("k_worsen", r.scenario_30d.k_worsen, kw);
  cmp("delta", r.benchmark.delta_vs_puma_mean, delta);
  cmp("sens1", r.sensitivity.one_item_one_category_points, s1);
  cmp("sens2", r.sensitivity.two_items_one_category_points, s2);
  cmp("drivers", r.top_drivers.map((d) => d.item_id).join(","), drivers);
  cmp("burdens", r.item_scores.map((x) => x.burden_points).join(","), burdens.split(",").map((b) => String(Number(b))).join(","));
});

if (mismatches > 0) {
  console.error(`PARITY FAIL: ${mismatches} discrepancias`);
  process.exit(1);
}
console.log("PARITY PASS: 78125/78125 combinaciones idénticas entre Python y TypeScript.");
