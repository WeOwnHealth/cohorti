/**
 * The disclosure-control decision engine. This is a direct, node-for-node
 * implementation of the activity diagram in README.md
 * § "6. Proof Request & Disclosure Control (UML activity)" — keep the two
 * in sync; if you change a branch here, update that diagram too.
 *
 * Deliberately pure and I/O-free so it can be unit-tested without a server
 * or a database. `src/store.ts` supplies the data this reads; `src/routes.ts`
 * wires it to HTTP.
 */
import {
  type ClaimSchema,
  type Credential,
  type DisclosureBudget,
  type DisclosureDecision,
  type DisclosureEnvelope,
  type SharingLogEntry,
  isCredentialUsable,
  satisfiesTierFloor,
} from "@passport/shared-types";

export interface PolicyInput {
  credential: Credential;
  claimSchema: ClaimSchema;
  envelope: DisclosureEnvelope | undefined;
  budget: DisclosureBudget | undefined;
  /** Prior sharing-log entries for this exact (verifier, credential) pair, most recent first. */
  priorEntries: SharingLogEntry[];
  /** Resolved separately (e.g. from a consent-prompt response) — this engine does not prompt the holder itself. */
  holderApproved: boolean;
  now?: Date;
}

/**
 * Evaluates a disclosure request against every gate in order. The order
 * matters only for which refusal reason is reported first when several
 * would apply — every gate is still a hard refusal, never advisory.
 */
export function evaluateDisclosureRequest(input: PolicyInput): DisclosureDecision {
  const now = input.now ?? new Date();

  // 1. Claim within the verifier's pre-declared, holder-approved envelope?
  if (!input.envelope || !input.envelope.claimSchemaIds.includes(input.claimSchema.id)) {
    return { outcome: "REFUSED", reason: "CLAIM_NOT_IN_DECLARED_SET" };
  }

  // 2. Tier floor: credential.bindingTier >= schema.requiredTier.
  if (!satisfiesTierFloor(input.credential.bindingTier, input.claimSchema.requiredTier)) {
    return { outcome: "REFUSED", reason: "TIER_FLOOR_NOT_MET" };
  }

  // 3. Recency: credential still usable (not expired/revoked/inactive).
  if (!isCredentialUsable(input.credential, now)) {
    return { outcome: "REFUSED", reason: "STALE_DATA" };
  }

  // 4. Threshold-laddering: same marker, same verifier, a prior proof
  //    already exists against a *different* schema sharing this markerKey.
  //    Blocked outright — not merely logged — per the spec's explicit
  //    correction that laddering detection must refuse, not log-and-allow.
  if (input.claimSchema.markerKey && isLaddering(input)) {
    return { outcome: "REFUSED", reason: "THRESHOLD_LADDERING_DETECTED" };
  }

  // 5. Per-verifier, per-credential, per-period query budget.
  if (input.budget && isBudgetExhausted(input.budget, now)) {
    return { outcome: "REFUSED", reason: "BUDGET_EXHAUSTED" };
  }

  // 6. Aggregate disclosure bound — composable claims must stay within the
  //    consented envelope in aggregate, not just individually. v1 enforces
  //    this as "every requested schema must be a member of the envelope"
  //    (checked in step 1); a richer information-theoretic composition
  //    bound is tracked as follow-up work, not silently skipped.
  //    TODO(passport): replace with a real composition-leakage bound before
  //    this gate is relied on for anything beyond the envelope-membership
  //    check already performed in step 1.

  // 7. Holder consent.
  if (!input.holderApproved) {
    return { outcome: "REFUSED", reason: "HOLDER_DECLINED" };
  }

  return { outcome: "APPROVED" };
}

function isLaddering(input: PolicyInput): boolean {
  const markerKey = input.claimSchema.markerKey;
  return input.priorEntries.some((entry) => {
    if (entry.claimSchemaId === input.claimSchema.id) return false; // identical schema, identical question — not laddering by itself
    // A prior entry ladders against this request iff it targeted the same
    // marker via a *different* schema id from the same verifier.
    return entry.verifierId === input.envelope?.verifierId && markerKeyOf(entry) === markerKey;
  });
}

/**
 * The sharing log stores only proof/claim identifiers, not schema bodies,
 * so recovering a prior entry's markerKey requires the caller (store.ts) to
 * have denormalized it onto the entry at write time. See
 * `SharingLogEntryWithMarker` below — routes.ts is responsible for
 * supplying that shape.
 */
function markerKeyOf(entry: SharingLogEntry): string | undefined {
  return (entry as SharingLogEntry & { markerKey?: string }).markerKey;
}

function isBudgetExhausted(budget: DisclosureBudget, now: Date): boolean {
  const periodStart = new Date(budget.periodStartedAt);
  const periodMs = isoDurationToMs(budget.period);
  const periodElapsedMs = now.getTime() - periodStart.getTime();

  // A period boundary crossed means `consumed` is stale and should have
  // been reset by the caller before this check runs; treat it as not yet
  // exhausted rather than guessing at a reset here (no side effects in a
  // pure policy function).
  if (periodElapsedMs >= periodMs) return false;

  return budget.consumed >= budget.limit;
}

function isoDurationToMs(duration: string): number {
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/.exec(duration);
  if (!match) throw new Error(`Unsupported ISO 8601 duration: ${duration}`);
  const [, years, months, days] = match;
  const DAY = 24 * 60 * 60 * 1000;
  return (Number(years ?? 0) * 365 + Number(months ?? 0) * 30 + Number(days ?? 0)) * DAY;
}
