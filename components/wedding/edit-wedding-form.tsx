"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Field, FormError, FormSuccess, Input, Textarea } from "@/components/ui/field"

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
    <form onSubmit={handleSubmit} className="card overflow-hidden">
      <div className="paper-texture border-b border-ivory-200 bg-champagne-100/50 px-6 py-5 sm:px-8">
        <p className="eyebrow">Wedding details</p>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-500">
          Save your changes and the invitation, guest list and reports update straight away.
        </p>
      </div>

      <div className="space-y-6 px-6 py-6 sm:px-8">
        <Field label="Wedding Name" htmlFor="edit-name">
          <Input
            id="edit-name"
            type="text"
            required
            maxLength={200}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="First Person Name" htmlFor="edit-couple-1">
            <Input
              id="edit-couple-1"
              type="text"
              required
              maxLength={120}
              value={form.coupleName1}
              onChange={(e) => update("coupleName1", e.target.value)}
            />
          </Field>
          <Field label="Second Person Name (optional)" htmlFor="edit-couple-2">
            <Input
              id="edit-couple-2"
              type="text"
              maxLength={120}
              value={form.coupleName2}
              onChange={(e) => update("coupleName2", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Wedding Date" htmlFor="edit-date">
            <Input
              id="edit-date"
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </Field>
          <Field label="RSVP Deadline (optional)" htmlFor="edit-deadline">
            <Input
              id="edit-deadline"
              type="date"
              value={form.rsvpDeadline}
              onChange={(e) => update("rsvpDeadline", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Venue (optional)" htmlFor="edit-venue">
          <Input
            id="edit-venue"
            type="text"
            maxLength={200}
            value={form.venue}
            onChange={(e) => update("venue", e.target.value)}
          />
        </Field>

        <Field label="Address (optional)" htmlFor="edit-address">
          <Textarea
            id="edit-address"
            rows={2}
            maxLength={1000}
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </Field>

        <Field label="Invitation Message (optional)" htmlFor="edit-description">
          <Textarea
            id="edit-description"
            rows={4}
            maxLength={5000}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>

        {error && <FormError>{error}</FormError>}
        {saved && <FormSuccess>Wedding details saved.</FormSuccess>}

        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-ivory-200 pt-6 sm:flex-row sm:items-center sm:justify-end">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  )
}
