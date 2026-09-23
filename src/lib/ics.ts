import type { BlockRow, EventRow } from "./types";

function toIcsDate(iso: string): string {
  // "2026-03-05T14:00:00.000Z" -> "20260305T140000Z"
  return iso.replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** A minimal iCalendar (RFC 5545) export — one VEVENT per timeline block,
 * importable by Apple/Google/Outlook calendars. No line folding: block
 * titles/locations/notes are short enough in practice that every mainstream
 * calendar app accepts the unfolded line. */
export function buildEventIcs(event: EventRow, blocks: BlockRow[]): string {
  const stamp = toIcsDate(new Date().toISOString());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Everplan//Timeline//EN", "CALSCALE:GREGORIAN"];

  for (const block of blocks) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${block.id}@everplan.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsDate(block.start_time)}`,
      `DTEND:${toIcsDate(block.end_time)}`,
      `SUMMARY:${escapeIcsText(`${event.title}: ${block.title}`)}`
    );
    if (block.location) lines.push(`LOCATION:${escapeIcsText(block.location)}`);
    if (block.notes) lines.push(`DESCRIPTION:${escapeIcsText(block.notes)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(event: EventRow, blocks: BlockRow[]) {
  const ics = buildEventIcs(event, blocks);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^\w\- ]+/g, "").trim() || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
