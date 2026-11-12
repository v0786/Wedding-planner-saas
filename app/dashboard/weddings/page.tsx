import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ButtonLink } from "@/components/ui/button"
import EmptyState from "@/components/ui/empty-state"
import PageHeader from "@/components/ui/page-header"
import WeddingCards, { weddingCardCounts } from "@/components/wedding/wedding-cards"

export const metadata = { title: "Weddings | Wedding Guest Manager" }

const PAGE_SIZE = 24

export default async function WeddingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  })
  const where = { workspaceId: membership?.workspaceId ?? "" }
  const total = await prisma.wedding.count({ where })
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const { page: requestedPage } = await searchParams
  const page = typeof requestedPage === "string" && /^\d+$/.test(requestedPage)
    ? Math.min(Math.max(1, Number(requestedPage)), lastPage)
    : 1

  const weddings = total > 0 ? await prisma.wedding.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { _count: { select: weddingCardCounts } },
  }) : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Weddings"
        description="Manage the weddings in your workspace."
        actions={<ButtonLink href="/dashboard/weddings/new">New Wedding</ButtonLink>}
      />
      {weddings.length ? (
        <WeddingCards weddings={weddings} />
      ) : (
        <EmptyState
          title="No weddings yet"
          description="Create your first wedding to start managing guests and RSVPs."
          action={<ButtonLink href="/dashboard/weddings/new">Create a wedding</ButtonLink>}
        />
      )}
      {lastPage > 1 && (
        <nav className="flex flex-wrap items-center gap-4" aria-label="Weddings pages">
          {page > 1 && <ButtonLink href={`/dashboard/weddings?page=${page - 1}`} variant="secondary">Previous</ButtonLink>}
          <span className="text-sm text-ink-600">Page {page} of {lastPage}</span>
          {page < lastPage && <ButtonLink href={`/dashboard/weddings?page=${page + 1}`} variant="secondary">Next</ButtonLink>}
        </nav>
      )}
    </div>
  )
}
