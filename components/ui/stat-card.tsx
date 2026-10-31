"use client";

import { ReactNode } from "react";

interface StatCardProps {
  label: string
  value: number | string
  subLabel?: string
  trend?: number
  trendLabel?: string
  icon?: ReactNode
  color?: "gold" | "sage" | "champagne" | "rose" | "ink"
  href?: string
}

const colorStyles = {
  gold: "bg-gold-200/60 text-gold-700",
  sage: "bg-sage-100 text-sage-700",
  champagne: "bg-champagne-200 text-gold-700",
  rose: "bg-rose-100 text-rose-700",
  ink: "bg-ivory-200 text-ink-600",
}

export default function StatCard({
  label,
  value,
  subLabel,
  trend,
  trendLabel,
  icon,
  color = "gold",
  href,
}: StatCardProps) {
  const body = (
    <div className="card group relative overflow-hidden p-6 transition-all duration-300 ease-refined hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-400">
          {label}
        </p>
        {icon ? (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorStyles[color]}`}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <p className="mt-3 font-display text-3xl text-ink-800">{value}</p>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        {subLabel ? <p className="text-sm text-ink-400">{subLabel}</p> : null}
        {trend !== undefined && trendLabel ? (
          <span
            className={`inline-flex items-center gap-1 text-sm font-medium ${
              trend >= 0 ? "text-sage-600" : "text-rose-600"
            }`}
          >
            {trend >= 0 ? "↑" : "↓"} <span>{Math.abs(trend)}%</span>
            <span className="font-normal text-ink-400">{trendLabel}</span>
          </span>
        ) : null}
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} className="block">
        {body}
      </a>
    )
  }

  return body
}
