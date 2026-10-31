import { auth } from "@/auth"
import { redirect } from "next/navigation"
import AppShell from "@/components/layout/app-shell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  return <AppShell email={session.user.email}>{children}</AppShell>
}
