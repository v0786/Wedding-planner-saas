import { prisma } from "@/lib/prisma"
import { expectedRsvpAttendance, rsvpPartySize } from "@/lib/rsvp-attendance"

export async function getWeddingReport(weddingId: string) {
  const [events, guests, submissions] = await Promise.all([
    prisma.event.findMany({ where: { weddingId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: { id: true, name: true } }),
    prisma.guest.findMany({ where: { weddingId }, select: { id: true, group: true } }),
    prisma.rsvpSubmission.findMany({
      where: { weddingId },
      select: {
        guestId: true, status: true, partySize: true, dietaryPrefs: true,
        familyMembers: { select: { dietaryPrefs: true } },
        eventResponses: { select: { eventId: true, status: true } },
      },
    }),
  ])

  const summary = {
    invited: guests.length,
    responses: submissions.length,
    responseRate: guests.length ? Math.round(submissions.length * 100 / guests.length) : 0,
    confirmed: 0,
    pending: 0,
    declined: 0,
    maybe: 0,
    confirmedHeadcount: 0,
    totalHeadcount: 0,
  }
  const dietary = new Map<string, number>()
  const groups = new Map<string, { guests: number; responded: number; headcount: number }>()
  const groupByGuest = new Map<string, { guests: number; responded: number; headcount: number }>()
  const attendance = events.map((event) => ({ ...event, yes: 0, no: 0, unsure: 0 }))
  const attendanceByEvent = new Map(attendance.map((event) => [event.id, event]))

  for (const guest of guests) {
    const key = guest.group?.trim() || "Ungrouped"
    const group = groups.get(key) ?? { guests: 0, responded: 0, headcount: 0 }
    group.guests += 1
    groups.set(key, group)
    groupByGuest.set(guest.id, group)
  }

  function addDiet(value: string | null, count = 1) {
    const label = value?.trim()
    if (label) dietary.set(label, (dietary.get(label) ?? 0) + count)
  }

  for (const submission of submissions) {
    const partySize = rsvpPartySize(submission)
    const headcount = expectedRsvpAttendance(submission)
    summary.totalHeadcount += headcount
    if (submission.status === "confirmed") {
      summary.confirmed += 1
      summary.confirmedHeadcount += headcount
    } else if (submission.status === "pending") {
      summary.pending += 1
    } else if (submission.status === "declined") {
      summary.declined += 1
    } else if (submission.status === "maybe") {
      summary.maybe += 1
    }

    if (headcount > 0) {
      // Unnamed companions share the respondent's group dietary preference.
      const unnamedCompanions = Math.max(0, partySize - 1 - submission.familyMembers.length)
      addDiet(submission.dietaryPrefs, 1 + unnamedCompanions)
      for (const member of submission.familyMembers) addDiet(member.dietaryPrefs ?? submission.dietaryPrefs)
    }

    const group = groupByGuest.get(submission.guestId)
    if (group) {
      group.responded += 1
      group.headcount += headcount
    }

    for (const response of submission.eventResponses) {
      const event = attendanceByEvent.get(response.eventId)
      if (!event) continue
      if (submission.status === "declined" || response.status === "no") event.no += partySize
      else if (submission.status === "confirmed" && response.status === "yes") event.yes += partySize
      else event.unsure += partySize
    }
  }

  summary.pending += Math.max(0, summary.invited - summary.responses)
  return { summary, attendance, dietary: [...dietary.entries()].sort((a, b) => b[1] - a[1]), groups }
}
