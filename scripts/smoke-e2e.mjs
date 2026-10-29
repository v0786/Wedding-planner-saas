/**
 * Real HTTP end-to-end smoke test.
 *
 * Runs against a production build (`npm run build && npm run start`) and a
 * seeded database. It uses the public HTTP API the same way the browser does,
 * including the Auth.js credentials flow, so it exercises middleware, route
 * handlers, Prisma, validation, CSRF origin checks and tenant isolation.
 *
 * Usage:
 *   npm run start            # in another terminal
 *   npm run test:smoke
 *
 * Override the target with APP_URL.
 */
import { PrismaClient } from "@prisma/client";

const base = (process.env.APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const prisma = new PrismaClient();
const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

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

  const unauthorized = await host.request("/api/weddings");
  check("unauthenticated API request returns 401", unauthorized.status === 401);

  check(
    "demo host can sign in through Auth.js",
    await login(host, "demo@example.com", "demo1234"),
  );

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

  const eventResponse = await host.request(`/api/weddings/${weddingId}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Sangeet", date: "2027-05-31", time: "7:00 PM", order: 1 }),
  });
  const event = (await eventResponse.json()).event;
  check("host can create an event", eventResponse.status === 201 && Boolean(event?.id));

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

  const rsvpPage = await fetch(`${base}/rsvp/${invitationToken}`);
  check("public RSVP page renders", rsvpPage.status === 200);

  const rsvpMobile = `96${suffix.slice(-8)}`;
  const submitResponse = await fetch(`${base}/api/rsvp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: invitationToken,
      fullName: "Smoke RSVP",
      mobile: rsvpMobile,
      dietaryPrefs: "Vegetarian",
      familyMembers: [{ fullName: "Smoke Plus One", relation: "Spouse", age: "30" }],
      eventResponses: { [event.id]: "yes" },
    }),
  });
  const submitted = await submitResponse.json();
  check(
    "guest can submit an RSVP without signing in",
    submitResponse.status === 201 && Boolean(submitted.editToken),
  );

  const editLoad = await fetch(
    `${base}/api/rsvp/edit?invitationToken=${encodeURIComponent(invitationToken)}&editToken=${encodeURIComponent(submitted.editToken)}`,
  );
  const editData = await editLoad.json();
  check(
    "edit token loads the RSVP",
    editLoad.status === 200 && editData.rsvp?.fullName === "Smoke RSVP",
  );

  const editResponse = await fetch(`${base}/api/rsvp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: invitationToken,
      fullName: "Smoke RSVP Edited",
      mobile: rsvpMobile,
      dietaryPrefs: "Jain",
      familyMembers: [],
      eventResponses: { [event.id]: "no" },
      editToken: submitted.editToken,
    }),
  });
  const edited = await editResponse.json();
  check(
    "guest can edit an RSVP and keeps the same edit token",
    editResponse.status === 201 && edited.editToken === submitted.editToken,
  );

  const editPage = await fetch(
    `${base}/rsvp/${invitationToken}/edit?token=${encodeURIComponent(submitted.editToken)}`,
  );
  check("edit page renders for a valid token", editPage.status === 200);

  const badEditPage = await fetch(`${base}/rsvp/${invitationToken}/edit?token=invalid-token`);
  const badEditHtml = await badEditPage.text();
  check(
    "edit page rejects an invalid token",
    badEditPage.status === 200 && badEditHtml.includes("Edit link not valid"),
  );

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

  const guestCsvReport = await host.request(`/api/weddings/${weddingId}/guests/export`);
  check("guest export remains downloadable after edits", guestCsvReport.status === 200);

  // Tenant isolation: a second account must not see or modify this wedding.
  const outsiderEmail = `smoke-outsider-${suffix}@example.com`;
  const registerResponse = await fetch(`${base}/api/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Smoke Outsider", email: outsiderEmail, password: "outsider123" }),
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

  const deleteResponse = await host.request(`/api/weddings/${weddingId}`, { method: "DELETE" });
  check("host can delete the wedding", deleteResponse.status === 200);

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
