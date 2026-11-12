"use client"

import { useState } from "react"
import { FormError } from "@/components/ui/field"

export default function GroupInvitationTransfer({ token }: { token: string }) {
  const [path, setPath] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  async function transfer() {
    if (!window.confirm("Create a new link for the other device? This invitation link will stop working.")) return
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/group-invitations/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setPath(new URL(result.path, window.location.origin).href)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create a replacement link")
    } finally {
      setPending(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(path)
      setCopied(true)
    } catch {
      setError("Select and copy the replacement link manually.")
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-ivory-200 bg-brand-surface p-5 text-ink-900">
      {path ? (
        <>
          <label className="label" htmlFor="replacement-invite">New one-time invitation link</label>
          <input className="input" id="replacement-invite" readOnly value={path} onFocus={(event) => event.currentTarget.select()} />
          <button className="btn btn-secondary" type="button" onClick={copy}>{copied ? "Copied" : "Copy new link"}</button>
        </>
      ) : (
        <button className="btn btn-secondary" disabled={pending} type="button" onClick={transfer}>
          {pending ? "Creating link…" : "Move invitation to another device"}
        </button>
      )}
      <FormError>{error}</FormError>
    </div>
  )
}
