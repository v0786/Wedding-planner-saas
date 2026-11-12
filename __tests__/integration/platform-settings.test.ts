import { prisma } from "@/lib/prisma"
import { activatePayment, createWeddingCheckout, getWeddingCheckoutBreakdown } from "@/lib/subscriptions/payments"
import { getPlanConfig } from "@/lib/subscriptions/service"
import { getPlatformSettings } from "@/lib/settings"

it("records tax with the order and preserves it when platform tax settings change", async () => {
  const initial = await getPlatformSettings()
  const owner = await prisma.user.create({ data: { email: `tax-${crypto.randomUUID()}@example.com` } })
  const workspace = await prisma.workspace.create({ data: { name: "Tax snapshots", members: { create: { userId: owner.id } } } })
  const wedding = await prisma.wedding.create({ data: { workspaceId: workspace.id, name: "Tax wedding", coupleName1: "Partner", date: new Date("2099-12-10T00:00:00Z") } })
  const originalKey = process.env.RAZORPAY_KEY_ID
  const originalSecret = process.env.RAZORPAY_KEY_SECRET
  process.env.RAZORPAY_KEY_ID = "rzp_test_tax"
  process.env.RAZORPAY_KEY_SECRET = "test-tax-secret"
  const orderId = `order_${crypto.randomUUID()}`
  const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
    return Response.json({ id: orderId, ...JSON.parse(String(options?.body)) })
  })
  try {
    await prisma.platformSettings.update({ where: { id: initial.id }, data: { gstEnabled: true, gstRateBasisPoints: 1800, taxInclusive: false } })
    const checkout = await createWeddingCheckout(owner.id, wedding.id, "BASIC")
    expect(checkout).toMatchObject({ amountInPaise: 58882, baseAmountInPaise: 49900, taxAmountInPaise: 8982, taxRateBasisPoints: 1800 })
    await prisma.platformSettings.update({ where: { id: initial.id }, data: { gstEnabled: false } })
    expect(await createWeddingCheckout(owner.id, wedding.id, "BASIC")).toEqual(checkout)
    expect(await getWeddingCheckoutBreakdown(wedding.id, await getPlanConfig("BASIC"))).toMatchObject({ amountInPaise: 58882, taxAmountInPaise: 8982 })
    await expect(activatePayment(orderId, { amountInPaise: 49900, currency: "INR" })).rejects.toMatchObject({ status: 409 })
    await activatePayment(orderId, { amountInPaise: 58882, currency: "INR" })
    expect(await prisma.payment.findUnique({ where: { providerOrderId: orderId } })).toMatchObject({ status: "PAID", taxAmountInPaise: 8982 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  } finally {
    fetchMock.mockRestore()
    if (originalKey === undefined) delete process.env.RAZORPAY_KEY_ID
    else process.env.RAZORPAY_KEY_ID = originalKey
    if (originalSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET
    else process.env.RAZORPAY_KEY_SECRET = originalSecret
    const { id, updatedAt: _updatedAt, ...settings } = initial
    await prisma.platformSettings.update({ where: { id }, data: settings })
    await prisma.workspace.delete({ where: { id: workspace.id } })
    await prisma.user.delete({ where: { id: owner.id } })
    await prisma.$disconnect()
  }
})
