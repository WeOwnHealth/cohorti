import { listCredentials } from "@/lib/api";

// TODO(cohorti): replace with the signed-in holder's real id once auth
// exists. A hardcoded demo id keeps this page honest about what's wired up
// versus what isn't — see apps/holder-web/README.md.
const DEMO_HOLDER_ID = "demo-holder";

export default async function DashboardPage() {
  const credentials = await listCredentials(DEMO_HOLDER_ID);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold mb-1">Your credentials</h1>
        <p className="text-slate-500 text-sm mb-4">
          What was captured, which issuer stands behind it, and how strongly it&apos;s tied to you.
        </p>

        {credentials.length === 0 ? (
          <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-sm text-slate-500">
            No credentials yet. This calls <code>GET /credentials</code> on{" "}
            <code>@cohorti/issuance</code> — start it with{" "}
            <code>pnpm --filter @cohorti/issuance dev</code> and issue one via{" "}
            <code>POST /credentials</code> to see it here.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
            {credentials.map((c) => (
              <li key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.fhirResource.resourceType}</div>
                  <div className="text-sm text-slate-500">
                    Issuer {c.issuerId} · observed {new Date(c.observationDate).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                  {c.bindingTier}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">Sharing log</h2>
        <p className="text-slate-500 text-sm">
          TODO(cohorti): wire this to <code>@cohorti/disclosure-guard</code>&apos;s sharing-log store — it
          exists server-side but has no read endpoint yet. Negative results belong here too; see
          README.md § &quot;Surface negative results to the holder as disclosures in their own right.&quot;
        </p>
      </section>
    </div>
  );
}
