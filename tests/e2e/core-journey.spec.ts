import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const INVITATION_TOKEN = "demo-invitation-token";
const HOST_EMAIL = "demo@example.com";
const HOST_PASSWORD = "demo1234";

async function advanceToQuestions(page: Page) {
  const next = page.getByRole("button", { name: "Continue", exact: true });
  await next.click();
  await expect(page.getByRole("heading", { name: "Which events will you attend?" })).toBeVisible();
  await page.getByText("✓ Yes", { exact: true }).first().click();
  await next.click();
  await expect(page.getByRole("heading", { name: "Family Members" })).toBeVisible();
  await next.click();
  await expect(page.getByRole("heading", { name: "A few questions" })).toBeVisible();
}

test.describe("host dashboard", () => {
  test("signs in and opens the seeded wedding, guests and reports", async ({ page }) => {
    const database = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
    if (!["127.0.0.1", "localhost", "[::1]"].includes(database.hostname) ||
        !database.pathname.endsWith("_test")) {
      throw new Error("Run browser fixtures against a local *_test database.");
    }
    const db = new PrismaClient();
    let paymentId: string | undefined;

    try {
      const wedding = await db.wedding.findUniqueOrThrow({ where: { invitationToken: INVITATION_TOKEN } });
      const plan = await db.plan.findUniqueOrThrow({ where: { code: "PRO" } });
      const payment = await db.payment.create({
        data: {
          workspaceId: wedding.workspaceId,
          weddingId: wedding.id,
          planId: plan.id,
          planCode: plan.code,
          provider: "test-fixture",
          providerOrderId: `browser_${Date.now()}`,
          amountInPaise: 100,
          weddingPlanPriceInPaise: 100,
          billingPeriodDays: 0,
          status: "PAID",
          paidAt: new Date(),
        },
      });
      paymentId = payment.id;

      await page.goto("/auth/login");
      await page.getByLabel("Email address").fill(HOST_EMAIL);
      await page.getByLabel("Password").fill(HOST_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByRole("heading", { name: "Your Weddings" })).toBeVisible();
      await page.getByRole("link", { name: /View All Weddings/ }).click();
      await expect(page).toHaveURL(/\/dashboard\/weddings$/);
      await page.getByRole("link", { name: /Rahul & Priya Wedding/ }).click();

      await expect(page.getByRole("heading", { name: "Rahul & Priya Wedding" })).toBeVisible();
      await expect(page.getByText("Total Guests")).toBeVisible();
      const weddingPath = new URL(page.url()).pathname;

      await page.getByRole("link", { name: /Guests \(/ }).click();
      await expect(page.getByRole("heading", { name: /^Guests — / })).toBeVisible();
      await expect(page.getByRole("table")).toBeVisible();

      await page.getByRole("link", { name: /Back to wedding/ }).click();
      await page.locator(`a[href="${weddingPath}/reports"]`).click();
      await expect(page.getByRole("heading", { name: /^Reports — / })).toBeVisible();
      await expect(page.getByRole("paragraph").filter({ hasText: /^Confirmed headcount$/ })).toBeVisible();

      await page.goto(`${weddingPath}/invite/print`);
      await expect(page.getByRole("heading", { name: "Rahul & Priya", exact: true })).toBeVisible();
      const pngDownload = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download PNG", exact: true }).click();
      const download = await pngDownload;
      expect(await download.failure()).toBeNull();
      expect(download.suggestedFilename()).toMatch(/-invitation\.png$/);
      const png = await readFile((await download.path())!);
      expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    } finally {
      try {
        if (paymentId) await db.payment.deleteMany({ where: { id: paymentId } });
      } finally {
        await db.$disconnect();
      }
    }
  });
});

test.describe("guest RSVP journey", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("saves changes, rejects a forwarded edit link, and transfers access once", async ({ page, browser, baseURL }) => {
    const suffix = String(Date.now()).slice(-9);
    const originalName = `E2E Guest ${suffix}`;
    const editedName = `E2E Guest Edited ${suffix}`;
    const fullName = page.getByPlaceholder("Your full name");

    await page.goto(`/rsvp/${INVITATION_TOKEN}`);
    await expect(page.getByRole("heading", { name: "Tell us about yourself" })).toBeVisible();
    await expect(page.getByText("Rahul & Priya Wedding", { exact: true })).toBeVisible();

    await fullName.fill(originalName);
    await page.getByPlaceholder("+91 98765 43210").fill(`9${suffix}`);
    await page.getByPlaceholder(/Vegetarian, Jain, No nuts/).fill("Vegetarian");
    await page.getByRole("button", { name: "Send verification code" }).click();
    await page.getByRole("textbox", { name: "Verification code" }).fill(process.env.RSVP_OTP_TEST_CODE ?? "123456");
    await page.getByRole("button", { name: "Verify phone" }).click();
    await advanceToQuestions(page);
    await page.getByRole("combobox", { name: "Meal preference" }).selectOption("Vegetarian");
    await page.getByRole("button", { name: "Review RSVP" }).click();
    await expect(page.getByRole("heading", { name: "Review your RSVP" })).toBeVisible();
    await page.getByRole("button", { name: "Submit RSVP" }).click();

    await expect(page).toHaveURL(/\/rsvp\/thank-you/);
    await expect(page.getByRole("heading", { name: "Thank you", exact: true })).toBeVisible();

    const editLink = page.getByRole("link", { name: "Edit my RSVP" });
    await expect(editLink).toHaveAttribute("href", /\/rsvp\/demo-invitation-token\/edit\?token=/);
    const editHref = (await editLink.getAttribute("href"))!;

    await editLink.click();
    await expect(fullName).toHaveValue(originalName);
    await fullName.fill(editedName);
    await advanceToQuestions(page);
    await expect(page.getByRole("combobox", { name: "Meal preference" })).toHaveValue("Vegetarian");
    await page.getByRole("button", { name: "Review RSVP" }).click();
    await expect(page.getByRole("heading", { name: "Review your RSVP" })).toBeVisible();
    await page.getByRole("button", { name: "Save my RSVP" }).click();

    await expect(page).toHaveURL(/\/rsvp\/thank-you/);
    await expect(editLink).toHaveAttribute("href", editHref);

    const otherDevice = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
    try {
      const otherPage = await otherDevice.newPage();
      const denied = await otherPage.goto(editHref);
      expect(denied?.status()).toBe(404);
      await expect(otherPage.getByRole("heading", { name: "Page not found" })).toBeVisible();

      await editLink.click();
      await expect(fullName).toHaveValue(editedName);
      await page.getByRole("button", { name: "Create device transfer link" }).click();
      const link = page.getByRole("textbox", { name: "Device transfer link" });
      await expect(link).toHaveValue(/\/api\/rsvp\/transfer\?token=/);
      const transferUrl = await link.inputValue();

      await otherPage.goto(transferUrl);
      const confirmTransfer = otherPage.getByRole("button", { name: "Open RSVP on this device" });
      await expect(confirmTransfer).toBeVisible();
      await page.reload();
      await expect(fullName).toHaveValue(editedName);
      await confirmTransfer.click();
      await expect(otherPage).toHaveURL(/\/rsvp\/demo-invitation-token\/edit\?token=/);
      await expect(otherPage.getByPlaceholder("Your full name")).toHaveValue(editedName);
      expect(new URL(otherPage.url()).pathname + new URL(otherPage.url()).search).not.toBe(editHref);

      expect((await page.goto(editHref))?.status()).toBe(404);
      expect((await page.goto(transferUrl))?.status()).toBe(404);
    } finally {
      await otherDevice.close();
    }
  });

  test("shows a friendly message for an unknown invitation", async ({ page }) => {
    await page.goto("/rsvp/not-a-real-token");
    await expect(page.getByRole("heading", { name: /RSVP not available/i })).toBeVisible();
  });
});
