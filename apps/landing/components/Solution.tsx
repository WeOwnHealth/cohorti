import { Card, CardBody, Badge } from "@cohorti/design-system/components";

const steps = [
  {
    number: "01",
    title: "Your data becomes a signed credential",
    body: "Source data — a lab panel, a wearable export, a clinical note — is de-identified locally, mapped to FHIR, and signed by an accredited issuer. Every credential carries a binding tier stating exactly how strongly it's tied to you.",
  },
  {
    number: "02",
    title: "You prove one claim, on Midnight",
    body: "A zero-knowledge proof answers a single question — \"is this value below 200?\" — without revealing the value behind it. The proof carries its own recency and binding tier, so a verifier knows how much to trust it.",
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

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {steps.map((step) => (
            <Card key={step.number} className="p-2">
              <CardBody className="py-8">
                <span className="text-sm font-mono font-semibold text-blue-500">{step.number}</span>
                <h3 className="mt-3 text-xl font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{step.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50/60 p-8 sm:p-10">
          <Badge tone="blue" className="mb-4">
            The core thesis
          </Badge>
          <p className="max-w-3xl text-lg leading-relaxed text-gray-800">
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
