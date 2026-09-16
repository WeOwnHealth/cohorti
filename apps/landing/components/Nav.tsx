import Link from "next/link";
import { buttonVariants } from "@cohorti/design-system/components";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="#" className="text-[15px] font-semibold tracking-tight text-gray-900">
          Cohorti
        </Link>
        <nav className="hidden items-center gap-8 text-[14px] font-medium text-gray-600 md:flex">
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
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/WeOwnHealth/trials"
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
