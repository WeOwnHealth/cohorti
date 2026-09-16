import { buttonVariants, Badge } from "@cohorti/design-system/components";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="blue" className="mb-6">
            Built on Midnight Network
          </Badge>
          <h1 className="text-[2.5rem] font-semibold leading-[1.1] tracking-tight text-gray-900 sm:text-display-lg">
            Prove one health fact.
            <br />
            Reveal nothing else.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
            Cohorti turns lab results, wearable data, and clinical records into signed credentials
            you control — then proves a single claim, like trial eligibility, with a zero-knowledge
            proof. Verifiers get a trustworthy yes or no. Never your data.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#solution" className={buttonVariants({ variant: "primary", size: "lg" })}>
              See how it works
            </a>
            <a
              href="https://github.com/WeOwnHealth/trials"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              View the code
            </a>
          </div>
        </div>
      </div>

      {/* Subtle top-fade gradient, matching the soft depth language of both references */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-gradient-to-b from-blue-50/60 to-transparent"
      />
    </section>
  );
}
