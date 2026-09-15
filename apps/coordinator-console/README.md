# @cohorti/coordinator-console

The Phase A human-review UI — the GDPR Art. 22 gate made concrete. Implements the **Trial coordinator** [user story](../../README.md#trial-coordinator) in the root README, step 2.

## Pages

- `/` — trials awaiting review. Real: fetches `GET /audit-traces` from `@cohorti/triage-agent`.
- `/review/[traceId]` — every inclusion and exclusion, with reasoning, and the review action. Real: `PATCH /audit-traces/:id/review` on `@cohorti/triage-agent`.

This is the one page in the whole app where "real, end-to-end" matters most: nothing about it may auto-approve. `humanReviewed` only ever flips via an explicit click here.

## Run

```bash
pnpm --filter @cohorti/coordinator-console dev
```

Best experienced with `@cohorti/triage-agent` also running:

```bash
pnpm --filter @cohorti/triage-agent dev
curl -X POST http://localhost:4009/screen -H 'content-type: application/json' -d '{
  "trialId": "trial-001",
  "agentIdentity": "demo-agent-1",
  "criteria": [{ "attribute": "age_years", "operator": "gte", "value": 18, "description": "Age at least 18" }],
  "candidates": [
    { "ref": "cand-1", "fields": { "age_years": 42 } },
    { "ref": "cand-2", "fields": { "age_years": 15 } }
  ]
}'
```

## Status

Scaffolded with Next.js 16 (App Router) + Tailwind v4. No auth yet — anyone who can reach this app can review, which is fine for local dev and not fine for anything else.
