import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import StatCard from "@/components/ui/stat-card"
import DashboardCharts from "@/components/dashboard/dashboard-charts"
import ActivityFeed from "@/components/ui/activity-feed"
import PageHeader from "@/components/ui/page-header"
import EmptyState from "@/components/ui/empty-state"
import { ButtonLink } from "@/components/ui/button"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import WeddingCards, { weddingCardCounts } from "@/components/wedding/wedding-cards"
import { getDashboardMetrics } from "@/lib/dashboard-metrics"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  })
  const workspaceId = membership?.workspaceId

  const [weddings, recentActivity, metrics] = workspaceId ? await Promise.all([
    prisma.wedding.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { _count: { select: weddingCardCounts } },
    }),
    getRecentActivity(workspaceId, session.user.id),
    getDashboardMetrics(workspaceId),
  ]) : [[], [], null]

  const { totalWeddings, totalGuests, totalRSVPs, totalEvents } = metrics?.totals ?? {
    totalWeddings: 0,
    totalGuests: 0,
    totalRSVPs: 0,
    totalEvents: 0,
  }

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <PageHeader
        eyebrow="Overview"
        title={
          <>
            Welcome back, {session.user.name?.split(" ")[0] || "Host"}!
          </>
        }
        description={"Here's what's happening with your weddings today."}
        actions={
          <>
            <ButtonLink href="/dashboard/billing" variant="secondary">Manage billing</ButtonLink>
            <ButtonLink href="/dashboard/weddings/new" variant="primary">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Wedding
            </ButtonLink>
          </>
        }
      />

      {/* Stats Grid */}
      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Weddings"
          value={totalWeddings}
          subLabel={totalWeddings === 1 ? "wedding" : "weddings"}
          color="gold"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9v2a1 1 0 100 2h2a1 1 0 100-2H9V7a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
            </svg>
          }
        />
        <StatCard
          label="Total Guests"
          value={totalGuests.toLocaleString()}
          subLabel="across all weddings"
          color="sage"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0v6v1h18v-1a6 6 0 00-12 0v-1z" />
            </svg>
          }
        />
        <StatCard
          label="RSVP Responses"
          value={totalRSVPs.toLocaleString()}
          subLabel="submitted across all weddings"
          color="champagne"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Events Planned"
          value={totalEvents}
          subLabel="across all weddings"
          color="ink"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {metrics && <DashboardCharts rsvpDays={metrics.rsvpDays} guestWeeks={metrics.guestWeeks} guestMonths={metrics.guestMonths} />}

      {/* Bottom Row: Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="overflow-hidden">
          <CardHeader title="Quick Actions" />
          <CardBody className="space-y-2">
            <QuickAction
              href="/dashboard/weddings/new"
              title="Create Wedding"
              description="Start planning a new celebration"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </QuickAction>

            <QuickAction
              href="/dashboard/weddings"
              title="View All Weddings"
              description="Manage your celebrations"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9v2a1 1 0 100 2h2a1 1 0 100-2H9V7a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V5z"
              />
            </QuickAction>

            <QuickAction
              href="/dashboard/reports"
              title="View Reports"
              description="Analytics & insights"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15M7.5 16V9m4.5 7V4.5m4.5 11.5v-5" />
            </QuickAction>

            <QuickAction
              href="/faq"
              title="Help & FAQ"
              description="Answers to common questions"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75m0 3h.008v.008H12v-.008z"
              />
            </QuickAction>
          </CardBody>
        </Card>

        {/* Recent Activity - spans 2 columns */}
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader
            title="Recent Activity"
            actions={
              <Link
                href="/dashboard/reports"
                className="text-sm font-medium text-gold-700 transition-colors hover:text-gold-600"
              >
                View all
              </Link>
            }
          />
          <CardBody>
            <ActivityFeed
              activities={recentActivity}
              maxItems={8}
              showTimestamp={true}
            />
          </CardBody>
        </Card>
      </div>

      {/* Upcoming Weddings */}
      {weddings.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader
            title="Your Weddings"
            actions={
              <Link
                href="/dashboard/weddings"
                className="text-sm font-medium text-gold-700 transition-colors hover:text-gold-600"
              >
                View all
              </Link>
            }
          />
          <CardBody>
            <WeddingCards weddings={weddings} />
          </CardBody>
        </Card>
      )}

      {/* Empty State */}
      {weddings.length === 0 && (
        <EmptyState
          icon={
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9v2a1 1 0 100 2h2a1 1 0 100-2H9V7a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
            </svg>
          }
          title="No weddings yet"
          description="Create your first wedding to start managing guests and RSVPs."
          action={
            <ButtonLink href="/dashboard/weddings/new" variant="primary">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Your First Wedding
            </ButtonLink>
          }
        />
      )}
    </div>
  )
}

function QuickAction({
  href,
  title,
  description,
  children,
}: {
  href: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-ivory-300/70 bg-white/70 p-4 transition-all duration-300 ease-refined hover:-translate-y-0.5 hover:border-gold-300 hover:bg-champagne-100/40 hover:shadow-soft"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-champagne-100 text-gold-700 transition-colors duration-300 group-hover:bg-gold-200/70">
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.7}
          aria-hidden="true"
        >
          {children}
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base text-ink-800 transition-colors group-hover:text-gold-700">
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-ink-500">{description}</span>
      </span>
      <svg
        className="h-4 w-4 shrink-0 text-ink-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-gold-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

async function getRecentActivity(workspaceId: string, userId: string) {
  const activities = await prisma.auditLog.findMany({
    where: { userId, wedding: { workspaceId } },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  return activities.map((log) => ({
    id: log.id,
    type: (log.action.includes("wedding") ? "wedding" :
          log.action.includes("guest") ? "guest" :
          log.action.includes("event") ? "event" :
          log.action.includes("question") ? "question" : "rsvp") as
          "wedding" | "guest" | "event" | "question" | "rsvp",
    title: log.action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: log.details ? JSON.stringify(log.details) : "Action performed",
    timestamp: log.createdAt,
    status: "success" as const,
    link: `/dashboard/weddings/${log.weddingId}`,
  }))
}
