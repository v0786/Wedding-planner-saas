import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashEditToken, safeCompareTokenHash } from "@/lib/tokens"

export const dynamic = "force-dynamic"

/** Monitoring credentials never grant access to customer data or operations. */
export async function GET(request: Request) {
  const secret = process.env.HEALTH_CHECK_SECRET
  const supplied = request.headers.get("authorization")
  const headers = { "Cache-Control": "no-store" }
  if (!secret || !supplied || !safeCompareTokenHash(hashEditToken(supplied), hashEditToken(`Bearer ${secret}`))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers })
  }
  try {
    // Checks both connectivity and the migrations needed by the web application.
    await prisma.$queryRaw`SELECT EXISTS (SELECT 1 FROM "Plan") AS ready`
    await prisma.$queryRaw`SELECT id FROM "AdminMfaCredential" LIMIT 0`
    await prisma.$queryRaw`SELECT "userId" FROM "WeddingSetupDraft" LIMIT 0`
    return NextResponse.json({ status: "ready" }, { headers })
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers })
  }
}
