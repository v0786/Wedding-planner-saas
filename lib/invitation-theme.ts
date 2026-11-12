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

export function invitationTheme(wedding: ThemeInput, appearance: "print" | "web" = "print") {
  const name = wedding.invitationTheme && Object.hasOwn(INVITATION_THEMES, wedding.invitationTheme)
    ? wedding.invitationTheme as keyof typeof INVITATION_THEMES
    : "classic"
  const accent = /^#[a-f\d]{6}$/i.test(wedding.themeColor ?? "") ? wedding.themeColor! : INVITATION_THEMES[name].color
  let primary = accent
  if (appearance === "web") {
    // Preserve a host's accent while making text and gold controls legible on
    // the dark website. The paper palette remains unchanged for PDF and PNG.
    while (whiteContrast(primary) > 3.7) {
      primary = "#" + primary.slice(1).match(/.{2}/g)!.map(channel =>
        Math.min(255, Math.ceil(parseInt(channel, 16) * 0.9 + 25.5)).toString(16).padStart(2, "0"),
      ).join("")
    }
    return {
      name,
      accent: primary,
      primary,
      primaryHover: "#" + primary.slice(1).match(/.{2}/g)!.map(channel =>
        Math.min(255, Math.ceil(parseInt(channel, 16) * 0.85 + 38.25)).toString(16).padStart(2, "0"),
      ).join(""),
      background: name === "floral" ? "#10140f" : name === "minimal" ? "#111213" : "#12110e",
      surface: name === "floral" ? "#1b241a" : name === "minimal" ? "#202123" : "#262218",
    }
  }
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

export function invitationThemeStyle(wedding: ThemeInput, appearance: "print" | "web" = "print"): CSSProperties {
  const palette = invitationTheme(wedding, appearance)
  const style: CSSProperties & Record<`--${string}`, string> = {
    "--color-primary": palette.primary,
    "--color-primary-hover": palette.primaryHover,
    "--color-accent": palette.accent,
    "--color-background": palette.background,
    "--color-surface-muted": palette.surface,
    ...(appearance === "web" ? {
      "--color-surface": "#1c1a16",
      "--color-text": "#f4eee2",
      "--color-text-muted": "#bcb2a0",
      "--color-border": "#393329",
      colorScheme: "dark",
    } : { colorScheme: "light", color: "#34261d", "--ink": "#34261d" }),
    backgroundColor: palette.background,
  }
  return style
}
