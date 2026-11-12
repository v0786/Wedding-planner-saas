import AuthFrame from "@/components/auth/auth-frame"
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const metadata = { title: "Choose a new password | Wedding Guest Manager", referrer: "strict-origin" }
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return <AuthFrame><div className="card-elevated px-6 py-8"><h1 className="font-display text-2xl">Reset link unavailable</h1><p className="my-4">Request a new password reset link.</p><Link href="/auth/forgot-password" className="btn btn-primary">Request reset link</Link></div></AuthFrame>
  }
  return <AuthFrame><PasswordRecoveryForm token={token} /></AuthFrame>
}
