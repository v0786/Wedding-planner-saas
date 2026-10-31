"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Field, FormError, Input, Textarea } from "@/components/ui/field"

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
  const [upgradeUrl, setUpgradeUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setUpgradeUrl("")

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
        setUpgradeUrl(typeof data.upgradeUrl === "string" ? data.upgradeUrl : "")
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
          Tell us about the celebration. You can refine every detail later from the wedding page.
        </p>
      </div>

      <div className="space-y-6 px-6 py-6 sm:px-8">
        <Field label="Wedding Name" htmlFor="wedding-name">
          <Input
            id="wedding-name"
            type="text"
            required
            maxLength={200}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g., Rahul & Priya Wedding"
          />
        </Field>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="First Person Name" htmlFor="couple-name-1">
            <Input
              id="couple-name-1"
              type="text"
              required
              maxLength={120}
              value={form.coupleName1}
              onChange={(e) => update("coupleName1", e.target.value)}
            />
          </Field>
          <Field label="Second Person Name (optional)" htmlFor="couple-name-2">
            <Input
              id="couple-name-2"
              type="text"
              maxLength={120}
              value={form.coupleName2}
              onChange={(e) => update("coupleName2", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Wedding Date" htmlFor="wedding-date">
            <Input
              id="wedding-date"
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </Field>
          <Field label="RSVP Deadline (optional)" htmlFor="rsvp-deadline">
            <Input
              id="rsvp-deadline"
              type="date"
              value={form.rsvpDeadline}
              onChange={(e) => update("rsvpDeadline", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Venue (optional)" htmlFor="wedding-venue">
          <Input
            id="wedding-venue"
            type="text"
            maxLength={200}
            value={form.venue}
            onChange={(e) => update("venue", e.target.value)}
          />
        </Field>

        <Field label="Address (optional)" htmlFor="wedding-address">
          <Textarea
            id="wedding-address"
            rows={2}
            maxLength={1000}
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </Field>

        <Field label="Invitation Message (optional)" htmlFor="wedding-description">
          <Textarea
            id="wedding-description"
            rows={4}
            maxLength={5000}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="A short welcome message for your guests"
          />
        </Field>

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

        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-ivory-200 pt-6 sm:flex-row sm:items-center sm:justify-end">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Creating..." : "Create Wedding"}
          </Button>
        </div>
      </div>
    </form>
  )
}
