import { NextResponse } from "next/server"
import { getPublicPlans } from "@/lib/subscriptions/payments"

export const dynamic = "force-dynamic"

/** Public plan catalogue. Prices are only shown when configured. */
export async function GET() {
  const catalog = await getPublicPlans()
  return NextResponse.json(catalog)
}
