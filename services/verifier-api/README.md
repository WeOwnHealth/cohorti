# @cohorti/verifier-api

The one endpoint a verifier ever calls: `POST /proof-requests`. Orchestrates the policy gate (`@cohorti/disclosure-guard`) and the Midnight prover, and returns **pass/fail + recency only** — no raw data, no fallback on refusal.

**Maps to:** `Verifier API` in the [Component diagram](../../README.md#1-component--trust-boundary-diagram-uml); steps 7–9 of the [Consumer Flow sequence](../../README.md#4-consumer-flow-uml-sequence--holder-initiated).

## Flow

1. `POST /proof-requests` → `disclosure-guard` `/evaluate`.
2. `REFUSED` → return the refusal reason immediately. **Never** falls through to raw data.
3. `APPROVED` → `midnight-prover.generateProof()` → record the outcome via `disclosure-guard` `/sharing-log` → return `{ result, recency }`.

## Status

The orchestration logic is real; two pieces are intentionally stubbed and marked with `TODO(cohorti)`:

- **`src/midnight-prover.ts`** — needs the compiled-circuit TS API once `contracts/midnight/circuits/*.compact` are built (see that package's README) and a running proof server.
- **`src/routes.ts`** — the credential's real binding tier needs to come from `@cohorti/issuance`, not be hardcoded.

## Run

```bash
pnpm --filter @cohorti/verifier-api dev
```

Requires `@cohorti/disclosure-guard` running (`DISCLOSURE_GUARD_URL`, default `http://localhost:4007`).
