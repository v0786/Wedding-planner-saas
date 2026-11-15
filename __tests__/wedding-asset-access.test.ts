/** @jest-environment node */
jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/prisma", () => ({ prisma: { wedding: { findUnique: jest.fn() } } }))
jest.mock("@/lib/wedding-assets", () => ({
  managedAssetUrl: (id: string, filename: string) => `/api/weddings/${id}/assets/${filename}`,
  downloadWeddingAsset: jest.fn(),
}))
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { downloadWeddingAsset } from "@/lib/wedding-assets"
import { GET } from "@/app/api/weddings/[id]/assets/[filename]/route"

const filename = "cover-12345678-1234-1234-1234-123456789abc.png"
const request = new Request("https://app.test/api/weddings/wedding/assets/" + filename)
const context = { params: Promise.resolve({ id: "wedding", filename }) }
const wedding = {
  published: true, date: new Date("2099-01-01"), timezone: "Asia/Kolkata",
  publicFields: ["coverImageUrl"], coverImageUrl: `/api/weddings/wedding/assets/${filename}`,
  couplePhotoUrl: null, workspace: { members: [] },
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(auth as jest.Mock).mockResolvedValue(null)
  ;(prisma.wedding.findUnique as jest.Mock).mockResolvedValue(wedding)
  ;(downloadWeddingAsset as jest.Mock).mockResolvedValue({ bytes: Buffer.from("png"), type: "image/png" })
})

it("serves only the explicitly public saved photo of an active published wedding", async () => {
  const response = await GET(request, context)
  expect(response.status).toBe(200)
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  for (const override of [{ published: false }, { publicFields: [] }, { coverImageUrl: "https://other.test/photo.png" }, { date: new Date("2000-01-01") }]) {
    ;(prisma.wedding.findUnique as jest.Mock).mockResolvedValue({ ...wedding, ...override })
    expect((await GET(request, context)).status).toBe(404)
  }
  expect(downloadWeddingAsset).toHaveBeenCalledTimes(1)
})

it("allows an authenticated workspace owner to preview private or expired photos", async () => {
  ;(auth as jest.Mock).mockResolvedValue({ user: { id: "owner" } })
  ;(prisma.wedding.findUnique as jest.Mock).mockResolvedValue({ ...wedding, published: false, publicFields: [], workspace: { members: [{ userId: "owner" }] } })
  expect((await GET(request, context)).status).toBe(200)
  expect((prisma.wedding.findUnique as jest.Mock).mock.calls[0][0].include.workspace.select.members.where.userId).toBe("owner")
})
