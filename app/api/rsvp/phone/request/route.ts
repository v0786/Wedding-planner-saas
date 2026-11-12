import { NextResponse, type NextRequest } from "next/server"
import { handleApiError, readJson } from "@/lib/api"
import { assertCaptcha, captchaWidgetConfig } from "@/lib/captcha"
import { z } from "zod"
import { setRsvpBrowserCookie } from "@/lib/rsvp-browser"
import { issueRsvpPhoneChallenge, sendRsvpOtp } from "@/lib/rsvp-otp"
import { readRsvpOtpRequest } from "@/lib/rsvp-otp-request"
import { generateEditToken } from "@/lib/tokens"

export async function GET() {
  try {
    return NextResponse.json(captchaWidgetConfig(), { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return handleApiError(error)
  }
}

const captchaBody = z.object({ captchaToken: z.string().max(2048).optional() })

export async function POST(req: NextRequest) {
  try {
    const requestCopy = req.clone()
    const { context } = await readRsvpOtpRequest(req, "request")
    const { captchaToken } = captchaBody.parse(await readJson(requestCopy))
    await assertCaptcha(captchaToken)
    const existingBrowser = context.browserToken
    const browserToken = existingBrowser ?? generateEditToken()
    const sid = await sendRsvpOtp(context.mobile)
    const challenge = issueRsvpPhoneChallenge({ ...context, browserToken }, sid)
    const response = NextResponse.json({ challenge }, { headers: { "Cache-Control": "no-store" } })
    if (!existingBrowser) setRsvpBrowserCookie(response, browserToken)
    return response
  } catch (error) {
    return handleApiError(error)
  }
}
