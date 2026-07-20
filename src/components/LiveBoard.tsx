"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { splitBoard } from "@/lib/time";
import { FormattedTime } from "@/components/FormattedTime";
import { Button, Modal } from "@/components/ui";
import type { ViewerRole } from "@/lib/roles";
import type { BlockRow, EventRow, ShotRow } from "@/lib/types";

const REMINDER_WINDOW_MS = 2 * 60 * 1000;

/* The screen that matters: glanceable on a phone, in hand, on the move.
   Runs on the dark ramp; realtime keeps every device within a couple of
   seconds of each other. */

export function LiveBoard({
  event,
  initialBlocks,
  initialShots,
  userId,
  viewerRole,
  isPreview = false,
}: {
  event: EventRow;
  initialBlocks: BlockRow[];
  initialShots: ShotRow[];
  userId: string;
  viewerRole: ViewerRole;
  isPreview?: boolean;
}) {
  const canWrite = viewerRole !== "readonly";
  const supabase = useMemo(() => createClient(), []);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [shots, setShots] = useState(initialShots);
  const [now, setNow] = useState(() => new Date());
  const [live, setLive] = useState(false);

  // clock ticker — the board is driven by time of day
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  // realtime: any change to this event's blocks/shots lands here (RLS applies,
  // so a team member never receives private-shot payloads)
  useEffect(() => {
    const channel = supabase
      .channel(`live-${event.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocks", filter: `event_id=eq.${event.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setBlocks((prev) => [...prev, payload.new as BlockRow]);
          } else if (payload.eventType === "UPDATE") {
            setBlocks((prev) =>
              prev.map((b) => (b.id === (payload.new as BlockRow).id ? (payload.new as BlockRow) : b))
            );
          } else if (payload.eventType === "DELETE") {
            setBlocks((prev) => prev.filter((b) => b.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shots", filter: `event_id=eq.${event.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setShots((prev) =>
              prev.some((s) => s.id === (payload.new as ShotRow).id)
                ? prev
                : [...prev, payload.new as ShotRow]
            );
          } else if (payload.eventType === "UPDATE") {
            setShots((prev) =>
              prev.map((s) => (s.id === (payload.new as ShotRow).id ? (payload.new as ShotRow) : s))
            );
          } else if (payload.eventType === "DELETE") {
            setShots((prev) => prev.filter((s) => s.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, event.id]);

  // Fallback: poll every 10 seconds if realtime isn't active (e.g., replication disabled)
  useEffect(() => {
    if (live) return;
    const t = setInterval(async () => {
      const { data: b } = await supabase.from("blocks").select("*").eq("event_id", event.id);
      const { data: s } = await supabase.from("shots").select("*").eq("event_id", event.id);
      if (b) setBlocks(b);
      if (s) setShots(s);
    }, 10_000);
    return () => clearInterval(t);
  }, [live, event.id, supabase]);

  const board = useMemo(() => splitBoard(blocks, now), [blocks, now]);

  // Same client-side-filter pattern as ShotsPanel: real non-owner fetches
  // are already RLS-scoped, but an owner's "preview as" simulation fetches
  // everything and needs this to render like the simulated role would see —
  // and a simulation has no real person behind it, so "own shots" doesn't
  // apply; only what's actually shared should show.
  const visibleShots = useMemo(
    () =>
      viewerRole === "owner"
        ? shots
        : shots.filter((s) =>
            isPreview
              ? s.visibility === "shared"
              : s.created_by === userId || s.visibility === "shared"
          ),
    [shots, viewerRole, userId, isPreview]
  );

  const shotsByBlock = useMemo(() => {
    const map = new Map<string, ShotRow[]>();
    for (const s of visibleShots) map.set(s.block_id, [...(map.get(s.block_id) ?? []), s]);
    return map;
  }, [visibleShots]);

  // "Starting soon" reminder: fires once per block, the moment it comes
  // within REMINDER_WINDOW_MS of its start. alertedFor is never cleared on
  // close, so the same block can't reopen it later — only a genuinely
  // different "next" block (a different id) can trigger it again.
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

  const [actionError, setActionError] = useState<string | null>(null);

  async function setBlockStatus(block: BlockRow, status: BlockRow["status"]) {
    const previousStatus = block.status;
    setActionError(null);
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, status } : b)));
    const { error } = await supabase.from("blocks").update({ status }).eq("id", block.id);
    if (error) {
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, status: previousStatus } : b))
      );
      setActionError("Couldn't update that block — please try again.");
    }
  }

  async function toggleShot(shot: ShotRow) {
    const captured = shot.status !== "captured";
    const patch = captured
      ? { status: "captured", captured_by: userId, captured_at: new Date().toISOString() }
      : { status: "planned", captured_by: null, captured_at: null };
    setActionError(null);
    setShots((prev) =>
      prev.map((s) => (s.id === shot.id ? ({ ...s, ...patch } as ShotRow) : s))
    );
    const { error } = await supabase.from("shots").update(patch).eq("id", shot.id);
    if (error) {
      setShots((prev) => (prev.map((s) => (s.id === shot.id ? shot : s))));
      setActionError("Couldn't update that shot — please try again.");
    }
  }

  return (
    <div className="board-dark min-h-dvh bg-night-0 text-night-ink">
      <div className="mx-auto w-full max-w-lg px-4 pb-14 pt-4">
        <header className="mb-5 flex items-center justify-between">
          <div className="min-w-0">
            <Link
              href={`/events/${event.id}`}
              className="text-[13px] text-night-ink-soft hover:text-night-ink"
            >
              ← {event.title}
            </Link>
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

        {actionError && (
          <p className="mb-4 rounded-md bg-warn-tint px-3 py-2 text-[13px] text-warn-ink">
            {actionError}
          </p>
        )}

        {blocks.length === 0 ? (
          <p className="rounded-lg bg-night-1 px-5 py-10 text-center text-[14px] text-night-ink-soft">
            No timeline yet — build it on the Timeline tab first.
          </p>
        ) : (
          <div className="space-y-6">
            <BoardSection label="Now" accent>
              {board.current.length === 0 ? (
                <p className="rounded-lg bg-night-1 px-4 py-5 text-center text-[13.5px] text-night-ink-soft">
                  Nothing in progress right now
                </p>
              ) : (
                board.current.map((block) => (
                  <NowCard
                    key={block.id}
                    block={block}
                    shots={shotsByBlock.get(block.id) ?? []}
                    onStatus={setBlockStatus}
                    onToggleShot={toggleShot}
                    canWrite={canWrite}
                  />
                ))
              )}
            </BoardSection>

            {board.next.length > 0 && (
              <BoardSection label="Next">
                {board.next.map((block) => (
                  <QueueCard key={block.id} block={block} emphasized
                    shotCount={(shotsByBlock.get(block.id) ?? []).length}
                  />
                ))}
              </BoardSection>
            )}

            {board.later.length > 0 && (
              <BoardSection label="Later">
                {board.later.map((block) => (
                  <QueueCard key={block.id} block={block}
                    shotCount={(shotsByBlock.get(block.id) ?? []).length}
                  />
                ))}
              </BoardSection>
            )}

            {board.past.length > 0 && (
              <BoardSection label="Done / passed">
                {board.past.map((block) => (
                  <PastCard key={block.id} block={block} onStatus={setBlockStatus} canWrite={canWrite} />
                ))}
              </BoardSection>
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

function BoardSection({
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

function NowCard({
  block,
  shots,
  onStatus,
  onToggleShot,
  canWrite,
}: {
  block: BlockRow;
  shots: ShotRow[];
  onStatus: (b: BlockRow, s: BlockRow["status"]) => void;
  onToggleShot: (s: ShotRow) => void;
  canWrite: boolean;
}) {
  const captured = shots.filter((s) => s.status === "captured").length;

  return (
    <div className="rounded-xl bg-night-1 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[13px] font-medium text-night-accent">
            <FormattedTime iso={block.start_time} /> – <FormattedTime iso={block.end_time} />
          </p>
          <h2 className="mt-0.5 text-[19px] font-bold leading-snug">{block.title}</h2>
          {block.location && (
            <p className="mt-0.5 text-[13.5px] text-night-ink-soft">{block.location}</p>
          )}
        </div>
        {block.status === "late" && (
          <span className="shrink-0 rounded-full bg-warn-tint px-2.5 py-1 text-[12px] font-semibold text-warn-ink">
            Running late
          </span>
        )}
      </div>

      {shots.length > 0 && (
        <div className="mt-3 rounded-lg bg-night-2 p-1.5">
          <p className="px-2 pb-1 pt-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-night-ink-soft">
            Shots · {captured}/{shots.length}
          </p>
          <ul>
            {shots.map((shot) => {
              const Tag = canWrite ? "button" : "div";
              return (
              <li key={shot.id}>
                <Tag
                  onClick={canWrite ? () => onToggleShot(shot) : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left ${canWrite ? "hover:bg-night-1" : ""}`}
                >
                  <span
                    className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md text-[12px] ${
                      shot.status === "captured"
                        ? "bg-ok text-white"
                        : "bg-night-0 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-[14px] ${
                      shot.status === "captured"
                        ? "text-night-ink-soft line-through"
                        : ""
                    }`}
                  >
                    {shot.title}
                  </span>
                  {shot.priority === "high" && shot.status !== "captured" && (
                    <span className="shrink-0 text-[11px] font-bold uppercase text-warn">
                      must
                    </span>
                  )}
                </Tag>
              </li>
              );
            })}
          </ul>
        </div>
      )}

      {canWrite && (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onStatus(block, "done")}
          className="h-11 rounded-md bg-night-accent font-medium text-night-0 transition-opacity hover:opacity-90"
        >
          Done
        </button>
        <button
          onClick={() => onStatus(block, block.status === "late" ? "upcoming" : "late")}
          className={`h-11 rounded-md font-medium transition-colors ${
            block.status === "late"
              ? "bg-warn text-night-0"
              : "bg-night-2 text-night-ink hover:bg-night-line"
          }`}
        >
          {block.status === "late" ? "Back on time" : "Running late"}
        </button>
      </div>
      )}
    </div>
  );
}

function QueueCard({
  block,
  emphasized = false,
  shotCount,
}: {
  block: BlockRow;
  emphasized?: boolean;
  shotCount: number;
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
      <div className="flex shrink-0 items-center gap-2">
        {shotCount > 0 && (
          <span className="rounded-full bg-night-2 px-2 py-0.5 text-[11.5px] text-night-ink-soft">
            {shotCount} shots
          </span>
        )}
        <span className="font-mono text-[13px] text-night-ink-soft">
          <FormattedTime iso={block.start_time} />
        </span>
      </div>
    </div>
  );
}

function PastCard({
  block,
  onStatus,
  canWrite,
}: {
  block: BlockRow;
  onStatus: (b: BlockRow, s: BlockRow["status"]) => void;
  canWrite: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-night-1/40 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        {block.status === "done" && <span className="shrink-0 text-[13px] text-ok">✓</span>}
        <p className="truncate text-[14px] text-night-ink-soft">{block.title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="font-mono text-[12.5px] text-night-ink-soft/70">
          <FormattedTime iso={block.start_time} />
        </span>
        {canWrite && block.status !== "done" && (
          <button
            onClick={() => onStatus(block, "done")}
            className="rounded-md bg-night-2 px-2.5 py-1 text-[12px] font-medium text-night-ink hover:bg-night-line"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
