import Link from "next/link"

export const metadata = { title: "FAQ | Wedding Guest Manager" }

const faqs = [
  {
    question: "How do guests RSVP?",
    answer:
      "Publish your invitation, then share the single invitation link via WhatsApp, email, or any messaging app. Guests open the link, enter their name and mobile number, add family members, choose which events they will attend, and submit. No account is required.",
  },
  {
    question: "Do I need a different link for different guest groups?",
    answer:
      "No. Every wedding uses one shared invitation link. Groups are for your own reporting and filtering; they never change the guest-facing form.",
  },
  {
    question: "Can guests change their RSVP?",
    answer:
      "Yes. After submitting, guests receive a private edit link on the confirmation page. The link contains a secret token, so they should keep it to themselves. The hosts can also edit guest records from the dashboard.",
  },
  {
    question: "How do I import my existing guest list?",
    answer:
      "Open the wedding's Guests page and choose Import CSV. The file needs a firstName column; lastName, mobile, email, group, notes, and dietaryPrefs are optional. The whole file is rejected if any row is invalid so you never get a partial import.",
  },
  {
    question: "What does the dashboard report show?",
    answer:
      "Reports show invited guests, response rate, confirmed/pending/declined counts, total headcount including family members, event-wise attendance, dietary preferences, and group breakdowns. You can export RSVPs as CSV.",
  },
  {
    question: "Is my data isolated from other organisers?",
    answer:
      "Yes. Every wedding belongs to a workspace, and every private page and API checks that the signed-in user is a member of that workspace. Changing an ID in a request cannot expose another workspace's data.",
  },
  {
    question: "What happens after the RSVP deadline?",
    answer:
      "The server rejects new RSVPs for the wedding after its deadline, and rejects responses for an individual event after that event's deadline. Deadlines are enforced on the server, not just in the form.",
  },
]

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-500">
          ← Back to home
        </Link>
        <h1 className="mb-2 mt-3 text-3xl font-bold text-gray-900">Frequently asked questions</h1>
        <p className="mb-8 text-gray-600">Everything organisers and guests need to know.</p>

        <div className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="rounded-lg bg-white p-5 shadow">
              <summary className="cursor-pointer font-semibold text-gray-900">{faq.question}</summary>
              <p className="mt-2 text-sm leading-6 text-gray-600">{faq.answer}</p>
            </details>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          Still need help?{" "}
          <Link href="/dashboard" className="font-medium text-indigo-600 hover:text-indigo-500">
            Go to your dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
