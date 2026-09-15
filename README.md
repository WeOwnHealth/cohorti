# trials

ZK clinical-trial matching on Midnight. Patients prove eligibility as one bit (e.g. cholesterol at or below 200) - no lab values disclosed on-ledger. Trial criteria public, biomarkers private witnesses, consent scoped, time-bound, revocable. Compact dual-ledger. 🤝 Let's collab!! Grab a time slot on Yonks calendar => https://cal.com/yonks/health

---

## WeOwn Health Passport — Wave 1 submission

Patients prove they qualify for a trial (e.g. cholesterol ≤ 200 mg/dL) by disclosing a single bit — eligible / not eligible — without ever revealing the underlying lab value, medical history, or consent details on-ledger.

- Trial criteria are public
- Biomarker values, patient identity, and consent records are **private witnesses** (client-side, never on chain)
- Every eligibility check produces a real zero-knowledge proof, verified on-chain
- Consent is scoped (specific verifier + specific marker + specific time window) and bound into every proof

Built for the Midnight Buildathon Wave 1 (Buildathon #1). Compact dual-ledger, W3C Verifiable Credentials shape, wallet-pull delivery.

---

## Live demo

- **Patient + Verifier UI**: [https://weownhealth-trials.pages.dev](https://weownhealth-trials.pages.dev)
- **Backend (OCC coordinator)**: [https://trials.weown.health](https://trials.weown.health)
- **Deployed contract**: `HealthClaimGate` at address `0x42b27f41a83a70685fd8182615e7955facdfde6622f3c921fb45c24a5da472c7` on a Midnight standalone network (spin up the local stack — see below — and interact with the same contract with real ZK proofs)

## Architecture

```
Lab / wearable (mocked) ─(API)─► OCC backend ─(issueCredential tx)─► HealthClaimGate contract
                                       │                                     │
                                       └─(credential metadata)──► Patient wallet
                                                                        │
                                                                        │ (patient inputs consent, generates ZK proof locally)
                                                                        │
                                                                        └─(proveClaim tx)──► HealthClaimGate contract
                                                                                                    │
                                                             Verifier UI ─(reads lastProof)────────┘
```

Three roles running against one contract:

- **Issuer (OCC backend)** signs W3C-style Verifiable Credentials and writes commitments to the ledger via `issueCredential`.
- **Patient wallet** generates a ZK proof locally that (a) an active credential exists, (b) the recorded commitment matches their private witness, (c) their integer biomarker clears the trial threshold, (d) consent covers the verifier + scope + time window — then submits via `proveClaim`. Only a single eligibility bit is disclosed.
- **Verifier UI** reads `lastProof` from the ledger to see the ✓ / ✗ outcome, the verifier scope, the marker, and a freshness nonce.

The contract is a **Compact dual-ledger**: the public ledger holds commitments + issuer registry + trial criteria + the latest proof outcome; the private witnesses (raw biomarker values, salts, consent tuples) live in the wallet and never touch chain.

## Midnight integration

- **Contract language**: Compact 0.23, compiled with `compactc 0.31.1`
- **Runtime pins**: `@midnight-ntwrk/compact-runtime@0.16.0`, `@midnight-ntwrk/midnight-js@4.1.1`, `@midnight-ntwrk/ledger-v8@8.1.0`
- **Circuits**: 2 stateful (`issueCredential`, `proveClaim`) + 4 pure helpers (key derivation, marker derivation, commitment derivation)
- **Ledger surface**: `credentials: Map<Bytes<32>, CredentialEntry>`, `authorizedIssuer: Bytes<32>`, `trial: TrialCriteria`, `lastProof: Maybe<ProofResult>`
- **Wallet integration**: Lace via `@midnight-ntwrk/dapp-connector-api@4.0.1`
- **Proof generation**: local Midnight proof server (Docker image `midnightntwrk/proof-server:8.0.3`)

## Project layout

```
trials/
├── packages/
│   └── contract/
│       ├── src/
│       │   ├── health_claim_gate.compact   ← the contract (187 lines, well commented)
│       │   ├── witnesses.ts                ← private-state shape + witness implementations
│       │   ├── deploy.ts                   ← dApp-connector export barrel
│       │   ├── managed/health-claim-gate/  ← COMMITTED compile output (contract API, zkir, verifier + prover keys)
│       │   └── test/
│       │       ├── harness.ts              ← in-process simulator (real circuits, no chain needed)
│       │       └── health_claim_gate.test.ts  ← 13 tests exercising happy + negative paths
│       ├── scripts/
│       │   ├── hcg-standalone.ts           ← deploy the contract to the local standalone stack
│       │   └── preprod-deploy.ts           ← same flow pointed at public preprod endpoints
│       └── standalone/
│           └── docker-compose.yml          ← local Midnight network (node + indexer + proof server)
├── (frontend + backend live in Mohammed's cohort repo, wired against the contract package above)
└── README.md (this file)
```

## Setup — run everything locally

Prereqs: Node.js 20+, Yarn 4, Docker Desktop.

```bash
# 1. Install
git clone https://github.com/WeOwnHealth/trials
cd trials
yarn install

# 2. Compile the contract + generate ZK proving/verifier keys
cd packages/contract
yarn fetch:compact         # downloads compactc 0.31.1
yarn compact:zk            # full compile — writes managed/health-claim-gate/{contract,zkir,keys,compiler}/

# 3. Run the test suite (real circuits in-process, no chain needed)
yarn test                  # 13/13 should pass

# 4. Bring up the local Midnight stack (node + indexer + proof server)
cd standalone
docker compose up -d
docker compose ps          # all three services healthy

# 5. Deploy to the local standalone network
cd ..
node --experimental-strip-types scripts/hcg-standalone.ts
# → prints:  HEALTH_CLAIM_GATE_DEPLOYED address=0x...
```

The deploy uses the genesis-funded dev wallet on the local network (`WALLET_SEED=0000...0001`), so no faucet dance is needed.

## How to evaluate

**Fastest path (60 seconds):**

```bash
cd packages/contract && yarn install && yarn compact:zk && yarn test
```

- Contract compiles cleanly with `compactc 0.31.1` → `src/managed/health-claim-gate/{contract,zkir,keys}/` regenerated
- 13/13 tests pass, exercising: happy path issuance + proof, below/over threshold, wrong marker, wrong salt, wrong verifier, wrong scope, expired consent, not-yet-active consent, nonce replay, no-credential, inactive credential

**Full end-to-end (10 minutes):**

Follow steps 1–5 above. Then interact with the deployed contract via the demo UI at [weownhealth-trials.pages.dev](https://weownhealth-trials.pages.dev) — the frontend has a role switcher: enter as **Patient**, generate a proof; enter as **Trial Sponsor**, verify the outcome.

**Read the code:**

- `packages/contract/src/health_claim_gate.compact` — 187 lines of well-commented Compact, top-down: types → ledger state → witnesses → constructor → pure helpers → circuits
- `packages/contract/src/test/health_claim_gate.test.ts` — every claim in the contract has a corresponding test
- `packages/contract/src/witnesses.ts` — every witness declaration in `.compact` has exactly one implementation here

## Wave 1 scope + Wave 2/3 roadmap

**Wave 1 (this submission):**
- 2-circuit contract (`issueCredential` + `proveClaim`) with real ZK proofs
- Compact dual-ledger with commitment-based privacy
- Consent binding per proof (verifier + scope + time window + replay guard)
- Local Midnight standalone stack + deployed contract
- Frontend (Next.js, dark Midnight theme, role switcher) + backend (Express + TS on DO droplet with Caddy)
- 13/13 in-process tests exercising happy + adversarial paths

**Wave 2:**
- W3C VC signature verification in-circuit
- `registerIssuer` circuit — multi-issuer registry replacing the demo hardcoded issuer
- Revocation circuit
- TimeProvider-based expiry (replaces caller-supplied `now`)
- Public preprod deployment

**Wave 3:**
- Attestation oracle integration (data sources sign directly, WeOwn becomes pure substrate)
- ERC-7857 style agent-identity for AI Triage Agent
- FHIR pipeline (real lab / wearable integrations)
- Multi-marker trials, cross-trial passport reuse
- Full observability (SigNoz / OTel)

## The pitch — "Plaid for health credentials"

WeOwn Health Passport is the **substrate/protocol layer**, not the issuer. Labs, wearables, and providers register as trusted issuers and sign VCs. Patients hold their own credentials and prove eligibility on demand. Trial sponsors get cryptographic proof of qualification without ever seeing raw data.

Two-sided network. Privacy is the moat.

## License

Apache-2.0. See `LICENSE`.
