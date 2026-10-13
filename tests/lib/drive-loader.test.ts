import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createDriveLoader, bundledBundle, type BundleStore, type ModelBundle } from "@/lib/server/drive/loader";
import { driveManifest, relativeDrivePath, type DriveManifestFile } from "@/lib/server/drive/manifest";

const root = resolve(__dirname, "../..");
const read = (entry: DriveManifestFile) => new Uint8Array(readFileSync(resolve(root, "drive", relativeDrivePath(entry))));
const HOUR = 3_600_000;

function memStore(): BundleStore & { saved: ModelBundle | null } {
  return {
    saved: null,
    async load() {
      return this.saved;
    },
    async save(b) {
      this.saved = b;
    },
  };
}

function setup(over: Partial<Parameters<typeof createDriveLoader>[0]> = {}) {
  let t = 1_000_000_000_000;
  const alerts: string[] = [];
  const loader = createDriveLoader({
    manifest: driveManifest,
    fetchArtifact: async (e) => read(e),
    store: null,
    now: () => t,
    ttlMs: 24 * HOUR,
    onAlert: (code) => alerts.push(code),
    ...over,
  });
  return { loader, alerts, advance: (ms: number) => (t += ms), clock: () => t };
}

describe("AT-17 · carga con checksum", () => {
  it("descarga 5/5 artefactos de lectura 'app', verifica SHA-256 y expone la base", async () => {
    const { loader } = setup();
    const b = await loader.load();
    expect(b.meta.source).toBe("drive");
    expect(b.meta.cache).toBe("fresh");
    expect(Object.keys(b.meta.checksums).sort()).toEqual(["base_stresscast.xlsx", "engine_config.json", "inputs.schema.json", "model_card.md", "report_template.json"]);
    expect(b.base.items).toHaveLength(7);
    expect(b.engineConfig.version).toBe("1.0.0");
  });

  it("RECHAZA un archivo con checksum incorrecto y conserva el bundle embebido", async () => {
    const { loader, alerts } = setup({
      fetchArtifact: async (e) => {
        const bytes = read(e);
        if (e.file === "model_card.md") return new TextEncoder().encode("contenido alterado");
        return bytes;
      },
    });
    const b = await loader.load();
    expect(b.meta.source).toBe("bundled");
    expect(alerts).toContain("drive_integrity_rejected");
  });

  it("un checksum inválido NO reemplaza la última versión válida", async () => {
    let corrupt = false;
    const { loader, advance, alerts } = setup({
      fetchArtifact: async (e) => (corrupt && e.file === "base_stresscast.xlsx" ? new Uint8Array([1, 2, 3]) : read(e)),
    });
    const good = await loader.load();
    advance(25 * HOUR);
    corrupt = true;
    const after = await loader.load();
    expect(after.meta.cache).toBe("stale_valid");
    expect(after.base).toEqual(good.base);
    expect(alerts).toContain("drive_integrity_rejected");
  });
});

describe("AT-18 · cache 24 h y fallback", () => {
  it("sirve desde cache dentro del TTL sin volver a Drive", async () => {
    const fetchArtifact = vi.fn(async (e: DriveManifestFile) => read(e));
    const { loader, advance } = setup({ fetchArtifact });
    await loader.load();
    const calls = fetchArtifact.mock.calls.length;
    advance(23 * HOUR);
    const b = await loader.load();
    expect(b.meta.cache).toBe("fresh");
    expect(fetchArtifact.mock.calls.length).toBe(calls);
  });

  it("tras 24 h revalida; si Drive responde 500 usa la última versión válida (stale_valid)", async () => {
    let down = false;
    const { loader, advance, alerts } = setup({
      fetchArtifact: async (e) => {
        if (down) throw new Error("drive_http_500");
        return read(e);
      },
    });
    await loader.load();
    advance(25 * HOUR);
    down = true;
    const b = await loader.load();
    expect(b.meta.cache).toBe("stale_valid");
    expect(b.meta.source).toBe("drive");
    expect(alerts).toContain("drive_unavailable");
  });

  it("arranque en frío con Drive caído: usa la persistencia y, si no hay, el snapshot embebido", async () => {
    const store = memStore();
    const warm = setup({ store });
    await warm.loader.load();
    expect(store.saved).not.toBeNull();

    const cold = setup({ store, fetchArtifact: async () => { throw new Error("drive_http_500"); }, now: () => warm.clock() + 30 * HOUR });
    expect((await cold.loader.load()).meta.cache).toBe("stale_valid");

    const empty = setup({ store: memStore(), fetchArtifact: async () => { throw new Error("down"); } });
    const b = await empty.loader.load();
    expect(b.meta.source).toBe("bundled");
    expect(b.base).toEqual(bundledBundle().base);
  });

  it("sin Drive configurado sirve el snapshot embebido (los 20 golden pasan en el auto-test)", async () => {
    const { loader } = setup({ fetchArtifact: null });
    const b = await loader.load();
    expect(b.meta.source).toBe("bundled");
    expect(b.meta.cache).toBe("unavailable");
  });
});

describe("modelo inesperado", () => {
  it("rechaza un engine_config con otra versión aunque el checksum del manifiesto sea el esperado", async () => {
    const tampered = {
      ...driveManifest,
      files: driveManifest.files.map((f) => f),
    };
    const bytes = new TextEncoder().encode(JSON.stringify({ model_id: "otro_modelo", version: "9.9.9" }));
    const { createHash } = await import("node:crypto");
    tampered.files = tampered.files.map((f) => (f.file === "engine_config.json" ? { ...f, sha256: createHash("sha256").update(bytes).digest("hex") } : f));
    const { loader, alerts } = setup({
      manifest: tampered,
      fetchArtifact: async (e) => (e.file === "engine_config.json" ? bytes : read(e)),
    });
    const b = await loader.load();
    expect(b.meta.source).toBe("bundled");
    expect(alerts).toContain("unexpected_model_version");
  });
});
