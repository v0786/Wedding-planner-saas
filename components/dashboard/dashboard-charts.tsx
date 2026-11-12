"use client"

import { useState } from "react"
import BarChart from "@/components/ui/bar-chart"
import LineChart from "@/components/ui/line-chart"
import { Card, CardBody, CardHeader } from "@/components/ui/card"

type CountPoint = { day: string; count: number }

const dateLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })
const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })

export default function DashboardCharts({
  rsvpDays,
  guestWeeks,
  guestMonths,
}: {
  rsvpDays: CountPoint[]
  guestWeeks: CountPoint[]
  guestMonths: CountPoint[]
}) {
  const [rsvpRange, setRsvpRange] = useState(7)
  const [guestRange, setGuestRange] = useState("6")
  const interval = rsvpRange === 7 ? 1 : rsvpRange / 6
  const visibleRsvpDays = rsvpDays.slice(-rsvpRange)
  const rsvpTrend = Array.from({ length: Math.ceil(visibleRsvpDays.length / interval) }, (_, index) => {
    const days = visibleRsvpDays.slice(index * interval, (index + 1) * interval)
    return {
      label: dateLabel.format(new Date(days[days.length - 1].day)),
      value: days.reduce((total, day) => total + day.count, 0),
    }
  })

  const guestGrowth = (guestRange === "all" ? guestMonths : guestWeeks.slice(-Number(guestRange))).map(({ day, count }) => ({
    label: (guestRange === "all" ? monthLabel : dateLabel).format(new Date(day)),
    value: count,
  }))

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader
          title="RSVP Trend"
          description={interval === 1 ? "New responses per day, IST" : `New responses per ${interval} days ending on the date shown, IST`}
          actions={
            <select
              aria-label="RSVP trend range"
              className="select w-auto py-1.5 text-xs"
              value={rsvpRange}
              onChange={(event) => setRsvpRange(Number(event.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          }
        />
        <CardBody className="overflow-x-auto">
          <BarChart data={rsvpTrend} height={240} className="min-w-72" />
        </CardBody>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader
          title="Guest Growth"
          description={guestRange === "all" ? "Cumulative guest records by month, IST" : "Cumulative guest records by week starting on Monday, IST"}
          actions={
            <select
              aria-label="Guest growth range"
              className="select w-auto py-1.5 text-xs"
              value={guestRange}
              onChange={(event) => setGuestRange(event.target.value)}
            >
              <option value="6">Last 6 weeks</option>
              <option value="12">Last 12 weeks</option>
              <option value="all">All time</option>
            </select>
          }
        />
        <CardBody>
          <LineChart data={guestGrowth} height={200} fillColor="rgba(178, 143, 76, 0.12)" showPoints={guestGrowth.length <= 12} />
          <div className="mt-2 flex justify-between gap-2 text-xs text-ink-500">
            <span>{guestGrowth[0]?.label}</span>
            <span>{guestGrowth.at(-1)?.label}</span>
          </div>
          <details className="mt-3 text-sm text-ink-600">
            <summary className="cursor-pointer">Guest counts by period</summary>
            <dl className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {guestGrowth.map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt>{label}</dt>
                  <dd>{value.toLocaleString("en-IN")}</dd>
                </div>
              ))}
            </dl>
          </details>
        </CardBody>
      </Card>
    </div>
  )
}
