"use client"

import Link from "next/link"

export function PolicyAcknowledgement({
  termsAccepted,
  privacyAcknowledged,
  onTermsChange,
  onPrivacyChange,
}: {
  termsAccepted: boolean
  privacyAcknowledged: boolean
  onTermsChange: (value: boolean) => void
  onPrivacyChange: (value: boolean) => void
}) {
  return (
    <div className="space-y-2 text-sm text-ink-600">
      <label className="flex min-h-11 items-start gap-3 py-2">
        <input type="checkbox" required checked={termsAccepted} onChange={(event) => onTermsChange(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-gold-700" />
        <span>I accept the <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">Terms of Service</Link>.</span>
      </label>
      <label className="flex min-h-11 items-start gap-3 py-2">
        <input type="checkbox" required checked={privacyAcknowledged} onChange={(event) => onPrivacyChange(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-gold-700" />
        <span>I have read the <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">Privacy Notice</Link>.</span>
      </label>
    </div>
  )
}
