import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const metadata = { title: "Dashboard | Wedding Guest Manager" }

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { include: { weddings: { orderBy: { createdAt: "desc" } } } } },
  })

  const weddings = membership?.workspace.weddings ?? []

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Weddings</h1>
          {membership && <p className="text-sm text-gray-600">{membership.workspace.name}</p>}
        </div>
        <Link
          href="/dashboard/weddings/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          New Wedding
        </Link>
      </div>

      {!membership ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <h2 className="text-lg font-semibold text-gray-900">No workspace yet</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your account is not linked to a workspace. Please contact support or register a new account.
          </p>
        </div>
      ) : weddings.length === 0 ? (
        <div className="rounded-lg bg-white py-12 text-center shadow">
          <p className="mb-4 text-gray-500">No weddings yet</p>
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
              className="overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-md"
            >
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-medium text-gray-900">{wedding.name}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      wedding.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {wedding.published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {wedding.coupleName1}
                  {wedding.coupleName2 && ` & ${wedding.coupleName2}`}
                </p>
                {wedding.date && (
                  <p className="mt-2 text-sm text-gray-600">
                    {new Date(wedding.date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                )}
                {wedding.venue && <p className="mt-1 text-sm text-gray-500">{wedding.venue}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
