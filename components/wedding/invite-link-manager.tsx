"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type InviteWedding = {
  id: string
  name: string
  invitationToken: string
  published: boolean
}

export default function InviteLinkManager({
  wedding,
  canPublish,
  readOnly,
  whatsappSharing,
}: {
  wedding: InviteWedding
  canPublish: boolean
  readOnly: boolean
  whatsappSharing: boolean
}) {
  const [published, setPublished] = useState(wedding.published)
  const [origin, setOrigin] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  // Compute the origin after mount so server and client render identical HTML.
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const inviteUrl = origin ? `${origin}/invite/${wedding.invitationToken}` : ""
  const rsvpUrl = origin ? `${origin}/rsvp/${wedding.invitationToken}` : ""

  async function togglePublish() {
    setLoading(true)
    setError("")
    setNotice("")
    try {
      const res = await fetch(`/api/weddings/${wedding.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Could not update the invitation status")
        return
      }
      setPublished(data.wedding.published)
      setNotice(data.wedding.published ? "Invitation published." : "Invitation unpublished.")
    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function copyLink(url: string) {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setNotice("Link copied to clipboard.")
    } catch {
      setError("Could not copy automatically. Select the link and copy it manually.")
    }
  }

  return (
    <div className="space-y-6 rounded-lg bg-brand-surface p-6 shadow">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Invitation status</h2>
          <button
            type="button"
            onClick={togglePublish}
            disabled={loading || readOnly || (!published && !canPublish)}
            className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              published
                ? "bg-rose-100 text-brand-danger hover:bg-rose-100"
                : "bg-sage-100 text-brand-success hover:bg-sage-100"
            }`}
          >
            {loading ? "Updating..." : published ? "Unpublish" : "Publish"}
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Status:{" "}
          <span className={published ? "font-medium text-brand-success" : "font-medium text-gray-700"}>
            {readOnly ? "Expired" : published ? "Published" : "Draft"}
          </span>
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {readOnly
            ? "Guests can no longer open this invitation."
            : published
              ? "Anyone with the link can view the invitation and submit an RSVP."
              : "Guests can open the invitation after you publish it."}
        </p>
        {!readOnly && !published && !canPublish && (
          <Link href={`/dashboard/billing?weddingId=${encodeURIComponent(wedding.id)}`} className="btn btn-primary mt-4">
            Choose a wedding plan
          </Link>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-rose-100 px-4 py-3 text-sm text-brand-danger">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-md bg-sage-100 px-4 py-3 text-sm text-brand-success">
          {notice}
        </div>
      )}

      {published && !readOnly && (
        <>
          <LinkField label="Invitation page" value={inviteUrl} onCopy={copyLink} />
          <LinkField label="RSVP form" value={rsvpUrl} onCopy={copyLink} />

          {whatsappSharing && <div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `You're invited to ${wedding.name}! RSVP here: ${rsvpUrl}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Share on WhatsApp
            </a>
          </div>}
        </>
      )}
    </div>
  )
}

function LinkField({
  label,
  value,
  onCopy,
}: {
  label: string
  value: string
  onCopy: (value: string) => void
}) {
  const id = `link-${label.replace(/\s+/g, "-").toLowerCase()}`
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          readOnly
          className="flex-1 rounded-md border border-gray-300 bg-ivory-100 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => onCopy(value)}
          className="rounded-md bg-brand-surface-muted px-4 py-2 text-sm text-gray-700 hover:bg-brand-surface-muted"
        >
          Copy
        </button>
      </div>
    </div>
  )
}
