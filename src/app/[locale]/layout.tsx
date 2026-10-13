import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing, HTML_LANG } from "@/i18n/routing";
import { ConsentBanner } from "@/components/layout/consent-banner";
import { isLocaleIndexable } from "@/lib/gate";
import { alternatesFor, pickClientMessages, siteUrl } from "@/lib/site";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const alt = alternatesFor(locale);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("title"), template: `%s · ${t("appName")}` },
    description: t("description"),
    applicationName: t("appName"),
    alternates: alt,
    openGraph: {
      type: "website",
      siteName: t("appName"),
      title: t("title"),
      description: t("description"),
      url: alt.canonical,
      locale: HTML_LANG[locale].replace("-", "_"),
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    robots: { index: isLocaleIndexable(locale), follow: isLocaleIndexable(locale) },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

// Aplica el tema guardado antes del primer pintado (evita flash). Sin dependencias.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('sc-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`;

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html lang={HTML_LANG[locale]} className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only-focusable fixed left-4 top-4 z-[100] rounded-md bg-surface px-4 py-3 text-sm font-semibold shadow-card"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider locale={locale} messages={pickClientMessages(messages as Record<string, unknown>)}>
          {children}
          <ConsentBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
