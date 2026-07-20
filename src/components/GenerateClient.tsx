"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { blockTimes } from "@/lib/time";
import { Button, Field, Input, Spinner, Textarea } from "@/components/ui";
import { StarsIcon, Cancel01Icon } from "hugeicons-react";
import type { DraftBlock, EventRow } from "@/lib/types";

const EXAMPLE =
  "Yoruba traditional at 11, white ceremony at 2, cocktail hour after, reception at 6 with speeches and first dance, about 200 guests. Getting-ready coverage from 8am at the bride's family house.";

export function GenerateClient({
  event,
  hasBlocks,
}: {
  event: EventRow;
  hasBlocks: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [description, setDescription] = useState("");
  const [drafts, setDrafts] = useState<DraftBlock[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, description }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === "MISSING_API_KEY") {
          setError("MISSING_API_KEY");
        } else {
          setError(json.error ?? "Generation failed — try again.");
        }
      } else {
        setDrafts(json.blocks as DraftBlock[]);
      }
    } catch {
      setError("Couldn't reach the server — check your connection.");
    }
    setBusy(false);
  }

  function updateDraft(index: number, patch: Partial<DraftBlock>) {
    setDrafts((prev) =>
      prev ? prev.map((d, i) => (i === index ? { ...d, ...patch } : d)) : prev
    );
  }

  function removeDraft(index: number) {
    setDrafts((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  async function saveAll() {
    if (!drafts || drafts.length === 0) return;
    setSaving(true);
    setError(null);

    const rows = drafts.map((d, i) => ({
      event_id: event.id,
      title: d.title,
      ...blockTimes(event.date, d.start, d.end),
      location: d.location || null,
      notes: d.notes || null,
      position: i,
    }));

    // Capture the old block ids before touching anything, so the delete
    // below can target exactly those rows — not the ones we're about to
    // insert, which get their own fresh ids either way.
    const { data: oldBlocks } = hasBlocks
      ? await supabase.from("blocks").select("id").eq("event_id", event.id)
      : { data: [] as { id: string }[] };

    // Insert the new draft before removing the old timeline — if this
    // fails, the existing blocks are untouched instead of already gone.
    const { error: insertError } = await supabase.from("blocks").insert(rows);
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    if (oldBlocks && oldBlocks.length > 0) {
      // Replace the existing timeline — the AI draft becomes the new plan.
      const { error: deleteError } = await supabase
        .from("blocks")
        .delete()
        .in("id", oldBlocks.map((b) => b.id));
      if (deleteError) {
        setError(
          "Saved the new plan, but couldn't clear the old one — you may see duplicate blocks. Please refresh and remove them by hand."
        );
        setSaving(false);
        return;
      }
    }

    router.push(`/events/${event.id}`);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-surface-1 p-5">
        <Field label="Describe the day (or paste the coordinator's notes)">
          <Textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={EXAMPLE}
          />
        </Field>
        <Button
          onClick={generate}
          disabled={busy || description.trim().length < 10}
          className="mt-3 w-full"
        >
          {busy ? (
            <>
              <Spinner /> Building your timeline…
            </>
          ) : drafts ? (
            <><StarsIcon size={16} className="inline mr-1 -mt-0.5" /> Regenerate</>
          ) : (
            <><StarsIcon size={16} className="inline mr-1 -mt-0.5" /> Generate timeline</>
          )}
        </Button>
        {error === "MISSING_API_KEY" ? (
          <div className="mt-4 rounded-lg bg-surface-2 p-4 outline outline-2 outline-accent">
            <h3 className="font-semibold text-accent-ink">API Key Required</h3>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              The AI timeline builder requires an Anthropic API key to function. Add <code className="bg-surface-3 px-1 py-0.5 rounded text-[12px] text-ink">ANTHROPIC_API_KEY=sk-ant-...</code> to your <code className="bg-surface-3 px-1 py-0.5 rounded text-[12px] text-ink">.env.local</code> file and restart the server.
            </p>
          </div>
        ) : error ? (
          <p className="mt-3 rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        ) : null}
      </div>

      {drafts && (
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
              Generated · editable
            </p>
            <p className="text-[13px] text-ink-faint">{drafts.length} blocks</p>
          </div>

          <ul className="space-y-2">
            {drafts.map((draft, i) => (
              <li key={i} className="rounded-lg bg-surface-1 p-3.5">
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={draft.start}
                    onChange={(e) => updateDraft(i, { start: e.target.value })}
                    className="!h-9 !w-[6.5rem] shrink-0 font-mono !text-[13px]"
                  />
                  <span className="text-ink-faint">–</span>
                  <Input
                    type="time"
                    value={draft.end}
                    onChange={(e) => updateDraft(i, { end: e.target.value })}
                    className="!h-9 !w-[6.5rem] shrink-0 font-mono !text-[13px]"
                  />
                  <button
                    onClick={() => removeDraft(i)}
                    aria-label="Remove block"
                    className="ml-auto shrink-0 rounded-md px-2 py-1 text-[13px] text-ink-faint hover:bg-danger-tint hover:text-danger"
                  >
                    <Cancel01Icon size={14} />
                  </button>
                </div>
                <Input
                  value={draft.title}
                  onChange={(e) => updateDraft(i, { title: e.target.value })}
                  className="mt-2 !h-9 font-semibold"
                  placeholder="Block title"
                />
                <Input
                  value={draft.location}
                  onChange={(e) => updateDraft(i, { location: e.target.value })}
                  className="mt-2 !h-9 !text-[13.5px]"
                  placeholder="Location"
                />
                {draft.notes ? (
                  <p className="mt-2 px-1 text-[12.5px] leading-relaxed text-ink-soft">
                    {draft.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="sticky bottom-4 mt-4">
            <Button onClick={saveAll} disabled={saving} className="w-full">
              {saving
                ? "Saving…"
                : hasBlocks
                  ? "Replace timeline with these blocks"
                  : "Save to timeline"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
