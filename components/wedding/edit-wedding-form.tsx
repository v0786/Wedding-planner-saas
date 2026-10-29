"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Wedding = {
  id: string
  name: string
  coupleName1: string
  coupleName2: string | null
  date: string | null
  venue: string | null
  address: string | null
  description: string | null
  rsvpDeadline: string | null
}

type FormState = {
  name: string
  coupleName1: string
  coupleName2: string
  date: string
  venue: string
  address: string
  description: string
  rsvpDeadline: string
}

function dateInput(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}

export default function EditWeddingForm({ wedding }: { wedding: Wedding }) {
  const [form, setForm] = useState<FormState>({
    name: wedding.name,
    coupleName1: wedding.coupleName1,
    coupleName2: wedding.coupleName2 ?? "",
    date: dateInput(wedding.date),
    venue: wedding.venue ?? "",
    address: wedding.address ?? "",
    description: wedding.description ?? "",
    rsvpDeadline: dateInput(wedding.rsvpDeadline),
  })
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSaved(false)

    try {
      const res = await fetch(`/api/weddings/${wedding.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setSaved(true)
        router.refresh()
      } else {
        setError(data.error || "Something went wrong")
      }
    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
      <Field label="Wedding Name" htmlFor="edit-name">
        <input
          id="edit-name"
          type="text"
          required
          maxLength={200}
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="First Person Name" htmlFor="edit-couple-1">
          <input
            id="edit-couple-1"
            type="text"
            required
            maxLength={120}
            value={form.coupleName1}
            onChange={(e) => update("coupleName1", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Second Person Name (optional)" htmlFor="edit-couple-2">
          <input
            id="edit-couple-2"
            type="text"
            maxLength={120}
            value={form.coupleName2}
            onChange={(e) => update("coupleName2", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Wedding Date" htmlFor="edit-date">
          <input
            id="edit-date"
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="RSVP Deadline (optional)" htmlFor="edit-deadline">
          <input
            id="edit-deadline"
            type="date"
            value={form.rsvpDeadline}
            onChange={(e) => update("rsvpDeadline", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Venue (optional)" htmlFor="edit-venue">
        <input
          id="edit-venue"
          type="text"
          maxLength={200}
          value={form.venue}
          onChange={(e) => update("venue", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Address (optional)" htmlFor="edit-address">
        <textarea
          id="edit-address"
          rows={2}
          maxLength={1000}
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Invitation Message (optional)" htmlFor="edit-description">
        <textarea
          id="edit-description"
          rows={4}
          maxLength={5000}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className={inputClass}
        />
      </Field>

      {error && (
        <div role="alert" className="text-sm text-red-600">
          {error}
        </div>
      )}
      {saved && (
        <div role="status" className="text-sm text-green-700">
          Wedding details saved.
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save changes"}
      </button>
    </form>
  )
}

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"

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
