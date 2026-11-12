import { invitationTheme } from "@/lib/invitation-theme"

it("uses the selected named light theme and ignores invalid colour input", () => {
  expect(invitationTheme({ invitationTheme: "floral", themeColor: null })).toMatchObject({ name: "floral", accent: "#5E7660" })
  expect(invitationTheme({ invitationTheme: "minimal", themeColor: "url(javascript:bad)" })).toMatchObject({ name: "minimal", accent: "#23324C" })
  expect(invitationTheme({ invitationTheme: "unknown" })).toMatchObject({ name: "classic" })
})

it("keeps a pale custom accent decorative while maintaining readable white button text", () => {
  const palette = invitationTheme({ themeColor: "#ffffaa" })
  expect(palette.accent).toBe("#ffffaa")
  const values = palette.primary.match(/[a-f\d]{2}/gi)!.map(value => parseInt(value, 16) / 255)
  const [r, g, b] = values.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  expect(1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05)).toBeGreaterThanOrEqual(4.5)
})

it.each(["#000000", "#ffffaa", "#5E7660"])("keeps custom %s readable on dark web invitations without changing paper exports", themeColor => {
  const web = invitationTheme({ themeColor }, "web")
  const luminance = (hex: string) => {
    const [r, g, b] = hex.slice(1).match(/.{2}/g)!.map(channel => {
      const value = parseInt(channel, 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  expect((luminance(web.primary) + 0.05) / (luminance("#17130b") + 0.05)).toBeGreaterThanOrEqual(4.5)
  expect((luminance(web.primary) + 0.05) / (luminance(web.background) + 0.05)).toBeGreaterThanOrEqual(4.5)
  expect(luminance(web.background)).toBeLessThan(0.02)
  expect(invitationTheme({ themeColor }).accent).toBe(themeColor)
  expect(luminance(invitationTheme({ themeColor }).background)).toBeGreaterThan(0.9)
})
