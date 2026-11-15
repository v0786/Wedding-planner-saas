/** @jest-environment node */
import { GET as liveness } from "@/app/api/health/route"
import { GET as readiness } from "@/app/api/health/ready/route"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: jest.fn() } }))
const query = prisma.$queryRaw as jest.Mock
const saved = process.env.HEALTH_CHECK_SECRET

afterEach(() => {
  if (saved === undefined) delete process.env.HEALTH_CHECK_SECRET
  else process.env.HEALTH_CHECK_SECRET = saved
  query.mockReset()
})

it("serves minimal public liveness without querying customer data", async () => {
  expect(await (await liveness()).json()).toEqual({ status: "ok" })
  expect(query).not.toHaveBeenCalled()
})

it("does not expose readiness when the secret is absent or incorrect", async () => {
  delete process.env.HEALTH_CHECK_SECRET
  expect((await readiness(new Request("http://localhost/api/health/ready"))).status).toBe(401)
  process.env.HEALTH_CHECK_SECRET = "health-test-secret"
  expect((await readiness(new Request("http://localhost/api/health/ready", { headers: { authorization: "Bearer wrong" } }))).status).toBe(401)
  expect(query).not.toHaveBeenCalled()
})

it("checks schema readiness and returns sanitized failures with no caching", async () => {
  process.env.HEALTH_CHECK_SECRET = "health-test-secret"
  const request = new Request("http://localhost/api/health/ready", { headers: { authorization: "Bearer health-test-secret" } })
  query.mockResolvedValue([])
  expect((await readiness(request)).status).toBe(200)
  expect(query).toHaveBeenCalledTimes(3)
  query.mockRejectedValue(new Error("private database URL and password"))
  const response = await readiness(request)
  expect(response.status).toBe(503)
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(await response.json()).toEqual({ status: "unavailable" })
})
