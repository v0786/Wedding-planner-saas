"use client"

import { useState } from "react"
import Link from "next/link"
import { Field, Input, FormError, FormSuccess } from "@/components/ui/field"
import { Button } from "@/components/ui/button"

export function PasswordRecoveryForm({ token }: { token?: string }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setMessage("")
    if (token && password !== confirm) {
      setError("The passwords must match.")
      return
    }
    setBusy(true)
    try {
      const response = await fetch(`/api/auth/password/${token ? "reset" : "request"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token, password } : { email }),
      })
      const body = await response.json()
      if (!response.ok) setError(body.error || "Could not complete this request. Please try again.")
      else setMessage(token ? "Your password has been updated. Sign in with your new password." : body.message)
    } catch {
      setError("Could not complete this request. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card-elevated mx-auto w-full max-w-md space-y-5 p-6 sm:p-8">
      <h1 className="font-display text-2xl text-ink-800">{token ? "Choose a new password" : "Reset your password"}</h1>
      {token ? <>
        <Field label="New password" htmlFor="new-password"><Input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={200} required value={password} onChange={event => setPassword(event.target.value)} /></Field>
        <Field label="Confirm new password" htmlFor="confirm-password"><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={200} required value={confirm} onChange={event => setConfirm(event.target.value)} /></Field>
      </> : <Field label="Email address" htmlFor="recovery-email"><Input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></Field>}
      {error && <FormError>{error}</FormError>}
      {message && <FormSuccess>{message}</FormSuccess>}
      {!message && <Button type="submit" disabled={busy} className="w-full">{busy ? "Please wait…" : token ? "Save new password" : "Send reset link"}</Button>}
      <Link href="/auth/login" className="block text-sm text-gold-700 underline">Back to sign in</Link>
    </form>
  )
}
