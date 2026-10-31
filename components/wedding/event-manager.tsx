"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/ui/empty-state"
import { Field, FormError, Input, Textarea } from "@/components/ui/field"

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
  const [upgradeUrl, setUpgradeUrl] = useState("")
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
    setUpgradeUrl("")

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
        <h2 className="font-display text-xl text-ink-800">Events</h2>
        <Button type="button" variant="primary" onClick={startCreate}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add event
        </Button>
      </div>

      {error && (
        <FormError>
          <>
            {error}
            {upgradeUrl && (
              <span className="mt-1 block">
                <a href={upgradeUrl} className="font-semibold underline">
                  See upgrade options
                </a>
              </span>
            )}
          </>
        </FormError>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card overflow-hidden">
          <div className="paper-texture border-b border-ivory-200 bg-champagne-100/50 px-6 py-5">
            <p className="eyebrow">{editingId ? "Edit event" : "New event"}</p>
          </div>

          <div className="space-y-5 px-6 py-6">
            <Field label="Event name" htmlFor="event-name">
              <Input
                id="event-name"
                type="text"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g., Haldi, Mehendi, Wedding, Reception"
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Date" htmlFor="event-date">
                <Input
                  id="event-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                />
              </Field>
              <Field label="Time" htmlFor="event-time">
                <Input
                  id="event-time"
                  type="text"
                  maxLength={20}
                  value={form.time}
                  onChange={(e) => update("time", e.target.value)}
                  placeholder="e.g., 6:00 PM"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Venue" htmlFor="event-venue">
                <Input
                  id="event-venue"
                  type="text"
                  maxLength={200}
                  value={form.venue}
                  onChange={(e) => update("venue", e.target.value)}
                />
              </Field>
              <Field label="Display order" htmlFor="event-order">
                <Input
                  id="event-order"
                  type="number"
                  min={0}
                  max={10000}
                  value={form.order}
                  onChange={(e) => update("order", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Address" htmlFor="event-address">
              <Textarea
                id="event-address"
                rows={2}
                maxLength={1000}
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </Field>

            <Field label="Description" htmlFor="event-description">
              <Textarea
                id="event-description"
                rows={2}
                maxLength={2000}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </Field>

            <Field label="RSVP deadline for this event (optional)" htmlFor="event-deadline">
              <Input
                id="event-deadline"
                type="date"
                value={form.rsvpDeadline}
                onChange={(e) => update("rsvpDeadline", e.target.value)}
              />
            </Field>

            <div className="flex flex-col-reverse gap-3 border-t border-ivory-200 pt-5 sm:flex-row sm:justify-end">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Saving..." : editingId ? "Save event" : "Create event"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                  setError("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {events.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          title="No events yet"
          description="No events yet. Add Haldi, Mehendi, the wedding ceremony, and reception to build the schedule."
        />
      ) : (
        <ul className="stagger divide-y divide-ivory-200 overflow-hidden rounded-2xl border border-ivory-300/70 bg-white/85 shadow-soft">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <h3 className="font-display text-lg text-ink-800">{event.name}</h3>
                <p className="mt-0.5 text-sm text-ink-500">
                  {event.date
                    ? new Date(event.date).toLocaleDateString("en-IN", { dateStyle: "medium" })
                    : "Date not set"}
                  {event.time && ` · ${event.time}`}
                  {event.venue && ` · ${event.venue}`}
                </p>
                {event.rsvpDeadline && (
                  <p className="mt-1 text-xs text-ink-400">
                    RSVP by {new Date(event.rsvpDeadline).toLocaleDateString("en-IN")}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(event)}>
                  Edit
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(event)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
