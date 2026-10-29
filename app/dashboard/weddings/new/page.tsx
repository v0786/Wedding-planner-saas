import { auth } from "@/auth"
import { redirect } from "next/navigation"
import NewWeddingForm from "@/components/wedding/new-wedding-form"
import Link from "next/link"

export const metadata = { title: "Create wedding | Wedding Guest Manager" }

export default async function NewWeddingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-500">
        ← Back to dashboard
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold text-gray-900">Create New Wedding</h1>
      <NewWeddingForm />
    </main>
  )
}
