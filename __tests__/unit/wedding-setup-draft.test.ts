import { EMPTY_WEDDING_SETUP, saveWeddingSetupSchema, weddingSetupDraftSchema } from "@/lib/wedding-setup-draft"
import { weddingCreateSchema } from "@/lib/validation"

it("allows an incomplete private draft but requires names when creating a wedding", () => {
  expect(saveWeddingSetupSchema.safeParse({ step: 0, data: EMPTY_WEDDING_SETUP }).success).toBe(true)
  expect(weddingCreateSchema.safeParse(EMPTY_WEDDING_SETUP).success).toBe(false)
})

it("rejects oversized drafts, foreign fields, invalid steps and impossible calendar dates", () => {
  expect(weddingSetupDraftSchema.safeParse({ ...EMPTY_WEDDING_SETUP, address: "a".repeat(1001) }).success).toBe(false)
  expect(weddingSetupDraftSchema.safeParse({ ...EMPTY_WEDDING_SETUP, workspaceId: "other-account" }).success).toBe(false)
  expect(saveWeddingSetupSchema.safeParse({ step: 4, data: EMPTY_WEDDING_SETUP }).success).toBe(false)
  expect(weddingSetupDraftSchema.safeParse({ ...EMPTY_WEDDING_SETUP, date: "2030-02-31" }).success).toBe(false)
  expect(weddingSetupDraftSchema.safeParse({ ...EMPTY_WEDDING_SETUP, date: "2032-02-29" }).success).toBe(true)
})
