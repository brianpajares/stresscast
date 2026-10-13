import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

/** Flujo de evaluación/informe: cabecera mínima (logo, idioma, tema, Salir) y pie compacto. */
export default async function FlowLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <>
      <SiteHeader variant="minimal" />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <SiteFooter variant="minimal" />
    </>
  );
}
