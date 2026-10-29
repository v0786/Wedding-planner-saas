"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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

const emptyForm: FormState = {
  name: "",
  coupleName1: "",
  coupleName2: "",
  date: "",
  venue: "",
  address: "",
  description: "",
  rsvpDeadline: "",
}

export default function NewWeddingForm() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/weddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (res.ok) {
        router.push(`/dashboard/weddings/${data.wedding.id}`)
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
      <Field label="Wedding Name" htmlFor="wedding-name">
        <input
          id="wedding-name"
          type="text"
          required
          maxLength={200}
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className={inputClass}
          placeholder="e.g., Rahul & Priya Wedding"
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="First Person Name" htmlFor="couple-name-1">
          <input
            id="couple-name-1"
            type="text"
            required
            maxLength={120}
            value={form.coupleName1}
            onChange={(e) => update("coupleName1", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Second Person Name (optional)" htmlFor="couple-name-2">
          <input
            id="couple-name-2"
            type="text"
            maxLength={120}
            value={form.coupleName2}
            onChange={(e) => update("coupleName2", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Wedding Date" htmlFor="wedding-date">
          <input
            id="wedding-date"
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="RSVP Deadline (optional)" htmlFor="rsvp-deadline">
          <input
            id="rsvp-deadline"
            type="date"
            value={form.rsvpDeadline}
            onChange={(e) => update("rsvpDeadline", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Venue (optional)" htmlFor="wedding-venue">
        <input
          id="wedding-venue"
          type="text"
          maxLength={200}
          value={form.venue}
          onChange={(e) => update("venue", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Address (optional)" htmlFor="wedding-address">
        <textarea
          id="wedding-address"
          rows={2}
          maxLength={1000}
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Invitation Message (optional)" htmlFor="wedding-description">
        <textarea
          id="wedding-description"
          rows={4}
          maxLength={5000}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className={inputClass}
          placeholder="A short welcome message for your guests"
        />
      </Field>

      {error && (
        <div role="alert" className="text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Wedding"}
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
