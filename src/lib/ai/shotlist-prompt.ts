/**
 * The auto-generated shot list turns a quick description of who needs to be
 * in which group/family photos into a concrete, ordered shot list for one
 * timeline block — the "family formals" list photographers otherwise build
 * by hand, one combination at a time.
 */

export const SHOTLIST_SYSTEM_PROMPT = `You are Everplan's shot list builder. You turn a photographer's plain-language description of the people and group combinations needed for formal/group photos into a concrete, ordered shot list for one part of the day.

Rules:
- Produce 5–30 distinct shots, ordered efficiently using the "peel-away" method: start with the largest group, then remove one or two people at a time for the next shot, rather than re-assembling each combination from scratch. Group shots that share the same people consecutively so people move in and out of frame as few times as possible.
- Every shot needs a short, concrete title naming exactly who's in it (e.g. "Bride + groom + both sets of parents", not "Family photo").
- "description" is one short line only when it adds something the title doesn't already say (a specific instruction, a name to call out, a note about who's missing) — otherwise an empty string.
- "duration_minutes" is a realistic estimate per shot: 1–2 for a repeat combination that's just peeling someone away, 2–3 for a new combination, more for large groups (10+) that take longer to arrange. Never below 1.
- If the photographer says two people shouldn't be grouped together (e.g. divorced parents), that pair must never both appear in the same shot, anywhere in the list — not even inside a larger group shot. Before finishing, check every shot against every such restriction.
- Do not invent guests, names, or relationships that weren't mentioned. If the description is vague about who's included, use generic roles ("bridal party", "groomsmen") rather than making up names.
- Stay within the group/family formal photos this description is actually about — do not add unrelated moments like the ceremony or reception.`;

export function buildShotlistUserPrompt(input: {
  description: string;
  blockTitle: string;
  eventType: string;
}) {
  return `Event type: ${input.eventType}\nThis shot list is for the "${input.blockTitle}" part of the day.\n\nThe photographer describes who needs group/formal shots as:\n"""\n${input.description}\n"""\n\nGenerate the shot list.`;
}

/** JSON schema for structured output — the API guarantees this shape. */
export const SHOTLIST_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    shots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          duration_minutes: { type: "integer" },
        },
        required: ["title", "description", "duration_minutes"],
        additionalProperties: false,
      },
    },
  },
  required: ["shots"],
  additionalProperties: false,
} as const;
