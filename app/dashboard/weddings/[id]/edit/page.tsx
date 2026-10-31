import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import EditWeddingForm from "@/components/wedding/edit-wedding-form"
import Link from "next/link"
import PageHeader from "@/components/ui/page-header"

export default async function EditWeddingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const { id } = await params

  const wedding = await prisma.wedding.findFirst({
    where: { id, workspace: { members: { some: { userId: session.user.id } } } },
  })
  if (!wedding) notFound()

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
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
        eyebrow="Wedding details"
        title="Edit Wedding"
        description={`Update the details for ${wedding.name}. Changes appear on the invitation your guests see.`}
        className="mt-6"
      />

      <EditWeddingForm
        wedding={{
          id: wedding.id,
          name: wedding.name,
          coupleName1: wedding.coupleName1,
          coupleName2: wedding.coupleName2,
          date: wedding.date?.toISOString() ?? null,
          venue: wedding.venue,
          address: wedding.address,
          description: wedding.description,
          rsvpDeadline: wedding.rsvpDeadline?.toISOString() ?? null,
        }}
      />
    </main>
  )
}
