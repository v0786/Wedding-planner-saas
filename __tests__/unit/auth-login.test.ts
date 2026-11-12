/** @jest-environment node */
import { allowCredentialsAttempt } from "@/lib/auth-login"
import { MemoryRateLimitStore, type RateLimitStore } from "@/lib/rate-limit"

function request(ip: string) {
  return new Request("https://wedding.example/api/auth/callback/credentials", {
    headers: { "x-forwarded-for": ip },
  })
}

it("limits repeated guesses for the same normalized account across IP addresses", async () => {
  const store = new MemoryRateLimitStore()
  for (let index = 0; index < 10; index += 1) {
    expect(await allowCredentialsAttempt(request(`192.0.2.${index}`), "HOST@Example.com", store)).toBe(true)
  }
  expect(await allowCredentialsAttempt(request("192.0.2.20"), " host@example.com ", store)).toBe(false)
  expect(await allowCredentialsAttempt(request("192.0.2.20"), "other@example.com", store)).toBe(true)
})

it("limits one IP trying different accounts", async () => {
  const store = new MemoryRateLimitStore()
  for (let index = 0; index < 30; index += 1) {
    expect(await allowCredentialsAttempt(request("192.0.2.1"), `person-${index}@example.com`, store)).toBe(true)
  }
  expect(await allowCredentialsAttempt(request("192.0.2.1"), "another@example.com", store)).toBe(false)
})

it("denies credentials authentication when shared limiting is unavailable", async () => {
  const store: RateLimitStore = {
    check: jest.fn(async () => { throw new Error("store unavailable") }),
    reset: jest.fn(),
  }
  expect(await allowCredentialsAttempt(request("192.0.2.1"), "host@example.com", store)).toBe(false)
})
