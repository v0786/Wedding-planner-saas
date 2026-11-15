import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { currentPolicyAcceptance } from "@/lib/policy-service"
import WeddingSetupWizard from "@/components/wedding/wedding-setup-wizard"

export const metadata = { title: "Guided wedding setup | Wedding Guest Manager" }
export const dynamic = "force-dynamic"

export default async function WeddingSetupPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login?next=/onboarding/setup")
  if (!await currentPolicyAcceptance(session.user.id)) redirect("/onboarding/policies")
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm text-gold-700 hover:underline">Back to dashboard</Link>
      <header className="my-7">
        <p className="eyebrow">A celebration, beautifully organized</p>
        <h1 className="mt-3 font-display text-3xl text-ink-800 sm:text-4xl">Let’s set up your wedding</h1>
        <p className="mt-3 text-sm text-ink-500">Save your progress to your account and return on any device. Your wedding stays private until you publish it.</p>
      </header>
      <WeddingSetupWizard />
    </main>
  )
}
