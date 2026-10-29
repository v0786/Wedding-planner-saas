import { NextResponse } from "next/server"
import { assertSameOrigin, handleApiError, jsonError } from "@/lib/api"
import { getEditableRsvp } from "@/lib/rsvp-service"

/** Loads an existing RSVP for the guest edit screen. The token is the credential. */
export async function GET(req: Request) {
  try {
    assertSameOrigin(req)
    const url = new URL(req.url)
    const invitationToken = url.searchParams.get("invitationToken") ?? ""
    const editToken = url.searchParams.get("editToken") ?? ""

    const rsvp = await getEditableRsvp(invitationToken, editToken)
    if (!rsvp) return jsonError("This RSVP edit link is invalid or has expired", 404)

    return NextResponse.json({
      rsvp: {
        fullName: rsvp.fullName,
        mobile: rsvp.mobile,
        dietaryPrefs: rsvp.dietaryPrefs,
        familyMembers: rsvp.familyMembers.map((member) => ({
          fullName: member.fullName,
          relation: member.relation ?? "",
          age: member.age,
          dietaryPrefs: member.dietaryPrefs ?? "",
        })),
        eventResponses: Object.fromEntries(
          rsvp.eventResponses.map((response) => [response.eventId, response.status]),
        ),
        answers: rsvp.answers.map((answer) => ({
          questionId: answer.questionId,
          value: answer.value,
        })),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
