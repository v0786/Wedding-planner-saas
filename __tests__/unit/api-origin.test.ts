/** @jest-environment node */

import { assertSameOrigin } from "@/lib/api"

function formRequest(origin: string) {
  return new Request("https://weddings.example/api/rsvp/transfer", {
    method: "POST",
    headers: { host: "weddings.example", origin },
  })
}

it("accepts a form posted from the invitation's own origin", () => {
  expect(() => assertSameOrigin(formRequest("https://weddings.example"))).not.toThrow()
})

it("rejects forms with an opaque origin", () => {
  expect(() => assertSameOrigin(formRequest("null"))).toThrow("Invalid origin")
})

it("rejects forms posted from another site", () => {
  expect(() => assertSameOrigin(formRequest("https://other.example"))).toThrow("Cross-origin request rejected")
})
