import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Proxy (middleware en Next < 16): negociación de idioma y redirección a /{es|en|pt}.
 * Excluye API, admin, assets internos y archivos estáticos.
 */
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|admin|_next|_vercel|monitoring|.*\\..*).*)"],
};
