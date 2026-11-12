import { prisma } from "@/lib/prisma"
import { scheduleWeddingDeletion } from "@/lib/wedding-retention"
import { processWeddingReminders } from "@/lib/wedding-reminders"
import { sendTransactionalEmail } from "@/lib/email"
import { generateEditToken } from "@/lib/tokens"

jest.mock("@/lib/email", () => ({ assertEmailConfigured: jest.fn(), sendTransactionalEmail: jest.fn() }))

it("schedules local calendar reminders, dry-runs and delivers each reminder once", async () => {
  const user = await prisma.user.create({ data: { email: `reminder-${generateEditToken()}@example.com`, emailVerified: new Date() } })
  const workspace = await prisma.workspace.create({ data: { name: "Reminder fixture", members: { create: { userId: user.id, role: "owner" } } } })
  let jobId: string | undefined
  try {
    const wedding = await prisma.wedding.create({ data: { workspaceId: workspace.id, name: "Reminder wedding", coupleName1: "A", date: new Date("2035-12-10T00:00:00Z"), timezone: "Asia/Kolkata" } })
    const job = await scheduleWeddingDeletion(wedding.id)
    jobId = job!.id
    const reminders = await prisma.weddingReminder.findMany({ where: { jobId }, orderBy: { scheduledAt: "asc" } })
    expect(reminders.map(row => row.scheduledAt.toISOString())).toEqual(["2035-12-10T18:30:00.000Z", "2035-12-14T18:30:00.000Z"])
    const now = new Date("2035-12-11T00:00:00Z")
    expect(await processWeddingReminders(now)).toMatchObject({ dryRun: true, due: 1, sent: 0 })
    expect(sendTransactionalEmail).not.toHaveBeenCalled()
    jest.mocked(sendTransactionalEmail).mockResolvedValue("provider-fixture")
    const outcomes = await Promise.all([processWeddingReminders(now, true), processWeddingReminders(now, true)])
    expect(outcomes.reduce((total, outcome) => total + outcome.sent, 0)).toBe(1)
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1)
    expect(await prisma.weddingReminder.count({ where: { jobId, status: "SENT" } })).toBe(1)

    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: null } })
    expect(await processWeddingReminders(new Date("2035-12-15T00:00:00Z"), true)).toMatchObject({ sent: 0, blocked: 1 })
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1)

    await prisma.wedding.update({ where: { id: wedding.id }, data: { date: new Date("2036-12-10T00:00:00Z") } })
    await scheduleWeddingDeletion(wedding.id)
    expect(await prisma.weddingReminder.count({ where: { jobId, status: "CANCELLED" } })).toBe(1)
    expect(await prisma.weddingReminder.count({ where: { jobId, status: "PENDING" } })).toBe(2)
    await prisma.wedding.update({ where: { id: wedding.id }, data: { date: new Date("2035-12-10T00:00:00Z") } })
    await scheduleWeddingDeletion(wedding.id)
    expect(await prisma.weddingReminder.count({ where: { jobId, deletionAt: job!.scheduledFor, status: "PENDING" } })).toBe(1)
  } finally {
    if (jobId) await prisma.weddingDeletionJob.deleteMany({ where: { id: jobId } })
    await prisma.workspace.delete({ where: { id: workspace.id } })
    await prisma.user.delete({ where: { id: user.id } })
    await prisma.$disconnect()
  }
})
