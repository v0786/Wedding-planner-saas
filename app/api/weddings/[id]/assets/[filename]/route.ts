import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { handleApiError } from "@/lib/api"
import { ApiError } from "@/lib/errors"
import { isWeddingExpired } from "@/lib/wedding-lifecycle"
import { downloadWeddingAsset, managedAssetUrl } from "@/lib/wedding-assets"

export const runtime = "nodejs"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; filename: string }> }) {
  try {
    const { id, filename } = await params
    const path = managedAssetUrl(id, filename)
    const session = await auth()
    const wedding = await prisma.wedding.findUnique({ where: { id }, include: {
      workspace: { select: { members: { where: { userId: session?.user?.id || "" }, select: { userId: true } } } },
    } })
    if (!wedding) throw new ApiError("Image not found", 404)
    const owner = !!session?.user?.id && wedding.workspace.members.length > 0
    const approved = wedding.published && !isWeddingExpired(wedding) &&
      ((wedding.publicFields.includes("coverImageUrl") && wedding.coverImageUrl === path) ||
       (wedding.publicFields.includes("couplePhotoUrl") && wedding.couplePhotoUrl === path))
    if (!owner && !approved) throw new ApiError("Image not found", 404)
    const image = await downloadWeddingAsset(id, filename)
    return new NextResponse(image.bytes, { headers: {
      "Content-Type": image.type, "Content-Length": String(image.bytes.length),
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="${filename}"`,
    } })
  } catch (error) { return handleApiError(error) }
}
