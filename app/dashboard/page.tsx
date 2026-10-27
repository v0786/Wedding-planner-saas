import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { include: { weddings: true } } },
  })

  if (!membership) {
    redirect("/onboarding")
  }

  const weddings = membership.workspace.weddings

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Wedding Guest Manager</h1>
            </div>
            <div className="flex items-center">
              <Link href="/dashboard/weddings/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm">
                New Wedding
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold mb-6">My Weddings</h2>
          {weddings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500 mb-4">No weddings yet</p>
              <Link href="/dashboard/weddings/new" className="text-indigo-600 hover:text-indigo-500">
                Create your first wedding
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {weddings.map((wedding) => (
                <Link
                  key={wedding.id}
                  href={`/dashboard/weddings/${wedding.id}`}
                  className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900">{wedding.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {wedding.coupleName1} {wedding.coupleName2 && `& ${wedding.coupleName2}`}
                    </p>
                    {wedding.date && (
                      <p className="mt-2 text-sm text-gray-600">
                        {new Date(wedding.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
