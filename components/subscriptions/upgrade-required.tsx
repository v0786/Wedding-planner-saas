import Link from "next/link"

/**
 * Shown in place of a premium page when the workspace's plan does not include
 * the feature. The API enforces the same rule, so hiding the UI is never the
 * only protection.
 */
export default function UpgradeRequired({
  title,
  description,
  featureLabel,
  planName,
  upgradeUrl = "/pricing",
  actionHref = "/dashboard/billing",
  actionLabel = "Manage plan",
}: {
  title: string
  description: string
  featureLabel: string
  planName: string
  upgradeUrl?: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl" aria-hidden="true">
          🔒
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
        <p className="mt-4 text-sm text-gray-700">
          <span className="font-medium">{featureLabel}</span> is not included in your current{" "}
          <span className="font-medium">{planName}</span> plan.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={upgradeUrl}
            className="rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-pink-700 hover:to-indigo-700"
          >
            See upgrade options
          </Link>
          <Link
            href={actionHref}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </main>
  )
}
