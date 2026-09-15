// This file is part of WeOwnHealth/trials.
// SPDX-License-Identifier: Apache-2.0
//
// Shape of the contract's private state + the witness implementations.
// Every value here stays in the patient wallet / issuer backend — none of it
// is ever part of the public ledger.

import type { Ledger } from "./managed/health-claim-gate/contract/index.js";
import type { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export type HealthClaimGatePrivateState = {
  // patient side
  readonly patientSecretKey: Uint8Array; // Bytes<32>
  readonly biomarkerValue: bigint; // Uint<64>, e.g. 150n (mg/dL, integer only)
  readonly commitmentSalt: Uint8Array; // Bytes<32>, random blinding nonce
  // issuer side
  readonly issuerSecretKey: Uint8Array; // Bytes<32>, demo trust anchor (see compact constructor)
  // consent record (patient's wallet): who + scope + time window
  readonly consentVerifierId: Uint8Array; // Bytes<32>
  readonly consentScope: Uint8Array; // Bytes<32> — marker id the consent covers
  readonly consentIssuedAt: bigint; // Uint<64>
  readonly consentExpiresAt: bigint; // Uint<64>
  // freshness
  readonly requestNonce: Uint8Array; // Bytes<32>, per-request (replay guard)
};

export const createHealthClaimGatePrivateState = (
  partial: Partial<HealthClaimGatePrivateState>,
): HealthClaimGatePrivateState => ({
  patientSecretKey: new Uint8Array(32),
  biomarkerValue: 0n,
  commitmentSalt: new Uint8Array(32),
  issuerSecretKey: new Uint8Array(32),
  consentVerifierId: new Uint8Array(32),
  consentScope: new Uint8Array(32),
  consentIssuedAt: 0n,
  consentExpiresAt: 0n,
  requestNonce: new Uint8Array(32),
  ...partial,
});

/**
 * One implementation per `witness` declaration in health_claim_gate.compact.
 * Each function receives a WitnessContext ({ ledger, privateState,
 * contractAddress }) and returns [newPrivateState, value].
 */
export const witnesses = {
  patientSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, HealthClaimGatePrivateState>): [
    HealthClaimGatePrivateState,
    Uint8Array,
  ] => [privateState, privateState.patientSecretKey],

  biomarkerValue: ({
    privateState,
  }: WitnessContext<Ledger, HealthClaimGatePrivateState>): [
    HealthClaimGatePrivateState,
    bigint,
  ] => [privateState, privateState.biomarkerValue],

  commitmentSalt: ({
    privateState,
  }: WitnessContext<Ledger, HealthClaimGatePrivateState>): [
    HealthClaimGatePrivateState,
    Uint8Array,
  ] => [privateState, privateState.commitmentSalt],

  issuerSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, HealthClaimGatePrivateState>): [
    HealthClaimGatePrivateState,
    Uint8Array,
  ] => [privateState, privateState.issuerSecretKey],

  consentVerifierId: ({
    privateState,
  }: WitnessContext<Ledger, HealthClaimGatePrivateState>): [
    HealthClaimGatePrivateState,
    Uint8Array,
  ] => [privateState, privateState.consentVerifierId],

  consentScope: ({
    privateState,
  }: WitnessContext<Ledger, HealthClaimGatePrivateState>): [
    HealthClaimGatePrivateState,
    Uint8Array,
  ] => [privateState, privateState.consentScope],

  consentIssuedAt: ({
    privateState,
  }: WitnessContext<Ledger, HealthClaimGatePrivateState>): [
    HealthClaimGatePrivateState,
    bigint,
  ] => [privateState, privateState.consentIssuedAt],

  consentExpiresAt: ({
    privateState,
  }: WitnessContext<Ledger, HealthClaimGatePrivateState>): [
    HealthClaimGatePrivateState,
    bigint,
  ] => [privateState, privateState.consentExpiresAt],

  requestNonce: ({
    privateState,
  }: WitnessContext<Ledger, HealthClaimGatePrivateState>): [
    HealthClaimGatePrivateState,
    Uint8Array,
  ] => [privateState, privateState.requestNonce],
} as const;
