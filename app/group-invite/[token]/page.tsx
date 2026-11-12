import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { findOpenGroupInvitation, groupBrowserMatches } from "@/lib/group-invitations"

export const metadata: Metadata = {
  title: "Private invitation",
  referrer: "strict-origin",
  robots: { index: false, follow: false },
}

export default async function ClaimInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await findOpenGroupInvitation(token)
  if (!invitation) notFound()

  if (invitation.browserHash) {
    if (!groupBrowserMatches(invitation, await cookies())) notFound()
    redirect(`/invite/${token}`)
  }

  return (
    <main className="grid min-h-screen place-items-center bg-ivory-100 p-6">
      <section className="card w-full max-w-md space-y-4 p-8 text-center">
        <h1 className="text-3xl font-display">Open your private invitation</h1>
        <p>This invitation will be saved to this browser. Use the phone you want to bring to the wedding.</p>
        <form action="/api/group-invitations/claim" method="post">
          <input type="hidden" name="token" value={token} />
          <button className="btn btn-primary" type="submit">Open invitation</button>
        </form>
      </section>
    </main>
  )
}
