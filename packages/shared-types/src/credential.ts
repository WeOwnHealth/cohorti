import type { BindingTier } from "./binding-tier.js";

/** A reference to the FHIR R4 resource this credential was mapped from. */
export interface FhirRef {
  resourceType: string; // e.g. "Observation", "DiagnosticReport"
  resourceId: string;
  /** Endpoint of the FHIR store holding the resource, if externally addressable. */
  serverUrl?: string;
}

/**
 * Credential lifecycle states — mirrors the state machine in README.md
 * § "Credential Lifecycle (UML state machine)". Transitions are owned by
 * services/issuance and services/ingestion; this type exists so every
 * service agrees on the same vocabulary.
 */
export type CredentialLifecycleState =
  | "INGESTED"
  | "DE_IDENTIFIED"
  | "FHIR_MAPPED"
  | "ISSUED"
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED"
  | "LOST";

export interface Credential {
  id: string;
  issuerId: string;
  observationDate: string; // ISO 8601 — date the underlying data was recorded
  bindingTier: BindingTier;
  /** ISO 8601 duration (e.g. "P90D") after which the credential can no longer back a proof without refresh. */
  validityPeriod: string;
  issuedAt: string; // ISO 8601
  state: CredentialLifecycleState;
  fhirResource: FhirRef;
  /** True once the issuer has revoked it (see README.md § "issuer-initiated credential revocation"). */
  revoked: boolean;
}

/** True iff `credential` is usable to back a new proof right now. */
export function isCredentialUsable(credential: Credential, now: Date = new Date()): boolean {
  if (credential.revoked || credential.state !== "ACTIVE") return false;
  const issuedAt = new Date(credential.issuedAt);
  const expiry = addIsoDuration(issuedAt, credential.validityPeriod);
  return now < expiry;
}

/** Minimal ISO-8601 duration adder — supports the subset Passport actually emits (P<n>D, P<n>M, P<n>Y). */
function addIsoDuration(start: Date, duration: string): Date {
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/.exec(duration);
  if (!match) throw new Error(`Unsupported ISO 8601 duration: ${duration}`);
  const [, years, months, days] = match;
  const result = new Date(start);
  if (years) result.setUTCFullYear(result.getUTCFullYear() + Number(years));
  if (months) result.setUTCMonth(result.getUTCMonth() + Number(months));
  if (days) result.setUTCDate(result.getUTCDate() + Number(days));
  return result;
}
