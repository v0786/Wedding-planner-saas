import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import QuestionManager, { type QuestionRecord } from "@/components/wedding/question-manager"
import Link from "next/link"
import PageHeader from "@/components/ui/page-header"

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
        className="group inline-flex items-center gap-2 text-sm font-medium text-ink-500 transition-colors hover:text-gold-700"
      >
        <svg
          className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to wedding
      </Link>

      <PageHeader
        eyebrow="RSVP form"
        title={`Custom Questions — ${wedding.name}`}
        description="Ask your guests about meals, transport, accessibility or anything else that matters."
        className="mt-6"
      />

      <QuestionManager weddingId={wedding.id} initialQuestions={initial} />
    </main>
  )
}
