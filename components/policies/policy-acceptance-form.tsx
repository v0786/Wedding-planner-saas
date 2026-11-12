"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PolicyAcknowledgement } from "@/components/policies/policy-acknowledgement"
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/policies"

export default function PolicyAcceptanceForm() {
  const router = useRouter()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function acceptPolicies(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/policies/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termsAccepted, privacyAcknowledged, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION }),
      })
      if (!response.ok) {
        const result = await response.json()
        setError(result.error || "Could not save your acceptance. Please try again.")
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Could not save your acceptance. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={acceptPolicies} className="space-y-5">
      <PolicyAcknowledgement termsAccepted={termsAccepted} privacyAcknowledged={privacyAcknowledged} onTermsChange={setTermsAccepted} onPrivacyChange={setPrivacyAcknowledged} />
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? "Saving…" : "Accept and continue"}</button>
    </form>
  )
}
