import { canShowAdvertisement, getPlatformSettings, type AdPlacement } from "@/lib/settings"

export default async function Advertisement({ planCode, placement }: { planCode: string; placement: AdPlacement }) {
  const settings = await getPlatformSettings()
  if (!canShowAdvertisement(planCode, placement, settings)) return null
  return (
    <aside aria-label="Advertisement" className="my-6 rounded-xl border border-ivory-200 bg-ivory-50 px-5 py-4 text-sm">
      <p className="mb-1 text-xs uppercase tracking-wide text-ink-400">Advertisement</p>
      <a href={settings.adUrl} target="_blank" rel="sponsored noopener noreferrer" className="text-ink-700 underline">{settings.adText}</a>
    </aside>
  )
}
