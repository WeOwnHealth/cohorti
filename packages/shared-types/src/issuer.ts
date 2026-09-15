/**
 * Accreditation levels a trusted issuer can hold. Kept as an open string
 * union (not a fixed enum) because the accreditation taxonomy is owned by
 * the trusted-issuer registry's governance process, not by this codebase —
 * see README.md § "Maintain a trusted-issuer registry with defined
 * accreditation criteria, an admission process, and a published governance
 * model."
 */
export type AccreditationLevel = string;

export interface Issuer {
  id: string;
  name: string;
  accreditationLevel: AccreditationLevel;
  admittedAt: string; // ISO 8601
  /** True once the registry's governance process has revoked accreditation. */
  accreditationRevoked: boolean;
}

/**
 * The trusted-issuer registry: admission process + governance, per README.md
 * § "Identity binding and issuer trust". `governanceModel` should point at a
 * published document (URL or on-chain reference), not embed policy text.
 */
export interface TrustedIssuerRegistry {
  governanceModelRef: string;
  admit(issuer: Omit<Issuer, "admittedAt" | "accreditationRevoked">): Issuer;
  revokeAccreditation(issuerId: string): void;
  isAccredited(issuerId: string): boolean;
}
