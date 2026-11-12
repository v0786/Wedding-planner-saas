/**
 * Pure admin authorization rules, kept free of database/Next.js imports so the
 * policy can be unit tested.
 */

export interface AdminCandidate {
  email: string
  isAdmin: boolean
  emailVerified?: Date | null
}

/** Normalises the comma-separated `ADMIN_EMAILS` allowlist. */
export function parseAdminEmails(value: string | undefined = process.env.ADMIN_EMAILS): string[] {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Explicitly provisioned administrators are trusted. The email allowlist also
 * requires verified ownership so open registration cannot claim admin access.
 */
export function isAdminAllowed(
  user: AdminCandidate,
  emails: string | undefined = process.env.ADMIN_EMAILS,
): boolean {
  if (user.isAdmin) return true
  return Boolean(user.emailVerified) && parseAdminEmails(emails).includes(user.email.trim().toLowerCase())
}
