import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import PageHeader from "@/components/ui/page-header"
import GroupInvitationManager from "@/components/wedding/group-invitation-manager"
import { groupCheckInCode } from "@/lib/group-invitations"
import { prisma } from "@/lib/prisma"
import { isWeddingExpired } from "@/lib/wedding-lifecycle"

export default async function GroupInvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const { id } = await params
  const wedding = await prisma.wedding.findFirst({
    where: { id, workspace: { members: { some: { userId: session.user.id } } } },
    select: {
      id: true,
      name: true,
      date: true,
      timezone: true,
      published: true,
      groupInvitations: {
        orderBy: { createdAt: "desc" },
        select: { id: true, label: true, browserHash: true, revokedAt: true, checkedInAt: true },
      },
    },
  })
  if (!wedding) notFound()

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <Link className="text-sm font-medium text-gold-700" href={`/dashboard/weddings/${id}`}>
        Back to wedding
      </Link>
      <PageHeader eyebrow="Invitation and arrival" title="Group invitations" description={wedding.name} />
      {!wedding.published && (
        <p className="rounded-xl bg-ivory-100 p-4 text-sm">
          Guests can open these links after you{" "}
          <Link href={`/dashboard/weddings/${id}/invite`} className="font-semibold underline">publish the invitation</Link>.
        </p>
      )}
      <GroupInvitationManager
        weddingId={id}
        readOnly={isWeddingExpired(wedding)}
        groups={wedding.groupInvitations.map(group => ({
          id: group.id,
          label: group.label,
          code: groupCheckInCode(group.id),
          claimed: Boolean(group.browserHash),
          revoked: Boolean(group.revokedAt),
          checkedInAt: group.checkedInAt?.toISOString() ?? null,
        }))}
      />
    </main>
  )
}
