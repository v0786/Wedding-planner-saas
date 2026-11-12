import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { prisma } from "@/lib/prisma"

const DASHBOARD_TIME_ZONE = "Asia/Kolkata"
const DAY_MS = 86_400_000

type DailyCount = { day: string; count: bigint }
type GuestCount = DailyCount & { unit: "week" | "month" }

function calendarDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS)
}

/** UTC dates are used as calendar labels. The counts themselves are grouped in IST. */
export async function getDashboardMetrics(workspaceId: string, now = new Date()) {
  const today = new Date(formatInTimeZone(now, DASHBOARD_TIME_ZONE, "yyyy-MM-dd"))
  const earliestRsvpDay = addDays(today, -89)
  const earliestRsvpTimestamp = fromZonedTime(`${calendarDate(earliestRsvpDay)}T00:00:00`, DASHBOARD_TIME_ZONE)
    .toISOString().slice(0, -1)
  const wedding = { workspaceId }

  const [totalWeddings, totalEvents, totalRSVPs, rsvpRows, guestRows] = await Promise.all([
    prisma.wedding.count({ where: wedding }),
    prisma.event.count({ where: { wedding } }),
    prisma.rsvpSubmission.count({ where: { wedding } }),
    prisma.$queryRaw<DailyCount[]>`
      SELECT to_char(timezone(${DASHBOARD_TIME_ZONE}, timezone('UTC', rsvp."submittedAt")), 'YYYY-MM-DD') AS day,
             count(*) AS count
      FROM "RsvpSubmission" AS rsvp
      JOIN "Wedding" AS wedding ON wedding.id = rsvp."weddingId"
      WHERE wedding."workspaceId" = ${workspaceId}
        AND rsvp."submittedAt" >= ${earliestRsvpTimestamp}::timestamp
      GROUP BY 1
    `,
    prisma.$queryRaw<GuestCount[]>`
      SELECT bucket.unit, to_char(date_trunc(bucket.unit, guest.local_created_at), 'YYYY-MM-DD') AS day,
             count(*) AS count
      FROM (
        SELECT timezone(${DASHBOARD_TIME_ZONE}, timezone('UTC', guest."createdAt")) AS local_created_at
        FROM "Guest" AS guest
        JOIN "Wedding" AS wedding ON wedding.id = guest."weddingId"
        WHERE wedding."workspaceId" = ${workspaceId}
      ) AS guest
      CROSS JOIN (VALUES ('week'), ('month')) AS bucket(unit)
      GROUP BY 1, 2
      ORDER BY 2
    `,
  ])

  const rsvpByDay = new Map(rsvpRows.map(({ day, count }) => [day, Number(count)]))
  const rsvpDays = Array.from({ length: 90 }, (_, index) => {
    const day = calendarDate(addDays(earliestRsvpDay, index))
    return { day, count: rsvpByDay.get(day) ?? 0 }
  })

  const weekRows = guestRows.filter(({ unit }) => unit === "week")
  const monthRows = guestRows.filter(({ unit }) => unit === "month")
  const monday = addDays(today, -((today.getUTCDay() + 6) % 7))
  const earliestWeek = addDays(monday, -11 * 7)
  const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
  const previousMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1))
  const earliestMonth = new Date(monthRows[0]?.day ?? calendarDate(previousMonth))
  const guestWeeks = cumulativeCounts(weekRows, earliestWeek, monday, (date) => addDays(date, 7))
  const guestMonths = cumulativeCounts(
    monthRows,
    earliestMonth < previousMonth ? earliestMonth : previousMonth,
    month,
    (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)),
  )

  return {
    totals: {
      totalWeddings,
      totalGuests: monthRows.reduce((total, { count }) => total + Number(count), 0),
      totalRSVPs,
      totalEvents,
    },
    rsvpDays,
    guestWeeks,
    guestMonths,
  }
}

function cumulativeCounts(rows: DailyCount[], from: Date, through: Date, next: (date: Date) => Date) {
  const firstDay = calendarDate(from)
  const counts = new Map(rows.map(({ day, count }) => [day, Number(count)]))
  let count = rows.reduce((total, row) => row.day < firstDay ? total + Number(row.count) : total, 0)
  const points = []
  for (let date = from; date <= through; date = next(date)) {
    const day = calendarDate(date)
    count += counts.get(day) ?? 0
    points.push({ day, count })
  }
  return points
}
