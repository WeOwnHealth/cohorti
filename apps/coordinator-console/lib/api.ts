import type { AuditTrace } from "@passport/shared-types";

const TRIAGE_AGENT_URL = process.env.TRIAGE_AGENT_SVC_URL ?? "http://localhost:4009";

export async function listAuditTraces(): Promise<AuditTrace[]> {
  try {
    const res = await fetch(`${TRIAGE_AGENT_URL}/audit-traces`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as AuditTrace[];
  } catch {
    return [];
  }
}

export async function getAuditTrace(id: string): Promise<AuditTrace | null> {
  try {
    const res = await fetch(`${TRIAGE_AGENT_URL}/audit-traces/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AuditTrace;
  } catch {
    return null;
  }
}

export async function markReviewed(id: string): Promise<AuditTrace | null> {
  const res = await fetch(`${TRIAGE_AGENT_URL}/audit-traces/${encodeURIComponent(id)}/review`, {
    method: "PATCH",
  });
  if (!res.ok) return null;
  return (await res.json()) as AuditTrace;
}
