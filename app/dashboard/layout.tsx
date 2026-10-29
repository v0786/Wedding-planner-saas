import { auth } from "@/auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/layout/sign-out-button"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-lg font-semibold text-gray-900">
            Wedding Guest Manager
          </Link>
          <nav aria-label="Dashboard" className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/reports"
              className="rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
            >
              Reports
            </Link>
            <Link
              href="/faq"
              className="rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
            >
              FAQ
            </Link>
            <span className="hidden text-sm text-gray-500 sm:inline">{session.user.email}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
