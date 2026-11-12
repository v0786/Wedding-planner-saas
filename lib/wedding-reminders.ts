import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { assertEmailConfigured, sendTransactionalEmail } from "@/lib/email"
import { weddingExpiry } from "@/lib/wedding-lifecycle"

type ReminderDb = Pick<Prisma.TransactionClient, "weddingReminder">

export async function scheduleWeddingReminders(
  job: { id: string; scheduledFor: Date },
  wedding: { date: Date | null; timezone: string },
  db: ReminderDb,
) {
  await db.weddingReminder.updateMany({
    where: { jobId: job.id, deletionAt: { not: job.scheduledFor }, status: { not: "SENT" } },
    data: { status: "CANCELLED", leaseUntil: null },
  })
  if (!wedding.date) return
  for (const offsetDays of [7, 3]) {
    const reminderDay = new Date(wedding.date)
    reminderDay.setUTCDate(reminderDay.getUTCDate() + 7 - offsetDays)
    const scheduledAt = weddingExpiry({ date: reminderDay, timezone: wedding.timezone })!
    const reminder = await db.weddingReminder.upsert({
      where: { jobId_deletionAt_offsetDays: { jobId: job.id, deletionAt: job.scheduledFor, offsetDays } },
      create: { jobId: job.id, deletionAt: job.scheduledFor, offsetDays, scheduledAt },
      update: {},
    })
    if (reminder.status === "CANCELLED") {
      await db.weddingReminder.updateMany({
        where: { id: reminder.id, status: "CANCELLED" },
        data: { status: "PENDING", leaseUntil: null },
      })
    }
  }
}

/** Lease work before delivery. Provider idempotency keys remain stable on retry. */
export async function processWeddingReminders(now: Date, send = false) {
  const available = { OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] }
  const nowUtc = now.toISOString()
  const dueCondition = Prisma.sql`r.status IN ('PENDING', 'SENDING')
    AND r."scheduledAt" <= ${nowUtc}::timestamp AND r."deletionAt" > ${nowUtc}::timestamp
    AND (r."leaseUntil" IS NULL OR r."leaseUntil" <= ${nowUtc}::timestamp)
    AND j.status = 'PENDING' AND j.mode = 'SCHEDULED'
    AND r."deletionAt" = j."scheduledFor"`
  const verifiedOwner = Prisma.sql`(SELECT 1 FROM "Wedding" w
    JOIN "WorkspaceMember" m ON m."workspaceId" = w."workspaceId" AND m.role = 'owner'
    JOIN "User" u ON u.id = m."userId" AND u."emailVerified" IS NOT NULL AND u.email IS NOT NULL
    WHERE w.id = j."weddingId")`
  const [eligible, blocked, total] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT r.id FROM "WeddingReminder" r
      JOIN "WeddingDeletionJob" j ON j.id = r."jobId"
      WHERE ${dueCondition} AND EXISTS ${verifiedOwner}
      ORDER BY r."scheduledAt", r.id LIMIT 50`),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT count(*) FROM "WeddingReminder" r
      JOIN "WeddingDeletionJob" j ON j.id = r."jobId"
      WHERE ${dueCondition} AND NOT EXISTS ${verifiedOwner}`),
    prisma.weddingReminder.count({ where: {
      ...available, status: { in: ["PENDING", "SENDING"] }, scheduledAt: { lte: now }, deletionAt: { gt: now },
      job: { status: "PENDING", mode: "SCHEDULED", weddingId: { not: null } },
    } }),
  ])
  const due = await prisma.weddingReminder.findMany({
    where: { id: { in: eligible.map(reminder => reminder.id) } },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    include: { job: { select: { weddingId: true, scheduledFor: true } } },
  })
  const summary = { dryRun: !send, due: total, sent: 0, blocked: Number(blocked[0]?.count ?? 0), failed: 0 }
  if (!send) return summary
  try { assertEmailConfigured() } catch { return { ...summary, blocked: total } }

  for (const reminder of due) {
    if (reminder.deletionAt.getTime() !== reminder.job.scheduledFor.getTime()) continue
    const claim = await prisma.weddingReminder.updateMany({
      where: { id: reminder.id, ...available, status: { in: ["PENDING", "SENDING"] } },
      data: { status: "SENDING", attempts: { increment: 1 }, leaseUntil: new Date(now.getTime() + 10 * 60_000) },
    })
    if (!claim.count) continue
    try {
      const wedding = await prisma.wedding.findUnique({
        where: { id: reminder.job.weddingId! },
        select: { workspace: { select: { members: { where: { role: "owner", user: { emailVerified: { not: null } } }, select: { user: { select: { email: true } } }, take: 1 } } } },
      })
      const recipient = wedding?.workspace.members[0]?.user.email
      if (!recipient) {
        summary.blocked += 1
        await prisma.weddingReminder.update({ where: { id: reminder.id }, data: { status: "PENDING", leaseUntil: new Date(now.getTime() + 24 * 60 * 60_000) } })
        continue
      }
      const providerId = await sendTransactionalEmail({
        to: recipient,
        subject: "Wedding data retention reminder",
        text: `Your wedding data is scheduled for deletion at ${reminder.deletionAt.toISOString()}. Sign in to download any reports you want to retain. Wedding editing and guest responses may already be closed.`,
        idempotencyKey: `wedding-reminder-${reminder.id}`,
      })
      await prisma.weddingReminder.update({ where: { id: reminder.id }, data: { status: "SENT", providerId, sentAt: now, leaseUntil: null } })
      summary.sent += 1
    } catch {
      summary.failed += 1
      await prisma.weddingReminder.update({ where: { id: reminder.id }, data: { status: "PENDING", leaseUntil: new Date(now.getTime() + 10 * 60_000) } })
    }
  }
  return summary
}
