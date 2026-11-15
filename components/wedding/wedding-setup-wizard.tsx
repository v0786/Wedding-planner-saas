"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Field, FormError, Input, Textarea } from "@/components/ui/field"
import WeddingSetupOptions from "@/components/wedding/wedding-setup-options"
import { EMPTY_WEDDING_SETUP, weddingSetupDraftSchema, type WeddingSetupDraftData } from "@/lib/wedding-setup-draft"
import { weddingCreateSchema } from "@/lib/validation"

const steps = ["Your celebration", "Venue and welcome", "Time and privacy", "Review"]

export default function WeddingSetupWizard() {
  const router = useRouter()
  const heading = useRef<HTMLHeadingElement>(null)
  const [form, setForm] = useState<WeddingSetupDraftData>(EMPTY_WEDDING_SETUP)
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [savedAt, setSavedAt] = useState("")
  const [weddingId, setWeddingId] = useState("")
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    let active = true
    fetch("/api/onboarding/setup", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Could not load your saved setup. Refresh to try again.")
      const { draft } = await response.json()
      if (!active) return
      if (draft) {
        setForm(weddingSetupDraftSchema.parse(draft.data))
        setStep(Math.min(3, Math.max(0, draft.step)))
        setSavedAt(draft.updatedAt)
        setWeddingId(draft.completedWeddingId || "")
      }
      setReady(true)
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Could not load your saved setup. Refresh to try again.") })
    return () => { active = false }
  }, [])

  useEffect(() => { if (ready && !weddingId) heading.current?.focus() }, [step, ready, weddingId])

  function update(field: keyof WeddingSetupDraftData, value: string) {
    setForm(current => ({ ...current, [field]: value }))
    setSavedAt("")
  }

  async function save(nextStep = step) {
    const response = await fetch("/api/onboarding/setup", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: form, step: nextStep }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || "Your progress could not be saved. Please try again.")
    setSavedAt(result.savedAt)
  }

  async function perform(action: () => Promise<void>) {
    setBusy(true)
    setError("")
    try { await action() }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.") }
    finally { setBusy(false) }
  }

  function validateStep() {
    if (step === 0 && (!form.name.trim() || !form.coupleName1.trim() || !form.date)) {
      throw new Error("Enter a wedding name, the first person’s name and a wedding date.")
    }
    if (step === 2 || step === 3) {
      const result = weddingCreateSchema.safeParse(form)
      if (!result.success) throw new Error(result.error.issues[0].message)
    }
  }

  async function next(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await perform(async () => {
      validateStep()
      await save(Math.min(step + 1, 3))
      if (step < 3) { setStep(step + 1); return }
      const response = await fetch("/api/onboarding/setup/complete", { method: "POST" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not create your wedding. Your saved details are safe.")
      setWeddingId(result.weddingId)
    })
  }

  if (!ready) return <section className="card space-y-4 p-6" aria-busy={!error}>{error ? <><FormError>{error}</FormError><Button onClick={() => window.location.reload()}>Try again</Button></> : <p role="status">Loading your saved setup…</p>}</section>

  if (weddingId) return (
    <section className="card space-y-5 p-6 sm:p-8">
      <p className="eyebrow">Wedding details saved</p>
      <h2 className="font-display text-3xl text-ink-800">Your wedding workspace is ready</h2>
      <p className="text-sm leading-relaxed text-ink-500">{form.name || "Your wedding"} is a private draft. Next, review a one-time plan and its final price. Paid access starts only after your payment is verified.</p>
      <div className="flex flex-wrap gap-3">
        <Link className="btn btn-primary" href={`/dashboard/billing?weddingId=${encodeURIComponent(weddingId)}`}>Choose a plan</Link>
        <Link className="btn btn-secondary" href={`/dashboard/weddings/${weddingId}`}>View wedding</Link>
        <Link className="btn btn-secondary" href={`/dashboard/weddings/${weddingId}/events`}>Manage events</Link>
      </div>
      {error && <FormError>{error}</FormError>}
      {confirmReset ? <div className="space-y-3 border-t border-ivory-200 pt-5"><p className="text-sm text-ink-600">Start a new setup? Your saved wedding and its payment history will stay in your dashboard.</p><div className="flex gap-3"><Button disabled={busy} onClick={() => perform(async () => {
        const response = await fetch("/api/onboarding/setup", { method: "DELETE" })
        if (!response.ok) throw new Error("Could not start a new setup. Please try again.")
        setForm(EMPTY_WEDDING_SETUP); setStep(0); setWeddingId(""); setSavedAt(""); setConfirmReset(false)
      })}>Start new setup</Button><Button variant="ghost" disabled={busy} onClick={() => setConfirmReset(false)}>Cancel</Button></div></div>
        : <Button variant="ghost" onClick={() => setConfirmReset(true)}>Set up another wedding</Button>}
    </section>
  )

  return (
    <section className="card overflow-hidden">
      <ol aria-label="Wedding setup progress" className="grid grid-cols-2 gap-3 border-b border-ivory-200 bg-brand-surface p-5 sm:grid-cols-4">
        {steps.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined} className={`text-sm ${index === step ? "font-semibold text-gold-700" : "text-ink-500"}`}><span className="mr-2">{index + 1}.</span>{label}</li>)}
      </ol>
      <form onSubmit={next} aria-busy={busy} className="space-y-6 p-6 sm:p-8">
        <h2 ref={heading} tabIndex={-1} className="font-display text-2xl text-ink-800">{steps[step]}</h2>
        {step === 0 && <>
          <Field label="Wedding name" htmlFor="setup-name"><Input disabled={busy} id="setup-name" required maxLength={200} value={form.name} onChange={event => update("name", event.target.value)} /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First person’s name" htmlFor="setup-first"><Input disabled={busy} id="setup-first" required maxLength={120} value={form.coupleName1} onChange={event => update("coupleName1", event.target.value)} /></Field>
            <Field label="Second person’s name (optional)" htmlFor="setup-second"><Input disabled={busy} id="setup-second" maxLength={120} value={form.coupleName2} onChange={event => update("coupleName2", event.target.value)} /></Field>
          </div>
          <Field label="Wedding date" htmlFor="setup-date" hint="Your plan expires at local midnight after this date."><Input disabled={busy} id="setup-date" type="date" required value={form.date} onChange={event => update("date", event.target.value)} /></Field>
        </>}
        {step === 1 && <>
          <Field label="Venue (optional)" htmlFor="setup-venue"><Input disabled={busy} id="setup-venue" maxLength={200} value={form.venue} onChange={event => update("venue", event.target.value)} /></Field>
          <Field label="Address (optional)" htmlFor="setup-address"><Textarea disabled={busy} id="setup-address" rows={2} maxLength={1000} value={form.address} onChange={event => update("address", event.target.value)} /></Field>
          <Field label="Invitation message (optional)" htmlFor="setup-message"><Textarea disabled={busy} id="setup-message" rows={4} maxLength={5000} value={form.description} onChange={event => update("description", event.target.value)} /></Field>
          <Field label="RSVP deadline (optional)" htmlFor="setup-deadline"><Input disabled={busy} id="setup-deadline" type="date" value={form.rsvpDeadline} onChange={event => update("rsvpDeadline", event.target.value)} /></Field>
        </>}
        {step === 2 && <fieldset disabled={busy}><WeddingSetupOptions value={form} onChange={changes => { setForm(current => ({ ...current, ...changes })); setSavedAt("") }} /></fieldset>}
        {step === 3 && <>
          <dl className="grid gap-4 rounded-xl border border-ivory-200 p-5 sm:grid-cols-2">
            {[["Wedding", form.name], ["Couple", [form.coupleName1, form.coupleName2].filter(Boolean).join(" & ")], ["Wedding date", form.date], ["Venue", form.venue || "Not set"], ["Timezone", form.timezone], ["Contact visibility", form.contactVisibility === "hidden" ? "Hidden in lists and exports" : "Visible to organizers"]].map(([label, value]) => <div key={label}><dt className="text-xs uppercase tracking-wide text-ink-500">{label}</dt><dd className="mt-1 break-words text-sm text-ink-800">{value}</dd></div>)}
          </dl>
          <p className="text-sm leading-relaxed text-ink-500">Create your private wedding draft, then choose a plan and review checkout. You can add events, guests and invitation design from your wedding dashboard. Nothing is published or charged by this step.</p>
        </>}
        {error && <FormError>{error}</FormError>}
        <p role="status" aria-live="polite" className="text-xs text-ink-500">{busy ? "Saving your progress…" : savedAt ? "Progress saved to your account." : "Your latest changes have not been saved yet."}</p>
        <div className="flex flex-wrap items-center gap-3 border-t border-ivory-200 pt-5">
          {step > 0 && <Button type="button" variant="secondary" disabled={busy} onClick={() => setStep(step - 1)}>Back</Button>}
          <Button type="submit" disabled={busy}>{step === 3 ? "Create wedding and choose plan" : "Save and continue"}</Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => perform(async () => { await save(); router.push("/dashboard") })}>Save and exit</Button>
        </div>
      </form>
    </section>
  )
}
