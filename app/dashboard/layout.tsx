import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AppShell from "@/components/layout/app-shell"
import { prisma } from "@/lib/prisma"
import { isAdminAllowed } from "@/lib/subscriptions/admin-access"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, isAdmin: true, emailVerified: true } })
  return <AppShell email={session.user.email} isAdmin={Boolean(user && isAdminAllowed(user))}>{children}</AppShell>
}
