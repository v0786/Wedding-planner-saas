import { z } from "zod"

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
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
})

export const weddingCreateSchema = z.object({
  name: text(1, 200),
  coupleName1: text(1, 120),
  coupleName2: optionalText(120),
  date: optionalDate,
  venue: optionalText(200),
  address: optionalText(1000),
  description: optionalText(5000),
  timezone: z.string().trim().max(100).default("Asia/Kolkata"),
  rsvpDeadline: optionalDate,
})

export const weddingUpdateSchema = weddingCreateSchema.partial().extend({
  id: z.string().min(1).optional(),
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
  notes: optionalText(2000),
  dietaryPrefs: optionalText(1000),
})

export const guestQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  group: z.string().trim().max(120).optional().default(""),
  status: z.enum(["all", "pending", "confirmed", "declined", "none"]).optional().default("all"),
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
  token: z.string().trim().min(1, "Invitation token is required"),
  fullName: text(1, 200),
  mobile: mobileSchema,
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
