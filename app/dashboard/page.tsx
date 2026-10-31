import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import StatCard from "@/components/ui/stat-card"
import BarChart from "@/components/ui/bar-chart"
import LineChart from "@/components/ui/line-chart"
import ActivityFeed from "@/components/ui/activity-feed"
import PageHeader from "@/components/ui/page-header"
import EmptyState from "@/components/ui/empty-state"
import { ButtonLink } from "@/components/ui/button"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import Badge from "@/components/ui/badge"
import { getEntitlements, getUsageSummary } from "@/lib/subscriptions/service"
import { priceLabel } from "@/lib/subscriptions/config"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  // Fetch membership first
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: {
      workspace: {
        include: {
          weddings: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              _count: { select: { guests: true, rsvpSubmissions: true, events: true } },
            }
          }
        },
      },
    },
  })

  // Then fetch activity and plan information in parallel
  const workspaceId = membership?.workspaceId
  const [recentActivity, entitlements, usageSummary] = await Promise.all([
    getRecentActivity(session.user.id),
    workspaceId ? getEntitlements(workspaceId).catch(() => null) : Promise.resolve(null),
    workspaceId ? getUsageSummary(workspaceId).catch(() => null) : Promise.resolve(null),
  ])

  const weddings = membership?.workspace.weddings ?? []
  const totalWeddings = weddings.length
  const totalGuests = weddings.reduce((sum, w) => sum + w._count.guests, 0)
  const totalRSVPs = weddings.reduce((sum, w) => sum + w._count.rsvpSubmissions, 0)
  const totalEvents = weddings.reduce((sum, w) => sum + w._count.events, 0)

  // Mock chart data - replace with real data queries
  const rsvpTrendData = [
    { label: "Mon", value: 12 },
    { label: "Tue", value: 19 },
    { label: "Wed", value: 8 },
    { label: "Thu", value: 24 },
    { label: "Fri", value: 31 },
    { label: "Sat", value: 15 },
    { label: "Sun", value: 8 },
  ]

  const guestGrowthData = [
    { label: "Week 1", value: 45 },
    { label: "Week 2", value: 78 },
    { label: "Week 3", value: 120 },
    { label: "Week 4", value: 165 },
    { label: "Week 5", value: 210 },
    { label: "Week 6", value: 267 },
  ]

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
          <ButtonLink href="/dashboard/weddings/new" variant="primary">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Wedding
          </ButtonLink>
        }
      />

      {/* Plan & Usage */}
      {entitlements && (
        <section className="card-elevated overflow-hidden">
          <div className="paper-texture border-b border-ivory-200 bg-champagne-100/50 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="eyebrow">Current plan</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-display-xs text-ink-800">{entitlements.plan.name}</h2>
                  <Badge tone={entitlements.status === "ACTIVE" ? "success" : "warning"}>
                    {entitlements.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-ink-600">{priceLabel(entitlements.plan)}</p>
                {entitlements.currentPeriodEnd && entitlements.status === "ACTIVE" && (
                  <p className="mt-1 text-xs text-ink-500">
                    Renews/ends {entitlements.currentPeriodEnd.toISOString().slice(0, 10)}
                    {entitlements.cancelAtPeriodEnd ? " (cancels at period end)" : ""}
                  </p>
                )}
                {entitlements.pendingPlanCode && (
                  <p className="mt-1 text-xs text-gold-700">
                    Scheduled change to {entitlements.pendingPlanCode} at period end
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <ButtonLink href="/pricing" variant="secondary" size="sm">
                  Compare plans
                </ButtonLink>
                <ButtonLink href="/dashboard/billing" variant="primary" size="sm">
                  Manage billing
                </ButtonLink>
              </div>
            </div>
          </div>
          {usageSummary && (
            <div className="grid grid-cols-1 gap-3 px-6 py-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
              <UsageTile
                label="Weddings"
                current={usageSummary.workspaceUsage.weddings}
                limit={entitlements.limits.weddings}
              />
              {usageSummary.perWedding[0] && (
                <>
                  <UsageTile
                    label={`Guests (${usageSummary.perWedding[0].weddingName})`}
                    current={usageSummary.perWedding[0].usage.guests}
                    limit={entitlements.limits.guestsPerWedding}
                  />
                  <UsageTile
                    label="Events"
                    current={usageSummary.perWedding[0].usage.events}
                    limit={entitlements.limits.eventsPerWedding}
                  />
                  <UsageTile
                    label="Custom questions"
                    current={usageSummary.perWedding[0].usage.customQuestions}
                    limit={entitlements.limits.customQuestionsPerWedding}
                  />
                </>
              )}
            </div>
          )}
        </section>
      )}

      {/* Stats Grid */}
      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Weddings"
          value={totalWeddings}
          subLabel={totalWeddings === 1 ? "wedding" : "weddings"}
          trend={12}
          trendLabel="vs last month"
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
          subLabel="invited across all weddings"
          trend={8}
          trendLabel="this week"
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
          subLabel="confirmed & pending"
          trend={5}
          trendLabel="this week"
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
          trend={0}
          trendLabel="no change"
          color="ink"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader
            title="RSVP Trend (Last 7 Days)"
            actions={
              <select
                aria-label="RSVP trend range"
                className="select w-auto py-1.5 text-xs"
              >
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            }
          />
          <CardBody>
            <BarChart
              data={rsvpTrendData.map((point) => ({ ...point, color: "#C9A961" }))}
              height={280}
              maxValue={40}
            />
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Guest Growth"
            actions={
              <select
                aria-label="Guest growth range"
                className="select w-auto py-1.5 text-xs"
              >
                <option>Last 6 weeks</option>
                <option>Last 12 weeks</option>
                <option>All time</option>
              </select>
            }
          />
          <CardBody>
            <LineChart
              data={guestGrowthData}
              height={280}
              color="#B28F4C"
              fillColor="rgba(178, 143, 76, 0.12)"
            />
          </CardBody>
        </Card>
      </div>

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
                href="/dashboard"
                className="text-sm font-medium text-gold-700 transition-colors hover:text-gold-600"
              >
                View all
              </Link>
            }
          />
          <CardBody>
            <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {weddings.slice(0, 6).map((wedding) => (
                <Link
                  key={wedding.id}
                  href={`/dashboard/weddings/${wedding.id}`}
                  className="group card-inset block p-5 transition-all duration-300 ease-refined hover:-translate-y-0.5 hover:border-gold-300 hover:bg-champagne-100/50 hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-display text-lg text-ink-800 transition-colors group-hover:text-gold-700">
                        {wedding.name}
                      </h4>
                      <p className="mt-1 text-sm text-ink-500">
                        {wedding.coupleName1}
                        {wedding.coupleName2 && ` & ${wedding.coupleName2}`}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        {wedding.date && (
                          <span className="flex items-center gap-1.5 text-xs text-ink-500">
                            <svg
                              className="h-3.5 w-3.5 text-gold-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={1.7}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(wedding.date).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                          </span>
                        )}
                        {wedding.venue && (
                          <span className="flex items-center gap-1.5 text-xs text-ink-500">
                            <svg
                              className="h-3.5 w-3.5 text-gold-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={1.7}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate max-w-[120px]">{wedding.venue}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge tone={wedding.published ? "success" : "neutral"}>
                      {wedding.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-ivory-300/70 pt-4 text-sm text-ink-500">
                    <span>{wedding._count.guests} guests</span>
                    <span>{wedding._count.rsvpSubmissions} RSVPs</span>
                    <span>{wedding._count.events} events</span>
                  </div>
                </Link>
              ))}
            </div>
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

function UsageTile({ label, current, limit }: { label: string; current: number; limit: number | null }) {
  return (
    <div className="card-inset px-4 py-3.5">
      <p className="truncate text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className="mt-1.5 font-display text-xl text-ink-800">
        {current} <span className="text-ink-400">/ {limit === null ? "∞" : limit}</span>
      </p>
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

async function getRecentActivity(userId: string) {
  const activities = await prisma.auditLog.findMany({
    where: { userId },
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
