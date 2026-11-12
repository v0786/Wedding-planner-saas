import { NextResponse } from "next/server"
import { z } from "zod"
import { assertSameOrigin, handleApiError, readJson } from "@/lib/api"
import { resetPassword } from "@/lib/password-reset"
import { limitPasswordRecovery } from "@/lib/password-reset-request"

const resetSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password: z.string().min(8).max(200) })

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const { token, password } = resetSchema.parse(await readJson(request))
    await limitPasswordRecovery(request, token, "reset")
    await resetPassword(token, password)
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "strict-origin" } })
  } catch (error) {
    return handleApiError(error)
  }
}
