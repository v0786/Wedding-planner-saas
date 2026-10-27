import Link from "next/link"

export default function ThankYouPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            Your RSVP has been received successfully. We look forward to celebrating with you!
          </p>
          <p className="text-sm text-gray-500 mb-6">
            If you need to make changes to your response, please contact the hosts.
          </p>
          <Link href="/" className="text-pink-600 hover:text-pink-700">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
