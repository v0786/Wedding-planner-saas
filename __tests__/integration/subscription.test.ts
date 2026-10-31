import { describe, it, expect, beforeAll, afterAll } from "@jest/globals"
import { prisma } from "@/lib/prisma"
import {
  assertFeature,
  assertWeddingLimit,
  assertWorkspaceLimit,
  ensurePlanRows,
  getEntitlements,
  getPlanConfigs,
  withWorkspaceLimitLock,
} from "@/lib/subscriptions/service"
import {
  activatePayment,
  createCheckout,
  markPaymentFailed,
  verifyAndActivatePayment,
} from "@/lib/subscriptions/payments"

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const ownerEmail = `sub-owner-${suffix}@example.com`
const otherEmail = `sub-other-${suffix}@example.com`

let ownerId: string
let otherId: string
let workspaceId: string
let otherWorkspaceId: string
let weddingId: string

async function makePayment(workspace: string, planCode: "PRO" | "PRIME", orderId: string) {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: planCode } })
  return prisma.payment.create({
    data: {
      workspaceId: workspace,
      planId: plan.id,
      planCode,
      provider: "razorpay",
      providerOrderId: orderId,
      amountInPaise: plan.priceInPaise ?? 0,
      currency: "INR",
      billingPeriodDays: plan.billingPeriodDays,
      status: "PENDING",
      receipt: `receipt_${orderId}`,
    },
  })
}

beforeAll(async () => {
  await ensurePlanRows()
  // Make paid plans purchasable and keep limits small so tests stay fast.
  await prisma.plan.update({
    where: { code: "PRO" },
    data: {
      priceInPaise: 99900,
      isActive: true,
      billingPeriodDays: 30,
      limits: { weddings: 3, guestsPerWedding: 2, eventsPerWedding: 2, customQuestionsPerWedding: 2 },
      features: {
        whatsappSharing: true,
        customQuestions: true,
        csvImport: true,
        csvExport: true,
        reports: true,
        customBranding: true,
        prioritySupport: false,
      },
    },
  })
  await prisma.plan.update({
    where: { code: "PRIME" },
    data: {
      priceInPaise: 199900,
      isActive: true,
      billingPeriodDays: 30,
      limits: { weddings: null, guestsPerWedding: null, eventsPerWedding: null, customQuestionsPerWedding: null },
      features: {
        whatsappSharing: true,
        customQuestions: true,
        csvImport: true,
        csvExport: true,
        reports: true,
        customBranding: true,
        prioritySupport: true,
      },
    },
  })

  const owner = await prisma.user.create({ data: { email: ownerEmail, name: "Subscription Owner" } })
  ownerId = owner.id
  const other = await prisma.user.create({ data: { email: otherEmail, name: "Other Owner" } })
  otherId = other.id

  const workspace = await prisma.workspace.create({
    data: { name: `Subscription workspace ${suffix}`, members: { create: { userId: owner.id } } },
  })
  workspaceId = workspace.id
  const otherWorkspace = await prisma.workspace.create({
    data: { name: `Other workspace ${suffix}`, members: { create: { userId: other.id } } },
  })
  otherWorkspaceId = otherWorkspace.id

  const wedding = await prisma.wedding.create({
    data: { workspaceId, name: "Subscription Wedding", coupleName1: "A", coupleName2: "B" },
  })
  weddingId = wedding.id
})

afterAll(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId] } } })
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } })
  // Restore the shipped defaults so other runs see "Coming Soon".
  for (const plan of await getPlanConfigs()) {
    await prisma.plan.update({
      where: { code: plan.code },
      data: { priceInPaise: null, isActive: plan.code === "FREE" },
    })
  }
  await prisma.$disconnect()
})

describe("subscriptions and entitlements", () => {
  it("starts on FREE with limited features and limits", async () => {
    const entitlements = await getEntitlements(workspaceId)
    expect(entitlements.planCode).toBe("FREE")
    expect(entitlements.status).toBe("FREE")
    expect(entitlements.features.whatsappSharing).toBe(true)
    expect(entitlements.features.reports).toBe(false)
    expect(entitlements.limits.weddings).toBe(1)
  })

  it("blocks premium features on FREE with a structured error", async () => {
    await expect(assertFeature(workspaceId, "reports")).rejects.toMatchObject({
      status: 403,
      details: { code: "FEATURE_NOT_AVAILABLE", feature: "reports", plan: "FREE" },
    })
  })

  it("enforces the wedding limit on FREE", async () => {
    await expect(assertWorkspaceLimit(workspaceId, "weddings")).rejects.toMatchObject({
      status: 402,
      details: { code: "LIMIT_REACHED", limitKey: "weddings", current: 1, max: 1 },
    })
  })

  it("enforces the per-wedding question limit even before the feature gate", async () => {
    await expect(assertWeddingLimit(workspaceId, weddingId, "customQuestions")).rejects.toMatchObject({
      status: 402,
      details: { current: 0, max: 0 },
    })
  })

  it("activates a PRO subscription only after a paid record", async () => {
    const orderId = `order_pro_${suffix}`
    await makePayment(workspaceId, "PRO", orderId)

    // Pre-activation the workspace is still free.
    expect((await getEntitlements(workspaceId)).planCode).toBe("FREE")

    await activatePayment(orderId, `pay_pro_${suffix}`)

    const entitlements = await getEntitlements(workspaceId)
    expect(entitlements.planCode).toBe("PRO")
    expect(entitlements.status).toBe("ACTIVE")
    expect(entitlements.features.reports).toBe(true)
    expect(entitlements.features.prioritySupport).toBe(false)
    expect(entitlements.limits.weddings).toBe(3)
    expect(entitlements.currentPeriodEnd).toBeInstanceOf(Date)

    await expect(assertFeature(workspaceId, "reports")).resolves.toBeTruthy()
  })

  it("is idempotent when the same payment is activated twice", async () => {
    const before = await getEntitlements(workspaceId)
    const orderId = `order_pro_${suffix}`
    await activatePayment(orderId, `pay_pro_${suffix}`)
    const after = await getEntitlements(workspaceId)
    expect(after.currentPeriodEnd?.toISOString()).toBe(before.currentPeriodEnd?.toISOString())
  })

  it("enforces PRO guest, event and question limits", async () => {
    // 0 guests, adding 2 is allowed; adding 3 is not.
    await expect(assertWeddingLimit(workspaceId, weddingId, "guests", 2)).resolves.toBeTruthy()
    await expect(assertWeddingLimit(workspaceId, weddingId, "guests", 3)).rejects.toMatchObject({
      status: 402,
      details: { limitKey: "guestsPerWedding", current: 0, max: 2 },
    })

    await prisma.guest.createMany({
      data: [
        { weddingId, firstName: "Guest", lastName: "One", mobile: `90000${suffix.slice(-5)}` },
        { weddingId, firstName: "Guest", lastName: "Two", mobile: `91000${suffix.slice(-5)}` },
      ],
    })
    await expect(assertWeddingLimit(workspaceId, weddingId, "guests")).rejects.toMatchObject({
      status: 402,
      details: { current: 2, max: 2 },
    })

    await prisma.event.createMany({
      data: [
        { weddingId, name: "Event One" },
        { weddingId, name: "Event Two" },
      ],
    })
    await expect(assertWeddingLimit(workspaceId, weddingId, "events")).rejects.toMatchObject({
      status: 402,
      details: { current: 2, max: 2 },
    })

    await prisma.customQuestion.createMany({
      data: [
        { weddingId, question: "Q1", type: "text" },
        { weddingId, question: "Q2", type: "text" },
      ],
    })
    await expect(assertWeddingLimit(workspaceId, weddingId, "customQuestions")).rejects.toMatchObject({
      status: 402,
      details: { current: 2, max: 2 },
    })
  })

  it("gives PRIME unlimited limits and every feature", async () => {
    const orderId = `order_prime_${suffix}`
    await makePayment(otherWorkspaceId, "PRIME", orderId)
    await activatePayment(orderId, `pay_prime_${suffix}`)

    const entitlements = await getEntitlements(otherWorkspaceId)
    expect(entitlements.planCode).toBe("PRIME")
    expect(entitlements.features.prioritySupport).toBe(true)
    expect(entitlements.limits.weddings).toBeNull()
    expect(entitlements.limits.guestsPerWedding).toBeNull()
  })

  it("rejects verifying a payment that belongs to another workspace", async () => {
    const orderId = `order_foreign_${suffix}`
    await makePayment(otherWorkspaceId, "PRO", orderId)

    await expect(
      verifyAndActivatePayment(ownerId, {
        razorpayOrderId: orderId,
        razorpayPaymentId: "pay_foreign",
        razorpaySignature: "deadbeef",
      }),
    ).rejects.toMatchObject({ status: 404 })

    const payment = await prisma.payment.findUniqueOrThrow({ where: { providerOrderId: orderId } })
    expect(payment.status).toBe("PENDING")
  })

  it("marks a payment failed when the signature is invalid", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_integration"
    process.env.RAZORPAY_KEY_SECRET = "integration_secret"

    const orderId = `order_badsig_${suffix}`
    await makePayment(workspaceId, "PRO", orderId)

    await expect(
      verifyAndActivatePayment(ownerId, {
        razorpayOrderId: orderId,
        razorpayPaymentId: "pay_badsig",
        razorpaySignature: "not-a-signature",
      }),
    ).rejects.toMatchObject({ status: 400, details: { code: "PAYMENT_VERIFICATION_FAILED" } })

    const payment = await prisma.payment.findUniqueOrThrow({ where: { providerOrderId: orderId } })
    expect(payment.status).toBe("FAILED")
    // No plan change happened because verification failed.
    expect((await getEntitlements(workspaceId)).planCode).toBe("PRO")

    delete process.env.RAZORPAY_KEY_ID
    delete process.env.RAZORPAY_KEY_SECRET
  })

  it("schedules a downgrade to Free at period end without charging", async () => {
    const result = await createCheckout(ownerId, "FREE")
    expect(result.requiresPayment).toBe(false)
    expect(result.scheduled).toBe(true)

    const entitlements = await getEntitlements(workspaceId)
    expect(entitlements.planCode).toBe("PRO")
    expect(entitlements.cancelAtPeriodEnd).toBe(true)
    expect(entitlements.pendingPlanCode).toBe("FREE")
  })

  it("expires the subscription and falls back to FREE after the period ends", async () => {
    await prisma.subscription.update({
      where: { workspaceId },
      data: { currentPeriodEnd: new Date(Date.now() - 60_000), status: "ACTIVE" },
    })

    const entitlements = await getEntitlements(workspaceId)
    expect(entitlements.planCode).toBe("FREE")
    expect(entitlements.status).toBe("EXPIRED")
    expect(entitlements.features.reports).toBe(false)

    const stored = await prisma.subscription.findUniqueOrThrow({ where: { workspaceId } })
    expect(stored.status).toBe("EXPIRED")
  })

  it("rejects creating a checkout when the price is not configured", async () => {
    await prisma.plan.update({ where: { code: "PRO" }, data: { priceInPaise: null } })
    await expect(createCheckout(ownerId, "PRO")).rejects.toMatchObject({
      status: 409,
      details: { code: "PRICE_NOT_CONFIGURED" },
    })
    await prisma.plan.update({ where: { code: "PRO" }, data: { priceInPaise: 99900 } })
  })

  it("rejects activation when the paid amount or currency does not match", async () => {
    const orderId = `order_amount_${suffix}`
    const payment = await makePayment(otherWorkspaceId, "PRIME", orderId)

    await expect(
      activatePayment(orderId, {
        providerPaymentId: `pay_amount_${suffix}`,
        amountInPaise: payment.amountInPaise + 1,
        currency: "INR",
      }),
    ).rejects.toMatchObject({ status: 409, details: { code: "PAYMENT_AMOUNT_MISMATCH" } })

    await expect(
      activatePayment(orderId, {
        providerPaymentId: `pay_amount_${suffix}`,
        amountInPaise: payment.amountInPaise,
        currency: "USD",
      }),
    ).rejects.toMatchObject({ status: 409, details: { code: "PAYMENT_CURRENCY_MISMATCH" } })

    const stored = await prisma.payment.findUniqueOrThrow({ where: { providerOrderId: orderId } })
    expect(stored.status).toBe("PENDING")
  })

  it("renews from the paid-through date instead of starting over", async () => {
    const before = await getEntitlements(otherWorkspaceId)
    const orderId = `order_renew_${suffix}`
    const payment = await makePayment(otherWorkspaceId, "PRIME", orderId)

    await activatePayment(orderId, {
      providerPaymentId: `pay_renew_${suffix}`,
      amountInPaise: payment.amountInPaise,
      currency: payment.currency,
    })

    const after = await getEntitlements(otherWorkspaceId)
    const addedDays = Math.round(
      (after.currentPeriodEnd!.getTime() - before.currentPeriodEnd!.getTime()) / 86_400_000,
    )
    expect(addedDays).toBe(30)
    expect(after.planCode).toBe("PRIME")
  })

  it("uses the payment's billing snapshot, not the plan's later value", async () => {
    const orderId = `order_snapshot_${suffix}`
    const payment = await makePayment(otherWorkspaceId, "PRIME", orderId)
    const before = await prisma.subscription.findUniqueOrThrow({
      where: { workspaceId: otherWorkspaceId },
    })

    try {
      await prisma.plan.update({
        where: { code: "PRIME" },
        data: { billingPeriodDays: 120, priceInPaise: 999900 },
      })
      await activatePayment(orderId, {
        providerPaymentId: `pay_snapshot_${suffix}`,
        amountInPaise: payment.amountInPaise,
        currency: payment.currency,
      })

      const after = await prisma.subscription.findUniqueOrThrow({
        where: { workspaceId: otherWorkspaceId },
      })
      const addedDays = Math.round(
        (after.currentPeriodEnd.getTime() - before.currentPeriodEnd.getTime()) / 86_400_000,
      )
      expect(addedDays).toBe(30)
    } finally {
      await prisma.plan.update({
        where: { code: "PRIME" },
        data: { billingPeriodDays: 30, priceInPaise: 199900 },
      })
    }
  })

  it("activates a concurrently delivered payment exactly once", async () => {
    const before = await prisma.subscription.findUniqueOrThrow({
      where: { workspaceId: otherWorkspaceId },
    })
    const orderId = `order_concurrent_${suffix}`
    const payment = await makePayment(otherWorkspaceId, "PRIME", orderId)
    const evidence = {
      providerPaymentId: `pay_concurrent_${suffix}`,
      amountInPaise: payment.amountInPaise,
      currency: payment.currency,
    }

    const results = await Promise.allSettled([
      activatePayment(orderId, evidence),
      activatePayment(orderId, evidence),
    ])
    expect(results.every((result) => result.status === "fulfilled")).toBe(true)

    const after = await prisma.subscription.findUniqueOrThrow({
      where: { workspaceId: otherWorkspaceId },
    })
    const addedDays = Math.round(
      (after.currentPeriodEnd.getTime() - before.currentPeriodEnd.getTime()) / 86_400_000,
    )
    expect(addedDays).toBe(30)
  })

  it("never grants a paid downgrade without a payment", async () => {
    await expect(createCheckout(otherId, "PRO")).rejects.toMatchObject({
      status: 409,
      details: { code: "PAID_DOWNGRADE_NOT_SUPPORTED" },
    })

    // A stale pending paid plan in the database is ignored at settlement and
    // falls back to FREE instead of granting it for free.
    await prisma.subscription.update({
      where: { workspaceId: otherWorkspaceId },
      data: {
        currentPeriodEnd: new Date(Date.now() - 60_000),
        status: "ACTIVE",
        pendingPlanCode: "PRO",
      },
    })

    const entitlements = await getEntitlements(otherWorkspaceId)
    expect(entitlements.planCode).toBe("FREE")
    expect(entitlements.status).toBe("EXPIRED")
  })

  it("serialises quota checks so concurrent creates cannot exceed the limit", async () => {
    await prisma.plan.update({
      where: { code: "FREE" },
      data: {
        limits: {
          weddings: 1,
          guestsPerWedding: 3,
          eventsPerWedding: 2,
          customQuestionsPerWedding: 0,
        },
      },
    })

    try {
      const attempt = (mobile: string) =>
        withWorkspaceLimitLock(workspaceId, "guests", async (tx) => {
          await assertWeddingLimit(workspaceId, weddingId, "guests")
          return tx.guest.create({ data: { weddingId, firstName: "Race", mobile } })
        })

      const results = await Promise.allSettled([
        attempt(`92000${suffix.slice(-5)}`),
        attempt(`93000${suffix.slice(-5)}`),
      ])

      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
      const rejected = results.find(
        (result) => result.status === "rejected",
      ) as PromiseRejectedResult
      expect(rejected.reason).toMatchObject({
        status: 402,
        details: { code: "LIMIT_REACHED" },
      })
      expect(await prisma.guest.count({ where: { weddingId } })).toBe(3)
    } finally {
      await prisma.plan.update({
        where: { code: "FREE" },
        data: {
          limits: {
            weddings: 1,
            guestsPerWedding: 50,
            eventsPerWedding: 2,
            customQuestionsPerWedding: 0,
          },
        },
      })
    }
  })

  it("never marks an already paid payment as failed", async () => {
    const orderId = `order_paid_guard_${suffix}`
    const payment = await makePayment(workspaceId, "PRO", orderId)

    await activatePayment(orderId, {
      providerPaymentId: `pay_paid_guard_${suffix}`,
      amountInPaise: payment.amountInPaise,
      currency: payment.currency,
    })

    const afterLateFailure = await markPaymentFailed(orderId, "late failure notification")
    expect(afterLateFailure?.status).toBe("PAID")
    expect((await getEntitlements(workspaceId)).planCode).toBe("PRO")
  })
})
