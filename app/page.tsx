import Link from "next/link"
import { auth } from "@/auth"
import { ButtonLink } from "@/components/ui/button"

const FEATURES = [
  ["01", "An invitation, beautifully simple.", "Share your wedding link. Guests RSVP on their phones, with no account to create."],
  ["02", "Every family. Every celebration.", "Keep family members, event choices, dietary needs and travel details together."],
  ["03", "Less chasing. More celebrating.", "See responses arrive and turn your guest list into a clear, event-wise headcount."],
] as const

export default async function Home() {
  const session = await auth()
  const primaryHref = session?.user ? "/dashboard" : "/auth/register"
  const primaryLabel = session?.user ? "Go to dashboard" : "Plan your celebration"

  return (
    <div className="min-h-screen bg-brand-background">
      <header className="relative z-30 border-b border-brand-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-10 sm:py-6">
          <Link href="/" aria-label="Wedding Guest Manager home" className="flex items-center gap-3">
            <RingsMark className="h-9 w-9 shrink-0 text-gold-500" />
            <span className="font-display text-lg leading-tight text-ink-800 sm:text-xl">Wedding <span className="block text-[9px] font-sans uppercase tracking-[0.16em] sm:text-[11px] sm:tracking-[0.2em] text-gold-500">Guest Manager</span></span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-6 lg:gap-9">
            <Link href="#experience" className="hidden text-sm text-ink-500 hover:text-gold-500 lg:block">The experience</Link>
            <Link href="/pricing" className="hidden text-sm text-ink-500 hover:text-gold-500 sm:block">Pricing</Link>
            <Link href="/auth/login" className="hidden text-sm text-ink-500 hover:text-gold-500 sm:block">Sign in</Link>
            <ButtonLink href={primaryHref} size="sm" variant="secondary" className="border-gold-300/60 px-4">{session?.user ? "Dashboard" : "Get started"}<ArrowMark /></ButtonLink>
          </nav>
        </div>
      </header>

      <main>
        <section className="paper-texture relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-10 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-24">
            <div className="relative z-10 animate-fade-up">
              <p className="eyebrow flex items-center gap-3"><span className="h-px w-8 bg-gold-400" />For your once-in-a-lifetime</p>
              <h1 className="mt-7 max-w-xl font-display text-[3.5rem] leading-[0.99] tracking-[-0.035em] sm:text-[4.5rem] lg:text-[5.2rem]">A day to cherish.<br /><span className="italic text-gold-500">Every guest,<br className="hidden lg:block" /> taken care of.</span></h1>
              <p className="mt-7 max-w-md text-base leading-[1.9] text-ink-500">From your first invitation to the final headcount. A thoughtful space to gather your guests, organise every event, and enjoy the moments that matter.</p>
              <div className="mt-9 flex flex-col gap-3 min-[420px]:flex-row">
                <ButtonLink href={primaryHref} size="lg">{primaryLabel}<ArrowMark /></ButtonLink>
                <ButtonLink href="#experience" variant="ghost" size="lg" className="justify-start min-[420px]:justify-center">Explore the experience <span aria-hidden="true">↓</span></ButtonLink>
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] tracking-wide text-ink-400"><span><span className="mr-2 text-gold-500">✧</span>No guest sign-up</span><span><span className="mr-2 text-gold-500">✧</span>Made for Indian weddings</span><span><span className="mr-2 text-gold-500">✧</span>From ₹499 / wedding</span></div>
            </div>

            <div className="relative mx-auto w-full max-w-[480px] px-3 pb-10 pt-3 sm:px-6 lg:max-w-none">
              <div className="hero-arch relative flex min-h-[450px] flex-col items-center justify-center overflow-hidden border border-gold-300/40 px-8 pb-12 pt-24 text-center sm:min-h-[570px]">
                <div aria-hidden="true" className="absolute inset-3 rounded-t-[48%] border border-gold-300/30" />
                <div aria-hidden="true" className="absolute inset-6 rounded-t-[48%] border border-gold-300/15" />
                <span className="relative text-4xl text-gold-400" aria-hidden="true">✧</span>
                <p className="relative mt-7 text-[9px] uppercase tracking-[0.32em] text-gold-500">Together with their families</p>
                <p className="relative mt-7 font-display text-[3.6rem] leading-[0.95] text-ink-800 sm:text-[4.5rem]">Aarav<br /><span className="text-4xl italic text-gold-500">&</span><br />Meera</p>
                <div className="gold-hairline relative mt-8 max-w-[140px]" />
                <p className="relative mt-6 text-[10px] uppercase tracking-[0.24em] text-ink-600">A celebration of forever</p>
                <p className="relative mt-3 text-xs text-gold-500">You&apos;re on our guest list.</p>
                <p className="relative mt-6 text-[9px] uppercase tracking-[0.16em] text-ink-400">Invitation preview</p>
              </div>
              <div className="absolute -bottom-1 left-0 right-6 flex items-center gap-4 rounded-xl border border-gold-300/40 bg-[#202119] p-4 shadow-lift sm:-left-4 sm:right-20">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-300/40 text-gold-500" aria-hidden="true">✓</span>
                <div><p className="text-sm text-ink-800">Joyfully accepted.</p><p className="mt-1 text-xs text-ink-400">Beautiful invitations. Effortless RSVPs.</p></div>
                <span className="ml-auto text-xl text-gold-500" aria-hidden="true">✧</span>
              </div>
            </div>
          </div>
        </section>

        <section id="experience" className="scroll-mt-8 border-y border-brand-border bg-ivory-100/50 px-5 py-16 sm:px-10 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">A little less planning. A lot more presence.</p><h2 className="mt-4 max-w-xl font-display text-4xl leading-tight sm:text-5xl">For the people who<br /><span className="italic text-gold-500">make your day.</span></h2></div><p className="max-w-sm text-sm leading-7 text-ink-500">One calm place for all the details, so you can spend more time with the people you love.</p></div>
            <div className="stagger mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
              {FEATURES.map(([number, title, description]) => <article key={number} className="border-t border-gold-300/40 pt-6"><p className="font-display text-2xl italic text-gold-500">{number}<span className="float-right text-lg" aria-hidden="true">✧</span></p><h3 className="mt-5 font-display text-2xl text-ink-800">{title}</h3><p className="mt-3 text-sm leading-7 text-ink-500">{description}</p></article>)}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-10 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div><p className="eyebrow">Simple from the very beginning</p><h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">Your guest list.<br /><span className="italic text-gold-500">Beautifully in order.</span></h2><p className="mt-5 max-w-sm text-sm leading-7 text-ink-500">A wedding has a thousand little details. Bringing your guests together should feel effortless.</p><Link href="/faq" className="mt-7 inline-flex items-center gap-3 border-b border-gold-300 pb-2 text-sm text-gold-500">All your questions, answered <ArrowMark /></Link></div>
            <ol className="divide-y divide-brand-border">
              {[["Create your wedding", "Add your date, celebrations and the details that make it yours."], ["Invite your favourite people", "Publish your invitation, share the link and let guests respond on mobile."], ["Watch it all come together", "Manage your guest list, follow RSVPs and export event-wise reports."]].map(([title, description], i) => <li key={title} className="flex gap-5 py-6 first:pt-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-300/50 font-display text-lg text-gold-500">{i + 1}</span><div><h3 className="font-display text-2xl">{title}</h3><p className="mt-2 text-sm leading-7 text-ink-500">{description}</p></div></li>)}
            </ol>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-10 sm:pb-24"><div className="paper-texture mx-auto max-w-7xl rounded-2xl border border-gold-300/40 bg-ivory-100 px-6 py-14 text-center sm:py-20"><p className="eyebrow">Begin your next chapter</p><h2 className="mx-auto mt-5 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">Make room for <span className="italic text-gold-500">the memories.</span><br />We&apos;ll help with the guest list.</h2><p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-ink-500">Create your wedding workspace today. Choose Basic ₹499, Pro ₹999 or Prime ₹1,999 when you&apos;re ready to publish.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><ButtonLink href={primaryHref} size="lg">{primaryLabel}<ArrowMark /></ButtonLink><ButtonLink href="/pricing" variant="secondary" size="lg">Explore plans</ButtonLink></div><p className="mt-6 text-xs text-ink-400">One-time plans, per wedding. No monthly subscription.</p></div></section>
      </main>

      <footer className="border-t border-brand-border px-5 py-9 sm:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><RingsMark className="h-8 w-8 text-gold-500" /><div><p className="font-display text-xl">Wedding Guest Manager</p><p className="mt-1 text-xs text-ink-400">For the moments. For the people.</p></div></div><nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-ink-500"><Link href="/pricing" className="hover:text-gold-500">Pricing</Link><Link href="/faq" className="hover:text-gold-500">FAQ</Link><Link href="/terms" className="hover:text-gold-500">Terms</Link><Link href="/privacy" className="hover:text-gold-500">Privacy</Link><Link href="/auth/login" className="text-gold-500">Sign in</Link></nav></div></footer>
    </div>
  )
}

function RingsMark({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.1" className={className} aria-hidden="true"><circle cx="12" cy="17" r="8" /><circle cx="21" cy="17" r="8" /><path d="m15 5 2-3 2 3-2 3z" /></svg>
}

function ArrowMark() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-4 w-4 shrink-0" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" /></svg>
}
