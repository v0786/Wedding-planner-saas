import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  return session.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function getUserWorkspace(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
  })
  return membership?.workspace || null
}

export async function requireWorkspace(userId: string) {
  const workspace = await getUserWorkspace(userId)
  if (!workspace) throw new Error("No workspace found")
  return workspace
}
