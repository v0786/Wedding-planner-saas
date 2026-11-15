/** @jest-environment node */
import { readJson, MAX_JSON_BYTES, handleApiError } from "@/lib/api"

it("parses normal JSON and rejects malformed or invalid UTF-8 bodies", async () => {
  expect(await readJson(new Request("http://localhost", { method: "POST", body: '{"name":"शादी"}' }))).toEqual({ name: "शादी" })
  for (const body of ["", "{", new Uint8Array([0xff])]) {
    await expect(readJson(new Request("http://localhost", { method: "POST", body }))).rejects.toMatchObject({ status: 400 })
  }
})

it("bounds streamed input even when content-length is absent or forged", async () => {
  let cancelled = false
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(MAX_JSON_BYTES + 1)) },
    cancel() { cancelled = true },
  })
  const request = new Request("http://localhost", { method: "POST", headers: { "content-length": "1" }, body: stream, duplex: "half" } as RequestInit)
  await expect(readJson(request)).rejects.toMatchObject({ status: 413 })
  expect(cancelled).toBe(true)
})

it("rejects an oversized declaration without consuming the body", async () => {
  const request = new Request("http://localhost", { method: "POST", headers: { "content-length": String(MAX_JSON_BYTES + 1) }, body: "{}" })
  await expect(readJson(request)).rejects.toMatchObject({ status: 413 })
  expect(request.bodyUsed).toBe(false)
})

it("keeps unexpected database/provider details out of responses and logs", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {})
  try {
    const response = handleApiError(new Error("postgres://user:secret@private-host guest@example.com"))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Something went wrong" })
    expect(log.mock.calls.flat().join(" ")).not.toMatch(/secret|guest@example/)
  } finally { log.mockRestore() }
})
