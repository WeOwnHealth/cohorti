import Link from "next/link";
import { buttonVariants } from "@passport/design-system/components";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      {/*
        A plain flex `justify-between` across 3 unevenly-sized groups does
        NOT visually center the middle one — it only equalizes the two
        gaps, so the nav links get pulled toward whichever side (here, the
        logo) is narrower than the other (GitHub link + CTA button). A
        grid with two equal 1fr outer columns fixes that: the middle
        column is genuinely centered on the container regardless of how
        wide its neighbors are.
      */}
      <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6">
        <Link href="#" className="justify-self-start text-[15px] font-semibold tracking-tight text-gray-900">
          Passport
        </Link>
        <nav className="hidden items-center gap-8 justify-self-center text-[14px] font-medium text-gray-600 md:flex">
          <a href="#problem" className="hover:text-gray-900">
            Problem
          </a>
          <a href="#solution" className="hover:text-gray-900">
            Solution
          </a>
          <a href="#trust" className="hover:text-gray-900">
            Binding tiers
          </a>
          <a href="#roadmap" className="hover:text-gray-900">
            Roadmap
          </a>
        </nav>
        <div className="flex items-center justify-self-end gap-3">
          <a
            href="https://github.com/WeOwnHealth/passport"
            target="_blank"
            rel="noreferrer"
            className="hidden text-[14px] font-medium text-gray-600 hover:text-gray-900 sm:inline"
          >
            GitHub
          </a>
          <a href="#solution" className={buttonVariants({ size: "sm", variant: "primary" })}>
            See how it works
          </a>
        </div>
      </div>
    </header>
  );
}
