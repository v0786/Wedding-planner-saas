"use client"

import { useState } from "react"
import { Field, Input } from "@/components/ui/field"

export default function AssetUpload({ weddingId, kind, disabled, onUploaded }: {
  weddingId: string
  kind: "cover" | "couple"
  disabled: boolean
  onUploaded: (url: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  async function upload(file?: File) {
    if (!file) return
    setError(""); setSuccess(false)
    if (file.size > 4 * 1024 * 1024) { setError("Choose an image up to 4 MB."); return }
    setBusy(true)
    try {
      const response = await fetch(`/api/weddings/${weddingId}/assets?kind=${kind}`, {
        method: "POST", headers: { "Content-Type": file.type }, body: file,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not upload image")
      onUploaded(data.url)
      setSuccess(true)
    } catch (error) { setError(error instanceof Error ? error.message : "Could not upload image") }
    finally { setBusy(false) }
  }
  return (
    <div className="space-y-2">
      <Field label={kind === "cover" ? "Upload cover image" : "Upload couple photo"} htmlFor={`upload-${kind}`} hint="PNG, JPEG or WebP, up to 4 MB. Save the form after uploading.">
        <Input id={`upload-${kind}`} type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled || busy}
          onChange={event => { void upload(event.target.files?.[0]); event.target.value = "" }} />
      </Field>
      {busy && <p role="status" className="text-sm text-ink-500">Uploading image…</p>}
      {success && <p role="status" className="text-sm text-brand-success">Uploaded. Save changes to apply your photo.</p>}
      {error && <p role="alert" className="text-sm text-brand-danger">{error}</p>}
    </div>
  )
}
