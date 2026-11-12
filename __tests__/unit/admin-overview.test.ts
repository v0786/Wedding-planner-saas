/** @jest-environment node */
import { getAdminListing, getAdminOverview } from "@/lib/admin-overview"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/subscriptions/admin"
import { ApiError } from "@/lib/errors"

jest.mock("@/lib/subscriptions/admin", () => ({ requireAdmin: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { count: jest.fn(), findMany: jest.fn() },
    wedding: { count: jest.fn(), findMany: jest.fn() },
    payment: { count: jest.fn(), findMany: jest.fn() },
    platformAdminAudit: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  },
}))

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(requireAdmin).mockResolvedValue({ id: "administrator", email: "admin@example.com", isAdmin: true, emailVerified: null })
})

it("authorizes before platform counts or customer data can be read", async () => {
  jest.mocked(requireAdmin).mockRejectedValue(new ApiError("Administrator access required", 403))
  await expect(getAdminOverview()).rejects.toMatchObject({ status: 403 })
  await expect(getAdminListing("customers", { reason: "Customer support review" })).rejects.toMatchObject({ status: 403 })
  expect(prisma.user.count).not.toHaveBeenCalled()
  expect(prisma.user.findMany).not.toHaveBeenCalled()
  expect(prisma.platformAdminAudit.create).not.toHaveBeenCalled()
})

it("requires a meaningful purpose before sensitive listings and audit writes", async () => {
  await expect(getAdminListing("customers", { reason: "" })).rejects.toThrow()
  expect(prisma.platformAdminAudit.create).not.toHaveBeenCalled()
  expect(prisma.user.findMany).not.toHaveBeenCalled()
})

it("records the purpose before reading a bounded page with explicit safe fields", async () => {
  jest.mocked(prisma.user.count).mockResolvedValue(26)
  jest.mocked(prisma.user.findMany).mockResolvedValue([
    { id: "customer", name: "Customer", email: "customer@example.com", emailVerified: null, createdAt: new Date("2026-01-01T00:00:00Z"), _count: { memberships: 1 } },
  ] as never)
  const listing = await getAdminListing("customers", { page: "2", reason: "Customer support reference ABC123" })
  expect(prisma.platformAdminAudit.create).toHaveBeenCalledWith({ data: { actorUserId: "administrator", resource: "customers", reason: "Customer support reference ABC123" } })
  expect(jest.mocked(prisma.platformAdminAudit.create).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(prisma.user.findMany).mock.invocationCallOrder[0])
  const query = jest.mocked(prisma.user.findMany).mock.calls[0][0]!
  expect(query).toMatchObject({ skip: 25, take: 25 })
  expect(query.select).not.toHaveProperty("passwordHash")
  expect(listing).toMatchObject({ page: 2, total: 26, rows: [["customer", "Customer", "customer@example.com", "No", "1", expect.any(String)]] })
})

it("fails closed when the access audit cannot be persisted", async () => {
  jest.mocked(prisma.platformAdminAudit.create).mockRejectedValueOnce(new Error("Database unavailable"))
  await expect(getAdminListing("customers", { reason: "Customer support review" })).rejects.toThrow("Database unavailable")
  expect(prisma.user.findMany).not.toHaveBeenCalled()
})
