import * as Sentry from "@sentry/nextjs";
import { COMMON_SENTRY_OPTIONS } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    ...COMMON_SENTRY_OPTIONS,
    // El cliente nunca registra navegación con query (tokens) ni interacciones de formulario.
    integrations: (defaults) => defaults.filter((i) => i.name !== "Breadcrumbs"),
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
