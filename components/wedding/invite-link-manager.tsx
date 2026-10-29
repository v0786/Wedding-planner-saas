"use client"

import { useEffect, useState } from "react"

type InviteWedding = {
  id: string
  name: string
  invitationToken: string
  published: boolean
}

export default function InviteLinkManager({ wedding }: { wedding: InviteWedding }) {
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
    <div className="space-y-6 rounded-lg bg-white p-6 shadow">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Invitation status</h2>
          <button
            type="button"
            onClick={togglePublish}
            disabled={loading}
            className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              published
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            {loading ? "Updating..." : published ? "Unpublish" : "Publish"}
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Status:{" "}
          <span className={published ? "font-medium text-green-700" : "font-medium text-gray-700"}>
            {published ? "Published" : "Draft"}
          </span>
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {published
            ? "Anyone with the link can view the invitation and submit an RSVP."
            : "Unpublished invitations show a friendly “not available” page to guests."}
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          {notice}
        </div>
      )}

      {published && (
        <>
          <LinkField label="Invitation page" value={inviteUrl} onCopy={copyLink} />
          <LinkField label="RSVP form" value={rsvpUrl} onCopy={copyLink} />

          <div>
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
          </div>
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
          className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => onCopy(value)}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
        >
          Copy
        </button>
      </div>
    </div>
  )
}
