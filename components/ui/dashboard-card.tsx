"use client";

import { ReactNode } from "react";

interface DashboardCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon?: ReactNode
  trend?: ReactNode
  className?: string
  children?: ReactNode
}

export default function DashboardCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  trend,
  className = "",
  children,
}: DashboardCardProps) {
  const changeColors = {
    positive: "text-sage-600",
    negative: "text-rose-600",
    neutral: "text-ink-500",
  }

  return (
    <div
      className={`card group p-6 transition-all duration-300 ease-refined hover:-translate-y-0.5 hover:shadow-lift ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-400">
            {title}
          </p>
          <p className="mt-2 font-display text-3xl text-ink-800">{value}</p>
          {change && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`text-sm font-medium ${changeColors[changeType]}`}>{change}</span>
              {trend && <span className="text-sm text-ink-400">{trend}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-champagne-100 text-gold-600 transition-colors duration-300 group-hover:bg-gold-200/70">
            {icon}
          </div>
        )}
      </div>
      {children && <div className="mt-5 border-t border-ivory-200 pt-4">{children}</div>}
    </div>
  )
}
