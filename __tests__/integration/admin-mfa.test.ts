import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { POST } from "@/app/api/admin/mfa/route"
import { requireAdmin } from "@/lib/subscriptions/admin"
import { totpAtStep } from "@/lib/admin-mfa-crypto"
import { MFA_COOKIE } from "@/lib/admin-mfa"

let userId = ""
const cookieValues = new Map<string, string>()
jest.mock("@/lib/server-auth", () => ({ requireUserId: jest.fn(async () => userId) }))
jest.mock("next/headers", () => ({ cookies: jest.fn(async () => ({
  get: (name: string) => cookieValues.has(name) ? { name, value: cookieValues.get(name) } : undefined,
  getAll: () => [...cookieValues.entries()].map(([name, value]) => ({ name, value })),
  set: (name: string, value: string) => cookieValues.set(name, value),
  delete: (name: string) => cookieValues.delete(name),
})) }))
const previousKey = process.env.AUTH_SECRET
const password = "unit-test-admin-password"
let secret = ""
let recoveryCodes: string[] = []
let enrollmentCode = ""

async function action(body: object) {
  return POST(new Request("http://localhost/api/admin/mfa", {
    method: "POST", headers: { "Content-Type": "application/json", origin: "http://localhost", host: "localhost" }, body: JSON.stringify(body),
  }))
}
async function clearAttempts() { await prisma.rateLimit.deleteMany({ where: { key: `admin-mfa:${userId}` } }) }

beforeAll(async () => {
  process.env.AUTH_SECRET = "integration-only-admin-mfa-secret-at-least-32-characters"
  cookieValues.set("authjs.session-token", "synthetic-test-session")
  const user = await prisma.user.create({ data: { email: `mfa-${crypto.randomUUID()}@example.com`, passwordHash: await bcrypt.hash(password, 4), isAdmin: true } })
  userId = user.id
})
afterAll(async () => {
  if (userId) { await clearAttempts(); await prisma.platformAdminAudit.deleteMany({ where: { actorUserId: userId } }); await prisma.user.delete({ where: { id: userId } }) }
  if (previousKey === undefined) delete process.env.AUTH_SECRET
  else process.env.AUTH_SECRET = previousKey
  await prisma.$disconnect()
})

it("requires MFA even for an explicitly provisioned administrator", async () => {
  await expect(requireAdmin()).rejects.toMatchObject({ status: 403, details: { mfaRequired: true } })
  const rejected = await action({ action: "begin", password: "wrong" })
  expect(rejected.status).toBe(403)
  expect(await prisma.adminMfaCredential.count({ where: { userId } })).toBe(0)
})

it("enrolls only after account password and authenticator verification and encrypts the secret", async () => {
  const begin = await action({ action: "begin", password })
  expect(begin.status).toBe(200)
  secret = (await begin.json()).secret
  expect(secret).toMatch(/^[A-Z2-7]{32}$/)
  expect((await action({ action: "enroll", code: "invalid" })).status).toBe(400)
  enrollmentCode = totpAtStep(secret, Math.floor(Date.now() / 30_000))
  const enrolled = await action({ action: "enroll", code: enrollmentCode })
  expect(enrolled.status).toBe(200)
  recoveryCodes = (await enrolled.json()).recoveryCodes
  expect(recoveryCodes).toHaveLength(8)
  const credential = await prisma.adminMfaCredential.findUniqueOrThrow({ where: { userId } })
  expect(credential.encryptedSecret).not.toContain(secret)
  expect(credential.recoveryHashes).not.toContain(recoveryCodes[0])
  await expect(requireAdmin()).resolves.toMatchObject({ id: userId })
})

it("rejects a replay of the enrollment TOTP and consumes recovery codes once", async () => {
  await clearAttempts()
  cookieValues.delete(MFA_COOKIE)
  expect((await action({ action: "verify", code: enrollmentCode })).status).toBe(403)
  expect((await action({ action: "verify", code: recoveryCodes[0] })).status).toBe(200)
  cookieValues.delete(MFA_COOKIE)
  expect((await action({ action: "verify", code: recoveryCodes[0] })).status).toBe(403)
  await expect(requireAdmin()).rejects.toMatchObject({ status: 403 })
})

it("allows only one concurrent recovery-code consumption", async () => {
  await clearAttempts()
  const responses = await Promise.all([action({ action: "verify", code: recoveryCodes[1] }), action({ action: "verify", code: recoveryCodes[1] })])
  expect(responses.map(value => value.status).sort()).toEqual([200, 403])
})

it("binds step-up to the signed-in browser and removes it on lock", async () => {
  await clearAttempts()
  expect((await action({ action: "verify", code: recoveryCodes[2] })).status).toBe(200)
  await expect(requireAdmin()).resolves.toMatchObject({ id: userId })
  cookieValues.set("authjs.session-token", "different-session")
  await expect(requireAdmin()).rejects.toMatchObject({ status: 403 })
  cookieValues.set("authjs.session-token", "synthetic-test-session")
  await expect(requireAdmin()).resolves.toMatchObject({ id: userId })
  expect((await action({ action: "lock" })).status).toBe(200)
  await expect(requireAdmin()).rejects.toMatchObject({ status: 403 })
  expect(await prisma.platformAdminAudit.count({ where: { actorUserId: userId, resource: "mfa.recovery-used" } })).toBe(3)
})

it("requires recent MFA and the account password to replace an authenticator", async () => {
  await clearAttempts()
  expect((await action({ action: "reset", password })).status).toBe(403)
  expect((await action({ action: "verify", code: recoveryCodes[3] })).status).toBe(200)
  expect((await action({ action: "reset", password: "wrong" })).status).toBe(403)
  expect((await action({ action: "reset", password })).status).toBe(200)
  expect(await prisma.adminMfaCredential.count({ where: { userId } })).toBe(0)
  await expect(requireAdmin()).rejects.toMatchObject({ status: 403 })
})
