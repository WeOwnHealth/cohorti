import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Markers Passport — WeOwnHealth",
  description:
    "Prove clinical trial eligibility without revealing your lab results. Zero-knowledge proofs on Midnight Network.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-midnight-bg text-white flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
