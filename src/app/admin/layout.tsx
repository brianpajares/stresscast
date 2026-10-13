import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "StressCast · Admin",
  robots: { index: false, follow: false, noarchive: true },
};

// Layout raíz propio de /admin (no hereda i18n). Español: idioma operativo del propietario.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
