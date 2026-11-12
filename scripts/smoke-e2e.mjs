/**
 * Real HTTP end-to-end smoke test.
 *
 * Runs against a production build (`npm run build && npm run start`) and a
 * seeded local test database and loopback OTP mock. It uses the public HTTP API
 * the same way the browser does, including Auth.js and phone verification.
 *
 * Usage:
 *   node scripts/mock-rsvp-otp.mjs
 *   npm run start            # in another terminal with RSVP_OTP_TEST_ORIGIN set
 *   npm run test:smoke
 *
 * Override the target with APP_URL.
 */
import { PrismaClient } from "@prisma/client";

const base = (process.env.APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const localHostnames = ["127.0.0.1", "localhost", "[::1]"];
const app = new URL(base);
const db = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
const otp = new URL(process.env.RSVP_OTP_TEST_ORIGIN ?? "http://invalid");
if (!localHostnames.includes(app.hostname) || !localHostnames.includes(db.hostname) ||
    !localHostnames.includes(otp.hostname) || !db.pathname.endsWith("_test")) {
  throw new Error("Run the smoke suite against a local *_test database and loopback OTP mock.");
}
const prisma = new PrismaClient();
const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

const policyAcceptance = {
  termsAccepted: true,
  privacyAcknowledged: true,
  termsVersion: "2026-11-11",
  privacyVersion: "2026-11-11",
};

let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function makeClient() {
  const jar = new Map();
  function store(response) {
    const cookies = response.headers.getSetCookie?.() ?? [];
    for (const cookie of cookies) {
      const [pair] = cookie.split(";");
      const index = pair.indexOf("=");
      const key = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (value === "") jar.delete(key);
      else jar.set(key, value);
    }
  }
  async function request(path, options = {}) {
    const response = await fetch(`${base}${path}`, {
      ...options,
      redirect: "manual",
      headers: {
        ...(options.headers ?? {}),
        cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; "),
      },
    });
    store(response);
    return response;
  }
  return { jar, request };
}

async function login(client, email, password) {
  const csrfResponse = await client.request("/api/auth/csrf");
  const { csrfToken } = await csrfResponse.json();
  const response = await client.request("/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-auth-return-redirect": "1",
    },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: `${base}/dashboard` }),
  });
  const session = await client.request("/api/auth/session");
  const data = await session.json();
  return response.ok && Boolean(data?.user?.email);
}

async function main() {
  console.log(`Smoke test against ${base}`);
  const host = makeClient();
  const guestBrowser = makeClient();

  const unauthorized = await host.request("/api/weddings");
  check("unauthenticated API request returns 401", unauthorized.status === 401);

  check(
    "demo host can sign in through Auth.js",
    await login(host, "demo@example.com", "demo1234"),
  );

  const acceptedPolicies = await host.request("/api/policies/accept", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(policyAcceptance),
  });
  check("legacy host explicitly accepts the current policies", acceptedPolicies.status === 200);

  const createResponse = await host.request("/api/weddings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: `Smoke Wedding ${suffix}`,
      coupleName1: "Smoke",
      coupleName2: "Test",
      date: "2027-06-01",
      venue: "Smoke Hall",
      rsvpDeadline: "2027-05-01",
    }),
  });
  const created = await createResponse.json();
  check("host can create a wedding", createResponse.status === 201 && Boolean(created.wedding?.id));
  const weddingId = created.wedding?.id;
  const invitationToken = created.wedding?.invitationToken;
  if (!weddingId) throw new Error("Cannot continue without a wedding id");

  // Seed a paid order only for this disposable wedding. This exercises the
  // production entitlement lookup without contacting Razorpay.
  const proPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "PRO" } });
  const { workspaceId } = await prisma.wedding.findUniqueOrThrow({
    where: { id: weddingId },
    select: { workspaceId: true },
  });
  const entitlementFixture = await prisma.payment.create({
    data: {
      workspaceId,
      weddingId,
      planId: proPlan.id,
      planCode: proPlan.code,
      provider: "test-fixture",
      providerOrderId: `smoke_${suffix}`,
      amountInPaise: 100,
      weddingPlanPriceInPaise: 100,
      billingPeriodDays: 0,
      status: "PAID",
      paidAt: new Date(),
    },
  });
  check("plan entitlement fixture is provisioned for this wedding", Boolean(entitlementFixture.id));

  const eventResponse = await host.request(`/api/weddings/${weddingId}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Sangeet", date: "2027-05-31", time: "7:00 PM", order: 1 }),
  });
  const event = (await eventResponse.json()).event;
  check("host can create an event", eventResponse.status === 201 && Boolean(event?.id));

  const questionResponse = await host.request(`/api/weddings/${weddingId}/questions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "Smoke question", type: "text", required: true, order: 1 }),
  });
  const question = (await questionResponse.json()).question;
  check("host can create a custom RSVP question", questionResponse.status === 201 && Boolean(question?.id));

  const guestResponse = await host.request(`/api/weddings/${weddingId}/guests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "Manual",
      lastName: "Guest",
      mobile: `98${suffix.slice(-8)}`,
      group: "Smoke",
    }),
  });
  const guest = (await guestResponse.json()).guest;
  check("host can add a guest", guestResponse.status === 201 && Boolean(guest?.id));

  const duplicateResponse = await host.request(`/api/weddings/${weddingId}/guests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ firstName: "Duplicate", mobile: `98${suffix.slice(-8)}` }),
  });
  check("duplicate mobile numbers are rejected", duplicateResponse.status === 409);

  const csv = [
    "firstName,lastName,mobile,email,group",
    `Csv,Guest,97${suffix.slice(-8)},csv-${suffix}@example.com,Imported`,
    `Second,Guest,,second-${suffix}@example.com,Imported`,
  ].join("\n");
  const form = new FormData();
  form.append("file", new Blob([csv], { type: "text/csv" }), "guests.csv");
  const importResponse = await host.request(`/api/weddings/${weddingId}/guests/import`, {
    method: "POST",
    body: form,
  });
  const imported = await importResponse.json();
  check("CSV import creates every valid row", importResponse.status === 201 && imported.imported === 2);

  const badCsvForm = new FormData();
  badCsvForm.append(
    "file",
    new Blob(["firstName,email\nBad,not-an-email\n"], { type: "text/csv" }),
    "bad.csv",
  );
  const badImport = await host.request(`/api/weddings/${weddingId}/guests/import`, {
    method: "POST",
    body: badCsvForm,
  });
  check("an invalid CSV row rejects the whole import", badImport.status === 400);

  const listResponse = await host.request(
    `/api/weddings/${weddingId}/guests?search=Manual&status=all`,
  );
  const list = await listResponse.json();
  check(
    "guest search filters the list",
    listResponse.status === 200 &&
      list.guests?.length === 1 &&
      list.guests[0].id === guest?.id,
  );

  const patchResponse = await host.request(`/api/weddings/${weddingId}/guests/${guest?.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ notes: "Updated by smoke test" }),
  });
  check("host can update a guest", patchResponse.status === 200);

  const exportResponse = await host.request(`/api/weddings/${weddingId}/guests/export`);
  const exportCsv = await exportResponse.text();
  check(
    "guest CSV export contains imported rows",
    exportResponse.status === 200 && exportCsv.includes("Csv,Guest"),
  );

  check("guest CSV omits contact details when wedding privacy hides them", !exportCsv.includes(`98${suffix.slice(-8)}`));

  const publishResponse = await host.request(`/api/weddings/${weddingId}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ published: true }),
  });
  check("host can publish the invitation", publishResponse.status === 200);

  const invitationPage = await fetch(`${base}/invite/${invitationToken}`);
  const invitationHtml = await invitationPage.text();
  check(
    "invitation page is public and shows the wedding",
    invitationPage.status === 200 && invitationHtml.includes(`Smoke Wedding ${suffix}`),
  );

  const hiddenAddress = `Private address ${suffix}`;
  const privacyUpdate = await host.request(`/api/weddings/${weddingId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: hiddenAddress, publicFields: ["venue"] }),
  });
  check("host can choose which optional invitation details are public", privacyUpdate.status === 200);
  const privateInvitationHtml = await (await fetch(`${base}/invite/${invitationToken}`)).text();
  const privateRsvpHtml = await (await fetch(`${base}/rsvp/${invitationToken}`)).text();
  check("hidden wedding address is absent from invitation HTML and serialized data", !privateInvitationHtml.includes(hiddenAddress));
  check("hidden wedding address is absent from RSVP HTML and serialized data", !privateRsvpHtml.includes(hiddenAddress));
  await host.request(`/api/weddings/${weddingId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: null, publicFields: ["venue", "address", "description", "mapUrl", "coverImageUrl", "couplePhotoUrl"] }),
  });

  const rsvpPage = await fetch(`${base}/rsvp/${invitationToken}`);
  const rsvpHtml = await rsvpPage.text();
  check("public RSVP page renders", rsvpPage.status === 200);
  check("custom question renders on the RSVP form", rsvpHtml.includes("Smoke question"));

  const rsvpMobile = `96${suffix.slice(-8)}`;
  const otpHeaders = { "content-type": "application/json" };
  const phoneRequest = { invitationToken, mobile: rsvpMobile };
  const captchaOrigin = process.env.CAPTCHA_TEST_ORIGIN
  if (!captchaOrigin) throw new Error("Configure CAPTCHA_TEST_ORIGIN for this isolated smoke test")
  const captchaResponse = await fetch(new URL("/captcha-token", captchaOrigin), {
    method: "POST",
    body: new URLSearchParams({ hostname: new URL(base).hostname }),
  })
  const { token: captchaToken } = await captchaResponse.json()
  const sendCode = await guestBrowser.request("/api/rsvp/phone/request", {
    method: "POST",
    headers: otpHeaders,
    body: JSON.stringify({ ...phoneRequest, captchaToken }),
  });
  const { challenge, error: requestError } = await sendCode.json();
  check("guest requests phone verification", sendCode.status === 200 && Boolean(challenge), requestError);

  const verifyCode = await guestBrowser.request("/api/rsvp/phone/verify", {
    method: "POST",
    headers: otpHeaders,
    body: JSON.stringify({
      ...phoneRequest,
      challenge,
      code: process.env.RSVP_OTP_TEST_CODE ?? "123456",
    }),
  });
  const { proof, error: verifyError } = await verifyCode.json();
  check("guest verifies their mobile number", verifyCode.status === 200 && Boolean(proof), verifyError);

  const submitResponse = await guestBrowser.request("/api/rsvp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: invitationToken,
      fullName: "Smoke RSVP",
      mobile: rsvpMobile,
      phoneProof: proof,
      dietaryPrefs: "Vegetarian",
      familyMembers: [{ fullName: "Smoke Plus One", relation: "Spouse", age: "30" }],
      eventResponses: { [event.id]: "yes" },
      answers: [{ questionId: question.id, value: "smoke answer" }],
    }),
  });
  const submitted = await submitResponse.json();
  check(
    "guest can submit an RSVP without signing in",
    submitResponse.status === 201 && Boolean(submitted.editToken),
  );

  const editApiPath = `/api/rsvp/edit?invitationToken=${encodeURIComponent(invitationToken)}&editToken=${encodeURIComponent(submitted.editToken)}`;
  const editLoad = await guestBrowser.request(editApiPath);
  const changedNetwork = await guestBrowser.request(editApiPath, { headers: { "x-forwarded-for": "192.0.2.2" } });
  check("the authorized browser retains RSVP access after an IP change", changedNetwork.status === 200);
  const forwardedEdit = await fetch(`${base}${editApiPath}`);
  check("forwarded edit API link is inaccessible without the guest browser", forwardedEdit.status === 404);
  const editData = await editLoad.json();
  check(
    "edit token loads the RSVP and its answer",
    editLoad.status === 200 &&
      editData.rsvp?.fullName === "Smoke RSVP" &&
      editData.rsvp?.answers?.[0]?.value === "smoke answer",
  );

  const editResponse = await guestBrowser.request("/api/rsvp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: invitationToken,
      fullName: "Smoke RSVP Edited",
      mobile: rsvpMobile,
      dietaryPrefs: "Jain",
      familyMembers: [],
      eventResponses: { [event.id]: "no" },
      answers: [{ questionId: question.id, value: "edited smoke answer" }],
      editToken: submitted.editToken,
    }),
  });
  const edited = await editResponse.json();
  check(
    "guest can edit an RSVP and keeps the same edit token",
    editResponse.status === 201 && edited.editToken === submitted.editToken,
  );

  const editPath = `/rsvp/${invitationToken}/edit?token=${encodeURIComponent(submitted.editToken)}`;
  const editPage = await guestBrowser.request(editPath);
  check("edit page renders in the authorized browser", editPage.status === 200);
  check("forwarded edit page returns 404", (await fetch(`${base}${editPath}`)).status === 404);

  const badEditPage = await guestBrowser.request(`/rsvp/${invitationToken}/edit?token=invalid-token`);
  check("edit page rejects an invalid token", badEditPage.status === 404);

  const reportsPage = await host.request(`/dashboard/weddings/${weddingId}/reports`);
  const reportsHtml = await reportsPage.text();
  check(
    "reports page renders for the wedding",
    reportsPage.status === 200 && reportsHtml.includes(`Reports —`),
  );

  const rsvpExport = await host.request(`/api/weddings/${weddingId}/rsvps/export`);
  const rsvpCsv = await rsvpExport.text();
  check(
    "RSVP CSV export includes the edited response",
    rsvpExport.status === 200 && rsvpCsv.includes("Smoke RSVP Edited"),
  );

  check("RSVP CSV omits phone contacts when wedding privacy hides them", !rsvpCsv.includes(rsvpMobile));

  const guestCsvReport = await host.request(`/api/weddings/${weddingId}/guests/export`);
  check("guest export remains downloadable after edits", guestCsvReport.status === 200);


  // UI navigation: public pages.
  for (const path of ["/", "/faq", "/onboarding", "/auth/register", "/auth/login", "/terms", "/privacy", "/auth/forgot-password"]) {
    const response = await fetch(`${base}${path}`);
    check(`public page renders: ${path}`, response.status === 200);
  }

  // UI navigation: authenticated host pages.
  for (const path of [
    "/dashboard",
    "/dashboard/reports",
    `/dashboard/weddings/${weddingId}`,
    `/dashboard/weddings/${weddingId}/events`,
    `/dashboard/weddings/${weddingId}/guests`,
    `/dashboard/weddings/${weddingId}/reports`,
    `/dashboard/weddings/${weddingId}/invite`,
    `/dashboard/weddings/${weddingId}/questions`,
  ]) {
    const response = await host.request(path);
    check(`host page renders: ${path}`, response.status === 200);
  }

  // Unauthenticated browser navigation to a protected page redirects to login.
  const protectedPage = await fetch(`${base}/dashboard`, { redirect: "manual" });
  check(
    "unauthenticated dashboard navigation redirects to login",
    protectedPage.status === 307 || protectedPage.status === 302 || protectedPage.status === 303,
  );

  // Host workflow: update wedding details.
  const updateWeddingResponse = await host.request(`/api/weddings/${weddingId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: `Smoke Wedding Updated ${suffix}`, venue: "Updated Hall" }),
  });
  const updatedWedding = await updateWeddingResponse.json();
  check("host can update wedding details", updateWeddingResponse.status === 200 && updatedWedding.wedding?.id === weddingId);
  const weddingDetailResponse = await host.request(`/api/weddings/${weddingId}`);
  const weddingDetail = await weddingDetailResponse.json();
  check(
    "wedding update is persisted",
    weddingDetailResponse.status === 200 &&
      weddingDetail.wedding?.name === `Smoke Wedding Updated ${suffix}` &&
      weddingDetail.wedding?.venue === "Updated Hall",
  );

  // Event management: update and delete a temporary event.
  const tempEventResponse = await host.request(`/api/weddings/${weddingId}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Temp Event", order: 9 }),
  });
  const tempEvent = (await tempEventResponse.json()).event;
  check("host can create a temporary event", tempEventResponse.status === 201 && Boolean(tempEvent?.id));
  const updateEventResponse = await host.request(`/api/weddings/${weddingId}/events/${tempEvent?.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Temp Event Updated", venue: "Temp Venue" }),
  });
  const updatedEvent = (await updateEventResponse.json()).event;
  check(
    "host can update an event",
    updateEventResponse.status === 200 && updatedEvent?.name === "Temp Event Updated",
  );
  const deleteEventResponse = await host.request(`/api/weddings/${weddingId}/events/${tempEvent?.id}`, {
    method: "DELETE",
  });
  check("host can delete an event", deleteEventResponse.status === 200);
  const eventsAfterDelete = await host.request(`/api/weddings/${weddingId}/events`);
  const eventsAfterDeleteJson = await eventsAfterDelete.json();
  check(
    "deleted event is removed",
    eventsAfterDelete.status === 200 &&
      !eventsAfterDeleteJson.events?.some((item) => item.id === tempEvent?.id),
  );

  // Custom question management: update and delete a temporary question.
  const tempQuestionResponse = await host.request(`/api/weddings/${weddingId}/questions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "Temp question", type: "text", required: false, order: 2 }),
  });
  const tempQuestion = (await tempQuestionResponse.json()).question;
  check("host can create a temporary question", tempQuestionResponse.status === 201 && Boolean(tempQuestion?.id));
  const updateQuestionResponse = await host.request(`/api/weddings/${weddingId}/questions/${tempQuestion?.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "Temp question updated", required: true }),
  });
  const updatedQuestion = (await updateQuestionResponse.json()).question;
  check(
    "host can update a custom question",
    updateQuestionResponse.status === 200 && updatedQuestion?.question === "Temp question updated",
  );
  const deleteQuestionResponse = await host.request(`/api/weddings/${weddingId}/questions/${tempQuestion?.id}`, {
    method: "DELETE",
  });
  check("host can delete a custom question", deleteQuestionResponse.status === 200);

  // Guest management: delete a temporary guest.
  const tempGuestResponse = await host.request(`/api/weddings/${weddingId}/guests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ firstName: "TempGuest", mobile: `95${suffix.slice(-8)}` }),
  });
  const tempGuest = (await tempGuestResponse.json()).guest;
  check("host can create a temporary guest", tempGuestResponse.status === 201 && Boolean(tempGuest?.id));
  const deleteGuestResponse = await host.request(`/api/weddings/${weddingId}/guests/${tempGuest?.id}`, {
    method: "DELETE",
  });
  check("host can delete a guest", deleteGuestResponse.status === 200);

  // Validation failures.
  const invalidWeddingResponse = await host.request("/api/weddings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  check("wedding creation rejects invalid input", invalidWeddingResponse.status === 400);
  const invalidEventResponse = await host.request(`/api/weddings/${weddingId}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  check("event creation rejects invalid input", invalidEventResponse.status === 400);
  const invalidGuestResponse = await host.request(`/api/weddings/${weddingId}/guests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  check("guest creation rejects invalid input", invalidGuestResponse.status === 400);
  const invalidQuestionResponse = await host.request(`/api/weddings/${weddingId}/questions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  check("question creation rejects invalid input", invalidQuestionResponse.status === 400);
  const invalidQuestionUpdateResponse = await host.request(`/api/weddings/${weddingId}/questions/${question.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "" }),
  });
  check("question update rejects invalid input", invalidQuestionUpdateResponse.status === 400);
  const invalidPublishResponse = await host.request(`/api/weddings/${weddingId}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ published: "yes" }),
  });
  check("publish rejects invalid input", invalidPublishResponse.status === 400);
  const emptyRsvpResponse = await fetch(`${base}/api/rsvp`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "10.1.1.1" },
    body: JSON.stringify({}),
  });
  check("RSVP rejects an empty body", emptyRsvpResponse.status === 400);
  const missingMobileRsvpResponse = await fetch(`${base}/api/rsvp`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "10.1.1.2" },
    body: JSON.stringify({ token: invitationToken, fullName: "No Mobile" }),
  });
  check("RSVP rejects a missing mobile number", missingMobileRsvpResponse.status === 400);
  const unknownTokenRsvpResponse = await fetch(`${base}/api/rsvp/phone/request`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "10.1.1.3" },
    body: JSON.stringify({ invitationToken: "not-a-real-invitation", mobile: "9999999999" }),
  });
  check("phone verification rejects an unknown invitation token", unknownTokenRsvpResponse.status === 404);
  const invalidEditTokenResponse = await guestBrowser.request("/api/rsvp", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "10.1.1.4" },
    body: JSON.stringify({
      token: invitationToken,
      fullName: "Smoke RSVP",
      mobile: rsvpMobile,
      answers: [{ questionId: question.id, value: "smoke answer" }],
      editToken: "definitely-not-a-valid-edit-token",
    }),
  });
  check("RSVP rejects an invalid edit token", invalidEditTokenResponse.status === 404);

  // Past-deadline edge case. The plan limit allows a limited number of
  // weddings, so the deadline is moved on the existing wedding instead of
  // creating a second one.
  const pastDeadlinePatch = await host.request(`/api/weddings/${weddingId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rsvpDeadline: "2020-01-01" }),
  });
  check("host can move the RSVP deadline into the past", pastDeadlinePatch.status === 200);
  const pastRsvpResponse = await guestBrowser.request("/api/rsvp", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "10.1.1.5" },
    body: JSON.stringify({
      token: invitationToken,
      fullName: "Too Late",
      mobile: rsvpMobile,
      phoneProof: proof,
    }),
  });
  const pastRsvp = await pastRsvpResponse.json();
  check("RSVP rejects a submission after the wedding deadline", pastRsvpResponse.status === 400 && /deadline/i.test(pastRsvp.error));
  // Restore the deadline so the remaining checks run against a live wedding.
  await host.request(`/api/weddings/${weddingId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rsvpDeadline: "2027-05-01" }),
  });

  // Event-level deadline edge case.
  const eventDeadlineResponse = await host.request(`/api/weddings/${weddingId}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Past Event",
      rsvpDeadline: "2020-01-01",
      order: 2,
    }),
  });
  const pastEvent = (await eventDeadlineResponse.json()).event;
  check("host can create an event with a past deadline", eventDeadlineResponse.status === 201 && Boolean(pastEvent?.id));
  if (pastEvent?.id) {
    const eventDeadlineRsvpResponse = await guestBrowser.request("/api/rsvp", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.1.1.6" },
      body: JSON.stringify({
        token: invitationToken,
        fullName: "Event Too Late",
        mobile: rsvpMobile,
        phoneProof: proof,
        eventResponses: { [pastEvent.id]: "yes" },
        answers: [{ questionId: question.id, value: "late" }],
      }),
    });
    const eventDeadlineRsvp = await eventDeadlineRsvpResponse.json();
    check("RSVP rejects an event whose deadline has passed", eventDeadlineRsvpResponse.status === 400 && /Past Event/.test(eventDeadlineRsvp.error));
    await host.request(`/api/weddings/${weddingId}/events/${pastEvent.id}`, { method: "DELETE" });
  }

  // Unpublish makes the invitation unavailable.
  const unpublishResponse = await host.request(`/api/weddings/${weddingId}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ published: false }),
  });
  check("host can unpublish the invitation", unpublishResponse.status === 200);
  const unpublishedInvitePage = await fetch(`${base}/invite/${invitationToken}`);
  const unpublishedInviteHtml = await unpublishedInvitePage.text();
  check(
    "unpublished invitation is not available to guests",
    unpublishedInvitePage.status === 200 && unpublishedInviteHtml.includes("no longer active"),
  );
  // Republish for any remaining checks (none after this point, but keeps state clean).
  await host.request(`/api/weddings/${weddingId}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ published: true }),
  });

  // Tenant isolation: a second account must not see or modify this wedding.
  const outsiderEmail = `smoke-outsider-${suffix}@example.com`;
  const registerResponse = await fetch(`${base}/api/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Smoke Outsider", email: outsiderEmail, password: "outsider123", ...policyAcceptance }),
  });
  check("registration creates a workspace-backed account", registerResponse.status === 201);

  const outsider = makeClient();
  check(
    "second account can sign in",
    await login(outsider, outsiderEmail, "outsider123"),
  );
  const crossTenantRead = await outsider.request(`/api/weddings/${weddingId}`);
  check("cross-workspace wedding read returns 404", crossTenantRead.status === 404);
  const crossTenantWrite = await outsider.request(`/api/weddings/${weddingId}/guests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ firstName: "Intruder" }),
  });
  check("cross-workspace guest write is rejected", crossTenantWrite.status === 404);

  const crossTenantEventRead = await outsider.request(`/api/weddings/${weddingId}/events`);
  check("cross-workspace event read returns 404", crossTenantEventRead.status === 404);
  const crossTenantQuestionRead = await outsider.request(`/api/weddings/${weddingId}/questions`);
  check("cross-workspace question read returns 404", crossTenantQuestionRead.status === 404);
  const crossTenantPublish = await outsider.request(`/api/weddings/${weddingId}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ published: true }),
  });
  check("cross-workspace publish is rejected", crossTenantPublish.status === 404);
  const crossTenantGuestExport = await outsider.request(`/api/weddings/${weddingId}/guests/export`);
  check("cross-workspace guest export is rejected", crossTenantGuestExport.status === 404);
  const crossTenantRsvpExport = await outsider.request(`/api/weddings/${weddingId}/rsvps/export`);
  check("cross-workspace RSVP export is rejected", crossTenantRsvpExport.status === 404);
  const crossTenantReportPage = await outsider.request(`/dashboard/weddings/${weddingId}/reports`);
  check("cross-workspace report page is not found", crossTenantReportPage.status === 404);

  // Rate limiting: repeated registration attempts from one IP are throttled.
  let registrationRateLimited = false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const rateLimitResponse = await fetch(`${base}/api/register`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.250.250.250" },
      body: JSON.stringify({}),
    });
    if (attempt === 5 && rateLimitResponse.status === 429) registrationRateLimited = true;
  }
  check("registration rate limit returns 429", registrationRateLimited);

  const unconfirmedDelete = await host.request(`/api/weddings/${weddingId}`, { method: "DELETE" });
  check("wedding deletion requires explicit confirmation", unconfirmedDelete.status === 400);
  const wrongConfirmation = await host.request(`/api/weddings/${weddingId}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmName: "Wrong wedding name" }),
  });
  check("wedding deletion rejects another wedding name", wrongConfirmation.status === 400);
  const deleteResponse = await host.request(`/api/weddings/${weddingId}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmName: `Smoke Wedding Updated ${suffix}` }),
  });
  const deletion = await deleteResponse.json();
  check("host can delete the wedding", deleteResponse.status === 200 && deletion.status === "COMPLETED" && Boolean(deletion.jobId));
  const retriedDelete = await host.request(`/api/weddings/${weddingId}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmName: `Smoke Wedding Updated ${suffix}` }),
  });
  const retriedDeletion = await retriedDelete.json();
  check("confirmed wedding deletion can be retried safely", retriedDelete.status === 200 && retriedDeletion.jobId === deletion.jobId);

  const goneResponse = await host.request(`/api/weddings/${weddingId}`);
  check("deleted wedding is no longer readable", goneResponse.status === 404);

  // Clean up the outsider account and its workspace.
  const outsiderUser = await prisma.user.findUnique({ where: { email: outsiderEmail } });
  if (outsiderUser) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: outsiderUser.id },
    });
    if (membership) {
      await prisma.workspace.deleteMany({ where: { id: membership.workspaceId } });
    }
    await prisma.user.deleteMany({ where: { id: outsiderUser.id } });
  }

  // The wedding relation retains payment history on deletion. Remove the test order.
  await prisma.payment.deleteMany({ where: { id: entitlementFixture.id } });

  console.log(`\n${passed} checks passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.error("\nFailures:");
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
