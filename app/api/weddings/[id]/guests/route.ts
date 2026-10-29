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
import { requireWeddingAccess } from "@/lib/wedding-access"
import { logAudit } from "@/lib/audit"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await params
    await requireWeddingAccess(id, userId)

    const url = new URL(req.url)
    const query = guestQuerySchema.parse({
      search: url.searchParams.get("search") ?? undefined,
      group: url.searchParams.get("group") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
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
    if (query.status === "none") where.rsvpSubmission = null
    else if (query.status !== "all") where.rsvpSubmission = { status: query.status }

    const [total, guests] = await Promise.all([
      prisma.guest.count({ where }),
      prisma.guest.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          rsvpSubmission: {
            include: { familyMembers: true, eventResponses: true },
          },
        },
      }),
    ])

    return NextResponse.json({
      guests,
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
    await requireWeddingAccess(id, userId)

    const body = await readJson(req)
    const data = guestSchema.parse(body)

    if (data.mobile) {
      const existing = await prisma.guest.findFirst({
        where: { weddingId: id, mobile: data.mobile },
        select: { id: true },
      })
      if (existing) throw new ApiError("A guest with this mobile number already exists", 409)
    }

    const guest = await prisma.guest.create({ data: { ...data, weddingId: id } })
    await logAudit(id, userId, "guest.created", { guestId: guest.id })
    return NextResponse.json({ guest }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
