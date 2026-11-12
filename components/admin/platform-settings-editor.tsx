"use client"

import { useState } from "react"
import type { Settings } from "@/lib/settings"

export default function PlatformSettingsEditor({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) })
      const result = await response.json()
      setMessage(response.ok ? "Settings saved." : result.error || "Could not save settings.")
    } catch { setMessage("Could not save settings.") } finally { setBusy(false) }
  }
  const toggle = (key: keyof Settings, label: string) => (
    <label className="flex items-center gap-3" key={key}>
      <input type="checkbox" checked={Boolean(settings[key])} onChange={event => setSettings({ ...settings, [key]: event.target.checked })} />{label}
    </label>
  )
  return (
    <form onSubmit={save} className="space-y-7">
      <fieldset className="space-y-3"><legend className="mb-3 font-semibold">Business details</legend>
        {([['businessName', 'Business name'], ['legalAddress', 'Legal address'], ['supportEmail', 'Support email'], ['grievanceContact', 'Grievance contact']] as const).map(([key, label]) => (
          <label key={key} className="block text-sm">{label}<input className="input mt-1 w-full" value={settings[key]} onChange={event => setSettings({ ...settings, [key]: event.target.value })} /></label>
        ))}
      </fieldset>
      <fieldset className="space-y-3"><legend className="mb-3 font-semibold">Tax</legend>
        <p className="text-sm text-ink-500">Enable GST collection only after registration and the business tax configuration have been reviewed.</p>
        {toggle('gstEnabled', 'Collect GST')}
        <label className="block text-sm">GST percentage<input className="input mt-1 block" type="number" min="0" max="100" step="0.01" value={settings.gstRateBasisPoints / 100} onChange={event => setSettings({ ...settings, gstRateBasisPoints: Math.round(Number(event.target.value) * 100) })} /></label>
        {toggle('taxInclusive', 'Catalog prices include tax')}
        <p className="text-sm text-ink-500">Existing orders keep their recorded amounts and tax settings.</p>
      </fieldset>
      <fieldset className="space-y-3"><legend className="mb-3 font-semibold">Advertisements</legend>
        <p className="text-sm text-ink-500">Prime excludes application advertisements. Payment and sign-in screens have no placements.</p>
        {toggle('advertisementsEnabled', 'Enable advertisements')}
        {toggle('dashboardAds', 'Show on wedding dashboards')}
        {toggle('invitationAds', 'Show on public invitations')}
        {toggle('publicRsvpAds', 'Show on public RSVP pages')}
        <label className="block text-sm">Advertisement text<input className="input mt-1 w-full" maxLength={300} value={settings.adText} onChange={event => setSettings({ ...settings, adText: event.target.value })} /></label>
        <label className="block text-sm">Advertisement destination<input className="input mt-1 w-full" type="url" placeholder="https://" value={settings.adUrl} onChange={event => setSettings({ ...settings, adUrl: event.target.value })} /></label>
      </fieldset>
      <button disabled={busy} className="btn btn-primary" type="submit">{busy ? "Saving…" : "Save platform settings"}</button>
      {message && <p role="status">{message}</p>}
    </form>
  )
}
