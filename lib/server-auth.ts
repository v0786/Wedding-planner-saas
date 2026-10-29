import { auth } from "@/auth"
import { ApiError } from "@/lib/errors"

/**
 * Returns the authenticated user id or throws a 401 ApiError.
 * Authorization is always enforced on the server, never inferred from the UI.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
  return session.user.id
}
