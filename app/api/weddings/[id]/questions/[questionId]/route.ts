import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  assertSameOrigin,
  handleApiError,
  readJson,
} from "@/lib/api"
import { requireUserId } from "@/lib/server-auth"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { customQuestionSchema } from "@/lib/validation"
import { ApiError } from "@/lib/errors"
import { logAudit } from "@/lib/audit"

type Params = { params: Promise<{ id: string; questionId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id, questionId } = await params
    await requireWeddingAccess(id, userId)

    const existing = await prisma.customQuestion.findFirst({
      where: { id: questionId, weddingId: id },
    })
    if (!existing) throw new ApiError("Question not found", 404)

    const body = await readJson(req)
    const data = customQuestionSchema.partial().parse(body)
    const updated = await prisma.customQuestion.update({
      where: { id: questionId },
      data,
    })
    await logAudit(id, userId, "question.updated", { questionId })
    return NextResponse.json({ question: updated })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id, questionId } = await params
    await requireWeddingAccess(id, userId)

    const existing = await prisma.customQuestion.findFirst({
      where: { id: questionId, weddingId: id },
    })
    if (!existing) throw new ApiError("Question not found", 404)

    await prisma.customQuestion.delete({ where: { id: questionId } })
    await logAudit(id, userId, "question.deleted", { questionId })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
