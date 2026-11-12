import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/subscriptions/admin"

export const ADMIN_RESOURCES = {
  customers: "Customers",
  weddings: "Weddings",
  payments: "Purchases and payments",
  retention: "Wedding retention",
  audit: "Administrator access audit",
} as const

export type AdminResource = keyof typeof ADMIN_RESOURCES
const resourceSchema = z.enum(["customers", "weddings", "payments", "retention", "audit"])
const listingSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  reason: z.string().trim().min(12, "Describe the administrative purpose in at least 12 characters").max(300),
})
const PAGE_SIZE = 25

export function adminResource(value: string): AdminResource | null {
  const parsed = resourceSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

function date(value: Date | null) {
  return value?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) ?? "—"
}

export async function getAdminOverview() {
  await requireAdmin()
  const [customers, weddings, paidPurchases, pendingPayments] = await Promise.all([
    prisma.user.count(),
    prisma.wedding.count(),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
  ])
  return { customers, weddings, paidPurchases, pendingPayments }
}

/** Authorize and record the purpose before reading platform customer data. */
export async function getAdminListing(resource: AdminResource, raw: { page?: string; reason?: string }) {
  const administrator = await requireAdmin()
  const { page, reason } = listingSchema.parse(raw)
  await prisma.platformAdminAudit.create({ data: { actorUserId: administrator.id, resource, reason } })
  const paging = { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }
  const newest = { createdAt: "desc" as const }
  let total: number
  let columns: string[]
  let rows: string[][]

  switch (resource) {
    case "customers": {
      const [count, customers] = await Promise.all([
        prisma.user.count(),
        prisma.user.findMany({
          ...paging, orderBy: [newest, { id: "desc" }],
          select: { id: true, name: true, email: true, emailVerified: true, createdAt: true, _count: { select: { memberships: true } } },
        }),
      ])
      total = count
      columns = ["Customer ID", "Name", "Email", "Verified email", "Workspaces", "Created"]
      rows = customers.map(customer => [customer.id, customer.name ?? "—", customer.email, customer.emailVerified ? "Yes" : "No", String(customer._count.memberships), date(customer.createdAt)])
      break
    }
    case "weddings": {
      const [count, weddings] = await Promise.all([
        prisma.wedding.count(),
        prisma.wedding.findMany({ ...paging, orderBy: [newest, { id: "desc" }], select: { id: true, workspaceId: true, name: true, date: true, published: true, _count: { select: { guests: true, rsvpSubmissions: true } } } }),
      ])
      total = count
      columns = ["Wedding ID", "Workspace ID", "Wedding", "Date", "Published", "Guests", "RSVPs"]
      rows = weddings.map(wedding => [wedding.id, wedding.workspaceId, wedding.name, date(wedding.date), wedding.published ? "Yes" : "No", String(wedding._count.guests), String(wedding._count.rsvpSubmissions)])
      break
    }
    case "payments": {
      const [count, payments] = await Promise.all([
        prisma.payment.count(),
        prisma.payment.findMany({ ...paging, orderBy: [newest, { id: "desc" }], select: { id: true, workspaceId: true, weddingId: true, planCode: true, amountInPaise: true, currency: true, status: true, provider: true, createdAt: true } }),
      ])
      total = count
      columns = ["Payment ID", "Workspace ID", "Wedding ID", "Plan", "Amount", "Status", "Provider", "Created"]
      rows = payments.map(payment => [payment.id, payment.workspaceId, payment.weddingId ?? "Historical workspace purchase", payment.planCode, `${(payment.amountInPaise / 100).toFixed(2)} ${payment.currency}`, payment.status, payment.provider, date(payment.createdAt)])
      break
    }
    case "retention": {
      const [count, jobs] = await Promise.all([
        prisma.weddingDeletionJob.count(),
        prisma.weddingDeletionJob.findMany({ ...paging, orderBy: [{ scheduledFor: "asc" }, { id: "asc" }], select: { id: true, weddingId: true, mode: true, status: true, scheduledFor: true, completedAt: true } }),
      ])
      total = count
      columns = ["Deletion job", "Wedding ID", "Mode", "Status", "Eligible from (IST)", "Completed (IST)"]
      rows = jobs.map(job => [job.id, job.weddingId ?? "Removed", job.mode, job.status, date(job.scheduledFor), date(job.completedAt)])
      break
    }
    case "audit": {
      const [count, audits] = await Promise.all([
        prisma.platformAdminAudit.count(),
        prisma.platformAdminAudit.findMany({ ...paging, orderBy: [newest, { id: "desc" }], select: { id: true, actorUserId: true, resource: true, reason: true, createdAt: true } }),
      ])
      total = count
      columns = ["Audit ID", "Administrator ID", "Resource", "Purpose", "Accessed"]
      rows = audits.map(audit => [audit.id, audit.actorUserId, audit.resource, audit.reason, date(audit.createdAt)])
      break
    }
  }
  return { page, pageSize: PAGE_SIZE, total, reason, columns, rows }
}
