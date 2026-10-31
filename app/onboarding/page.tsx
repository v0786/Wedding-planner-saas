import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function OnboardingPage() {
  const session = await auth()
  if (session?.user?.id) redirect("/dashboard")

  return (
    <div className="paper-texture relative flex min-h-screen items-center justify-center overflow-hidden bg-ivory-50 px-4 py-12 sm:px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2.5 text-ink-800">
            <RingsMark className="h-7 w-7 text-gold-500" />
            <span className="font-display text-xl tracking-[0.01em]">Wedding Guest Manager</span>
          </span>

          <h2 className="mt-8 font-display text-display-xs text-ink-800 sm:text-display-sm">
            Welcome to Wedding Guest Manager
          </h2>

          <p className="lede mx-auto mt-4 max-w-sm">
            Create your wedding workspace to start managing guests, RSVPs, and events.
          </p>

          <div className="mx-auto mt-9 max-w-[12rem]">
            <div className="gold-hairline" />
          </div>
        </div>

        <div className="card-elevated px-6 py-7 sm:px-8 sm:py-8">
          <Link
            href="/auth/register"
            className="btn btn-primary btn-lg w-full"
          >
            Create Account
          </Link>
          <p className="mt-5 text-center text-sm text-ink-500">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-gold-700 underline-offset-4 transition-colors hover:text-gold-600 hover:underline"
            >
              Sign in
            </Link>
          </p>
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
