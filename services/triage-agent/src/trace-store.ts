/**
 * In-memory trace store, standing in for a call to @cohorti/audit (append)
 * plus a Postgres row (for the humanReviewed flag, which needs to be
 * updatable — the hash chain in @cohorti/audit is append-only by design and
 * shouldn't be mutated after the fact). See routes.ts TODOs.
 */
import type { AuditTrace } from "@cohorti/shared-types";

const traces = new Map<string, AuditTrace>();

export function save(trace: AuditTrace): void {
  traces.set(trace.id, trace);
}

export function get(id: string): AuditTrace | undefined {
  return traces.get(id);
}

export function markReviewed(id: string): AuditTrace | undefined {
  const trace = traces.get(id);
  if (!trace) return undefined;
  const updated: AuditTrace = { ...trace, humanReviewed: true };
  traces.set(id, updated);
  return updated;
}

export function list(): AuditTrace[] {
  return [...traces.values()];
}
