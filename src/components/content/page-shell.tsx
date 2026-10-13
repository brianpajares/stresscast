import { Eyebrow, Notice } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Contenedor de páginas de contenido (cómo funciona, FAQ, fuentes, legales). Una columna legible. */
export function PageShell({
  eyebrow,
  title,
  lead,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="bg-hero-glow">
      <div className={cn("mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16", className)}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 tabIndex={-1} className="mt-2 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          {title}
        </h1>
        {lead ? <p className="mt-4 text-pretty text-lg text-muted">{lead}</p> : null}
        <div className="mt-10 space-y-10">{children}</div>
      </div>
    </div>
  );
}

export function ProseSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  const hid = id ? `${id}-title` : undefined;
  return (
    <section aria-labelledby={hid}>
      <h2 id={hid} className="text-2xl font-extrabold tracking-tight">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-pretty text-muted">{children}</div>
    </section>
  );
}

export interface LegalSection {
  title: string;
  body: string[];
}

export function LegalSections({ sections, draftNotice }: { sections: LegalSection[]; draftNotice: string }) {
  return (
    <>
      <Notice>{draftNotice}</Notice>
      <div className="space-y-8">
        {sections.map((s, i) => (
          <ProseSection key={s.title} id={`s${i + 1}`} title={`${i + 1}. ${s.title}`}>
            {s.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </ProseSection>
        ))}
      </div>
    </>
  );
}
