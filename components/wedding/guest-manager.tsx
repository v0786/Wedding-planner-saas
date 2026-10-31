"use client"

import { useState } from "react"

export type GuestRecord = {
  id: string
  firstName: string
  lastName: string | null
  mobile: string | null
  email: string | null
  group: string | null
  notes: string | null
  dietaryPrefs: string | null
  rsvpSubmission: {
    id: string
    status: string
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
  notes: string
  dietaryPrefs: string
}

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  mobile: "",
  email: "",
  group: "",
  notes: "",
  dietaryPrefs: "",
}

export default function GuestManager({
  weddingId,
  initialGuests,
  initialPagination,
  groups,
}: {
  weddingId: string
  initialGuests: GuestRecord[]
  initialPagination: Pagination
  groups: string[]
}) {
  const [guests, setGuests] = useState(initialGuests)
  const [pagination, setPagination] = useState(initialPagination)
  const [groupOptions, setGroupOptions] = useState(groups)
  const [search, setSearch] = useState("")
  const [group, setGroup] = useState("")
  const [status, setStatus] = useState("all")
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

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function load(nextPage: number) {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize),
        status,
      })
      if (search.trim()) params.set("search", search.trim())
      if (group) params.set("group", group)

      const res = await fetch(`/api/weddings/${weddingId}/guests?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Could not load guests")
        return
      }
      setGuests(data.guests)
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
        body: JSON.stringify(form),
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

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setError("")
    setNotice("")
    setImportIssues([])
    setUpgradeUrl("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/weddings/${weddingId}/guests/import`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Could not import the CSV file")
        setUpgradeUrl(typeof data.upgradeUrl === "string" ? data.upgradeUrl : "")
        setImportIssues(Array.isArray(data.issues) ? data.issues : [])
        return
      }
      setNotice(`Imported ${data.imported} guest${data.imported === 1 ? "" : "s"}.`)
      await load(1)
    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    } finally {
      setImporting(false)
      e.target.value = ""
    }
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
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </a>
          <label className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {importing ? "Importing..." : "Import CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleImport}
              disabled={importing}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={startCreate}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add guest
          </button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load(1)
        }}
        className="grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow sm:grid-cols-2 lg:grid-cols-4"
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
            <option value="none">No response</option>
          </select>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Apply filters
          </button>
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => {
              const value = Number(e.target.value)
              setPageSize(value)
              load(1)
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
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
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
        <div role="status" className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          {notice}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="space-y-4 rounded-lg bg-white p-5 shadow">
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
            <Field label="Mobile" htmlFor="guest-mobile">
              <input
                id="guest-mobile"
                type="tel"
                maxLength={20}
                value={form.mobile}
                onChange={(e) => update("mobile", e.target.value)}
                className={inputClass}
                placeholder="10-digit mobile number"
              />
            </Field>
            <Field label="Email" htmlFor="guest-email">
              <input
                id="guest-email"
                type="email"
                maxLength={254}
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
              />
            </Field>
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
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {guests.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No guests found. Add a guest or import a CSV file.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Guest", "Mobile", "Group", "RSVP", "Family", "Dietary", ""].map((heading) => (
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
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {guest.mobile ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {guest.group ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <StatusBadge status={guest.rsvpSubmission?.status ?? "none"} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {guest.rsvpSubmission
                      ? 1 + guest.rsvpSubmission.familyMembers.length
                      : "—"}
                  </td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-sm text-gray-600">
                    {guest.rsvpSubmission?.dietaryPrefs || guest.dietaryPrefs || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => startEdit(guest)}
                      className="mr-2 rounded-md border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(guest)}
                      className="rounded-md border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
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
            className="rounded-md border border-gray-300 bg-white px-3 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
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
            className="rounded-md border border-gray-300 bg-white px-3 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}

      <details className="rounded-lg bg-white p-4 text-sm text-gray-600 shadow">
        <summary className="cursor-pointer font-medium text-gray-900">CSV format</summary>
        <p className="mt-2">
          Header row: <code>firstName,lastName,mobile,email,group,notes,dietaryPrefs</code>. Only
          <code> firstName</code> is required. Mobile numbers must be unique within a wedding. The
          import is rejected as a whole if any row is invalid.
        </p>
      </details>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    declined: "bg-red-100 text-red-800",
    none: "bg-gray-100 text-gray-700",
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.none}`}>
      {status === "none" ? "No response" : status}
    </span>
  )
}

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"

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
