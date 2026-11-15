import { describe, it, expect } from "@jest/globals"
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/policies"
import { rsvpSchema, registerSchema, guestSchema, eventSchema, optionalDate, weddingUpdateSchema, eventUpdateSchema, customQuestionUpdateSchema } from "@/lib/validation"

describe("rsvpSchema", () => {
  const valid = {
    token: "invite-token",
    fullName: "Aarav Sharma",
    mobile: "+91 98765-43210",
  }

  it("normalises a valid mobile number", () => {
    const parsed = rsvpSchema.parse(valid)
    expect(parsed.mobile).toBe("+919876543210")
    expect(parsed.familyMembers).toEqual([])
    expect(parsed.answers).toEqual([])
  })

  it("rejects a missing full name", () => {
    const result = rsvpSchema.safeParse({ ...valid, fullName: "   " })
    expect(result.success).toBe(false)
  })

  it("rejects a missing mobile number", () => {
    const result = rsvpSchema.safeParse({ ...valid, mobile: undefined })
    expect(result.success).toBe(false)
  })

  it("rejects a malformed mobile number", () => {
    const result = rsvpSchema.safeParse({ ...valid, mobile: "abc" })
    expect(result.success).toBe(false)
  })

  it("rejects an unknown event response status", () => {
    const result = rsvpSchema.safeParse({
      ...valid,
      eventResponses: { "event-1": "maybe" },
    })
    expect(result.success).toBe(false)
  })

  it("accepts family members and custom answers", () => {
    const parsed = rsvpSchema.parse({
      ...valid,
      familyMembers: [{ fullName: "Ananya", relation: "Spouse", age: "31" }],
      answers: [{ questionId: "q1", value: "Vegetarian" }],
    })
    expect(parsed.familyMembers[0].age).toBe(31)
    expect(parsed.answers[0].value).toBe("Vegetarian")
  })
})

describe("registerSchema", () => {
  const policies = { termsAccepted: true, privacyAcknowledged: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION }
  it("requires an 8 character password", () => {
    expect(
      registerSchema.safeParse({ ...policies, name: "A", email: "a@example.com", password: "short" }).success,
    ).toBe(false)
  })

  it("lowercases and trims the email", () => {
    const parsed = registerSchema.parse({
      ...policies,
      name: " A ",
      email: "  HOST@Example.COM ",
      password: "longenough",
    })
    expect(parsed.email).toBe("host@example.com")
    expect(parsed.name).toBe("A")
  })
})

describe("guestSchema", () => {
  it("allows a guest without a mobile number", () => {
    expect(guestSchema.safeParse({ firstName: "Meera" }).success).toBe(true)
  })

  it("rejects an invalid email", () => {
    expect(
      guestSchema.safeParse({ firstName: "Meera", email: "not-an-email" }).success,
    ).toBe(false)
  })

  it("rejects an empty first name", () => {
    expect(guestSchema.safeParse({ firstName: "" }).success).toBe(false)
  })
})

describe("eventSchema", () => {
  it("coerces the display order", () => {
    const parsed = eventSchema.parse({ name: "Haldi", order: "2" })
    expect(parsed.order).toBe(2)
  })
})

describe("optionalDate", () => {
  it("converts empty strings to null", () => {
    expect(optionalDate.parse("")).toBeNull()
  })

  it("converts a date input value to a Date", () => {
    expect(optionalDate.parse("2027-02-14")).toBeInstanceOf(Date)
  })

  it("rejects an invalid date", () => {
    expect(optionalDate.safeParse("not-a-date").success).toBe(false)
  })
})


describe("partial update validation", () => {
  it("preserves saved privacy and timezone when updating unrelated wedding fields", () => {
    expect(weddingUpdateSchema.parse({ name: "Updated celebration" })).toEqual({ name: "Updated celebration" })
  })

  it("does not reset event order or public fields during a name-only update", () => {
    expect(eventUpdateSchema.parse({ name: "Updated event" })).toEqual({ name: "Updated event" })
  })

  it("does not change question type, visibility or required state during a text update", () => {
    expect(customQuestionUpdateSchema.parse({ question: "Updated question?" })).toEqual({ question: "Updated question?" })
  })

  it("retains policy-specific rejection messages after validator upgrades", () => {
    const parsed = registerSchema.safeParse({ name: "Host", email: "host@example.com", password: "longenough", termsAccepted: false, privacyAcknowledged: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0].message).toBe("Accept the Terms to continue")
  })
})
