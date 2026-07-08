"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
  const [guestToken, setGuestToken] = useState(event.guest_token);
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence-${event.id}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id]);

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

  const actionsNavbar = isOwner ? (
    <nav className="sticky top-0 z-40 flex items-center gap-2 overflow-x-auto border-b border-line bg-surface-0/80 px-5 py-3 backdrop-blur-md lg:px-10 scrollbar-hide">
      <div className="flex items-center gap-2 flex-1">
        {onlineCount > 1 && (
          <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-ok-tint px-2.5 py-1 text-[12px] font-medium text-ok">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
            {onlineCount} viewing
          </span>
        )}
      </div>
      <button
        onClick={() => setInviteOpen(true)}
        className="shrink-0 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-strong shadow-sm"
      >
        Invite team
      </button>
      <button
        onClick={() => setGuestLinkOpen(true)}
        className="shrink-0 rounded-lg bg-surface-2 px-4 py-2 text-[13px] font-medium text-ink hover:bg-surface-3 transition-colors"
      >
        Guest link{guestToken ? " (On)" : ""}
      </button>
      <Link
        href={`${base}/edit`}
        className="shrink-0 rounded-lg bg-surface-2 px-4 py-2 text-[13px] font-medium text-ink hover:bg-surface-3 transition-colors"
      >
        Edit event
      </Link>
      <button
        onClick={deleteEvent}
        className="shrink-0 rounded-lg bg-danger-tint px-4 py-2 text-[13px] font-medium text-danger hover:bg-danger hover:text-white transition-colors"
      >
        Delete
      </button>
    </nav>
  ) : null;

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

      <div className="min-w-0 flex-1 flex flex-col">
        {actionsNavbar}
        <main className="flex-1 px-5 pb-16 pt-6 lg:px-10 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

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
