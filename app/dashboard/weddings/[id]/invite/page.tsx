import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import InviteLinkManager from "@/components/wedding/invite-link-manager"
import Link from "next/link"

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const { id } = await params

  const wedding = await prisma.wedding.findFirst({
    where: { id, workspace: { members: { some: { userId: session.user.id } } } },
    select: { id: true, name: true, invitationToken: true, published: true },
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
      <h1 className="mb-6 mt-3 text-2xl font-bold text-gray-900">Invitation Link</h1>
      <InviteLinkManager wedding={wedding} />
    </main>
  )
}
