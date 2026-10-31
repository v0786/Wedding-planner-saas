import { auth } from "@/auth"
import { redirect } from "next/navigation"
import NewWeddingForm from "@/components/wedding/new-wedding-form"
import Link from "next/link"
import PageHeader from "@/components/ui/page-header"

export const metadata = { title: "Create wedding | Wedding Guest Manager" }

export default async function NewWeddingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className="group inline-flex items-center gap-2 text-sm font-medium text-ink-500 transition-colors hover:text-gold-700"
      >
        <svg
          className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to dashboard
      </Link>

      <PageHeader
        eyebrow="New celebration"
        title="Create New Wedding"
        description="Set the scene for your celebration — the details here appear on the invitation your guests will see."
        className="mt-6"
      />

      <NewWeddingForm />
    </main>
  )
}
