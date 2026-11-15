import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { ApiError } from "@/lib/errors"

export { ApiError }

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

export const MAX_JSON_BYTES = 1024 * 1024

/** Bound actual streamed bytes; Content-Length alone is not trustworthy. */
export async function readJson(request: Request): Promise<unknown> {
  const declared = request.headers.get("content-length")
  if (declared && Number(declared) > MAX_JSON_BYTES) throw new ApiError("Request body is too large", 413)
  if (!request.body) throw new ApiError("Request body must be valid JSON", 400)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_JSON_BYTES) {
        await reader.cancel()
        throw new ApiError("Request body is too large", 413)
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Request body must be valid JSON", 400)
  } finally { reader.releaseLock() }
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
    return jsonError(error.message, error.status, error.details)
  }
  // Provider/database exceptions can contain credentials or guest details.
  console.error("Unhandled API request failure")
  return jsonError("Something went wrong", 500)
}
