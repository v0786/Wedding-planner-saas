"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export type PublicEvent = {
  id: string
  name: string
  date: string | null
  time: string | null
  venue: string | null
  rsvpDeadline: string | null
}

export type PublicQuestion = {
  id: string
  question: string
  type: string
  options: unknown
  required: boolean
}

export type PublicWedding = {
  name: string
  coupleName1: string
  coupleName2: string | null
  date: string | null
  venue: string | null
  events: PublicEvent[]
  customQuestions: PublicQuestion[]
}

type FamilyMemberInput = {
  fullName: string
  relation: string
  age: string
  dietaryPrefs: string
}

export type RsvpInitial = {
  fullName: string
  mobile: string
  dietaryPrefs: string
  familyMembers: FamilyMemberInput[]
  eventResponses: Record<string, string>
  answers: Record<string, string>
}

const emptyInitial: RsvpInitial = {
  fullName: "",
  mobile: "",
  dietaryPrefs: "",
  familyMembers: [],
  eventResponses: {},
  answers: {},
}

function optionsFor(question: PublicQuestion): string[] {
  if (!Array.isArray(question.options)) return []
  return question.options.filter((value): value is string => typeof value === "string")
}

export default function RsvpForm({
  wedding,
  token,
  initial,
  editToken,
}: {
  wedding: PublicWedding
  token: string
  initial?: RsvpInitial
  editToken?: string
}) {
  const starting = initial ?? emptyInitial
  const [fullName, setFullName] = useState(starting.fullName)
  const [mobile, setMobile] = useState(starting.mobile)
  const [dietaryPrefs, setDietaryPrefs] = useState(starting.dietaryPrefs)
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberInput[]>(starting.familyMembers)
  const [eventResponses, setEventResponses] = useState<Record<string, string>>(() => {
    const responses: Record<string, string> = {}
    for (const event of wedding.events) responses[event.id] = starting.eventResponses[event.id] ?? "pending"
    return responses
  })
  const [answers, setAnswers] = useState<Record<string, string>>(starting.answers)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function addFamilyMember() {
    setFamilyMembers((current) => [
      ...current,
      { fullName: "", relation: "", age: "", dietaryPrefs: "" },
    ])
  }

  function updateFamilyMember(index: number, field: keyof FamilyMemberInput, value: string) {
    setFamilyMembers((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member,
      ),
    )
  }

  function removeFamilyMember(index: number) {
    setFamilyMembers((current) => current.filter((_, memberIndex) => memberIndex !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          fullName,
          mobile,
          status,
          dietaryPrefs,
          familyMembers: familyMembers.filter((member) => member.fullName.trim()),
          eventResponses,
          answers: Object.entries(answers)
            .filter(([, value]) => value.trim().length > 0)
            .map(([questionId, value]) => ({ questionId, value })),
          editToken,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        router.push(
          `/rsvp/thank-you?invite=${encodeURIComponent(token)}&edit=${encodeURIComponent(data.editToken)}`,
        )
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
      {editToken && (
        <p className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
          You are editing an existing RSVP. Saving replaces your previous response.
        </p>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Your details</h2>
        <div className="space-y-4">
          <Field label="Full name" htmlFor="rsvp-name" required>
            <input
              id="rsvp-name"
              type="text"
              required
              maxLength={200}
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Mobile number" htmlFor="rsvp-mobile" required>
            <input
              id="rsvp-mobile"
              type="tel"
              required
              maxLength={20}
              autoComplete="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className={inputClass}
              placeholder="10-digit mobile number"
            />
          </Field>
          <Field label="Dietary preferences (optional)" htmlFor="rsvp-dietary">
            <input
              id="rsvp-dietary"
              type="text"
              maxLength={1000}
              value={dietaryPrefs}
              onChange={(e) => setDietaryPrefs(e.target.value)}
              className={inputClass}
              placeholder="e.g., Vegetarian, Jain, no nuts"
            />
          </Field>
        </div>
      </section>

      {wedding.events.length > 0 && (
        <section>
          <h2 className="mb-1 text-xl font-semibold text-gray-900">Which events will you attend?</h2>
          <p className="mb-4 text-sm text-gray-600">Let the hosts know for each event.</p>
          <div className="space-y-3">
            {wedding.events.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{event.name}</p>
                  <p className="text-sm text-gray-600">
                    {event.date
                      ? new Date(event.date).toLocaleDateString("en-IN", { dateStyle: "medium" })
                      : "Date not set"}
                    {event.time && ` · ${event.time}`}
                    {event.venue && ` · ${event.venue}`}
                  </p>
                </div>
                <label className="text-sm">
                  <span className="sr-only">Attendance for {event.name}</span>
                  <select
                    value={eventResponses[event.id] ?? "pending"}
                    onChange={(e) =>
                      setEventResponses((current) => ({ ...current, [event.id]: e.target.value }))
                    }
                    className="rounded-md border border-gray-300 px-2 py-1"
                  >
                    <option value="pending">Not sure</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Family members</h2>
            <p className="text-sm text-gray-600">Add everyone attending with you.</p>
          </div>
          <button
            type="button"
            onClick={addFamilyMember}
            className="rounded-md border border-pink-200 px-3 py-1.5 text-sm font-medium text-pink-700 hover:bg-pink-50"
          >
            + Add family member
          </button>
        </div>

        {familyMembers.length === 0 ? (
          <p className="text-sm text-gray-500">No family members added.</p>
        ) : (
          <div className="space-y-3">
            {familyMembers.map((member, index) => (
              <div key={index} className="rounded-lg border p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={`Name ${index + 1}`} htmlFor={`family-name-${index}`} required>
                    <input
                      id={`family-name-${index}`}
                      type="text"
                      maxLength={120}
                      value={member.fullName}
                      onChange={(e) => updateFamilyMember(index, "fullName", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Relation" htmlFor={`family-relation-${index}`}>
                    <input
                      id={`family-relation-${index}`}
                      type="text"
                      maxLength={100}
                      value={member.relation}
                      onChange={(e) => updateFamilyMember(index, "relation", e.target.value)}
                      className={inputClass}
                      placeholder="e.g., Spouse, Child"
                    />
                  </Field>
                  <Field label="Age (optional)" htmlFor={`family-age-${index}`}>
                    <input
                      id={`family-age-${index}`}
                      type="number"
                      min={0}
                      max={120}
                      value={member.age}
                      onChange={(e) => updateFamilyMember(index, "age", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Dietary preferences (optional)" htmlFor={`family-diet-${index}`}>
                    <input
                      id={`family-diet-${index}`}
                      type="text"
                      maxLength={500}
                      value={member.dietaryPrefs}
                      onChange={(e) => updateFamilyMember(index, "dietaryPrefs", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => removeFamilyMember(index)}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {wedding.customQuestions.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">A few questions</h2>
          <div className="space-y-4">
            {wedding.customQuestions.map((question) => {
              const questionOptions = optionsFor(question)
              return (
                <Field
                  key={question.id}
                  label={question.question}
                  htmlFor={`question-${question.id}`}
                  required={question.required}
                >
                  {question.type === "textarea" ? (
                    <textarea
                      id={`question-${question.id}`}
                      rows={3}
                      required={question.required}
                      maxLength={2000}
                      value={answers[question.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((current) => ({ ...current, [question.id]: e.target.value }))
                      }
                      className={inputClass}
                    />
                  ) : question.type === "select" || question.type === "checkbox" ? (
                    <select
                      id={`question-${question.id}`}
                      required={question.required}
                      value={answers[question.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((current) => ({ ...current, [question.id]: e.target.value }))
                      }
                      className={inputClass}
                    >
                      <option value="">Select an option</option>
                      {(questionOptions.length > 0 ? questionOptions : ["Yes", "No"]).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`question-${question.id}`}
                      type="text"
                      required={question.required}
                      maxLength={2000}
                      value={answers[question.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((current) => ({ ...current, [question.id]: e.target.value }))
                      }
                      className={inputClass}
                    />
                  )}
                </Field>
              )
            })}
          </div>
        </section>
      )}

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-pink-600 px-4 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
      >
        {loading ? "Submitting..." : editToken ? "Save my RSVP" : "Submit RSVP"}
      </button>
    </form>
  )
}

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
    </div>
  )
}
