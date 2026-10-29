import Link from "next/link"
import { auth } from "@/auth"

export default async function Home() {
  const session = await auth()

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="text-xl font-bold text-pink-600">
              Wedding Guest Manager
            </Link>
            <nav aria-label="Main" className="flex items-center gap-4">
              <Link href="/faq" className="text-gray-700 hover:text-gray-900">
                FAQ
              </Link>
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="rounded-md bg-pink-600 px-4 py-2 text-white hover:bg-pink-700"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/auth/login" className="text-gray-700 hover:text-gray-900">
                    Sign in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="rounded-md bg-pink-600 px-4 py-2 text-white hover:bg-pink-700"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Manage Wedding Guests</span>
            <span className="block text-pink-600">Made Simple</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-500 sm:text-lg">
            One shared invitation link · Customisable RSVP · Family members · Event-wise tracking ·
            Mobile-first for Indian weddings
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={session?.user ? "/dashboard" : "/auth/register"}
              className="rounded-md bg-pink-600 px-8 py-3 text-base font-medium text-white hover:bg-pink-700 md:px-10 md:py-4 md:text-lg"
            >
              {session?.user ? "Go to dashboard" : "Start Free"}
            </Link>
            <Link
              href="/faq"
              className="rounded-md border border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 md:px-10 md:py-4 md:text-lg"
            >
              How it works
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["One link", "Share a single invitation link with every guest."],
            ["RSVP without signup", "Guests respond with their name and mobile number."],
            ["Family & events", "Add family members and choose events per person."],
            ["Live reports", "Headcount, dietary needs, and event attendance in one place."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg bg-white p-5 shadow">
              <h2 className="font-semibold text-gray-900">{title}</h2>
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
