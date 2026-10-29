import { describe, it, expect, beforeAll, afterAll } from "@jest/globals"
import { prisma } from "@/lib/prisma"
import { submitRsvp, getEditableRsvp } from "@/lib/rsvp-service"
import { hashEditToken } from "@/lib/tokens"
import { getWeddingAccess } from "@/lib/wedding-access"

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const ownerEmail = `owner-${suffix}@example.com`
const otherEmail = `other-${suffix}@example.com`
const inviteToken = `invite-${suffix}`
const pastInviteToken = `past-${suffix}`

let ownerId: string
let otherId: string
let workspaceId: string
let weddingId: string
let eventId: string
let pastWeddingId: string
let mealQuestionId: string

beforeAll(async () => {
  const owner = await prisma.user.create({ data: { email: ownerEmail, name: "Owner" } })
  const other = await prisma.user.create({ data: { email: otherEmail, name: "Other" } })
  ownerId = owner.id
  otherId = other.id

  const workspace = await prisma.workspace.create({
    data: {
      name: `Test workspace ${suffix}`,
      members: { create: { userId: owner.id, role: "owner" } },
    },
  })
  workspaceId = workspace.id

  const wedding = await prisma.wedding.create({
    data: {
      workspaceId,
      name: "Integration Wedding",
      coupleName1: "Rahul",
      coupleName2: "Priya",
      invitationToken: inviteToken,
      published: true,
      events: {
        create: [
          { name: "Haldi", order: 1 },
          { name: "Wedding", order: 2 },
        ],
      },
      customQuestions: {
        create: [
          {
            question: "Meal preference",
            type: "select",
            options: ["Vegetarian", "Non-vegetarian"],
            required: true,
          },
        ],
      },
    },
    include: { events: true },
  })
  weddingId = wedding.id
  eventId = wedding.events.find((event) => event.name === "Wedding")!.id
  const mealQuestion = await prisma.customQuestion.findFirst({ where: { weddingId } })
  mealQuestionId = mealQuestion!.id

  const pastWedding = await prisma.wedding.create({
    data: {
      workspaceId,
      name: "Past Wedding",
      coupleName1: "A",
      invitationToken: pastInviteToken,
      published: true,
      rsvpDeadline: new Date("2020-01-01T00:00:00Z"),
    },
  })
  pastWeddingId = pastWedding.id
})

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: workspaceId } })
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } })
  await prisma.$disconnect()
})

const payload = {
  token: inviteToken,
  fullName: "Aarav Sharma",
  mobile: "9876500001",
  dietaryPrefs: "Vegetarian",
  familyMembers: [
    { fullName: "Ananya Sharma", relation: "Spouse", age: "30", dietaryPrefs: "Vegetarian" },
  ],
  eventResponses: {},
  answers: [] as Array<{ questionId: string; value: string }>,
}

/** Required custom questions must always be answered. */
const requiredAnswer = [{ get questionId() { return mealQuestionId }, value: "Vegetarian" }]

describe("RSVP integration", () => {
  it("persists guest, family, event responses and answers in one transaction", async () => {
    const question = await prisma.customQuestion.findFirst({ where: { weddingId } })
    const response = await submitRsvp({
      ...payload,
      eventResponses: { [eventId]: "yes" },
      answers: [{ questionId: question!.id, value: "Vegetarian" }],
    })

    const submission = await prisma.rsvpSubmission.findUnique({
      where: { id: response.submissionId },
      include: { familyMembers: true, eventResponses: true, answers: true, guest: true },
    })

    expect(submission?.status).toBe("confirmed")
    expect(submission?.guest.mobile).toBe("9876500001")
    expect(submission?.familyMembers).toHaveLength(1)
    expect(submission?.eventResponses[0]).toMatchObject({ eventId, status: "yes" })
    expect(submission?.answers[0].value).toBe("Vegetarian")
    expect(submission?.editTokenHash).toBe(hashEditToken(response.editToken))
  })

  it("updates instead of duplicating on a repeat submission with the same mobile", async () => {
    const before = await prisma.guest.count({ where: { weddingId } })
    const response = await submitRsvp({
      ...payload,
      fullName: "Aarav S. Sharma",
      eventResponses: {},
      answers: requiredAnswer,
    })
    const after = await prisma.guest.count({ where: { weddingId } })
    const submissions = await prisma.rsvpSubmission.count({ where: { weddingId } })

    expect(after).toBe(before)
    expect(response.submissionId).toBeTruthy()
    expect(submissions).toBeGreaterThanOrEqual(1)
    const guest = await prisma.guest.findFirst({ where: { weddingId, mobile: "9876500001" } })
    expect(guest?.firstName).toBe("Aarav")
  })

  it("loads an RSVP by edit token and rejects a wrong token", async () => {
    const response = await submitRsvp({
      ...payload,
      mobile: "9876500002",
      eventResponses: {},
      answers: requiredAnswer,
    })

    const loaded = await getEditableRsvp(inviteToken, response.editToken)
    expect(loaded?.id).toBe(response.submissionId)

    const invalid = await getEditableRsvp(inviteToken, "not-a-valid-edit-token")
    expect(invalid).toBeNull()
  })

  it("edits an RSVP with the edit token and keeps the token valid", async () => {
    const response = await submitRsvp({
      ...payload,
      mobile: "9876500004",
      eventResponses: {},
      answers: requiredAnswer,
    })

    const edited = await submitRsvp({
      ...payload,
      mobile: "9876500004",
      fullName: "Edited Guest",
      editToken: response.editToken,
      eventResponses: { [eventId]: "no" },
      answers: requiredAnswer,
    })

    expect(edited.submissionId).toBe(response.submissionId)
    expect(edited.editToken).toBe(response.editToken)

    const stillLoadable = await getEditableRsvp(inviteToken, response.editToken)
    expect(stillLoadable?.fullName).toBe("Edited Guest")
  })

  it("rejects a submission after the wedding deadline", async () => {
    await expect(
      submitRsvp({ ...payload, token: pastInviteToken, mobile: "9876500003" }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it("enforces workspace tenant isolation", async () => {
    expect(await getWeddingAccess(weddingId, ownerId)).not.toBeNull()
    expect(await getWeddingAccess(weddingId, otherId)).toBeNull()
    expect(await getWeddingAccess(pastWeddingId, otherId)).toBeNull()
  })
})
