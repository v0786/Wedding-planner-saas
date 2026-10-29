import { requireUserId } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertSameOrigin,
  handleApiError,
  readJson,
} from "@/lib/api"
import { weddingUpdateSchema } from "@/lib/validation"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { logAudit } from "@/lib/audit"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await params
    await requireWeddingAccess(id, userId)

    const wedding = await prisma.wedding.findUnique({
      where: { id },
      include: {
        events: { orderBy: { order: "asc" } },
        customQuestions: { orderBy: { order: "asc" } },
        _count: { select: { guests: true, rsvpSubmissions: true } },
      },
    })
    return NextResponse.json({ wedding })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id } = await params
    await requireWeddingAccess(id, userId)

    const body = await readJson(req)
    const data = weddingUpdateSchema.parse(body)
    const updates = { ...data }
    delete updates.id

    const wedding = await prisma.wedding.update({ where: { id }, data: updates })
    await logAudit(id, userId, "wedding.updated", { fields: Object.keys(updates) })
    return NextResponse.json({ wedding })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id } = await params
    await requireWeddingAccess(id, userId)

    await prisma.wedding.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
