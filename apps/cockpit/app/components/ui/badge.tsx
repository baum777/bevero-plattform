import type { ReactNode } from "react";

type BadgeVariant = "ok" | "warning" | "critical" | "info" | "neutral";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
};

export function Badge({ children, variant = "neutral" }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
