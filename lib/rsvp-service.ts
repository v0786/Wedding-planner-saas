import { createHmac } from "node:crypto"
import type { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import { hashEditToken, generateEditToken, safeCompareTokenHash } from "@/lib/tokens"
import { rsvpSchema, type RsvpInput } from "@/lib/validation"
import { isWeddingExpired } from "@/lib/wedding-lifecycle"
import { publicInvitationWhere } from "@/lib/public-invitation"
import { type BrowserCookies, rsvpBrowserToken } from "@/lib/rsvp-browser"
import { rsvpPhoneVariants } from "@/lib/rsvp-phone"
import { groupInvitationCookieName } from "@/lib/group-invitations"
import { assertRsvpPhoneProof } from "@/lib/rsvp-otp"

type Db = PrismaClient

export type RsvpResult = {
  submissionId: string
  editToken: string
  editInvitationToken: string
}

const emptyCookies: BrowserCookies = { get: () => undefined }
const PRIVATE_RSVP_PREFIX = "rsvp_"

function groupRsvpEditToken(groupId: string, browserToken: string, nonce: string | null = null) {
  const binding = nonce ? `rsvp-group-edit:${groupId}:${nonce}` : `rsvp-group-edit:${groupId}`
  return createHmac("sha256", browserToken).update(binding).digest("base64url")
}

function editLocatorWhere(locator: string): Prisma.RsvpSubmissionWhereInput {
  return locator.startsWith(PRIVATE_RSVP_PREFIX)
    ? { id: locator.slice(PRIVATE_RSVP_PREFIX.length) }
    : { wedding: { invitationToken: locator } }
}

function editLocator(submission: { id: string; groupInvitationId: string | null }, invitationToken: string) {
  return submission.groupInvitationId ? `${PRIVATE_RSVP_PREFIX}${submission.id}` : invitationToken
}

function openForRsvp(wedding: { published: boolean; date: Date | null; timezone: string; rsvpDeadline: Date | null; allowGuestEdits: boolean }, now: Date) {
  return wedding.published && wedding.allowGuestEdits && !isWeddingExpired(wedding, now) &&
    (!wedding.rsvpDeadline || now <= wedding.rsvpDeadline)
}

/**
 * Public RSVP submission. All related rows are written in one transaction so a
 * failure never leaves a half-saved guest/family/event response.
 */
export async function submitRsvp(
  raw: unknown,
  db: Db = prisma,
  now: Date = new Date(),
  browserCookies: BrowserCookies = emptyCookies,
): Promise<RsvpResult> {
  const input: RsvpInput = rsvpSchema.parse(raw)

  const browserToken = rsvpBrowserToken(browserCookies)
  if (!browserToken) throw new ApiError("This RSVP is unavailable in this browser", 404)
  const browserTokenHash = hashEditToken(browserToken)

  const existingSubmission = input.editToken
    ? await db.rsvpSubmission.findFirst({
        where: {
          ...editLocatorWhere(input.token),
          editTokenHash: hashEditToken(input.editToken),
          browserTokenHash,
        },
      })
    : null
  if (input.editToken && !existingSubmission) {
    throw new ApiError("This RSVP edit link is invalid or has expired", 404)
  }
  const mobileVariants = rsvpPhoneVariants(input.mobile)
  if (existingSubmission && !mobileVariants.includes(existingSubmission.mobile)) {
    throw new ApiError("The verified mobile number cannot be changed", 400)
  }

  const invitation = existingSubmission
    ? { where: { id: existingSubmission.weddingId }, group: null }
    : await publicInvitationWhere(input.token, browserCookies)
  if (!invitation) throw new ApiError("This invitation is not available", 404)
  if (invitation.group?.mobile && !mobileVariants.includes(invitation.group.mobile)) {
    throw new ApiError("Use the mobile number associated with this invitation", 403)
  }
  const wedding = await db.wedding.findUnique({
    where: invitation.where,
    include: {
      events: { select: { id: true, name: true, rsvpDeadline: true } },
      customQuestions: { where: { enabled: true } },
    },
  })

  if (!wedding || !wedding.published || isWeddingExpired(wedding, now)) {
    throw new ApiError("This invitation is not available", 404)
  }

  if (existingSubmission && !wedding.allowGuestEdits) {
    throw new ApiError("This RSVP edit link is invalid or has expired", 404)
  }

  if (wedding.rsvpDeadline && now > wedding.rsvpDeadline) {
    throw new ApiError("The RSVP deadline has passed", 400)
  }

  const eventMap = new Map(wedding.events.map((event) => [event.id, event]))
  for (const eventId of Object.keys(input.eventResponses)) {
    const event = eventMap.get(eventId)
    if (!event) throw new ApiError("One of the selected events is not part of this wedding", 400)
    if (!existingSubmission && event.rsvpDeadline && now > event.rsvpDeadline) {
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

  const editTokenNonce = invitation.group ? generateEditToken() : null
  const editToken = input.editToken ?? (invitation.group
    ? groupRsvpEditToken(invitation.group.id, browserToken, editTokenNonce)
    : generateEditToken())
  const editTokenHash = hashEditToken(editToken)
  const responseFields = {
    fullName: input.fullName,
    email: input.email,
    status: input.status,
    partySize: input.partySize ?? null,
    dietaryPrefs: input.dietaryPrefs,
  }

  return db.$transaction(async (tx) => {
    const guestLock = `${wedding.workspaceId}:guests`
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${guestLock}))`
    if (!input.editToken && input.phoneProof) {
      assertRsvpPhoneProof(input.phoneProof, {
        invitationToken: input.token,
        mobile: input.mobile,
        browserToken,
      })
      const proofUse = await tx.rateLimit.createMany({
        data: [{
          key: `rsvp-proof-use:${hashEditToken(input.phoneProof)}`,
          count: 1,
          resetAt: new Date(Number(input.phoneProof.split(".")[0])),
        }],
        skipDuplicates: true,
      })
      if (!proofUse.count) throw new ApiError("This phone verification has already been used. Request a new code.", 403)
    }
    const nameParts = input.fullName.split(/\s+/)
    const guestName = {
      firstName: nameParts[0] ?? input.fullName,
      lastName: nameParts.slice(1).join(" ") || null,
      dietaryPrefs: input.dietaryPrefs,
    }

    let submission
    if (existingSubmission) {
      const authorized = await tx.rsvpSubmission.updateMany({
        where: { id: existingSubmission.id, browserTokenHash, editTokenHash },
        data: responseFields,
      })
      if (!authorized.count) throw new ApiError("This RSVP edit link is invalid or has expired", 404)
      await tx.guest.update({ where: { id: existingSubmission.guestId }, data: guestName })
      submission = existingSubmission
    } else {
      if (invitation.group) {
        const authorizedGroup = await tx.groupInvitation.updateMany({
          where: {
            id: invitation.group.id,
            tokenHash: invitation.group.tokenHash,
            browserHash: invitation.group.browserHash,
            revokedAt: null,
          },
          data: { updatedAt: now },
        })
        if (!authorizedGroup.count) throw new ApiError("This invitation is not available", 404)
        const groupResponse = await tx.rsvpSubmission.findUnique({
          where: { groupInvitationId: invitation.group.id },
          select: { id: true },
        })
        if (groupResponse) throw new ApiError("This invitation already has an RSVP. Use your saved edit link.", 409)
      }
      // Serialize equivalent local and international spellings of the same number.
      const phoneLock = `rsvp-phone:${wedding.id}:${mobileVariants[0]}`
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${phoneLock}))`
      const previous = await tx.rsvpSubmission.findFirst({
        where: { weddingId: wedding.id, mobile: { in: mobileVariants } },
        orderBy: [{ browserTokenHash: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }, { id: "asc" }],
      })
      if (previous?.browserTokenHash) {
        throw new ApiError("An RSVP already exists. Use your saved edit link.", 409)
      }
      const matchedGuest = previous
        ? await tx.guest.findUnique({ where: { id: previous.guestId } })
        : await tx.guest.findFirst({
            where: { weddingId: wedding.id, mobile: { in: mobileVariants } },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          })
      const guest = matchedGuest ?? await tx.guest.upsert({
        where: { weddingId_mobile: { weddingId: wedding.id, mobile: input.mobile } },
        update: {},
        create: { weddingId: wedding.id, mobile: input.mobile, ...guestName },
      })
      const newAccess = {
        ...responseFields,
        mobile: guest.mobile ?? input.mobile,
        editTokenHash,
        editTokenNonce,
        browserTokenHash,
        groupInvitationId: invitation.group?.id,
      }
      if (previous) {
        // Legacy RSVPs can be claimed after the request verifies the phone.
        // A bound RSVP can only be changed with its edit or transfer link.
        const claimed = await tx.rsvpSubmission.updateMany({
          where: { id: previous.id, browserTokenHash: null },
          data: newAccess,
        })
        if (!claimed.count) throw new ApiError("An RSVP already exists. Use your saved edit link.", 409)
        submission = { ...previous, groupInvitationId: invitation.group?.id ?? previous.groupInvitationId }
      } else {
        submission = await tx.rsvpSubmission.create({
          data: { ...newAccess, weddingId: wedding.id, guestId: guest.id },
        })
      }
      await tx.guest.update({ where: { id: guest.id }, data: guestName })
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

    const eventResponses = { ...input.eventResponses }
    if (existingSubmission) {
      const savedResponses = await tx.rsvpEventResponse.findMany({
        where: { rsvpSubmissionId: submission.id },
      })
      for (const event of wedding.events) {
        if (!event.rsvpDeadline || now <= event.rsvpDeadline) continue
        const saved = savedResponses.find((response) => response.eventId === event.id)
        const requested = eventResponses[event.id]
        if (requested !== undefined && requested !== (saved?.status ?? "pending")) {
          throw new ApiError(`The RSVP deadline for ${event.name} has passed`, 400)
        }
        if (saved) eventResponses[event.id] = saved.status as RsvpInput["eventResponses"][string]
        else delete eventResponses[event.id]
      }
    }
    await tx.rsvpEventResponse.deleteMany({ where: { rsvpSubmissionId: submission.id } })
    const responses = Object.entries(eventResponses).map(([eventId, status]) => ({
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
      editToken,
      editInvitationToken: editLocator(submission, wedding.invitationToken),
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

/** A valid edit URL and the browser that owns it are both required. */
export async function getEditableRsvp(
  locator: string,
  editToken: string,
  browserToken: string | undefined,
  db: Db = prisma,
  now = new Date(),
): Promise<EditableRsvp | null> {
  if (!locator || !editToken || !browserToken) return null
  const submission = await db.rsvpSubmission.findFirst({
    where: {
      ...editLocatorWhere(locator),
      editTokenHash: hashEditToken(editToken),
      browserTokenHash: hashEditToken(browserToken),
    },
    include: { familyMembers: true, eventResponses: true, answers: true, wedding: true },
  })
  return submission && openForRsvp(submission.wedding, now) ? submission : null
}

export async function groupRsvpEditPath(groupId: string, browserToken: string | undefined) {
  if (!browserToken) return null
  const submission = await prisma.rsvpSubmission.findFirst({
    where: { groupInvitationId: groupId, browserTokenHash: hashEditToken(browserToken) },
    select: { id: true, editTokenNonce: true, editTokenHash: true },
  })
  if (!submission?.editTokenHash) return null
  const editToken = groupRsvpEditToken(groupId, browserToken, submission.editTokenNonce)
  return safeCompareTokenHash(submission.editTokenHash, hashEditToken(editToken))
    ? `/rsvp/${PRIVATE_RSVP_PREFIX}${submission.id}/edit?token=${editToken}`
    : null
}

export async function createRsvpTransfer(
  locator: string,
  editToken: string,
  browserToken: string,
  now = new Date(),
  browserCookies: BrowserCookies = emptyCookies,
) {
  const submission = await getEditableRsvp(locator, editToken, browserToken, prisma, now)
  if (!submission) throw new ApiError("This RSVP edit link is invalid or has expired", 404)

  const groupBrowserToken = submission.groupInvitationId
    ? browserCookies.get(groupInvitationCookieName(submission.groupInvitationId))?.value
    : undefined
  const transferGroupBrowserHash = groupBrowserToken && /^[A-Za-z0-9_-]{32}$/.test(groupBrowserToken)
    ? hashEditToken(groupBrowserToken)
    : null
  const transferToken = generateEditToken()
  const transferExpiresAt = new Date(now.getTime() + 15 * 60 * 1000)
  const updated = await prisma.rsvpSubmission.updateMany({
    where: {
      id: submission.id,
      editTokenHash: hashEditToken(editToken),
      browserTokenHash: hashEditToken(browserToken),
    },
    data: { transferTokenHash: hashEditToken(transferToken), transferExpiresAt, transferGroupBrowserHash },
  })
  if (!updated.count) throw new ApiError("This RSVP edit link is invalid or has expired", 404)
  return { transferToken, transferExpiresAt }
}

export async function findRsvpTransfer(transferToken: string, now = new Date()) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(transferToken)) return null
  const transfer = await prisma.rsvpSubmission.findUnique({
    where: { transferTokenHash: hashEditToken(transferToken) },
    select: {
      id: true,
      groupInvitationId: true,
      browserTokenHash: true,
      transferGroupBrowserHash: true,
      transferExpiresAt: true,
      wedding: { select: { published: true, date: true, timezone: true, rsvpDeadline: true, allowGuestEdits: true, invitationToken: true } },
    },
  })
  if (!transfer?.transferExpiresAt || transfer.transferExpiresAt <= now || !openForRsvp(transfer.wedding, now)) {
    return null
  }
  return transfer
}

export async function consumeRsvpTransfer(transferToken: string, browserToken: string, now = new Date()) {
  const transfer = await findRsvpTransfer(transferToken, now)
  if (!transfer) return null
  const browserTokenHash = hashEditToken(browserToken)
  if (browserTokenHash === transfer.browserTokenHash) {
    throw new ApiError("Open this transfer link in the other browser.", 409)
  }

  const editTokenNonce = transfer.groupInvitationId ? generateEditToken() : null
  const editToken = transfer.groupInvitationId
    ? groupRsvpEditToken(transfer.groupInvitationId, browserToken, editTokenNonce)
    : generateEditToken()

  return prisma.$transaction(async (tx) => {
    const result = await tx.rsvpSubmission.updateMany({
      where: {
        id: transfer.id,
        transferTokenHash: hashEditToken(transferToken),
        transferExpiresAt: { gt: now },
      },
      data: {
        browserTokenHash,
        editTokenHash: hashEditToken(editToken),
        editTokenNonce,
        transferTokenHash: null,
        transferExpiresAt: null,
        transferGroupBrowserHash: null,
      },
    })
    if (!result.count) return null

    let groupBrowser: { id: string; token: string } | undefined
    if (transfer.groupInvitationId && transfer.transferGroupBrowserHash) {
      const token = generateEditToken()
      const moved = await tx.groupInvitation.updateMany({
        where: {
          id: transfer.groupInvitationId,
          browserHash: transfer.transferGroupBrowserHash,
          revokedAt: null,
        },
        data: { browserHash: hashEditToken(token) },
      })
      if (moved.count) groupBrowser = { id: transfer.groupInvitationId, token }
    }
    return { editToken, locator: editLocator(transfer, transfer.wedding.invitationToken), groupBrowser }
  })
}
