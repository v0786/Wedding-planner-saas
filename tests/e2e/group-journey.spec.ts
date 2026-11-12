import { expect, test } from "@playwright/test"

test("binds a group invitation to one browser, replaces it, and checks in the group", async ({ page, browser, baseURL }) => {
  await page.goto("/auth/login")
  await page.getByLabel("Email address").fill("demo@example.com")
  await page.getByLabel("Password").fill("demo1234")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.getByRole("link", { name: /Rahul & Priya Wedding/ }).click()
  await page.getByRole("link", { name: "Group Invitations & Check-in" }).click()

  const label = `Browser group ${Date.now()}`
  await page.getByLabel("Guest or group name").fill(label)
  await page.getByRole("button", { name: "Create invitation" }).click()
  const shareField = page.getByRole("textbox", { name: "Private link to share" })
  await expect(shareField).toHaveValue(/\/group-invite\/group_/)
  const original = await shareField.inputValue()

  const firstBrowser = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })
  const secondBrowser = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })
  try {
    const first = await firstBrowser.newPage()
    const second = await secondBrowser.newPage()
    await first.goto(original)
    await first.getByRole("button", { name: "Open invitation" }).click()
    await expect(first.getByRole("img", { name: "Group check-in QR code" })).toBeVisible()

    expect((await second.goto(original))?.status()).toBe(404)
    await firstBrowser.setExtraHTTPHeaders({ "X-Forwarded-For": "192.0.2.42" })
    await first.goto(original)
    await expect(first.getByRole("link", { name: "RSVP now" })).toBeVisible()

    first.once("dialog", dialog => dialog.accept())
    await first.getByRole("button", { name: "Move invitation to another device" }).click()
    const replacementField = first.getByRole("textbox", { name: "New one-time invitation link" })
    await expect(replacementField).toHaveValue(/\/group-invite\/group_/)
    const replacement = await replacementField.inputValue()
    expect(replacement).not.toBe(original)

    expect((await first.goto(original))?.status()).toBe(404)
    await second.goto(replacement)
    await second.getByRole("button", { name: "Open invitation" }).click()
    await expect(second.getByRole("img", { name: "Group check-in QR code" })).toBeVisible()
    expect((await first.goto(replacement))?.status()).toBe(404)

    const manualCode = await second.locator("figcaption code").textContent()
    await page.getByLabel("Manual check-in code").fill(manualCode!)
    await page.getByRole("button", { name: "Check in", exact: true }).first().click()
    await expect(page.getByText(`${label} checked in.`, { exact: true })).toBeVisible()
    await page.getByLabel("Manual check-in code").fill(manualCode!)
    await page.getByRole("button", { name: "Check in", exact: true }).first().click()
    await expect(page.getByText(`${label} is already checked in.`, { exact: true })).toBeVisible()
  } finally {
    await firstBrowser.close()
    await secondBrowser.close()
  }
})

test("reopens a private invitation with saved RSVP changes and moves both links to a new browser", async ({ page, browser, baseURL }) => {
  await page.goto("/auth/login")
  await page.getByLabel("Email address").fill("demo@example.com")
  await page.getByLabel("Password").fill("demo1234")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.getByRole("link", { name: /Rahul & Priya Wedding/ }).click()
  await page.getByRole("link", { name: "Group Invitations & Check-in" }).click()
  await page.getByLabel("Guest or group name").fill(`Saved RSVP group ${Date.now()}`)
  await page.getByRole("button", { name: "Create invitation" }).click()
  const privateLink = page.getByRole("textbox", { name: "Private link to share" })
  await expect(privateLink).toHaveValue(/\/group-invite\/group_/)
  const invitationUrl = await privateLink.inputValue()

  const source = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })
  const target = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })
  try {
    const guest = await source.newPage()
    const moved = await target.newPage()
    await guest.goto(invitationUrl)
    await guest.getByRole("button", { name: "Open invitation" }).click()
    await guest.getByRole("link", { name: "RSVP now" }).click()
    await guest.getByPlaceholder("Your full name").fill("Saved Private Guest")
    await guest.getByPlaceholder("+91 98765 43210").fill(`8${String(Date.now()).slice(-9)}`)
    await guest.getByRole("button", { name: "Send verification code" }).click()
    await guest.getByRole("textbox", { name: "Verification code" }).fill(process.env.RSVP_OTP_TEST_CODE ?? "123456")
    await guest.getByRole("button", { name: "Verify phone" }).click()
    for (let step = 0; step < 3; step += 1) {
      await guest.getByRole("button", { name: "Continue", exact: true }).click()
    }
    await guest.getByRole("combobox", { name: "Meal preference" }).selectOption("Vegetarian")
    await guest.getByRole("button", { name: "Review RSVP" }).click();
    await expect(guest.getByRole("heading", { name: "Review your RSVP" })).toBeVisible();
    await guest.getByRole("button", { name: "Submit RSVP" }).click()
    await expect(guest).toHaveURL(/\/rsvp\/thank-you/)
    const originalEdit = await guest.getByRole("link", { name: "Edit my RSVP" }).getAttribute("href")
    expect(originalEdit).toMatch(/\/rsvp\/rsvp_/)

    await guest.goto(invitationUrl)
    await guest.getByRole("link", { name: "View or edit RSVP" }).click()
    await expect(guest.getByPlaceholder("Your full name")).toHaveValue("Saved Private Guest")
    await guest.getByRole("button", { name: "Create device transfer link" }).click()
    const transfer = guest.getByRole("textbox", { name: "Device transfer link" })
    await expect(transfer).toHaveValue(/\/api\/rsvp\/transfer\?token=/)
    await moved.goto(await transfer.inputValue())
    await moved.getByRole("button", { name: "Open RSVP on this device" }).click()
    await expect(moved.getByPlaceholder("Your full name")).toHaveValue("Saved Private Guest")

    expect((await guest.goto(invitationUrl))?.status()).toBe(404)
    expect((await guest.goto(originalEdit!))?.status()).toBe(404)
    await moved.goto(invitationUrl)
    await moved.getByRole("link", { name: "View or edit RSVP" }).click()
    await expect(moved.getByPlaceholder("Your full name")).toHaveValue("Saved Private Guest")
  } finally {
    await source.close()
    await target.close()
  }
})
