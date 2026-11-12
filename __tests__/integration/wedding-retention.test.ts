import { prisma } from "@/lib/prisma"
import { hashEditToken } from "@/lib/tokens"
import { processWeddingRetention, requestEarlyWeddingDeletion, scheduleWeddingDeletion } from "@/lib/wedding-retention"

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
let workspaceId: string
let ownerId: string
let outsiderId: string
const jobHashes: string[] = []

beforeAll(async () => {
  const owner = await prisma.user.create({ data: { email: `retention-owner-${suffix}@example.com` } })
  const outsider = await prisma.user.create({ data: { email: `retention-outsider-${suffix}@example.com` } })
  ownerId = owner.id
  outsiderId = outsider.id
  const workspace = await prisma.workspace.create({ data: { name: "Retention test", members: { create: { userId: owner.id, role: "owner" } } } })
  workspaceId = workspace.id
})

afterAll(async () => {
  if (workspaceId) await prisma.workspace.deleteMany({ where: { id: workspaceId } })
  await prisma.weddingDeletionJob.deleteMany({ where: { weddingIdHash: { in: jobHashes } } })
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, outsiderId].filter(Boolean) } } })
  await prisma.$disconnect()
})

async function wedding(name: string, date?: Date) {
  const value = await prisma.wedding.create({ data: { workspaceId, name, coupleName1: "Test", date, timezone: "Asia/Kolkata" } })
  jobHashes.push(hashEditToken(value.id))
  return value
}

it("requires owner access and an exact confirmation, then completes once while retaining payment history", async () => {
  const value = await wedding("Confirmed deletion wedding")
  await prisma.guest.create({ data: { weddingId: value.id, firstName: "Guest" } })
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "BASIC" } })
  const payment = await prisma.payment.create({ data: { weddingId: value.id, workspaceId, planId: plan.id, planCode: "BASIC", amountInPaise: 49900, weddingPlanPriceInPaise: 49900, providerOrderId: `retention-${suffix}`, status: "PAID" } })
  await expect(requestEarlyWeddingDeletion(value.id, outsiderId, value.name)).rejects.toMatchObject({ status: 404 })
  await expect(requestEarlyWeddingDeletion(value.id, ownerId, "Wrong wedding")).rejects.toMatchObject({ status: 400 })
  expect(await prisma.weddingDeletionJob.count({ where: { weddingId: value.id } })).toBe(0)

  const [first, retry] = await Promise.all([
    requestEarlyWeddingDeletion(value.id, ownerId, value.name),
    requestEarlyWeddingDeletion(value.id, ownerId, value.name),
  ])
  expect(first).toMatchObject({ success: true, status: "COMPLETED" })
  expect(retry.jobId).toBe(first.jobId)
  expect(await prisma.wedding.findUnique({ where: { id: value.id } })).toBeNull()
  expect(await prisma.guest.count({ where: { weddingId: value.id } })).toBe(0)
  expect(await prisma.payment.findUnique({ where: { id: payment.id } })).toMatchObject({ weddingId: null, status: "PAID", amountInPaise: 49900 })
  const job = await prisma.weddingDeletionJob.findUniqueOrThrow({ where: { id: first.jobId } })
  expect(job).toMatchObject({ weddingId: null, weddingIdHash: hashEditToken(value.id), requestedByUserHash: hashEditToken(ownerId), safeResult: { guests: 1, responses: 0, groups: 0 } })
  expect(JSON.stringify(job)).not.toContain(value.name)
  expect(JSON.stringify(job)).not.toContain("Guest")
})

it("keeps dry runs read-only, reschedules with the wedding, and records completed scheduled work", async () => {
  const due = await wedding("Scheduled deletion", new Date("2020-01-10T00:00:00Z"))
  await scheduleWeddingDeletion(due.id)
  const original = await prisma.weddingDeletionJob.findUniqueOrThrow({ where: { weddingId: due.id } })
  expect(original.scheduledFor.toISOString()).toBe("2020-01-17T18:30:00.000Z")
  const now = new Date("2020-01-20T00:00:00Z")
  const dry = await processWeddingRetention({ now, deleteDue: false })
  expect(dry).toMatchObject({ dryRun: true, deleted: 0 })
  expect(await prisma.wedding.findUnique({ where: { id: due.id } })).not.toBeNull()
  expect(await prisma.weddingDeletionJob.findUnique({ where: { id: original.id } })).toMatchObject({ status: "PENDING" })

  await prisma.wedding.update({ where: { id: due.id }, data: { date: new Date("2020-03-10T00:00:00Z") } })
  await scheduleWeddingDeletion(due.id)
  const safe = await processWeddingRetention({ now, deleteDue: true })
  expect(safe.deleted).toBe(0)
  expect(await prisma.wedding.findUnique({ where: { id: due.id } })).not.toBeNull()
  await prisma.wedding.update({ where: { id: due.id }, data: { date: new Date("2020-01-10T00:00:00Z") } })
  await scheduleWeddingDeletion(due.id)
  expect(await processWeddingRetention({ now, deleteDue: true })).toMatchObject({ deleted: 1, failed: 0 })
  expect(await prisma.weddingDeletionJob.findUnique({ where: { id: original.id } })).toMatchObject({ status: "COMPLETED", weddingId: null, mode: "SCHEDULED" })
  expect(await processWeddingRetention({ now, deleteDue: true })).toMatchObject({ deleted: 0 })
})
