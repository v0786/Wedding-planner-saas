import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/policies"

export async function currentPolicyAcceptance(userId: string) {
  return prisma.policyAcceptance.findUnique({
    where: { userId_termsVersion_privacyVersion: { userId, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION } },
    select: { id: true, acceptedAt: true },
  })
}

export async function requireCurrentPolicyAcceptance(userId: string) {
  if (!await currentPolicyAcceptance(userId)) {
    throw new ApiError("Review and accept the current policies before continuing.", 428, {
      code: "POLICY_ACCEPTANCE_REQUIRED",
      policyUrl: "/onboarding/policies",
    })
  }
}
