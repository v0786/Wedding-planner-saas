import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleApiError } from "@/lib/api"
import { hashEditToken, safeCompareTokenHash } from "@/lib/tokens"
import { processWeddingReminders } from "@/lib/wedding-reminders"
import { processWeddingRetention } from "@/lib/wedding-retention"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.get("authorization")
  if (!secret || !authorization || !safeCompareTokenHash(
    hashEditToken(authorization),
    hashEditToken(`Bearer ${secret}`),
  )) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    await prisma.rateLimit.deleteMany({ where: { resetAt: { lte: now } } })
    const reminders = await processWeddingReminders(now, process.env.WEDDING_REMINDER_SEND_ENABLED === "true")
    const summary = await processWeddingRetention({
      now,
      deleteDue: process.env.WEDDING_RETENTION_DELETE_ENABLED === "true",
    })
    console.info("Wedding retention completed", summary)
    return NextResponse.json({ ...summary, reminders }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return handleApiError(error)
  }
}
