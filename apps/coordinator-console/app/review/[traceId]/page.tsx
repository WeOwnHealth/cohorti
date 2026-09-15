"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { AuditTrace } from "@cohorti/shared-types";
import { getAuditTrace, markReviewed } from "@/lib/api";

export default function ReviewTracePage() {
  const { traceId } = useParams<{ traceId: string }>();
  const [trace, setTrace] = useState<AuditTrace | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAuditTrace(traceId).then(setTrace);
  }, [traceId]);

  if (trace === undefined) return <p className="text-sm text-slate-500">Loading…</p>;
  if (trace === null) return <p className="text-sm text-slate-500">Trace not found.</p>;

  const included = trace.decisions.filter((d) => d.included);
  const excluded = trace.decisions.filter((d) => !d.included);

  async function handleApprove() {
    setSubmitting(true);
    const updated = await markReviewed(traceId);
    if (updated) setTrace(updated);
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Trial {trace.trialId}</h1>
        <p className="text-slate-500 text-sm">
          Agent identity: <code>{trace.agentIdentity || "(unset)"}</code>
        </p>
      </div>

      <DecisionGroup title={`Included (${included.length})`} decisions={included} tone="positive" />
      <DecisionGroup
        title={`Excluded (${excluded.length}) — reasoning required for every one`}
        decisions={excluded}
        tone="negative"
      />

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        {trace.humanReviewed ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            ✓ Reviewed. Candidates may now be approached through the existing IRB-approved pathway.
          </p>
        ) : (
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="px-4 py-2 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Recording…" : "I have reviewed every inclusion and exclusion above"}
          </button>
        )}
      </div>
    </div>
  );
}

function DecisionGroup({
  title,
  decisions,
  tone,
}: {
  title: string;
  decisions: AuditTrace["decisions"];
  tone: "positive" | "negative";
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold mb-2 text-slate-500">{title}</h2>
      {decisions.length === 0 ? (
        <p className="text-sm text-slate-400">none</p>
      ) : (
        <ul className="space-y-2">
          {decisions.map((d) => (
            <li
              key={d.candidateRef}
              className={`text-sm p-3 rounded border ${
                tone === "positive"
                  ? "border-emerald-200 dark:border-emerald-900"
                  : "border-amber-200 dark:border-amber-900"
              }`}
            >
              <div className="font-mono text-xs text-slate-500 mb-1">{d.candidateRef}</div>
              <div>{d.reasoning}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
