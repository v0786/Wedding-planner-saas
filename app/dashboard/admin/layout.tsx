import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/subscriptions/admin"
import { ApiError } from "@/lib/errors"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try { await requireAdmin() }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/auth/login")
    if (error instanceof ApiError && error.details?.mfaRequired) redirect("/dashboard/admin-access")
    if (error instanceof ApiError && error.status === 403) redirect("/dashboard")
    throw error
  }
  return children
}
