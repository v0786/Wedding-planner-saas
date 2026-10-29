import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function OnboardingPage() {
  const session = await auth()
  if (session?.user?.id) redirect("/dashboard")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Welcome to Wedding Guest Manager
          </h2>
        </div>
        <div className="text-center">
          <p className="mt-4 text-base text-gray-500 sm:text-lg">
            Create your wedding workspace to start managing guests, RSVPs, and events.
          </p>
        </div>
        <div className="mt-8 rounded-md shadow bg-white px-8 py-6">
          <Link
            href="/auth/register"
            className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">
            Create Account
          </Link>
          <p className="mt-4 text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}