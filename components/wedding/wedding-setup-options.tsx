"use client"

import { Field, Input, Select } from "@/components/ui/field"
import { WEDDING_PUBLIC_FIELDS, type WeddingPublicField } from "@/lib/wedding-settings"

export type WeddingSetupState = {
  timezone: string
  locale: string
  contactVisibility: "hidden" | "visible"
  publicFields: WeddingPublicField[]
}

export const DEFAULT_WEDDING_SETUP: WeddingSetupState = {
  timezone: "Asia/Kolkata",
  locale: "en-IN",
  contactVisibility: "hidden",
  publicFields: [...WEDDING_PUBLIC_FIELDS],
}

const labels: Record<WeddingPublicField, string> = {
  venue: "Venue", address: "Address", description: "Invitation message", mapUrl: "Map link",
  coverImageUrl: "Cover image", couplePhotoUrl: "Couple photo",
}

export default function WeddingSetupOptions({ value, onChange }: {
  value: WeddingSetupState
  onChange: (updates: Partial<WeddingSetupState>) => void
}) {
  function toggle(field: WeddingPublicField) {
    const fields = value.publicFields.includes(field)
      ? value.publicFields.filter(item => item !== field)
      : [...value.publicFields, field]
    onChange({ publicFields: fields })
  }

  return (
    <fieldset className="space-y-5 border-t border-ivory-200 pt-6">
      <legend className="font-display text-lg text-ink-800">Time and privacy</legend>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Wedding timezone" htmlFor="wedding-timezone" hint="Dates and access expiry use this timezone.">
          <Input id="wedding-timezone" list="wedding-timezones" required maxLength={100} value={value.timezone}
            onChange={event => onChange({ timezone: event.target.value })} />
          <datalist id="wedding-timezones"><option>Asia/Kolkata</option><option>UTC</option><option>Europe/London</option><option>America/New_York</option></datalist>
        </Field>
        <Field label="Date formatting" htmlFor="wedding-locale">
          <Select id="wedding-locale" value={value.locale} onChange={event => onChange({ locale: event.target.value })}>
            <option value="en-IN">English · India</option><option value="hi-IN">Hindi · India</option>
            <option value="mr-IN">Marathi · India</option><option value="en-US">English · United States</option>
          </Select>
        </Field>
      </div>
      <Field label="Guest contact visibility" htmlFor="guest-contact-visibility" hint="Contact information always stays private from invitation visitors.">
        <Select id="guest-contact-visibility" value={value.contactVisibility}
          onChange={event => onChange({ contactVisibility: event.target.value as "hidden" | "visible" })}>
          <option value="hidden">Hide mobile and email in lists, reports and exports</option>
          <option value="visible">Show mobile and email to this wedding’s organizers</option>
        </Select>
      </Field>
      <fieldset className="space-y-3">
        <legend className="label">Details guests may see</legend>
        <p className="text-sm text-ink-500">The wedding title, couple names and wedding date are always included.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {WEDDING_PUBLIC_FIELDS.map(field => (
            <label key={field} className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={value.publicFields.includes(field)} onChange={() => toggle(field)} />
              {labels[field]}
            </label>
          ))}
        </div>
      </fieldset>
    </fieldset>
  )
}
