import { NextResponse, type NextRequest } from "next/server"
import { ApiError, handleApiError } from "@/lib/api"
import { checkRsvpOtp, issueRsvpPhoneProof } from "@/lib/rsvp-otp"
import { readRsvpOtpRequest } from "@/lib/rsvp-otp-request"

export async function POST(req: NextRequest) {
  try {
    const { context, code, verificationSid } = await readRsvpOtpRequest(req, "verify")
    if (!code || !verificationSid) throw new ApiError("Enter the verification code", 400)
    if (!(await checkRsvpOtp(context.mobile, verificationSid, code))) {
      throw new ApiError("The code is incorrect or has expired", 400)
    }

    const proof = issueRsvpPhoneProof(context)
    return NextResponse.json({ proof }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return handleApiError(error)
  }
}
