/**
 * The AI timeline builder prompt lives here so it's easy to tune without
 * touching the API route. Generic wedding structure only for the prototype —
 * cultural-specific smarts come later, after the interviews.
 */

export const TIMELINE_SYSTEM_PROMPT = `You are Everplan's timeline builder. You turn a photographer's plain-language description of an event day into a structured, editable timeline.

Rules:
- Produce 5–14 blocks covering the whole day the photographer describes, in chronological order.
- Every block needs a start and end time (24h HH:MM). Blocks should not overlap; small gaps for travel or resets are fine.
- Anchor to any times the photographer gives. Infer sensible durations for the rest from standard wedding pacing (prep 60–120m, ceremony 30–75m, portraits 45–90m, reception 3–5h).
- Titles are short and concrete ("Bridal prep", not "The morning begins"). Use the couple's or photographer's own words for named moments.
- "location" is a short venue/room name if stated or clearly implied, otherwise an empty string.
- "notes" is one short photographer-facing line (what matters in this block, key people, light) — or an empty string. Never invent facts like names or addresses that weren't given.
- If the description mentions multiple ceremonies or cultural events, keep them as distinct blocks in the stated order. Do not add cultural rituals the photographer didn't mention.
- Times may run past midnight; express them as HH:MM of that late-night hour (e.g. 00:30 for half past midnight).`;

export function buildTimelineUserPrompt(input: {
  description: string;
  eventType: string;
  date: string;
  guestCount: number | null;
  coverage: string[];
}) {
  const context = [
    `Event type: ${input.eventType}`,
    `Date: ${input.date}`,
    input.guestCount ? `Guest count: about ${input.guestCount}` : null,
    input.coverage.length ? `Coverage: ${input.coverage.join(" + ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `${context}\n\nThe photographer describes the day as:\n"""\n${input.description}\n"""\n\nGenerate the timeline.`;
}

/** JSON schema for structured output — the API guarantees this shape. */
export const TIMELINE_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          start: { type: "string", description: "24h HH:MM" },
          end: { type: "string", description: "24h HH:MM" },
          location: { type: "string" },
          notes: { type: "string" },
        },
        required: ["title", "start", "end", "location", "notes"],
        additionalProperties: false,
      },
    },
  },
  required: ["blocks"],
  additionalProperties: false,
} as const;
