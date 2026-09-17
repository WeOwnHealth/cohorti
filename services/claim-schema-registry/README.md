# @passport/claim-schema-registry

Defines claim schemas (threshold / range / category / eligibility match) and each schema's required binding tier and validity period.

**Maps to:** D3 Claim-schema registry in the [Data Flow Diagram](../../README.md#7-data-flow-diagram-dfd--level-1), and the corresponding box in the [Component & Trust-Boundary diagram](../../README.md#1-component--trust-boundary-diagram-uml).

## Run

```bash
pnpm --filter @passport/claim-schema-registry dev
```

Listens on `PORT_CLAIM_SCHEMA_SVC` (default 4006). `GET /health` returns service status.

## Status

Scaffolded — routes below are typed stubs. See inline `TODO` comments for the real implementation work tied to the functional requirements in the root [README.md](../../README.md#requirements).
