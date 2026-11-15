import { GET, PUT, DELETE } from "@/app/api/onboarding/setup/route"
import { POST } from "@/app/api/onboarding/setup/complete/route"
import { completeWeddingSetup } from "@/lib/wedding-setup-service"
import { EMPTY_WEDDING_SETUP } from "@/lib/wedding-setup-draft"
import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/server-auth"
import { requireCurrentPolicyAcceptance } from "@/lib/policy-service"
import { generateEditToken } from "@/lib/tokens"

jest.mock("@/lib/server-auth", () => ({ requireUserId: jest.fn() }))
jest.mock("@/lib/policy-service", () => ({ requireCurrentPolicyAcceptance: jest.fn() }))

const userIds: string[] = []
const workspaceIds: string[] = []
const data = { ...EMPTY_WEDDING_SETUP, name: "Saved celebration", coupleName1: "First person", date: "2030-12-20" }

beforeAll(async () => {
  for (let i = 0; i < 2; i++) {
    const user = await prisma.user.create({ data: { email: `setup-${generateEditToken()}@example.com` } })
    const workspace = await prisma.workspace.create({ data: { name: "Isolated setup", members: { create: { userId: user.id } } } })
    userIds.push(user.id); workspaceIds.push(workspace.id)
  }
})

beforeEach(async () => {
  jest.mocked(requireUserId).mockResolvedValue(userIds[0])
  jest.mocked(requireCurrentPolicyAcceptance).mockResolvedValue(undefined)
  await prisma.weddingSetupDraft.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.wedding.deleteMany({ where: { workspaceId: { in: workspaceIds } } })
})

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  await prisma.$disconnect()
})

function request(method: string, body?: unknown) {
  return new Request("http://test.local/api/onboarding/setup", {
    method, headers: { "Content-Type": "application/json", host: "test.local", origin: "http://test.local" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

it("saves partial progress to the account and never returns another account's draft", async () => {
  const partial = { ...EMPTY_WEDDING_SETUP, name: "Partially typed name" }
  expect((await PUT(request("PUT", { step: 0, data: partial }))).status).toBe(200)
  const response = await GET()
  expect(response.headers.get("Cache-Control")).toBe("private, no-store")
  expect(await response.json()).toMatchObject({ draft: { step: 0, data: { name: partial.name }, completedWeddingId: null } })
  jest.mocked(requireUserId).mockResolvedValue(userIds[1])
  expect(await (await GET()).json()).toEqual({ draft: null })
  await DELETE(request("DELETE"))
  expect(await prisma.weddingSetupDraft.count({ where: { userId: userIds[0] } })).toBe(1)
})

it("completes concurrent retries into exactly one private wedding and clears duplicate personal draft data", async () => {
  expect((await PUT(request("PUT", { step: 3, data }))).status).toBe(200)
  const results = await Promise.all([completeWeddingSetup(userIds[0]), completeWeddingSetup(userIds[0])])
  expect(results[0].weddingId).toBe(results[1].weddingId)
  expect(results.map(result => result.resumed).sort()).toEqual([false, true])
  expect(await prisma.wedding.count({ where: { workspaceId: workspaceIds[0] } })).toBe(1)
  const wedding = await prisma.wedding.findUniqueOrThrow({ where: { id: results[0].weddingId } })
  expect(wedding.published).toBe(false)
  expect(wedding.name).toBe(data.name)
  expect(await prisma.weddingDeletionJob.count({ where: { weddingId: wedding.id } })).toBe(1)
  expect((await prisma.weddingSetupDraft.findUniqueOrThrow({ where: { userId: userIds[0] } })).data).toEqual(EMPTY_WEDDING_SETUP)
  expect((await PUT(request("PUT", { step: 0, data: EMPTY_WEDDING_SETUP }))).status).toBe(409)
  expect((await POST(request("POST"))).status).toBe(200)
})

it("requires valid wedding details and a date before completion and preserves the draft on failure", async () => {
  expect((await PUT(request("PUT", { step: 1, data: { ...data, date: "" } }))).status).toBe(200)
  expect((await POST(request("POST"))).status).toBe(400)
  expect(await prisma.wedding.count({ where: { workspaceId: workspaceIds[0] } })).toBe(0)
  expect(await prisma.weddingSetupDraft.count({ where: { userId: userIds[0] } })).toBe(1)
})

it("clearing a completed setup never deletes its wedding and allows a distinct new setup", async () => {
  await PUT(request("PUT", { step: 3, data }))
  const first = await completeWeddingSetup(userIds[0])
  expect((await DELETE(request("DELETE"))).status).toBe(200)
  expect(await prisma.wedding.findUnique({ where: { id: first.weddingId } })).not.toBeNull()
  await PUT(request("PUT", { step: 3, data: { ...data, name: "Second celebration" } }))
  const second = await completeWeddingSetup(userIds[0])
  expect(second.weddingId).not.toBe(first.weddingId)
})

it("rejects cross-origin saves and invalid payloads without writing drafts", async () => {
  const foreign = new Request("http://test.local/api/onboarding/setup", { method: "PUT", headers: { host: "test.local", origin: "https://foreign.example" }, body: JSON.stringify({ step: 0, data }) })
  expect((await PUT(foreign)).status).toBe(403)
  expect((await PUT(request("PUT", { step: 10, data }))).status).toBe(400)
  expect(await prisma.weddingSetupDraft.count({ where: { userId: userIds[0] } })).toBe(0)
})
