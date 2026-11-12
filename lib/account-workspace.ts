import { prisma } from "@/lib/prisma"

/** OAuth callbacks may be retried or arrive concurrently. */
export async function ensureAccountWorkspace(userId: string) {
  return prisma.$transaction(async (transaction) => {
    const key = `account-workspace:${userId}`
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
    const membership = await transaction.workspaceMember.findFirst({ where: { userId }, select: { workspaceId: true } })
    if (membership) return membership.workspaceId
    const user = await transaction.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } })
    const workspace = await transaction.workspace.create({
      data: { name: user.name ? `${user.name}'s Workspace` : "My Workspace", members: { create: { userId, role: "owner" } } },
    })
    return workspace.id
  })
}
