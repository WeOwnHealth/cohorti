import { Card, CardBody, Badge, CredentialIcon, ProofIcon, ArrowRightIcon } from "@cohorti/design-system/components";

const steps = [
  {
    number: "01",
    title: "Your data becomes a signed credential",
    body: "Source data — a lab panel, a wearable export, a clinical note — is de-identified locally, mapped to FHIR, and signed by an accredited issuer. Every credential carries a binding tier stating exactly how strongly it's tied to you.",
    Icon: CredentialIcon,
  },
  {
    number: "02",
    title: "You prove one claim, on Midnight",
    body: "A zero-knowledge proof answers a single question — \"is this value below 200?\" — without revealing the value behind it. The proof carries its own recency and binding tier, so a verifier knows how much to trust it.",
    Icon: ProofIcon,
  },
];

export function Solution() {
  return (
    <section id="solution" className="border-b border-gray-200 bg-white py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-display-sm">
            One verified health identity. Reused everywhere.
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Holders reuse one credential across every context that needs it. Verifiers get answers
            they can defend to their own auditors — without ever holding your medical data.
          </p>
        </div>

        <div className="relative mt-16 grid gap-6 sm:grid-cols-2">
          {/* Connector arrow between the two steps — visible sm+ only, purely additive on mobile's stacked layout. */}
          <div className="absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 sm:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm">
              <ArrowRightIcon className="h-4 w-4" />
            </div>
          </div>

          {steps.map((step) => (
            <Card
              key={step.number}
              className="p-2 transition-all duration-base ease-out hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardBody className="py-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white">
                    <step.Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs font-semibold tracking-wide text-gray-400">
                    STEP {step.number}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{step.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="relative mt-8 overflow-hidden rounded-xl border border-blue-100 bg-blue-50/60 p-8 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-blue-100/60 blur-3xl"
          />
          <Badge tone="blue" className="mb-4">
            The core thesis
          </Badge>
          <p className="relative max-w-3xl text-lg leading-relaxed text-gray-800">
            The hard, defensible problem isn&apos;t the zero-knowledge proof — that technology is
            available and increasingly commoditised. The hard problem is{" "}
            <strong className="font-semibold text-gray-900">issuer trust</strong>: getting
            reputable labs, wearables, and health systems to actually sign credentials, and being
            honest about how strongly each one is tied to a real person. Coverage and issuer
            accreditation are the moat — the same way bank coverage, not the API, is Plaid&apos;s
            moat.
          </p>
        </div>
      </div>
    </section>
  );
}
