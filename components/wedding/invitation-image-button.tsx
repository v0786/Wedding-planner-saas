"use client"

import { useState } from "react"
import { invitationTheme } from "@/lib/invitation-theme"

type InvitationImage = {
  couple: string
  name: string
  date: string | null
  venue: string | null
  address: string | null
  deadline: string | null
  rsvpPath: string | null
  description?: string | null
  invitationTheme?: string
  themeColor?: string | null
  coverImageUrl?: string | null
  couplePhotoUrl?: string | null
}

const width = 1200
const innerWidth = 940
const ink = "#34261d"

export default function InvitationImageButton({ invitation }: { invitation: InvitationImage }) {
  const [error, setError] = useState(false)

  async function download() {
    setError(false)
    try {
      const url = invitation.rsvpPath ? new URL(invitation.rsvpPath, window.location.origin).href : null
      const blob = await createInvitationImage(invitation, url)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = `${invitation.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "wedding"}-invitation.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
    } catch {
      setError(true)
    }
  }

  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm print:hidden" onClick={download}>
        Download PNG
      </button>
      {error && <p role="alert" className="w-full text-sm text-brand-danger print:hidden">Could not create the PNG. If it includes photos, use HTTPS image URLs that allow cross-origin downloads.</p>}
    </>
  )
}

async function createInvitationImage(invitation: InvitationImage, rsvpUrl: string | null) {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas is unavailable")

  const palette = invitationTheme(invitation)
  const gold = palette.primary
  const cover = invitation.coverImageUrl ? await loadPhoto(invitation.coverImageUrl) : null
  const photo = invitation.couplePhotoUrl ? await loadPhoto(invitation.couplePhotoUrl) : null
  const coverHeight = cover ? 300 : 0
  const photoY = 96 + coverHeight
  const lines: { text: string; font: string; color: string; y: number }[] = []
  let y = photoY + (photo ? 230 : 42)
  const add = (text: string | null, font: string, lineHeight: number, color: string = ink) => {
    if (!text) return
    ctx.font = font
    for (const line of wrapText(ctx, text)) {
      lines.push({ text: line, font, color, y })
      y += lineHeight
    }
  }

  add("YOU'RE INVITED", "bold 26px sans-serif", 44, gold)
  y += 20
  add(invitation.couple, "70px Georgia, serif", 88)
  add(invitation.name, "italic 32px Georgia, serif", 48, gold)
  const ruleY = y + 20
  y += 86
  add(invitation.date, "42px Georgia, serif", 60)
  add(invitation.venue, "37px Georgia, serif", 55)
  add(invitation.address, "28px sans-serif", 42)
  y += 20
  add(invitation.description ?? null, "28px sans-serif", 42)
  y += 20
  add(invitation.deadline, "bold 28px sans-serif", 42, gold)
  if (rsvpUrl) {
    y += 30
    add("RSVP ONLINE", "bold 23px sans-serif", 40, gold)
    add(rsvpUrl, "25px sans-serif", 37)
  }

  canvas.width = width
  canvas.height = Math.max(900, y + 106)
  ctx.fillStyle = palette.background
  ctx.fillRect(0, 0, width, canvas.height)
  ctx.strokeStyle = palette.accent
  ctx.lineWidth = 4
  ctx.strokeRect(36, 36, width - 72, canvas.height - 72)
  ctx.lineWidth = 1
  ctx.strokeRect(50, 50, width - 100, canvas.height - 100)
  if (cover) drawPhoto(ctx, cover, 52, 52, width - 104, coverHeight)
  if (photo) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(width / 2, photoY + 90, 90, 0, Math.PI * 2)
    ctx.clip()
    drawPhoto(ctx, photo, width / 2 - 90, photoY, 180, 180)
    ctx.restore()
  }
  ctx.fillStyle = palette.accent
  ctx.fillRect(width / 2 - 82, ruleY, 164, 2)
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  for (const line of lines) {
    ctx.font = line.font
    ctx.fillStyle = line.color
    ctx.fillText(line.text, width / 2, line.y)
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG encoding failed")), "image/png")
  })
}

function wrapText(ctx: CanvasRenderingContext2D, value: string): string[] {
  const lines: string[] = []
  let current = ""
  for (const word of value.trim().split(/\s+/)) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width <= innerWidth) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = ""
    for (const char of word) {
      if (ctx.measureText(current + char).width > innerWidth) {
        lines.push(current)
        current = ""
      }
      current += char
    }
  }
  if (current) lines.push(current)
  return lines
}

async function loadPhoto(url: string): Promise<HTMLImageElement> {
  if (new URL(url).protocol !== "https:") throw new Error("Use HTTPS images")
  return new Promise((resolve, reject) => {
    const photo = new Image()
    const timeout = window.setTimeout(() => reject(new Error("Photo timed out")), 10_000)
    photo.crossOrigin = "anonymous"
    photo.referrerPolicy = "no-referrer"
    photo.onload = () => { window.clearTimeout(timeout); resolve(photo) }
    photo.onerror = () => { window.clearTimeout(timeout); reject(new Error("Photo cannot be exported")) }
    photo.src = url
  })
}

function drawPhoto(ctx: CanvasRenderingContext2D, photo: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  ctx.drawImage(photo, (photo.naturalWidth - sourceWidth) / 2, (photo.naturalHeight - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, width, height)
}
