import { e2eOutboxEnabled, outbox } from "@/lib/server/email/outbox";

export const dynamic = "force-dynamic";

/** Solo E2E: lista/limpia los emails capturados. 404 en cualquier otro entorno. */
export async function GET() {
  if (!e2eOutboxEnabled()) return new Response(null, { status: 404 });
  return Response.json(outbox());
}

export async function DELETE() {
  if (!e2eOutboxEnabled()) return new Response(null, { status: 404 });
  outbox().length = 0;
  return new Response(null, { status: 204 });
}
