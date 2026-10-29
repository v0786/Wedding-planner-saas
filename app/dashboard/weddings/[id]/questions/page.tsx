import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import QuestionManager, { type QuestionRecord } from "@/components/wedding/question-manager"
import Link from "next/link"

export default async function QuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const { id } = await params

  const wedding = await prisma.wedding.findFirst({
    where: { id, workspace: { members: { some: { userId: session.user.id } } } },
    select: { id: true, name: true },
  })
  if (!wedding) notFound()

  const questions = await prisma.customQuestion.findMany({
    where: { weddingId: id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  })

  const initial: QuestionRecord[] = questions.map((question) => ({
    id: question.id,
    question: question.question,
    type: question.type,
    options: question.options,
    required: question.required,
    order: question.order,
    enabled: question.enabled,
  }))

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/dashboard/weddings/${wedding.id}`}
        className="text-sm text-indigo-600 hover:text-indigo-500"
      >
        ← Back to wedding
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold text-gray-900">
        Custom Questions — {wedding.name}
      </h1>
      <QuestionManager weddingId={wedding.id} initialQuestions={initial} />
    </main>
  )
}
