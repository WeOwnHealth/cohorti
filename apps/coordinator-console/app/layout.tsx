import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Container } from "@cohorti/design-system/components";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cohorti — Coordinator",
  description: "Phase A candidate-list review — the human gate before any patient is approached.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <header className="border-b border-gray-200 bg-white">
          <Container className="flex h-16 items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-gray-900">Cohorti</span>
              <span className="text-sm text-gray-400">coordinator</span>
            </div>
          </Container>
        </header>
        <main>
          <Container className="py-10">{children}</Container>
        </main>
      </body>
    </html>
  );
}
