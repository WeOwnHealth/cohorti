import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cohorti — Coordinator",
  description: "Phase A candidate-list review — the human gate before any patient is approached.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <span className="font-semibold">Cohorti</span>
          <span className="text-slate-500 ml-2 text-sm">coordinator</span>
        </header>
        <main className="px-6 py-8 max-w-3xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
