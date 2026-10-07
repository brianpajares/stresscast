import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { AnalyticsPrefsButton } from "./consent-banner";
import { MODEL_VERSION } from "@/engine/types";

export async function SiteFooter({ variant = "full" }: { variant?: "full" | "minimal" }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const linkCls = "inline-flex min-h-11 items-center rounded-sm text-sm text-muted underline-offset-4 hover:text-text hover:underline";

  return (
    <footer className="no-print mt-auto border-t border-border/70 bg-surface-alt/50">
      <div className="mx-auto w-full max-w-(--container-content) px-4 py-10 sm:px-6 lg:px-8">
        {variant === "full" ? (
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="space-y-3">
              <Logo />
              <p className="max-w-sm text-sm text-muted">{t("footer.tagline")}</p>
            </div>
            <nav aria-label={t("common.footerNavigation")}>
              <ul className="space-y-0.5">
                <li><Link className={linkCls} href="/how-it-works">{t("nav.howItWorks")}</Link></li>
                <li><Link className={linkCls} href="/faq">{t("nav.faq")}</Link></li>
                <li><Link className={linkCls} href="/sources">{t("nav.sources")}</Link></li>
              </ul>
            </nav>
            <nav aria-label={t("nav.privacy")}>
              <ul className="space-y-0.5">
                <li><Link className={linkCls} href="/legal/privacy">{t("nav.privacy")}</Link></li>
                <li><Link className={linkCls} href="/legal/terms">{t("nav.terms")}</Link></li>
                <li><Link className={linkCls} href="/legal/wellness-disclaimer">{t("nav.disclaimer")}</Link></li>
                <li><Link className={linkCls} href="/legal/privacy-request">{t("nav.privacyRequest")}</Link></li>
                <li><AnalyticsPrefsButton className={linkCls} /></li>
              </ul>
            </nav>
          </div>
        ) : (
          <nav aria-label={t("common.footerNavigation")} className="flex flex-wrap gap-x-5">
            <Link className={linkCls} href="/legal/privacy">{t("nav.privacy")}</Link>
            <Link className={linkCls} href="/legal/wellness-disclaimer">{t("nav.disclaimer")}</Link>
            <Link className={linkCls} href="/how-it-works">{t("nav.howItWorks")}</Link>
            <AnalyticsPrefsButton className={linkCls} />
          </nav>
        )}

        <div className="mt-8 space-y-2 border-t border-border/70 pt-6 text-sm text-muted">
          <p className="max-w-3xl">{t("legal.disclaimer")}</p>
          {locale !== "en" ? <p className="max-w-3xl">{t("footer.translationNotice")}</p> : null}
          <p>{t("footer.builtOn", { version: MODEL_VERSION })}</p>
          <p>{t("footer.rights", { year: new Date().getUTCFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
