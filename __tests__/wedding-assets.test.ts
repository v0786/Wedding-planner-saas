/** @jest-environment node */
import { downloadWeddingAsset, deleteWeddingAssets, managedAssetUrl, MAX_ASSET_BYTES, readImageBody, uploadWeddingAsset, validateImage, weddingAssetPrefix } from "@/lib/wedding-assets"
import { weddingUpdateSchema } from "@/lib/validation"

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64")
const filename = "cover-12345678-1234-1234-1234-123456789abc.png"
const previousFetch = global.fetch
const previousEnv = { ...process.env }

afterEach(() => { global.fetch = previousFetch; process.env = { ...previousEnv }; jest.restoreAllMocks() })

it("rejects SVG, mismatched MIME, unbounded data and invalid/traversal asset paths", async () => {
  expect(validateImage(png, "image/png")).toEqual({ type: "image/png", extension: "png" })
  expect(() => validateImage(Buffer.from("<svg onload='alert(1)'/>"), "image/png")).toThrow("valid PNG")
  expect(() => validateImage(png, "image/jpeg")).toThrow("valid PNG")
  expect(() => validateImage(Buffer.alloc(MAX_ASSET_BYTES + 1), "image/png")).toThrow("4 MB")
  expect(() => managedAssetUrl("../other", filename)).toThrow("Invalid image path")
  expect(() => managedAssetUrl("wedding", "../image.png")).toThrow("Invalid image path")
  expect(() => weddingUpdateSchema.parse({ coverImageUrl: "/api/weddings/wedding/assets/../../other" })).toThrow()
  expect(weddingUpdateSchema.parse({ coverImageUrl: managedAssetUrl("wedding", filename) }).coverImageUrl).toContain(filename)
  const tooLarge = new Request("https://app.test", { method: "POST", body: Buffer.alloc(MAX_ASSET_BYTES + 1) })
  await expect(readImageBody(tooLarge)).rejects.toMatchObject({ status: 413 })
})

it("keeps service credentials on the storage request and uses a private hashed wedding prefix", async () => {
  process.env.SUPABASE_STORAGE_URL = "https://project.supabase.co"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret"
  global.fetch = jest.fn()
    .mockResolvedValueOnce(Response.json({ public: false }))
    .mockResolvedValueOnce(Response.json([]))
    .mockResolvedValueOnce(Response.json({ Key: "stored" }))
  const result = await uploadWeddingAsset("wedding-1", "cover", png, "image/png")
  expect(result.url).toMatch(/^\/api\/weddings\/wedding-1\/assets\/cover-/)
  expect(result.url).not.toContain("server-secret")
  const [url, init] = (global.fetch as jest.Mock).mock.calls[2]
  expect(url).toContain(`/object/wedding-assets/${weddingAssetPrefix("wedding-1")}/`)
  expect(url).not.toContain("wedding-1")
  expect(init.headers.Authorization).toBe("Bearer server-secret")
  expect(init.headers["x-upsert"]).toBe("false")
})

it("refuses missing config and public buckets before any file is uploaded", async () => {
  delete process.env.SUPABASE_STORAGE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  global.fetch = jest.fn()
  await expect(uploadWeddingAsset("wedding", "cover", png, "image/png")).rejects.toMatchObject({ status: 503 })
  expect(global.fetch).not.toHaveBeenCalled()
  process.env.SUPABASE_STORAGE_URL = "https://project.supabase.co"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret"
  ;(global.fetch as jest.Mock).mockResolvedValueOnce(Response.json({ public: true }))
  await expect(uploadWeddingAsset("wedding", "cover", png, "image/png")).rejects.toThrow("private bucket")
  expect(global.fetch).toHaveBeenCalledTimes(1)
})

it("deletes only valid objects within its durable hashed prefix and relists at zero for retries", async () => {
  process.env.SUPABASE_STORAGE_URL = "https://project.supabase.co"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret"
  const prefix = weddingAssetPrefix("wedding")
  global.fetch = jest.fn()
    .mockResolvedValueOnce(Response.json({ public: false }))
    .mockResolvedValueOnce(Response.json([{ name: filename }]))
    .mockResolvedValueOnce(Response.json([]))
    .mockResolvedValueOnce(Response.json([]))
  await deleteWeddingAssets(prefix)
  const calls = (global.fetch as jest.Mock).mock.calls
  expect(JSON.parse(calls[2][1].body)).toEqual({ prefixes: [`${prefix}/${filename}`] })
  expect(JSON.parse(calls[3][1].body).offset).toBe(0)
  await expect(deleteWeddingAssets("../other")).rejects.toThrow("Invalid image cleanup prefix")
})

it("downloads through the authenticated storage REST operation without exposing a signed URL or caching the asset", async () => {
  process.env.SUPABASE_STORAGE_URL = "https://project.supabase.co"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret"
  global.fetch = jest.fn()
    .mockResolvedValueOnce(Response.json({ public: false }))
    .mockResolvedValueOnce(new Response(png, { headers: { "content-type": "image/png" } }))
  const image = await downloadWeddingAsset("wedding", filename)
  expect(image.bytes.equals(png)).toBe(true)
  expect(image.type).toBe("image/png")
  const [url, options] = (global.fetch as jest.Mock).mock.calls[1]
  expect(url).toContain(`/object/wedding-assets/${weddingAssetPrefix("wedding")}/${filename}`)
  expect(options).toMatchObject({ cache: "no-store", redirect: "error" })
})
