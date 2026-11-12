import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-background px-4">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">404</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-600">
          The page you are looking for does not exist or you do not have access to it.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-[#17130b] hover:bg-brand-primary-hover"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="rounded-md border border-gray-300 bg-brand-surface px-4 py-2 text-sm font-medium text-gray-700 hover:bg-brand-background"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
