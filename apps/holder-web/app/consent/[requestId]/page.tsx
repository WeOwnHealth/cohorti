"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Button, Card, CardBody, ProofIcon } from "@passport/design-system/components";

/**
 * The consent prompt from README.md's Credential Holder user story, step 3:
 * "The holder sees the exact claim being asked for, the verifier's
 * identity, and what the proof will and will not reveal, before deciding."
 *
 * TODO(passport): this renders against mock data. The real flow needs
 * @passport/verifier-api to expose a *pending*-request concept — today
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
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
          <ProofIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Claim request</h1>
          <p className="mt-1 text-sm text-gray-500">Request {requestId}</p>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-4 py-6">
          <Row label="Verifier" value={mockRequest.verifierName} />
          <Row label="Claim" value={mockRequest.claimDescription} />
          <Row label="Will reveal" value={mockRequest.willReveal} />
          <Row label="Will NOT reveal" value={mockRequest.willNotReveal} emphasize />
          <div className="flex items-center justify-between gap-4 pt-1 text-sm">
            <span className="text-gray-500">Remaining budget</span>
            <Badge tone="blue">{mockRequest.remainingBudget}</Badge>
          </div>
        </CardBody>
      </Card>

      {decision === "pending" ? (
        <div className="flex gap-3">
          <Button variant="primary" size="lg" onClick={() => setDecision("approved")}>
            Approve
          </Button>
          <Button variant="outline" size="lg" onClick={() => setDecision("declined")}>
            Decline
          </Button>
        </div>
      ) : (
        <Card className="bg-gray-50">
          <CardBody className="py-4 text-sm text-gray-600">
            <span className="font-medium text-gray-900">
              {decision === "approved" ? "Approved." : "Declined."}
            </span>{" "}
            A proof already shared cannot be recalled — blocking a verifier only affects future
            requests.
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className={emphasize ? "text-right font-medium text-gray-900" : "text-right text-gray-700"}>
        {value}
      </span>
    </div>
  );
}
