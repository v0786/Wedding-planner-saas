import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, coupleName1, coupleName2, date, venue } = body

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
    })

    if (!membership) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 })
    }

    const wedding = await prisma.wedding.create({
      data: {
        workspaceId: membership.workspaceId,
        name,
        coupleName1,
        coupleName2: coupleName2 || null,
        date: date ? new Date(date) : null,
        venue: venue || null,
        invitationToken: crypto.randomUUID(),
      },
    })

    return NextResponse.json({ wedding }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
