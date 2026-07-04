import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import { Badge, EmptyState } from "@/components/ui";
import { SignOutButton } from "@/components/SignOutButton";
import { Wordmark } from "@/components/Wordmark";
import type { EventRow } from "@/lib/types";

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });

  const list = (events ?? []) as EventRow[];

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-6">
      <header className="mb-7">
        <div className="mb-5 flex items-center justify-between">
          <Wordmark />
          <SignOutButton />
        </div>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-serif text-[26px] italic leading-none">My events</h1>
          <Link
            href="/events/new"
            className="inline-flex h-9 shrink-0 items-center rounded-md bg-accent px-3.5 text-[14px] font-medium text-white hover:bg-accent-strong"
          >
            + New event
          </Link>
        </div>
      </header>

      {list.length === 0 ? (
        <EmptyState
          title="No events yet"
          body="Create your first wedding or event to start building its timeline and shot list."
          action={
            <Link
              href="/events/new"
              className="inline-flex h-11 items-center rounded-md bg-accent px-5 text-[15px] font-medium text-white hover:bg-accent-strong"
            >
              Create your first event
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {list.map((event) => {
            const isOwner = event.owner_id === user?.id;
            return (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="block rounded-lg bg-surface-1 p-4 transition-colors hover:bg-accent-tint/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold">
                        {event.title}
                      </p>
                      <p className="mt-0.5 truncate text-[13.5px] text-ink-soft">
                        {event.event_type}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge tone="neutral">{formatDate(event.date)}</Badge>
                      {!isOwner && <Badge tone="accent">Team</Badge>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
