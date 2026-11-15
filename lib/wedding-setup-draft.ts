import { z } from "zod"
import { WEDDING_PUBLIC_FIELDS } from "@/lib/wedding-settings"

const shortDate = z.string().max(10).refine(value => value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime()) && new Date(value).toISOString().slice(0, 10) === value), "Enter a valid date")

/** Partial inputs may be saved, but creation always passes weddingCreateSchema. */
export const weddingSetupDraftSchema = z.object({
  name: z.string().max(200),
  coupleName1: z.string().max(120),
  coupleName2: z.string().max(120),
  date: shortDate,
  venue: z.string().max(200),
  address: z.string().max(1000),
  description: z.string().max(5000),
  rsvpDeadline: shortDate,
  timezone: z.string().max(100),
  locale: z.string().max(40),
  contactVisibility: z.enum(["hidden", "visible"]),
  publicFields: z.array(z.enum(WEDDING_PUBLIC_FIELDS)).max(WEDDING_PUBLIC_FIELDS.length),
}).strict()

export const saveWeddingSetupSchema = z.object({
  step: z.number().int().min(0).max(3),
  data: weddingSetupDraftSchema,
}).strict()

export type WeddingSetupDraftData = z.infer<typeof weddingSetupDraftSchema>

export const EMPTY_WEDDING_SETUP: WeddingSetupDraftData = {
  name: "", coupleName1: "", coupleName2: "", date: "", venue: "", address: "", description: "", rsvpDeadline: "",
  timezone: "Asia/Kolkata", locale: "en-IN", contactVisibility: "hidden", publicFields: [...WEDDING_PUBLIC_FIELDS],
}
