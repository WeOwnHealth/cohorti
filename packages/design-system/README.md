# @cohorti/design-system

Shared design tokens and a small set of UI primitives (`Button`, `Card`, `Badge`, `Container`) used by every frontend surface: `apps/landing`, `apps/holder-web`, `apps/coordinator-console`. Ships as plain TS/TSX source — no build step; each Next.js app transpiles it directly via `transpilePackages`.

## Where the tokens came from

`tokens.css` isn't a guess. It was synthesized from **live CSS pulled directly off attio.com and notion.com** — computed styles and CSS custom properties extracted via browser introspection, not eyeballed from screenshots. See the header comment in `tokens.css` for exactly which choices came from which site, and where the two disagreed and how that was resolved (documented, not silent).

No dark theme, per explicit direction: `:root` only, nothing else.

## Use in an app

```css
/* app/globals.css */
@import "tailwindcss";
@import "../../../packages/design-system/tokens.css";
```

```tsx
import { Button, Card, Badge } from "@cohorti/design-system/components";
```

```ts
// next.config.ts
const nextConfig: NextConfig = {
  transpilePackages: ["@cohorti/design-system"],
};
```

## Extending

Add new tokens to `tokens.css`'s `@theme` block — Tailwind v4 generates matching utility classes automatically (a `--radius-xl` token means `rounded-xl` just works). Don't reach for arbitrary-value brackets (`rounded-[12px]`) in app code if a token should exist instead; add the token here so every surface gets it.
