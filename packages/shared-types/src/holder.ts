export interface Holder {
  id: string;
  /** IDs of verifiers this holder has blocked from future proof generation. Forward-looking only — see README.md. */
  blockedVerifierIds: string[];
}
