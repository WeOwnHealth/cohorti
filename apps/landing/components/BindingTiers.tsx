import { Badge, Card, CardBody, LockOpenIcon, LockHalfIcon, LockCheckIcon } from "@passport/design-system/components";

const tiers = [
  {
    tier: "T0",
    tone: "neutral" as const,
    label: "Unbound",
    body: "Holder-uploaded document or image. No issuer signature, no identity proofing. Treated as self-attestation with a legible source — not evidence.",
    Icon: LockOpenIcon,
    iconClasses: "bg-gray-100 text-gray-500",
  },
  {
    tier: "T1",
    tone: "amber" as const,
    label: "Account-bound",
    body: "Pulled via authenticated API from a wearable or consumer platform. Authentic to the device or account — but nothing rules out another person having generated it.",
    Icon: LockHalfIcon,
    iconClasses: "bg-amber-50 text-amber-600",
  },
  {
    tier: "T2",
    tone: "green" as const,
    label: "Issuer-bound",
    body: "Signed by an accredited laboratory or provider, identity-proofed at or near collection. The result belongs to the named holder — suitable for consequential decisions.",
    Icon: LockCheckIcon,
    iconClasses: "bg-green-50 text-green-600",
  },
];

export function BindingTiers() {
  return (
    <section id="trust" className="border-b border-gray-200 bg-gray-50 py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-display-sm">
            Trust isn&apos;t all-or-nothing.
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Every credential carries an explicit binding tier — how strongly it&apos;s tied to a
            real person — so a verifier sets its own floor instead of inheriting ours. A weaker
            credential can never silently satisfy a claim that requires a stronger one.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {tiers.map((t) => (
            <Card
              key={t.tier}
              className="transition-all duration-base ease-out hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardBody className="py-6">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${t.iconClasses}`}>
                  <t.Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="font-mono text-2xl font-bold text-gray-900">{t.tier}</span>
                  <Badge tone={t.tone}>{t.label}</Badge>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-gray-600">{t.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
