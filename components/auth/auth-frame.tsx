import Link from "next/link"
import type { ReactNode } from "react"

/** Shared visual frame keeps account entry and recovery consistent. */
export default function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="paper-texture relative min-h-screen bg-brand-background px-4 py-10 sm:px-8 lg:flex lg:items-center lg:py-12">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-24">
        <aside className="relative hidden overflow-hidden rounded-[2rem] border border-gold-500/20 bg-brand-surface px-10 py-14 lg:block xl:px-14">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full border border-gold-500/15" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-16 h-80 w-80 rounded-full border border-gold-500/10" />
          <Link href="/" className="relative inline-flex items-center gap-3 text-sm text-gold-400">
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.25" className="h-9 w-9" aria-hidden="true"><circle cx="12.5" cy="16" r="7.25" /><circle cx="19.5" cy="16" r="7.25" /></svg>
            <span className="text-[10px] uppercase tracking-[0.23em]">For every beautiful beginning</span>
          </Link>
          <p className="relative mt-24 text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-400">Less planning. More celebrating.</p>
          <h2 className="relative mt-5 font-display text-5xl leading-[1.08] text-ink-800 xl:text-6xl">The people you love.<br /><span className="italic text-gold-400">All in one place.</span></h2>
          <p className="relative mt-6 max-w-sm text-sm leading-7 text-ink-500">From the first invitation to the final celebration, bring every guest, response and little detail together.</p>
          <div className="relative mt-14 grid grid-cols-3 gap-4 border-t border-gold-500/20 pt-7">
            {["Invite beautifully", "Plan thoughtfully", "Celebrate fully"].map((label, index) => (
              <div key={label}><span className="font-display text-xl italic text-gold-400">0{index + 1}</span><p className="mt-2 text-xs leading-5 text-ink-500">{label}</p></div>
            ))}
          </div>
        </aside>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </main>
  )
}
