import { POST as checkIn } from "@/app/api/weddings/[id]/check-in/route"
import { ApiError } from "@/lib/errors"
import {
  bindGroupInvitation,
  createGroupInvitationToken,
  findOpenGroupInvitation,
  groupCheckInCode,
  groupInvitationCookieName,
  resolveGroupInvitation,
} from "@/lib/group-invitations"
import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/server-auth"
import { generateEditToken } from "@/lib/tokens"

jest.mock("@/lib/server-auth", () => ({ requireUserId: jest.fn() }))

let ownerId: string
let outsiderId: string
let workspaceId: string
let weddingId: string
let secondWeddingId: string

beforeAll(async () => {
  const suffix = generateEditToken()
  const owner = await prisma.user.create({ data: { email: `group-owner-${suffix}@example.com` } })
  const outsider = await prisma.user.create({ data: { email: `group-outsider-${suffix}@example.com` } })
  ownerId = owner.id
  outsiderId = outsider.id
  const workspace = await prisma.workspace.create({
    data: {
      name: "Group invitation test",
      members: { create: { userId: ownerId, role: "owner" } },
      weddings: {
        create: [
          { name: "Group invitation wedding", coupleName1: "A", published: true },
          { name: "Other wedding", coupleName1: "B", published: true },
        ],
      },
    },
    include: { weddings: true },
  })
  workspaceId = workspace.id
  weddingId = workspace.weddings.find(wedding => wedding.coupleName1 === "A")!.id
  secondWeddingId = workspace.weddings.find(wedding => wedding.coupleName1 === "B")!.id
})

afterAll(async () => {
  if (workspaceId) await prisma.workspace.deleteMany({ where: { id: workspaceId } })
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, outsiderId].filter(Boolean) } } })
  await prisma.$disconnect()
})

async function createInvite(label: string) {
  const token = createGroupInvitationToken()
  const group = await prisma.groupInvitation.create({ data: { label, weddingId, tokenHash: token.tokenHash } })
  return { token: token.token, group }
}

function browser(id: string, value: string) {
  return { get: (name: string) => name === groupInvitationCookieName(id) ? { value } : undefined }
}

it("allows just one first-open claim and requires its browser cookie", async () => {
  const { token, group } = await createInvite("Claim test")
  const unclaimed = await findOpenGroupInvitation(token)
  expect(unclaimed?.browserHash).toBeNull()
  const claims = await Promise.all([bindGroupInvitation(unclaimed!), bindGroupInvitation(unclaimed!)])
  const winner = claims.find(value => value !== null)!
  expect(claims.filter(Boolean)).toHaveLength(1)
  expect(await resolveGroupInvitation(token, browser(group.id, winner))).toMatchObject({ id: group.id, weddingId })
  expect(await resolveGroupInvitation(token, browser(group.id, generateEditToken()))).toBeNull()
  expect(await resolveGroupInvitation(token, { get: () => undefined })).toBeNull()

  const replacement = createGroupInvitationToken()
  await prisma.groupInvitation.update({
    where: { id: group.id },
    data: { tokenHash: replacement.tokenHash, browserHash: null },
  })
  expect(await resolveGroupInvitation(token, browser(group.id, winner))).toBeNull()
  const replacementClaim = await bindGroupInvitation((await findOpenGroupInvitation(replacement.token))!)
  expect(replacementClaim).toBeTruthy()
  expect(await resolveGroupInvitation(replacement.token, browser(group.id, winner))).toBeNull()
  expect(await resolveGroupInvitation(replacement.token, browser(group.id, replacementClaim!))).toMatchObject({ id: group.id })
})

it("requires authorized staff, scopes check-in by wedding, and checks in a group just once", async () => {
  const { group } = await createInvite("Arrival test")
  const request = (id: string) => checkIn(new Request("http://test.local/check-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: groupCheckInCode(group.id) }),
  }), { params: Promise.resolve({ id }) })

  jest.mocked(requireUserId).mockRejectedValueOnce(new ApiError("Unauthorized", 401))
  expect((await request(weddingId)).status).toBe(401)
  jest.mocked(requireUserId).mockResolvedValueOnce(outsiderId)
  expect((await request(weddingId)).status).toBe(404)
  jest.mocked(requireUserId).mockResolvedValue(ownerId)
  expect((await request(secondWeddingId)).status).toBe(404)

  const [first, second] = await Promise.all([request(weddingId), request(weddingId)])
  expect([first.status, second.status]).toEqual([200, 200])
  const responses = await Promise.all([first.json(), second.json()])
  expect(responses.map(response => response.alreadyCheckedIn).sort()).toEqual([false, true])
  expect(responses[0].checkedInAt).toBe(responses[1].checkedInAt)
  expect(await prisma.auditLog.count({ where: { weddingId, action: "group.checked_in" } })).toBe(1)
})
