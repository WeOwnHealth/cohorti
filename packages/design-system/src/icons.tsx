import type { SVGProps } from "react";

/**
 * Small, consistent line-icon set — 24x24 viewBox, 1.75px stroke, round
 * caps/joins. Deliberately hand-built inline SVG rather than an icon
 * library dependency: keeps the bundle small and every icon exactly on the
 * same grid/stroke-weight as its neighbors, which a mixed set from a
 * general-purpose library rarely guarantees.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PersonIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5.5" y="4.5" width="13" height="16" rx="2" />
      <path d="M9 4.5V4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v.5" />
      <path d="M9 11h6M9 14.5h6M9 7.5h2.5" />
    </svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="3" width="10" height="18" rx="1" />
      <path d="M15 9.5 19 11v10H5" />
      <path d="M8 7h1M11 7h1M8 10.5h1M11 10.5h1M8 14h1M11 14h1" />
    </svg>
  );
}

export function CredentialIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <circle cx="8.5" cy="12" r="2" />
      <path d="M13 10.5h5M13 13.5h3.5" />
      <path d="M6 17c.4-1.4 1.3-2 2.5-2s2.1.6 2.5 2" />
    </svg>
  );
}

export function ProofIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 19 6.5v5.2c0 4.3-2.9 7.2-7 8.3-4.1-1.1-7-4-7-8.3V6.5z" />
      <path d="m9.2 12 1.9 1.9 3.8-3.9" />
    </svg>
  );
}

export function LockOpenIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="11" width="14" height="9.5" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 7.5-1.9" />
      <circle cx="12" cy="15.25" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LockHalfIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="11" width="14" height="9.5" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 6.9-2.7" strokeDasharray="2.5 2.5" />
      <circle cx="12" cy="15.25" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LockCheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="11" width="14" height="9.5" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
      <path d="m9.7 15.4 1.6 1.6 3-3.1" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h15.5M14 6.5 19.5 12 14 17.5" />
    </svg>
  );
}
