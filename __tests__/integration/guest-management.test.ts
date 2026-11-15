import { POST as importGuests } from "@/app/api/weddings/[id]/guests/import/route"
import { GET as listGuests, POST as createGuest } from "@/app/api/weddings/[id]/guests/route"
import { PATCH as updateGuest } from "@/app/api/weddings/[id]/guests/[guestId]/route"
import { prisma } from "@/lib/prisma"
import { requireUserId } from "@/lib/server-auth"
import { ensurePlanRows } from "@/lib/subscriptions/service"
import { generateEditToken } from "@/lib/tokens"
import { Workbook } from "exceljs"
import { GET as exportGuests } from "@/app/api/weddings/[id]/guests/export/route"
import { tabularDownload } from "@/lib/spreadsheet"

jest.mock("@/lib/server-auth", () => ({ requireUserId: jest.fn() }))

let workspaceId: string
let weddingId: string
let ownerId: string

beforeAll(async () => {
  await ensurePlanRows()
  const owner = await prisma.user.create({ data: { email: `guest-test-${generateEditToken()}@example.com` } })
  ownerId = owner.id
  const workspace = await prisma.workspace.create({
    data: { name: "Guest management test", members: { create: { userId: owner.id } } },
  })
  workspaceId = workspace.id
  const wedding = await prisma.wedding.create({
    data: { workspaceId, name: "Guest details", coupleName1: "A", date: new Date("2030-01-01T00:00:00Z") },
  })
  weddingId = wedding.id
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "PRO" } })
  await prisma.payment.create({
    data: {
      workspaceId, weddingId, planId: plan.id, planCode: plan.code,
      providerOrderId: `guest_fixture_${generateEditToken()}`, amountInPaise: 99900,
      weddingPlanPriceInPaise: 99900, billingPeriodDays: 0, status: "PAID", paidAt: new Date(),
    },
  })
  jest.mocked(requireUserId).mockResolvedValue(ownerId)
})

beforeEach(async () => {
  await prisma.guest.deleteMany({ where: { weddingId } })
  await prisma.guestImport.deleteMany({ where: { weddingId } })
})

afterAll(async () => {
  if (workspaceId) await prisma.workspace.deleteMany({ where: { id: workspaceId } })
  if (ownerId) await prisma.user.deleteMany({ where: { id: ownerId } })
  await prisma.$disconnect()
})

const params = () => ({ params: Promise.resolve({ id: weddingId }) })

function csvRequest(preview: boolean) {
  const file = new File(["firstName,mobile,side,category,accommodationNeeds,transportNeeds\nAarav,9876543210,Bride,VIP,Hotel,Pickup\nMeera,9876543211,Groom,Family,,\n"], "guests.csv", { type: "text/csv" })
  const form = new FormData()
  form.set("file", file)
  return new Request(`http://test.local/import${preview ? "?preview=true" : ""}`, { method: "POST", body: form })
}

it("previews a CSV without writing and rechecks duplicate phones before the entire commit", async () => {
  const preview = await importGuests(csvRequest(true), params())
  expect(preview.status).toBe(200)
  expect(await preview.json()).toMatchObject({ total: 2, preview: true, rows: [{ side: "Bride", accommodationNeeds: "Hotel" }, { side: "Groom" }] })
  expect(await prisma.guest.count({ where: { weddingId } })).toBe(0)
  await prisma.guest.create({ data: { weddingId, firstName: "Existing", mobile: "+919876543210" } })
  const duplicate = await importGuests(csvRequest(false), params())
  expect(duplicate.status).toBe(409)
  expect(await prisma.guest.count({ where: { weddingId } })).toBe(1)
  await prisma.guest.deleteMany({ where: { weddingId } })
  expect((await importGuests(csvRequest(false), params())).status).toBe(201)
  expect(await prisma.guest.count({ where: { weddingId } })).toBe(2)
})

it("saves guest logistics through create/edit and scopes side/category filters", async () => {
  const response = await createGuest(new Request("http://test.local/guests", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Guest", side: "Bride", category: "VIP", accommodationNeeds: "Hotel", transportNeeds: "Airport pickup" }),
  }), params())
  expect(response.status).toBe(201)
  const { guest } = await response.json()
  expect(guest).toMatchObject({ side: "Bride", category: "VIP", accommodationNeeds: "Hotel", transportNeeds: "Airport pickup" })
  const updated = await updateGuest(new Request("http://test.local/guest", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ side: "Both", category: "Friends" }),
  }), { params: Promise.resolve({ id: weddingId, guestId: guest.id }) })
  expect(updated.status).toBe(200)
  const filtered = await listGuests(new Request("http://test.local/guests?side=Both&category=Friends"), params())
  expect((await filtered.json()).guests).toHaveLength(1)
  const excluded = await listGuests(new Request("http://test.local/guests?side=Bride"), params())
  expect((await excluded.json()).guests).toHaveLength(0)
})

it("retries a committed blank-phone import without duplicating rows and rejects key reuse for different content", async () => {
  const key = crypto.randomUUID()
  const request = (content: string, explicitKey: string | null = key) => {
    const body = new FormData()
    body.set("file", new File([content], "blank-phone.csv", { type: "text/csv" }))
    return new Request("http://test.local/import", {
      method: "POST", body,
      headers: explicitKey ? { "Idempotency-Key": explicitKey } : {},
    })
  }
  const content = "firstName,lastName\nGuest,One\nGuest,Two\n"
  const [first, retry] = await Promise.all([
    importGuests(request(content), params()),
    importGuests(request(content), params()),
  ])
  expect([first.status, retry.status].sort()).toEqual([200, 201])
  expect(await prisma.guest.count({ where: { weddingId } })).toBe(2)
  expect(await prisma.guestImport.count({ where: { weddingId } })).toBe(1)
  expect(await retry.json()).toMatchObject({ imported: 2 })
  expect((await importGuests(request("firstName\nDifferent\n"), params())).status).toBe(409)
  expect(await prisma.guest.count({ where: { weddingId } })).toBe(2)
  expect((await importGuests(request(content, crypto.randomUUID()), params())).status).toBe(201)
  expect(await prisma.guest.count({ where: { weddingId } })).toBe(4)

  const fallbackContent = "firstName\nLegacy direct caller\n"
  expect((await importGuests(request(fallbackContent, null), params())).status).toBe(201)
  expect((await importGuests(request(fallbackContent, null), params())).status).toBe(200)
  expect(await prisma.guest.count({ where: { weddingId } })).toBe(5)
})

it("preserves hidden contacts when updating another field and supports explicit clearing after reveal", async () => {
  const guest = await prisma.guest.create({ data: { weddingId, firstName: "Private", mobile: "9876543210", email: "private@example.com" } })
  const listed = await listGuests(new Request("http://test.local/guests"), params())
  expect((await listed.json()).guests[0]).toMatchObject({ mobile: null, email: null })
  const patch = (body: unknown) => updateGuest(new Request("http://test.local/guest", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ id: weddingId, guestId: guest.id }) })
  expect((await patch({ firstName: "Updated private guest" })).status).toBe(200)
  expect(await prisma.guest.findUnique({ where: { id: guest.id } })).toMatchObject({ firstName: "Updated private guest", mobile: "9876543210", email: "private@example.com" })
  await prisma.wedding.update({ where: { id: weddingId }, data: { contactVisibility: "visible" } })
  expect((await patch({ mobile: "", email: "" })).status).toBe(200)
  expect(await prisma.guest.findUnique({ where: { id: guest.id } })).toMatchObject({ mobile: null, email: null })
  await prisma.wedding.update({ where: { id: weddingId }, data: { contactVisibility: "hidden" } })
})

it("previews, commits and safely exports native Excel with tenant and contact privacy checks", async () => {
  const download = await tabularDownload({ headers: ["firstName", "mobile", "email"], rows: [["Excel Guest", "+919876543210", "guest@example.com"]], name: "guests", sheetName: "Guests", format: "xlsx" })
  const content = await download.arrayBuffer()
  const request = (preview: boolean) => {
    const body = new FormData()
    body.set("file", new File([content], "guests.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
    return new Request(`http://test.local/import${preview ? "?preview=true" : ""}`, { method: "POST", body })
  }
  const preview = await importGuests(request(true), params())
  expect(preview.status).toBe(200)
  expect(await prisma.guest.count({ where: { weddingId } })).toBe(0)
  expect((await importGuests(request(false), params())).status).toBe(201)
  expect((await importGuests(request(false), params())).status).toBe(200)
  expect(await prisma.guest.count({ where: { weddingId } })).toBe(1)

  const exported = await exportGuests(new Request("http://test.local/export?format=xlsx"), params())
  expect(exported.status).toBe(200)
  const workbook = new Workbook()
  await workbook.xlsx.load(await exported.arrayBuffer())
  const values = JSON.stringify(workbook.worksheets[0].getSheetValues())
  expect(values).toContain("Excel Guest")
  expect(values).not.toMatch(/mobile|email|9876543210|guest@example.com/)

  await prisma.wedding.update({ where: { id: weddingId }, data: { contactVisibility: "visible" } })
  const visible = await exportGuests(new Request("http://test.local/export?format=xlsx"), params())
  await workbook.xlsx.load(await visible.arrayBuffer())
  expect(JSON.stringify(workbook.worksheets[0].getSheetValues())).toContain("+919876543210")
  await prisma.wedding.update({ where: { id: weddingId }, data: { contactVisibility: "hidden" } })

  jest.mocked(requireUserId).mockResolvedValue("another-user")
  expect((await exportGuests(new Request("http://test.local/export?format=xlsx"), params())).status).toBe(404)
  jest.mocked(requireUserId).mockResolvedValue(ownerId)
})
