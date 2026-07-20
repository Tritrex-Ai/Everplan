"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormattedDate } from "@/components/FormattedTime";
import { InviteDialog } from "@/components/InviteDialog";
import { GuestLinkDialog } from "@/components/GuestLinkDialog";
import { AccountMenu } from "@/components/AccountMenu";
import { Wordmark } from "@/components/Wordmark";
import { Select } from "@/components/ui";
import {
  Calendar01Icon,
  Camera01Icon,
  Activity01Icon,
  UserAdd01Icon,
  Link01Icon,
  Edit01Icon,
  Delete02Icon,
  Share01Icon,
} from "hugeicons-react";
import type { EventRow } from "@/lib/types";

const TABS = [
  { slug: "", label: "Timeline" },
  { slug: "shots", label: "Shots" },
  { slug: "live", label: "Live" },
];

const TAB_ICONS: Record<string, React.ElementType> = {
  "": Calendar01Icon,
  "shots": Camera01Icon,
  "live": Activity01Icon,
};

const PREVIEW_LABELS: Record<string, string> = {
  team: "Team",
  readonly: "Read-only",
};

/** Shared chrome for the event workspace (Timeline/Shots/Edit/Generate) — a
 * sidebar on desktop, the previous compact top-tab bar on mobile/tablet. The
 * Live board is deliberately outside this layout (its own full-bleed dark
 * screen), so "Live" here is always a plain navigation away from it. */
export function EventWorkspaceChrome({
  event,
  isOwner,
  fullName,
  email,
  children,
}: {
  event: EventRow;
  isOwner: boolean;
  fullName: string | null;
  email: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [guestLinkOpen, setGuestLinkOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [guestToken, setGuestToken] = useState(event.guest_token);
  const [onlineCount, setOnlineCount] = useState(1);

  // Owner-only "master view": simulate how Team or Read-only would render
  // this workspace without actually switching accounts. The underlying data
  // fetch is still the real owner's (RLS still returns everything); child
  // components filter/hide based on this, not a real permission change.
  const previewAsRaw = searchParams.get("previewAs");
  const previewAs = isOwner && (previewAsRaw === "team" || previewAsRaw === "readonly")
    ? previewAsRaw
    : null;

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

  const previewSuffix = previewAs ? `?previewAs=${previewAs}` : "";

  function setPreview(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("previewAs", value);
    else params.delete("previewAs");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  async function deleteEvent() {
    if (!confirm(`Delete “${event.title}” and its whole timeline?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) {
      alert("Couldn't delete this event — please try again.");
      return;
    }
    router.push("/events");
    router.refresh();
  }

  const previewControl = isOwner ? (
    <Select
      value={previewAs ?? ""}
      onChange={(e) => setPreview(e.target.value)}
      className="!h-8 !w-auto shrink-0 !text-[12.5px]"
      aria-label="Preview as"
    >
      <option value="">Preview as…</option>
      <option value="team">Team</option>
      <option value="readonly">Read-only</option>
    </Select>
  ) : null;

  const actionsNavbar = isOwner && !previewAs ? (
    <nav className="sticky top-0 z-40 hidden lg:flex items-center gap-2 overflow-x-auto border-b border-line bg-surface-0/80 px-5 py-3 backdrop-blur-md lg:px-10 scrollbar-hide">
      <div className="flex items-center gap-2 flex-1">
        {onlineCount > 1 && (
          <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-ok-tint px-2.5 py-1 text-[12px] font-medium text-ok">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
            {onlineCount} viewing
          </span>
        )}
      </div>
      {previewControl}
      <button
        onClick={() => setInviteOpen(true)}
        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-strong shadow-[0_2px_10px_rgba(110,40,210,0.2)] transition-all"
      >
        <UserAdd01Icon size={16} />
        Invite team
      </button>
      <button
        onClick={() => setGuestLinkOpen(true)}
        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-surface-2 px-4 py-2 text-[13px] font-medium text-ink hover:bg-surface-3 transition-colors"
      >
        <Link01Icon size={16} className="text-ink-soft" />
        Guest link{guestToken ? " (On)" : ""}
      </button>
      <Link
        href={`${base}/edit`}
        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-surface-2 px-4 py-2 text-[13px] font-medium text-ink hover:bg-surface-3 transition-colors"
      >
        <Edit01Icon size={16} className="text-ink-soft" />
        Edit event
      </Link>
      <button
        onClick={deleteEvent}
        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-danger-tint px-4 py-2 text-[13px] font-medium text-danger hover:bg-danger hover:text-white transition-colors"
      >
        <Delete02Icon size={16} />
        Delete
      </button>
    </nav>
  ) : null;

  const previewBanner = previewAs ? (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-accent px-5 py-2.5 text-white lg:px-10">
      <p className="text-[13px] font-medium">
        Previewing as {PREVIEW_LABELS[previewAs]} — this is a simulation, your owner access is unchanged.
      </p>
      <button
        onClick={() => setPreview("")}
        className="shrink-0 rounded-md bg-white/15 px-3 py-1 text-[12.5px] font-semibold hover:bg-white/25"
      >
        Exit preview
      </button>
    </div>
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
            <h1 className="truncate font-sans text-[13px] font-bold tracking-widest uppercase text-ink mt-1">
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
              href={`${tab.slug ? `${base}/${tab.slug}` : base}${previewSuffix}`}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[14px] font-medium transition-colors ${
                active === tab.slug
                  ? "bg-accent-tint text-accent-ink"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {(() => {
                const Icon = TAB_ICONS[tab.slug];
                return Icon ? <Icon size={18} className={active === tab.slug ? "text-accent" : "text-ink-faint"} /> : null;
              })()}
              {tab.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-5">
          <AccountMenu fullName={fullName} email={email} />
        </div>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="px-5 pt-6 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href="/events" className="text-[13.5px] text-ink-soft hover:text-ink">
              ← My events
            </Link>
            <h1 className="mt-2 truncate font-sans text-[13px] font-bold tracking-widest uppercase text-ink">
              {event.title}
            </h1>
            <p className="mt-0.5 text-[13.5px] text-ink-soft">
              <FormattedDate date={event.date} />
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
          <AccountMenu fullName={fullName} email={email} compact />
        </div>

        {isOwner && (
          <div className="mt-3 flex items-center justify-end gap-2">
            {previewControl}
            <button 
              onClick={() => setOptionsOpen(true)} 
              className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-2 text-ink hover:bg-surface-3 transition-colors"
              aria-label="Event options"
            >
              <Share01Icon size={16} />
            </button>
          </div>
        )}

        <nav className="mt-4 flex gap-1 rounded-lg bg-surface-2 p-1">
          {TABS.map((tab) => (
            <Link
              key={tab.slug}
              href={`${tab.slug ? `${base}/${tab.slug}` : base}${previewSuffix}`}
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
        {previewBanner}
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
      {/* Mobile Options Bottom Sheet */}
      {optionsOpen && isOwner && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-ink/40 lg:hidden" onClick={() => setOptionsOpen(false)}>
          <div 
            className="w-full rounded-t-[24px] bg-surface-1 p-5 pb-8 shadow-xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-ink">Event Options</h3>
              <button onClick={() => setOptionsOpen(false)} className="text-[14px] font-medium text-ink-soft hover:text-ink">Cancel</button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setOptionsOpen(false); setInviteOpen(true); }}
                className="flex w-full items-center gap-3 rounded-xl bg-accent px-4 py-3.5 text-[15px] font-semibold text-white hover:bg-accent-strong"
              >
                <UserAdd01Icon size={20} /> Invite team
              </button>
              <button
                onClick={() => { setOptionsOpen(false); setGuestLinkOpen(true); }}
                className="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-4 py-3.5 text-[15px] font-medium text-ink hover:bg-surface-3"
              >
                <Link01Icon size={20} className="text-ink-soft" /> Guest link{guestToken ? " (On)" : ""}
              </button>
              <Link
                href={`${base}/edit`}
                onClick={() => setOptionsOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-4 py-3.5 text-[15px] font-medium text-ink hover:bg-surface-3"
              >
                <Edit01Icon size={20} className="text-ink-soft" /> Edit event
              </Link>
              <button
                onClick={() => { setOptionsOpen(false); deleteEvent(); }}
                className="flex w-full items-center gap-3 rounded-xl bg-danger-tint px-4 py-3.5 text-[15px] font-medium text-danger hover:bg-danger hover:text-white"
              >
                <Delete02Icon size={20} /> Delete event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
