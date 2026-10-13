import "server-only";
import Stripe from "stripe";
import { getEnv } from "./env";

let client: Stripe | null = null;

export function stripeClient(): Stripe {
  const key = getEnv().STRIPE_SECRET_KEY;
  if (!key) throw new Error("stripe_not_configured");
  client ??= new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: "StressCast" } });
  return client;
}

/** Dinero en unidades menores (CLAUDE.md). Las 7 monedas soportadas tienen 2 decimales. */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}
