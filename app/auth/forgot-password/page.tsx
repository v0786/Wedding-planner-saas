import AuthFrame from "@/components/auth/auth-frame"
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form"

export const metadata = { title: "Reset password | Wedding Guest Manager", referrer: "strict-origin" }
export default function ForgotPasswordPage() {
  return <AuthFrame><PasswordRecoveryForm /></AuthFrame>
}
