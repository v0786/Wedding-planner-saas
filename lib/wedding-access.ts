import type { PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"

/**
 * Tenant boundary: a wedding is only visible to members of its workspace.
 * Every private read/write goes through this helper (or an equivalent
 * relationship filter) so changing an id in a request can never expose
 * another workspace's data.
 *
 * The optional `db` parameter keeps these helpers unit-testable without a
 * database; production callers use the shared Prisma client.
 */
type Db = Pick<PrismaClient, "wedding" | "event" | "guest">

export async function getWeddingAccess(weddingId: string, userId: string, db: Db = prisma) {
  return db.wedding.findFirst({
    where: {
      id: weddingId,
      workspace: { members: { some: { userId } } },
    },
  })
}

export async function requireWeddingAccess(weddingId: string, userId: string, db: Db = prisma) {
  const wedding = await getWeddingAccess(weddingId, userId, db)
  if (!wedding) throw new ApiError("Wedding not found", 404)
  return wedding
}

export async function getEventAccess(
  weddingId: string,
  eventId: string,
  userId: string,
  db: Db = prisma,
) {
  return db.event.findFirst({
    where: {
      id: eventId,
      weddingId,
      wedding: { workspace: { members: { some: { userId } } } },
    },
  })
}

export async function getGuestAccess(
  weddingId: string,
  guestId: string,
  userId: string,
  db: Db = prisma,
) {
  return db.guest.findFirst({
    where: {
      id: guestId,
      weddingId,
      wedding: { workspace: { members: { some: { userId } } } },
    },
  })
}
