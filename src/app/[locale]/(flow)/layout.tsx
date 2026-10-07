import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

/** Flujo de evaluación/informe: cabecera mínima (logo, idioma, tema, Salir) y pie compacto. */
export default function FlowLayout({ children }: LayoutProps<"/[locale]">) {
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
