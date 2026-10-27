import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { published } = body

    const wedding = await prisma.wedding.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            members: { where: { userId: session.user.id } },
          },
        },
      },
    })

    if (!wedding || wedding.workspace.members.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const updated = await prisma.wedding.update({
      where: { id },
      data: { published },
    })

    return NextResponse.json({ wedding: updated })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
