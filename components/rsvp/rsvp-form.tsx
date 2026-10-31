"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export type PublicEvent = {
  id: string
  name: string
  date: string | null
  time: string | null
  venue: string | null
  rsvpDeadline: string | null
  description?: string | null
  imageUrl?: string | null
}

export type PublicQuestion = {
  id: string
  question: string
  type: string
  options: unknown
  required: boolean
  order: number
}

export type PublicWedding = {
  id: string
  name: string
  coupleName1: string
  coupleName2: string | null
  date: string | null
  venue: string | null
  address?: string | null
  description?: string | null
  coverImageUrl?: string | null
  themeColor?: string | null
  couplePhotoUrl?: string | null
  events: PublicEvent[]
  customQuestions: PublicQuestion[]
  whatsappMessage?: string | null
}

type FamilyMemberInput = {
  id: string
  fullName: string
  relation: string
  age: string
  dietaryPrefs: string
}

export type RsvpInitial = {
  fullName: string
  mobile: string
  email?: string
  dietaryPrefs: string
  familyMembers: FamilyMemberInput[]
  eventResponses: Record<string, string>
  answers: Record<string, string>
}

const emptyInitial: RsvpInitial = {
  fullName: "",
  mobile: "",
  email: "",
  dietaryPrefs: "",
  familyMembers: [],
  eventResponses: {},
  answers: {},
}

function optionsFor(question: PublicQuestion): string[] {
  if (!Array.isArray(question.options)) return []
  return question.options.filter((value): value is string => typeof value === "string")
}

function generateWhatsAppMessage(wedding: PublicWedding, rsvpUrl: string): string {
  const coupleNames = wedding.coupleName2
    ? `${wedding.coupleName1} & ${wedding.coupleName2}`
    : wedding.coupleName1

  return (
    wedding.whatsappMessage ||
    `You're invited to ${wedding.name}! 🎉\n\n${coupleNames} are getting married!\n\n📅 ${
      wedding.date ? formatDate(wedding.date) : "Date TBA"
    }\n📍 ${wedding.venue || "Venue TBA"}\n\nPlease RSVP here: ${rsvpUrl}\n\nWe can't wait to celebrate with you! ❤️`
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBA"
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    })
  } catch {
    return "TBA"
  }
}

export default function RsvpForm({
  wedding,
  token,
  initial,
  editToken,
  rsvpUrl,
}: {
  wedding: PublicWedding
  token: string
  initial?: RsvpInitial
  editToken?: string
  rsvpUrl: string
}) {
  const starting = initial ?? emptyInitial
  const [fullName, setFullName] = useState(starting.fullName)
  const [mobile, setMobile] = useState(starting.mobile)
  const [email, setEmail] = useState(starting.email || "")
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
  const [activeSection, setActiveSection] = useState(0)
  const router = useRouter()


  function addFamilyMember() {
    setFamilyMembers((current) => [
      ...current,
      { id: crypto.randomUUID(), fullName: "", relation: "", age: "", dietaryPrefs: "" },
    ])
  }

  function updateFamilyMember(id: string, field: keyof FamilyMemberInput, value: string) {
    setFamilyMembers((current) =>
      current.map((member) =>
        member.id === id ? { ...member, [field]: value } : member,
      ),
    )
  }

  function removeFamilyMember(id: string) {
    setFamilyMembers((current) => current.filter((member) => member.id !== id))
  }

  const shareOnWhatsApp = () => {
    const message = generateWhatsAppMessage(wedding, rsvpUrl)
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
  }

  const shareViaNative = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${wedding.name} - Wedding Invitation`,
          text: `You're invited to ${wedding.name}!`,
          url: rsvpUrl,
        })
      } else {
        await navigator.clipboard.writeText(rsvpUrl)
        toast.success("Link copied to clipboard!")
      }
    } catch (err) {
      console.error("Share failed:", err)
      toast.error("Could not share. Try copying the link manually.")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Validation
    if (!fullName.trim()) {
      setError("Please enter your full name")
      setLoading(false)
      return
    }
    if (!mobile.trim()) {
      setError("Please enter your mobile number")
      setLoading(false)
      return
    }
    if (!/^\+?[\d\s\-\(\)]{10,}$/.test(mobile)) {
      setError("Please enter a valid mobile number")
      setLoading(false)
      return
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          fullName: fullName.trim(),
          mobile: mobile.trim(),
          email: email.trim() || undefined,
          dietaryPrefs: dietaryPrefs.trim() || undefined,
          familyMembers: familyMembers.filter((m) => m.fullName.trim()).map(m => ({
            fullName: m.fullName,
            relation: m.relation,
            age: m.age || undefined,
            dietaryPrefs: m.dietaryPrefs || undefined,
          })),
          eventResponses,
          answers: Object.entries(answers)
            .filter(([, value]) => value.trim().length > 0)
            .map(([questionId, value]) => ({ questionId, value })),
          editToken,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(editToken ? "RSVP updated successfully!" : "RSVP submitted successfully!")
        router.push(
          `/rsvp/thank-you?invite=${encodeURIComponent(token)}&edit=${encodeURIComponent(data.editToken)}`,
        )
      } else {
        setError(data.error || "Something went wrong")
      }
    } catch (err) {
      console.error(err)
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const sections = [
    { id: 0, title: "Your Details", icon: "👤" },
    ...(wedding.events.length > 0 ? [{ id: 1, title: "Events", icon: "📅" }] : []),
    { id: wedding.events.length > 0 ? 2 : 1, title: "Family", icon: "👨‍👩‍👧‍👦" },
    ...(wedding.customQuestions.length > 0 ? [{ id: wedding.events.length > 0 ? 3 : 2, title: "Questions", icon: "❓" }] : []),
  ]

  const progress = ((activeSection + 1) / sections.length) * 100

  return (
    <div className="min-h-screen bg-ivory-50">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-ivory-200/60 z-50">
        <div 
          className="h-full bg-brand-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <header className="relative pt-4 pb-6 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="font-display text-base text-ink-800">{wedding.name}</span>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-sheen text-sm font-semibold text-white shadow-glow">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9v2a1 1 0 100 2h2a1 1 0 100-2H9V7a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={shareViaNative}
                className="btn btn-ghost btn-sm"
                aria-label="Share"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.614l6.632-3.316m0 0a3 3 0 115.367-2.684 3 3 0 01-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </button>
              <button
                onClick={shareOnWhatsApp}
                className="btn btn-primary btn-sm"
                aria-label="Share on WhatsApp"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.348-.52.348-.173 0-.347-.049-.52-.148-.172-.099-.378-.249-.55-.497-.173-.249-.399-.55-.575-.848-.38-.633-.84-1.234-1.047-1.52-.198-.286-.38-.548-.41-.67-.03-.114-.075-.228-.12-.342-.112-.27-.24-.594-.384-.97-.312-.82-.5-1.705-.677-2.44-.187-.775-.303-1.54-.303-1.99 0-.35.03-.7.11-1.04.066-.27.187-.548.28-.807.112-.312.148-.633.075-.95-.066-.286-.273-.602-.303-.795-.03-.187-.044-.334-.075-.47-.03-.114-.149-.42-.149-.95 0-.286-.075-.474-.148-.9-.06-.24-.107-.48-.16-1.2.15-.68.14-.97.06-1.1-.12-.17-.29-.6-.29-1.24 0-.7.22-1.65.68-2.12.37-.37.8-1.03 1.2-1.6.4-.56.78-1.08 1.12-1.5.33-.44.6-1.1.72-1.46.11-.36.14-.72.09-1.08-.04-.35-.14-.85-.3-1.35-.15-.4-.3-.95-.46-1.55-.16-.58-.23-1.18-.32-1.8-.08-.6-.11-1.23-.11-1.87 0-.76.11-1.52.33-2.26.22-.73.52-1.5.8-2.1.15-.3.26-.6.37-.85.1-.24.2-.47.29-.68.1-.22.14-.44.2-.6.07-.16.1-.32.1-.49 0-.16-.04-.33-.1-.5-.05-.17-.1-.33-.16-.48-.06-.15-.11-.28-.19-.38-.08-.1-.2-.25-.3-.42-.1-.17-.2-.34-.3-.5-.1-.16-.2-.32-.3-.47-.1-.15-.2-.3-.3-.44-.09-.14-.18-.27-.28-.38-.1-.11-.2-.22-.3-.32-.1-.1-.2-.19-.3-.28-.1-.1-.18-.18-.28-.27-.1-.09-.18-.17-.27-.25-.09-.08-.17-.16-.26-.24-.09-.08-.17-.15-.25-.23-.08-.08-.15-.14-.23-.22-.08-.07-.15-.14-.22-.21-.08-.07-.14-.13-.21-.19-.07-.06-.13-.12-.2-.18-.07-.06-.12-.11-.18-.17-.06-.05-.11-.1-.16-.15-.06-.05-.1-.09-.15-.14-.05-.04-.09-.08-.13-.12-.05-.04-.08-.07-.11-.11-.04-.04-.07-.06-.1-.1-.04-.03-.07-.05-.09-.08-.03-.03-.05-.04-.07-.06-.02-.02-.04-.03-.05-.04-.02-.02-.03-.02-.04-.03-.01-.01-.02-.01-.02-.02 0 0-.01 0-.01 0 0 0 0 0 0 0 0 0 0 0 0 0" />
                </svg>
              </button>
            </div>
          </div>
          </div>
        </header>

        {/* Progress Indicator */}
        <div className="px-4 md:px-8 mb-6">
          <div className="flex items-center justify-between mb-2">
            {sections.map((section, index) => (
              <div key={section.id} className="flex items-center">
                <div 
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    index < activeSection
                      ? "bg-brand-primary text-white"
                      : index === activeSection
                      ? "bg-brand-accent/20 text-brand-primary ring-2 ring-brand-primary/30"
                      : "bg-brand-surface-muted text-brand-text-muted"
                    }`}
                >
                  {index < activeSection ? (
                    <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < sections.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 transition-all duration-300 ${
                    index < activeSection ? "bg-brand-primary" : "bg-brand-surface-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-brand-surface-muted rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-brand-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-brand-text-muted mt-2">
            Step {activeSection + 1} of {sections.length}: {sections[activeSection].title}
          </p>
        </div>

        {/* Form Content */}
        <main className="px-4 md:px-8 pb-20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </div>
            )}
            {/* Section 0: Personal Details */}
            {activeSection === 0 && (
              <section className="space-y-6 animate-fade-in">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-brand-accent/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h18a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">Tell us about yourself</h2>
                  <p className="text-brand-text-muted">We&apos;d love to know who&apos;s coming!</p>
                </div>

                <div className="space-y-5">
                  <Field label="Full Name" required>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClass}
                      placeholder="Your full name"
                    />
                  </Field>
                  <Field label="Mobile Number" required>
                    <input
                      type="tel"
                      required
                      maxLength={20}
                      autoComplete="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className={inputClass}
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                  <Field label="Email (optional)">
                    <input
                      type="email"
                      maxLength={100}
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="your@email.com"
                    />
                  </Field>
                  <Field label="Dietary Preferences (optional)">
                    <input
                      type="text"
                      maxLength={200}
                      value={dietaryPrefs}
                      onChange={(e) => setDietaryPrefs(e.target.value)}
                      className={inputClass}
                      placeholder="e.g., Vegetarian, Jain, No nuts, Gluten-free"
                    />
                  </Field>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveSection(1)}
                    className="btn btn-primary flex-1 text-lg"
                  >
                    Continue
                    <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </section>
            )}

            {/* Events Section */}
            {activeSection === 1 && wedding.events.length > 0 && (
              <section className="space-y-6 animate-fade-in">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-brand-accent/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">Which events will you attend?</h2>
                  <p className="text-brand-text-muted">Let us know for each celebration</p>
                </div>

                <div className="space-y-4">
                  {wedding.events.map((event) => (
                    <div
                      key={event.id}
                      className="group relative rounded-2xl border border-brand-border bg-brand-surface p-5 hover:border-brand-accent hover:shadow-soft hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-brand-accent/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-ink-900 mb-1">{event.name}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-brand-text-muted">
                            {event.date && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(event.date)}
                              </span>
                            )}
                            {event.time && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {event.time}
                              </span>
                            )}
                            {event.venue && (
                              <span className="flex items-center gap-1 truncate max-w-xs">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {event.venue}
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="mt-2 text-sm text-brand-text-muted line-clamp-2">{event.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-brand-border">
                        <label className="block text-sm font-medium text-brand-text mb-3">Will you attend?</label>
                        <div className="grid grid-cols-3 gap-3">
                          {["yes", "pending", "no"].map((option) => (
                            <label
                              key={option}
                              className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                                eventResponses[event.id] === option
                                  ? "border-brand-primary bg-brand-accent/20"
                                  : "border-brand-border hover:border-brand-accent hover:bg-brand-surface-muted"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`event-${event.id}`}
                                value={option}
                                checked={eventResponses[event.id] === option}
                                onChange={(e) => setEventResponses((prev) => ({ ...prev, [event.id]: e.target.value }))}
                                className="sr-only"
                              />
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors ${
                                eventResponses[event.id] === option
                                  ? "bg-brand-primary text-white"
                                  : "bg-brand-surface-muted text-brand-text-muted group-hover:bg-brand-accent/20 group-hover:text-brand-primary"
                              }`}>
                                {option === "yes" && (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {option === "no" && (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {option === "pending" && (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <span className={`mt-2 text-sm font-medium ${
                                eventResponses[event.id] === option
                                  ? "text-brand-primary"
                                  : "text-brand-text-muted"
                              }`}>
                                {option === "yes" ? "✓ Yes" : option === "no" ? "✗ No" : "? Not sure"}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveSection(0)}
                    className="btn btn-secondary flex-1 text-lg"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection(2)}
                    className="btn btn-primary flex-1 text-lg"
                  >
                    Continue
                    <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </section>
            )}

            {/* Family Members Section */}
            {activeSection === (wedding.events.length > 0 ? 2 : 1) && (
              <section className="space-y-6 animate-fade-in">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-brand-accent/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0v6v1h18v-1a6 6 0 00-12 0v-1z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">Family Members</h2>
                  <p className="text-brand-text-muted">Add everyone attending with you</p>
                </div>

                <div className="space-y-4">
                  {familyMembers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-4 bg-brand-accent/20 rounded-2xl flex items-center justify-center">
                        <svg className="w-10 h-10 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <p className="text-brand-text-muted mb-4">No family members added yet</p>
                      <button
                        type="button"
                        onClick={addFamilyMember}
                        className="btn btn-primary px-6 py-3"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add First Family Member
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {familyMembers.map((member) => (
                        <div
                          key={member.id}
                          className="group relative rounded-2xl border border-brand-border bg-brand-surface p-5 hover:border-brand-accent hover:shadow-soft transition-all duration-300"
                        >
                          <button
                            type="button"
                            onClick={() => removeFamilyMember(member.id)}
                            className="absolute top-3 right-3 p-1.5 rounded-lg text-brand-text-muted hover:bg-brand-danger hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="Remove family member"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Full Name" required>
                              <input
                                type="text"
                                required
                                maxLength={100}
                                value={member.fullName}
                                onChange={(e) => updateFamilyMember(member.id, "fullName", e.target.value)}
                                className={inputClass}
                                placeholder="Full name"
                              />
                            </Field>
                            <Field label="Relation">
                              <input
                                type="text"
                                maxLength={50}
                                value={member.relation}
                                onChange={(e) => updateFamilyMember(member.id, "relation", e.target.value)}
                                className={inputClass}
                                placeholder="e.g., Spouse, Child, Parent"
                              />
                            </Field>
                            <Field label="Age (optional)">
                              <input
                                type="number"
                                min={0}
                                max={120}
                                value={member.age}
                                onChange={(e) => updateFamilyMember(member.id, "age", e.target.value)}
                                className={inputClass}
                                placeholder="Age"
                              />
                            </Field>
                            <Field label="Dietary Preferences (optional)">
                              <input
                                type="text"
                                maxLength={200}
                                value={member.dietaryPrefs}
                                onChange={(e) => updateFamilyMember(member.id, "dietaryPrefs", e.target.value)}
                                className={inputClass}
                                placeholder="e.g., Vegetarian, No nuts"
                              />
                            </Field>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={addFamilyMember}
                    className="w-full py-3 px-6 rounded-xl border-2 border-dashed border-brand-accent text-brand-primary font-semibold hover:bg-brand-surface-muted transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Another Family Member
                  </button>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setActiveSection(wedding.events.length > 0 ? 1 : 0)}
                      className="btn btn-secondary flex-1 text-lg"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                    <button
                      type={wedding.customQuestions.length > 0 ? "button" : "submit"}
                      disabled={wedding.customQuestions.length === 0 && loading}
                      onClick={
                        wedding.customQuestions.length > 0
                          ? () => setActiveSection(wedding.events.length > 0 ? 3 : 2)
                          : undefined
                      }
                      className="btn btn-primary flex-1 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {wedding.customQuestions.length > 0 ? (
                        <>
                          Continue
                          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      ) : loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        <>
                          {editToken ? "Save my RSVP" : "Submit RSVP"}
                          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                </section>
              )}

              {/* Custom Questions Section */}
              {wedding.customQuestions.length > 0 && activeSection === (wedding.events.length > 0 ? 3 : 2) && (
                <section className="space-y-6 animate-fade-in">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-brand-accent/20 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.5-4 3-2.093 0-3.772-1-3.772-2V7.5a1 1 0 10-2 0v2.5c0 1.1.9 2 2 2h.08a2.008 2.008 0 00.766-.24l1.415-1.415a1 1 0 011.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L11 9.586a2.014 2.014 0 01.766.24l1.415 1.415a1 1 0 011.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L11 7.586a2.014 2.014 0 01.766.24l1.415 1.415a1 1 0 011.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L11 5.586a2.014 2.014 0 01.766.24l1.415 1.415a1 1 0 011.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L11 3.586A2.014 2.014 0 0113 3.24H11a1 1 0 100 2h.08a2.008 2.008 0 00.766.24l1.415 1.415a1 1 0 011.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L11 1.586A2.014 2.014 0 0113 1.24H11a1 1 0 100 2H7a5 5 0 000 10h.08a2 2 0 00-.766.24l-1.415 1.415a1 1 0 01-.766-.24l-1.415-1.415a1 1 0 01-.766-.24l-1.415 1.415a1 1 0 011.414 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414z" />
                      </svg>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">A few questions</h2>
                  <p className="text-brand-text-muted">The hosts would like to know a bit more</p>
                </div>

                  <div className="space-y-5">
                    {wedding.customQuestions.map((question) => {
                      const questionOptions = optionsFor(question)
                      return (
                        <Field
                          key={question.id}
                          label={question.question}
                          required={question.required}
                        >
                          {question.type === "textarea" ? (
                            <textarea
                              rows={4}
                              required={question.required}
                              maxLength={2000}
                              value={answers[question.id] ?? ""}
                              onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                              className={`${inputClass} resize-none`}
                              placeholder="Your answer..."
                            />
                          ) : question.type === "select" ? (
                            <select
                              required={question.required}
                              value={answers[question.id] ?? ""}
                              onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                              className={inputClass}
                            >
                              <option value="">Select an option</option>
                              {(questionOptions.length > 0 ? questionOptions : ["Yes", "No"]).map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : question.type === "checkbox" ? (
                            <div className="space-y-3">
                              {(questionOptions.length > 0 ? questionOptions : ["Yes", "No"]).map((option) => (
                                <label key={option} className="flex items-center gap-3 p-3 rounded-xl border border-brand-border hover:border-brand-accent hover:bg-brand-surface-muted cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    value={option}
                                    checked={answers[question.id]?.includes(option)}
                                    onChange={(e) => {
                                      const current = answers[question.id] || ""
                                      const values = current.split(",").filter(Boolean)
                                      if (e.target.checked) {
                                        setAnswers((prev) => ({ ...prev, [question.id]: [...values, option].join(",") }))
                                      } else {
                                        setAnswers((prev) => ({ ...prev, [question.id]: values.filter(v => v !== option).join(",") }))
                                      }
                                    }}
                                    className="w-5 h-5 text-brand-primary border-brand-border rounded focus:ring-brand-primary focus:ring-2"
                                  />
                                  <span className="text-brand-text">{option}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <input
                              type="text"
                              required={question.required}
                              maxLength={500}
                              value={answers[question.id] ?? ""}
                              onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                              className={inputClass}
                              placeholder="Your answer..."
                            />
                          )}
                        </Field>
                      )
                    })}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setActiveSection(2)}
                      className="btn btn-secondary flex-1 text-lg"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary flex-1 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Submitting...
                        </>
                      ) : editToken ? (
                        "Save my RSVP"
                      ) : (
                        <>
                          Submit RSVP
                          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </section>
              )}

            </form>
          </main>

          {/* Floating WhatsApp Share Button */}
          <button
            onClick={shareOnWhatsApp}
            className="fixed bottom-6 right-4 md:bottom-8 md:right-8 z-40 p-4 bg-brand-primary text-white rounded-2xl shadow-lift hover:bg-brand-primary-hover hover:scale-105 transition-all active:scale-[0.98]"
            aria-label="Share on WhatsApp"
          >
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.348-.52.348-.173 0-.347-.049-.52-.148-.172-.099-.378-.249-.55-.497-.173-.249-.399-.55-.575-.848-.38-.633-.84-1.234-1.047-1.52-.198-.286-.38-.548-.41-.67-.03-.114-.075-.228-.12-.342-.112-.27-.24-.594-.384-.97-.312-.82-.5-1.705-.677-2.44-.187-.775-.303-1.54-.303-1.99 0-.35.03-.7.11-1.04.066-.27.187-.548.28-.807.112-.312.148-.633.075-.95-.066-.286-.273-.602-.303-.795-.03-.187-.044-.334-.075-.47-.03-.114-.149-.42-.149-.95 0-.286-.075-.474-.148-.9-.06-.24-.107-.48-.16-1.2.15-.68.14-.97.06-1.1-.12-.17-.29-.6-.29-1.24 0-.7.22-1.65.68-2.12.37-.37.8-1.03 1.2-1.6.4-.56.78-1.08 1.12-1.5.33-.44.6-1.1.72-1.46.11-.36.14-.72.09-1.08-.04-.35-.14-.85-.3-1.35-.15-.4-.3-.95-.46-1.55-.16-.58-.23-1.18-.32-1.8-.08-.6-.11-1.23-.11-1.87 0-.76.11-1.52.33-2.26.22-.73.52-1.5.8-2.1.15-.3.26-.6.37-.85.1-.24.2-.47.29-.68.1-.22.14-.44.2-.6.07-.16.1-.32.1-.49 0-.16-.04-.33-.1-.5-.05-.17-.1-.33-.16-.48-.06-.15-.11-.28-.19-.38-.08-.1-.2-.25-.3-.42-.1-.17-.2-.34-.3-.5-.1-.17-.2-.34-.3-.5-.1-.16-.2-.32-.3-.47-.1-.15-.2-.3-.3-.44-.09-.14-.18-.27-.28-.38-.1-.11-.2-.22-.3-.32-.1-.1-.2-.19-.3-.28-.1-.1-.18-.18-.28-.27-.1-.09-.18-.17-.27-.25-.09-.08-.17-.16-.26-.24-.09-.08-.17-.15-.25-.23-.08-.08-.15-.14-.23-.22-.08-.07-.15-.14-.22-.21-.08-.07-.15-.13-.21-.19-.08-.07-.15-.13-.21-.19-.07-.06-.13-.12-.2-.18-.07-.06-.12-.11-.18-.17-.06-.05-.11-.1-.16-.15-.06-.05-.1-.09-.15-.14-.05-.04-.09-.08-.13-.12-.05-.04-.08-.07-.11-.11-.04-.04-.07-.06-.1-.1-.04-.03-.07-.05-.09-.08-.03-.03-.05-.04-.07-.06-.02-.02-.04-.03-.05-.04-.02-.02-.03-.02-.04-.03-.01-.01-.02-.01-.02-.02 0 0-.01 0-.01 0 0 0 0 0 0 0 0 0 0 0 0 0" />
            </svg>
          </button>
        </div>
  )
}

const inputClass =
  "mt-1 block w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3.5 text-base text-brand-text shadow-sm transition-colors placeholder:text-brand-text-muted hover:border-brand-accent focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:bg-brand-surface-muted disabled:text-brand-text-muted"

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-brand-text mb-2">
        {label}
        {required && <span className="text-brand-primary ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}