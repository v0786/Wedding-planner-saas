import { requireUserId } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertSameOrigin,
  handleApiError,
  readJson,
} from "@/lib/api"
import { eventSchema } from "@/lib/validation"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { logAudit } from "@/lib/audit"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await params
    await requireWeddingAccess(id, userId)

    const events = await prisma.event.findMany({
      where: { weddingId: id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    })
    return NextResponse.json({ events })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id } = await params
    await requireWeddingAccess(id, userId)

    const body = await readJson(req)
    const data = eventSchema.parse(body)

    const event = await prisma.event.create({
      data: { ...data, weddingId: id },
    })
    await logAudit(id, userId, "event.created", { eventId: event.id, name: event.name })
    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
