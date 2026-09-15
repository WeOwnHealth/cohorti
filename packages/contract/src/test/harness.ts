// This file is part of WeOwnHealth/trials.
// SPDX-License-Identifier: Apache-2.0
//
// In-process simulator for HealthClaimGate — the contract run against the
// compact-runtime so tests exercise the REAL compiled circuits (no testnet
// needed). Pattern mirrors the official midnightntwrk/example-bboard harness.

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  convertFieldToBytes,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
  type CommitmentPreimage,
} from "../managed/health-claim-gate/contract/index.js";
import {
  type HealthClaimGatePrivateState,
  witnesses,
} from "../witnesses.js";

export class HealthClaimGateSimulator {
  readonly contract: Contract<HealthClaimGatePrivateState>;
  circuitContext: CircuitContext<HealthClaimGatePrivateState>;

  constructor(privateState: HealthClaimGatePrivateState) {
    this.contract = new Contract<HealthClaimGatePrivateState>(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      this.contract.initialState(
        createConstructorContext(privateState, "0".repeat(64)),
      );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): HealthClaimGatePrivateState {
    return this.circuitContext.currentPrivateState;
  }

  /**
   * Wallet-style private-state update between transactions (nonce rotation,
   * consent grant/expiry, …). Spreads over the current state like a wallet
   * building its next private state snapshot — the readonly fields on
   * HealthClaimGatePrivateState stay enforced for readers.
   */
  public setPrivateState(update: Partial<HealthClaimGatePrivateState>): void {
    this.circuitContext.currentPrivateState = {
      ...this.circuitContext.currentPrivateState,
      ...update,
    };
  }

  // ---- pure helpers (mirror the wallet-side derivation logic) ----------
  public issuerPublicKey(sk: Uint8Array): Uint8Array {
    return this.contract.circuits.issuerPublicKey(
      this.circuitContext,
      sk,
    ).result;
  }

  public patientPublicKey(sk: Uint8Array): Uint8Array {
    return this.contract.circuits.patientPublicKey(
      this.circuitContext,
      sk,
    ).result;
  }

  public markerOf(label: Uint8Array): Uint8Array {
    return this.contract.circuits.markerOf(this.circuitContext, label).result;
  }

  public commitmentOf(preimage: CommitmentPreimage): Uint8Array {
    return this.contract.circuits.commitmentOf(
      this.circuitContext,
      preimage,
    ).result;
  }

  // ---- the two proof circuits -----------------------------------------
  public issueCredential(patient: Uint8Array, commitment: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.issueCredential(
      this.circuitContext,
      patient,
      commitment,
    ).context;
    return this.getLedger();
  }

  public proveClaim(
    verifierId: Uint8Array,
    requestedMarker: Uint8Array,
    now: bigint,
  ): Ledger {
    this.circuitContext = this.contract.impureCircuits.proveClaim(
      this.circuitContext,
      verifierId,
      requestedMarker,
      now,
    ).context;
    return this.getLedger();
  }
}

/**
 * Wallet-side commitment builder (what the patient wallet actually does
 * before asking an issuer to attest it).
 */
export const buildCommitment = (
  sim: HealthClaimGateSimulator,
  patient: Uint8Array,
  markerId: Uint8Array,
  value: bigint,
  salt: Uint8Array,
): Uint8Array =>
  sim.commitmentOf({ patient, markerId, value, salt });

export { convertFieldToBytes };
