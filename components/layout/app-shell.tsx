"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "./sidebar";

/**
 * Host application shell.
 *
 * Desktop keeps a persistent editorial sidebar; mobile uses a top bar and a
 * slide-over drawer so the navigation never covers the content.
 */
export default function AppShell({
  email,
  children,
}: {
  email?: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Close the drawer when the viewport grows past the mobile breakpoint.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const handle = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    media.addEventListener("change", handle);
    return () => media.removeEventListener("change", handle);
  }, []);

  // Prevent background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-ivory-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-ivory-300/70 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-ivory-300/70 bg-ivory-50/90 backdrop-blur-lg lg:hidden">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-ivory-300 bg-white text-ink-600 shadow-soft transition-colors hover:text-ink-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-sheen text-sm font-semibold text-white shadow-glow">
              W
            </span>
            <span className="font-display text-base text-ink-800">Wedding Guest Planner</span>
          </Link>

          <span className="h-10 w-10" aria-hidden="true" />
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-ink-900/30 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] border-r border-ivory-300/70 shadow-lift transition-transform duration-300 ease-refined ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-end px-4 pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ivory-200 hover:text-ink-800"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="h-[calc(100%-3.25rem)]">
            <Sidebar onNavigate={() => setOpen(false)} variant="drawer" />
          </div>
        </div>
      </div>

      <div className="lg:pl-72">
        {email ? (
          <div className="hidden border-b border-ivory-200/70 bg-white/50 lg:block">
            <div className="mx-auto flex max-w-6xl items-center justify-end px-6 py-2 text-xs text-ink-400 lg:px-10">
              Signed in as <span className="ml-1 font-medium text-ink-600">{email}</span>
            </div>
          </div>
        ) : null}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">{children}</main>
      </div>
    </div>
  );
}
