import { requireUserId } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertSameOrigin,
  handleApiError,
  readJson,
  ApiError,
} from "@/lib/api"
import { eventSchema } from "@/lib/validation"
import { getEventAccess, requireWeddingAccess } from "@/lib/wedding-access"
import { logAudit } from "@/lib/audit"

type Params = { params: Promise<{ id: string; eventId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id, eventId } = await params
    await requireWeddingAccess(id, userId)

    const event = await getEventAccess(id, eventId, userId)
    if (!event) throw new ApiError("Event not found", 404)

    const body = await readJson(req)
    const data = eventSchema.partial().parse(body)
    const updated = await prisma.event.update({ where: { id: eventId }, data })
    await logAudit(id, userId, "event.updated", { eventId })
    return NextResponse.json({ event: updated })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id, eventId } = await params
    await requireWeddingAccess(id, userId)

    const event = await getEventAccess(id, eventId, userId)
    if (!event) throw new ApiError("Event not found", 404)

    await prisma.event.delete({ where: { id: eventId } })
    await logAudit(id, userId, "event.deleted", { eventId, name: event.name })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
