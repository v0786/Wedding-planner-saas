import { calculateTax, canShowAdvertisement, settingsSchema } from "@/lib/settings"

const settings = settingsSchema.parse({
  businessName: "", legalAddress: "", supportEmail: "", grievanceContact: "",
  gstEnabled: false, gstRateBasisPoints: 1800, taxInclusive: false,
  advertisementsEnabled: true, dashboardAds: true, invitationAds: true, publicRsvpAds: false,
  adText: "Wedding services", adUrl: "https://example.com/services",
})

it("leaves prices unchanged when tax collection is disabled", () => {
  expect(calculateTax(49900, settings)).toEqual({
    baseAmountInPaise: 49900, taxAmountInPaise: 0, taxRateBasisPoints: 0,
    taxInclusive: false, amountInPaise: 49900,
  })
})

it("rounds exclusive and inclusive tax in paise and preserves the inclusive total", () => {
  expect(calculateTax(49900, { ...settings, gstEnabled: true })).toMatchObject({
    baseAmountInPaise: 49900, taxAmountInPaise: 8982, amountInPaise: 58882,
  })
  const inclusive = calculateTax(49900, { ...settings, gstEnabled: true, taxInclusive: true })
  expect(inclusive.amountInPaise).toBe(49900)
  expect(inclusive.baseAmountInPaise + inclusive.taxAmountInPaise).toBe(49900)
  expect(inclusive.taxAmountInPaise).toBe(7612)
  expect(() => calculateTax(1.5, settings)).toThrow()
})

it("excludes Prime and unpaid accounts from every advertisement placement", () => {
  for (const placement of ["dashboard", "invitation", "publicRsvp"] as const) {
    expect(canShowAdvertisement("PRIME", placement, { ...settings, publicRsvpAds: true })).toBe(false)
    expect(canShowAdvertisement("FREE", placement, settings)).toBe(false)
  }
  expect(canShowAdvertisement("BASIC", "dashboard", settings)).toBe(true)
  expect(canShowAdvertisement("PRO", "publicRsvp", settings)).toBe(false)
  expect(canShowAdvertisement("PRO", "dashboard", { ...settings, advertisementsEnabled: false })).toBe(false)
  expect(canShowAdvertisement("BASIC", "dashboard", { ...settings, adText: "" })).toBe(false)
})
