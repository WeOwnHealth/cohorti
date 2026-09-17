import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Passport — Prove one health fact. Reveal nothing else.",
  description:
    "Passport turns lab results, wearable data, and clinical records into signed, patient-held credentials — then proves a single health claim with a zero-knowledge proof, without ever exposing the record behind it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
