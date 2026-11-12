import { NextResponse } from "next/server"
import { z } from "zod"
import { assertSameOrigin, handleApiError, readJson } from "@/lib/api"
import { emailSchema } from "@/lib/validation"
import { requestPasswordReset } from "@/lib/password-reset"
import { limitPasswordRecovery } from "@/lib/password-reset-request"

const requestSchema = z.object({ email: emailSchema })

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const { email } = requestSchema.parse(await readJson(request))
    await limitPasswordRecovery(request, email, "request")
    await requestPasswordReset(email)
    return NextResponse.json({ message: "If an account uses that email address, a password reset link will be sent." }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return handleApiError(error)
  }
}
