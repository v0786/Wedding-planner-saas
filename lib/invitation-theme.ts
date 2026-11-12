import type { CSSProperties } from "react"
import { INVITATION_THEMES } from "@/lib/wedding-settings"

type ThemeInput = { invitationTheme?: string; themeColor?: string | null }

function darker(color: string, factor: number) {
  return "#" + color.slice(1).match(/.{2}/g)!.map(channel => Math.floor(parseInt(channel, 16) * factor).toString(16).padStart(2, "0")).join("")
}

function whiteContrast(color: string) {
  const [r, g, b] = color.slice(1).match(/.{2}/g)!.map(channel => {
    const value = parseInt(channel, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05)
}

export function invitationTheme(wedding: ThemeInput) {
  const name = wedding.invitationTheme && Object.hasOwn(INVITATION_THEMES, wedding.invitationTheme)
    ? wedding.invitationTheme as keyof typeof INVITATION_THEMES
    : "classic"
  const accent = /^#[a-f\d]{6}$/i.test(wedding.themeColor ?? "") ? wedding.themeColor! : INVITATION_THEMES[name].color
  let primary = accent
  while (whiteContrast(primary) < 4.5) primary = darker(primary, 0.9)
  return {
    name,
    accent,
    primary,
    primaryHover: darker(primary, 0.82),
    background: name === "floral" ? "#f3f7f0" : name === "minimal" ? "#f7f7f5" : "#fdfaf3",
    surface: name === "floral" ? "#e8efe3" : name === "minimal" ? "#eceef0" : "#f7eedc",
  }
}

export function invitationThemeStyle(wedding: ThemeInput): CSSProperties {
  const palette = invitationTheme(wedding)
  return {
    "--color-primary": palette.primary,
    "--color-primary-hover": palette.primaryHover,
    "--color-accent": palette.accent,
    "--color-background": palette.background,
    "--color-surface-muted": palette.surface,
    backgroundColor: palette.background,
  } as CSSProperties
}
