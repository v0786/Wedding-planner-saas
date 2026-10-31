import LoginForm from "@/components/auth/login-form"
import Link from "next/link"

export const metadata = { title: "Sign in | Wedding Guest Manager" }

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>
}) {
  return <LoginPageContent searchParams={searchParams} />
}

async function LoginPageContent({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>
}) {
  const { registered } = await searchParams

  return (
    <div className="paper-texture relative flex min-h-screen items-center justify-center overflow-hidden bg-ivory-50 px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-ink-800 transition-colors hover:text-gold-700"
          >
            <RingsMark className="h-7 w-7 text-gold-500" />
            <span className="font-display text-xl tracking-[0.01em]">Wedding Guest Manager</span>
          </Link>

          <h1 className="mt-8 font-display text-display-xs text-ink-800 sm:text-display-sm">
            Sign in to your account
          </h1>
          <p className="mt-3 text-sm text-ink-500">
            New here?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-gold-700 underline-offset-4 transition-colors hover:text-gold-600 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>

        {registered && (
          <div
            role="status"
            className="mt-7 rounded-2xl border border-sage-300 bg-sage-50 px-5 py-4 text-sm text-sage-700"
          >
            Account created. Sign in to continue.
          </div>
        )}

        <div className="mt-8">
          <LoginForm />
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-ink-400 transition-colors hover:text-gold-700"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Interlocking wedding bands used as the product mark. */
function RingsMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12.5" cy="16" r="7.25" />
      <circle cx="19.5" cy="16" r="7.25" />
    </svg>
  )
}
