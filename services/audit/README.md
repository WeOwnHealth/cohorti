# @passport/audit

Append-only, hash-chained event log. Every audit-worthy event (a triage `AuditTrace`, a verifier-api verification event, a disclosure-guard refusal attempt) gets appended; the chain's latest digest is meant to be periodically anchored on-chain — no chain is chosen yet (see Status below) — so tampering with historical entries becomes detectable — recompute the chain, compare to the anchored digest.

**Maps to:** `Audit store` (D5) and its `Audit-trace digest anchor` (on-chain) in the [Component diagram](../../README.md#1-component--trust-boundary-diagram-uml).

## Design

`src/chain.ts` is the hash-chain primitive (`appendEntry` / `verifyChain`) — pure, unit-tested in `src/chain.test.ts`. Each entry's `chainDigest = sha256(contentDigest + previousEntry.chainDigest)`, so altering any historical entry breaks every digest computed after it.

This is a chain, not a Merkle tree: it proves the *whole log* hasn't been tampered with, but doesn't (yet) let you prove a single entry's inclusion without replaying everything before it. Upgrade to a Merkle tree if per-entry inclusion proofs become a real requirement.

## Run

```bash
pnpm --filter @passport/audit dev
pnpm --filter @passport/audit test
```

- `POST /events` — append an event.
- `GET /events` — full chain.
- `GET /verify` — recompute and confirm no tampering.
- `GET /latest-digest` — the digest a periodic job should anchor on-chain.

## Status / TODOs

- **On-chain anchoring isn't wired up, and no longer has a chain to target.** An earlier EVM implementation (`contracts/evm/AuditAnchor.sol`, Foundry, 8/8 tests) was removed to avoid committing to an EVM chain ahead of a team decision — same reasoning as the agent-identity rollback (see `packages/shared-types/src/agent.ts`). Whoever picks this back up should decide the chain first (Midnight-native anchoring is worth considering, given the rest of the proof layer lives there) rather than assuming EVM again; `git log -- contracts/evm` has the removed implementation as a reference if useful.
- **Storage is in-memory** — replace with an append-only table before this leaves local dev (see `src/store.ts`).
