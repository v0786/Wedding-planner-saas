import { createHash, randomUUID } from "node:crypto"
import { ApiError } from "@/lib/errors"

export const MAX_ASSET_BYTES = 4 * 1024 * 1024
export const ASSET_FILENAME = /^(cover|couple)-[a-f0-9-]{36}\.(png|jpg|webp)$/
export const MANAGED_ASSET_PATH = /^\/api\/weddings\/[a-zA-Z0-9_-]+\/assets\/(cover|couple)-[a-f0-9-]{36}\.(png|jpg|webp)$/
export type AssetKind = "cover" | "couple"

export function weddingAssetPrefix(weddingId: string) {
  return createHash("sha256").update(weddingId).digest("hex")
}

export function managedAssetUrl(weddingId: string, filename: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(weddingId) || !ASSET_FILENAME.test(filename)) throw new ApiError("Invalid image path", 400)
  return `/api/weddings/${weddingId}/assets/${filename}`
}

export function validateImage(bytes: Uint8Array, declaredType: string) {
  if (!bytes.length || bytes.length > MAX_ASSET_BYTES) throw new ApiError("Choose an image up to 4 MB", 413)
  const b = Buffer.from(bytes)
  let type: string | null = null
  let extension = ""
  if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.toString("ascii", 12, 16) === "IHDR") {
    type = "image/png"; extension = "png"
  } else if (b.length >= 4 && b[0] === 255 && b[1] === 216 && b[b.length - 2] === 255 && b[b.length - 1] === 217) {
    type = "image/jpeg"; extension = "jpg"
  } else if (b.length >= 16 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" && b.readUInt32LE(4) + 8 === b.length) {
    type = "image/webp"; extension = "webp"
  }
  if (!type || declaredType.split(";")[0].trim().toLowerCase() !== type) throw new ApiError("Choose a valid PNG, JPEG or WebP image", 400)
  return { type, extension }
}

/** Read without trusting Content-Length or buffering an unbounded upload. */
export async function readImageBody(request: Pick<Request, "headers" | "body">) {
  const declared = request.headers.get("content-length")
  if (declared && Number(declared) > MAX_ASSET_BYTES) throw new ApiError("Choose an image up to 4 MB", 413)
  if (!request.body) throw new ApiError("Choose an image", 400)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_ASSET_BYTES) { await reader.cancel(); throw new ApiError("Choose an image up to 4 MB", 413) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks)
}

function storageConfig() {
  const origin = process.env.SUPABASE_STORAGE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.SUPABASE_ASSET_BUCKET || "wedding-assets"
  if (!origin || !key) throw new ApiError("Image uploads are not configured yet", 503)
  const url = new URL(origin)
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || !/^[a-z0-9-]+$/.test(bucket)) throw new ApiError("Image storage configuration is invalid", 503)
  return { origin: url.origin, key, bucket }
}

async function storageFetch(path: string, init: RequestInit = {}) {
  const { origin, key } = storageConfig()
  try {
    const response = await fetch(`${origin}/storage/v1/${path}`, {
      ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { apikey: key, Authorization: `Bearer ${key}`, ...init.headers },
    })
    if (!response.ok) throw new ApiError(response.status === 404 ? "Image not found" : "Image storage is temporarily unavailable", response.status === 404 ? 404 : 503)
    return response
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("Image storage is temporarily unavailable", 503)
  }
}

/** Refuse accidentally public buckets; access is mediated by the app's Auth.js guards. */
async function privateBucket() {
  const { bucket } = storageConfig()
  const config = await (await storageFetch(`bucket/${bucket}`)).json()
  if (config.public !== false) throw new ApiError("Image storage must use a private bucket", 503)
  return bucket
}

export async function uploadWeddingAsset(weddingId: string, kind: AssetKind, bytes: Uint8Array, contentType: string) {
  const { type, extension } = validateImage(bytes, contentType)
  const bucket = await privateBucket()
  const prefix = weddingAssetPrefix(weddingId)
  const objects = await listAssetObjects(bucket, prefix)
  if (objects.length >= 50) throw new ApiError("This wedding has reached its image upload limit. Contact support to remove unused uploads.", 409)
  const filename = `${kind}-${randomUUID()}.${extension}`
  await storageFetch(`object/${bucket}/${prefix}/${filename}`, { method: "POST", headers: { "Content-Type": type, "x-upsert": "false" }, body: Buffer.from(bytes) })
  return { url: managedAssetUrl(weddingId, filename), filename }
}

export async function downloadWeddingAsset(weddingId: string, filename: string) {
  managedAssetUrl(weddingId, filename)
  const bucket = await privateBucket()
  const response = await storageFetch(`object/${bucket}/${weddingAssetPrefix(weddingId)}/${filename}`)
  const bytes = await readImageBody(response)
  const image = validateImage(bytes, response.headers.get("content-type") || "")
  return { bytes, type: image.type }
}

async function listAssetObjects(bucket: string, prefix: string) {
  const response = await storageFetch(`object/list/${bucket}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefix, limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } }) })
  const objects: Array<{ name: string }> = await response.json()
  if (!Array.isArray(objects) || objects.some(object => !ASSET_FILENAME.test(object.name))) throw new ApiError("Unexpected image storage response", 503)
  return objects
}

export async function deleteWeddingAssets(prefix: string) {
  if (!/^[a-f0-9]{64}$/.test(prefix)) throw new ApiError("Invalid image cleanup prefix", 400)
  const bucket = await privateBucket()
  // Always list from offset zero after deletion: offsets would skip remaining objects.
  for (let batch = 0; batch < 20; batch++) {
    const objects = await listAssetObjects(bucket, prefix)
    if (!objects.length) return
    await storageFetch(`object/${bucket}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: objects.map(object => `${prefix}/${object.name}`) }) })
  }
  throw new ApiError("Image cleanup will resume on the next run", 503)
}
