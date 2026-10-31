"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border border-ivory-400 bg-white px-4 py-1.5 text-xs font-medium text-ink-600 shadow-soft transition-all duration-200 ease-refined hover:border-gold-300 hover:text-ink-800"
    >
      Sign out
    </button>
  );
}
