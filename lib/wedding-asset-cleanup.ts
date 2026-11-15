import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { deleteWeddingAssets } from "@/lib/wedding-assets"

/** Only completed, already authorized deletions can enqueue storage removal. */
export async function processWeddingAssetCleanup() {
  const jobs = await prisma.weddingDeletionJob.findMany({
    where: { status: "COMPLETED", weddingId: null, safeResult: { path: ["assetCleanupStatus"], equals: "PENDING" } },
    orderBy: { completedAt: "asc" }, take: 20,
    select: { id: true, safeResult: true },
  })
  let completed = 0
  let failed = 0
  for (const job of jobs) {
    const result = job.safeResult as Prisma.JsonObject
    const prefix = result.assetCleanupPrefix
    if (typeof prefix !== "string") { failed++; continue }
    try {
      await deleteWeddingAssets(prefix)
      await prisma.weddingDeletionJob.update({ where: { id: job.id }, data: {
        safeResult: { ...result, assetCleanupStatus: "COMPLETED" },
      } })
      completed++
    } catch {
      // Preserve the durable PENDING job and only safe counts for the next run.
      failed++
    }
  }
  return { scanned: jobs.length, completed, failed }
}
