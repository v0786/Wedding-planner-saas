import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { ensureAccountWorkspace } from "@/lib/account-workspace"
import { requestPasswordReset, resetPassword } from "@/lib/password-reset"
import { generateEditToken, hashEditToken } from "@/lib/tokens"

const suffix = generateEditToken()
const email = `recovery-${suffix}@example.com`
let userId: string
let workspaceId: string
const original = { key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM, url: process.env.AUTH_URL }

beforeAll(async () => {
  process.env.RESEND_API_KEY = "isolated-test-key"
  process.env.EMAIL_FROM = "sender@example.com"
  process.env.AUTH_URL = "http://127.0.0.1:3000"
  const user = await prisma.user.create({ data: { email, name: "Recovery owner", passwordHash: await bcrypt.hash("old-password", 12) } })
  userId = user.id
})

afterAll(async () => {
  if (workspaceId) await prisma.workspace.deleteMany({ where: { id: workspaceId } })
  if (userId) await prisma.user.deleteMany({ where: { id: userId } })
  if (original.key === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = original.key
  if (original.from === undefined) delete process.env.EMAIL_FROM
  else process.env.EMAIL_FROM = original.from
  if (original.url === undefined) delete process.env.AUTH_URL
  else process.env.AUTH_URL = original.url
  await prisma.$disconnect()
})

it("provisions one owner workspace when OAuth callbacks arrive concurrently", async () => {
  const [first, second] = await Promise.all([ensureAccountWorkspace(userId), ensureAccountWorkspace(userId)])
  workspaceId = first
  expect(first).toBe(second)
  expect(await prisma.workspaceMember.count({ where: { userId } })).toBe(1)
})

it("stores only token hashes and allows one reset while invalidating the previous session version", async () => {
  const messages: Array<{ to: string; text: string }> = []
  const send = jest.fn(async (message: { to: string; subject: string; text: string; idempotencyKey: string }) => {
    messages.push(message)
    return "mock-message-id"
  })
  await requestPasswordReset(email, send)
  await requestPasswordReset(`missing-${suffix}@example.com`, send)
  expect(send).toHaveBeenCalledTimes(1)
  const url = messages[0].text.match(/http:\/\/127\.0\.0\.1:3000\/auth\/reset-password\?token=[A-Za-z0-9_-]+/)![0]
  const token = new URL(url).searchParams.get("token")!
  const records = await prisma.passwordResetToken.findMany({ where: { userId } })
  expect(records[0].tokenHash).toBe(hashEditToken(token))
  expect(JSON.stringify(records)).not.toContain(token)

  const results = await Promise.allSettled([resetPassword(token, "new-password"), resetPassword(token, "new-password")])
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1)
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  expect(user.sessionVersion).toBe(1)
  expect(user.emailVerified).not.toBeNull()
  expect(await bcrypt.compare("new-password", user.passwordHash!)).toBe(true)
  expect(await bcrypt.compare("old-password", user.passwordHash!)).toBe(false)
  await expect(resetPassword(token, "another-password")).rejects.toMatchObject({ status: 400 })
})

it("rejects expired reset links without changing the account", async () => {
  const token = "a".repeat(43)
  await prisma.passwordResetToken.create({ data: { userId, tokenHash: hashEditToken(token), sessionVersion: 1, expiresAt: new Date("2020-01-01") } })
  await expect(resetPassword(token, "another-password")).rejects.toMatchObject({ status: 400 })
  expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).sessionVersion).toBe(1)
})
