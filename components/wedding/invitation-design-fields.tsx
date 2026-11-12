"use client"

import Link from "next/link"
import { Field, Input, Select } from "@/components/ui/field"
import { INVITATION_THEMES } from "@/lib/wedding-settings"

export type InvitationDesignState = {
  invitationTheme: keyof typeof INVITATION_THEMES
  themeColor: string
  coverImageUrl: string
  couplePhotoUrl: string
}

export default function InvitationDesignFields({ weddingId, value, canCustomize, onChange, coupleNames, message }: {
  weddingId: string
  value: InvitationDesignState
  canCustomize: boolean
  onChange: (updates: Partial<InvitationDesignState>) => void
  coupleNames: string
  message: string
}) {
  const color = value.themeColor || INVITATION_THEMES[value.invitationTheme].color
  const cover = value.coverImageUrl.startsWith("https://") ? value.coverImageUrl : ""
  const photo = value.couplePhotoUrl.startsWith("https://") ? value.couplePhotoUrl : ""
  return (
    <fieldset className="space-y-5 border-t border-ivory-200 pt-6">
      <legend className="font-display text-lg text-ink-800">Invitation design</legend>
      {!canCustomize && <p className="text-sm text-ink-500">Custom themes and photos are included with Pro and Prime. <Link href={`/dashboard/billing?weddingId=${weddingId}`} className="underline">Compare wedding plans</Link></p>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Theme" htmlFor="invitation-theme">
          <Select id="invitation-theme" value={value.invitationTheme} disabled={!canCustomize}
            onChange={event => onChange({ invitationTheme: event.target.value as InvitationDesignState["invitationTheme"], themeColor: "" })}>
            {Object.entries(INVITATION_THEMES).map(([key, theme]) => <option key={key} value={key}>{theme.label}</option>)}
          </Select>
        </Field>
        <Field label="Accent colour" htmlFor="invitation-color">
          <Input id="invitation-color" type="color" value={color} disabled={!canCustomize}
            onChange={event => onChange({ themeColor: event.target.value })} />
        </Field>
      </div>
      <Field label="Cover image URL" htmlFor="invitation-cover" hint="Use an HTTPS image link you have permission to share.">
        <Input id="invitation-cover" type="url" value={value.coverImageUrl} disabled={!canCustomize} maxLength={2048}
          onChange={event => onChange({ coverImageUrl: event.target.value })} placeholder="https://…" />
      </Field>
      <Field label="Couple photo URL" htmlFor="invitation-photo">
        <Input id="invitation-photo" type="url" value={value.couplePhotoUrl} disabled={!canCustomize} maxLength={2048}
          onChange={event => onChange({ couplePhotoUrl: event.target.value })} placeholder="https://…" />
      </Field>
      <article aria-label="Invitation design preview" className="overflow-hidden rounded-2xl border-2 text-center" style={{ borderColor: color }}>
        {cover && <div role="img" aria-label="Cover image preview" className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(cover)})` }} />}
        <div className="space-y-3 bg-ivory-50 p-7">
          {photo && <div role="img" aria-label="Couple photo preview" className="mx-auto h-20 w-20 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(photo)})` }} />}
          <p className="eyebrow" style={{ color }}>You are invited</p>
          <h3 className="font-display text-2xl" style={{ color }}>{coupleNames}</h3>
          <p className="whitespace-pre-wrap text-sm text-ink-600">{message || "Join us as we celebrate our wedding."}</p>
        </div>
      </article>
      <p className="text-xs text-ink-500">Save changes to apply this design across the wedding’s invitations. Public visibility choices control which photos and details guests see.</p>
    </fieldset>
  )
}
