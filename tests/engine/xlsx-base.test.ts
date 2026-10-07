import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bundledSnapshot, parseModelBaseXlsx } from "@/engine";

const root = resolve(__dirname, "../..");
const xlsx = new Uint8Array(readFileSync(resolve(root, "drive/base/base_stresscast.xlsx")));

describe("Lector XLSX y snapshot embebido", () => {
  it("el sha256 del XLSX coincide con spec/drive_manifest.json", () => {
    const manifest = JSON.parse(readFileSync(resolve(root, "spec/drive_manifest.json"), "utf8")) as {
      files: { file: string; sha256: string }[];
    };
    const entry = manifest.files.find((f) => f.file === "base_stresscast.xlsx")!;
    expect(createHash("sha256").update(xlsx).digest("hex")).toBe(entry.sha256);
  });

  it("bundled-base.json == parseo fresco del XLSX (sin drift)", () => {
    expect(parseModelBaseXlsx(xlsx)).toEqual(bundledSnapshot.base);
  });

  it("expone parámetros críticos del modelo", () => {
    const { params, items, scaleMap } = bundledSnapshot.base;
    expect(params.response_step).toBe(25);
    expect(params.high_reference_cutoff).toBe(50);
    expect(params.puma_work_mean).toBe(33);
    expect(params.scenario_items_changed).toBe(2);
    expect(items).toHaveLength(7);
    expect(items.filter((i) => i.reverse_scored).map((i) => i.item_id)).toEqual(["WB7"]);
    expect(Object.keys(scaleMap)).toHaveLength(10);
  });

  it("rechaza bytes que no son un XLSX", () => {
    expect(() => parseModelBaseXlsx(new Uint8Array([1, 2, 3, 4]))).toThrow();
  });
});
