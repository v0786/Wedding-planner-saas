import { assertWeddingDesignChanges } from "@/lib/invitation-design"
import { requireUserId } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertSameOrigin,
  handleApiError,
  readJson,
} from "@/lib/api"
import { weddingUpdateSchema } from "@/lib/validation"
import { requireOpenWeddingAccess, requireWeddingAccess } from "@/lib/wedding-access"
import { logAudit } from "@/lib/audit"
import { requestEarlyWeddingDeletion, scheduleWeddingDeletion } from "@/lib/wedding-retention"
import { assertWeddingOpen } from "@/lib/wedding-lifecycle"
import { ApiError } from "@/lib/errors"
import { z } from "zod"

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
    const previous = await requireOpenWeddingAccess(id, userId)

    const body = await readJson(req)
    const data = weddingUpdateSchema.parse(body)
    const updates = { ...data }
    delete updates.id
    await assertWeddingDesignChanges(previous.workspaceId, id, previous, updates)

    const wedding = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Wedding" WHERE id = ${id} FOR UPDATE`
      const current = await tx.wedding.findUnique({ where: { id } })
      if (!current) throw new ApiError("Wedding not found", 404)
      assertWeddingOpen(current)
      const updated = await tx.wedding.update({ where: { id }, data: updates })
      await scheduleWeddingDeletion(id, tx)
      return updated
    })
    const scheduleChanged = (previous.date?.getTime() ?? null) !== (wedding.date?.getTime() ?? null) ||
      previous.timezone !== wedding.timezone
    await logAudit(id, userId, "wedding.updated", {
      fields: Object.keys(updates),
      ...(scheduleChanged && {
        previousDate: previous.date?.toISOString() ?? null,
        date: wedding.date?.toISOString() ?? null,
        previousTimezone: previous.timezone,
        timezone: wedding.timezone,
      }),
    })
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
    const { confirmName } = z.object({ confirmName: z.string().min(1).max(200) }).parse(await readJson(req))
    return NextResponse.json(await requestEarlyWeddingDeletion(id, userId, confirmName))
  } catch (error) {
    return handleApiError(error)
  }
}
