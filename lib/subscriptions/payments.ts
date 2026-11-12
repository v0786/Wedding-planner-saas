import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import {
  planChangeKind,
  planRank,
  type PlanCode,
  type PlanConfig,
} from "@/lib/subscriptions/config"
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  getRazorpayConfig,
  isCapturedStatus,
  makeReceipt,
  paymentMatchesOrder,
  verifyPaymentSignature,
  type RazorpayOrder,
} from "@/lib/subscriptions/razorpay"
import {
  getEntitlements,
  getEntitlementsForUser,
  getPlanConfig,
  getPlanConfigs,
  getUserWorkspaceId,
  getWeddingEntitlements,
} from "@/lib/subscriptions/service"
import type { Prisma } from "@prisma/client"
import { requireWeddingAccess } from "@/lib/wedding-access"
import { assertWeddingOpen, weddingExpiry } from "@/lib/wedding-lifecycle"

import { calculateTax, getPlatformSettings, type TaxQuote } from "@/lib/settings"

const DAY_MS = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface CheckoutResult {
  /** False when the request scheduled a downgrade instead of taking payment. */
  requiresPayment: boolean
  scheduled?: boolean
  message?: string
  orderId?: string
  amountInPaise?: number
  baseAmountInPaise?: number
  taxAmountInPaise?: number
  taxRateBasisPoints?: number
  taxInclusive?: boolean
  currency?: string
  keyId?: string
  planCode?: PlanCode
  planName?: string
  paymentId?: string
}

async function latestWeddingPayment(
  db: Pick<Prisma.TransactionClient, "payment">,
  weddingId: string,
) {
  return db.payment.findFirst({
    where: { weddingId, status: "PAID", weddingPlanPriceInPaise: { not: null } },
    orderBy: { paidAt: "desc" },
  })
}

function quoteWeddingPlan(
  target: PlanConfig,
  current: Awaited<ReturnType<typeof latestWeddingPayment>>,
): number {
  if (target.code === "FREE" || !target.isActive || !target.priceInPaise) {
    throw new ApiError("This plan is unavailable for purchase.", 409)
  }
  if (current && planRank(current.planCode as PlanCode) >= target.rank) {
    throw new ApiError("Choose a higher plan for this wedding.", 409)
  }
  const amount = target.priceInPaise - (current?.weddingPlanPriceInPaise ?? 0)
  if (amount <= 0) throw new ApiError("Upgrade pricing is unavailable.", 409)
  return amount
}

function paymentTaxQuote(payment: {
  amountInPaise: number
  baseAmountInPaise: number | null
  taxAmountInPaise: number | null
  taxRateBasisPoints: number | null
  taxInclusive: boolean | null
}): TaxQuote {
  return {
    amountInPaise: payment.amountInPaise,
    baseAmountInPaise: payment.baseAmountInPaise ?? payment.amountInPaise,
    taxAmountInPaise: payment.taxAmountInPaise ?? 0,
    taxRateBasisPoints: payment.taxRateBasisPoints ?? 0,
    taxInclusive: payment.taxInclusive ?? false,
  }
}

export async function getWeddingCheckoutBreakdown(weddingId: string, target: PlanConfig) {
  const open = await prisma.payment.findFirst({
    where: { weddingId, status: { in: ["PENDING", "FAILED"] } },
    orderBy: { createdAt: "desc" },
  })
  if (open?.planCode === target.code) return paymentTaxQuote(open)
  if (open) throw new ApiError(`Finish your ${open.planCode} checkout first.`, 409)
  const base = quoteWeddingPlan(target, await latestWeddingPayment(prisma, weddingId))
  return calculateTax(base, await getPlatformSettings())
}

export async function getWeddingCheckoutQuote(weddingId: string, target: PlanConfig) {
  return (await getWeddingCheckoutBreakdown(weddingId, target)).amountInPaise
}

/** One order per wedding at a time. Reopen an interrupted order instead of charging twice. */
export async function createWeddingCheckout(
  userId: string,
  weddingId: string,
  planCode: string,
): Promise<CheckoutResult> {
  const target = await getPlanConfig(planCode)
  const config = getRazorpayConfig()
  if (!config || config.currency.toUpperCase() !== "INR") {
    throw new ApiError("Payments are not configured yet", 503)
  }

  return prisma.$transaction(async (tx) => {
    const wedding = await requireWeddingAccess(weddingId, userId, tx)
    await tx.$executeRaw`SELECT id FROM "Wedding" WHERE id = ${wedding.id} FOR UPDATE`
    const schedule = await tx.wedding.findUniqueOrThrow({
      where: { id: wedding.id },
      select: { date: true, timezone: true },
    })
    assertWeddingOpen(schedule)
    if (!weddingExpiry(schedule)) throw new ApiError("Set the wedding date before choosing a plan.", 409)

    const open = await tx.payment.findFirst({
      where: { weddingId, status: { in: ["PENDING", "FAILED"] } },
      orderBy: { createdAt: "desc" },
    })
    if (open && open.planCode !== target.code) {
      throw new ApiError(`Finish your ${open.planCode} checkout first.`, 409)
    }
    let payment = open
    if (!payment) {
      const baseAmount = quoteWeddingPlan(target, await latestWeddingPayment(tx, weddingId))
      const settings = await tx.platformSettings.upsert({ where: { id: "platform" }, create: {}, update: {} })
      const taxQuote = calculateTax(baseAmount, settings)
      const amount = taxQuote.amountInPaise
      const planId = target.id
      if (!planId) throw new ApiError("Plan is not available", 404)
      const receipt = makeReceipt(`wed_${target.code.toLowerCase()}`)
      let order: RazorpayOrder
      try {
        order = await createRazorpayOrder({
          amountInPaise: amount,
          receipt,
          notes: { weddingId, planCode: target.code },
        })
      } catch (error) {
        console.error("razorpay wedding order failed", error)
        throw new ApiError("Could not start checkout. Please try again.", 502)
      }
      if (!paymentMatchesOrder({
        expectedAmountInPaise: amount,
        expectedCurrency: config.currency,
        actualAmountInPaise: order.amount,
        actualCurrency: order.currency,
      })) throw new ApiError("The payment provider returned a mismatched order", 502)

      payment = await tx.payment.create({
        data: {
          weddingId,
          workspaceId: wedding.workspaceId,
          planId,
          planCode: target.code,
          providerOrderId: order.id,
          ...taxQuote,
          weddingPlanPriceInPaise: target.priceInPaise,
          currency: order.currency,
          billingPeriodDays: 0,
          receipt,
        },
      })
    }
    return {
      requiresPayment: true,
      orderId: payment.providerOrderId,
      ...paymentTaxQuote(payment),
      currency: payment.currency,
      keyId: config.keyId,
      planCode: target.code,
      planName: target.name,
      paymentId: payment.id,
    }
  }, { timeout: 20_000 })
}

/**
 * Starts a purchase (upgrade or first subscription) or schedules a downgrade.
 * Nothing is activated until a verified payment arrives.
 */
export async function createCheckout(userId: string, planCode: string): Promise<CheckoutResult> {
  const target = await getPlanConfig(planCode)
  const entitlements = await getEntitlementsForUser(userId)
  const currentCode = entitlements.planCode
  const change = planChangeKind(currentCode, target.code)

  if (change === "same") {
    if (target.code === "FREE") {
      throw new ApiError("You are already on the Free plan.", 409, {
        code: "PLAN_ALREADY_ACTIVE",
        plan: currentCode,
      })
    }
    // Renewal of the current paid plan. A verified payment extends the period
    // from the paid-through date instead of starting over.
  }

  if (change === "downgrade") {
    if (entitlements.status !== "ACTIVE" || !entitlements.subscriptionId) {
      throw new ApiError("There is no active paid subscription to downgrade", 409, {
        code: "NO_ACTIVE_SUBSCRIPTION",
      })
    }
    if (target.code !== "FREE") {
      // Switching to a cheaper paid plan without a charge would grant that plan
      // for free. Paid plans are prepaid, so the safe path is to let the current
      // period end (or cancel) and then buy the cheaper plan.
      throw new ApiError(
        `Cancel your current plan at the end of the period, then subscribe to ${target.name}.`,
        409,
        { code: "PAID_DOWNGRADE_NOT_SUPPORTED", plan: target.code },
      )
    }
    // Paid plans are prepaid: the downgrade takes effect at the end of the
    // current period. Nothing is charged and no refund is issued.
    await prisma.subscription.update({
      where: { id: entitlements.subscriptionId },
      data: { cancelAtPeriodEnd: true, pendingPlanCode: "FREE" },
    })
    return {
      requiresPayment: false,
      scheduled: true,
      planCode: target.code,
      planName: target.name,
      message: "Your plan will move to Free at the end of the current billing period.",
    }
  }

  // Upgrade (or free → paid): needs a configured price and an active plan.
  if (!target.isActive) {
    throw new ApiError(`${target.name} is not available for purchase yet`, 409, {
      code: "PLAN_NOT_AVAILABLE",
      plan: target.code,
    })
  }
  if (target.priceInPaise === null || target.priceInPaise <= 0) {
    throw new ApiError(`${target.name} pricing has not been configured yet`, 409, {
      code: "PRICE_NOT_CONFIGURED",
      plan: target.code,
    })
  }

  const config = getRazorpayConfig()
  if (!config) {
    throw new ApiError("Payments are not configured yet", 503, {
      code: "PAYMENTS_NOT_CONFIGURED",
    })
  }

  const workspaceId = await getUserWorkspaceId(userId)
  const planRow = await prisma.plan.findUnique({ where: { code: target.code } })
  if (!planRow) throw new ApiError("Plan is not available", 404)

  const receipt = makeReceipt(`plan_${target.code.toLowerCase()}`)
  let order: RazorpayOrder
  try {
    order = await createRazorpayOrder({
      amountInPaise: target.priceInPaise,
      receipt,
      notes: { workspaceId, planCode: target.code, userId },
    })
  } catch (error) {
    console.error("razorpay order failed", error)
    throw new ApiError("Could not start checkout with the payment provider. Please try again.", 502, {
      code: "PAYMENT_PROVIDER_ERROR",
    })
  }

  if (
    !paymentMatchesOrder({
      expectedAmountInPaise: target.priceInPaise,
      expectedCurrency: config.currency,
      actualAmountInPaise: order.amount,
      actualCurrency: order.currency,
    })
  ) {
    throw new ApiError("The payment provider returned a mismatched order", 502, {
      code: "ORDER_MISMATCH",
    })
  }

  const payment = await prisma.payment.create({
    data: {
      workspaceId,
      planId: planRow.id,
      planCode: target.code,
      provider: "razorpay",
      providerOrderId: order.id,
      amountInPaise: target.priceInPaise,
      currency: order.currency || config.currency,
      billingPeriodDays: Math.max(1, target.billingPeriodDays || 30),
      status: "PENDING",
      receipt,
      notes: { planCode: target.code },
    },
  })

  return {
    requiresPayment: true,
    orderId: order.id,
    amountInPaise: target.priceInPaise,
    currency: order.currency || config.currency,
    keyId: config.keyId,
    planCode: target.code,
    planName: target.name,
    paymentId: payment.id,
  }
}

// ---------------------------------------------------------------------------
// Verification + activation
// ---------------------------------------------------------------------------

export interface VerifyInput {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

/**
 * Verifies the checkout signature and, only then, activates the subscription.
 * Idempotent: a repeated verify/webhook for the same order returns the paid
 * payment without extending the period twice.
 */
export async function verifyAndActivatePayment(userId: string, input: VerifyInput) {
  const payment = await prisma.payment.findUnique({
    where: { providerOrderId: input.razorpayOrderId },
  })
  if (!payment || !(await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: payment.workspaceId, userId } },
    select: { id: true },
  }))) {
    throw new ApiError("Payment not found", 404)
  }

  const valid = verifyPaymentSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  })
  if (!valid) {
    if (payment.weddingPlanPriceInPaise === null) {
      await markPaymentFailed(input.razorpayOrderId, "Signature verification failed")
    }
    throw new ApiError("Payment verification failed", 400, {
      code: "PAYMENT_VERIFICATION_FAILED",
    })
  }
  if (payment.status === "PAID") return { payment, alreadyPaid: true }

  // The checkout signature proves the payment id belongs to the order, but not
  // the amount. Confirm the captured payment with Razorpay before granting.
  let remote
  try {
    remote = await fetchRazorpayPayment(input.razorpayPaymentId)
  } catch (error) {
    console.error("razorpay payment lookup failed", error)
    throw new ApiError("Could not confirm the payment with Razorpay. Please retry.", 502, {
      code: "PAYMENT_LOOKUP_FAILED",
    })
  }

  if (remote.id !== input.razorpayPaymentId || remote.order_id !== input.razorpayOrderId) {
    throw new ApiError("This payment does not belong to the order", 400, {
      code: "PAYMENT_MISMATCH",
    })
  }
  if (
    !paymentMatchesOrder({
      expectedAmountInPaise: payment.amountInPaise,
      expectedCurrency: payment.currency,
      actualAmountInPaise: remote.amount,
      actualCurrency: remote.currency,
    })
  ) {
    throw new ApiError("The paid amount does not match this order", 409, {
      code: "PAYMENT_AMOUNT_MISMATCH",
    })
  }
  if (payment.weddingPlanPriceInPaise !== null ? remote.status !== "captured" : !isCapturedStatus(remote.status)) {
    throw new ApiError("The payment has not been captured yet", 409, {
      code: "PAYMENT_NOT_CAPTURED",
    })
  }

  const paid = await activatePayment(payment.providerOrderId, {
    providerPaymentId: input.razorpayPaymentId,
    amountInPaise: remote.amount,
    currency: remote.currency,
  })
  const entitlements = payment.weddingId
    ? await getWeddingEntitlements(payment.workspaceId, payment.weddingId)
    : await getEntitlements(payment.workspaceId)
  return { payment: paid, alreadyPaid: false, entitlements }
}

export interface ActivationEvidence {
  providerPaymentId?: string | null
  amountInPaise?: number
  currency?: string
}

function normalizeEvidence(evidence: string | null | ActivationEvidence): ActivationEvidence {
  if (evidence === null || typeof evidence === "string") {
    return { providerPaymentId: evidence }
  }
  return evidence
}

/**
 * Marks a payment as paid and applies the plan. Runs in a transaction and locks
 * the workspace row, so concurrent checkouts/webhooks cannot activate a plan
 * twice or lose a renewal. Amount and currency evidence is validated against
 * the recorded order before anything is granted.
 */
export async function activatePayment(
  orderId: string,
  evidence: string | null | ActivationEvidence = {},
) {
  const proof = normalizeEvidence(evidence)

  return prisma.$transaction(
    async (tx) => {
      const initial = await tx.payment.findUnique({ where: { providerOrderId: orderId } })
      if (!initial) throw new ApiError("Payment not found", 404)

      // Serialise every plan change for this workspace, including two paid
      // orders arriving at once and webhook/checkout races.
      if (initial.weddingId) {
        await tx.$executeRaw`SELECT id FROM "Wedding" WHERE id = ${initial.weddingId} FOR UPDATE`
      } else {
        await tx.$executeRaw`SELECT id FROM "Workspace" WHERE id = ${initial.workspaceId} FOR UPDATE`
      }

      const payment = await tx.payment.findUnique({
        where: { id: initial.id },
        include: { plan: true },
      })
      if (!payment) throw new ApiError("Payment not found", 404)
      if (payment.status === "PAID") return payment

      if (payment.weddingPlanPriceInPaise !== null &&
          (proof.amountInPaise === undefined || proof.currency === undefined)) {
        throw new ApiError("Captured payment evidence is required", 409)
      }

      if (proof.amountInPaise !== undefined && proof.amountInPaise !== payment.amountInPaise) {
        throw new ApiError("The paid amount does not match this order", 409, {
          code: "PAYMENT_AMOUNT_MISMATCH",
          expected: payment.amountInPaise,
          received: proof.amountInPaise,
        })
      }
      if (
        proof.currency !== undefined &&
        proof.currency.trim().toUpperCase() !== payment.currency.trim().toUpperCase()
      ) {
        throw new ApiError("The paid currency does not match this order", 409, {
          code: "PAYMENT_CURRENCY_MISMATCH",
        })
      }

      const providerPaymentId = proof.providerPaymentId ?? payment.providerPaymentId
      // Claim the payment atomically. A FAILED row may be retried because a
      // customer can complete a different attempt on the same order.
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ["PENDING", "FAILED"] } },
        data: {
          status: "PAID",
          providerPaymentId,
          paidAt: new Date(),
          failureReason: null,
        },
      })
      if (claimed.count === 0) {
        const current = await tx.payment.findUnique({
          where: { id: payment.id },
          include: { plan: true },
        })
        if (current?.status === "PAID") return current
        throw new ApiError("Payment could not be activated", 409, {
          code: "PAYMENT_NOT_ACTIVATABLE",
        })
      }

      if (payment.weddingPlanPriceInPaise !== null) {
        return tx.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { plan: true } })
      }

      const now = new Date()
      // Use the snapshot taken at purchase time, not the plan's current value.
      const days = Math.max(1, payment.billingPeriodDays || 30)
      const existing = await tx.subscription.findUnique({
        where: { workspaceId: payment.workspaceId },
      })

      let subscription
      if (!existing) {
        subscription = await tx.subscription.create({
          data: {
            workspaceId: payment.workspaceId,
            planId: payment.planId,
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: new Date(now.getTime() + days * DAY_MS),
            cancelAtPeriodEnd: false,
            pendingPlanCode: null,
          },
        })
      } else {
        const stillActive = existing.status === "ACTIVE" && existing.currentPeriodEnd > now
        const samePlan = existing.planId === payment.planId
        // Renewals extend from the paid-through date; upgrades start now.
        const periodStart = stillActive && samePlan ? existing.currentPeriodStart : now
        const base = stillActive && samePlan ? existing.currentPeriodEnd : now
        subscription = await tx.subscription.update({
          where: { id: existing.id },
          data: {
            planId: payment.planId,
            status: "ACTIVE",
            currentPeriodStart: periodStart,
            currentPeriodEnd: new Date(base.getTime() + days * DAY_MS),
            cancelAtPeriodEnd: false,
            pendingPlanCode: null,
          },
        })
      }

      // Link the payment to the subscription now that it exists.
      if (!payment.subscriptionId) {
        return tx.payment.update({
          where: { id: payment.id },
          data: { subscriptionId: subscription.id },
          include: { plan: true },
        })
      }

      return tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: { plan: true },
      })
    },
    { timeout: 15_000 },
  )
}

export async function markPaymentFailed(orderId: string, reason?: string) {
  // Conditional update: never overwrite a payment that was activated by the
  // checkout verify or a webhook that raced with this failure notification.
  await prisma.payment.updateMany({
    where: { providerOrderId: orderId, status: { not: "PAID" } },
    data: { status: "FAILED", failureReason: reason || "Payment failed" },
  })
  return prisma.payment.findUnique({ where: { providerOrderId: orderId } })
}

// ---------------------------------------------------------------------------
// Subscription management
// ---------------------------------------------------------------------------

export async function cancelSubscription(userId: string, immediate = false) {
  const workspaceId = await getUserWorkspaceId(userId)
  const entitlements = await getEntitlements(workspaceId)
  if (!entitlements.subscriptionId || entitlements.status !== "ACTIVE") {
    throw new ApiError("There is no active subscription to cancel", 409, {
      code: "NO_ACTIVE_SUBSCRIPTION",
    })
  }

  if (immediate) {
    // Access is removed immediately, without a refund, and the workspace
    // falls back to Free.
    const freeRow = await prisma.plan.findUnique({ where: { code: "FREE" } })
    if (!freeRow) throw new ApiError("Free plan is not configured", 500)
    return prisma.subscription.update({
      where: { id: entitlements.subscriptionId },
      data: {
        planId: freeRow.id,
        status: "EXPIRED",
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        pendingPlanCode: null,
      },
    })
  }

  return prisma.subscription.update({
    where: { id: entitlements.subscriptionId },
    data: { cancelAtPeriodEnd: true, pendingPlanCode: "FREE" },
  })
}

export async function resumeSubscription(userId: string) {
  const workspaceId = await getUserWorkspaceId(userId)
  const entitlements = await getEntitlements(workspaceId)
  if (!entitlements.subscriptionId || entitlements.status !== "ACTIVE") {
    throw new ApiError("There is no active subscription to resume", 409, {
      code: "NO_ACTIVE_SUBSCRIPTION",
    })
  }
  return prisma.subscription.update({
    where: { id: entitlements.subscriptionId },
    data: { cancelAtPeriodEnd: false, pendingPlanCode: null },
  })
}

export async function getPaymentHistory(userId: string) {
  return prisma.payment.findMany({
    where: { workspace: { members: { some: { userId } } } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      weddingId: true,
      wedding: { select: { name: true } },
      receipt: true,
      planCode: true,
      amountInPaise: true,
      baseAmountInPaise: true,
      taxAmountInPaise: true,
      taxRateBasisPoints: true,
      taxInclusive: true,
      currency: true,
      status: true,
      providerOrderId: true,
      providerPaymentId: true,
      failureReason: true,
      createdAt: true,
      paidAt: true,
    },
  })
}

/** Returns plan availability in the shape the pricing page consumes. */
export async function getPublicPlans() {
  const plans = await getPlanConfigs()
  const config = getRazorpayConfig()
  const paymentsConfigured = config?.currency.toUpperCase() === "INR"
  return {
    paymentsConfigured,
    plans: plans.filter((plan) => plan.code !== "FREE").map((plan) => ({
      ...plan,
      limits: { ...plan.limits, weddings: null, guestsPerWedding: null },
      purchasable:
        plan.code !== "FREE" &&
        plan.isActive &&
        plan.priceInPaise !== null &&
        plan.priceInPaise > 0 &&
        paymentsConfigured,
    })),
  }
}
