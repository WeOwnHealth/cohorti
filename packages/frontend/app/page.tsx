import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Issue credential",
    body: "Lab results are issued as a verifiable credential; only its commitment goes on-chain.",
  },
  {
    n: "02",
    title: "Generate proof",
    body: "Your wallet builds a zero-knowledge proof locally — raw values never leave it.",
  },
  {
    n: "03",
    title: "Verify eligibility",
    body: "The sponsor sees one bit: eligible or not eligible. Nothing else.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="inline-grid-bg">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center">
          <span className="mb-6 rounded-full border border-midnight-accent/40 bg-midnight-bg px-4 py-1 text-xs font-medium tracking-wide text-midnight-accent">
            Midnight Network · Zero-Knowledge Clinical Trial Matching
          </span>
          <h1 className="text-5xl font-extrabold tracking-tight md:text-6xl">
            Health Markers{" "}
            <span className="bg-gradient-to-r from-midnight-accent to-cyan-300 bg-clip-text text-transparent">
              Passport
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-gray-400">
            Prove clinical trial eligibility without revealing your lab results.
            Zero-knowledge proofs on Midnight Network.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/patient"
              className="rounded-lg bg-midnight-accent px-8 py-3.5 text-base font-semibold text-midnight-bg shadow-glow transition hover:bg-cyan-300"
            >
              I am a Patient
            </Link>
            <Link
              href="/sponsor"
              className="rounded-lg border border-midnight-surface px-8 py-3.5 text-base font-semibold text-gray-300 transition hover:border-midnight-accent/60 hover:text-white"
            >
              I am a Trial Sponsor
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold">How It Works</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-2xl border border-midnight-surface bg-midnight-surface/60 p-6"
            >
              <div className="font-mono text-sm text-midnight-accent">{step.n}</div>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer badges (extra) — main footer in layout */}
      <section className="mx-auto max-w-6xl px-6 pb-16 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-midnight-surface bg-midnight-bg px-5 py-3 text-sm text-gray-400">
          <span className="rounded-md bg-midnight-accent/10 px-2.5 py-1 font-mono text-xs text-midnight-accent">
            Powered by Midnight Network
          </span>
          <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
            Built by WeOwnHealth
          </span>
        </div>
      </section>
    </div>
  );
}
