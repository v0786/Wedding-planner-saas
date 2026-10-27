"use client"

import { useState } from "react"

export default function InviteLinkManager({ wedding }: any) {
  const [published, setPublished] = useState(wedding.published)
  const [loading, setLoading] = useState(false)
  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${wedding.invitationToken}`
  const rsvpUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/rsvp/${wedding.invitationToken}`

  async function togglePublish() {
    setLoading(true)
    try {
      const res = await fetch(`/api/weddings/${wedding.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      })
      if (res.ok) {
        setPublished(!published)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url)
    alert("Link copied!")
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Invitation Status</h2>
          <button
            onClick={togglePublish}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              published 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } disabled:opacity-50`}
          >
            {loading ? "Updating..." : published ? "Unpublish" : "Publish"}
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Status: {published ? "Published" : "Draft"}
        </p>
      </div>

      {published && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invitation Page Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 border border-gray-300 rounded-md py-2 px-3 bg-gray-50 text-sm"
              />
              <button
                onClick={() => copyLink(inviteUrl)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">RSVP Form Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={rsvpUrl}
                readOnly
                className="flex-1 border border-gray-300 rounded-md py-2 px-3 bg-gray-50 text-sm"
              />
              <button
                onClick={() => copyLink(rsvpUrl)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`You're invited to ${wedding.name}! RSVP here: ${rsvpUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
            >
              Share on WhatsApp
            </a>
          </div>
        </>
      )}
    </div>
  )
}
