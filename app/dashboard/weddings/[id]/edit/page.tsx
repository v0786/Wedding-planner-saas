import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import EditWeddingForm from "@/components/wedding/edit-wedding-form"
import Link from "next/link"

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
        className="text-sm text-indigo-600 hover:text-indigo-500"
      >
        ← Back to wedding
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold text-gray-900">Edit Wedding</h1>
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
