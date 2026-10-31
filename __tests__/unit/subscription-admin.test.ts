/** @jest-environment node */
import { describe, it, expect } from "@jest/globals"
import { isAdminAllowed, parseAdminEmails } from "@/lib/subscriptions/admin-access"

describe("admin authorization policy", () => {
  it("grants access to the isAdmin flag regardless of the allowlist", () => {
    expect(isAdminAllowed({ email: "owner@example.com", isAdmin: true }, "")).toBe(true)
  })

  it("matches allowlisted emails case-insensitively and trims whitespace", () => {
    const allowlist = " admin@example.com , Ops@Example.com ,, "
    expect(parseAdminEmails(allowlist)).toEqual(["admin@example.com", "ops@example.com"])
    expect(isAdminAllowed({ email: "ADMIN@example.com", isAdmin: false }, allowlist)).toBe(true)
    expect(isAdminAllowed({ email: " ops@example.com ", isAdmin: false }, allowlist)).toBe(true)
  })

  it("rejects non-admin accounts that are not on the allowlist", () => {
    expect(isAdminAllowed({ email: "user@example.com", isAdmin: false }, "admin@example.com")).toBe(false)
    expect(isAdminAllowed({ email: "user@example.com", isAdmin: false }, undefined)).toBe(false)
    expect(isAdminAllowed({ email: "user@example.com", isAdmin: false }, "")).toBe(false)
  })

  it("does not treat partial or suffix emails as allowlisted", () => {
    expect(isAdminAllowed({ email: "admin@example.com.evil.test", isAdmin: false }, "admin@example.com")).toBe(
      false,
    )
    expect(isAdminAllowed({ email: "notadmin@example.com", isAdmin: false }, "admin@example.com")).toBe(false)
  })
})
