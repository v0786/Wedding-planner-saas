import { requireUserId } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  ApiError,
  assertSameOrigin,
  handleApiError,
  readJson,
} from "@/lib/api"
import { publishSchema } from "@/lib/validation"
import { requireOpenWeddingAccess } from "@/lib/wedding-access"
import { logAudit } from "@/lib/audit"
import { getWeddingEntitlements } from "@/lib/subscriptions/service"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireOpenWeddingAccess(id, userId)

    const body = await readJson(req)
    const { published } = publishSchema.parse(body)
    if (published && !wedding.published) {
      const entitlements = await getWeddingEntitlements(wedding.workspaceId, id)
      if (entitlements.planCode === "FREE") {
        throw new ApiError("Choose a plan for this wedding before publishing its invitation.", 402, {
          code: "WEDDING_PLAN_REQUIRED",
          upgradeUrl: `/dashboard/billing?weddingId=${encodeURIComponent(id)}`,
        })
      }
    }

    const updated = await prisma.wedding.update({
      where: { id },
      data: { published },
    })

    await logAudit(id, userId, published ? "wedding.published" : "wedding.unpublished")
    return NextResponse.json({ wedding: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
