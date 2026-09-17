/** In-memory credential store — see services/disclosure-guard/src/store.ts for the swap-before-production caveat this repeats everywhere. */
import type { Credential } from "@passport/shared-types";

const byHolder = new Map<string, Credential[]>();
const byId = new Map<string, Credential>();

export function issue(holderId: string, credential: Credential): void {
  byId.set(credential.id, credential);
  const existing = byHolder.get(holderId) ?? [];
  byHolder.set(holderId, [...existing, credential]);
}

export function listForHolder(holderId: string): Credential[] {
  return byHolder.get(holderId) ?? [];
}

export function getById(id: string): Credential | undefined {
  return byId.get(id);
}
