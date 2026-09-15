import assert from "node:assert/strict";
import { test } from "node:test";
import { BindingTier, type ClaimSchema, type Credential } from "@cohorti/shared-types";
import { evaluateDisclosureRequest, type PolicyInput } from "./policy.js";

const NOW = new Date("2026-06-01T00:00:00.000Z");

function makeCredential(overrides: Partial<Credential> = {}): Credential {
  return {
    id: "cred-1",
    issuerId: "issuer-1",
    observationDate: "2026-05-01T00:00:00.000Z",
    bindingTier: BindingTier.T2_ISSUER_BOUND,
    validityPeriod: "P90D",
    issuedAt: "2026-05-01T00:00:00.000Z",
    state: "ACTIVE",
    fhirResource: { resourceType: "Observation", resourceId: "obs-1" },
    revoked: false,
    ...overrides,
  };
}

function makeSchema(overrides: Partial<ClaimSchema> = {}): ClaimSchema {
  return {
    id: "schema-cholesterol-below-200",
    claimType: "THRESHOLD",
    requiredTier: BindingTier.T2_ISSUER_BOUND,
    validityPeriod: "P90D",
    description: "LDL cholesterol below 200 mg/dL",
    markerKey: "ldl_cholesterol_mg_dl",
    ...overrides,
  };
}

function baseInput(overrides: Partial<PolicyInput> = {}): PolicyInput {
  const schema = makeSchema();
  return {
    credential: makeCredential(),
    claimSchema: schema,
    envelope: { verifierId: "verifier-1", claimSchemaIds: [schema.id] },
    budget: {
      verifierId: "verifier-1",
      credentialId: "cred-1",
      period: "P30D",
      limit: 3,
      consumed: 0,
      periodStartedAt: "2026-05-15T00:00:00.000Z",
    },
    priorEntries: [],
    holderApproved: true,
    now: NOW,
    ...overrides,
  };
}

test("approves a well-formed, in-budget, consented request", () => {
  const decision = evaluateDisclosureRequest(baseInput());
  assert.deepEqual(decision, { outcome: "APPROVED" });
});

test("refuses a claim outside the pre-declared envelope", () => {
  const decision = evaluateDisclosureRequest(
    baseInput({ envelope: { verifierId: "verifier-1", claimSchemaIds: ["some-other-schema"] } }),
  );
  assert.deepEqual(decision, { outcome: "REFUSED", reason: "CLAIM_NOT_IN_DECLARED_SET" });
});

test("refuses when the credential's binding tier is below the schema's required tier", () => {
  const decision = evaluateDisclosureRequest(
    baseInput({ credential: makeCredential({ bindingTier: BindingTier.T1_ACCOUNT_BOUND }) }),
  );
  assert.deepEqual(decision, { outcome: "REFUSED", reason: "TIER_FLOOR_NOT_MET" });
});

test("never allows a T0 or T1 credential to satisfy a T2-required schema (tier floor, by construction)", () => {
  for (const tier of [BindingTier.T0_UNBOUND, BindingTier.T1_ACCOUNT_BOUND]) {
    const decision = evaluateDisclosureRequest(
      baseInput({
        credential: makeCredential({ bindingTier: tier }),
        claimSchema: makeSchema({ requiredTier: BindingTier.T2_ISSUER_BOUND }),
      }),
    );
    assert.equal(decision.outcome, "REFUSED");
  }
});

test("refuses a stale (expired) credential", () => {
  const decision = evaluateDisclosureRequest(
    baseInput({
      credential: makeCredential({ issuedAt: "2020-01-01T00:00:00.000Z", validityPeriod: "P90D" }),
    }),
  );
  assert.deepEqual(decision, { outcome: "REFUSED", reason: "STALE_DATA" });
});

test("blocks threshold-laddering: a second schema on the same markerKey from the same verifier is refused, not logged-and-allowed", () => {
  const laddered = makeSchema({ id: "schema-cholesterol-below-190" });
  const decision = evaluateDisclosureRequest(
    baseInput({
      claimSchema: laddered,
      envelope: { verifierId: "verifier-1", claimSchemaIds: [laddered.id, "schema-cholesterol-below-200"] },
      priorEntries: [
        {
          proofId: "proof-1",
          verifierId: "verifier-1",
          credentialId: "cred-1",
          claimSchemaId: "schema-cholesterol-below-200",
          result: true,
          timestamp: "2026-05-20T00:00:00.000Z",
          isNegativeDisclosure: false,
          // denormalized by the store for laddering correlation — see policy.ts markerKeyOf()
          ...({ markerKey: "ldl_cholesterol_mg_dl" } as Record<string, unknown>),
        },
      ],
    }),
  );
  assert.deepEqual(decision, { outcome: "REFUSED", reason: "THRESHOLD_LADDERING_DETECTED" });
});

test("does not flag laddering across different verifiers on the same marker", () => {
  const schema = makeSchema({ id: "schema-cholesterol-below-190" });
  const decision = evaluateDisclosureRequest(
    baseInput({
      claimSchema: schema,
      envelope: { verifierId: "verifier-2", claimSchemaIds: [schema.id] },
      budget: {
        verifierId: "verifier-2",
        credentialId: "cred-1",
        period: "P30D",
        limit: 3,
        consumed: 0,
        periodStartedAt: "2026-05-15T00:00:00.000Z",
      },
      priorEntries: [
        {
          proofId: "proof-1",
          verifierId: "verifier-1", // different verifier
          credentialId: "cred-1",
          claimSchemaId: "schema-cholesterol-below-200",
          result: true,
          timestamp: "2026-05-20T00:00:00.000Z",
          isNegativeDisclosure: false,
          ...({ markerKey: "ldl_cholesterol_mg_dl" } as Record<string, unknown>),
        },
      ],
    }),
  );
  assert.deepEqual(decision, { outcome: "APPROVED" });
});

test("refuses once the per-verifier, per-credential, per-period budget is exhausted", () => {
  const decision = evaluateDisclosureRequest(
    baseInput({
      budget: {
        verifierId: "verifier-1",
        credentialId: "cred-1",
        period: "P30D",
        limit: 3,
        consumed: 3,
        periodStartedAt: "2026-05-15T00:00:00.000Z",
      },
    }),
  );
  assert.deepEqual(decision, { outcome: "REFUSED", reason: "BUDGET_EXHAUSTED" });
});

test("does not treat a budget as exhausted once its period has rolled over", () => {
  const decision = evaluateDisclosureRequest(
    baseInput({
      budget: {
        verifierId: "verifier-1",
        credentialId: "cred-1",
        period: "P30D",
        limit: 3,
        consumed: 3,
        periodStartedAt: "2026-01-01T00:00:00.000Z", // well over 30 days before NOW
      },
    }),
  );
  assert.deepEqual(decision, { outcome: "APPROVED" });
});

test("refuses when the holder has not approved", () => {
  const decision = evaluateDisclosureRequest(baseInput({ holderApproved: false }));
  assert.deepEqual(decision, { outcome: "REFUSED", reason: "HOLDER_DECLINED" });
});

test("gate order: tier floor is checked before holder consent is even relevant", () => {
  const decision = evaluateDisclosureRequest(
    baseInput({
      credential: makeCredential({ bindingTier: BindingTier.T0_UNBOUND }),
      holderApproved: false,
    }),
  );
  assert.deepEqual(decision, { outcome: "REFUSED", reason: "TIER_FLOOR_NOT_MET" });
});
