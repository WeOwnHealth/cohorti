# @passport/issuance

Sign and issue credentials carrying issuer identity, accreditation level, observation date, and binding tier.

**Maps to:** P4 Issue & sign in the [Data Flow Diagram](../../README.md#7-data-flow-diagram-dfd--level-1), and the corresponding box in the [Component & Trust-Boundary diagram](../../README.md#1-component--trust-boundary-diagram-uml).

## Run

```bash
pnpm --filter @passport/issuance dev
```

Listens on `PORT_ISSUANCE_SVC` (default 4004). `GET /health` returns service status.

## Status

Scaffolded — routes below are typed stubs. See inline `TODO` comments for the real implementation work tied to the functional requirements in the root [README.md](../../README.md#requirements).
