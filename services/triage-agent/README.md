# @passport/triage-agent

Screens a de-identified, institution-local population against trial criteria and produces a candidate list with **per-candidate reasoning for both inclusions and exclusions** — never a filtered remainder that discards why someone didn't make the list.

**Maps to:** `Triage / screening agent` (Phase A, no ZK) in the [Component diagram](../../README.md#1-component--trust-boundary-diagram-uml); P5 in the [Data Flow Diagram](../../README.md#7-data-flow-diagram-dfd--level-1).

## Design

`src/screening.ts` is pure evaluation logic (`evaluateCandidate` / `evaluateCohort`) — unit-tested in `src/screening.test.ts` without a server. `src/routes.ts` wraps the result in an `AuditTrace` (`humanReviewed: false` always, on creation) and returns it.

## The hard requirement this service must never violate

Per README.md's non-functional requirements: **"No solely automated decision may determine a person's access to a trial."** This service's output is a *candidate list*, not an approval. A qualified human must review it in `apps/coordinator-console` before anyone is approached — that review is what flips `humanReviewed` and is what makes a candidate list actionable. Nothing in this service enforces that gate itself; the gate lives in the coordinator console's workflow, and this README says so explicitly so the boundary isn't lost as the system grows.

## Run

```bash
pnpm --filter @passport/triage-agent dev
pnpm --filter @passport/triage-agent test
```

## Status / TODOs

- Screening logic (`evaluateCriterion`) supports `eq`/`neq`/`gt`/`gte`/`lt`/`lte`/`in`/`not_in` against flat de-identified fields. It does not yet parse unstructured clinical notes — README.md names that as the actual gap in existing EHR-native cohort tools ("the gap is unstructured-data screening that stays inside"). That's the interesting, unimplemented part of this service.
- `agentIdentity` is required on every request but nothing verifies it against a registry — it's accepted and recorded, not authenticated. The identity/verification mechanism (ERC-7857 on EVM, a Midnight-native scheme, or otherwise) is intentionally not scaffolded yet, pending team agreement — see `packages/shared-types/src/agent.ts`.
- Traces aren't yet forwarded to `@passport/audit` (see `TODO(passport)` in `src/routes.ts`).
