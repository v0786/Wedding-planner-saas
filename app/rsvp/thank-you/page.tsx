import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; edit?: string }>
}) {
  const { invite, edit } = await searchParams
  const editHref =
    invite && edit
      ? `/rsvp/${encodeURIComponent(invite)}/edit?token=${encodeURIComponent(edit)}`
      : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-lg bg-white p-8 shadow">
          <div className="mb-4 text-6xl">🎉</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Thank You!</h1>
          <p className="mb-6 text-gray-600">
            Your RSVP has been received successfully. We look forward to celebrating with you!
          </p>

          {editHref && (
            <div className="mb-6 rounded-md bg-blue-50 p-4 text-left text-sm text-blue-900">
              <p className="font-medium">Need to change something later?</p>
              <p className="mt-1">
                Save this private link. Anyone with it can edit this RSVP, so keep it to yourself.
              </p>
              <Link href={editHref} className="mt-2 inline-block break-all font-medium underline">
                Edit my RSVP
              </Link>
            </div>
          )}

          <p className="mb-6 text-sm text-gray-500">
            If you lose the edit link, contact the hosts and they can help.
          </p>
          <Link href="/" className="text-pink-600 hover:text-pink-700">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
