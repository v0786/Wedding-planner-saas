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
import { logAudit } from "@/lib/audit"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await params
    await requireWeddingAccess(id, userId)

    const questions = await prisma.customQuestion.findMany({
      where: { weddingId: id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    })
    return NextResponse.json({ questions })
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
    const data = customQuestionSchema.parse(body)

    const question = await prisma.customQuestion.create({
      data: { ...data, weddingId: id },
    })
    await logAudit(id, userId, "question.created", { questionId: question.id })
    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
