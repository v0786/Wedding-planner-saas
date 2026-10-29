import type { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import { hashEditToken, generateEditToken } from "@/lib/tokens"
import { rsvpSchema, type RsvpInput } from "@/lib/validation"

type Db = PrismaClient

export type RsvpResult = {
  submissionId: string
  editToken: string
}

/**
 * Public RSVP submission. All related rows are written in one transaction so a
 * failure never leaves a half-saved guest/family/event response.
 */
export async function submitRsvp(
  raw: unknown,
  db: Db = prisma,
  now: Date = new Date(),
): Promise<RsvpResult> {
  const input: RsvpInput = rsvpSchema.parse(raw)

  const wedding = await db.wedding.findUnique({
    where: { invitationToken: input.token },
    include: {
      events: { select: { id: true, name: true, rsvpDeadline: true } },
      customQuestions: { where: { enabled: true } },
    },
  })

  if (!wedding || !wedding.published) {
    throw new ApiError("This invitation is not available", 404)
  }

  if (wedding.rsvpDeadline && now > wedding.rsvpDeadline) {
    throw new ApiError("The RSVP deadline has passed", 400)
  }

  const eventMap = new Map(wedding.events.map((event) => [event.id, event]))
  for (const eventId of Object.keys(input.eventResponses)) {
    const event = eventMap.get(eventId)
    if (!event) throw new ApiError("One of the selected events is not part of this wedding", 400)
    if (event.rsvpDeadline && now > event.rsvpDeadline) {
      throw new ApiError(`The RSVP deadline for ${event.name} has passed`, 400)
    }
  }

  const questionMap = new Map(wedding.customQuestions.map((question) => [question.id, question]))
  for (const answer of input.answers) {
    if (!questionMap.has(answer.questionId)) {
      throw new ApiError("One of the custom questions is not available", 400)
    }
  }
  for (const question of wedding.customQuestions) {
    if (!question.required) continue
    const answer = input.answers.find((item) => item.questionId === question.id)
    if (!answer || answer.value.trim().length === 0) {
      throw new ApiError(`Please answer: ${question.question}`, 400)
    }
  }

  let existingSubmission = null as Awaited<ReturnType<Db["rsvpSubmission"]["findFirst"]>> | null
  if (input.editToken) {
    existingSubmission = await db.rsvpSubmission.findFirst({
      where: { weddingId: wedding.id, editTokenHash: hashEditToken(input.editToken) },
    })
    if (!existingSubmission) {
      throw new ApiError("This RSVP edit link is invalid. Please submit a new RSVP.", 403)
    }
  }

  const editToken = generateEditToken()
  const newEditTokenHash = hashEditToken(editToken)

  return db.$transaction(async (tx) => {
    const nameParts = input.fullName.split(/\s+/)
    const guestName = {
      firstName: nameParts[0] ?? input.fullName,
      lastName: nameParts.slice(1).join(" ") || null,
      dietaryPrefs: input.dietaryPrefs,
    }

    let guest
    let submission

    if (existingSubmission) {
      const conflict = await tx.guest.findFirst({
        where: {
          weddingId: wedding.id,
          mobile: input.mobile,
          NOT: { id: existingSubmission.guestId },
        },
        select: { id: true },
      })
      if (conflict) {
        throw new ApiError("This mobile number is already linked to another RSVP", 409)
      }

      guest = await tx.guest.update({
        where: { id: existingSubmission.guestId },
        data: { ...guestName, mobile: input.mobile },
      })

      // The edit token is the bearer credential; keep the existing hash
      // instead of rotating it on every save.
      submission = await tx.rsvpSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          fullName: input.fullName,
          mobile: input.mobile,
          status: "confirmed",
          dietaryPrefs: input.dietaryPrefs,
        },
      })
    } else {
      // The compound unique key (weddingId, mobile) makes this safe under
      // concurrent submissions. The mobile number is validated above.
      guest = await tx.guest.upsert({
        where: { weddingId_mobile: { weddingId: wedding.id, mobile: input.mobile } },
        update: guestName,
        create: {
          weddingId: wedding.id,
          mobile: input.mobile,
          ...guestName,
        },
      })

      submission = await tx.rsvpSubmission.upsert({
        where: { guestId: guest.id },
        update: {
          fullName: input.fullName,
          mobile: input.mobile,
          status: "confirmed",
          dietaryPrefs: input.dietaryPrefs,
          editTokenHash: newEditTokenHash,
        },
        create: {
          weddingId: wedding.id,
          guestId: guest.id,
          fullName: input.fullName,
          mobile: input.mobile,
          status: "confirmed",
          dietaryPrefs: input.dietaryPrefs,
          editTokenHash: newEditTokenHash,
        },
      })
    }

    await tx.familyMember.deleteMany({ where: { rsvpSubmissionId: submission.id } })
    if (input.familyMembers.length > 0) {
      await tx.familyMember.createMany({
        data: input.familyMembers.map((member) => ({
          rsvpSubmissionId: submission.id,
          fullName: member.fullName,
          relation: member.relation,
          age: member.age,
          dietaryPrefs: member.dietaryPrefs,
        })),
      })
    }

    await tx.rsvpEventResponse.deleteMany({ where: { rsvpSubmissionId: submission.id } })
    const responses = Object.entries(input.eventResponses).map(([eventId, status]) => ({
      rsvpSubmissionId: submission.id,
      eventId,
      status,
    }))
    if (responses.length > 0) {
      await tx.rsvpEventResponse.createMany({ data: responses })
    }

    await tx.answer.deleteMany({ where: { rsvpSubmissionId: submission.id } })
    if (input.answers.length > 0) {
      await tx.answer.createMany({
        data: input.answers.map((answer) => ({
          rsvpSubmissionId: submission.id,
          questionId: answer.questionId,
          value: answer.value.trim(),
        })),
      })
    }

    return {
      submissionId: submission.id,
      // When editing with a valid token the guest already has it; return the
      // same token so the UI can keep the edit link working.
      editToken: existingSubmission ? input.editToken! : editToken,
    }
  })
}

export type EditableRsvp = Prisma.RsvpSubmissionGetPayload<{
  include: {
    familyMembers: true
    eventResponses: true
    answers: true
  }
}>

/** Loads an RSVP for the guest-facing edit screen, scoped to the wedding. */
export async function getEditableRsvp(
  invitationToken: string,
  editToken: string,
  db: Db = prisma,
): Promise<EditableRsvp | null> {
  if (!invitationToken || !editToken) return null
  const wedding = await db.wedding.findUnique({
    where: { invitationToken },
    select: { id: true, published: true },
  })
  if (!wedding || !wedding.published) return null

  return db.rsvpSubmission.findFirst({
    where: { weddingId: wedding.id, editTokenHash: hashEditToken(editToken) },
    include: { familyMembers: true, eventResponses: true, answers: true },
  })
}
