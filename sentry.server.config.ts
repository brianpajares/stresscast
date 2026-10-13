import * as Sentry from "@sentry/nextjs";
import { COMMON_SENTRY_OPTIONS } from "./src/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    ...COMMON_SENTRY_OPTIONS,
  });
}
