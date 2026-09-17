/**
 * In-memory repository — deliberately swappable. Replace with Postgres-backed
 * (budgets, envelopes) + Redis-backed (atomic budget counters, to avoid a
 * race between two concurrent requests both reading "consumed=2, limit=3")
 * implementations before this leaves local development. The HTTP layer in
 * routes.ts depends only on this module's exported functions, not on how
 * they're implemented.
 */
import type {
  ClaimSchema,
  Credential,
  DisclosureBudget,
  DisclosureEnvelope,
  SharingLogEntry,
} from "@passport/shared-types";

type SharingLogEntryWithMarker = SharingLogEntry & { markerKey?: string };

const credentials = new Map<string, Credential>();
const claimSchemas = new Map<string, ClaimSchema>();
const envelopes = new Map<string, DisclosureEnvelope>(); // key: verifierId
const budgets = new Map<string, DisclosureBudget>(); // key: `${verifierId}:${credentialId}`
const sharingLog: SharingLogEntryWithMarker[] = [];

export function getCredential(id: string): Credential | undefined {
  return credentials.get(id);
}
export function putCredential(credential: Credential): void {
  credentials.set(credential.id, credential);
}

export function getClaimSchema(id: string): ClaimSchema | undefined {
  return claimSchemas.get(id);
}
export function putClaimSchema(schema: ClaimSchema): void {
  claimSchemas.set(schema.id, schema);
}

export function getEnvelope(verifierId: string): DisclosureEnvelope | undefined {
  return envelopes.get(verifierId);
}
export function putEnvelope(envelope: DisclosureEnvelope): void {
  envelopes.set(envelope.verifierId, envelope);
}

function budgetKey(verifierId: string, credentialId: string): string {
  return `${verifierId}:${credentialId}`;
}
export function getBudget(verifierId: string, credentialId: string): DisclosureBudget | undefined {
  return budgets.get(budgetKey(verifierId, credentialId));
}
export function putBudget(budget: DisclosureBudget): void {
  budgets.set(budgetKey(budget.verifierId, budget.credentialId), budget);
}
/** Increments `consumed`, resetting it first if the period has rolled over. */
export function consumeBudget(budget: DisclosureBudget, now: Date): DisclosureBudget {
  const periodStart = new Date(budget.periodStartedAt);
  const periodMs = isoDurationToMs(budget.period);
  const rolledOver = now.getTime() - periodStart.getTime() >= periodMs;
  const next: DisclosureBudget = rolledOver
    ? { ...budget, consumed: 1, periodStartedAt: now.toISOString() }
    : { ...budget, consumed: budget.consumed + 1 };
  putBudget(next);
  return next;
}

export function getPriorEntries(verifierId: string, credentialId: string): SharingLogEntryWithMarker[] {
  return sharingLog.filter((e) => e.verifierId === verifierId && e.credentialId === credentialId);
}
export function appendSharingLogEntry(entry: SharingLogEntryWithMarker): void {
  sharingLog.push(entry);
}

function isoDurationToMs(duration: string): number {
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/.exec(duration);
  if (!match) throw new Error(`Unsupported ISO 8601 duration: ${duration}`);
  const [, years, months, days] = match;
  const DAY = 24 * 60 * 60 * 1000;
  return (Number(years ?? 0) * 365 + Number(months ?? 0) * 30 + Number(days ?? 0)) * DAY;
}
