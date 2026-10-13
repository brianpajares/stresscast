import type { Locale } from "@/i18n/routing";

/**
 * La model card (drive/docs/model_card.md) trae tres secciones separadas por `---`: ES, EN, PT.
 * Se identifica cada una por el texto de su encabezado y no por posición, para tolerar cambios de orden.
 */
const MARKERS: Record<Locale, RegExp> = {
  es: /^#\s+C[oó]mo funciona StressCast/im,
  en: /^#\s+How StressCast works/im,
  pt: /^#\s+Como o StressCast funciona/im,
};

export function extractModelCardSection(markdown: string, locale: Locale): string | null {
  const sections = markdown.split(/\n-{3,}\n/);
  return sections.find((s) => MARKERS[locale].test(s))?.trim() ?? null;
}

export type MdBlock =
  | { type: "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

/** Parser mínimo y seguro (sin HTML crudo): encabezados `#`/`##`, listas `-` y párrafos. */
export function parseMarkdown(md: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let list: string[] | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ type: "p", text: para.join(" ") });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: "ul", items: list });
    list = null;
  };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    if (/^#{1}\s/.test(line)) continue; // el H1 lo aporta la página
    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      blocks.push({ type: h[1].length === 2 ? "h2" : "h3", text: h[2] });
      continue;
    }
    const li = /^[-*]\s+(.*)$/.exec(line);
    if (li) {
      flushPara();
      (list ??= []).push(li[1]);
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return blocks;
}
