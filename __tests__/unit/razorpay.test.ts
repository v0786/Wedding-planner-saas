/** @jest-environment node */
import { describe, it, expect, afterEach } from "@jest/globals"
import { createHmac } from "node:crypto"
import {
  getRazorpayConfig,
  isCapturedStatus,
  isPaymentConfigured,
  paymentMatchesOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "@/lib/subscriptions/razorpay"

const originalEnv = {
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
}

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

afterEach(restoreEnv)

describe("razorpay signatures", () => {
  it("reports payments as not configured without keys", () => {
    delete process.env.RAZORPAY_KEY_ID
    delete process.env.RAZORPAY_KEY_SECRET
    expect(getRazorpayConfig()).toBeNull()
    expect(isPaymentConfigured()).toBe(false)
  })

  it("accepts a valid checkout signature and rejects a tampered one", () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_123"
    process.env.RAZORPAY_KEY_SECRET = "secret_abc"
    expect(isPaymentConfigured()).toBe(true)

    const orderId = "order_123"
    const paymentId = "pay_456"
    const signature = createHmac("sha256", "secret_abc")
      .update(`${orderId}|${paymentId}`)
      .digest("hex")

    expect(verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true)
    expect(
      verifyPaymentSignature({ orderId, paymentId, signature: signature.replace(/.$/, "0") }),
    ).toBe(false)
    expect(verifyPaymentSignature({ orderId, paymentId, signature: "" })).toBe(false)
    expect(
      verifyPaymentSignature({ orderId, paymentId: "pay_other", signature }),
    ).toBe(false)
  })

  it("verifies webhook bodies with the webhook secret only", () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_123"
    process.env.RAZORPAY_KEY_SECRET = "secret_abc"
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_xyz"

    const body = JSON.stringify({ event: "payment.captured", payload: {} })
    const signature = createHmac("sha256", "whsec_xyz").update(body).digest("hex")

    expect(verifyWebhookSignature({ rawBody: body, signature })).toBe(true)
    expect(verifyWebhookSignature({ rawBody: body + " ", signature })).toBe(false)
    expect(verifyWebhookSignature({ rawBody: body, signature: null })).toBe(false)
    // A checkout signature (key secret) must not be accepted for webhooks.
    const wrongSecret = createHmac("sha256", "secret_abc").update(body).digest("hex")
    expect(verifyWebhookSignature({ rawBody: body, signature: wrongSecret })).toBe(false)
  })

  it("rejects webhooks when no webhook secret is configured", () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_123"
    process.env.RAZORPAY_KEY_SECRET = "secret_abc"
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    expect(verifyWebhookSignature({ rawBody: "{}", signature: "deadbeef" })).toBe(false)
  })

  it("verifies webhooks with only the webhook secret configured", () => {
    delete process.env.RAZORPAY_KEY_ID
    delete process.env.RAZORPAY_KEY_SECRET
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_only"

    const body = JSON.stringify({ event: "payment.captured" })
    const signature = createHmac("sha256", "whsec_only").update(body).digest("hex")

    expect(getRazorpayConfig()).toBeNull()
    expect(verifyWebhookSignature({ rawBody: body, signature })).toBe(true)
  })

  it("validates the paid amount and currency against the order", () => {
    expect(
      paymentMatchesOrder({
        expectedAmountInPaise: 99900,
        expectedCurrency: "INR",
        actualAmountInPaise: 99900,
        actualCurrency: "inr",
      }),
    ).toBe(true)
    expect(
      paymentMatchesOrder({
        expectedAmountInPaise: 99900,
        expectedCurrency: "INR",
        actualAmountInPaise: 99800,
        actualCurrency: "INR",
      }),
    ).toBe(false)
    expect(
      paymentMatchesOrder({
        expectedAmountInPaise: 99900,
        expectedCurrency: "INR",
        actualAmountInPaise: 99900,
        actualCurrency: "USD",
      }),
    ).toBe(false)
    expect(
      paymentMatchesOrder({
        expectedAmountInPaise: 99900,
        expectedCurrency: "INR",
        actualAmountInPaise: "99900",
        actualCurrency: "INR",
      }),
    ).toBe(false)
  })

  it("only treats captured or authorized payments as paid", () => {
    expect(isCapturedStatus("captured")).toBe(true)
    expect(isCapturedStatus("authorized")).toBe(true)
    expect(isCapturedStatus("created")).toBe(false)
    expect(isCapturedStatus("failed")).toBe(false)
    expect(isCapturedStatus(undefined)).toBe(false)
  })
})
