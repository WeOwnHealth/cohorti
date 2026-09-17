# @passport/issuer-registry

Trusted-issuer registry: admission process, accreditation levels, published governance model, revocation.

**Maps to:** D2 Trusted-issuer registry in the [Data Flow Diagram](../../README.md#7-data-flow-diagram-dfd--level-1), and the corresponding box in the [Component & Trust-Boundary diagram](../../README.md#1-component--trust-boundary-diagram-uml).

## Run

```bash
pnpm --filter @passport/issuer-registry dev
```

Listens on `PORT_ISSUER_REGISTRY_SVC` (default 4005). `GET /health` returns service status.

## Status

Scaffolded — routes below are typed stubs. See inline `TODO` comments for the real implementation work tied to the functional requirements in the root [README.md](../../README.md#requirements).
