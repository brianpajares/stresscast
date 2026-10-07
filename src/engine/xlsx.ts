/**
 * Lector mínimo de XLSX (hojas de datos planas) isomórfico: fflate + fast-xml-parser.
 * Porta `_read_shared_strings`, `_sheet_paths`, `_sheet_matrix` y `_records` de
 * model/engine_reference.py sin cambiar semántica de celdas.
 */
import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";

export type CellValue = string | number | boolean | null;
export type SheetRecord = Record<string, CellValue>;
export type SheetMatrix = CellValue[][];

const ARRAY_TAGS = new Set(["si", "sheet", "Relationship", "row", "c"]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  removeNSPrefix: true,
  isArray: (name) => ARRAY_TAGS.has(name),
});

type XmlNode = Record<string, unknown>;

function asNode(value: unknown): XmlNode {
  return typeof value === "object" && value !== null ? (value as XmlNode) : {};
}

function asArray<T = unknown>(value: unknown): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? (value as T[]) : [value as T];
}

/** Concatena todos los nodos `<t>` descendientes (equivale a `iter('t')` en Python). */
function collectText(node: unknown): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string") return "";
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (typeof node !== "object") return "";
  let out = "";
  for (const [key, value] of Object.entries(node as XmlNode)) {
    if (key.startsWith("@_")) continue;
    if (key === "t") {
      for (const t of asArray(value)) {
        if (typeof t === "string") out += t;
        else if (typeof t === "object" && t !== null) out += String((t as XmlNode)["#text"] ?? "");
      }
    } else {
      out += collectText(value);
    }
  }
  return out;
}

function colToIndex(cellRef: string): number {
  const m = /^([A-Z]+)/.exec(cellRef);
  if (!m) throw new Error(`Referencia de celda inválida: ${cellRef}`);
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

const NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

function cellValue(cell: XmlNode, shared: string[]): CellValue {
  const ctype = cell["@_t"] as string | undefined;
  if (ctype === "inlineStr") return collectText(cell["is"]);
  const v = cell["v"];
  if (v === undefined || v === null) return null;
  const text = typeof v === "string" ? v : String(asNode(v)["#text"] ?? "");
  if (ctype === "s") return shared[Number.parseInt(text, 10)] ?? null;
  if (ctype === "b") return text === "1";
  if (ctype === "str" || ctype === "e") return text;
  if (NUMERIC.test(text.trim())) {
    return Number(text);
  }
  return text;
}

function readSharedStrings(files: Record<string, Uint8Array>): string[] {
  const raw = files["xl/sharedStrings.xml"];
  if (!raw) return [];
  const root = asNode(parser.parse(strFromU8(raw)));
  const sst = asNode(root["sst"]);
  return asArray(sst["si"]).map((si) => collectText(si));
}

function sheetPaths(files: Record<string, Uint8Array>): Record<string, string> {
  const wbRaw = files["xl/workbook.xml"];
  const relRaw = files["xl/_rels/workbook.xml.rels"];
  if (!wbRaw || !relRaw) throw new Error("XLSX inválido: falta workbook.xml o sus relaciones.");
  const wb = asNode(parser.parse(strFromU8(wbRaw)));
  const rels = asNode(parser.parse(strFromU8(relRaw)));

  const relMap: Record<string, string> = {};
  const relationships = asArray<XmlNode>(asNode(rels["Relationships"])["Relationship"]);
  for (const rel of relationships) {
    relMap[String(rel["@_Id"])] = String(rel["@_Target"]);
  }

  const out: Record<string, string> = {};
  const sheets = asArray<XmlNode>(asNode(asNode(wb["workbook"])["sheets"])["sheet"]);
  for (const sheet of sheets) {
    const name = String(sheet["@_name"]);
    const rid = String(sheet["@_id"]);
    const target = (relMap[rid] ?? "").replace(/^\/+/, "");
    out[name] = target.startsWith("xl/") ? target : `xl/${target}`;
  }
  return out;
}

function sheetMatrix(files: Record<string, Uint8Array>, path: string, shared: string[]): SheetMatrix {
  const raw = files[path];
  if (!raw) throw new Error(`XLSX inválido: falta la hoja ${path}`);
  const root = asNode(parser.parse(strFromU8(raw)));
  const sheetData = asNode(asNode(root["worksheet"])["sheetData"]);
  const rows: SheetMatrix = [];
  for (const row of asArray<XmlNode>(sheetData["row"])) {
    const vals = new Map<number, CellValue>();
    let maxIdx = -1;
    for (const cell of asArray<XmlNode>(row["c"])) {
      const ref = typeof cell["@_r"] === "string" ? (cell["@_r"] as string) : "A1";
      const idx = colToIndex(ref);
      vals.set(idx, cellValue(cell, shared));
      maxIdx = Math.max(maxIdx, idx);
    }
    if (maxIdx >= 0) {
      rows.push(Array.from({ length: maxIdx + 1 }, (_, i) => vals.get(i) ?? null));
    }
  }
  return rows;
}

function toRecords(matrix: SheetMatrix): SheetRecord[] {
  if (matrix.length === 0) return [];
  const headers = matrix[0].map((x) => (x === null || x === undefined ? "" : String(x).trim()));
  const out: SheetRecord[] = [];
  for (const row of matrix.slice(1)) {
    const rec: SheetRecord = {};
    let nonempty = false;
    headers.forEach((h, i) => {
      if (!h) return;
      const val = i < row.length ? row[i] : null;
      rec[h] = val;
      if (val !== null && val !== "") nonempty = true;
    });
    if (nonempty) out.push(rec);
  }
  return out;
}

/** Lee las hojas solicitadas de un XLSX (bytes) como registros por cabecera. */
export function readXlsxSheets(bytes: Uint8Array, required: readonly string[]): Record<string, SheetRecord[]> {
  const files = unzipSync(bytes);
  const shared = readSharedStrings(files);
  const paths = sheetPaths(files);
  const missing = required.filter((s) => !(s in paths));
  if (missing.length > 0) {
    throw new Error(`Base XLSX incompleta; faltan hojas: ${JSON.stringify(missing)}`);
  }
  const out: Record<string, SheetRecord[]> = {};
  for (const name of required) {
    out[name] = toRecords(sheetMatrix(files, paths[name], shared));
  }
  return out;
}
