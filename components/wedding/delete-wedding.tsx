"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function DeleteWedding({ id, name }: { id: string; name: string }) {
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function removeWedding(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setBusy(true)
    try {
      const response = await fetch(`/api/weddings/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: confirmation }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not delete this wedding")
      router.push("/dashboard/weddings")
      router.refresh()
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not delete this wedding")
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="mt-10 rounded-xl border border-rose-200 bg-white p-5">
      <summary className="cursor-pointer text-sm font-medium text-rose-700">Delete this wedding</summary>
      <form className="mt-4 space-y-3" onSubmit={removeWedding}>
        <p className="text-sm text-ink-600">This permanently removes the wedding, guests, invitations and responses. Download the records you need before continuing. Payment history is retained.</p>
        <label htmlFor="delete-wedding-confirmation" className="block text-sm font-medium">Type {name} to confirm</label>
        <input id="delete-wedding-confirmation" className="input w-full" value={confirmation} onChange={event => setConfirmation(event.target.value)} required autoComplete="off" />
        <button type="submit" disabled={busy || confirmation !== name} className="btn bg-rose-700 text-white disabled:opacity-50">{busy ? "Deleting…" : "Permanently delete wedding"}</button>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      </form>
    </details>
  )
}
