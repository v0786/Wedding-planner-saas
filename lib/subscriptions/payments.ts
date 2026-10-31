import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/errors"
import {
  planChangeKind,
  type PlanCode,
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
} from "@/lib/subscriptions/service"

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
  currency?: string
  keyId?: string
  planCode?: PlanCode
  planName?: string
  paymentId?: string
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
  const workspaceId = await getUserWorkspaceId(userId)
  const payment = await prisma.payment.findUnique({
    where: { providerOrderId: input.razorpayOrderId },
  })
  if (!payment || payment.workspaceId !== workspaceId) {
    throw new ApiError("Payment not found", 404)
  }
  if (payment.status === "PAID") {
    if (!payment.providerPaymentId) {
      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: { providerPaymentId: input.razorpayPaymentId },
      })
      return { payment: updated, alreadyPaid: true }
    }
    return { payment, alreadyPaid: true }
  }

  const valid = verifyPaymentSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  })
  if (!valid) {
    await markPaymentFailed(input.razorpayOrderId, "Signature verification failed")
    throw new ApiError("Payment verification failed", 400, {
      code: "PAYMENT_VERIFICATION_FAILED",
    })
  }

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
  if (!isCapturedStatus(remote.status)) {
    throw new ApiError("The payment has not been captured yet", 409, {
      code: "PAYMENT_NOT_CAPTURED",
    })
  }

  const paid = await activatePayment(payment.providerOrderId, {
    providerPaymentId: input.razorpayPaymentId,
    amountInPaise: remote.amount,
    currency: remote.currency,
  })
  const entitlements = await getEntitlements(workspaceId)
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
      await tx.$executeRaw`SELECT id FROM "Workspace" WHERE id = ${initial.workspaceId} FOR UPDATE`

      const payment = await tx.payment.findUnique({
        where: { id: initial.id },
        include: { plan: true },
      })
      if (!payment) throw new ApiError("Payment not found", 404)
      if (payment.status === "PAID") return payment

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
  const workspaceId = await getUserWorkspaceId(userId)
  return prisma.payment.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      planCode: true,
      amountInPaise: true,
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
  return {
    paymentsConfigured: config !== null,
    plans: plans.map((plan) => ({
      ...plan,
      purchasable:
        plan.code !== "FREE" &&
        plan.isActive &&
        plan.priceInPaise !== null &&
        plan.priceInPaise > 0 &&
        config !== null,
    })),
  }
}
