import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import {
  ApiError,
  assertSameOrigin,
  handleApiError,
  readJson,
} from "@/lib/api"
import { registerSchema } from "@/lib/validation"
import { checkRateLimit, clientKey } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)

    const limit = await checkRateLimit(clientKey(req, "register"), {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      )
    }

    const body = await readJson(req)
    const { name, email, password } = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      throw new ApiError("An account with this email already exists", 409)
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // User, workspace and owner membership must be created together.
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, passwordHash },
      })
      const workspace = await tx.workspace.create({
        data: { name: `${name}'s Workspace` },
      })
      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: created.id, role: "owner" },
      })
      return created
    })

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 },
    )
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }
    return handleApiError(error)
  }
}
