type AttendanceResponse = {
  status: string
  partySize?: number | null
  familyMembers: ReadonlyArray<unknown>
}

/** Older responses count the respondent plus named family members. */
export function rsvpPartySize(response: AttendanceResponse): number {
  return response.partySize ?? 1 + response.familyMembers.length
}

export function expectedRsvpAttendance(response: AttendanceResponse): number {
  return response.status === "confirmed" ? rsvpPartySize(response) : 0
}
