import { requireUserId } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertSameOrigin,
  handleApiError,
  ApiError,
} from "@/lib/api"
import { parseGuestCsv } from "@/lib/csv"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id } = await params
    await requireWeddingAccess(id, userId)

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

    const mobiles = parsed.rows.map((row) => row.mobile).filter((value): value is string => !!value)
    if (mobiles.length > 0) {
      const existing = await prisma.guest.findMany({
        where: { weddingId: id, mobile: { in: mobiles } },
        select: { mobile: true },
      })
      if (existing.length > 0) {
        return NextResponse.json(
          {
            error: "Some mobile numbers already exist in this wedding",
            issues: existing.map((row) => `Already exists: ${row.mobile}`),
          },
          { status: 409 },
        )
      }
    }

    const created = await prisma.$transaction(
      parsed.rows.map((row) => prisma.guest.create({ data: { ...row, weddingId: id } })),
    )

    await logAudit(id, userId, "guest.imported", { count: created.length })
    return NextResponse.json({ imported: created.length }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
