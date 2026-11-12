import { describe, it, expect, beforeAll, afterAll } from "@jest/globals"
import { prisma } from "@/lib/prisma"
import { submitRsvp as submit, getEditableRsvp, createRsvpTransfer, consumeRsvpTransfer } from "@/lib/rsvp-service"
import { generateEditToken, hashEditToken } from "@/lib/tokens"
import { getWeddingAccess } from "@/lib/wedding-access"
import { createGroupInvitationToken, groupInvitationCookieName } from "@/lib/group-invitations"
import { issueRsvpPhoneProof } from "@/lib/rsvp-otp"
import { RSVP_BROWSER_COOKIE } from "@/lib/rsvp-browser"

const browserToken = generateEditToken()
const otherBrowserToken = generateEditToken()
const browser = { get: (name: string) => name === RSVP_BROWSER_COOKIE ? { value: browserToken } : undefined }
const submitRsvp = (payload: unknown) => submit(payload, prisma, undefined, browser)

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

  it("protects an existing RSVP against a repeat submission without its edit link", async () => {
    await submitRsvp({ ...payload, mobile: "9876500005", answers: requiredAnswer })
    const before = await prisma.guest.count({ where: { weddingId } })
    await expect(submitRsvp({
      ...payload,
      mobile: "+91 9876500005",
      fullName: "Unwanted Replacement",
      answers: requiredAnswer,
    })).rejects.toMatchObject({ status: 409 })

    expect(await prisma.guest.count({ where: { weddingId } })).toBe(before)
    const guest = await prisma.guest.findFirst({ where: { weddingId, mobile: "9876500005" } })
    expect(guest?.firstName).toBe("Aarav")
  })

  it("loads an RSVP by edit token and rejects a wrong token", async () => {
    const response = await submitRsvp({
      ...payload,
      mobile: "9876500002",
      eventResponses: {},
      answers: requiredAnswer,
    })

    const loaded = await getEditableRsvp(inviteToken, response.editToken, browserToken)
    expect(loaded?.id).toBe(response.submissionId)

    const invalid = await getEditableRsvp(inviteToken, "not-a-valid-edit-token", browserToken)
    expect(invalid).toBeNull()
    expect(await getEditableRsvp(inviteToken, response.editToken, otherBrowserToken)).toBeNull()
  })

  it("transfers editing exactly once and revokes the previous browser", async () => {
    const response = await submitRsvp({ ...payload, mobile: "9876500006", answers: requiredAnswer })
    await expect(createRsvpTransfer(inviteToken, response.editToken, otherBrowserToken))
      .rejects.toMatchObject({ status: 404 })
    const expired = await createRsvpTransfer(inviteToken, response.editToken, browserToken, new Date("2020-01-01"))
    expect(await consumeRsvpTransfer(expired.transferToken, otherBrowserToken)).toBeNull()

    const transfer = await createRsvpTransfer(inviteToken, response.editToken, browserToken)
    await expect(consumeRsvpTransfer(transfer.transferToken, browserToken)).rejects.toMatchObject({ status: 409 })
    const [first, second] = await Promise.all([
      consumeRsvpTransfer(transfer.transferToken, otherBrowserToken),
      consumeRsvpTransfer(transfer.transferToken, otherBrowserToken),
    ])
    const claimed = first ?? second
    expect(Number(Boolean(first)) + Number(Boolean(second))).toBe(1)
    expect(await getEditableRsvp(inviteToken, response.editToken, browserToken)).toBeNull()
    expect(await getEditableRsvp(inviteToken, claimed!.editToken, otherBrowserToken))
      .toMatchObject({ id: response.submissionId, fullName: payload.fullName })
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

    const stillLoadable = await getEditableRsvp(inviteToken, response.editToken, browserToken)
    expect(stillLoadable?.fullName).toBe("Edited Guest")
  })

  it("rejects a submission after the wedding deadline", async () => {
    await expect(
      submitRsvp({ ...payload, token: pastInviteToken, mobile: "9876500003" }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it("never revives the original group edit link when access returns to a previous browser", async () => {
    const groupToken = createGroupInvitationToken()
    const groupBrowserToken = generateEditToken()
    const group = await prisma.groupInvitation.create({
      data: { weddingId, label: "Transfer cycle", tokenHash: groupToken.tokenHash, browserHash: hashEditToken(groupBrowserToken) },
    })
    const cookieStore = {
      get(name: string) {
        if (name === RSVP_BROWSER_COOKIE) return { value: browserToken }
        if (name === groupInvitationCookieName(group.id)) return { value: groupBrowserToken }
        return undefined
      },
    }
    const response = await submit({ ...payload, token: groupToken.token, mobile: "9876500010", answers: requiredAnswer }, prisma, undefined, cookieStore)
    const forward = await createRsvpTransfer(response.editInvitationToken, response.editToken, browserToken)
    const moved = await consumeRsvpTransfer(forward.transferToken, otherBrowserToken)
    expect(moved).toBeTruthy()
    const backward = await createRsvpTransfer(moved!.locator, moved!.editToken, otherBrowserToken)
    const returned = await consumeRsvpTransfer(backward.transferToken, browserToken)
    expect(returned).toBeTruthy()
    expect(returned!.editToken).not.toBe(response.editToken)
    expect(await getEditableRsvp(response.editInvitationToken, response.editToken, browserToken)).toBeNull()
    expect(await getEditableRsvp(returned!.locator, returned!.editToken, browserToken)).toMatchObject({ id: response.submissionId })
  })

  it("preserves an omitted response after its event closes and rejects changes to that event", async () => {
    const closed = await prisma.event.create({ data: { weddingId, name: "Closing event" } })
    const open = await prisma.event.create({ data: { weddingId, name: "Open event" } })
    const response = await submitRsvp({ ...payload, mobile: "9876500011", eventResponses: { [closed.id]: "yes" }, answers: requiredAnswer })
    await prisma.event.update({ where: { id: closed.id }, data: { rsvpDeadline: new Date("2020-01-01") } })
    await submitRsvp({ ...payload, mobile: "9876500011", editToken: response.editToken, eventResponses: { [open.id]: "yes" }, answers: requiredAnswer })
    const responses = await prisma.rsvpEventResponse.findMany({ where: { rsvpSubmissionId: response.submissionId } })
    expect(responses).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventId: closed.id, status: "yes" }),
      expect.objectContaining({ eventId: open.id, status: "yes" }),
    ]))
    await expect(submitRsvp({ ...payload, mobile: "9876500011", editToken: response.editToken, eventResponses: { [closed.id]: "no" }, answers: requiredAnswer }))
      .rejects.toMatchObject({ status: 400 })
  })

  it("consumes a phone proof only with a committed RSVP and refuses reuse", async () => {
    const mobile = "9876500012"
    const phoneProof = issueRsvpPhoneProof({ invitationToken: inviteToken, mobile, browserToken })
    const response = await submitRsvp({ ...payload, mobile, phoneProof, answers: requiredAnswer })
    expect(response.submissionId).toBeTruthy()
    await expect(submitRsvp({ ...payload, mobile, phoneProof, answers: requiredAnswer })).rejects.toMatchObject({ status: 403 })
    expect(await prisma.rateLimit.count({ where: { key: `rsvp-proof-use:${hashEditToken(phoneProof)}` } })).toBe(1)
    await prisma.rateLimit.deleteMany({ where: { key: `rsvp-proof-use:${hashEditToken(phoneProof)}` } })
  })

  it("enforces workspace tenant isolation", async () => {
    expect(await getWeddingAccess(weddingId, ownerId)).not.toBeNull()
    expect(await getWeddingAccess(weddingId, otherId)).toBeNull()
    expect(await getWeddingAccess(pastWeddingId, otherId)).toBeNull()
  })
})
