/** @jest-environment node */
import { assertCaptcha, captchaWidgetConfig } from "@/lib/captcha"
import { checkRateLimit } from "@/lib/rate-limit"

jest.mock("@/lib/rate-limit", () => ({ checkRateLimit: jest.fn() }))

const environmentKeys = ["AUTH_URL", "TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "CAPTCHA_TEST_ORIGIN", "VERCEL", "DATABASE_URL"] as const
const previousEnvironment = Object.fromEntries(environmentKeys.map(key => [key, process.env[key]]))
const originalFetch = global.fetch

function verified(overrides = {}) {
  return new Response(JSON.stringify({
    success: true,
    action: "rsvp_otp",
    hostname: "wedding.example",
    challenge_ts: new Date().toISOString(),
    ...overrides,
  }), { status: 200 })
}

beforeEach(() => {
  process.env.AUTH_URL = "https://wedding.example"
  process.env.TURNSTILE_SITE_KEY = "configured-site-key"
  process.env.TURNSTILE_SECRET_KEY = "configured-secret"
  delete process.env.CAPTCHA_TEST_ORIGIN
  delete process.env.VERCEL
  jest.mocked(checkRateLimit).mockReset().mockResolvedValue({ allowed: true, remaining: 0, retryAfterSeconds: 0 })
  global.fetch = jest.fn(async () => verified())
})

afterEach(() => {
  global.fetch = originalFetch
  for (const key of environmentKeys) {
    if (previousEnvironment[key] === undefined) delete process.env[key]
    else process.env[key] = previousEnvironment[key]
  }
})

it("requires configured verification and rejects empty CAPTCHA input", async () => {
  delete process.env.TURNSTILE_SECRET_KEY
  expect(() => captchaWidgetConfig()).toThrow("temporarily unavailable")
  await expect(assertCaptcha("token")).rejects.toMatchObject({ status: 503 })
  process.env.TURNSTILE_SECRET_KEY = "configured-secret"
  await expect(assertCaptcha("")).rejects.toMatchObject({ status: 403 })
  expect(global.fetch).not.toHaveBeenCalled()
})

it("accepts a valid challenge for the configured host and action only once", async () => {
  jest.mocked(checkRateLimit)
    .mockResolvedValueOnce({ allowed: true, remaining: 0, retryAfterSeconds: 0 })
    .mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 300 })
  await expect(assertCaptcha("verified-provider-token")).resolves.toBeUndefined()
  await expect(assertCaptcha("verified-provider-token")).rejects.toMatchObject({ status: 403 })
  expect(checkRateLimit).toHaveBeenCalledWith(
    expect.stringMatching(/^captcha:used:[a-f0-9]{64}$/),
    expect.objectContaining({ limit: 1, failClosed: true }),
  )
})

it.each([
  { success: false },
  { hostname: "another.example" },
  { action: "another-action" },
  { challenge_ts: new Date(Date.now() - 301_000).toISOString() },
])("rejects a forged, wrong-host or expired challenge %j", async fields => {
  global.fetch = jest.fn(async () => verified(fields))
  await expect(assertCaptcha("challenge-token")).rejects.toMatchObject({ status: 403 })
  expect(checkRateLimit).not.toHaveBeenCalled()
})

it("fails closed when the provider or replay store is unavailable", async () => {
  global.fetch = jest.fn(async () => { throw new Error("provider unavailable") })
  await expect(assertCaptcha("challenge-token")).rejects.toMatchObject({ status: 503 })
  global.fetch = jest.fn(async () => verified())
  jest.mocked(checkRateLimit).mockRejectedValue(new Error("database unavailable"))
  await expect(assertCaptcha("challenge-token")).rejects.toThrow("database unavailable")
})

it("permits mock verification only when both app and database are local", () => {
  process.env.CAPTCHA_TEST_ORIGIN = "http://127.0.0.1:4078"
  process.env.AUTH_URL = "http://127.0.0.1:3078"
  process.env.DATABASE_URL = "postgresql://test@127.0.0.1:55443/wedding_test"
  expect(captchaWidgetConfig().scriptUrl).toBe("http://127.0.0.1:4078/turnstile.js")
  process.env.VERCEL = "1"
  expect(() => captchaWidgetConfig()).toThrow("temporarily unavailable")
  delete process.env.VERCEL
  process.env.DATABASE_URL = "postgresql://test@production.example/wedding"
  expect(() => captchaWidgetConfig()).toThrow("temporarily unavailable")
})
