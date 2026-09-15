import type { BindingTier } from "./binding-tier.js";

/**
 * The four claim types Cohorti proofs support — see README.md § "Proof and
 * verification" and the Midnight circuits under contracts/midnight/circuits.
 */
export type ClaimType = "THRESHOLD" | "RANGE" | "CATEGORY" | "ELIGIBILITY_MATCH";

export interface ClaimSchema {
  id: string;
  claimType: ClaimType;
  /** Minimum binding tier a credential must carry to satisfy this schema — the tier floor. */
  requiredTier: BindingTier;
  /** ISO 8601 duration; a proof against data older than this is refused (recency). */
  validityPeriod: string;
  /** Human-readable description shown to the holder in the consent prompt. */
  description: string;
  /**
   * Correlates THRESHOLD/RANGE schemas that test the *same* underlying
   * attribute at different cut points (e.g. "ldl_cholesterol_mg_dl" behind
   * both a "below 200" and a "below 190" schema). Never the value itself —
   * only used to detect threshold-laddering: repeated proofs against the
   * same markerKey from one verifier must be refused, not merely logged.
   * See README.md § "Disclosure control across repeated proofs".
   */
  markerKey?: string;
}

/**
 * A verifier's pre-declared disclosure envelope: the bounded set of claim
 * schemas it may request against one credential, agreed to up front so the
 * holder consents once rather than to an open-ended series of "reasonable"
 * questions. See README.md § "Disclosure control across repeated proofs".
 */
export interface DisclosureEnvelope {
  verifierId: string;
  claimSchemaIds: string[];
  /** Optional human-readable purpose statement shown at consent time. */
  purpose?: string;
}
