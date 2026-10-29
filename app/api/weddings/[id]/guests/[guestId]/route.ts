import { requireUserId } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertSameOrigin,
  handleApiError,
  readJson,
  ApiError,
} from "@/lib/api"
import { guestSchema } from "@/lib/validation"
import { getGuestAccess, requireWeddingAccess } from "@/lib/wedding-access"
import { logAudit } from "@/lib/audit"

type Params = { params: Promise<{ id: string; guestId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id, guestId } = await params
    await requireWeddingAccess(id, userId)

    const guest = await getGuestAccess(id, guestId, userId)
    if (!guest) throw new ApiError("Guest not found", 404)

    const body = await readJson(req)
    const data = guestSchema.partial().parse(body)

    if (data.mobile) {
      const conflict = await prisma.guest.findFirst({
        where: { weddingId: id, mobile: data.mobile, NOT: { id: guestId } },
        select: { id: true },
      })
      if (conflict) throw new ApiError("A guest with this mobile number already exists", 409)
    }

    const updated = await prisma.guest.update({ where: { id: guestId }, data })
    await logAudit(id, userId, "guest.updated", { guestId })
    return NextResponse.json({ guest: updated })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id, guestId } = await params
    await requireWeddingAccess(id, userId)

    const guest = await getGuestAccess(id, guestId, userId)
    if (!guest) throw new ApiError("Guest not found", 404)

    await prisma.guest.delete({ where: { id: guestId } })
    await logAudit(id, userId, "guest.deleted", { guestId })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
