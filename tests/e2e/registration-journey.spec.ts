import { expect, test } from "@playwright/test"

test("registers with explicit policy choices and creates a private draft wedding", async ({ page }) => {
  const suffix = String(Date.now())
  const email = `browser-owner-${suffix}@example.com`
  const password = "test-owner-password-2026"
  const weddingName = `New Owner Wedding ${suffix}`

  await page.goto("/auth/register")
  await page.getByLabel("Full name").fill("New Wedding Owner")
  await page.getByLabel("Email address").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByLabel("Confirm password").fill(password)
  const terms = page.getByRole("checkbox", { name: /I accept the Terms of Service/ })
  const privacy = page.getByRole("checkbox", { name: /I have read the Privacy Notice/ })
  await expect(terms).not.toBeChecked()
  await expect(privacy).not.toBeChecked()
  await terms.check()
  await privacy.check()
  await page.getByRole("button", { name: "Create account", exact: true }).click()
  await expect(page).toHaveURL(/\/auth\/login\?registered=1/)

  await page.getByLabel("Email address").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto("/dashboard/weddings/new")
  await page.getByLabel("Wedding Name", { exact: true }).fill(weddingName)
  await page.getByLabel("First Person Name", { exact: true }).fill("Aarav")
  await page.getByLabel("Wedding Date", { exact: true }).fill("2027-12-10")
  await expect(page.getByLabel("Guest contact visibility")).toHaveValue("hidden")
  await page.getByRole("button", { name: "Create Wedding", exact: true }).click()
  await expect(page.getByRole("heading", { name: weddingName, exact: true })).toBeVisible()
  await expect(page.getByText("Draft", { exact: true })).toBeVisible()
})
