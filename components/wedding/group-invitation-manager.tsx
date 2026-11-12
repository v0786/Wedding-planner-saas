"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import CheckInScanner from "@/components/wedding/check-in-scanner"
import { Field, FormError, FormSuccess, Input } from "@/components/ui/field"

type Group = {
  id: string
  label: string
  code: string
  claimed: boolean
  revoked: boolean
  checkedInAt: string | null
}

export default function GroupInvitationManager({ weddingId, groups, readOnly }: {
  weddingId: string
  groups: Group[]
  readOnly: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [shareLink, setShareLink] = useState("")
  const [label, setLabel] = useState("")
  const [mobile, setMobile] = useState("")
  const [code, setCode] = useState("")
  const [search, setSearch] = useState("")
  const base = `/api/weddings/${weddingId}`
  const visibleGroups = groups.filter(group => group.label.toLowerCase().includes(search.trim().toLowerCase()))

  async function request<T>(path: string, method: "POST" | "PATCH", body: object): Promise<T | undefined> {
    if (busy) return
    setError("")
    setNotice("")
    setBusy(true)
    try {
      const response = await fetch(`${base}/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "Please try again")
      router.refresh()
      return result as T
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again")
    } finally {
      setBusy(false)
    }
  }

  function showShareLink(path: string) {
    setShareLink(new URL(path, window.location.origin).href)
  }

  async function create(event: React.FormEvent) {
    event.preventDefault()
    const result = await request<{ path: string }>("group-invitations", "POST", { label, mobile })
    if (!result) return
    setLabel("")
    setMobile("")
    showShareLink(result.path)
    setNotice("Invitation created. Copy the link now or reissue it later.")
  }

  async function change(group: Group, action: "reissue" | "revoke") {
    const prompt = action === "reissue"
      ? `Create a replacement link for ${group.label}? The current invitation link will stop working.`
      : `Revoke the invitation and check-in code for ${group.label}?`
    if (!window.confirm(prompt)) return
    const result = await request<{ path: string | null }>(`group-invitations/${group.id}`, "PATCH", { action })
    if (!result) return
    if (result.path) showShareLink(result.path)
    else setShareLink("")
    setNotice(result.path ? "Replacement link created. The previous link has expired." : "Invitation revoked.")
  }

  async function checkIn(value: string) {
    const result = await request<{ label: string; alreadyCheckedIn: boolean }>("check-in", "POST", { code: value })
    if (!result) return
    setCode("")
    setNotice(result.alreadyCheckedIn ? `${result.label} is already checked in.` : `${result.label} checked in.`)
  }

  return (
    <div className="space-y-6">
      <div aria-live="polite" className="space-y-3">
        <FormError>{error}</FormError>
        <FormSuccess>{notice}</FormSuccess>
        {readOnly && <p className="rounded-xl bg-ivory-100 p-4 text-sm">This wedding is read-only.</p>}
      </div>
      {!readOnly && (
        <>
          <form onSubmit={create} className="card space-y-4 p-6">
            <h2 className="text-lg font-semibold">Create a private link</h2>
            <Field label="Guest or group name" htmlFor="group-label">
              <Input id="group-label" required maxLength={120} value={label} onChange={event => setLabel(event.target.value)} />
            </Field>
            <Field label="Expected phone number (optional)" htmlFor="group-mobile" hint="If entered, the guest must provide this number to RSVP.">
              <Input id="group-mobile" type="tel" maxLength={20} value={mobile} onChange={event => setMobile(event.target.value)} />
            </Field>
            <button type="submit" disabled={busy} className="btn btn-primary">Create invitation</button>
          </form>
          {shareLink && (
            <div className="card space-y-3 p-6">
              <Field label="Private link to share" htmlFor="group-share-link">
                <Input id="group-share-link" readOnly value={shareLink} onFocus={event => event.currentTarget.select()} />
              </Field>
              <button type="button" className="btn btn-secondary" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareLink)
                  setNotice("Invitation link copied.")
                  setError("")
                } catch {
                  setError("Select and copy the invitation link manually.")
                }
              }}>Copy invitation link</button>
            </div>
          )}
          <section className="card space-y-4 p-6">
            <h2 className="text-lg font-semibold">Check in a group</h2>
            <CheckInScanner onScan={checkIn} />
            <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
              event.preventDefault()
              void checkIn(code)
            }}>
              <Field label="Manual check-in code" htmlFor="manual-check-in" className="grow">
                <Input id="manual-check-in" required maxLength={40} value={code} onChange={event => setCode(event.target.value)} />
              </Field>
              <button type="submit" disabled={busy} className="btn btn-primary">Check in</button>
            </form>
          </section>
        </>
      )}
      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Invitations and arrivals</h2>
        <Field label="Find a group by name" htmlFor="search-check-in">
          <Input id="search-check-in" type="search" value={search} onChange={event => setSearch(event.target.value)} />
        </Field>
        {visibleGroups.length ? (
          <ul className="divide-y divide-ivory-200">
            {visibleGroups.map(group => (
              <li key={group.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{group.label}</p>
                  <p className="text-sm text-ink-500">
                    {group.revoked ? "Revoked" : group.claimed ? "Opened" : "Waiting to be opened"}
                    {group.checkedInAt && " · Checked in"}
                  </p>
                </div>
                {!readOnly && !group.revoked && (
                  <div className="flex flex-wrap gap-2">
                    {!group.checkedInAt && (
                      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => checkIn(group.code)}>
                        Check in
                      </button>
                    )}
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => change(group, "reissue")}>Reissue</button>
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => change(group, "revoke")}>Revoke</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-500">No invitations found.</p>}
      </section>
    </div>
  )
}
