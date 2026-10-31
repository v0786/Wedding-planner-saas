/**
 * Pure admin authorization rules, kept free of database/Next.js imports so the
 * policy can be unit tested.
 */

export interface AdminCandidate {
  email: string
  isAdmin: boolean
}

/** Normalises the comma-separated `ADMIN_EMAILS` allowlist. */
export function parseAdminEmails(value: string | undefined = process.env.ADMIN_EMAILS): string[] {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * The `isAdmin` flag wins; otherwise the account email must be on the
 * allowlist. Matching is case-insensitive and ignores surrounding whitespace.
 */
export function isAdminAllowed(
  user: AdminCandidate,
  emails: string | undefined = process.env.ADMIN_EMAILS,
): boolean {
  if (user.isAdmin) return true
  return parseAdminEmails(emails).includes(user.email.trim().toLowerCase())
}
