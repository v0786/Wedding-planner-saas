/** @jest-environment node */
jest.mock("@/lib/server-auth", () => ({ requireUserId: jest.fn() }))
jest.mock("@/lib/wedding-access", () => ({ requireOpenWeddingAccess: jest.fn() }))
jest.mock("@/lib/subscriptions/service", () => ({ assertWeddingFeature: jest.fn() }))
jest.mock("@/lib/rate-limit", () => ({ checkRateLimit: jest.fn() }))
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }))
jest.mock("@/lib/wedding-assets", () => ({ readImageBody: jest.fn(), uploadWeddingAsset: jest.fn() }))
import { requireUserId } from "@/lib/server-auth"
import { requireOpenWeddingAccess } from "@/lib/wedding-access"
import { assertWeddingFeature } from "@/lib/subscriptions/service"
import { checkRateLimit } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"
import { readImageBody, uploadWeddingAsset } from "@/lib/wedding-assets"
import { ApiError } from "@/lib/errors"
import { POST } from "@/app/api/weddings/[id]/assets/route"
import { assertWeddingDesignChanges } from "@/lib/invitation-design"

const context = { params: Promise.resolve({ id: "wedding" }) }
function request(origin = "https://app.test") {
  return new Request("https://app.test/api/weddings/wedding/assets?kind=cover", {
    method: "POST", headers: { origin, host: "app.test", "content-type": "image/png" }, body: "photo",
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(requireUserId as jest.Mock).mockResolvedValue("owner")
  ;(requireOpenWeddingAccess as jest.Mock).mockResolvedValue({ workspaceId: "workspace" })
  ;(assertWeddingFeature as jest.Mock).mockResolvedValue(undefined)
  ;(checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true })
  ;(readImageBody as jest.Mock).mockResolvedValue(Buffer.from("photo"))
  ;(uploadWeddingAsset as jest.Mock).mockResolvedValue({ url: "/api/weddings/wedding/assets/photo.png" })
  ;(prisma.$transaction as jest.Mock).mockImplementation(fn => fn({
    $executeRaw: jest.fn(), wedding: { findUnique: jest.fn().mockResolvedValue({ date: new Date("2099-01-01"), timezone: "Asia/Kolkata" }) },
  }))
})

it("checks origin, session, tenant and paid customization before reading the file or contacting storage", async () => {
  expect((await POST(request("https://foreign.test"), context)).status).toBe(403)
  expect(readImageBody).not.toHaveBeenCalled()
  ;(requireUserId as jest.Mock).mockRejectedValueOnce(new ApiError("Unauthorized", 401))
  expect((await POST(request(), context)).status).toBe(401)
  ;(requireOpenWeddingAccess as jest.Mock).mockRejectedValueOnce(new ApiError("Wedding not found", 404))
  expect((await POST(request(), context)).status).toBe(404)
  ;(assertWeddingFeature as jest.Mock).mockRejectedValueOnce(new ApiError("Upgrade required", 403))
  expect((await POST(request(), context)).status).toBe(403)
  expect(readImageBody).not.toHaveBeenCalled()
  expect(uploadWeddingAsset).not.toHaveBeenCalled()
})

it("requires a durable rate limit and rejects a wedding deleted or expired while the upload waits", async () => {
  ;(checkRateLimit as jest.Mock).mockResolvedValueOnce({ allowed: false })
  expect((await POST(request(), context)).status).toBe(429)
  expect(readImageBody).not.toHaveBeenCalled()
  ;(prisma.$transaction as jest.Mock).mockImplementationOnce(fn => fn({ $executeRaw: jest.fn(), wedding: { findUnique: jest.fn().mockResolvedValue(null) } }))
  expect((await POST(request(), context)).status).toBe(404)
  ;(prisma.$transaction as jest.Mock).mockImplementationOnce(fn => fn({ $executeRaw: jest.fn(), wedding: { findUnique: jest.fn().mockResolvedValue({ date: new Date("2000-01-01"), timezone: "Asia/Kolkata" }) } }))
  expect((await POST(request(), context)).status).toBe(403)
  expect(uploadWeddingAsset).not.toHaveBeenCalled()
  expect((await POST(request(), context)).status).toBe(201)
  expect(checkRateLimit).toHaveBeenLastCalledWith("asset-upload:wedding:owner", expect.objectContaining({ failClosed: true }))
})

it("rejects managed image references from another wedding at the save boundary", async () => {
  await expect(assertWeddingDesignChanges("workspace", "wedding", {}, { coverImageUrl: "/api/weddings/foreign/assets/cover-12345678-1234-1234-1234-123456789abc.png" })).rejects.toMatchObject({ status: 400 })
  expect(assertWeddingFeature).not.toHaveBeenCalled()
})
