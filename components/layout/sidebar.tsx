"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./sign-out-button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    title: "Celebration",
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        exact: true,
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75 12 3l8.25 6.75V19.5A1.5 1.5 0 0 1 18.75 21h-13.5A1.5 1.5 0 0 1 3.75 19.5V9.75Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 21v-6h6v6" />
          </svg>
        ),
      },
      {
        label: "Weddings",
        href: "/dashboard/weddings/new",
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7.5-4.35-9.33-8.36A5.42 5.42 0 0 1 12 6.1a5.42 5.42 0 0 1 9.33 6.54C19.5 16.65 12 21 12 21Z" />
          </svg>
        ),
      },
      {
        label: "Reports",
        href: "/dashboard/reports",
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15M7.5 16V9m4.5 7V4.5m4.5 11.5v-5" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        label: "Billing",
        href: "/dashboard/billing",
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
          </svg>
        ),
      },
      {
        label: "Pricing",
        href: "/pricing",
        icon: (
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 1.5 1.5" />
          </svg>
        ),
      },
    ],
  },
];

function Monogram() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-sheen text-base font-semibold text-white shadow-glow">
      W
    </span>
  );
}

export default function Sidebar({
  onNavigate,
  variant = "desktop",
}: {
  onNavigate?: () => void;
  variant?: "desktop" | "drawer";
}) {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    if (item.href === "/dashboard/weddings/new") return pathname.startsWith("/dashboard/weddings");
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex h-full flex-col bg-ivory-100/90 backdrop-blur-xl" data-variant={variant}>
      <div className="flex items-center gap-3 px-6 pb-6 pt-7">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
          <Monogram />
          <span className="font-display text-lg leading-tight text-ink-800">
            Wedding Guest
            <span className="block text-[0.7rem] font-sans uppercase tracking-[0.24em] text-gold-600">
              Planner
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-4 pb-6" aria-label="Main navigation">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-ink-300">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-refined ${
                        active
                          ? "bg-white text-ink-800 shadow-soft"
                          : "text-ink-500 hover:bg-white/70 hover:text-ink-800"
                      }`}
                    >
                      {active ? (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gold-500" />
                      ) : null}
                      <span
                        className={`shrink-0 transition-colors ${
                          active ? "text-gold-600" : "text-ink-300 group-hover:text-gold-500"
                        }`}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-ivory-300/70 p-4">
        <div className="rounded-xl border border-champagne-200 bg-white/80 p-4">
          <p className="font-display text-base text-ink-800">Need a hand?</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-400">
            Our wedding-day playbook answers the questions couples ask most.
          </p>
          <Link
            href="/faq"
            onClick={onNavigate}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-600 transition-colors hover:text-gold-700"
          >
            Open the FAQ
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
