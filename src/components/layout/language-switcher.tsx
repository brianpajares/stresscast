"use client";

import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/routing";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

const LABEL: Record<Locale, string> = { es: "ES", en: "EN", pt: "PT" };
const NAME: Record<Locale, string> = { es: "Español", en: "English", pt: "Português" };

function Switcher({ withQuery }: { withQuery: boolean }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const t = useTranslations("common");
  const searchParams = useSearchParams();
  const query = withQuery ? Object.fromEntries(searchParams.entries()) : undefined;

  return (
    <nav aria-label={t("language")}>
      <ul className="flex items-center gap-1">
        {LOCALES.map((l) => {
          const active = l === locale;
          return (
            <li key={l}>
              <Link
                href={{ pathname, query }}
                locale={l}
                lang={l === "pt" ? "pt-BR" : l}
                hrefLang={l === "pt" ? "pt-BR" : l}
                aria-current={active ? "true" : undefined}
                aria-label={NAME[l]}
                scroll={false}
                onClick={() => {
                  if (!active) track("language_change", { from_language: locale, to_language: l });
                }}
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-text hover:bg-surface-alt",
                )}
              >
                {LABEL[l]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Selector de idioma persistente (cookie NEXT_LOCALE de next-intl). Conserva la query (p. ej. token del informe). */
export function LanguageSwitcher() {
  return (
    <Suspense fallback={<Switcher withQuery={false} />}>
      <Switcher withQuery />
    </Suspense>
  );
}
