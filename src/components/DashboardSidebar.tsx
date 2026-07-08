"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { SignOutButton } from "@/components/SignOutButton";

import { DashboardSquare01Icon, UserCircleIcon } from "hugeicons-react";

const NAV_ITEMS = [
  { name: "Events", href: "/events", icon: DashboardSquare01Icon },
  { name: "Account", href: "/account", icon: UserCircleIcon },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface-0 lg:flex lg:min-h-dvh">
      <div className="flex h-20 items-center px-6">
        <Wordmark />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-4 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[14.5px] font-medium transition-all ${
                isActive
                  ? "bg-accent text-white"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <item.icon size={20} className="shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-4">
        <div className="flex items-center gap-3 rounded-xl bg-surface-1 p-3 border border-line/50">
          <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-tr from-accent-strong to-accent-tint flex items-center justify-center text-white font-semibold text-[14px]">
            E
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">User</p>
            <p className="truncate text-[12px] text-ink-soft">Admin</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
