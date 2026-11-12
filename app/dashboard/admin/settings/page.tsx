import Link from "next/link"
import { requireAdmin } from "@/lib/subscriptions/admin"
import { getPlatformSettings, settingsSchema } from "@/lib/settings"
import { prisma } from "@/lib/prisma"
import PlatformSettingsEditor from "@/components/admin/platform-settings-editor"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  await requireAdmin()
  const settings = settingsSchema.parse(await getPlatformSettings())
  const audits = await prisma.platformSettingsAudit.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link href="/dashboard/admin/plans" className="text-sm text-indigo-600">Plan pricing</Link>
      <h1 className="text-2xl font-semibold">Platform settings</h1>
      <PlatformSettingsEditor initial={settings} />
      <section className="border-t border-ivory-200 pt-6">
        <h2 className="font-semibold">Recent settings changes</h2>
        {audits.length === 0 ? <p className="mt-2 text-sm text-ink-500">No settings changes recorded.</p> : (
          <ul className="mt-3 space-y-3 text-sm">
            {audits.map(audit => <li key={audit.id}>
              <p>{audit.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · Administrator {audit.actorUserId}</p>
              <p className="text-ink-500">{Object.keys(audit.changes as object).join(", ")}</p>
            </li>)}
          </ul>
        )}
      </section>
    </main>
  )
}
