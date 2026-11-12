import { NextResponse } from "next/server"
import { requireUserId } from "@/lib/server-auth"
import { getWeddingEntitlements, getWeddingUsage } from "@/lib/subscriptions/service"
import { getPaymentHistory } from "@/lib/subscriptions/payments"
import { handleApiError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/** Per-wedding entitlements and recent payments for the signed-in account. */
export async function GET() {
  try {
    const userId = await requireUserId()
    const [weddings, payments] = await Promise.all([
      prisma.wedding.findMany({
        where: { workspace: { members: { some: { userId } } } },
        select: { id: true, name: true, workspaceId: true },
      }),
      getPaymentHistory(userId),
    ])
    const summary = await Promise.all(weddings.map(async (wedding) => ({
      weddingId: wedding.id,
      weddingName: wedding.name,
      entitlements: await getWeddingEntitlements(wedding.workspaceId, wedding.id),
      usage: await getWeddingUsage(wedding.id),
    })))
    return NextResponse.json({ weddings: summary, payments })
  } catch (error) {
    return handleApiError(error)
  }
}
