import { POST } from "@/app/api/policies/accept/route"
import { ApiError } from "@/lib/errors"
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/policies"
import { currentPolicyAcceptance, requireCurrentPolicyAcceptance } from "@/lib/policy-service"
import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/server-auth"

jest.mock("@/lib/server-auth", () => ({ requireUserId: jest.fn() }))

let userId: string
const accepted = {
  termsAccepted: true,
  privacyAcknowledged: true,
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
}
const request = (body: unknown) => new Request("http://localhost:3000/api/policies/accept", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email: `policies-${crypto.randomUUID()}@example.com` } })
  userId = user.id
})

afterAll(async () => {
  if (userId) await prisma.user.deleteMany({ where: { id: userId } })
  await prisma.$disconnect()
})

it("requires real acceptance and retains historical versions without rewriting their timestamps", async () => {
  expect(await currentPolicyAcceptance(userId)).toBeNull()
  await expect(requireCurrentPolicyAcceptance(userId)).rejects.toMatchObject({ status: 428 })
  const historical = await prisma.policyAcceptance.create({
    data: { userId, termsVersion: "older-terms", privacyVersion: "older-privacy", source: "registration", acceptedAt: new Date("2020-01-01T00:00:00Z") },
  })
  jest.mocked(requireUserId).mockResolvedValue(userId)
  expect((await POST(request({ ...accepted, termsAccepted: false }))).status).toBe(400)
  expect(await currentPolicyAcceptance(userId)).toBeNull()

  const beforeAcceptance = Date.now()
  const response = await POST(request({ ...accepted, acceptedAt: "1999-01-01T00:00:00Z" }))
  expect(response.status).toBe(200)
  const current = await currentPolicyAcceptance(userId)
  expect(current?.acceptedAt.getTime()).toBeGreaterThanOrEqual(beforeAcceptance)
  await expect(requireCurrentPolicyAcceptance(userId)).resolves.toBeUndefined()
  const retry = await POST(request(accepted))
  expect(retry.status).toBe(200)
  expect((await retry.json()).acceptance.acceptedAt).toBe(current?.acceptedAt.toISOString())
  expect(await prisma.policyAcceptance.count({ where: { userId } })).toBe(2)
  expect(await prisma.policyAcceptance.findUnique({ where: { id: historical.id } })).toMatchObject({
    source: "registration", acceptedAt: historical.acceptedAt,
  })
})

it("denies unauthenticated writes and rejects a superseded policy version", async () => {
  jest.mocked(requireUserId).mockRejectedValueOnce(new ApiError("Unauthorized", 401))
  expect((await POST(request(accepted))).status).toBe(401)
  jest.mocked(requireUserId).mockResolvedValue(userId)
  expect((await POST(request({ ...accepted, termsVersion: "older-terms" }))).status).toBe(400)
})
