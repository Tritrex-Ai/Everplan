"use client";

import { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/lib/time";

/* formatTime/formatDate depend on the runtime's local timezone. The server
 * and a viewer's browser almost never agree on one, so rendering them
 * directly during SSR makes React throw a hydration error the instant they
 * disagree. Deferring to a client-only effect means the server emits
 * nothing for these two spans, and the real value appears the moment the
 * page is interactive — no mismatch possible. */

export function FormattedTime({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    queueMicrotask(() => setText(formatTime(iso)));
  }, [iso]);
  return <>{text}</>;
}

export function FormattedDate({ date }: { date: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    queueMicrotask(() => setText(formatDate(date)));
  }, [date]);
  return <>{text}</>;
}
