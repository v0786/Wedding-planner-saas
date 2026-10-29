"use client"

import { useState } from "react"

export type EventRecord = {
  id: string
  name: string
  date: string | null
  time: string | null
  venue: string | null
  address: string | null
  description: string | null
  order: number
  rsvpDeadline: string | null
}

type FormState = {
  name: string
  date: string
  time: string
  venue: string
  address: string
  description: string
  order: string
  rsvpDeadline: string
}

const emptyForm: FormState = {
  name: "",
  date: "",
  time: "",
  venue: "",
  address: "",
  description: "",
  order: "0",
  rsvpDeadline: "",
}

function toDateInput(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}

export default function EventManager({
  weddingId,
  initialEvents,
}: {
  weddingId: string
  initialEvents: EventRecord[]
}) {
  const [events, setEvents] = useState(initialEvents)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function startCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError("")
  }

  function startEdit(event: EventRecord) {
    setForm({
      name: event.name,
      date: toDateInput(event.date),
      time: event.time ?? "",
      venue: event.venue ?? "",
      address: event.address ?? "",
      description: event.description ?? "",
      order: String(event.order),
      rsvpDeadline: toDateInput(event.rsvpDeadline),
    })
    setEditingId(event.id)
    setShowForm(true)
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const url = editingId
        ? `/api/weddings/${weddingId}/events/${editingId}`
        : `/api/weddings/${weddingId}/events`
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong")
        return
      }

      const saved: EventRecord = data.event
      setEvents((current) => {
        const next = editingId
          ? current.map((event) => (event.id === saved.id ? saved : event))
          : [...current, saved]
        return next.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      })
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(event: EventRecord) {
    if (!window.confirm(`Delete "${event.name}"? Existing RSVP responses for this event will also be removed.`)) {
      return
    }
    setError("")
    try {
      const res = await fetch(`/api/weddings/${weddingId}/events/${event.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Could not delete the event")
        return
      }
      setEvents((current) => current.filter((item) => item.id !== event.id))
    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Events</h2>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add event
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-5 shadow">
          <h3 className="font-semibold text-gray-900">{editingId ? "Edit event" : "New event"}</h3>

          <Field label="Event name" htmlFor="event-name">
            <input
              id="event-name"
              type="text"
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputClass}
              placeholder="e.g., Haldi, Mehendi, Wedding, Reception"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="event-date">
              <input
                id="event-date"
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Time" htmlFor="event-time">
              <input
                id="event-time"
                type="text"
                maxLength={20}
                value={form.time}
                onChange={(e) => update("time", e.target.value)}
                className={inputClass}
                placeholder="e.g., 6:00 PM"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Venue" htmlFor="event-venue">
              <input
                id="event-venue"
                type="text"
                maxLength={200}
                value={form.venue}
                onChange={(e) => update("venue", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Display order" htmlFor="event-order">
              <input
                id="event-order"
                type="number"
                min={0}
                max={10000}
                value={form.order}
                onChange={(e) => update("order", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Address" htmlFor="event-address">
            <textarea
              id="event-address"
              rows={2}
              maxLength={1000}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Description" htmlFor="event-description">
            <textarea
              id="event-description"
              rows={2}
              maxLength={2000}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="RSVP deadline for this event (optional)" htmlFor="event-deadline">
            <input
              id="event-deadline"
              type="date"
              value={form.rsvpDeadline}
              onChange={(e) => update("rsvpDeadline", e.target.value)}
              className={inputClass}
            />
          </Field>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : editingId ? "Save event" : "Create event"}
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

      {events.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No events yet. Add Haldi, Mehendi, the wedding ceremony, and reception to build the schedule.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg bg-white shadow">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <h3 className="font-medium text-gray-900">{event.name}</h3>
                <p className="text-sm text-gray-600">
                  {event.date
                    ? new Date(event.date).toLocaleDateString("en-IN", { dateStyle: "medium" })
                    : "Date not set"}
                  {event.time && ` · ${event.time}`}
                  {event.venue && ` · ${event.venue}`}
                </p>
                {event.rsvpDeadline && (
                  <p className="text-xs text-gray-500">
                    RSVP by {new Date(event.rsvpDeadline).toLocaleDateString("en-IN")}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(event)}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(event)}
                  className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
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
