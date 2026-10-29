import { requireUserId } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertSameOrigin,
  handleApiError,
  readJson,
} from "@/lib/api"
import { publishSchema } from "@/lib/validation"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id } = await params
    await requireWeddingAccess(id, userId)

    const body = await readJson(req)
    const { published } = publishSchema.parse(body)

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
