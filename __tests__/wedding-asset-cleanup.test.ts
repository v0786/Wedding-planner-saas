/** @jest-environment node */
jest.mock("@/lib/prisma", () => ({ prisma: { weddingDeletionJob: { findMany: jest.fn(), update: jest.fn() } } }))
jest.mock("@/lib/wedding-assets", () => ({ deleteWeddingAssets: jest.fn() }))
import { prisma } from "@/lib/prisma"
import { deleteWeddingAssets } from "@/lib/wedding-assets"
import { processWeddingAssetCleanup } from "@/lib/wedding-asset-cleanup"

it("retries provider failures without losing durable authorization and preserves safe aggregate counts", async () => {
  const safeResult = { guests: 10, responses: 3, groups: 2, assetCleanupStatus: "PENDING", assetCleanupPrefix: "a".repeat(64) }
  ;(prisma.weddingDeletionJob.findMany as jest.Mock).mockResolvedValue([{ id: "job", safeResult }])
  ;(deleteWeddingAssets as jest.Mock).mockRejectedValueOnce(new Error("provider unavailable"))
  expect(await processWeddingAssetCleanup()).toEqual({ scanned: 1, completed: 0, failed: 1 })
  expect(prisma.weddingDeletionJob.update).not.toHaveBeenCalled()
  ;(deleteWeddingAssets as jest.Mock).mockResolvedValueOnce(undefined)
  expect(await processWeddingAssetCleanup()).toEqual({ scanned: 1, completed: 1, failed: 0 })
  expect(prisma.weddingDeletionJob.update).toHaveBeenCalledWith({ where: { id: "job" }, data: { safeResult: { ...safeResult, assetCleanupStatus: "COMPLETED" } } })
  expect((prisma.weddingDeletionJob.findMany as jest.Mock).mock.calls[0][0].where).toMatchObject({ status: "COMPLETED", weddingId: null })
})
