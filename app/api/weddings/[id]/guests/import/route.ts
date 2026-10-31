import { requireUserId } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import {
  assertSameOrigin,
  handleApiError,
  ApiError,
} from "@/lib/api"
import { parseGuestCsv } from "@/lib/csv"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { logAudit } from "@/lib/audit"
import { assertFeature, assertWeddingLimit, withWorkspaceLimitLock } from "@/lib/subscriptions/service"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireWeddingAccess(id, userId)

    await assertFeature(wedding.workspaceId, "csvImport")

    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) throw new ApiError("Attach a CSV file", 400)
    if (file.size > 2 * 1024 * 1024) throw new ApiError("The CSV file must be 2 MB or smaller", 400)

    const parsed = parseGuestCsv(await file.text())
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "The CSV file has validation errors", issues: parsed.errors },
        { status: 400 },
      )
    }

    // Reject the whole import when it would push the guest list past the plan
    // limit; partial imports would leave the data in a confusing state. The
    // lock keeps the count and the insert atomic under concurrent imports.
    const mobiles = parsed.rows.map((row) => row.mobile).filter((value): value is string => !!value)

    const created = await withWorkspaceLimitLock(wedding.workspaceId, "guests", async (tx) => {
      await assertWeddingLimit(wedding.workspaceId, id, "guests", parsed.rows.length)

      if (mobiles.length > 0) {
        const existing = await tx.guest.findMany({
          where: { weddingId: id, mobile: { in: mobiles } },
          select: { mobile: true },
        })
        if (existing.length > 0) {
          throw new ApiError(
            `Some mobile numbers already exist in this wedding: ${existing
              .map((row) => row.mobile)
              .join(", ")}`,
            409,
          )
        }
      }

      return tx.guest.createMany({
        data: parsed.rows.map((row) => ({ ...row, weddingId: id })),
      })
    })

    await logAudit(id, userId, "guest.imported", { count: created.count })
    return NextResponse.json({ imported: created.count }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
