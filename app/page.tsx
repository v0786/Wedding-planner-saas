import Link from "next/link"
import { auth } from "@/auth"
import { ButtonLink } from "@/components/ui/button"

const VALUE_PROPS = [
  ["One link", "Share a single invitation link with every guest."],
  ["RSVP without signup", "Guests respond with their name and mobile number."],
  ["Family & events", "Add family members and choose events per person."],
  ["Live reports", "Headcount, dietary needs, and event attendance in one place."],
] as const

export default async function Home() {
  const session = await auth()
  const signedIn = Boolean(session?.user)
  const primaryHref = signedIn ? "/dashboard" : "/auth/register"
  const primaryLabel = signedIn ? "Go to dashboard" : "Start Free"

  return (
    <div className="min-h-screen bg-ivory-50">
      <header className="sticky top-0 z-40 border-b border-ivory-200/70 bg-ivory-50/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-sm text-ink-800 transition-colors hover:text-gold-700"
          >
            <RingsMark className="h-6 w-6 text-gold-500 sm:h-7 sm:w-7" />
            <span className="font-display text-base tracking-[0.01em] sm:text-xl">
              Wedding Guest Manager
            </span>
          </Link>

          <nav aria-label="Main" className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/faq"
              className="hidden text-sm font-medium text-ink-600 transition-colors hover:text-gold-700 sm:inline-flex"
            >
              FAQ
            </Link>
            <Link
              href="/pricing"
              className="hidden text-sm font-medium text-ink-600 transition-colors hover:text-gold-700 sm:inline-flex"
            >
              Pricing
            </Link>
            <Link
              href="/auth/login"
              className="hidden text-sm font-medium text-ink-600 transition-colors hover:text-gold-700 sm:inline-flex"
            >
              Sign in
            </Link>
            <ButtonLink href={signedIn ? "/dashboard" : "/auth/register"} size="sm" className="whitespace-nowrap">
              {signedIn ? "Dashboard" : "Get Started"}
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main>
        {/* ---------- Editorial hero ---------- */}
        <section className="paper-texture relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-gold-300 bg-white/70 text-gold-500 shadow-soft">
                <RingsMark className="h-7 w-7" />
              </span>

              <p className="eyebrow mt-7">Wedding Guest Manager</p>

              <h1 className="mt-5 font-display text-[2.6rem] leading-[1.06] tracking-[-0.015em] text-ink-800 sm:text-display">
                <span className="block">Manage Wedding Guests</span>
                <span className="mt-1 block italic text-gold-600">Made Simple</span>
              </h1>

              <div className="mx-auto mt-9 max-w-xs">
                <div className="gold-hairline" />
              </div>

              <p className="lede mx-auto mt-7 max-w-2xl">
                One shared invitation link · Customisable RSVP · Family members · Event-wise tracking ·
                Mobile-first for Indian weddings
              </p>

              <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <ButtonLink href={primaryHref} size="lg" className="w-full sm:w-auto">
                  {primaryLabel}
                </ButtonLink>
                <ButtonLink href="/faq" variant="secondary" size="lg" className="w-full sm:w-auto">
                  How it works
                </ButtonLink>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
            <div className="rule-gold" />
          </div>
        </section>

        {/* ---------- Value propositions ---------- */}
        <section className="bg-ivory-50 px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">What you get</p>
              <h2 className="mt-4 font-display text-display-xs text-ink-800 sm:text-display-sm">
                One place for every guest detail
              </h2>
              <p className="lede mt-4">
                From the first invitation to the final headcount, every answer lands in the same calm,
                organised view.
              </p>
            </div>

            <div className="stagger mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {VALUE_PROPS.map(([title, description], index) => (
                <article
                  key={title}
                  className="card group flex flex-col p-6 transition-all duration-300 ease-refined hover:-translate-y-1 hover:border-gold-300 hover:shadow-lift"
                >
                  <span className="font-display text-2xl text-gold-400" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 font-display text-xl leading-snug text-ink-800">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>
                  <span className="gold-hairline mt-5 w-12 opacity-60" aria-hidden="true" />
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Closing call to action ---------- */}
        <section className="px-5 pb-20 sm:px-8 sm:pb-28">
          <div className="mx-auto max-w-6xl">
            <div className="paper-texture relative overflow-hidden rounded-3xl border border-gold-300/60 bg-white px-6 py-14 text-center shadow-lift sm:px-12 sm:py-20">
              <p className="eyebrow">Start today</p>
              <h2 className="mx-auto mt-4 max-w-2xl font-display text-display-xs text-ink-800 sm:text-display-sm">
                Ready to gather every guest in one place?
              </h2>
              <p className="lede mx-auto mt-4 max-w-xl">
                Create your wedding workspace, publish one invitation link, and let the responses arrive on
                their own.
              </p>

              <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <ButtonLink href={primaryHref} size="lg" className="w-full sm:w-auto">
                  {primaryLabel}
                </ButtonLink>
                <ButtonLink href="/pricing" variant="secondary" size="lg" className="w-full sm:w-auto">
                  Compare plans
                </ButtonLink>
              </div>

              <div className="mx-auto mt-12 max-w-xs">
                <div className="gold-hairline" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ivory-200 bg-ivory-100/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-5 py-10 text-center sm:flex-row sm:px-8 sm:text-left">
          <div>
            <span className="inline-flex items-center gap-2.5 text-ink-800">
              <RingsMark className="h-6 w-6 text-gold-500" />
              <span className="font-display text-lg">Wedding Guest Manager</span>
            </span>
            <p className="mt-2 text-sm text-ink-500">One shared invitation link for every guest.</p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link href="/faq" className="text-ink-600 transition-colors hover:text-gold-700">
              FAQ
            </Link>
            <Link href="/pricing" className="text-ink-600 transition-colors hover:text-gold-700">
              Pricing
            </Link>
            <Link href="/auth/login" className="text-ink-600 transition-colors hover:text-gold-700">
              Sign in
            </Link>
            <Link href={primaryHref} className="font-medium text-gold-700 transition-colors hover:text-gold-600">
              {signedIn ? "Dashboard" : "Get Started"}
            </Link>
          </nav>
        </div>
      </footer>
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
