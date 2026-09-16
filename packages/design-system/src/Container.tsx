import type { HTMLAttributes } from "react";
import { cx } from "./variants";

/** Consistent max-width + horizontal padding wrapper used on every page. */
export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("mx-auto w-full max-w-6xl px-6", className)} {...props} />;
}
