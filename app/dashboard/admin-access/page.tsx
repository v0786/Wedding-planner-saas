import { redirect } from "next/navigation"
import { requireAdminIdentity } from "@/lib/subscriptions/admin"
import { ApiError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import AdminMfaForm from "@/components/admin/admin-mfa-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "Administrator verification", robots: { index: false, follow: false } }
export default async function AdminAccessPage() {
  let user
  try { user = await requireAdminIdentity() }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/auth/login")
    if (error instanceof ApiError && error.status === 403) redirect("/dashboard")
    throw error
  }
  const enrolled = Boolean(await prisma.adminMfaCredential.findUnique({ where: { userId: user.id }, select: { id: true } }))
  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-12">
      <p className="eyebrow">Platform security</p>
      <h1 className="font-display text-3xl">Administrator verification</h1>
      <p className="text-sm text-ink-500">Use your authenticator to unlock platform administration for 15 minutes in this signed-in browser.</p>
      <AdminMfaForm enrolled={enrolled} />
    </main>
  )
}
