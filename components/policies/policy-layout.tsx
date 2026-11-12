import Link from "next/link"
import type { ReactNode } from "react"
import { getPlatformSettings } from "@/lib/settings"

export async function PolicyLayout({ title, version, children }: { title: string; version: string; children: ReactNode }) {
  const settings = await getPlatformSettings()
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/" className="text-sm font-medium text-gold-700 underline-offset-4 hover:underline">Wedding Guest Planner</Link>
      <header className="mt-8 space-y-4 border-b border-ivory-200 pb-7">
        <h1 className="font-display text-4xl text-ink-800 sm:text-5xl">{title}</h1>
        <p className="text-sm text-ink-500">Version {version}</p>
        <p className="rounded-xl border border-champagne-200 bg-champagne-100 p-4 text-sm text-ink-700">
          This policy is a product draft awaiting legal review before commercial launch. Business and grievance details must be completed by the service operator.
        </p>
      </header>
      <div className="space-y-7 py-8 text-base leading-relaxed text-ink-600">{children}</div>
      <section className="space-y-2 border-t border-ivory-200 pt-6 text-sm text-ink-600" aria-labelledby="business-contact">
        <h2 id="business-contact" className="font-display text-2xl text-ink-800">Service operator and contact</h2>
        <p>{settings.businessName || "Business name awaiting configuration"}</p>
        <p>{settings.legalAddress || "Business address awaiting configuration"}</p>
        <p>{settings.supportEmail || "Support email awaiting configuration"}</p>
        <p>{settings.grievanceContact || "Grievance contact awaiting configuration"}</p>
      </section>
      <nav className="mt-8 flex gap-5 text-sm font-medium text-gold-700" aria-label="Policy navigation">
        <Link href="/terms" className="underline underline-offset-4">Terms of Service</Link>
        <Link href="/privacy" className="underline underline-offset-4">Privacy Notice</Link>
      </nav>
    </main>
  )
}
