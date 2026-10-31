"use client"

import { useState } from "react"

export type QuestionRecord = {
  id: string
  question: string
  type: string
  options: unknown
  required: boolean
  order: number
  enabled: boolean
}

type FormState = {
  question: string
  type: string
  options: string
  required: boolean
  order: string
  enabled: boolean
}

const emptyForm: FormState = {
  question: "",
  type: "text",
  options: "",
  required: false,
  order: "0",
  enabled: true,
}

function optionsArray(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function optionsToText(value: unknown): string {
  if (!Array.isArray(value)) return ""
  return value.filter((item): item is string => typeof item === "string").join(", ")
}

export default function QuestionManager({
  weddingId,
  initialQuestions,
}: {
  weddingId: string
  initialQuestions: QuestionRecord[]
}) {
  const [questions, setQuestions] = useState(initialQuestions)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState("")
  const [upgradeUrl, setUpgradeUrl] = useState("")
  const [loading, setLoading] = useState(false)

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function startCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError("")
  }

  function startEdit(question: QuestionRecord) {
    setForm({
      question: question.question,
      type: question.type,
      options: optionsToText(question.options),
      required: question.required,
      order: String(question.order),
      enabled: question.enabled,
    })
    setEditingId(question.id)
    setShowForm(true)
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setUpgradeUrl("")

    const payload = {
      question: form.question,
      type: form.type,
      options: form.type === "select" || form.type === "checkbox" ? optionsArray(form.options) : undefined,
      required: form.required,
      order: Number(form.order),
      enabled: form.enabled,
    }

    try {
      const url = editingId
        ? `/api/weddings/${weddingId}/questions/${editingId}`
        : `/api/weddings/${weddingId}/questions`
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Could not save the question")
        setUpgradeUrl(typeof data.upgradeUrl === "string" ? data.upgradeUrl : "")
        return
      }

      const saved: QuestionRecord = data.question
      setQuestions((current) => {
        const next = editingId
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved]
        return next.sort((a, b) => a.order - b.order || a.question.localeCompare(b.question))
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

  async function handleDelete(question: QuestionRecord) {
    if (!window.confirm(`Delete question "${question.question}"? Existing answers will also be removed.`)) {
      return
    }
    setError("")
    try {
      const res = await fetch(`/api/weddings/${weddingId}/questions/${question.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Could not delete the question")
        return
      }
      setQuestions((current) => current.filter((item) => item.id !== question.id))
    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Custom RSVP questions</h2>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add question
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          {upgradeUrl && (
            <p className="mt-2">
              <a href={upgradeUrl} className="font-semibold underline">See upgrade options</a>
            </p>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-5 shadow">
          <h3 className="font-semibold text-gray-900">{editingId ? "Edit question" : "New question"}</h3>

          <Field label="Question" htmlFor="question-text">
            <input
              id="question-text"
              type="text"
              required
              maxLength={300}
              value={form.question}
              onChange={(e) => update("question", e.target.value)}
              className={inputClass}
              placeholder="e.g., Meal preference"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="question-type">
              <select
                id="question-type"
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className={inputClass}
              >
                <option value="text">Short text</option>
                <option value="textarea">Long text</option>
                <option value="select">Single choice</option>
                <option value="checkbox">Choice (yes/no)</option>
              </select>
            </Field>
            <Field label="Display order" htmlFor="question-order">
              <input
                id="question-order"
                type="number"
                min={0}
                max={10000}
                value={form.order}
                onChange={(e) => update("order", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          {(form.type === "select" || form.type === "checkbox") && (
            <Field label="Options (comma separated)" htmlFor="question-options">
              <input
                id="question-options"
                type="text"
                value={form.options}
                onChange={(e) => update("options", e.target.value)}
                className={inputClass}
                placeholder="Vegetarian, Non-vegetarian, Jain"
              />
            </Field>
          )}

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.required}
                onChange={(e) => update("required", e.target.checked)}
                className="rounded border-gray-300"
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => update("enabled", e.target.checked)}
                className="rounded border-gray-300"
              />
              Enabled on RSVP form
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : editingId ? "Save question" : "Create question"}
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

      {questions.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No custom questions yet. Add meal preference, accessibility needs, or any other question.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg bg-white shadow">
          {questions.map((question) => (
            <li key={question.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <h3 className="font-medium text-gray-900">{question.question}</h3>
                <p className="text-sm text-gray-600">
                  Type: {question.type}
                  {Array.isArray(question.options) && question.options.length > 0
                    ? ` · Options: ${(question.options as string[]).join(", ")}`
                    : ""}
                </p>
                <p className="text-xs text-gray-500">
                  {question.required ? "Required" : "Optional"} · {question.enabled ? "Enabled" : "Disabled"} ·
                  Order {question.order}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(question)}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(question)}
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
