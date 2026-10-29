import { test, expect } from "@playwright/test";

const INVITATION_TOKEN = "demo-invitation-token";
const HOST_EMAIL = "demo@example.com";
const HOST_PASSWORD = "demo1234";

test.describe("host dashboard", () => {
  test("signs in and opens the seeded wedding, guests and reports", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel("Email address").fill(HOST_EMAIL);
    await page.getByLabel("Password").fill(HOST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "My Weddings" })).toBeVisible();
    await page.getByRole("link", { name: /Rahul & Priya Wedding/ }).click();

    await expect(page.getByRole("heading", { name: "Rahul & Priya Wedding" })).toBeVisible();
    await expect(page.getByText("Total Guests")).toBeVisible();

    await page.getByRole("link", { name: /Guests \(/ }).click();
    await expect(page.getByRole("heading", { name: /^Guests — / })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();

    await page.getByRole("link", { name: "Back to wedding" }).click();
    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page.getByRole("heading", { name: /^Reports — / })).toBeVisible();
    await expect(page.getByText("Confirmed headcount")).toBeVisible();
  });
});

test.describe("guest RSVP journey", () => {
  test("submits, edits and keeps the edit token working", async ({ page }) => {
    const suffix = `${Date.now()}`.slice(-7);
    const mobile = `9${suffix}000`;
    const originalName = `E2E Guest ${suffix}`;
    const editedName = `E2E Guest Edited ${suffix}`;

    await page.goto(`/rsvp/${INVITATION_TOKEN}`);
    await expect(page.getByRole("heading", { name: /Rahul & Priya Wedding/ })).toBeVisible();

    await page.getByLabel("Full name").fill(originalName);
    await page.getByLabel("Mobile number").fill(mobile);
    await page.getByLabel("Dietary preferences (optional)").fill("Vegetarian");
    await page.getByLabel("Meal preference").selectOption("Vegetarian");
    await page.getByLabel("Attendance for Wedding").selectOption("yes");
    await page.getByRole("button", { name: "Submit RSVP" }).click();

    await expect(page).toHaveURL(/\/rsvp\/thank-you/);
    await expect(page.getByRole("heading", { name: "Thank You!" })).toBeVisible();

    const editLink = page.getByRole("link", { name: "Edit my RSVP" });
    await expect(editLink).toBeVisible();
    const editHref = await editLink.getAttribute("href");
    expect(editHref).toMatch(/\/rsvp\/demo-invitation-token\/edit\?token=/);

    await editLink.click();
    await expect(page.getByRole("heading", { name: "Edit your RSVP" })).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue(originalName);

    await page.getByLabel("Full name").fill(editedName);
    await page.getByRole("button", { name: "Save my RSVP" }).click();

    await expect(page).toHaveURL(/\/rsvp\/thank-you/);
    await expect(page.getByRole("link", { name: "Edit my RSVP" })).toHaveAttribute("href", editHref!);

    // The same link still loads the edited response.
    await page.getByRole("link", { name: "Edit my RSVP" }).click();
    await expect(page.getByRole("heading", { name: "Edit your RSVP" })).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue(editedName);
  });

  test("shows a friendly message for an unknown invitation", async ({ page }) => {
    await page.goto("/rsvp/not-a-real-token");
    await expect(page.getByRole("heading", { name: "RSVP Not Available" })).toBeVisible();
  });
});
