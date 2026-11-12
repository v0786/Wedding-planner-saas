import { NextResponse } from "next/server"
import { assertSameOrigin, handleApiError, readJson } from "@/lib/api"
import { requireAdmin } from "@/lib/subscriptions/admin"
import { getPlatformSettings, settingsSchema } from "@/lib/settings"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    await requireAdmin()
    return NextResponse.json({ settings: await getPlatformSettings() }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return handleApiError(error) }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request)
    const user = await requireAdmin()
    const settings = settingsSchema.parse(await readJson(request))
    const result = await prisma.$transaction(async tx => {
      const current = await tx.platformSettings.upsert({ where: { id: "platform" }, create: {}, update: {} })
      const changes = Object.fromEntries(Object.entries(settings).filter(([key, value]) => current[key as keyof typeof settings] !== value))
      const updated = await tx.platformSettings.update({ where: { id: "platform" }, data: settings })
      if (Object.keys(changes).length) await tx.platformSettingsAudit.create({ data: { actorUserId: user.id, changes } })
      return updated
    })
    return NextResponse.json({ settings: result })
  } catch (error) { return handleApiError(error) }
}
