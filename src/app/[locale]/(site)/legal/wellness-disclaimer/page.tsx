import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { COUNTRIES } from "@/engine/types";
import { routing } from "@/i18n/routing";
import { Card, Notice } from "@/components/ui/card";
import { PageShell, ProseSection } from "@/components/content/page-shell";
import { alternatesFor } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/wellness-disclaimer">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("disclaimerTitle"), alternates: alternatesFor(locale, "/legal/wellness-disclaimer") };
}

export default async function WellnessDisclaimerPage({ params }: PageProps<"/[locale]/legal/wellness-disclaimer">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const body = t.raw("legal.wellbeing.body") as string[];
  return (
    <PageShell title={t("legal.wellbeing.title")}>
      <Notice>{t("legal.disclaimer")}</Notice>
      <div className="space-y-3 text-pretty text-muted">
        {body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <ProseSection id="support" title={t("legal.wellbeing.supportTitle")}>
        <p>{t("legal.wellbeing.supportBody")}</p>
        <p>{t("legal.support")}</p>
      </ProseSection>
      <ProseSection id="lines" title={t("legal.wellbeing.linesTitle")}>
        <Card>
          <ul className="space-y-2 text-text">
            {COUNTRIES.map((c) => (
              <li key={c}>{t(`legal.wellbeing.lines.${c}`)}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">{t("legal.wellbeing.linesNote")}</p>
        </Card>
      </ProseSection>
    </PageShell>
  );
}
