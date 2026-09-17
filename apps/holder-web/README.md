# @passport/holder-web

The holder-facing UI: credentials dashboard, consent prompts, sharing log. Implements the **Credential holder** [user story](../../README.md#credential-holder) in the root README.

## Pages

- `/` — credentials dashboard. Real: fetches `GET /credentials` from `@passport/issuance`.
- `/consent/[requestId]` — the claim-request consent prompt. **Mock data** — see the `TODO(passport)` at the top of the page for the `@passport/verifier-api` endpoints it actually needs (a pending-request concept, not yet built).

## Run

```bash
pnpm --filter @passport/holder-web dev
```

Best experienced with `@passport/issuance` also running (`pnpm --filter @passport/issuance dev`) — otherwise the dashboard shows its empty state, which itself explains how to wire it up.

## Status

Scaffolded with Next.js 16 (App Router) + Tailwind v4. No auth yet — `DEMO_HOLDER_ID` in `app/page.tsx` stands in for a real signed-in holder.
