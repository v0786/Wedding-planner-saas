import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "Wedding Guest Planner",
    template: "%s · Wedding Guest Planner",
  },
  description:
    "Plan your wedding, organise your guests and collect RSVPs — one shared invitation link, event-wise tracking and live headcount reports.",
  applicationName: "Wedding Guest Planner",
};

export const viewport: Viewport = {
  themeColor: "#FDFCF9",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen bg-ivory-50 text-ink-800 antialiased">{children}</body>
    </html>
  );
}
