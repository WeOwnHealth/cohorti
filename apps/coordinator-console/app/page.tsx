import Link from "next/link";
import { Badge, Card, CardBody, ClipboardIcon } from "@cohorti/design-system/components";
import { listAuditTraces } from "@/lib/api";

export default async function TraceListPage() {
  const traces = await listAuditTraces();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Candidate lists awaiting review
        </h1>
        <p className="mt-1 max-w-2xl text-[15px] text-gray-500">
          No candidate is approached until a qualified human reviews every inclusion and exclusion
          here — see README.md&apos;s non-functional requirement: &quot;No solely automated
          decision may determine a person&apos;s access to a trial.&quot;
        </p>
      </div>

      {traces.length === 0 ? (
        <Card className="border-dashed">
          <CardBody className="py-10 text-center text-sm text-gray-500">
            <p>No traces yet.</p>
            <p className="mt-2">
              This calls <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">GET /audit-traces</code> on{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">@cohorti/triage-agent</code> — start it
              with <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">pnpm --filter @cohorti/triage-agent dev</code>{" "}
              and <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">POST /screen</code> a cohort to see it
              here.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-gray-100">
            {traces.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <ClipboardIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Trial {t.trialId}</div>
                    <div className="mt-0.5 text-sm text-gray-500">
                      {t.decisions.length} candidates · {t.decisions.filter((d) => d.included).length} included
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge tone={t.humanReviewed ? "green" : "amber"}>
                    {t.humanReviewed ? "Reviewed" : "Pending review"}
                  </Badge>
                  <Link href={`/review/${t.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    Open →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
