import LoginForm from "@/components/auth/login-form"
import Link from "next/link"

export const metadata = { title: "Sign in | Wedding Guest Manager" }

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>
}) {
  return <LoginPageContent searchParams={searchParams} />
}

async function LoginPageContent({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>
}) {
  const { registered } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-500">
            ← Back to home
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Sign in to your account</h1>
          <p className="mt-2 text-sm text-gray-600">
            New here?{" "}
            <Link href="/auth/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Create an account
            </Link>
          </p>
        </div>
        {registered && (
          <div role="status" className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
            Account created. Sign in to continue.
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  )
}
