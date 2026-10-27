import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import InviteLinkManager from "@/components/wedding/invite-link-manager"

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const { id } = await params

  const wedding = await prisma.wedding.findUnique({
    where: { id },
    include: {
      workspace: {
        include: {
          members: { where: { userId: session.user.id } },
        },
      },
    },
  })

  if (!wedding || wedding.workspace.members.length === 0) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Invitation Link</h1>
        <InviteLinkManager wedding={wedding} />
      </div>
    </div>
  )
}
