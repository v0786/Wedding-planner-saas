import { createHmac } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { activatePayment, createWeddingCheckout, verifyAndActivatePayment } from "@/lib/subscriptions/payments"
import { getWeddingEntitlements } from "@/lib/subscriptions/service"

it("captures one wedding purchase, reuses retries, and charges the upgrade difference", async () => {
  const owner = await prisma.user.create({ data: { email: `billing-${crypto.randomUUID()}@example.com` } })
  const outsider = await prisma.user.create({ data: { email: `billing-${crypto.randomUUID()}@example.com` } })
  const workspace = await prisma.workspace.create({
    data: { name: "Billing test", members: { create: { userId: owner.id } } },
  })
  const date = new Date("2099-12-10T00:00:00Z")
  const wedding = await prisma.wedding.create({
    data: { workspaceId: workspace.id, date, name: "Paid wedding", coupleName1: "Partner" },
  })
  const other = await prisma.wedding.create({
    data: { workspaceId: workspace.id, date, name: "Separate wedding", coupleName1: "Partner" },
  })
  const originalEnv = {
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  }
  process.env.RAZORPAY_KEY_ID = "rzp_test_wedding"
  process.env.RAZORPAY_KEY_SECRET = "wedding_test_key"
  const orderId = `order_${crypto.randomUUID()}`
  const upgradeOrderId = `order_${crypto.randomUUID()}`
  const paymentId = `pay_${crypto.randomUUID()}`
  const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex")
  const verification = { razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: signature }
  let providerPaymentStatus = "authorized"
  const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
    if (String(url).endsWith("/orders")) {
      const order = JSON.parse(String(options?.body))
      return Response.json({ id: order.amount === 49900 ? orderId : upgradeOrderId, ...order })
    }
    return Response.json({
      id: paymentId, order_id: orderId, amount: 49900, currency: "INR", status: providerPaymentStatus,
    })
  })

  try {
    await expect(createWeddingCheckout(outsider.id, wedding.id, "BASIC")).rejects.toMatchObject({ status: 404 })
    const [first, retry] = await Promise.all([
      createWeddingCheckout(owner.id, wedding.id, "BASIC"),
      createWeddingCheckout(owner.id, wedding.id, "BASIC"),
    ])
    expect(first).toMatchObject({ orderId, amountInPaise: 49900 })
    expect(retry).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await expect(activatePayment(orderId, { currency: "INR" })).rejects.toMatchObject({ status: 409 })
    await expect(verifyAndActivatePayment(owner.id, verification)).rejects.toMatchObject({
      status: 409, details: { code: "PAYMENT_NOT_CAPTURED" },
    })
    expect((await getWeddingEntitlements(workspace.id, wedding.id)).planCode).toBe("FREE")
    providerPaymentStatus = "captured"
    await expect(verifyAndActivatePayment(owner.id, verification)).resolves.toMatchObject({ alreadyPaid: false })
    await expect(verifyAndActivatePayment(owner.id, verification)).resolves.toMatchObject({ alreadyPaid: true })

    const paid = await getWeddingEntitlements(workspace.id, wedding.id)
    expect(paid.planCode).toBe("BASIC")
    expect(paid.currentPeriodEnd?.toISOString()).toBe("2099-12-10T18:30:00.000Z")
    expect(paid.limits.guestsPerWedding).toBeNull()
    expect((await getWeddingEntitlements(workspace.id, other.id)).planCode).toBe("FREE")
    await expect(createWeddingCheckout(owner.id, wedding.id, "BASIC")).rejects.toMatchObject({ status: 409 })
    await expect(createWeddingCheckout(owner.id, wedding.id, "PRO")).resolves.toMatchObject({
      orderId: upgradeOrderId, amountInPaise: 50000,
    })
    await activatePayment(upgradeOrderId, { amountInPaise: 50000, currency: "INR" })
    expect((await getWeddingEntitlements(workspace.id, wedding.id)).planCode).toBe("PRO")
    await prisma.wedding.update({ where: { id: wedding.id }, data: { date: new Date("2020-01-01T00:00:00Z") } })
    expect((await getWeddingEntitlements(workspace.id, wedding.id)).status).toBe("EXPIRED")
    await expect(createWeddingCheckout(owner.id, wedding.id, "PRIME")).rejects.toMatchObject({
      status: 403, details: { code: "WEDDING_EXPIRED" },
    })
  } finally {
    fetchMock.mockRestore()
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    await prisma.workspace.delete({ where: { id: workspace.id } })
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, outsider.id] } } })
  }
})
