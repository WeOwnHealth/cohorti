import type { BindingTier } from "./binding-tier.js";

/**
 * Coarse recency window carried inside a proof — never an exact date, so a
 * verifier can reject stale data without learning when the underlying test
 * occurred. See README.md § "Carry a recency attestation inside the proof".
 */
export interface RecencyWindow {
  /** e.g. "WITHIN_30_DAYS" | "WITHIN_90_DAYS" | "WITHIN_1_YEAR" | "STALE" — kept as a string union at the call site, open here to avoid coupling this package to a specific bucketing scheme. */
  bucket: string;
}

export interface Proof {
  id: string;
  credentialId: string;
  claimSchemaId: string;
  verifierId: string;
  result: boolean;
  bindingTier: BindingTier;
  recency: RecencyWindow;
  generatedAt: string; // ISO 8601
  /** Opaque Midnight (Compact) proof artifact — verified off-chain by the verifier API, never inspected for its content by this type. */
  proofArtifact: string;
}

export interface Verifier {
  id: string;
  name: string;
  /** IDs of DisclosureEnvelopes this verifier has pre-declared and the holder has approved. */
  approvedEnvelopeIds: string[];
}
