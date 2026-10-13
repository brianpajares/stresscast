import { notFound } from "next/navigation";

/** Captura rutas desconocidas bajo /{locale}/… para renderizar el not-found localizado dentro del layout. */
export default function CatchAll() {
  notFound();
}
