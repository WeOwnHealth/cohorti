import { Badge, Card, CardBody, CardHeader, CredentialIcon, ClipboardIcon } from "@passport/design-system/components";
import type { BadgeTone } from "@passport/design-system/components";
import { listCredentials } from "@/lib/api";

// TODO(passport): replace with the signed-in holder's real id once auth
// exists. A hardcoded demo id keeps this page honest about what's wired up
// versus what isn't — see apps/holder-web/README.md.
const DEMO_HOLDER_ID = "demo-holder";

const TIER_TONE: Record<string, BadgeTone> = {
  T0_UNBOUND: "neutral",
  T1_ACCOUNT_BOUND: "amber",
  T2_ISSUER_BOUND: "green",
};

const TIER_LABEL: Record<string, string> = {
  T0_UNBOUND: "T0 · Unbound",
  T1_ACCOUNT_BOUND: "T1 · Account-bound",
  T2_ISSUER_BOUND: "T2 · Issuer-bound",
};

export default async function DashboardPage() {
  const credentials = await listCredentials(DEMO_HOLDER_ID);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Your credentials</h1>
        <p className="mt-1 text-[15px] text-gray-500">
          What was captured, which issuer stands behind it, and how strongly it&apos;s tied to you.
        </p>
      </div>

      {credentials.length === 0 ? (
        <Card className="border-dashed">
          <CardBody className="py-10 text-center text-sm text-gray-500">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <CredentialIcon className="h-6 w-6" />
            </div>
            <p className="font-medium text-gray-700">No credentials yet.</p>
            <p className="mt-2">
              This calls <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">GET /credentials</code> on{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">@passport/issuance</code> — start it
              with <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">pnpm --filter @passport/issuance dev</code>{" "}
              and issue one via <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">POST /credentials</code> to
              see it here.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-gray-100">
            {credentials.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <CredentialIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{c.fhirResource.resourceType}</div>
                    <div className="mt-0.5 text-sm text-gray-500">
                      Issuer {c.issuerId} · observed {new Date(c.observationDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Badge tone={TIER_TONE[c.bindingTier] ?? "neutral"}>
                  {TIER_LABEL[c.bindingTier] ?? c.bindingTier}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div>
        <Card>
          <CardHeader className="flex items-center gap-2.5">
            <ClipboardIcon className="h-4 w-4 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">Sharing log</h2>
          </CardHeader>
          <CardBody className="text-sm leading-relaxed text-gray-500">
            TODO(passport): wire this to <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">@passport/disclosure-guard</code>
            &apos;s sharing-log store — it exists server-side but has no read endpoint yet. Negative
            results belong here too; see README.md &sect; &quot;Surface negative results to the holder
            as disclosures in their own right.&quot;
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
