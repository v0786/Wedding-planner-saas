import type { NextResponse } from "next/server"

export const RSVP_BROWSER_COOKIE = "wedding_rsvp_browser"

export type BrowserCookies = {
  get(name: string): { value: string } | undefined
}

export function rsvpBrowserToken(cookies: BrowserCookies) {
  const token = cookies.get(RSVP_BROWSER_COOKIE)?.value
  return token && /^[A-Za-z0-9_-]{32}$/.test(token) ? token : undefined
}

export function setRsvpBrowserCookie(response: NextResponse, token: string) {
  response.cookies.set(RSVP_BROWSER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}
