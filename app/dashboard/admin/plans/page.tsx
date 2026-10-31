import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AdminPlanEditor from "@/components/subscriptions/admin-plan-editor"
import { ensurePlanRows, getPlanConfigs } from "@/lib/subscriptions/service"
import { isPaymentConfigured } from "@/lib/subscriptions/razorpay"
import { isAdminAllowed } from "@/lib/subscriptions/admin-access"

export const dynamic = "force-dynamic"

export default async function AdminPlansPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, isAdmin: true },
  })
  const isAdmin = Boolean(user && isAdminAllowed(user))

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Administrator access required</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your account is not allowed to edit plan pricing. Ask an operator to grant the admin flag or add your
          email to <code className="rounded bg-gray-100 px-1 py-0.5">ADMIN_EMAILS</code>.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-indigo-600">← Back to dashboard</Link>
      </main>
    )
  }

  await ensurePlanRows()
  const [plans, paymentsConfigured] = await Promise.all([getPlanConfigs(), Promise.resolve(isPaymentConfigured())])

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link href="/dashboard/billing" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">← Billing</Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Plan pricing & limits</h1>
        <p className="mt-1 text-sm text-gray-600">
          Prices are stored server-side in paise. Leave a price empty to show “Coming Soon”. Changes apply
          immediately without a deploy.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Payments: {paymentsConfigured ? "Razorpay configured" : "Razorpay keys missing"} · Changes are audited by
          the app logs and affect all workspaces.
        </p>
      </div>

      <AdminPlanEditor plans={plans} paymentsConfigured={paymentsConfigured} />
    </main>
  )
}
