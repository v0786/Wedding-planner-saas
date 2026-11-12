import { NextResponse } from "next/server"
import { assertSameOrigin, handleApiError, readJson } from "@/lib/api"
import { policyAcceptanceSchema } from "@/lib/policies"
import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/server-auth"

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const userId = await requireUserId()
    const { termsVersion, privacyVersion } = policyAcceptanceSchema.parse(await readJson(request))
    const acceptance = await prisma.policyAcceptance.upsert({
      where: { userId_termsVersion_privacyVersion: { userId, termsVersion, privacyVersion } },
      create: { userId, termsVersion, privacyVersion, source: "onboarding" },
      update: {},
      select: { acceptedAt: true, termsVersion: true, privacyVersion: true },
    })
    return NextResponse.json({ acceptance }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    return handleApiError(error)
  }
}
