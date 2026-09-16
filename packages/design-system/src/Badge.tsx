import type { HTMLAttributes } from "react";
import { badgeVariants, type BadgeTone } from "./variants";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone, className, ...props }: BadgeProps) {
  return <span className={badgeVariants({ tone, className })} {...props} />;
}
