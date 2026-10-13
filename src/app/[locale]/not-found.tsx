import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="text-6xl font-extrabold tracking-tighter text-primary">404</p>
          <h1 tabIndex={-1} className="mt-4 text-3xl font-extrabold tracking-tight">
            {t("notFoundTitle")}
          </h1>
          <p className="mt-3 text-muted">{t("notFoundBody")}</p>
          <div className="mt-8">
            <Link href="/" className={buttonVariants({ variant: "primary" })}>
              {t("toHome")}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
