import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import GuestManager, { type GuestRecord } from "@/components/wedding/guest-manager"

const guest: GuestRecord = {
  id: "guest-1", firstName: "Original", lastName: "Guest", mobile: null, email: null,
  group: null, side: null, category: null, accommodationNeeds: null, transportNeeds: null,
  notes: null, dietaryPrefs: null, rsvpSubmission: null,
}
const pagination = { page: 1, pageSize: 25, total: 1, totalPages: 1 }
const originalFetch = global.fetch
let fetchMock: jest.Mock

beforeEach(() => {
  fetchMock = jest.fn(async (_url: string, options?: RequestInit) => ({
    ok: true,
    json: async () => options?.method === "PATCH"
      ? { guest: { id: guest.id } }
      : { guests: [], contactsVisible: false, pagination },
  }))
  global.fetch = fetchMock
})

afterEach(() => { global.fetch = originalFetch })

it("omits hidden contact fields when saving other guest details", async () => {
  render(<GuestManager weddingId="wedding-1" initialGuests={[guest]} initialPagination={pagination} groups={[]} contactsVisible={false} />)
  fireEvent.click(screen.getByRole("button", { name: /^Edit$/ }))
  expect(screen.queryByLabelText("Mobile")).toBeNull()
  expect(screen.queryByLabelText("Email")).toBeNull()
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Updated" } })
  fireEvent.click(screen.getByRole("button", { name: "Save guest" }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/weddings/wedding-1/guests/guest-1", expect.anything()))
  const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
  expect(payload.firstName).toBe("Updated")
  expect(payload).not.toHaveProperty("mobile")
  expect(payload).not.toHaveProperty("email")
})

it("allows visible contacts to be explicitly cleared", async () => {
  render(<GuestManager weddingId="wedding-1" initialGuests={[{ ...guest, mobile: "9876543210", email: "guest@example.com" }]} initialPagination={pagination} groups={[]} contactsVisible />)
  fireEvent.click(screen.getByRole("button", { name: /^Edit$/ }))
  fireEvent.change(screen.getByLabelText("Mobile"), { target: { value: "" } })
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "" } })
  fireEvent.click(screen.getByRole("button", { name: "Save guest" }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/weddings/wedding-1/guests/guest-1", expect.anything()))
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ mobile: "", email: "" })
})
