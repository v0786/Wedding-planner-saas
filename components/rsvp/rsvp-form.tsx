"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function RsvpForm({ wedding, token }: any) {
  const [fullName, setFullName] = useState("")
  const [mobile, setMobile] = useState("")
  const [familyMembers, setFamilyMembers] = useState<any[]>([])
  const [eventResponses, setEventResponses] = useState<any>({})
  
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function addFamilyMember() {
    setFamilyMembers([...familyMembers, { fullName: "", relation: "" }])
  }

  function updateFamilyMember(index: number, field: string, value: string) {
    const updated = [...familyMembers]
    updated[index][field] = value
    setFamilyMembers(updated)
  }

  function removeFamilyMember(index: number) {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index))
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
          familyMembers: familyMembers.filter(m => m.fullName),
          eventResponses,
        }),
      })

      if (res.ok) {
        router.push(`/rsvp/thank-you?token=${token}`)
      } else {
        const data = await res.json()
        setError(data.error || "Something went wrong")
      }
    } catch (error) {
        console.error(error)
        setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mobile Number *</label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500"
              placeholder="10-digit mobile number"
            />
          </div>
        </div>
      </div>

      {wedding.events.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Which events will you attend?</h2>
          <div className="space-y-3">
            {wedding.events.map((event: any) => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{event.name}</p>
                  {event.date && <p className="text-sm text-gray-600">{new Date(event.date).toLocaleDateString('en-IN')}</p>}
                </div>
                <select
                  value={eventResponses[event.id] || "pending"}
                  onChange={(e) => setEventResponses({...eventResponses, [event.id]: e.target.value})}
                  className="border border-gray-300 rounded-md py-1 px-2"
                >
                  <option value="pending">Not sure</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Family Members</h2>
          <button
            type="button"
            onClick={addFamilyMember}
            className="text-pink-600 hover:text-pink-700 text-sm font-medium"
          >
            + Add Family Member
          </button>
        </div>
        <div className="space-y-3">
          {familyMembers.map((member, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                placeholder="Name"
                value={member.fullName}
                onChange={(e) => updateFamilyMember(index, "fullName", e.target.value)}
                className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3"
              />
              <input
                type="text"
                placeholder="Relation"
                value={member.relation}
                onChange={(e) => updateFamilyMember(index, "relation", e.target.value)}
                className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3"
              />
              <button
                type="button"
                onClick={() => removeFamilyMember(index)}
                className="text-red-600 hover:text-red-700 px-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-pink-600 text-white py-3 px-4 rounded-md hover:bg-pink-700 disabled:opacity-50 font-semibold"
      >
        {loading ? "Submitting..." : "Submit RSVP"}
      </button>
    </form>
  )
}
