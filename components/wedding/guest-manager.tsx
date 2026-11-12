"use client"

import { useState } from "react"

export type GuestRecord = {
  id: string
  firstName: string
  lastName: string | null
  mobile: string | null
  email: string | null
  group: string | null
  side: string | null
  category: string | null
  accommodationNeeds: string | null
  transportNeeds: string | null
  notes: string | null
  dietaryPrefs: string | null
  rsvpSubmission: {
    id: string
    status: string
    partySize?: number | null
    familyMembers: Array<{ id: string }>
    eventResponses: Array<{ eventId: string; status: string }>
    dietaryPrefs: string | null
  } | null
}

export type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type FormState = {
  firstName: string
  lastName: string
  mobile: string
  email: string
  group: string
  side: string
  category: string
  accommodationNeeds: string
  transportNeeds: string
  notes: string
  dietaryPrefs: string
}

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  mobile: "",
  email: "",
  group: "",
  side: "",
  category: "",
  accommodationNeeds: "",
  transportNeeds: "",
  notes: "",
  dietaryPrefs: "",
}

export default function GuestManager({
  weddingId,
  initialGuests,
  initialPagination,
  groups,
  contactsVisible: initialContactsVisible = false,
  readOnly = false,
}: {
  weddingId: string
  initialGuests: GuestRecord[]
  initialPagination: Pagination
  groups: string[]
  contactsVisible?: boolean
  readOnly?: boolean
}) {
  const [guests, setGuests] = useState(initialGuests)
  const [contactsVisible, setContactsVisible] = useState(initialContactsVisible)
  const [pagination, setPagination] = useState(initialPagination)
  const [groupOptions, setGroupOptions] = useState(groups)
  const [search, setSearch] = useState("")
  const [group, setGroup] = useState("")
  const [side, setSide] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState("newest")
  const [pageSize, setPageSize] = useState(25)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [upgradeUrl, setUpgradeUrl] = useState("")
  const [notice, setNotice] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importIssues, setImportIssues] = useState<string[]>([])
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importKey, setImportKey] = useState("")
  const [importPreview, setImportPreview] = useState<{ total: number; rows: FormState[] } | null>(null)

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function load(nextPage: number, requestedPageSize = pageSize) {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(requestedPageSize),
        status,
        sort,
      })
      if (search.trim()) params.set("search", search.trim())
      if (group) params.set("group", group)
      if (side) params.set("side", side)
      if (category) params.set("category", category)

      const res = await fetch(`/api/weddings/${weddingId}/guests?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Could not load guests")
        return
      }
      setGuests(data.guests)
      setContactsVisible(data.contactsVisible === true)
      setPagination(data.pagination)
      setGroupOptions((current) => {
        const next = new Set(current)
        for (const guest of data.guests as GuestRecord[]) {
          if (guest.group) next.add(guest.group)
        }
        return [...next].sort()
      })
    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function startCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError("")
    setNotice("")
  }

  function startEdit(guest: GuestRecord) {
    setForm({
      firstName: guest.firstName,
      lastName: guest.lastName ?? "",
      mobile: guest.mobile ?? "",
      email: guest.email ?? "",
      group: guest.group ?? "",
      side: guest.side ?? "",
      category: guest.category ?? "",
      accommodationNeeds: guest.accommodationNeeds ?? "",
      transportNeeds: guest.transportNeeds ?? "",
      notes: guest.notes ?? "",
      dietaryPrefs: guest.dietaryPrefs ?? "",
    })
    setEditingId(guest.id)
    setShowForm(true)
    setError("")
    setNotice("")
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    setUpgradeUrl("")
    try {
      const url = editingId
        ? `/api/weddings/${weddingId}/guests/${editingId}`
        : `/api/weddings/${weddingId}/guests`
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId && !contactsVisible ? { ...form, mobile: undefined, email: undefined } : form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Could not save the guest")
        setUpgradeUrl(typeof data.upgradeUrl === "string" ? data.upgradeUrl : "")
        return
      }
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      setNotice(editingId ? "Guest updated." : "Guest added.")
      await load(editingId ? pagination.page : 1)
    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(guest: GuestRecord) {
    const name = [guest.firstName, guest.lastName].filter(Boolean).join(" ")
    if (!window.confirm(`Delete ${name}? Their RSVP and family members will also be removed.`)) {
      return
    }
    setError("")
    setNotice("")
    try {
      const res = await fetch(`/api/weddings/${weddingId}/guests/${guest.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Could not delete the guest")
        return
      }
      setNotice(`${name} deleted.`)
      await load(pagination.page)
    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    }
  }

  async function importCsv(file: File, preview: boolean, key = importKey) {
    setImporting(true)
    setError("")
    setNotice("")
    setImportIssues([])
    setUpgradeUrl("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch(`/api/weddings/${weddingId}/guests/import${preview ? "?preview=true" : ""}`, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Could not import the CSV file")
        setUpgradeUrl(typeof data.upgradeUrl === "string" ? data.upgradeUrl : "")
        setImportIssues(Array.isArray(data.issues) ? data.issues : [])
        return
      }
      if (preview) {
        setImportFile(file)
        setImportPreview({ total: data.total, rows: data.rows })
      } else {
        setImportFile(null)
        setImportKey("")
        setImportPreview(null)
        setNotice(`Imported ${data.imported} guest${data.imported === 1 ? "" : "s"}.`)
        await load(1)
      }
    } catch {
      setError("Could not import the CSV file. Please try again.")
    } finally {
      setImporting(false)
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    setImportFile(null)
    setImportPreview(null)
    const key = crypto.randomUUID()
    setImportKey(key)
    if (file) await importCsv(file, true, key)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Guests</h2>
          <p className="text-sm text-gray-600">{pagination.total} guest(s) in this wedding</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/weddings/${weddingId}/guests/export`}
            className="rounded-md border border-gray-300 bg-brand-surface px-3 py-2 text-sm font-medium text-gray-700 hover:bg-ivory-100"
          >
            Export CSV
          </a>
          {!readOnly && <label className="cursor-pointer rounded-md border border-gray-300 bg-brand-surface px-3 py-2 text-sm font-medium text-gray-700 hover:bg-ivory-100">
            {importing ? "Importing..." : "Import CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleImport}
              disabled={importing}
              className="sr-only"
            />
          </label>}
          {!readOnly && <button
            type="button"
            onClick={startCreate}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-[#17130b] hover:bg-brand-primary-hover"
          >
            Add guest
          </button>}
        </div>
      </div>

      {readOnly && <p className="rounded-lg bg-champagne-100 p-4 text-sm text-ink-700">This wedding is read-only. You can view the guest list and export permitted data.</p>}
      {!contactsVisible && <p className="text-sm text-gray-600">Phone numbers and email addresses are hidden from the guest list and exports. Change contact visibility in wedding details to show them.</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load(1)
        }}
        className="grid grid-cols-1 gap-3 rounded-lg bg-brand-surface p-4 shadow sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="lg:col-span-2">
          <label htmlFor="guest-search" className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            id="guest-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, mobile or email"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="guest-group" className="block text-sm font-medium text-gray-700">
            Group
          </label>
          <select
            id="guest-group"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className={inputClass}
          >
            <option value="">All groups</option>
            {groupOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="guest-status" className="block text-sm font-medium text-gray-700">
            RSVP status
          </label>
          <select
            id="guest-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            <option value="all">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
            <option value="maybe">Maybe</option>
            <option value="none">No response</option>
          </select>
        </div>
        <div>
          <label htmlFor="guest-side" className="block text-sm font-medium text-gray-700">Side</label>
          <input id="guest-side" value={side} onChange={(event) => setSide(event.target.value)} list="guest-side-options" placeholder="All sides" className={inputClass} />
        </div>
        <div>
          <label htmlFor="guest-category" className="block text-sm font-medium text-gray-700">Category</label>
          <input id="guest-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="All categories" className={inputClass} />
        </div>
        <div>
          <label htmlFor="guest-sort" className="block text-sm font-medium text-gray-700">Sort</label>
          <select id="guest-sort" value={sort} onChange={(event) => setSort(event.target.value)} className={inputClass}>
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name</option>
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-[#17130b] hover:bg-brand-primary-hover"
          >
            Apply filters
          </button>
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => {
              const value = Number(e.target.value)
              setPageSize(value)
              load(1, value)
            }}
            className="rounded-md border border-gray-300 px-2 py-2 text-sm"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          {loading && <span className="text-sm text-gray-500">Loading…</span>}
        </div>
      </form>

      {error && (
        <div role="alert" className="rounded-md bg-rose-100 px-4 py-3 text-sm text-brand-danger">
          <p>{error}</p>
          {upgradeUrl && (
            <p className="mt-2">
              <a href={upgradeUrl} className="font-semibold underline">
                See upgrade options
              </a>
            </p>
          )}
          {importIssues.length > 0 && (
            <ul className="mt-2 list-inside list-disc">
              {importIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-md bg-sage-100 px-4 py-3 text-sm text-brand-success">
          {notice}
        </div>
      )}

      <datalist id="guest-side-options">
        <option value="Bride" /><option value="Groom" /><option value="Both" />
      </datalist>

      {importPreview && importFile && (
        <section className="space-y-4 rounded-lg border border-gray-200 bg-brand-surface p-5">
          <h3 className="font-semibold text-gray-900">Review CSV import</h3>
          <p className="text-sm text-gray-600">{importPreview.total} validated guests. Showing the first {importPreview.rows.length}. Confirm to add them to this wedding.</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr>{["Name", "Mobile", "Group", "Side", "Category"].map((heading) => <th key={heading} className="p-2">{heading}</th>)}</tr></thead>
              <tbody>{importPreview.rows.map((row, index) => <tr key={index} className="border-t border-gray-100">
                <td className="p-2">{row.firstName} {row.lastName}</td><td className="p-2">{row.mobile || "—"}</td>
                <td className="p-2">{row.group || "—"}</td><td className="p-2">{row.side || "—"}</td><td className="p-2">{row.category || "—"}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={importing} onClick={() => importCsv(importFile, false)} className="btn btn-primary">{importing ? "Importing…" : "Confirm import"}</button>
            <button type="button" disabled={importing} onClick={() => { setImportFile(null); setImportPreview(null) }} className="btn btn-secondary">Cancel import</button>
          </div>
        </section>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="space-y-4 rounded-lg bg-brand-surface p-5 shadow">
          <h3 className="font-semibold text-gray-900">{editingId ? "Edit guest" : "New guest"}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="guest-first-name">
              <input
                id="guest-first-name"
                type="text"
                required
                maxLength={120}
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Last name" htmlFor="guest-last-name">
              <input
                id="guest-last-name"
                type="text"
                maxLength={120}
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className={inputClass}
              />
            </Field>
            {(!editingId || contactsVisible) && <Field label="Mobile" htmlFor="guest-mobile">
              <input
                id="guest-mobile"
                type="tel"
                maxLength={20}
                value={form.mobile}
                onChange={(e) => update("mobile", e.target.value)}
                className={inputClass}
                placeholder="10-digit mobile number"
              />
            </Field>}
            {(!editingId || contactsVisible) && <Field label="Email" htmlFor="guest-email">
              <input
                id="guest-email"
                type="email"
                maxLength={254}
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
              />
            </Field>}
            <Field label="Group" htmlFor="guest-form-group">
              <input
                id="guest-form-group"
                type="text"
                maxLength={120}
                value={form.group}
                onChange={(e) => update("group", e.target.value)}
                className={inputClass}
                placeholder="e.g., Bride's family"
              />
            </Field>
            <Field label="Side" htmlFor="guest-form-side">
              <input id="guest-form-side" value={form.side} onChange={(event) => update("side", event.target.value)} list="guest-side-options" maxLength={120} placeholder="Bride, Groom, or a custom side" className={inputClass} />
            </Field>
            <Field label="Category" htmlFor="guest-form-category">
              <input id="guest-form-category" value={form.category} onChange={(event) => update("category", event.target.value)} maxLength={120} placeholder="VIP, relatives, friends, colleagues" className={inputClass} />
            </Field>
            <Field label="Accommodation needs" htmlFor="guest-accommodation">
              <textarea id="guest-accommodation" value={form.accommodationNeeds} onChange={(event) => update("accommodationNeeds", event.target.value)} maxLength={1000} rows={2} className={inputClass} />
            </Field>
            <Field label="Transport needs" htmlFor="guest-transport">
              <textarea id="guest-transport" value={form.transportNeeds} onChange={(event) => update("transportNeeds", event.target.value)} maxLength={1000} rows={2} className={inputClass} />
            </Field>
            <Field label="Dietary preferences" htmlFor="guest-dietary">
              <input
                id="guest-dietary"
                type="text"
                maxLength={1000}
                value={form.dietaryPrefs}
                onChange={(e) => update("dietaryPrefs", e.target.value)}
                className={inputClass}
                placeholder="e.g., Vegetarian, Jain"
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="guest-notes">
            <textarea
              id="guest-notes"
              rows={2}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-[#17130b] hover:bg-brand-primary-hover disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save guest" : "Add guest"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setError("")
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-ivory-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {guests.length === 0 ? (
        <p className="rounded-lg bg-brand-surface p-8 text-center text-gray-500 shadow">
          No guests found. Add a guest or import a CSV file.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-brand-surface shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-ivory-100">
              <tr>
                {["Guest", ...(contactsVisible ? ["Mobile"] : []), "Group", "RSVP", "Party size", "Dietary", ...(readOnly ? [] : [""])].map((heading) => (
                  <th
                    key={heading || "actions"}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {heading || "Actions"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guests.map((guest) => (
                <tr key={guest.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {guest.firstName} {guest.lastName}
                    {guest.email && <div className="text-xs font-normal text-gray-500">{guest.email}</div>}
                  </td>
                  {contactsVisible && <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {guest.mobile ?? "—"}
                  </td>}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {guest.group ?? "—"}
                    {(guest.side || guest.category) && <div className="text-xs text-gray-500">{[guest.side, guest.category].filter(Boolean).join(" · ")}</div>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <StatusBadge status={guest.rsvpSubmission?.status ?? "none"} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {guest.rsvpSubmission
                      ? guest.rsvpSubmission.status === "declined" ? 0 : guest.rsvpSubmission.partySize ?? 1 + guest.rsvpSubmission.familyMembers.length
                      : "—"}
                  </td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-sm text-gray-600">
                    {guest.rsvpSubmission?.dietaryPrefs || guest.dietaryPrefs || "—"}
                  </td>
                  {!readOnly && <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => startEdit(guest)}
                      className="mr-2 rounded-md border border-gray-300 px-2 py-1 text-gray-700 hover:bg-ivory-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(guest)}
                      className="rounded-md border border-rose-300/40 px-2 py-1 text-brand-danger hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <nav aria-label="Guest pagination" className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={pagination.page <= 1 || loading}
            onClick={() => load(pagination.page - 1)}
            className="rounded-md border border-gray-300 bg-brand-surface px-3 py-2 font-medium text-gray-700 hover:bg-ivory-100 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages || loading}
            onClick={() => load(pagination.page + 1)}
            className="rounded-md border border-gray-300 bg-brand-surface px-3 py-2 font-medium text-gray-700 hover:bg-ivory-100 disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}

      <details className="rounded-lg bg-brand-surface p-4 text-sm text-gray-600 shadow">
        <summary className="cursor-pointer font-medium text-gray-900">CSV format</summary>
        <p className="mt-2">
          Header row: <code>firstName,lastName,mobile,email,group,notes,dietaryPrefs,side,category,accommodationNeeds,transportNeeds</code>. Only
          <code> firstName</code> is required. Mobile numbers must be unique within a wedding. The
          import is rejected as a whole if any row is invalid.
        </p>
      </details>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-sage-100 text-brand-success",
    pending: "bg-yellow-100 text-yellow-800",
    maybe: "bg-brand-surface-muted text-brand-info",
    declined: "bg-rose-100 text-brand-danger",
    none: "bg-brand-surface-muted text-gray-700",
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.none}`}>
      {status === "none" ? "No response" : status}
    </span>
  )
}

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 bg-brand-surface px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  )
}
