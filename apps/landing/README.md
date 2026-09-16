# @cohorti/landing

The public marketing site — problem, solution, binding tiers, roadmap. No app functionality; pure content, built on `@cohorti/design-system`.

Copy is a tightened version of the root README's Problem Statement and Solution sections — same claims, same personas, rewritten for a landing-page audience (scannable, benefit-led) rather than a spec reader. If the underlying product claims change, update the README first and bring this page in line, not the reverse.

## Run

```bash
pnpm --filter @cohorti/landing dev
```

## Design

Every visual decision here traces to `packages/design-system/tokens.css` — see that package's README for where each token came from (attio.com / notion.com, extracted live, not eyeballed).
