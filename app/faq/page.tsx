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
    <main className="min-h-screen bg-ivory-50">
      <div className="border-b border-ivory-200/70 bg-ivory-100/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="text-sm font-medium text-ink-600 transition-colors hover:text-gold-700"
          >
            ← Back to home
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-ink-600 transition-colors hover:text-gold-700"
          >
            Pricing
          </Link>
        </div>
      </div>

      <div className="paper-texture">
        <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
          <header className="text-center">
            <p className="eyebrow">Answers</p>
            <h1 className="mt-4 font-display text-display-xs text-ink-800 sm:text-display-sm">
              Frequently asked questions
            </h1>
            <p className="lede mx-auto mt-4 max-w-xl">
              Everything organisers and guests need to know.
            </p>
            <div className="mx-auto mt-9 max-w-xs">
              <div className="gold-hairline" />
            </div>
          </header>

          <div className="mt-12 space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group card overflow-hidden transition-all duration-300 ease-refined open:border-gold-300 open:shadow-lift"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left [&::-webkit-details-marker]:hidden sm:px-7 sm:py-6">
                  <span className="font-display text-lg leading-snug text-ink-800 sm:text-xl">
                    {faq.question}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ivory-300 text-gold-600 transition-transform duration-300 ease-refined group-open:rotate-45 group-open:border-gold-300 group-open:bg-champagne-100"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 pb-6 sm:px-7 sm:pb-7">
                  <div className="gold-hairline mb-4 opacity-70" aria-hidden="true" />
                  <p className="text-sm leading-7 text-ink-500">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>

          <div className="mt-12 rounded-3xl border border-ivory-300/70 bg-white/80 px-6 py-8 text-center shadow-soft">
            <p className="text-sm text-ink-600">
              Still need help?{" "}
              <Link
                href="/dashboard"
                className="font-medium text-gold-700 underline-offset-4 transition-colors hover:text-gold-600 hover:underline"
              >
                Go to your dashboard
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
