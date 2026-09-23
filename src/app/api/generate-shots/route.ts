import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canCreateShots, resolveViewerRole } from "@/lib/roles";
import {
  SHOTLIST_OUTPUT_SCHEMA,
  SHOTLIST_SYSTEM_PROMPT,
  buildShotlistUserPrompt,
} from "@/lib/ai/shotlist-prompt";

export const maxDuration = 120;

const RequestSchema = z.object({
  eventId: z.string().uuid(),
  blockId: z.string().uuid(),
  description: z.string().min(10).max(4000),
});

const ResultSchema = z.object({
  shots: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string(),
        duration_minutes: z.number().int().min(1).max(60),
      })
    )
    .min(1)
    .max(30),
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
      { error: "Describe who needs group or family photos first." },
      { status: 400 }
    );
  }

  // RLS: the event only comes back if this user can see it.
  const { data: event } = await supabase
    .from("events")
    .select("id, owner_id, event_type")
    .eq("id", parsed.data.eventId)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: "That event no longer exists." }, { status: 404 });
  }

  const isOwner = event.owner_id === user.id;
  let viewerRole = resolveViewerRole(isOwner, null);
  if (!isOwner) {
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    viewerRole = resolveViewerRole(false, member?.role ?? null);
  }

  if (!canCreateShots(viewerRole)) {
    return NextResponse.json(
      { error: "Only the owner or team can generate a shot list." },
      { status: 403 }
    );
  }

  const { data: block } = await supabase
    .from("blocks")
    .select("id, title")
    .eq("id", parsed.data.blockId)
    .eq("event_id", event.id)
    .maybeSingle();

  if (!block) {
    return NextResponse.json({ error: "That block no longer exists." }, { status: 404 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "ANTHROPIC_API_KEY is not set on the server — add it to .env.local.",
        code: "MISSING_API_KEY",
      },
      { status: 503 }
    );
  }

  const anthropic = new Anthropic();

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8192,
      system: SHOTLIST_SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: SHOTLIST_OUTPUT_SCHEMA,
        },
      },
      messages: [
        {
          role: "user",
          content: buildShotlistUserPrompt({
            description: parsed.data.description,
            blockTitle: block.title,
            eventType: event.event_type,
          }),
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
        { error: "The generated shot list came back malformed — try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ shots: result.data.shots });
  } catch (err) {
    console.error("generate-shots failed", err);
    const message =
      err instanceof Anthropic.APIError
        ? `Claude API error (${err.status}): ${err.message}`
        : "Shot list generation failed — try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
