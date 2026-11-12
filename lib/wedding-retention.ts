import type { Prisma } from "@prisma/client"
import { ApiError } from "@/lib/errors"
import { weddingExpiry } from "@/lib/wedding-lifecycle"
import { prisma } from "@/lib/prisma"
import { hashEditToken } from "@/lib/tokens"
import { scheduleWeddingReminders } from "@/lib/wedding-reminders"

const RETENTION_DAYS = 7
const BATCH_SIZE = 200

type Db = Pick<Prisma.TransactionClient, "wedding" | "weddingDeletionJob" | "weddingReminder">

export function weddingDeletionAt(wedding: { date: Date | null; timezone: string }) {
  if (!wedding.date) return null
  const retainedUntil = new Date(wedding.date)
  retainedUntil.setUTCDate(retainedUntil.getUTCDate() + RETENTION_DAYS)
  return weddingExpiry({ date: retainedUntil, timezone: wedding.timezone })
}

/** Keep schedules current without running a deletion or retaining guest details. */
export async function scheduleWeddingDeletion(weddingId: string, db: Db = prisma) {
  const wedding = await db.wedding.findUnique({ where: { id: weddingId }, select: { date: true, timezone: true } })
  if (!wedding) return null
  const scheduledFor = weddingDeletionAt(wedding)
  if (!scheduledFor) {
    await db.weddingDeletionJob.deleteMany({ where: { weddingId, status: { not: "COMPLETED" }, mode: "SCHEDULED" } })
    return null
  }
  const job = await db.weddingDeletionJob.upsert({
    where: { weddingIdHash: hashEditToken(weddingId) },
    create: { weddingId, weddingIdHash: hashEditToken(weddingId), scheduledFor },
    update: { weddingId, scheduledFor, status: "PENDING", completedAt: null, mode: "SCHEDULED" },
  })
  await scheduleWeddingReminders(job, wedding, db)
  return job
}

async function deleteWeddingWithJob(tx: Prisma.TransactionClient, weddingId: string, jobId: string, now: Date) {
  const [guests, responses, groups] = await Promise.all([
    tx.guest.count({ where: { weddingId } }),
    tx.rsvpSubmission.count({ where: { weddingId } }),
    tx.groupInvitation.count({ where: { weddingId } }),
  ])
  await tx.wedding.delete({ where: { id: weddingId } })
  // Payment references use SET NULL and survive. The independent job holds only
  // hashed identifiers, timestamps and aggregate counts after completion.
  await tx.weddingDeletionJob.update({
    where: { id: jobId },
    data: { weddingId: null, status: "COMPLETED", completedAt: now, safeResult: { guests, responses, groups } },
  })
  return { success: true, jobId, status: "COMPLETED" as const }
}

export async function requestEarlyWeddingDeletion(weddingId: string, userId: string, confirmName: string, now = new Date()) {
  const weddingIdHash = hashEditToken(weddingId)
  const requestedByUserHash = hashEditToken(userId)
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT w.id FROM "Wedding" w
      WHERE w.id = ${weddingId} AND EXISTS (
        SELECT 1 FROM "WorkspaceMember" m
        WHERE m."workspaceId" = w."workspaceId" AND m."userId" = ${userId} AND m.role = 'owner'
      ) FOR UPDATE`
    const wedding = await tx.wedding.findFirst({
      where: { id: weddingId, workspace: { members: { some: { userId, role: "owner" } } } },
      select: { name: true },
    })
    if (!wedding) {
      const completed = await tx.weddingDeletionJob.findFirst({ where: { weddingIdHash, requestedByUserHash, mode: "EARLY", status: "COMPLETED" }, select: { id: true } })
      if (completed) return { success: true, jobId: completed.id, status: "COMPLETED" as const }
      throw new ApiError("Wedding not found", 404)
    }
    if (confirmName !== wedding.name) throw new ApiError("Enter the exact wedding name to confirm deletion", 400)
    const job = await tx.weddingDeletionJob.upsert({
      where: { weddingIdHash },
      create: { weddingId, weddingIdHash, requestedByUserHash, mode: "EARLY", scheduledFor: now },
      update: { requestedByUserHash, mode: "EARLY", scheduledFor: now, status: "PENDING" },
    })
    return deleteWeddingWithJob(tx, weddingId, job.id, now)
  })
}

async function deleteScheduledWedding(candidate: { id: string; date: Date | null; timezone: string }, now: Date) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT id FROM "Wedding" WHERE id = ${candidate.id} FOR UPDATE`
    const wedding = await tx.wedding.findUnique({ where: { id: candidate.id }, select: { date: true, timezone: true } })
    if (!wedding) return false
    const scheduledFor = weddingDeletionAt(wedding)
    // Re-read the date under the same lock as deletion, so a reschedule cannot
    // race the earlier candidate selection.
    if (!scheduledFor || scheduledFor > now) return false
    const job = await tx.weddingDeletionJob.upsert({
      where: { weddingIdHash: hashEditToken(candidate.id) },
      create: { weddingId: candidate.id, weddingIdHash: hashEditToken(candidate.id), scheduledFor },
      update: { scheduledFor, status: "PENDING", mode: "SCHEDULED" },
    })
    await deleteWeddingWithJob(tx, candidate.id, job.id, now)
    return true
  })
}

export async function processWeddingRetention({ now, deleteDue }: { now: Date; deleteDue: boolean }) {
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS)
  const candidates = await prisma.wedding.findMany({
    where: { date: { lte: cutoff } },
    select: { id: true, date: true, timezone: true },
    orderBy: [{ date: "asc" }, { id: "asc" }],
    take: BATCH_SIZE,
  })
  const due = candidates.filter(wedding => {
    const deletionAt = weddingDeletionAt(wedding)
    return deletionAt && deletionAt <= now
  })
  let deleted = 0
  let failed = 0
  if (deleteDue) {
    for (const wedding of due) {
      try {
        if (await deleteScheduledWedding(wedding, now)) deleted += 1
      } catch {
        failed += 1
        // The transaction rolls back both record removal and job completion.
        // Leave the existing PENDING job for the next authorized worker run.
        console.error("Wedding retention transaction failed")
      }
    }
  }
  return { dryRun: !deleteDue, scanned: candidates.length, due: due.length, deleted, failed }
}
