import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Wedding Guest Manager",
  description: "Plan your guest list, events, and RSVPs in one calm workspace.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
