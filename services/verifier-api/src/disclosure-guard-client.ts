import type { DisclosureDecision } from "@passport/shared-types";

const BASE_URL = process.env.DISCLOSURE_GUARD_URL ?? "http://localhost:4007";

export async function evaluateDisclosure(input: {
  verifierId: string;
  credentialId: string;
  claimSchemaId: string;
  holderApproved: boolean;
}): Promise<DisclosureDecision> {
  const res = await fetch(`${BASE_URL}/evaluate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`disclosure-guard /evaluate failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as DisclosureDecision;
}

export async function recordSharingLog(entry: {
  proofId: string;
  verifierId: string;
  credentialId: string;
  claimSchemaId: string;
  result: boolean;
}): Promise<void> {
  const res = await fetch(`${BASE_URL}/sharing-log`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    throw new Error(`disclosure-guard /sharing-log failed: ${res.status} ${await res.text()}`);
  }
}
