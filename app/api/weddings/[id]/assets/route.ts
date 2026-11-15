import { prisma } from "@/lib/prisma"
import { assertWeddingOpen } from "@/lib/wedding-lifecycle"
import { NextResponse } from "next/server"
import { assertSameOrigin, handleApiError } from "@/lib/api"
import { ApiError } from "@/lib/errors"
import { requireUserId } from "@/lib/server-auth"
import { requireOpenWeddingAccess } from "@/lib/wedding-access"
import { assertWeddingFeature } from "@/lib/subscriptions/service"
import { checkRateLimit } from "@/lib/rate-limit"
import { readImageBody, uploadWeddingAsset } from "@/lib/wedding-assets"

export const runtime = "nodejs"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request)
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireOpenWeddingAccess(id, userId)
    await assertWeddingFeature(wedding.workspaceId, id, "customBranding")
    const kind = new URL(request.url).searchParams.get("kind")
    if (kind !== "cover" && kind !== "couple") throw new ApiError("Choose a cover image or couple photo", 400)
    const limit = await checkRateLimit(`asset-upload:${id}:${userId}`, { limit: 20, windowMs: 60 * 60 * 1000, failClosed: true })
    if (!limit.allowed) throw new ApiError("Too many image uploads. Try again later.", 429)
    const bytes = await readImageBody(request)
    const asset = await prisma.$transaction(async tx => {
      // Serialize with deletion: cleanup cannot finish before an in-flight upload.
      await tx.$executeRaw`SELECT id FROM "Wedding" WHERE id = ${id} FOR UPDATE`
      const current = await tx.wedding.findUnique({ where: { id } })
      if (!current) throw new ApiError("Wedding not found", 404)
      assertWeddingOpen(current)
      return uploadWeddingAsset(id, kind, bytes, request.headers.get("content-type") || "")
    }, { timeout: 60_000 })
    return NextResponse.json(asset, { status: 201, headers: { "Cache-Control": "no-store" } })
  } catch (error) { return handleApiError(error) }
}
