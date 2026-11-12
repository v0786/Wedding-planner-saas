import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const metadata = { title: "Choose a new password | Wedding Guest Manager", referrer: "strict-origin" }
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return <main className="mx-auto max-w-md px-4 py-12"><h1 className="font-display text-2xl">Reset link unavailable</h1><p className="my-4">Request a new password reset link.</p><Link href="/auth/forgot-password" className="btn btn-primary">Request reset link</Link></main>
  }
  return <main className="flex min-h-screen items-center bg-ivory-50 px-4 py-12"><PasswordRecoveryForm token={token} /></main>
}
