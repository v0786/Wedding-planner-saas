import { createHash } from "node:crypto"
import { requireUserId } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import {
  assertSameOrigin,
  handleApiError,
  ApiError,
} from "@/lib/api"
import { guestPhoneVariants } from "@/lib/guest-phone"
import { parseGuestCsv } from "@/lib/csv"
import { requireOpenWeddingAccess } from "@/lib/wedding-access"
import { logAudit } from "@/lib/audit"
import { assertWeddingFeature, assertWeddingLimit, withWorkspaceLimitLock } from "@/lib/subscriptions/service"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireOpenWeddingAccess(id, userId)

    await assertWeddingFeature(wedding.workspaceId, id, "csvImport")

    const preview = new URL(req.url).searchParams.get("preview") === "true"
    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) throw new ApiError("Attach a CSV file", 400)
    if (file.size > 2 * 1024 * 1024) throw new ApiError("The CSV file must be 2 MB or smaller", 400)

    const content = await file.text()
    const contentHash = createHash("sha256").update(content).digest("hex")
    const explicitKey = req.headers.get("idempotency-key")
    if (explicitKey && !/^[A-Za-z0-9_-]{16,128}$/.test(explicitKey)) {
      throw new ApiError("Use an idempotency key containing 16–128 letters, digits, underscores or hyphens", 400)
    }
    // Older direct API callers receive retry safety for an identical file.
    // A fresh explicit key allows a deliberate repeat of the same file.
    const keyHash = createHash("sha256").update(explicitKey ? `key:${explicitKey}` : `file:${contentHash}`).digest("hex")
    const parsed = parseGuestCsv(content)
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "The CSV file has validation errors", issues: parsed.errors },
        { status: 400 },
      )
    }

    // Reject the whole import when it would push the guest list past the plan
    // limit; partial imports would leave the data in a confusing state. The
    // lock keeps the count and the insert atomic under concurrent imports.
    const mobiles = parsed.rows.flatMap((row) => row.mobile ? guestPhoneVariants(row.mobile) : [])

    const created = await withWorkspaceLimitLock(wedding.workspaceId, "guests", async (tx) => {
      const previous = await tx.guestImport.findUnique({
        where: { weddingId_keyHash: { weddingId: id, keyHash } },
      })
      if (previous) {
        if (previous.contentHash !== contentHash) throw new ApiError("This import key was used for a different file. Select the file again.", 409)
        return { count: previous.importedCount, reused: true }
      }
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

      if (preview) return { count: 0, reused: false }
      const imported = await tx.guest.createMany({
        data: parsed.rows.map((row) => ({ ...row, weddingId: id })),
      })
      await tx.guestImport.create({
        data: { weddingId: id, keyHash, contentHash, importedCount: imported.count },
      })
      return { count: imported.count, reused: false }
    })

    if (preview) {
      return NextResponse.json({ preview: true, total: parsed.rows.length, rows: parsed.rows.slice(0, 20) }, {
        headers: { "Cache-Control": "private, no-store" },
      })
    }
    if (!created.reused) await logAudit(id, userId, "guest.imported", { count: created.count })
    return NextResponse.json({ imported: created.count, reused: created.reused }, { status: created.reused ? 200 : 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
