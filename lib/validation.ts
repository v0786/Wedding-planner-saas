import { z } from "zod"
import { EVENT_PUBLIC_FIELDS, WEDDING_PUBLIC_FIELDS } from "@/lib/wedding-settings"
import { policyAcceptanceSchema } from "@/lib/policies"

/** Trimmed string with explicit bounds. */
const text = (min: number, max: number) =>
  z.string().trim().min(min, `Must be at least ${min} character(s)`).max(max, `Must be at most ${max} characters`)

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .optional()
    .nullable()
    .transform((value) => value || null)

/** Accepts an ISO date string, a `YYYY-MM-DD` input value, a Date, or empty. */
export const optionalDate = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.date({ invalid_type_error: "Enter a valid date" }).nullable(),
)

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254)

/**
 * Mobile numbers are stored without spaces, dashes or parentheses.
 * We keep the format permissive (7-15 digits, optional leading +) because
 * guests may submit international numbers.
 */
export const mobileSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid mobile number")
  .max(20, "Enter a valid mobile number")
  .regex(/^\+?[0-9][0-9\s\-()]{5,18}$/, "Enter a valid mobile number")
  .transform((value) => value.replace(/[\s\-()]/g, ""))

export const optionalMobileSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  mobileSchema.nullable(),
)

export const registerSchema = z.object({
  name: text(1, 120),
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
}).merge(policyAcceptanceSchema)

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
})

const timezoneSchema = z.string().trim().max(100).refine((timezone) => {
  try {
    new Intl.DateTimeFormat("en-IN", { timeZone: timezone })
    return true
  } catch {
    return false
  }
}, "Enter a valid IANA timezone")

const optionalHttpsUrl = z.preprocess(
  value => value === "" ? null : value,
  z.string().trim().url("Enter a valid HTTPS URL").max(2048).refine(
    value => new URL(value).protocol === "https:", "Use an HTTPS URL",
  ).optional().nullable(),
)
const localeSchema = z.string().trim().max(40).refine(value => {
  try { return Intl.DateTimeFormat.supportedLocalesOf([value]).length === 1 } catch { return false }
}, "Enter a supported formatting locale")

export const weddingCreateSchema = z.object({
  name: text(1, 200),
  coupleName1: text(1, 120),
  coupleName2: optionalText(120),
  date: optionalDate,
  venue: optionalText(200),
  address: optionalText(1000),
  description: optionalText(5000),
  timezone: timezoneSchema.default("Asia/Kolkata"),
  locale: localeSchema.default("en-IN"),
  contactVisibility: z.enum(["hidden", "visible"]).default("hidden"),
  publicFields: z.array(z.enum(WEDDING_PUBLIC_FIELDS)).max(WEDDING_PUBLIC_FIELDS.length).default([...WEDDING_PUBLIC_FIELDS]),
  rsvpDeadline: optionalDate,
})

export const weddingUpdateSchema = weddingCreateSchema.partial().extend({
  id: z.string().min(1).optional(),
  mapUrl: optionalHttpsUrl,
  coverImageUrl: optionalHttpsUrl,
  couplePhotoUrl: optionalHttpsUrl,
  invitationTheme: z.enum(["classic", "floral", "minimal"]).optional(),
  themeColor: z.preprocess(value => value === "" ? null : value,
    z.string().regex(/^#[0-9a-f]{6}$/i, "Choose a six-digit hex colour").optional().nullable()),
})

export const publishSchema = z.object({
  published: z.boolean(),
})

export const eventSchema = z.object({
  name: text(1, 120),
  date: optionalDate,
  time: optionalText(20),
  venue: optionalText(200),
  address: optionalText(1000),
  description: optionalText(2000),
  mapUrl: optionalHttpsUrl,
  dressCode: optionalText(200),
  imageUrl: optionalHttpsUrl,
  publicFields: z.array(z.enum(EVENT_PUBLIC_FIELDS)).max(EVENT_PUBLIC_FIELDS.length).default([...EVENT_PUBLIC_FIELDS]),
  order: z.coerce.number().int().min(0).max(10000).default(0),
  rsvpDeadline: optionalDate,
})

export const guestSchema = z.object({
  firstName: text(1, 120),
  lastName: optionalText(120),
  mobile: optionalMobileSchema,
  email: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    emailSchema.nullable(),
  ),
  group: optionalText(120),
  side: optionalText(120),
  category: optionalText(120),
  accommodationNeeds: optionalText(1000),
  transportNeeds: optionalText(1000),
  notes: optionalText(2000),
  dietaryPrefs: optionalText(1000),
})

export const guestQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  group: z.string().trim().max(120).optional().default(""),
  side: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(120).optional().default(""),
  status: z.enum(["all", "pending", "confirmed", "declined", "maybe", "none"]).optional().default("all"),
  sort: z.enum(["newest", "oldest", "name"]).optional().default("newest"),
  page: z.coerce.number().int().min(1).max(100000).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
})

export const familyMemberSchema = z.object({
  fullName: text(1, 120),
  relation: optionalText(100),
  age: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    z.coerce.number().int().min(0).max(120).nullable(),
  ),
  dietaryPrefs: optionalText(500),
})

export const eventResponseSchema = z.enum(["yes", "no", "pending"])

export const rsvpSchema = z.object({
  status: z.enum(["confirmed", "declined", "maybe"]).default("confirmed"),
  partySize: z.number().int().min(1).max(1000).nullable().optional(),
  token: z.string().trim().min(1, "Invitation token is required"),
  fullName: text(1, 200),
  mobile: mobileSchema,
  email: z.preprocess((value) => value === "" || value === undefined ? null : value, emailSchema.nullable()),
  phoneProof: z.string().max(2048).optional(),
  dietaryPrefs: optionalText(1000),
  familyMembers: z.array(familyMemberSchema).max(50).optional().default([]),
  eventResponses: z.record(z.string(), eventResponseSchema).optional().default({}),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        value: text(1, 2000),
      }),
    )
    .max(50)
    .optional()
    .default([]),
  editToken: z.string().min(10).max(200).optional(),
}).superRefine((response, context) => {
  if (response.status !== "declined" && response.partySize != null && response.partySize < 1 + response.familyMembers.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["partySize"], message: "Party size must include you and every named family member" })
  }
})

export const customQuestionSchema = z.object({
  question: text(1, 300),
  type: z.enum(["text", "textarea", "select", "checkbox"]).default("text"),
  options: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  required: z.boolean().default(false),
  order: z.coerce.number().int().min(0).max(10000).default(0),
  enabled: z.boolean().default(true),
})

export type WeddingInput = z.infer<typeof weddingCreateSchema>
export type EventInput = z.infer<typeof eventSchema>
export type GuestInput = z.infer<typeof guestSchema>
export type RsvpInput = z.infer<typeof rsvpSchema>
