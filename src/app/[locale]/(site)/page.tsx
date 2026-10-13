import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Calculator,
  Check,
  Compass,
  Gauge,
  ListChecks,
  Lock,
  Layers,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Eyebrow } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { HeroVisual } from "@/components/landing/hero-visual";
import { StartCta } from "@/components/landing/start-cta";
import { TrackOnMount } from "@/components/layout/track-on-mount";
import { alternatesFor, siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return { alternates: alternatesFor(locale) };
}

function Section({
  id,
  className,
  children,
  tone = "default",
  labelledBy,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
  tone?: "default" | "alt";
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("py-16 sm:py-20", tone === "alt" && "border-y border-border/70 bg-surface-alt/50", className)}
    >
      <div className="mx-auto w-full max-w-(--container-content) px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="max-w-3xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
      {children}
    </h2>
  );
}

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();

  const trustItems = t("landing.trust").split(" · ");
  const freeItems = t.raw("landing.free.items") as string[];
  const fullItems = t.raw("landing.full.items") as string[];
  const faqKeys = ["diagnosis", "scenario", "denmark", "email"] as const;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t("meta.appName"),
    description: t("meta.description"),
    url: `${siteUrl()}/${locale}`,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    inLanguage: locale === "pt" ? "pt-BR" : locale,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <>
      <TrackOnMount event="landing_view" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO */}
      <section className="bg-hero-glow" aria-labelledby="hero-title">
        <div className="mx-auto grid w-full max-w-(--container-content) items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-8 lg:py-24">
          <div className="animate-fade-up">
            <Eyebrow>{t("landing.eyebrow")}</Eyebrow>
            <h1
              id="hero-title"
              className="mt-3 max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tighter sm:text-5xl lg:text-6xl"
            >
              {t("landing.headline")}
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-lg text-muted">{t("landing.body")}</p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <StartCta>
                {t("landing.cta")}
                <ArrowRight className="size-5" aria-hidden="true" />
              </StartCta>
              <Link href="/how-it-works" className={buttonVariants({ variant: "link", size: "md" })}>
                {t("landing.secondaryCta")}
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-2.5" aria-label={t("landing.principlesTitle")}>
              {trustItems.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted"
                >
                  <Check className="size-4 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-2xl text-sm text-muted">{t("legal.disclaimer")}</p>
          </div>

          <HeroVisual />
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <Section labelledBy="steps-title">
        <SectionTitle id="steps-title">{t("landing.stepsTitle")}</SectionTitle>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {(
            [
              ["one", ListChecks],
              ["two", Gauge],
              ["three", Layers],
            ] as const
          ).map(([key, Icon], i) => (
            <li key={key} className="relative rounded-lg border border-border bg-surface p-6 shadow-soft">
              <span className="absolute right-5 top-4 text-5xl font-extrabold text-border/80 tabular" aria-hidden="true">
                {i + 1}
              </span>
              <span className="inline-flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold">{t(`landing.steps.${key}.title`)}</h3>
              <p className="mt-2 text-muted">{t(`landing.steps.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* QUÉ OBTIENES */}
      <Section tone="alt" labelledBy="value-title">
        <SectionTitle id="value-title">{t("landing.valueTitle")}</SectionTitle>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <article className="rounded-lg border border-border bg-surface p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xl font-bold">{t("landing.free.title")}</h3>
              <Badge tone="primary">{t("landing.free.badge")}</Badge>
            </div>
            <ul className="mt-5 space-y-3">
              {freeItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-lg border border-primary/40 bg-surface p-6 shadow-card ring-1 ring-primary/20 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xl font-bold">{t("landing.full.title")}</h3>
              <Badge tone="primary">{t("landing.full.badge")}</Badge>
            </div>
            <ul className="mt-5 space-y-3">
              {fullItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <Lock className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </Section>

      {/* PRINCIPIOS */}
      <Section labelledBy="principles-title">
        <SectionTitle id="principles-title">{t("landing.principlesTitle")}</SectionTitle>
        <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {(
            [
              ["math", Calculator],
              ["context", Scale],
              ["scenarios", Compass],
              ["privacy", ShieldCheck],
            ] as const
          ).map(([key, Icon]) => (
            <li key={key} className="flex gap-4">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-bold">{t(`landing.principles.${key}.title`)}</h3>
                <p className="mt-1 text-muted">{t(`landing.principles.${key}.body`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* EVIDENCIA */}
      <Section tone="alt" labelledBy="evidence-title">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.2fr]">
          <SectionTitle id="evidence-title">{t("landing.evidenceTitle")}</SectionTitle>
          <div>
            <p className="text-pretty text-lg text-muted">{t("landing.evidenceBody")}</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1">
              <Link href="/how-it-works" className={buttonVariants({ variant: "link" })}>
                {t("landing.evidenceLink")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/sources" className={buttonVariants({ variant: "link" })}>
                {t("nav.sources")}
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section labelledBy="faq-title">
        <SectionTitle id="faq-title">{t("landing.faqTitle")}</SectionTitle>
        <div className="mt-8 max-w-3xl space-y-3">
          {faqKeys.map((key) => (
            <Disclosure key={key} summary={<h3 className="inline text-base font-semibold">{t(`landing.faq.${key}.q`)}</h3>}>
              <p>{t(`landing.faq.${key}.a`)}</p>
            </Disclosure>
          ))}
          <p className="pt-2">
            <Link href="/faq" className={buttonVariants({ variant: "link" })}>
              {t("landing.faqMore")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </p>
        </div>
      </Section>

      {/* CTA FINAL */}
      <Section className="pt-0 sm:pt-0">
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-surface to-surface p-8 text-center shadow-card sm:p-12">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("landing.finalTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-muted">{t("landing.finalBody")}</p>
          <div className="mt-7 flex justify-center">
            <StartCta>
              {t("landing.cta")}
              <ArrowRight className="size-5" aria-hidden="true" />
            </StartCta>
          </div>
        </div>
      </Section>
    </>
  );
}
