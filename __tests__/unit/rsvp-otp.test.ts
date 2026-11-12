/** @jest-environment node */

import {
  assertRsvpPhoneProof,
  issueRsvpPhoneChallenge,
  issueRsvpPhoneProof,
  readRsvpPhoneChallenge,
} from "@/lib/rsvp-otp"
import { normalizeRsvpPhone, rsvpPhoneVariants } from "@/lib/rsvp-phone"

const context = { invitationToken: "invitation", mobile: "98765 43210", browserToken: "browser" }
const verificationSid = `VE${"1".repeat(32)}`
const originalSecret = process.env.AUTH_SECRET

beforeEach(() => {
  process.env.AUTH_SECRET = "isolated-otp-test-key"
})

afterEach(() => {
  if (originalSecret === undefined) delete process.env.AUTH_SECRET
  else process.env.AUTH_SECRET = originalSecret
  jest.useRealTimers()
})

it("canonicalizes Indian and international numbers without losing legacy variants", () => {
  expect(normalizeRsvpPhone("98765 43210")).toBe("+919876543210")
  expect(normalizeRsvpPhone("919876543210")).toBe("+919876543210")
  expect(normalizeRsvpPhone("+1 (415) 555-2671")).toBe("+14155552671")
  expect(rsvpPhoneVariants("+919876543210")).toEqual(["+919876543210", "919876543210", "9876543210"])
  expect(() => normalizeRsvpPhone("1234567")).toThrow("country code")
})

it("binds the OTP challenge and resulting proof to the browser, phone and invitation", () => {
  const challenge = issueRsvpPhoneChallenge(context, verificationSid)
  const proof = issueRsvpPhoneProof(context)
  const equivalent = { ...context, mobile: "+91 98765 43210" }
  expect(readRsvpPhoneChallenge(challenge, equivalent)).toBe(verificationSid)
  expect(() => assertRsvpPhoneProof(proof, equivalent)).not.toThrow()
  for (const contextChange of [
    { invitationToken: "another invitation" },
    { mobile: "9876543211" },
    { browserToken: undefined },
    { browserToken: "another browser" },
  ]) {
    expect(() => readRsvpPhoneChallenge(challenge, { ...context, ...contextChange })).toThrow()
    expect(() => assertRsvpPhoneProof(proof, { ...context, ...contextChange })).toThrow()
  }
  expect(() => assertRsvpPhoneProof(challenge, context)).toThrow()
  expect(() => assertRsvpPhoneProof(`${proof.slice(0, -1)}!`, context)).toThrow()
})

it("rejects expired challenges and proofs", () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-11-10T10:00:00Z"))
  const challenge = issueRsvpPhoneChallenge(context, verificationSid)
  const proof = issueRsvpPhoneProof(context)
  jest.advanceTimersByTime(10 * 60_000)
  expect(() => readRsvpPhoneChallenge(challenge, context)).toThrow()
  expect(() => assertRsvpPhoneProof(proof, context)).not.toThrow()
  jest.advanceTimersByTime(5 * 60_000)
  expect(() => assertRsvpPhoneProof(proof, context)).toThrow()
})
