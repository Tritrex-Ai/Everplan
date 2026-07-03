"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/time";
import { InviteDialog } from "@/components/InviteDialog";
import type { EventRow } from "@/lib/types";

const TABS = [
  { slug: "", label: "Timeline" },
  { slug: "shots", label: "Shots" },
  { slug: "live", label: "Live" },
];

export function EventHeader({
  event,
  isOwner,
}: {
  event: EventRow;
  isOwner: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const base = `/events/${event.id}`;
  const active =
    TABS.find((t) => t.slug && pathname === `${base}/${t.slug}`)?.slug ?? "";

  async function deleteEvent() {
    if (!confirm(`Delete “${event.title}” and its whole timeline?`)) return;
    const supabase = createClient();
    await supabase.from("events").delete().eq("id", event.id);
    router.push("/events");
    router.refresh();
  }

  return (
    <header className="mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/events" className="text-[13.5px] text-ink-soft hover:text-ink">
            ← My events
          </Link>
          <h1 className="mt-1 truncate text-[20px] font-semibold tracking-tight">
            {event.title}
          </h1>
          <p className="mt-0.5 text-[13.5px] text-ink-soft">
            {formatDate(event.date)}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>

        {isOwner && (
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Event actions"
              className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-surface-2"
            >
              ⋯
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg bg-surface-1 p-1 outline outline-line">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setInviteOpen(true);
                    }}
                    className="block w-full rounded-md px-3 py-2 text-left text-[14px] hover:bg-surface-2"
                  >
                    Invite team member
                  </button>
                  <Link
                    href={`${base}/edit`}
                    onClick={() => setMenuOpen(false)}
                    className="block w-full rounded-md px-3 py-2 text-left text-[14px] hover:bg-surface-2"
                  >
                    Edit event
                  </Link>
                  <button
                    onClick={deleteEvent}
                    className="block w-full rounded-md px-3 py-2 text-left text-[14px] text-danger hover:bg-danger-tint"
                  >
                    Delete event
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <nav className="mt-4 flex gap-1 rounded-lg bg-surface-2 p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.slug}
            href={tab.slug ? `${base}/${tab.slug}` : base}
            className={`flex-1 rounded-md py-2 text-center text-[14px] font-medium transition-colors ${
              active === tab.slug
                ? "bg-surface-1 text-ink"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <InviteDialog
        eventId={event.id}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </header>
  );
}
