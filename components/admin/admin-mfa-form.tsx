"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

export default function AdminMfaForm({ enrolled }: { enrolled: boolean }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [secret, setSecret] = useState("")
  const [uri, setUri] = useState("")
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [replace, setReplace] = useState(false)
  async function lock() {
    setBusy(true); setError("")
    try {
      const response = await fetch("/api/admin/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lock" }) })
      if (!response.ok) throw new Error("Administrator session could not be locked")
      router.push("/dashboard"); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Administrator session could not be locked") }
    finally { setBusy(false) }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError("")
    try {
      const response = await fetch("/api/admin/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(
        replace ? { action: "reset", password } : enrolled ? { action: "verify", code } : secret ? { action: "enroll", code } : { action: "begin", password },
      ) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Verification could not be completed")
      setPassword(""); setCode("")
      if (result.reset) { setReplace(false); router.refresh() }
      else if (result.secret) { setSecret(result.secret); setUri(result.uri) }
      else if (result.recoveryCodes) { setSecret(""); setUri(""); setRecoveryCodes(result.recoveryCodes) }
      else { router.push("/dashboard/admin"); router.refresh() }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Verification could not be completed") }
    finally { setBusy(false) }
  }
  if (recoveryCodes.length) return (
    <section className="card space-y-4 p-6">
      <h2 className="text-xl font-semibold">Save your recovery codes</h2>
      <p className="text-sm text-ink-500">Store these in your password manager. Each code works once if you lose your authenticator. They will not be shown again.</p>
      <ul className="grid gap-2 font-mono text-sm sm:grid-cols-2">{recoveryCodes.map(value => <li key={value}>{value}</li>)}</ul>
      <Link href="/dashboard/admin" className="btn btn-primary">I saved my codes — continue</Link>
    </section>
  )
  return (
    <form onSubmit={submit} className="card space-y-5 p-6">
      {((!enrolled && !secret) || replace) && <>
        <p className="text-sm">Confirm your account password to set up or replace your authenticator. Replacement also requires an already verified administrator session. Google-only accounts can set a password through <Link className="underline" href="/auth/forgot-password">password recovery</Link>.</p>
        <label className="block text-sm font-medium" htmlFor="admin-password">Account password</label>
        <input id="admin-password" className="input w-full" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
      </>}
      {secret && <section className="space-y-3">
        <h2 className="font-semibold">Add an authenticator account</h2>
        <p className="text-sm">In Google Authenticator, Microsoft Authenticator, or your password manager, add a time-based account using this setup key:</p>
        <p className="break-all rounded border border-ivory-200 p-3 font-mono text-sm select-all">{secret}</p>
        <a href={uri} className="inline-block text-sm underline">Open in an authenticator on this device</a>
        <p className="text-xs text-ink-500">Six digits, refreshed every 30 seconds. Setup expires after 10 minutes. Never share this key.</p>
      </section>}
      {((enrolled || secret) && !replace) && <>
        <label className="block text-sm font-medium" htmlFor="admin-code">Authenticator code{enrolled ? " or recovery code" : ""}</label>
        <input id="admin-code" className="input w-full" type="text" autoComplete="one-time-code" inputMode={enrolled ? "text" : "numeric"} minLength={6} maxLength={40} required value={code} onChange={event => setCode(event.target.value)} />
      </>}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <button className="btn btn-primary" disabled={busy} type="submit">{busy ? "Verifying…" : replace ? "Replace authenticator" : !enrolled && !secret ? "Set up authenticator" : "Verify"}</button>
      {enrolled && <button className="block text-sm underline" disabled={busy} onClick={lock} type="button">Lock administrator session</button>}
      {enrolled && <button className="block text-sm underline" type="button" onClick={() => { setReplace(!replace); setPassword(""); setCode(""); setError("") }}>{replace ? "Return to verification" : "Replace a lost or old authenticator"}</button>}
    </form>
  )
}
