import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

/**
 * Minimal Razorpay integration over the REST API.
 *
 * No SDK is installed on purpose: orders and signature verification are simple
 * HTTP + HMAC operations, and avoiding the dependency keeps the install small.
 * When the environment variables are missing, payments are reported as not
 * configured instead of failing silently.
 */

export interface RazorpayConfig {
  keyId: string
  keySecret: string
  webhookSecret: string | null
  currency: string
}

export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim()
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
  if (!keyId || !keySecret) return null
  return {
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null,
    currency: process.env.RAZORPAY_CURRENCY?.trim() || "INR",
  }
}

export function isPaymentConfigured(): boolean {
  return getRazorpayConfig() !== null
}

/**
 * Webhook signatures use their own secret and must work even when the REST API
 * keys are absent (for example on a webhook-only worker).
 */
export function getWebhookSecret(): string | null {
  return process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null
}

export interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  receipt: string | null
  status: string
}

export class RazorpayError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.name = "RazorpayError"
    this.status = status
  }
}

function authHeader(config: RazorpayConfig): string {
  return `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`
}

export async function createRazorpayOrder(input: {
  amountInPaise: number
  receipt: string
  notes?: Record<string, string>
}): Promise<RazorpayOrder> {
  const config = getRazorpayConfig()
  if (!config) throw new RazorpayError("Payments are not configured yet", 503)
  if (!Number.isInteger(input.amountInPaise) || input.amountInPaise <= 0) {
    throw new RazorpayError("Invalid order amount", 400)
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: authHeader(config),
    },
    body: JSON.stringify({
      amount: input.amountInPaise,
      currency: config.currency,
      receipt: input.receipt,
      notes: input.notes ?? {},
      payment_capture: 1,
    }),
    cache: "no-store",
  })

  const payload = (await response.json().catch(() => null)) as
    | (RazorpayOrder & { error?: { description?: string } })
    | null

  if (!response.ok || !payload?.id) {
    throw new RazorpayError(
      payload?.error?.description || `Razorpay order failed (${response.status})`,
      502,
    )
  }

  return {
    id: payload.id,
    amount: payload.amount,
    currency: payload.currency,
    receipt: payload.receipt ?? null,
    status: payload.status,
  }
}

export interface RazorpayPayment {
  id: string
  order_id: string | null
  amount: number
  currency: string
  status: string
  method?: string | null
}

/**
 * Reads a payment from Razorpay so activation can be checked against the
 * amount and currency the server recorded for the order, not only against the
 * checkout signature.
 */
export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const config = getRazorpayConfig()
  if (!config) throw new RazorpayError("Payments are not configured yet", 503)
  if (!paymentId) throw new RazorpayError("Payment id is required", 400)

  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: { authorization: authHeader(config) },
    cache: "no-store",
  })

  const payload = (await response.json().catch(() => null)) as
    | (RazorpayPayment & { error?: { description?: string } })
    | null

  if (!response.ok || !payload?.id) {
    throw new RazorpayError(
      payload?.error?.description || `Razorpay payment lookup failed (${response.status})`,
      502,
    )
  }

  return {
    id: payload.id,
    order_id: payload.order_id ?? null,
    amount: payload.amount,
    currency: payload.currency,
    status: payload.status,
    method: payload.method ?? null,
  }
}

/**
 * A payment is only accepted when it belongs to the stored order, matches the
 * recorded amount and currency, and Razorpay reports it as captured/authorized.
 */
export function paymentMatchesOrder(input: {
  expectedAmountInPaise: number
  expectedCurrency: string
  actualAmountInPaise: unknown
  actualCurrency: unknown
}): boolean {
  if (typeof input.actualAmountInPaise !== "number" || !Number.isFinite(input.actualAmountInPaise)) {
    return false
  }
  if (input.actualAmountInPaise !== input.expectedAmountInPaise) return false
  if (typeof input.actualCurrency !== "string") return false
  return input.actualCurrency.trim().toUpperCase() === input.expectedCurrency.trim().toUpperCase()
}

/** Razorpay statuses that mean money has been taken. */
export function isCapturedStatus(status: unknown): boolean {
  return status === "captured" || status === "authorized"
}

/** Razorpay checkout signature: HMAC_SHA256(`${orderId}|${paymentId}`, keySecret). */
export function verifyPaymentSignature(input: {
  orderId: string
  paymentId: string
  signature: string
  keySecret?: string
}): boolean {
  const secret = input.keySecret ?? getRazorpayConfig()?.keySecret
  if (!secret || !input.orderId || !input.paymentId || !input.signature) return false
  const expected = createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex")
  return safeEqual(expected, input.signature)
}

/** Webhook signature: HMAC_SHA256(rawBody, webhookSecret). */
export function verifyWebhookSignature(input: {
  rawBody: string
  signature: string | null
  webhookSecret?: string | null
}): boolean {
  const secret = input.webhookSecret ?? getWebhookSecret()
  if (!secret || !input.signature) return false
  const expected = createHmac("sha256", secret).update(input.rawBody).digest("hex")
  return safeEqual(expected, input.signature)
}

function safeEqual(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(received, "utf8")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function makeReceipt(prefix = "wgm"): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 24)}`
}
