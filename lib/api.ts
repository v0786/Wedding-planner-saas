import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { ApiError } from "@/lib/errors"

export { ApiError }

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

/** Reads and parses JSON, converting malformed bodies into a 400. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new ApiError("Request body must be valid JSON", 400)
  }
}

/**
 * Rejects cross-site state-changing requests. SameSite=Lax cookies already
 * block most CSRF attempts; this is defence in depth. Requests without an
 * Origin header (CLI/tests) are allowed, matching Auth.js behaviour.
 */
export function assertSameOrigin(request: Request) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return
  const origin = request.headers.get("origin")
  if (!origin) return
  const host = request.headers.get("host")
  try {
    const originHost = new URL(origin).host
    if (host && originHost !== host) {
      throw new ApiError("Cross-origin request rejected", 403)
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Invalid origin", 403)
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    const first = error.issues[0]
    return jsonError(first?.message ?? "Invalid input", 400, {
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    })
  }
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status)
  }
  console.error(error)
  return jsonError("Something went wrong", 500)
}
