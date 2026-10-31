import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "gold";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-ivory-200 text-ink-600",
  success: "bg-sage-100 text-sage-700",
  warning: "bg-champagne-200 text-gold-700",
  danger: "bg-rose-100 text-rose-700",
  info: "bg-ivory-100 text-ink-600",
  gold: "bg-gold-200/70 text-gold-700",
};

export default function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return <span className={`pill ${tones[tone]} ${className ?? ""}`}>{children}</span>;
}
