# @passport/deid

De-identify records locally to a named standard (HIPAA Safe Harbor or documented expert determination) before anything leaves the ingestion boundary.

**Maps to:** P2 De-identify in the [Data Flow Diagram](../../README.md#7-data-flow-diagram-dfd--level-1), and the corresponding box in the [Component & Trust-Boundary diagram](../../README.md#1-component--trust-boundary-diagram-uml).

## Run

```bash
pnpm --filter @passport/deid dev
```

Listens on `PORT_DEID_SVC` (default 4002). `GET /health` returns service status.

## Status

Scaffolded — routes below are typed stubs. See inline `TODO` comments for the real implementation work tied to the functional requirements in the root [README.md](../../README.md#requirements).
