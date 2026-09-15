# @weownhealth/trials-contract — HealthClaimGate (Wave 1)

ZK clinical-trial eligibility gate on the Midnight Network. Patients prove one
bit — "eligible for this trial" — without ever revealing raw lab values, PII,
or which values a threshold check depended on. Self-contained first pass of the
two circuits from the [architecture doc](../../README.md) (issue_credential +
prove_claim).

## Toolchain pins (reproducibility)

| Component | Version | How obtained |
|:--|:--|:--|
| compactc (compiler) | **0.31.1** | `yarn fetch:compact` (GitHub release asset via `@midnight-ntwrk/midnight-js-compact`) |
| Compact language | **0.23.0** | `pragma language_version 0.23;` — verify: `compactc --language-version` |
| @midnight-ntwrk/compact-runtime | **0.16.0** | npm |
| @midnight-ntwrk/compact-js | **2.5.3** | npm |
| @midnight-ntwrk/midnight-js-protocol | **4.1.1** | npm |
| ledger format | ledger-8.0.2 | `compactc --ledger-version` |

The compiled contract artifacts in `src/managed/health-claim-gate/` are
**committed** so the AKINDO "≥1 compiling Compact contract" gate is verifiable
offline. `contract-info.json` records the exact compiler/runtime pins.

## Commands

```bash
yarn            # install deps (creates/refreshes yarn.lock; packageManager yarn@4.9.2)
yarn fetch:compact   # one-time: download compactc 0.31.1 binary
yarn compact        # compile contract (fast, --skip-zk) -> src/managed/
yarn compact:zk     # full compile incl. proving keys (needed before deploy)
yarn test           # vitest — runs the REAL compiled circuits in-process (13 tests)
yarn typecheck      # tsc --noEmit (src/)
yarn typecheck:deploy   # tsc --noEmit (src/ + scripts/, deploy tooling)
yarn deploy:preprod     # deploy HealthClaimGate to Midnight preprod (see below)
```

## Layout

```
packages/contract/
├── src/
│   ├── health_claim_gate.compact   # the contract (issueCredential + proveClaim + 4 pure circuits)
│   ├── index.ts                    # Midnight.js/dApp-connector wiring
│   ├── witnesses.ts                # private-state shape + witness implementations
│   ├── managed/health-claim-gate/  # COMMITTED compile output (contract/ + zkir/ + compiler/)
│   └── test/
│       ├── harness.ts              # in-process simulator (no testnet needed)
│       ├── utils.ts
│       └── health_claim_gate.test.ts
└── CONTRACT_GOTCHAS.md             # compactc / SDK / Lace pitfalls (read before touching)
```

## Circuit map (arch doc → contract)

| Arch name | Circuit | What it does |
|:--|:--|:--|
| issue_credential | `issueCredential(patient, commitment)` | Trusted issuer (knowledge of `issuerSecretKey` witness = auth) writes `{commitment, issuer, active}` to the ledger. Issuer never sees value/salt — the patient's wallet computes the salted commitment. |
| prove_claim | `proveClaim(verifierId, requestedMarker, now)` | Patient proves in ZK: active credential exists · commitment re-derives from witnesses · integer biomarker `< threshold` · consent covers {verifier, scope} and is time-live. Success IS the ✅; ❌ is an in-circuit assertion failure. |

Deferred to Wave 2 (honesty, not scope): issuer W3C-VC signature verification
in-circuit, TimeProvider-based expiry, revocation circuit, multi-issuer
registry / multi-trial circuits (see the roadmap in the repo README).


## Deploy to Midnight preprod (Wave-1 buildathon demo)

Runs the canonical Midnight.js provider stack (`midnightntwrk/example-bboard`
pattern) against the hosted preprod endpoints. **No Docker, no local proof
server** — it uses the public preprod proof server. Deps are all in this
package (midnight-js 4.1.1 line + wallet-sdk 1.2.0); nothing else to install.

```bash
# From packages/contract:
yarn                                         # install (yarn.lock is the lockfile of record)
WALLET_SEED=<64-hex-seed> yarn deploy:preprod
```

| Env var | Purpose | Default |
|:--|:--|:--|
| `WALLET_SEED` | 64-hex (32-byte) wallet seed. **Required for a real deploy.** If omitted a random wallet is made and its seed + unshielded address are printed so you can fund it and re-run. | random |
| `PROOF_SERVER_URL` | preprod proof server | `https://proof-server.preprod.midnight.network` |
| `GENERATE_DUST` | mint tDUST (tx-fee token) from unshielded tNIGHT | `1` |
| `WAIT_FUNDS` | `1` = wait/poll for faucet funds before deploying | `0` (fail fast with balance printed) |
| `PRIVATE_STATE_PASSWORD` | LevelDB private-state encryption password | dev-only demo value |
| `LOG_LEVEL` | pino level | `info` |

### Shield vs unshielded vs dust (the short version)

- **Deploy pays from your UNSHIELDED tNIGHT** (public coins). Your 5,000 tNight
  from the preprod faucet arrive unshielded — that is what funds the deploy tx.
- **Do NOT shield first.** Shielding only matters for private-value
  transactions; a contract deploy is public data and does not need it.
- **Preprod fees are paid in tDUST**, minted from unshielded tNIGHT. The script
  mints it automatically (Lace equivalent: *Tokens → Generate tDUST*).
- One faucet drip (≈1,000–5,000 tNIGHT) ≈ a deploy + several demo calls.

### Expected output

```
Wallet ready — seed: <hex> · shielded coin pubkey: <hex>
Unshielded address: <addr>
Unshielded tNIGHT balance: 5000...
HEALTH_CLAIM_GATE_DEPLOYED address=<43-byte hex contract address>
Ledger state: authorizedIssuer=<hex> · trial.active=true · circuit.credentials=0
```

Then read it back with any Midnight explorer using the contract address.

> ⚠️ Sync gate (2026-09-15, wire-verified): a fresh CLI wallet used to grind for
> hours before deploying — the wallet SDK replays preprod's entire ledger
> (~1.5M shielded + ~1.5M dust events) before a full sync completes, and dust
> replay is backpressure-throttled to ~150-260 ev/s. **Not a server problem** (the
> relay + indexer serve every subscription cleanly; all the "RuntimeVersion
> disconnected" lines are normal polkadot-js unsubscribe-after-init noise).
> Fix: `deploy:preprod` now uses a relaxed gate (`syncWalletDeploy`) — unshielded
> caught up + dust subscription live at tip. A deploy is public data: it pays
> from unshielded tNIGHT and freshly minted tDUST, so historical dust replay is
> never needed. `SYNC_STRICT=1` restores the old full-sync behavior if ever wanted.

> 🔒 Funding: the preprod faucet is Turnstile human-only, so the one manual step
> is sending a few tNIGHT from a funded Lace wallet to the printed unshielded
> address (Lace → Send → paste address). Keep your Lace recovery seed private —
> the script accepts a dedicated deploy-wallet seed instead.
