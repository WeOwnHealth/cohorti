/**
 * Tiny className-variant helper — deliberately not pulling in
 * class-variance-authority for three primitives. Each function returns a
 * space-joined className string; consumers can still pass `className` to
 * append utility overrides.
 *
 * Uses plain Tailwind utility classes (bg-gray-900, rounded-md, etc.) —
 * Tailwind v4 generates these directly from the @theme tokens in
 * tokens.css, which override the framework defaults of the same name. No
 * arbitrary-value brackets needed; the token names ARE the utility names.
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-fast ease-out disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2";

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: "bg-gray-900 text-white hover:bg-gray-800",
  secondary: "bg-blue-500 text-white hover:bg-blue-600",
  outline: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm rounded-sm",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-12 px-6 text-base rounded-md",
};

export function buttonVariants(opts: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  const { variant = "primary", size = "md", className } = opts;
  return cx(buttonBase, buttonVariantClasses[variant], buttonSizeClasses[size], className);
}

export type BadgeTone = "neutral" | "blue" | "green" | "amber" | "red";

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: "bg-gray-100 text-gray-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
};

export function badgeVariants(opts: { tone?: BadgeTone; className?: string } = {}): string {
  const { tone = "neutral", className } = opts;
  return cx(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
    badgeToneClasses[tone],
    className,
  );
}
