import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/** Public liveness contains no configuration, host, or database information. */
export async function GET() {
  return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } })
}
