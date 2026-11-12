import type { Metadata } from "next"
import { PolicyLayout } from "@/components/policies/policy-layout"
import { TERMS_VERSION } from "@/lib/policies"

export const metadata: Metadata = { title: "Terms of Service" }
export const dynamic = "force-dynamic"

export default function TermsPage() {
  return (
    <PolicyLayout title="Terms of Service" version={TERMS_VERSION}>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">The service and your account</h2>
        <p>Wedding Guest Planner helps hosts organize weddings, guests, events, invitations, RSVPs, reports and group arrivals. Create an account only when you are entitled to enter into the service agreement and organize the relevant wedding. Give accurate account details, protect your password and notify the operator if your account is compromised.</p>
        <p>You are responsible for the information and photographs you upload, your guest list and the people with whom you share invitation links. Obtain the permissions needed to provide and use that information. Keep private RSVP and device transfer links secure.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Purchases, plans and payments</h2>
        <p>A plan is a one-time purchase for one wedding. Different weddings in the same account require separate purchases. The checkout shows the selected plan, current price and applicable taxes before payment. Prices and features can change for future purchases while historical payment records retain the purchased amount.</p>
        <p>Payment is processed by Razorpay. Paid access starts after the server verifies the payment. An upgrade charges the displayed difference and a failed payment preserves the existing paid plan. The application does not automatically renew a wedding purchase.</p>
        <p>Plan features and restrictions are shown on the pricing and checkout pages. WhatsApp sharing is available where included in the wedding plan. Automated WhatsApp delivery requires an enabled supported provider. Advertisement eligibility depends on the plan and Prime excludes application-controlled advertisements.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Wedding expiry and records</h2>
        <p>Wedding editing and public RSVP access close at midnight in the wedding timezone immediately following the wedding date. The default timezone is Asia/Kolkata. The host can view retained historical records and use available exports during the retention window.</p>
        <p>Wedding data becomes eligible for removal after seven complete local calendar days following the wedding date. Deletion operations and backup retention require the operator&apos;s configured retention process. Contact support about early deletion, data access or an incorrect wedding date.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Cancellations and refunds</h2>
        <p>There is no recurring charge to cancel. Cancelling wedding plans does not itself create an automatic refund or extend the access period. Contact support about failed, duplicate or disputed payments. Refund decisions are subject to the published purchase terms and applicable requirements. The operator must complete and review the commercial refund policy before launch.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Acceptable use and suspension</h2>
        <p>Use the service for lawful wedding coordination. Do not send unsolicited communications, upload material you cannot lawfully use, attempt to access another wedding&apos;s data, interfere with the service or evade verification and plan restrictions. The operator may restrict access to investigate misuse, account compromise or a service threat and should provide appropriate support information.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Content, availability and responsibility</h2>
        <p>You retain your rights in the information and photographs you provide and authorize the processing needed to operate your wedding workspace. The service&apos;s branding, software and design remain subject to their respective owners&apos; rights.</p>
        <p>Hosts should review guest responses and exports before making wedding arrangements. Delivery, payment and network providers can affect availability. Any limitations of liability, dispute procedure and jurisdiction must be reviewed for the operator and applicable Indian law before commercial launch. These terms do not remove rights that cannot lawfully be excluded.</p></section>
      <section className="space-y-2"><h2 className="font-display text-2xl text-ink-800">Policy changes and questions</h2>
        <p>Policies carry a version identifier. The application records acceptance of the Terms and acknowledgement of the Privacy Notice with the account, timestamp and version. A later policy update preserves historical acceptance records and may require a new acknowledgement. Use the operator details below for support and grievances.</p></section>
    </PolicyLayout>
  )
}
