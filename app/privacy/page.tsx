import type { Metadata } from "next"
import { PolicyLayout } from "@/components/policies/policy-layout"
import { PRIVACY_VERSION } from "@/lib/policies"

export const metadata: Metadata = { title: "Privacy Notice" }
export const dynamic = "force-dynamic"

export default function PrivacyPage() {
  return (
    <PolicyLayout title="Privacy Notice" version={PRIVACY_VERSION}>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Information used by the service</h2>
        <p>The application processes host account details, names, phone numbers, email addresses, wedding and event information, guest lists, RSVP answers, dietary preferences and group attendance. Hosts may also provide photographs, documents, accommodation or transport information and private notes where the relevant feature is available.</p>
        <p>Payment records contain provider references, wedding purchase details and amounts. Card and payment credentials are handled by the payment provider. Policy acceptance records contain the account identifier, policy versions, server timestamp and acceptance source.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Why this information is processed</h2>
        <p>Information is used to operate accounts, organize weddings, display approved invitations, verify a guest&apos;s phone, save and edit RSVPs, calculate attendance, prepare authorized reports, check in groups and verify wedding purchases. Service records also help handle support, prevent abuse and investigate errors.</p>
        <p>Hosts are responsible for sharing guest information appropriately and explaining their use of it to guests. Provide only information needed for the wedding and avoid sensitive details in free-text answers and notes.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Who can see wedding information</h2>
        <p>Public invitations show the wedding and event information approved for publication. Private guest details and notes require authorized access. Hosts can view guest responses and use available reports and exports according to their wedding access and privacy settings. Anyone receiving an exported file can retain a copy outside the application.</p>
        <p>Personal invitation and RSVP edit links are restricted to their saved browser. A device transfer link can move access to another browser after confirmation. Share those links only with the intended person.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Providers, sharing and communications</h2>
        <p>The deployed service uses hosting and database providers, Razorpay for payments and Twilio Verify when SMS verification is configured. Provider processing is subject to their own terms and privacy notices. The operator must identify its deployed providers and applicable processing arrangements before launch.</p>
        <p>Manual WhatsApp sharing opens a message for the person using the share control. Automated messages require a configured official provider and appropriate permissions. The application must explain any future analytics, advertising or additional provider use before collecting information for that purpose.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Cookies and access protection</h2>
        <p>The application uses cookies for account sessions and private invitation or RSVP browser access. Cookies help the saved browser reopen its response. Clearing site data, using private browsing or opening a different browser can remove that access. Server records and request information are used to enforce verification and rate limits.</p>
        <p>Access controls, server-side validation and protected tokens help limit unauthorized access. No service can promise that transmission or storage is free from risk. Keep your account password and private links secure.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Retention and deletion</h2>
        <p>Wedding editing and public RSVP access expire after the wedding date. Wedding data becomes eligible for deletion after seven complete local calendar days following that date. Actual removal depends on the operator&apos;s configured deletion process. Backup expiry and any required payment-record retention are separate and must be published by the operator.</p>
        <p>Ask support about early deletion and retained copies. A host&apos;s exported files and messages shared through another service remain outside the application&apos;s direct control. The operator must complete its account, log and backup retention details before commercial launch.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Your choices and requests</h2>
        <p>Guests can update a response through their authorized browser before the applicable deadline. Contact the host or operator to request access, correction, deletion, help with a lost private link or information about processing. You can withdraw a permission you previously gave by contacting the operator, and support should explain the effect on service features and any records that must remain.</p>
        <p>Reading this notice does not enroll you in marketing. Terms acceptance and Privacy Notice acknowledgement are separate unchecked choices. The application preserves the versions and timestamps acknowledged by an account.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Updates and grievances</h2>
        <p>Changes are identified by a policy version. Material updates may require a fresh acknowledgement while historical records remain available to authorized operators. Use the contact details below to raise a privacy question or grievance. This notice requires review against applicable Indian privacy and consumer protection requirements before commercial launch.</p></section>
    </PolicyLayout>
  )
}
