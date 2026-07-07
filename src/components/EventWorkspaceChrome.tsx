"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormattedDate } from "@/components/FormattedTime";
import { InviteDialog } from "@/components/InviteDialog";
import { GuestLinkDialog } from "@/components/GuestLinkDialog";
import { Wordmark } from "@/components/Wordmark";
import type { EventRow } from "@/lib/types";

const TABS = [
  { slug: "", label: "Timeline" },
  { slug: "shots", label: "Shots" },
  { slug: "live", label: "Live" },
];

/** Shared chrome for the event workspace (Timeline/Shots/Edit/Generate) — a
 * sidebar on desktop, the previous compact top-tab bar on mobile/tablet. The
 * Live board is deliberately outside this layout (its own full-bleed dark
 * screen), so "Live" here is always a plain navigation away from it. */
export function EventWorkspaceChrome({
  event,
  isOwner,
  children,
}: {
  event: EventRow;
  isOwner: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [guestLinkOpen, setGuestLinkOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [guestToken, setGuestToken] = useState(event.guest_token);

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

  const menu = (
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
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg bg-surface-1 p-1 outline outline-line">
            <button
              onClick={() => {
                setMenuOpen(false);
                setInviteOpen(true);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-[14px] hover:bg-surface-2"
            >
              Invite team or vendor
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                setGuestLinkOpen(true);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-[14px] hover:bg-surface-2"
            >
              Guest link{guestToken ? " — on" : ""}
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
  );

  return (
    <div className="lg:flex lg:min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 border-line lg:flex lg:w-64 lg:flex-col lg:border-r lg:p-5">
        <Link href="/events" className="mb-7 block">
          <Wordmark />
        </Link>
        <div className="mb-6 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate font-serif text-[19px] italic leading-tight">
              {event.title}
            </h1>
            <p className="mt-0.5 text-[13px] text-ink-soft">
              <FormattedDate date={event.date} />
            </p>
          </div>
          {isOwner && menu}
        </div>
        <nav className="flex flex-col gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.slug}
              href={tab.slug ? `${base}/${tab.slug}` : base}
              className={`rounded-md px-3 py-2 text-[14px] font-medium transition-colors ${
                active === tab.slug
                  ? "bg-accent-tint text-accent-ink"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="px-5 pt-6 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href="/events" className="text-[13.5px] text-ink-soft hover:text-ink">
              ← My events
            </Link>
            <h1 className="mt-1 truncate font-serif text-[22px] italic leading-tight">
              {event.title}
            </h1>
            <p className="mt-0.5 text-[13.5px] text-ink-soft">
              <FormattedDate date={event.date} />
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
          {isOwner && menu}
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
      </header>

      <main className="min-w-0 flex-1 px-5 pb-16 pt-6 lg:px-10 lg:pb-12 lg:pt-8">
        {children}
      </main>

      <InviteDialog
        eventId={event.id}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
      <GuestLinkDialog
        eventId={event.id}
        guestToken={guestToken}
        open={guestLinkOpen}
        onClose={() => setGuestLinkOpen(false)}
        onTokenChange={setGuestToken}
      />
    </div>
  );
}
