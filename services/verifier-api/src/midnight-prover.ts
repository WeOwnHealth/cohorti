/**
 * Thin client over the Midnight (Compact) prover for a given claim type.
 *
 * Real integration point: once `contracts/midnight/circuits/*.compact` are
 * compiled (`compact compile <circuit>.compact managed/<circuit>`), the
 * compiler emits a TypeScript API under `managed/<circuit>/contract/` built
 * on `@midnight-ntwrk/compact-runtime` and `@midnight-ntwrk/midnight-js`.
 * That generated API — plus a running proof server
 * (`docker compose up midnight-proof-server`, see contracts/midnight/README.md)
 * — is what belongs behind this function. This stub keeps the *shape*
 * verifier-api depends on stable while that wiring lands.
 */
import type { BindingTier, ClaimType, RecencyWindow } from "@cohorti/shared-types";

export interface ProveRequest {
  claimType: ClaimType;
  credentialId: string;
  claimSchemaId: string;
  bindingTier: BindingTier;
}

export interface ProveResult {
  result: boolean;
  recency: RecencyWindow;
  /** Opaque proof artifact — verifier-api passes this through untouched; it never inspects the value behind it. */
  proofArtifact: string;
}

export async function generateProof(_req: ProveRequest): Promise<ProveResult> {
  // TODO(cohorti): replace with a call into the compiled circuit's
  // generated TS API against a running proof server. See
  // contracts/midnight/README.md and contracts/midnight/circuits/*.compact
  // for the four claim-type circuits this dispatches to.
  throw new Error(
    "midnight-prover.generateProof is not wired up yet — see the TODO in services/verifier-api/src/midnight-prover.ts",
  );
}
