import type { ReactNode } from "react";

/** Friendly empty state used when a host has not created anything yet. */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-ivory-400 bg-ivory-50/50 px-6 py-14 text-center ${className ?? ""}`}
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-champagne-100 text-gold-600">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-xl text-ink-800">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
