# @cohorti/ingestion

Ingest raw source data (wearable API, lab portal, uploaded PDF/scan) inside the local or institutional boundary.

**Maps to:** P1 Ingest & parse in the [Data Flow Diagram](../../README.md#7-data-flow-diagram-dfd--level-1), and the corresponding box in the [Component & Trust-Boundary diagram](../../README.md#1-component--trust-boundary-diagram-uml).

## Run

```bash
pnpm --filter @cohorti/ingestion dev
```

Listens on `PORT_INGESTION_SVC` (default 4001). `GET /health` returns service status.

## Status

Scaffolded — routes below are typed stubs. See inline `TODO` comments for the real implementation work tied to the functional requirements in the root [README.md](../../README.md#requirements).
