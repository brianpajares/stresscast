import { parseMarkdown } from "@/lib/report/model-card";

const TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s)]+)/g;

function inline(text: string): React.ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(part);
    const href = link?.[2] ?? (/^https?:\/\//.test(part) ? part : null);
    if (href) {
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-primary underline underline-offset-4">
          {link?.[1] ?? part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Renderiza Markdown mínimo como elementos React (sin dangerouslySetInnerHTML ⇒ sin inyección de HTML). */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="space-y-3 text-sm">
      {parseMarkdown(source).map((b, i) => {
        if (b.type === "h2") return <h3 key={i} className="pt-2 text-base font-bold text-text">{b.text}</h3>;
        if (b.type === "h3") return <h4 key={i} className="font-bold text-text">{b.text}</h4>;
        if (b.type === "ul")
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.items.map((it, j) => (
                <li key={j}>{inline(it)}</li>
              ))}
            </ul>
          );
        return <p key={i}>{inline(b.text)}</p>;
      })}
    </div>
  );
}
