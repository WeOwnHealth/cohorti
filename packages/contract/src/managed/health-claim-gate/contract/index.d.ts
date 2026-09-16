import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type CredentialEntry = { commitment: Uint8Array;
                                issuer: Uint8Array;
                                active: boolean
                              };

export type TrialCriteria = { markerId: Uint8Array;
                              threshold: bigint;
                              active: boolean
                            };

export type CommitmentPreimage = { patient: Uint8Array;
                                   markerId: Uint8Array;
                                   value: bigint;
                                   salt: Uint8Array
                                 };

export type ProofResult = { patient: Uint8Array;
                            verifierId: Uint8Array;
                            scopeMarker: Uint8Array;
                            eligible: boolean;
                            nonce: Uint8Array
                          };

export type Witnesses<PS> = {
  patientSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  biomarkerValue(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  commitmentSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  issuerSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  consentVerifierId(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  consentScope(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  consentIssuedAt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  consentExpiresAt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  requestNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  patient_0: Uint8Array,
                  commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveClaim(context: __compactRuntime.CircuitContext<PS>,
             verifierId_0: Uint8Array,
             requestedMarker_0: Uint8Array,
             now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  patient_0: Uint8Array,
                  commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveClaim(context: __compactRuntime.CircuitContext<PS>,
             verifierId_0: Uint8Array,
             requestedMarker_0: Uint8Array,
             now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  issuerPublicKey(sk_0: Uint8Array): Uint8Array;
  patientPublicKey(sk_0: Uint8Array): Uint8Array;
  markerOf(label_0: Uint8Array): Uint8Array;
  commitmentOf(preimage_0: CommitmentPreimage): Uint8Array;
}

export type Circuits<PS> = {
  issuerPublicKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  patientPublicKey(context: __compactRuntime.CircuitContext<PS>,
                   sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  markerOf(context: __compactRuntime.CircuitContext<PS>, label_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  commitmentOf(context: __compactRuntime.CircuitContext<PS>,
               preimage_0: CommitmentPreimage): __compactRuntime.CircuitResults<PS, Uint8Array>;
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  patient_0: Uint8Array,
                  commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proveClaim(context: __compactRuntime.CircuitContext<PS>,
             verifierId_0: Uint8Array,
             requestedMarker_0: Uint8Array,
             now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  credentials: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): CredentialEntry;
    [Symbol.iterator](): Iterator<[Uint8Array, CredentialEntry]>
  };
  readonly authorizedIssuer: Uint8Array;
  readonly trial: TrialCriteria;
  readonly lastProof: { is_some: boolean, value: ProofResult };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
