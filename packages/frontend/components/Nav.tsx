"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ROLES = [
  { key: "patient", label: "Patient", href: "/patient" },
  { key: "sponsor", label: "Trial Sponsor", href: "/sponsor" },
];

export default function Nav() {
  const pathname = usePathname();

  const activeRole = pathname.startsWith("/patient")
    ? "patient"
    : pathname.startsWith("/sponsor")
      ? "sponsor"
      : null;

  return (
    <nav className="sticky top-0 z-50 border-b border-midnight-surface/60 bg-midnight-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-midnight-accent/15 font-mono text-base leading-none text-midnight-accent">
            {"</>"}
          </span>
          <span className="text-lg font-semibold tracking-tight">
            <span className="text-midnight-accent">WeOwn</span>Health
          </span>
        </Link>

        {/* Role switcher */}
        <div className="rounded-lg border border-midnight-surface bg-midnight-bg/60 p-0.5">
          {ROLES.map((role) => (
            <Link
              key={role.key}
              href={role.href}
              className={`rounded-md px-4 py-1.5 text-sm transition ${
                activeRole === role.key
                  ? "bg-midnight-accent/15 text-midnight-accent shadow-glow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {role.label}
            </Link>
          ))}
        </div>

        <span className="rounded-full border border-midnight-accent/40 bg-midnight-bg px-3 py-1 text-xs font-medium text-midnight-accent">
          Buildathon Wave 1
        </span>
      </div>
    </nav>
  );
}
