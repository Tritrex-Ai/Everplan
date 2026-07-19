"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { splitBoard } from "@/lib/time";
import { FormattedTime } from "@/components/FormattedTime";
import { Button, Modal } from "@/components/ui";
import { Wordmark } from "@/components/Wordmark";
import type { BlockRow } from "@/lib/types";

const REMINDER_WINDOW_MS = 2 * 60 * 1000;

type GuestEvent = { id: string; title: string; date: string; location: string | null };

/* Read-only fork of LiveBoard for the no-login guest link: no shots (never
 * shown to guests), no write controls (RLS blocks the writes anyway; this
 * keeps the UI from offering buttons that can only fail). Same Now/Next/
 * Later visual language and realtime pattern, blocks only. */
export function GuestLiveBoard({
  event,
  initialBlocks,
}: {
  event: GuestEvent;
  initialBlocks: BlockRow[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [now, setNow] = useState(() => new Date());
  const [live, setLive] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`guest-live-${event.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocks", filter: `event_id=eq.${event.id}` },
        (payload) => {
          const row = payload.new as BlockRow;
          if (payload.eventType === "INSERT") {
            if (row.guest_visible) {
              setBlocks((prev) => [...prev, row]);
            }
          } else if (payload.eventType === "UPDATE") {
            setBlocks((prev) => {
              if (row.guest_visible) {
                return prev.some((b) => b.id === row.id)
                  ? prev.map((b) => (b.id === row.id ? row : b))
                  : [...prev, row];
              }
              return prev.filter((b) => b.id !== row.id);
            });
          } else if (payload.eventType === "DELETE") {
            setBlocks((prev) => prev.filter((b) => b.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, event.id]);

  const board = useMemo(() => splitBoard(blocks, now), [blocks, now]);

  const [reminderBlock, setReminderBlock] = useState<BlockRow | null>(null);
  const alertedFor = useRef<string | null>(null);

  useEffect(() => {
    const upcoming = board.next[0];
    if (!upcoming || alertedFor.current === upcoming.id) return;
    const msUntilStart = new Date(upcoming.start_time).getTime() - now.getTime();
    if (msUntilStart > 0 && msUntilStart <= REMINDER_WINDOW_MS) {
      alertedFor.current = upcoming.id;
      queueMicrotask(() => setReminderBlock(upcoming));
    }
  }, [board.next, now]);

  return (
    <div className="board-dark min-h-dvh bg-night-0 text-night-ink">
      <div className="mx-auto w-full max-w-lg px-4 pb-14 pt-4">
        <header className="mb-5 flex items-center justify-between">
          <div className="min-w-0">
            <Wordmark size="md" tone="light" />
            <p className="mt-0.5 truncate text-[13px] text-night-ink-soft">{event.title}</p>
            <p className="font-mono text-[13px] text-night-ink-soft">
              <FormattedTime iso={now.toISOString()} />
            </p>
          </div>
          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${
              live ? "bg-night-2 text-night-ink" : "bg-night-1 text-night-ink-soft"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                live ? "animate-pulse bg-ok" : "bg-night-line"
              }`}
            />
            {live ? "Live" : "Connecting"}
          </span>
        </header>

        {blocks.length === 0 ? (
          <p className="rounded-lg bg-night-1 px-5 py-10 text-center text-[14px] text-night-ink-soft">
            The timeline is not built yet — check back soon.
          </p>
        ) : (
          <div className="space-y-6">
            <GuestSection label="Now" accent>
              {board.current.length === 0 ? (
                <p className="rounded-lg bg-night-1 px-4 py-5 text-center text-[13.5px] text-night-ink-soft">
                  Nothing in progress right now
                </p>
              ) : (
                board.current.map((block) => <GuestNowCard key={block.id} block={block} />)
              )}
            </GuestSection>

            {board.next.length > 0 && (
              <GuestSection label="Next">
                {board.next.map((block) => (
                  <GuestQueueCard key={block.id} block={block} emphasized />
                ))}
              </GuestSection>
            )}

            {board.later.length > 0 && (
              <GuestSection label="Later">
                {board.later.map((block) => (
                  <GuestQueueCard key={block.id} block={block} />
                ))}
              </GuestSection>
            )}
          </div>
        )}
      </div>

      <Modal
        open={reminderBlock !== null}
        onClose={() => setReminderBlock(null)}
        title="Starting soon"
      >
        {reminderBlock && (
          <div>
            <p className="text-[19px] font-semibold">{reminderBlock.title}</p>
            <p className="mt-1 text-[14px] text-ink-soft">
              Starts at <FormattedTime iso={reminderBlock.start_time} />
              {reminderBlock.location ? ` · ${reminderBlock.location}` : ""}
            </p>
            <Button onClick={() => setReminderBlock(null)} className="mt-4 w-full">
              Got it
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function GuestSection({
  label,
  accent = false,
  children,
}: {
  label: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p
        className={`mb-2 px-1 text-[12px] font-bold uppercase tracking-[0.12em] ${
          accent ? "text-night-accent" : "text-night-ink-soft"
        }`}
      >
        {label}
      </p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function GuestNowCard({ block }: { block: BlockRow }) {
  return (
    <div className="rounded-xl bg-night-1 p-4">
      <p className="font-mono text-[13px] font-medium text-night-accent">
        <FormattedTime iso={block.start_time} /> – <FormattedTime iso={block.end_time} />
      </p>
      <h2 className="mt-0.5 text-[19px] font-bold leading-snug">{block.title}</h2>
      {block.location && (
        <p className="mt-0.5 text-[13.5px] text-night-ink-soft">{block.location}</p>
      )}
      {block.status === "late" && (
        <span className="mt-2 inline-block rounded-full bg-warn-tint px-2.5 py-1 text-[12px] font-semibold text-warn-ink">
          Running late
        </span>
      )}
    </div>
  );
}

function GuestQueueCard({
  block,
  emphasized = false,
}: {
  block: BlockRow;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 ${
        emphasized ? "bg-night-1" : "bg-night-1/55"
      }`}
    >
      <div className="min-w-0">
        <p className={`truncate text-[15px] font-semibold ${emphasized ? "" : "text-night-ink-soft"}`}>
          {block.title}
        </p>
        {block.location && (
          <p className="truncate text-[12.5px] text-night-ink-soft">{block.location}</p>
        )}
      </div>
      <span className="shrink-0 font-mono text-[13px] text-night-ink-soft">
        <FormattedTime iso={block.start_time} />
      </span>
    </div>
  );
}
