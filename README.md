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

- **Full stack** (frontend + backend + Midnight standalone chain): [https://trials.weown.health](https://trials.weown.health)
  - Patient wallet + issue + prove: [/patient](https://trials.weown.health/patient)
  - Trial sponsor verifier console: [/sponsor](https://trials.weown.health/sponsor)
- **Live contract address**: exposed at [/api/health](https://trials.weown.health/api/health) — the chain is a Midnight standalone network, so the contract redeploys on a fresh chain and the address rotates with it. Always check `/api/health` for the canonical value.

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

> **Note on Wave 1 wallet placement.** The architecture above shows a patient-held wallet — that's the target shape. For the Wave 1 demo the wallet is instead **backend-hosted** and driven by the frontend through the OCC's `/api` endpoints. This is a deliberate workaround: `@midnight-ntwrk/midnight-js`'s `FluentWalletBuilder` hits a `DustParameters` bug on standalone networks, so the backend uses the `WalletFacade`-direct pattern to open a real Midnight wallet against the local chain. Lace-connector wallet integration is Wave 2 scope. The circuits, proofs, ledger, and privacy properties are identical either way — only the key-holding location differs.

## Midnight integration

- **Contract language**: Compact 0.23, compiled with `compactc 0.31.1`
- **Runtime pins**: `@midnight-ntwrk/compact-runtime@0.16.0`, `@midnight-ntwrk/midnight-js@4.1.1`, `@midnight-ntwrk/ledger-v8@8.1.0`
- **Circuits**: 2 stateful (`issueCredential`, `proveClaim`) + 4 pure helpers (key derivation, marker derivation, commitment derivation)
- **Ledger surface**: `credentials: Map<Bytes<32>, CredentialEntry>`, `authorizedIssuer: Bytes<32>`, `trial: TrialCriteria`, `lastProof: Maybe<ProofResult>`
- **Wallet integration**: Lace via `@midnight-ntwrk/dapp-connector-api@4.0.1`
- **Proof generation**: local Midnight proof server (Docker image `midnightntwrk/proof-server:8.0.3`)

## Project layout

```
cohorti/
├── packages/
│   ├── contract/
│   │   ├── src/
│   │   │   ├── health_claim_gate.compact   ← the contract (187 lines, well commented)
│   │   │   ├── witnesses.ts                ← private-state shape + witness implementations
│   │   │   ├── deploy.ts                   ← dApp-connector export barrel
│   │   │   ├── managed/health-claim-gate/  ← COMMITTED compile output (contract API, zkir, verifier + prover keys)
│   │   │   └── test/
│   │   │       ├── harness.ts              ← in-process simulator (real circuits, no chain needed)
│   │   │       └── health_claim_gate.test.ts  ← 13 tests exercising happy + negative paths
│   │   ├── scripts/
│   │   │   ├── hcg-standalone.ts           ← deploy the contract to the local standalone stack
│   │   │   └── preprod-deploy.ts           ← same flow pointed at public preprod endpoints
│   │   └── standalone/
│   │       └── docker-compose.yml          ← local Midnight network (node + indexer + proof server)
│   ├── backend/
│   │   └── src/
│   │       ├── midnight.ts                 ← WalletFacade-direct wallet + contract deploy/handle
│   │       ├── index.ts                    ← Express routes: /api/{health,wallet,trial,issue-credential,verify-proof,verifications}
│   │       └── db.ts                       ← SQLite verification history (survives restarts)
│   └── frontend/
│       ├── app/
│       │   ├── patient/page.tsx            ← wallet + issue + prove + consent flow
│       │   └── sponsor/page.tsx            ← verifier console, polls the backend every 4s
│       └── lib/api.ts                      ← typed client for the backend /api endpoints
├── deploy/
│   ├── compose.yaml                        ← one-command stack: Midnight + backend + frontend + Caddy
│   ├── backend.Dockerfile                  ← multi-workspace build with ledger-v8 dedup fix
│   └── Caddyfile                           ← local reverse proxy (/api → backend, / → static frontend)
└── README.md (this file)
```

## Setup — run everything locally

Prereqs: Node.js 22+, Yarn 4 (via `corepack enable`), Docker Desktop.

### Path A — one-command full stack (what the live site runs)

Mirrors the exact stack behind [trials.weown.health](https://trials.weown.health): three Midnight containers + backend + Caddy serving the prebuilt frontend, all on one bridge network.

```bash
git clone https://github.com/WeOwnHealth/cohorti
cd cohorti
corepack enable
yarn install

# Compile contract + generate ZK keys (first run only)
yarn workspace @weownhealth/trials-contract compact:zk

# Build the frontend static export (Caddy serves the out/ directory)
yarn workspace @weownhealth/trials-frontend build

# Bring up the whole stack
cd deploy
docker compose up -d
docker compose ps          # all five services healthy
# → open http://localhost
```

The backend deploys the contract on first boot against the local standalone chain (genesis-funded dev wallet, no faucet needed) and prints the address in `docker compose logs app`. It's also served at [http://localhost/api/health](http://localhost/api/health).

### Path B — dev mode (rebuild-on-save)

Same three tiers but run each workspace in its own terminal so you can iterate on backend or frontend without rebuilding a container.

```bash
# terminal 1: local Midnight stack
cd packages/contract
docker compose -f standalone/docker-compose.yml up -d

# terminal 2: backend (deploys the contract on first boot, listens on :3000)
yarn workspace @weownhealth/trials-backend exec tsx src/index.ts

# terminal 3: frontend (Next dev server on :3001)
yarn workspace @weownhealth/trials-frontend dev
```

Then open [http://localhost:3001/patient](http://localhost:3001/patient).

### Contract-only path (fastest, no Docker needed)

If you only want to see the ZK circuits pass their tests, no chain required:

```bash
cd packages/contract
yarn compact:zk
yarn test          # 13/13
```

## How to evaluate

**Fastest path (60 seconds — no Docker):**

```bash
cd packages/contract && yarn install && yarn compact:zk && yarn test
```

- Contract compiles cleanly with `compactc 0.31.1` → `src/managed/health-claim-gate/{contract,zkir,keys}/` regenerated
- 13/13 tests pass, exercising: happy path issuance + proof, below/over threshold, wrong marker, wrong salt, wrong verifier, wrong scope, expired consent, not-yet-active consent, nonce replay, no-credential, inactive credential

**Full end-to-end (5 minutes, live site):**

Open [https://trials.weown.health/patient](https://trials.weown.health/patient) → click **Connect Wallet** (backend wallet address appears) → **Issue New Credential** → tick the consent box → **Generate Proof and Submit**. Flip to [/sponsor](https://trials.weown.health/sponsor) — the verification lands in the table within ~4 seconds (SQLite-backed, sponsor console polls the backend live). Check [/api/health](https://trials.weown.health/api/health) to see the live contract address and backend wallet.

**Full end-to-end (10 minutes, local):** Follow **Path A** above, then run the same `/patient` → `/sponsor` flow against `http://localhost`.

**Read the code:**

- `packages/contract/src/health_claim_gate.compact` — 187 lines of well-commented Compact, top-down: types → ledger state → witnesses → constructor → pure helpers → circuits
- `packages/contract/src/test/health_claim_gate.test.ts` — every claim in the contract has a corresponding test
- `packages/contract/src/witnesses.ts` — every witness declaration in `.compact` has exactly one implementation here
- `packages/backend/src/midnight.ts` — WalletFacade-direct pattern for opening a real Midnight wallet + contract handle
- `packages/backend/src/index.ts` — Express endpoints wiring the frontend to the on-chain circuits

## Wave 1 scope + Wave 2/3 roadmap

**Wave 1 (this submission):**
- 2-circuit contract (`issueCredential` + `proveClaim`) with real ZK proofs and real Poseidon commitments
- Compact dual-ledger with commitment-based privacy
- Consent binding per proof (verifier + scope + time window + replay guard)
- Local Midnight standalone stack + deployed contract, one-command via `deploy/compose.yaml`
- Node/Express backend running a real Midnight wallet (WalletFacade-direct pattern to work around the DustParameters bug in `FluentWalletBuilder`)
- Next.js frontend with patient wallet flow and sponsor console, plus SQLite-backed verification history so the sponsor view survives backend restarts
- Live end-to-end deployment at [trials.weown.health](https://trials.weown.health) — three Midnight containers + backend + Caddy on a single droplet
- 13/13 in-process tests exercising happy + adversarial paths

**Wave 2:**
- Lace-connector wallet integration (replace the backend-hosted wallet with a patient-held one)
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
