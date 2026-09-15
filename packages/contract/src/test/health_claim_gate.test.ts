// This file is part of WeOwnHealth/trials.
// SPDX-License-Identifier: Apache-2.0
//
// Vitest suite for the Wave-1 HealthClaimGate contract (jest was dropped:
// its VM cannot host the wasm-based compact-runtime — see CONTRACT_GOTCHAS.md).
// Each test runs the REAL compiled circuits in-process (see harness.ts).
// The negative tests are the ❌ paths — in-circuit assertion failures, which
// is exactly what a ZK eligibility story must prove (see CONTRACT_GOTCHAS.md §QA).

import { randomBytes } from "./utils.js";
import {
  HealthClaimGateSimulator,
  buildCommitment,
} from "./harness.js";
import { createHealthClaimGatePrivateState } from "../witnesses.js";

// Wave-1 demo values — must match pad(32, ...) defaults in the compact
// constructor (verified against the generated contract JS: right-padded
// ASCII, zeros to 32 bytes).
const bytes32 = (s: string): Uint8Array => {
  const b = new Uint8Array(32);
  b.set(new TextEncoder().encode(s));
  return b;
};
const DEMO_ISSUER_SK = bytes32("hcg:demo:issuer-sk");
const CHOLESTEROL_LABEL = bytes32("cholesterol");
const THRESHOLD = 200n;
const NOW = 1_000n;
const CONSENT_START = 500n;
const CONSENT_END = 5_000n;

const label64 = bytes32;

const makeSim = (overrides: object = {}) => {
  const state = createHealthClaimGatePrivateState({
    issuerSecretKey: DEMO_ISSUER_SK,
    biomarkerValue: 150n, // eligible: 150 < 200
    consentVerifierId: label64("sponsor-acme"),
    consentScope: new Uint8Array(32), // replaced per test with markerOf("cholesterol")
    consentIssuedAt: CONSENT_START,
    consentExpiresAt: CONSENT_END,
    requestNonce: randomBytes(32),
    ...overrides,
  });
  return new HealthClaimGateSimulator(state);
};

describe("HealthClaimGate — initial ledger state", () => {
  it("initializes deterministic demo defaults", () => {
    const sim = makeSim();
    const l = sim.getLedger();
    expect(l.credentials.isEmpty()).toBe(true);
    const expectedIssuer = sim.issuerPublicKey(DEMO_ISSUER_SK);
    expect([...l.authorizedIssuer]).toEqual([...expectedIssuer]);
    expect(l.trial.active).toBe(true);
    expect(l.trial.threshold).toBe(THRESHOLD);
    const cholMarker = sim.markerOf(CHOLESTEROL_LABEL);
    expect([...l.trial.markerId]).toEqual([...cholMarker]);
    expect(l.lastProof.is_some).toBe(false);
  });
});

describe("HealthClaimGate — issueCredential", () => {
  it("lets the trusted issuer register a credential commitment", () => {
    const sim = makeSim();
    const patient = sim.patientPublicKey(randomBytes(32));
    const marker = sim.markerOf(CHOLESTEROL_LABEL);
    const commitment = buildCommitment(sim, patient, marker, 150n, randomBytes(32));

    sim.issueCredential(patient, commitment);

    const l = sim.getLedger();
    expect(l.credentials.size()).toBe(1n);
    expect(l.credentials.member(patient)).toBe(true);
    const entry = l.credentials.lookup(patient);
    expect([...entry.commitment]).toEqual([...commitment]);
    expect(entry.active).toBe(true);
  });

  it("rejects an issuer that does not know the trust-anchor key", () => {
    const sim = makeSim({ issuerSecretKey: randomBytes(32) }); // wrong sk
    const patient = sim.patientPublicKey(randomBytes(32));
    const marker = sim.markerOf(CHOLESTEROL_LABEL);
    const commitment = buildCommitment(sim, patient, marker, 150n, randomBytes(32));
    expect(() => sim.issueCredential(patient, commitment)).toThrow(
      "failed assert: Unauthorized issuer",
    );
  });
});

describe("HealthClaimGate — proveClaim", () => {
  const setupEligible = () => {
    const sim = makeSim();
    const patient = sim.patientPublicKey(sim.getPrivateState().patientSecretKey);
    const marker = sim.markerOf(CHOLESTEROL_LABEL);
    // The wallet's consent record must actually cover the scope being proven
    // (makeSim's default zero-scope is only "unset", never used at proof time).
    sim.setPrivateState({ consentScope: marker });
    const commitment = buildCommitment(
      sim, patient, marker,
      sim.getPrivateState().biomarkerValue,      // 150n
      sim.getPrivateState().commitmentSalt,
    );
    sim.issueCredential(patient, commitment);
    return { sim, patient, marker };
  };

  it("proves eligibility for a value below the integer threshold (✅)", () => {
    const { sim, patient, marker } = setupEligible();
    const verifier = label64("sponsor-acme");

    sim.proveClaim(verifier, marker, NOW);

    const l = sim.getLedger();
    expect(l.lastProof.is_some).toBe(true);
    expect(l.lastProof.value.eligible).toBe(true);
    expect([...l.lastProof.value.patient]).toEqual([...patient]);
    expect([...l.lastProof.value.verifierId]).toEqual([...verifier]);
    expect([...l.lastProof.value.scopeMarker]).toEqual([...marker]);
    expect([...l.lastProof.value.nonce]).toEqual([...sim.getPrivateState().requestNonce]);
  });

  it("rejects a value at/above the threshold (❌ enforced in-circuit)", () => {
    const { sim, patient, marker } = setupEligible();
    const over = makeSim({ biomarkerValue: 220n }); // 220 >= 200
    over.setPrivateState({ consentScope: marker });
    const patient2 = over.patientPublicKey(over.getPrivateState().patientSecretKey);
    const commitment = buildCommitment(
      over, patient2, marker,
      over.getPrivateState().biomarkerValue, over.getPrivateState().commitmentSalt,
    );
    over.issueCredential(patient2, commitment);
    expect(() => over.proveClaim(label64("sponsor-acme"), marker, NOW)).toThrow(
      "failed assert: Threshold not met",
    );
  });

  it("rejects proving a marker that is not the trial's marker", () => {
    const { sim, marker } = setupEligible();
    const otherMarker = sim.markerOf(bytes32("hba1c"));
    expect(() => sim.proveClaim(label64("sponsor-acme"), otherMarker, NOW)).toThrow(
      "failed assert: Marker not part of trial criteria",
    );
  });

  it("rejects when the credential commitment does not match the witness (wrong salt)", () => {
    const { sim, patient, marker } = setupEligible();
    // Patient tries to prove with a DIFFERENT salt than the one committed.
    sim.setPrivateState({ commitmentSalt: randomBytes(32) });
    expect(() => sim.proveClaim(label64("sponsor-acme"), marker, NOW)).toThrow(
      "failed assert: Credential commitment mismatch",
    );
  });

  it("rejects a verifier outside the patient's consent", () => {
    const { sim, marker } = setupEligible();
    expect(() => sim.proveClaim(label64("sponsor-evil"), marker, NOW)).toThrow(
      "failed assert: Consent does not cover this verifier",
    );
  });

  it("rejects a scope outside the patient's consent", () => {
    const { sim, patient, marker } = setupEligible();
    sim.setPrivateState({ consentScope: sim.markerOf(bytes32("hba1c")) });
    expect(() => sim.proveClaim(label64("sponsor-acme"), marker, NOW)).toThrow(
      "failed assert: Consent does not cover requested scope",
    );
  });

  it("rejects expired consent", () => {
    const { sim, marker } = setupEligible();
    expect(() => sim.proveClaim(label64("sponsor-acme"), marker, 6_000n)).toThrow(
      "failed assert: Consent expired",
    );
  });

  it("rejects proving before consent is active", () => {
    const { sim, marker } = setupEligible();
    expect(() => sim.proveClaim(label64("sponsor-acme"), marker, 100n)).toThrow(
      "failed assert: Consent not yet active",
    );
  });

  it("rejects a patient with no credential on file", () => {
    const sim = makeSim(); // never issued
    const marker = sim.markerOf(CHOLESTEROL_LABEL);
    expect(() => sim.proveClaim(label64("sponsor-acme"), marker, NOW)).toThrow(
      "failed assert: No credential on file for patient",
    );
  });

  it("binds a fresh nonce into each proof (replay guard)", () => {
    const { sim, marker } = setupEligible();
    sim.proveClaim(label64("sponsor-acme"), marker, NOW);
    const first = sim.getLedger().lastProof.value.nonce;
    sim.setPrivateState({ requestNonce: randomBytes(32) });
    sim.proveClaim(label64("sponsor-acme"), marker, NOW);
    const second = sim.getLedger().lastProof.value.nonce;
    expect([...first]).not.toEqual([...second]);
  });
});
