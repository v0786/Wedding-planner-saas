import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertSameOrigin, handleApiError, readJson, ApiError } from "@/lib/api"
import { requireUserId } from "@/lib/server-auth"
import { requireCurrentPolicyAcceptance } from "@/lib/policy-service"
import { saveWeddingSetupSchema } from "@/lib/wedding-setup-draft"

export async function GET() {
  try {
    const userId = await requireUserId()
    const draft = await prisma.weddingSetupDraft.findUnique({ where: { userId }, select: { data: true, step: true, updatedAt: true, completedWeddingId: true } })
    return NextResponse.json({ draft }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) { return handleApiError(error) }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request)
    const userId = await requireUserId()
    await requireCurrentPolicyAcceptance(userId)
    const input = saveWeddingSetupSchema.parse(await readJson(request))
    const draft = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`wedding-setup:${userId}`}, 0))`
      const existing = await tx.weddingSetupDraft.findUnique({ where: { userId }, select: { completedWeddingId: true } })
      if (existing?.completedWeddingId) throw new ApiError("This setup is complete. Start a new wedding setup to save another draft.", 409)
      return tx.weddingSetupDraft.upsert({ where: { userId }, create: { userId, ...input }, update: input, select: { updatedAt: true } })
    })
    return NextResponse.json({ savedAt: draft.updatedAt })
  } catch (error) { return handleApiError(error) }
}

/** Explicitly starts over; completed weddings are never deleted here. */
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request)
    const userId = await requireUserId()
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`wedding-setup:${userId}`}, 0))`
      await tx.weddingSetupDraft.deleteMany({ where: { userId } })
    })
    return NextResponse.json({ cleared: true })
  } catch (error) { return handleApiError(error) }
}
