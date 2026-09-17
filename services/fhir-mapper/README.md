# @passport/fhir-mapper

Map de-identified records to FHIR R4 resources.

**Maps to:** P3 Map to FHIR R4 in the [Data Flow Diagram](../../README.md#7-data-flow-diagram-dfd--level-1), and the corresponding box in the [Component & Trust-Boundary diagram](../../README.md#1-component--trust-boundary-diagram-uml).

## Run

```bash
pnpm --filter @passport/fhir-mapper dev
```

Listens on `PORT_FHIR_MAPPER_SVC` (default 4003). `GET /health` returns service status.

## Status

Scaffolded — routes below are typed stubs. See inline `TODO` comments for the real implementation work tied to the functional requirements in the root [README.md](../../README.md#requirements).
