import { CredentialIcon, ProofIcon, ArrowRightIcon } from "@passport/design-system/components";

/**
 * The hero's visual centerpiece — not decoration for its own sake, but a
 * literal diagram of the mechanism the whole page is arguing for: raw data
 * becomes a credential, the credential becomes a proof, the verifier gets
 * a result and nothing else. Every label on this diagram is a claim made
 * in the surrounding copy, not a separate illustration idea.
 */
export function HeroVisual() {
  return (
    <div className="relative mx-auto mt-16 max-w-3xl">
      <div
        aria-hidden
        className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-[2rem] bg-gradient-to-b from-blue-50 to-transparent blur-2xl"
      />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <Stage
            icon={<CredentialIcon className="h-6 w-6" />}
            tone="gray"
            label="Lab, wearable, or record"
            sublabel="Stays de-identified, local"
          />

          <Connector />

          <Stage
            icon={<ProofIcon className="h-7 w-7" />}
            tone="blue"
            label="Midnight ZK proof"
            sublabel='"Below 200?" — one bit'
            emphasized
          />

          <Connector />

          <Stage tone="green" label="Verifier sees" sublabel="Pass · T2 · 4 days old" resultBadge />
        </div>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex shrink-0 items-center text-gray-300">
      <ArrowRightIcon className="hidden h-5 w-5 rotate-90 sm:block sm:rotate-0" />
      <ArrowRightIcon className="h-5 w-5 rotate-90 sm:hidden" />
    </div>
  );
}

function Stage({
  icon,
  tone,
  label,
  sublabel,
  emphasized,
  resultBadge,
}: {
  icon?: React.ReactNode;
  tone: "gray" | "blue" | "green";
  label: string;
  sublabel: string;
  emphasized?: boolean;
  resultBadge?: boolean;
}) {
  const toneClasses = {
    gray: "bg-gray-100 text-gray-500",
    blue: "bg-blue-500 text-white",
    green: "bg-green-50 text-green-600",
  }[tone];

  return (
    <div className="flex flex-col items-center gap-2.5 text-center">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full ${toneClasses} ${
          emphasized ? "shadow-[0_0_0_6px_rgba(47,111,237,0.1)]" : ""
        }`}
      >
        {resultBadge ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 12.5 10 17.5 19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          icon
        )}
      </div>
      <div>
        <div className="text-[13px] font-semibold text-gray-900">{label}</div>
        <div className="mt-0.5 text-xs text-gray-500">{sublabel}</div>
      </div>
    </div>
  );
}
