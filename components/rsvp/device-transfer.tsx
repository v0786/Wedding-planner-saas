"use client"

import { useState } from "react"

export function DeviceTransfer({ invitationToken, editToken }: { invitationToken: string; editToken: string }) {
  const [link, setLink] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  async function createLink() {
    setBusy(true)
    setLink("")
    setMessage("")
    try {
      const response = await fetch("/api/rsvp/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationToken, editToken }),
      })
      if (!response.ok) throw new Error("This edit link is unavailable in this browser.")
      const { path } = await response.json()
      setLink(new URL(path, window.location.origin).href)
    } catch {
      setMessage("Could not create a transfer link. Open the RSVP in its saved browser and try again.")
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setMessage("Transfer link copied.")
    } catch {
      setMessage("Select and copy the link below.")
    }
  }

  return (
    <section className="mt-4 space-y-3 text-sm">
      <button type="button" onClick={createLink} disabled={busy} className="btn btn-secondary">
        {busy ? "Creating link…" : "Create device transfer link"}
      </button>
      {link && (
        <>
          <p>Open this one-time link on your other device within 15 minutes. Confirming the transfer expires your old edit link.</p>
          <input aria-label="Device transfer link" value={link} readOnly className="input w-full" onFocus={(event) => event.target.select()} />
          <button type="button" onClick={copyLink} className="btn btn-secondary">Copy transfer link</button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  )
}
