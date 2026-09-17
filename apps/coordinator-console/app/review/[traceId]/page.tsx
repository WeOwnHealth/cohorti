"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { AuditTrace } from "@passport/shared-types";
import { Badge, Button, Card, CardBody } from "@passport/design-system/components";
import { getAuditTrace, markReviewed } from "@/lib/api";

export default function ReviewTracePage() {
  const { traceId } = useParams<{ traceId: string }>();
  const [trace, setTrace] = useState<AuditTrace | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAuditTrace(traceId).then(setTrace);
  }, [traceId]);

  if (trace === undefined) return <p className="text-sm text-gray-500">Loading…</p>;
  if (trace === null) return <p className="text-sm text-gray-500">Trace not found.</p>;

  const included = trace.decisions.filter((d) => d.included);
  const excluded = trace.decisions.filter((d) => !d.included);

  async function handleApprove() {
    setSubmitting(true);
    const updated = await markReviewed(traceId);
    if (updated) setTrace(updated);
    setSubmitting(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Trial {trace.trialId}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Agent identity: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{trace.agentIdentity || "(unset)"}</code>
        </p>
      </div>

      <DecisionGroup title={`Included (${included.length})`} decisions={included} tone="green" />
      <DecisionGroup
        title={`Excluded (${excluded.length}) — reasoning required for every one`}
        decisions={excluded}
        tone="amber"
      />

      <Card className="bg-gray-50">
        <CardBody className="py-5">
          {trace.humanReviewed ? (
            <p className="flex items-center gap-2 text-sm font-medium text-green-600">
              <Badge tone="green">✓ Reviewed</Badge>
              Candidates may now be approached through the existing IRB-approved pathway.
            </p>
          ) : (
            <Button variant="primary" size="lg" onClick={handleApprove} disabled={submitting}>
              {submitting ? "Recording…" : "I have reviewed every inclusion and exclusion above"}
            </Button>
          )}
        </CardBody>
      </Card>
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
  tone: "green" | "amber";
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-gray-500">{title}</h2>
      {decisions.length === 0 ? (
        <p className="text-sm text-gray-400">none</p>
      ) : (
        <ul className="space-y-2">
          {decisions.map((d) => (
            <li
              key={d.candidateRef}
              className={`rounded-lg border p-4 text-sm ${
                tone === "green" ? "border-green-200 bg-green-50/40" : "border-amber-200 bg-amber-50/40"
              }`}
            >
              <div className="mb-1 font-mono text-xs text-gray-500">{d.candidateRef}</div>
              <div className="text-gray-800">{d.reasoning}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
