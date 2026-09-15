# @cohorti/disclosure-guard

Enforces every gate in README.md § ["6. Proof Request & Disclosure Control"](../../README.md#6-proof-request--disclosure-control-uml-activity) before a proof is ever generated: pre-declared claim set, tier floor, recency, anti-laddering, query budget, and holder consent. This is the service where "impossible by construction, not by convention" actually gets enforced.

**Maps to:** P8 in the [Data Flow Diagram](../../README.md#7-data-flow-diagram-dfd--level-1); `Disclosure-budget enforcer` in the [Component diagram](../../README.md#1-component--trust-boundary-diagram-uml).

## Design

`src/policy.ts` is the decision engine — a pure function with **no I/O**, so it's unit-tested directly (`src/policy.test.ts`) without a server or database. `src/store.ts` is a swappable in-memory repository standing in for Postgres (envelopes, budgets, schemas) and Redis (atomic budget counters — needed before this leaves local dev, to close the race between two concurrent requests both reading the same `consumed` count). `src/routes.ts` is the thin HTTP layer wiring the two together.

## Run

```bash
pnpm --filter @cohorti/disclosure-guard dev
pnpm --filter @cohorti/disclosure-guard test
```

`POST /evaluate` — the gate `services/verifier-api` calls before invoking the Midnight prover. `POST /sharing-log` — records an outcome (including negative results, which are disclosures in their own right).

## Known gaps (tracked, not silent)

- **Composition-leakage bound** (README.md's "reviewer scrutiny" risk): v1 enforces "every requested claim is a member of the pre-declared envelope," not a full information-theoretic bound on what a verifier can infer in aggregate across several *different* approved claims. See the `TODO` in `policy.ts`.
- **Budget-counter race**: the in-memory store's `consumeBudget` isn't atomic across concurrent requests. Fine for one process in local dev; needs a Redis `INCR`-based implementation (or equivalent) before concurrent traffic is real.
