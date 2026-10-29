/** @jest-environment node */
process.env.RATE_LIMIT_STORE = "memory"
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgresql://postgres@localhost:5432/wedding_guest_manager_test"

import { describe, it, expect, beforeEach } from "@jest/globals"
import { prisma } from "@/lib/prisma"
import { POST } from "@/app/api/register/route"
import { resetRateLimits, memoryStore } from "@/lib/rate-limit"

function request(body: unknown, ip = "10.0.0.1") {
  return new Request("http://localhost:3000/api/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  })
}

const valid = { name: "Demo Host", email: `host-${Date.now()}@example.com`, password: "longenough" }

describe("POST /api/register", () => {
  beforeEach(async () => {
    resetRateLimits(memoryStore)
    await prisma.user.deleteMany({ where: { email: { startsWith: "host-" } } })
  })

  it("rejects invalid input", async () => {
    const response = await POST(request({ ...valid, password: "short" }))
    expect(response.status).toBe(400)
  })

  it("rejects a duplicate email with 409", async () => {
    await prisma.user.create({
      data: { email: "duplicate@example.com", name: "Existing", passwordHash: "x" },
    })
    const response = await POST(request({ ...valid, email: "duplicate@example.com" }))
    expect(response.status).toBe(409)
    await prisma.user.deleteMany({ where: { email: "duplicate@example.com" } })
  })

  it("creates the user, workspace and owner membership in one transaction", async () => {
    const response = await POST(request(valid))
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.user.email).toBe(valid.email)

    const user = await prisma.user.findUnique({ where: { email: valid.email } })
    expect(user).not.toBeNull()
    const membership = await prisma.workspaceMember.findFirst({ where: { userId: user!.id } })
    expect(membership?.role).toBe("owner")
    const workspace = await prisma.workspace.findUnique({ where: { id: membership!.workspaceId } })
    expect(workspace).not.toBeNull()

    await prisma.workspace.deleteMany({ where: { id: membership!.workspaceId } })
    await prisma.user.deleteMany({ where: { id: user!.id } })
  })

  it("rate limits repeated registration attempts", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await POST(request({ ...valid, email: `rate-${attempt}@example.com` }, "10.0.0.99"))
      expect(response.status).toBe(201)
    }
    const blocked = await POST(request({ ...valid, email: "rate-blocked@example.com" }, "10.0.0.99"))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("retry-after")).toBeTruthy()

    await prisma.user.deleteMany({ where: { email: { startsWith: "rate-" } } })
    await prisma.user.deleteMany({ where: { email: "rate-blocked@example.com" } })
  })
})
