/**
 * Binding tier — how strongly a credential is tied to the person presenting
 * it. See README.md § "Identity binding and issuer trust".
 *
 * This is an attribute of the *credential* (set once at issuance). The
 * *required* tier for a given claim lives on {@link ClaimSchema.requiredTier}
 * — see claim.ts. The tier floor invariant is:
 *
 *   credential.bindingTier >= claimSchema.requiredTier
 *
 * That comparison MUST be enforced by construction wherever a proof is
 * generated (see services/disclosure-guard) — never bypassable, never a
 * silent downgrade.
 */
export enum BindingTier {
  /** Holder-uploaded document or image; no issuer signature, no identity proofing. Not evidence. */
  T0_UNBOUND = "T0_UNBOUND",
  /** Pulled via authenticated API from a wearable/consumer platform; bound to an account, not a person. */
  T1_ACCOUNT_BOUND = "T1_ACCOUNT_BOUND",
  /** Signed by an accredited laboratory or provider; identity proofed at or near collection. Suitable for consequential decisions. */
  T2_ISSUER_BOUND = "T2_ISSUER_BOUND",
}

/** Ordinal ranking used for tier-floor comparisons. Higher = stronger binding. */
export const BINDING_TIER_RANK: Record<BindingTier, number> = {
  [BindingTier.T0_UNBOUND]: 0,
  [BindingTier.T1_ACCOUNT_BOUND]: 1,
  [BindingTier.T2_ISSUER_BOUND]: 2,
};

/** True iff `credentialTier` satisfies `requiredTier` (the tier-floor check). */
export function satisfiesTierFloor(
  credentialTier: BindingTier,
  requiredTier: BindingTier,
): boolean {
  return BINDING_TIER_RANK[credentialTier] >= BINDING_TIER_RANK[requiredTier];
}
