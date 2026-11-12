import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form"

export const metadata = { title: "Reset password | Wedding Guest Manager", referrer: "strict-origin" }
export default function ForgotPasswordPage() {
  return <main className="flex min-h-screen items-center bg-ivory-50 px-4 py-12"><PasswordRecoveryForm /></main>
}
