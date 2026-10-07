import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { buttonVariants } from "@/components/ui/button";

/**
 * Cabecera. `minimal` (flujo de evaluación): solo logo, idioma, tema y “Salir”
 * (ux/sitemap_flows.md · Navegación y estado).
 */
export async function SiteHeader({ variant = "full" }: { variant?: "full" | "minimal" }) {
  const t = await getTranslations();
  return (
    <header className="no-print border-b border-border/70 bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex min-h-16 w-full max-w-(--container-content) items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="-ml-1 rounded-md p-1" aria-label={`${t("meta.appName")} — ${t("common.home")}`}>
          <Logo />
        </Link>

        {variant === "full" ? (
          <nav aria-label={t("common.mainNavigation")} className="hidden items-center gap-1 md:flex">
            <Link
              href="/how-it-works"
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface-alt hover:text-text"
            >
              {t("nav.howItWorks")}
            </Link>
            <Link
              href="/faq"
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface-alt hover:text-text"
            >
              {t("nav.faq")}
            </Link>
            <Link
              href="/sources"
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface-alt hover:text-text"
            >
              {t("nav.sources")}
            </Link>
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          {variant === "minimal" ? (
            <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {t("common.exit")}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
