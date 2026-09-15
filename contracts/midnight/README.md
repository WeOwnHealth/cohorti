# @cohorti/contracts-midnight

Compact circuits for Cohorti's four claim types — see README.md's [Proof and verification requirements](../../README.md#requirements) and the [`ClaimType` domain type](../../packages/shared-types/src/claim.ts).

| Circuit | Claim type | Proves |
|---|---|---|
| `circuits/threshold.compact` | `THRESHOLD` | a private value is below a public threshold |
| `circuits/range.compact` | `RANGE` | a private value falls within a public `[min, max]` |
| `circuits/category.compact` | `CATEGORY` | a private value matches one of a public, enumerated set — without revealing which member |
| `circuits/eligibility.compact` | `ELIGIBILITY_MATCH` | several private attributes jointly satisfy public criteria (mirrors the AND-semantics in `services/triage-agent/src/screening.ts`) |

Every circuit `disclose()`s only the boolean result of the comparison — never the private witness value it was computed from.

## Validated, not just written — and the one thing that ISN'T yet validated

These four circuits have each been compiled successfully against the **real Compact compiler (v0.31.1, language version 0.23)** — this isn't language syntax guessed from documentation. If you change one, recompile it before trusting it; a scaffold's job is to be a correct starting point, not to stay correct forever on its own.

**What that validation actually proved:** language-level correctness — the circuits parse, type-check, and produce a valid TypeScript API (`managed/<circuit>/contract/index.d.ts`).

**What it did NOT prove:** that a real ZK proof can be generated from them. `compact compile`'s own `--help` says it emits "proving keys created by running `zkir` on the zkir circuits" — but `zkir` is a *separate* binary from the `compact` CLI, not installed by the installer command below, and not present in the environment this was validated in. Confirm this yourself: `compact compile circuits/threshold.compact managed/threshold` (no `--skip-zk`) still exits 0, but `managed/threshold/compiler/contract-info.json` reports `"proof": false` for the circuit — with no zkir/ or keys/ directory generated. Before treating these circuits as production-ready, install `zkir`, recompile without `--skip-zk`, and confirm `"proof": true` with real key artifacts on disk.

## Install the toolchain

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
source ~/.zshrc   # or ~/.bashrc
compact update 0.31.1
```

Requires Docker Desktop (for the local proof server) and, per the [Midnight installation docs](https://docs.midnight.network/getting-started/installation), Linux or macOS natively — Windows via WSL.

## Compile

```bash
pnpm --filter @cohorti/contracts-midnight compile          # all four, with proving keys (slower, first run)
pnpm --filter @cohorti/contracts-midnight compile:threshold # one circuit at a time
```

Output lands in `managed/<circuit>/` (git-ignored — regenerate, don't commit): a TypeScript API (`contract/index.ts`) typed against `@midnight-ntwrk/compact-runtime`, plus the ZK circuit representation and proving keys.

## Run a local proof server

```bash
docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v
```

Point `MIDNIGHT_PROOF_SERVER_URL` (see root `.env.example`) at `http://localhost:6300`, and configure the Lace wallet to use it as `Local (http://localhost:6300)`.

## Wiring into the backend

`services/verifier-api/src/midnight-prover.ts` is where the compiled `managed/<circuit>/contract/` TypeScript API belongs — supply the witness functions (e.g. `ageYears()`, `diagnosisCode()` for the eligibility circuit) from the holder's actual credential data, resolved by `@cohorti/issuance`. That wiring is the next real piece of work here; see the `TODO(cohorti)` in that file.

## Status / what's still a placeholder

- **Category and eligibility circuits use fixed-size vectors** (`Vector<8, Bytes<32>>`, `Vector<4, Bytes<32>>>`) for the allowed-set / criteria size. A real claim schema with a variable number of options needs either padding to that fixed size or a different circuit per set size — Compact requires sizes fixed at compile time (recursion and unbounded loops are disallowed).
- **No issuer-signature verification inside the circuit yet** — these prove a fact about a witness value, not that the witness came from a signed credential. Binding a Compact proof to an issuer's signature (so a proof is worthless without a real T2 credential behind it) is unimplemented; the tier floor is currently enforced only at the application layer (`services/disclosure-guard`), not cryptographically. Track this — it's the gap between "the app enforces T2" and "the math enforces T2."
