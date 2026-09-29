import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  TIMELINE_OUTPUT_SCHEMA,
  TIMELINE_SYSTEM_PROMPT,
  buildTimelineUserPrompt,
} from "@/lib/ai/timeline-prompt";

export const maxDuration = 120;

// Base64 is ~4/3 the size of the raw file — this caps the decoded file at
// roughly 6MB, which is comfortably under Vercel's request body limit and
// well within what the model needs for a schedule PDF or photo.
const MAX_FILE_BASE64_CHARS = 8_000_000;

const FileSchema = z.object({
  name: z.string().max(200),
  mediaType: z.enum([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ]),
  data: z.string().min(1).max(MAX_FILE_BASE64_CHARS),
});

const RequestSchema = z
  .object({
    eventId: z.string().uuid(),
    description: z.string().max(4000).default(""),
    file: FileSchema.optional(),
  })
  .refine((v) => v.description.trim().length >= 10 || v.file, {
    message: "Describe the day, or attach a PDF or photo of the schedule, first.",
  });

const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const ResultSchema = z.object({
  blocks: z
    .array(
      z.object({
        title: z.string().min(1),
        start: TimeSchema,
        end: TimeSchema,
        location: z.string(),
        notes: z.string(),
      })
    )
    .min(1)
    .max(60),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Describe the day, or attach a PDF or photo of the schedule, first.",
      },
      { status: 400 }
    );
  }

  // RLS: the event only comes back if this user can see it.
  const { data: event } = await supabase
    .from("events")
    .select("id, owner_id, event_type, date, guest_count, coverage_needed")
    .eq("id", parsed.data.eventId)
    .maybeSingle();

  if (!event || event.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the event owner can generate its timeline." },
      { status: 403 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { 
        error: "ANTHROPIC_API_KEY is not set on the server — add it to .env.local.",
        code: "MISSING_API_KEY"
      },
      { status: 503 }
    );
  }

  const anthropic = new Anthropic();

  const content: Anthropic.MessageParam["content"] = [];
  const { file } = parsed.data;
  if (file) {
    content.push(
      file.mediaType === "application/pdf"
        ? {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: file.data },
          }
        : {
            type: "image",
            source: { type: "base64", media_type: file.mediaType, data: file.data },
          }
    );
  }
  content.push({
    type: "text",
    text: buildTimelineUserPrompt({
      description: parsed.data.description,
      eventType: event.event_type,
      date: event.date,
      guestCount: event.guest_count,
      coverage: event.coverage_needed ?? [],
      hasAttachment: Boolean(file),
    }),
  });

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      system: TIMELINE_SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: TIMELINE_OUTPUT_SCHEMA,
        },
      },
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The model declined that description — try rewording it." },
        { status: 422 }
      );
    }

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const result = ResultSchema.safeParse(JSON.parse(text));
    if (!result.success) {
      return NextResponse.json(
        { error: "The generated timeline came back malformed — try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ blocks: result.data.blocks });
  } catch (err) {
    console.error("generate-timeline failed", err);
    const message =
      err instanceof Anthropic.APIError
        ? `Claude API error (${err.status}): ${err.message}`
        : "Timeline generation failed — try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
