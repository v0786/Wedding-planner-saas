import { requireUserId } from "@/lib/server-auth"
import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  assertSameOrigin,
  handleApiError,
  readJson,
  ApiError,
} from "@/lib/api"
import { guestQuerySchema, guestSchema } from "@/lib/validation"
import { requireOpenWeddingAccess, requireWeddingAccess } from "@/lib/wedding-access"
import { contactsAreVisible } from "@/lib/wedding-settings"
import { guestPhoneVariants } from "@/lib/guest-phone"
import { logAudit } from "@/lib/audit"
import { assertWeddingLimit, withWorkspaceLimitLock } from "@/lib/subscriptions/service"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireWeddingAccess(id, userId)

    const url = new URL(req.url)
    const query = guestQuerySchema.parse({
      search: url.searchParams.get("search") ?? undefined,
      group: url.searchParams.get("group") ?? undefined,
      side: url.searchParams.get("side") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    })

    const where: Prisma.GuestWhereInput = { weddingId: id }
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { mobile: { contains: query.search } },
        { email: { contains: query.search, mode: "insensitive" } },
      ]
    }
    if (query.group) where.group = query.group
    if (query.side) where.side = { equals: query.side, mode: "insensitive" }
    if (query.category) where.category = { equals: query.category, mode: "insensitive" }
    if (query.status === "none") where.rsvpSubmission = null
    else if (query.status !== "all") where.rsvpSubmission = { status: query.status }

    const orderBy: Prisma.GuestOrderByWithRelationInput[] = query.sort === "name"
      ? [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }]
      : [{ createdAt: query.sort === "oldest" ? "asc" : "desc" }, { id: "asc" }]
    const [total, guests] = await Promise.all([
      prisma.guest.count({ where }),
      prisma.guest.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          rsvpSubmission: {
            select: { id: true, status: true, partySize: true, familyMembers: { select: { id: true } }, eventResponses: true, dietaryPrefs: true },
          },
        },
      }),
    ])

    return NextResponse.json({
      guests: contactsAreVisible(wedding) ? guests : guests.map((guest) => ({ ...guest, mobile: null, email: null })),
      contactsVisible: contactsAreVisible(wedding),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req)
    const userId = await requireUserId()
    const { id } = await params
    const wedding = await requireOpenWeddingAccess(id, userId)

    const body = await readJson(req)
    const data = guestSchema.parse(body)

    const guest = await withWorkspaceLimitLock(wedding.workspaceId, "guests", async (tx) => {
      await assertWeddingLimit(wedding.workspaceId, id, "guests")

      if (data.mobile) {
        const existing = await tx.guest.findFirst({
          where: { weddingId: id, mobile: { in: guestPhoneVariants(data.mobile) } },
          select: { id: true },
        })
        if (existing) throw new ApiError("A guest with this mobile number already exists", 409)
      }

      return tx.guest.create({ data: { ...data, weddingId: id } })
    })

    await logAudit(id, userId, "guest.created", { guestId: guest.id })
    return NextResponse.json({ guest }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
