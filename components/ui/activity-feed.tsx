"use client";

import { formatDistanceToNow, format } from "date-fns"

interface ActivityItem {
  id: string
  type: "rsvp" | "guest" | "event" | "wedding" | "question"
  title: string
  description: string
  timestamp: Date | string
  status?: "success" | "pending" | "warning" | "info"
  link?: string
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  maxItems?: number
  showTimestamp?: boolean
  className?: string
}

const statusColors = {
  success: "bg-sage-100 text-sage-700",
  pending: "bg-champagne-200 text-gold-700",
  warning: "bg-rose-100 text-rose-700",
  info: "bg-ivory-200 text-ink-600",
}

const statusIcons = {
  success: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  pending: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.492 0l6.08 10.803c.765 1.36-.113 2.994-1.755 2.994H2.705c-1.642 0-2.519-1.634-1.755-2.994l6.08-10.803zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a.75.75 0 100-1.5.75.75 0 000 1.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  info: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
}

const typeColors = {
  rsvp: "bg-champagne-200 text-gold-700",
  guest: "bg-ivory-200 text-ink-600",
  event: "bg-sage-100 text-sage-700",
  wedding: "bg-gold-200/70 text-gold-700",
  question: "bg-rose-100 text-rose-700",
}

const typeIcons = {
  rsvp: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9v2a1 1 0 100 2h2a1 1 0 100-2H9V7a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
    </svg>
  ),
  guest: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  ),
  event: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h12a1 1 0 100-2H6z"
        clipRule="evenodd"
      />
    </svg>
  ),
  wedding: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9v2a1 1 0 100 2h2a1 1 0 100-2H9V7a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
    </svg>
  ),
  question: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
}

export default function ActivityFeed({
  activities,
  maxItems = 10,
  showTimestamp = true,
  className = "",
}: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems)

  if (activities.length === 0) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ivory-200 text-ink-300">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-ink-400">No recent activity</p>
      </div>
    )
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {displayActivities.map((activity) => (
        <div
          key={activity.id}
          className="group flex gap-4 rounded-xl border border-ivory-200 bg-white/70 p-4 transition-all duration-200 ease-refined hover:border-gold-200 hover:bg-white"
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${typeColors[activity.type]}`}
          >
            {typeIcons[activity.type]}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium text-ink-800">{activity.title}</h4>
                <p className="mt-0.5 text-sm text-ink-500">{activity.description}</p>
              </div>

              {activity.status ? (
                <span
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusColors[activity.status]}`}
                >
                  {statusIcons[activity.status]}
                  <span>{activity.status}</span>
                </span>
              ) : null}
            </div>

            {showTimestamp ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                <time dateTime={new Date(activity.timestamp).toISOString()}>
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </time>
                <span aria-hidden="true">·</span>
                <span>{format(new Date(activity.timestamp), "MMM d, yyyy h:mm a")}</span>
              </div>
            ) : null}

            {activity.link ? (
              <a
                href={activity.link}
                className="mt-2 inline-flex items-center text-sm font-medium text-gold-600 transition-colors hover:text-gold-700"
              >
                View details
                <svg
                  className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
