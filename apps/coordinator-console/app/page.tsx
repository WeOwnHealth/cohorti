import Link from "next/link";
import { listAuditTraces } from "@/lib/api";

export default async function TraceListPage() {
  const traces = await listAuditTraces();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Candidate lists awaiting review</h1>
        <p className="text-slate-500 text-sm">
          No candidate is approached until a qualified human reviews every inclusion and exclusion here —
          see README.md&apos;s non-functional requirement: &quot;No solely automated decision may determine
          a person&apos;s access to a trial.&quot;
        </p>
      </div>

      {traces.length === 0 ? (
        <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-sm text-slate-500">
          No traces yet. This calls <code>GET /audit-traces</code> on <code>@cohorti/triage-agent</code> —
          start it with <code>pnpm --filter @cohorti/triage-agent dev</code> and{" "}
          <code>POST /screen</code> a cohort to see it here.
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
          {traces.map((t) => (
            <li key={t.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">Trial {t.trialId}</div>
                <div className="text-sm text-slate-500">
                  {t.decisions.length} candidates · {t.decisions.filter((d) => d.included).length} included
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    t.humanReviewed
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  }`}
                >
                  {t.humanReviewed ? "reviewed" : "pending review"}
                </span>
                <Link href={`/review/${t.id}`} className="text-sm underline">
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
