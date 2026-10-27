import { auth } from "@/auth"
import { redirect } from "next/navigation"
import NewWeddingForm from "@/components/wedding/new-wedding-form"

export default async function NewWeddingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Wedding</h1>
        </div>
        <NewWeddingForm />
      </div>
    </div>
  )
}
