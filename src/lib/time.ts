import type { BlockRow } from "./types";

/* formatTime/formatDate use the runtime's local timezone, which differs
 * between the server (SSR) and a viewer's browser — calling them directly
 * in Server Component JSX (or on a client component's first, server-rendered
 * pass) makes React throw a hydration error the moment the two disagree.
 * Always render them through <FormattedTime>/<FormattedDate>
 * (components/FormattedTime.tsx), which defers the actual formatting to
 * after mount so server and client never have to agree on a timezone. */

/** Combine an event date (yyyy-mm-dd) and HH:MM into a local-time ISO string. */
export function combineDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

/**
 * Build start/end ISO strings for a block from the event date and two HH:MM
 * values. An end before the start rolls over to the next day (receptions run
 * past midnight).
 */
export function blockTimes(date: string, start: string, end: string) {
  const startAt = new Date(`${date}T${start}:00`);
  const endAt = new Date(`${date}T${end}:00`);
  if (endAt <= startAt) endAt.setDate(endAt.getDate() + 1);
  return { start_time: startAt.toISOString(), end_time: endAt.toISOString() };
}

export function toTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function durationLabel(startIso: string, endIso: string): string {
  const mins = Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000
  );
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Split blocks into Now / Next / Later, driven by the clock.
 * - now: blocks in progress (start <= now < end) that aren't done
 * - next: the first upcoming not-done block after "now"
 * - later: everything after that (plus done blocks fall out of now/next)
 */
export function splitBoard(blocks: BlockRow[], now: Date) {
  const sorted = [...blocks].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const t = now.getTime();

  const current = sorted.filter(
    (b) =>
      b.status !== "done" &&
      new Date(b.start_time).getTime() <= t &&
      t < new Date(b.end_time).getTime()
  );

  const upcoming = sorted.filter(
    (b) => b.status !== "done" && new Date(b.start_time).getTime() > t
  );

  const next = upcoming.slice(0, 1);
  const later = upcoming.slice(1);

  const past = sorted.filter(
    (b) =>
      !current.includes(b) && !upcoming.includes(b)
  );

  return { current, next, later, past };
}
