/**
 * Disclosure-control types shared between services/verifier-api and
 * services/disclosure-guard. The refusal reasons enumerate every branch of
 * the activity diagram in README.md § "Proof Request & Disclosure Control" —
 * keep this list and that diagram in sync.
 */

export interface DisclosureBudget {
  verifierId: string;
  credentialId: string;
  /** ISO 8601 duration, e.g. "P30D" — the rolling window the limit applies over. */
  period: string;
  limit: number;
  consumed: number;
  /** Start of the current period, ISO 8601 — used to decide when `consumed` resets. */
  periodStartedAt: string;
}

export interface SharingLogEntry {
  proofId: string;
  verifierId: string;
  credentialId: string;
  claimSchemaId: string;
  result: boolean;
  timestamp: string; // ISO 8601
  /** A negative (false) proof result is itself a disclosure — always true when result === false. */
  isNegativeDisclosure: boolean;
}

/** Every refusal path in the disclosure-control activity diagram, plus the terminal approve/decline outcomes. */
export type DisclosureRefusalReason =
  | "CLAIM_NOT_IN_DECLARED_SET"
  | "TIER_FLOOR_NOT_MET"
  | "STALE_DATA"
  | "THRESHOLD_LADDERING_DETECTED"
  | "BUDGET_EXHAUSTED"
  | "ENVELOPE_EXCEEDED"
  | "HOLDER_DECLINED";

export type DisclosureDecision =
  | { outcome: "APPROVED" }
  | { outcome: "REFUSED"; reason: DisclosureRefusalReason };

/**
 * Request shape evaluated by services/disclosure-guard. Never carries the
 * underlying health value — only identifiers and the requested claim.
 */
export interface DisclosureRequest {
  verifierId: string;
  credentialId: string;
  claimSchemaId: string;
  requestedAt: string; // ISO 8601
}
