import { requireCurrentPolicyAcceptance } from "@/lib/policy-service"
import { requireUserId } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertSameOrigin,
  handleApiError,
  readJson,
  ApiError,
} from "@/lib/api"
import { weddingCreateSchema } from "@/lib/validation"
import { logAudit } from "@/lib/audit"
import { scheduleWeddingDeletion } from "@/lib/wedding-retention"

export async function GET() {
  try {
    const userId = await requireUserId()
    const weddings = await prisma.wedding.findMany({
      where: { workspace: { members: { some: { userId } } } },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { guests: true, rsvpSubmissions: true, events: true } } },
    })
    return NextResponse.json({ weddings })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    await requireCurrentPolicyAcceptance(userId)
    const body = await readJson(req)
    const data = weddingCreateSchema.parse(body)

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    })
    if (!membership) throw new ApiError("No workspace found for this account", 400)

    const wedding = await prisma.$transaction(async (tx) => {
      const created = await tx.wedding.create({
      data: {
        workspaceId: membership.workspaceId,
        name: data.name,
        coupleName1: data.coupleName1,
        coupleName2: data.coupleName2,
        date: data.date,
        venue: data.venue,
        address: data.address,
        description: data.description,
        timezone: data.timezone,
        locale: data.locale,
        contactVisibility: data.contactVisibility,
        publicFields: data.publicFields,
        rsvpDeadline: data.rsvpDeadline,
        invitationToken: crypto.randomUUID(),
      },
      })
      await scheduleWeddingDeletion(created.id, tx)
      return created
    })

    await logAudit(wedding.id, userId, "wedding.created", { name: wedding.name })
    return NextResponse.json({ wedding }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
