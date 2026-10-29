import { describe, it, expect, jest, beforeEach } from "@jest/globals"
import type { PrismaClient } from "@prisma/client"
import { submitRsvp } from "@/lib/rsvp-service"
import { hashEditToken } from "@/lib/tokens"
import { ApiError } from "@/lib/errors"
import { ZodError } from "zod"

type Mock = ReturnType<typeof createDb>

function createDb(overrides: { wedding?: unknown; editSubmission?: unknown } = {}) {
  const wedding = overrides.wedding ?? {
    id: "wedding-1",
    published: true,
    rsvpDeadline: null,
    events: [
      { id: "event-1", name: "Wedding", rsvpDeadline: null },
      { id: "event-2", name: "Haldi", rsvpDeadline: null },
    ],
    customQuestions: [
      { id: "question-1", question: "Meal preference", required: true, enabled: true },
    ],
  }

  const tx = {
    guest: {
      upsert: jest.fn(async () => ({ id: "guest-1" })),
      update: jest.fn(async () => ({ id: "guest-1" })),
      findFirst: jest.fn(async () => null),
    },
    rsvpSubmission: {
      upsert: jest.fn(async () => ({ id: "submission-1" })),
      update: jest.fn(async () => ({ id: "submission-1" })),
    },
    familyMember: {
      deleteMany: jest.fn(async () => ({ count: 0 })),
      createMany: jest.fn(async () => ({ count: 0 })),
    },
    rsvpEventResponse: {
      deleteMany: jest.fn(async () => ({ count: 0 })),
      createMany: jest.fn(async () => ({ count: 0 })),
    },
    answer: {
      deleteMany: jest.fn(async () => ({ count: 0 })),
      createMany: jest.fn(async () => ({ count: 0 })),
    },
  }

  const db = {
    wedding: { findUnique: jest.fn(async () => wedding) },
    rsvpSubmission: { findFirst: jest.fn(async () => overrides.editSubmission ?? null) },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    __tx: tx,
  }

  return db
}

function asClient(db: Mock): PrismaClient {
  return db as unknown as PrismaClient
}

const validPayload = {
  token: "invite-token",
  fullName: "Aarav Sharma",
  mobile: "9876543210",
  dietaryPrefs: "Vegetarian",
  familyMembers: [{ fullName: "Ananya Sharma", relation: "Spouse", age: "30" }],
  eventResponses: { "event-1": "yes", "event-2": "no" },
  answers: [{ questionId: "question-1", value: "Vegetarian" }],
}

describe("submitRsvp", () => {
  let db: Mock

  beforeEach(() => {
    db = createDb()
  })

  it("rejects a missing mobile number before touching the database", async () => {
    await expect(
      submitRsvp({ ...validPayload, mobile: undefined }, asClient(db)),
    ).rejects.toBeInstanceOf(ZodError)
    expect(db.wedding.findUnique).not.toHaveBeenCalled()
  })

  it("rejects an unpublished invitation", async () => {
    db.wedding.findUnique.mockResolvedValue({
      id: "wedding-1",
      published: false,
      rsvpDeadline: null,
      events: [],
      customQuestions: [],
    } as never)

    await expect(submitRsvp(validPayload, asClient(db))).rejects.toMatchObject({ status: 404 })
  })

  it("rejects a response after the wedding deadline", async () => {
    db.wedding.findUnique.mockResolvedValue({
      id: "wedding-1",
      published: true,
      rsvpDeadline: new Date("2020-01-01"),
      events: [],
      customQuestions: [],
    } as never)

    await expect(
      submitRsvp({ ...validPayload, eventResponses: {}, answers: [] }, asClient(db), new Date("2021-01-01")),
    ).rejects.toMatchObject({ status: 400 })
  })

  it("rejects an event deadline that has passed", async () => {
    db.wedding.findUnique.mockResolvedValue({
      id: "wedding-1",
      published: true,
      rsvpDeadline: null,
      events: [{ id: "event-1", name: "Haldi", rsvpDeadline: new Date("2020-01-01") }],
      customQuestions: [],
    } as never)

    await expect(
      submitRsvp(
        { ...validPayload, eventResponses: { "event-1": "yes" }, answers: [] },
        asClient(db),
        new Date("2021-01-01"),
      ),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it("rejects a response for an event outside the wedding", async () => {
    await expect(
      submitRsvp({ ...validPayload, eventResponses: { "other-event": "yes" } }, asClient(db)),
    ).rejects.toMatchObject({ status: 400 })
  })

  it("rejects a missing required custom answer", async () => {
    await expect(
      submitRsvp({ ...validPayload, answers: [] }, asClient(db)),
    ).rejects.toMatchObject({ status: 400 })
  })

  it("creates the guest, RSVP, family members, event responses and answers atomically", async () => {
    const result = await submitRsvp(validPayload, asClient(db))

    expect(result.submissionId).toBe("submission-1")
    expect(result.editToken).toBeTruthy()
    expect(db.__tx.guest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { weddingId_mobile: { weddingId: "wedding-1", mobile: "9876543210" } },
      }),
    )

    const upsertArgs = (db.__tx.rsvpSubmission.upsert as jest.Mock).mock.calls[0][0] as {
      create: { editTokenHash: string }
    }
    expect(upsertArgs.create.editTokenHash).toBe(hashEditToken(result.editToken))
    expect(db.__tx.familyMember.createMany).toHaveBeenCalled()
    expect(db.__tx.rsvpEventResponse.createMany).toHaveBeenCalled()
    expect(db.__tx.answer.createMany).toHaveBeenCalled()
  })

  it("rejects an invalid edit token", async () => {
    db.rsvpSubmission.findFirst.mockResolvedValue(null as never)
    await expect(
      submitRsvp({ ...validPayload, editToken: "invalid-token" }, asClient(db)),
    ).rejects.toMatchObject({ status: 403 })
  })

  it("edits an existing RSVP without rotating the edit token", async () => {
    db.rsvpSubmission.findFirst.mockResolvedValue({ id: "submission-1", guestId: "guest-1" } as never)

    const result = await submitRsvp({ ...validPayload, editToken: "valid-edit-token-123" }, asClient(db))

    expect(result.editToken).toBe("valid-edit-token-123")
    expect(db.__tx.rsvpSubmission.update).toHaveBeenCalled()
    expect(db.__tx.rsvpSubmission.upsert).not.toHaveBeenCalled()
  })

  it("rejects an edit that tries to take another guest's mobile number", async () => {
    db.rsvpSubmission.findFirst.mockResolvedValue({ id: "submission-1", guestId: "guest-1" } as never)
    db.__tx.guest.findFirst.mockResolvedValue({ id: "guest-2" } as never)

    await expect(
      submitRsvp({ ...validPayload, editToken: "valid-edit-token-123" }, asClient(db)),
    ).rejects.toMatchObject({ status: 409 })
  })
})
