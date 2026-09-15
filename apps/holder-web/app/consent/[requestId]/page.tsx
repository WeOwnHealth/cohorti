"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

/**
 * The consent prompt from README.md's Credential Holder user story, step 3:
 * "The holder sees the exact claim being asked for, the verifier's
 * identity, and what the proof will and will not reveal, before deciding."
 *
 * TODO(cohorti): this renders against mock data. The real flow needs
 * @cohorti/verifier-api to expose a *pending*-request concept — today
 * POST /proof-requests takes `holderApproved` as an input and resolves
 * synchronously, which is a v1 simplification, not the real UX: a verifier
 * shouldn't already know the answer. Add GET /proof-requests/:id (for this
 * page to fetch) and POST /proof-requests/:id/respond (for Approve/Decline
 * below to call) before wiring this up for real.
 */
export default function ConsentPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const [decision, setDecision] = useState<"pending" | "approved" | "declined">("pending");

  // Mock data standing in for GET /proof-requests/:id — see TODO above.
  const mockRequest = {
    verifierName: "Acme Benefits Co.",
    claimDescription: "LDL cholesterol below 200 mg/dL",
    willReveal: "Pass/fail result, binding tier, and how recent the data is",
    willNotReveal: "The actual cholesterol value, or any other data on your credential",
    remainingBudget: "2 of 3 requests this period",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Claim request</h1>
        <p className="text-slate-500 text-sm">Request {requestId}</p>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <Row label="Verifier" value={mockRequest.verifierName} />
        <Row label="Claim" value={mockRequest.claimDescription} />
        <Row label="Will reveal" value={mockRequest.willReveal} />
        <Row label="Will NOT reveal" value={mockRequest.willNotReveal} emphasize />
        <Row label="Remaining budget" value={mockRequest.remainingBudget} />
      </div>

      {decision === "pending" ? (
        <div className="flex gap-3">
          <button
            onClick={() => setDecision("approved")}
            className="px-4 py-2 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium"
          >
            Approve
          </button>
          <button
            onClick={() => setDecision("declined")}
            className="px-4 py-2 rounded border border-slate-300 dark:border-slate-700 text-sm font-medium"
          >
            Decline
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          {decision === "approved" ? "Approved." : "Declined."} A proof already shared cannot be recalled —
          blocking a verifier only affects future requests.
        </p>
      )}
    </div>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={emphasize ? "font-medium text-right" : "text-right"}>{value}</span>
    </div>
  );
}
