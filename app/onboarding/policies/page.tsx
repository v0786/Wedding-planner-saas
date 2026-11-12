import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import PolicyAcceptanceForm from "@/components/policies/policy-acceptance-form"
import { currentPolicyAcceptance } from "@/lib/policy-service"
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/policies"

export const dynamic = "force-dynamic"

export default async function PolicyAcceptancePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  if (await currentPolicyAcceptance(session.user.id)) redirect("/dashboard")

  return (
    <main className="mx-auto max-w-lg px-5 py-12 sm:py-16">
      <Link href="/dashboard" className="text-sm font-medium text-gold-700 underline-offset-4 hover:underline">Back to your dashboard</Link>
      <section className="card-elevated mt-6 space-y-5 p-6 sm:p-8">
        <h1 className="font-display text-3xl text-ink-800">Review the current policies</h1>
        <p className="text-sm leading-relaxed text-ink-600">Read the Terms of Service and Privacy Notice before creating a wedding or starting a new purchase. Your previous acceptance records are preserved when policies change.</p>
        <p className="text-xs text-ink-500">Terms version {TERMS_VERSION} · Privacy version {PRIVACY_VERSION}</p>
        <PolicyAcceptanceForm />
      </section>
    </main>
  )
}
