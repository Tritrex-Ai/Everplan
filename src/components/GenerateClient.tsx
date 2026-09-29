"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { blockTimes } from "@/lib/time";
import { Button, Input, Spinner } from "@/components/ui";
import {
  Cancel01Icon,
  Attachment01Icon,
  File01Icon,
  ArrowUp01Icon,
} from "hugeicons-react";
import type { DraftBlock, EventRow } from "@/lib/types";

const EXAMPLE =
  "Yoruba traditional at 11, white ceremony at 2, cocktail hour after, reception at 6 with speeches and first dance, about 200 guests. Getting-ready coverage from 8am at the bride's family house.";

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_FILE_BYTES = 4 * 1024 * 1024;

type AttachedFile = { name: string; mediaType: string; data: string };

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

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
  const [file, setFile] = useState<AttachedFile | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function attachFile(picked: File | null | undefined) {
    if (!picked) return;
    setError(null);
    if (!ACCEPTED_FILE_TYPES.includes(picked.type)) {
      setError("Attach a PDF, JPG, PNG, GIF, or WEBP file.");
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      setError("That file is too big — keep it under 4MB.");
      return;
    }
    setFileBusy(true);
    try {
      const data = await readFileAsBase64(picked);
      setFile({ name: picked.name, mediaType: picked.type, data });
    } catch {
      setError("Couldn't read that file — try again.");
    }
    setFileBusy(false);
  }

  function removeFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    attachFile(e.dataTransfer.files?.[0]);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, description, file: file ?? undefined }),
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

  const isImageFile = file && IMAGE_TYPES.has(file.mediaType);
  const canGenerate = !busy && !fileBusy && (!!file || description.trim().length >= 10);

  return (
    <section className="space-y-4">
      {/* Composer — a Gemini/Claude-style single surface: textarea, an
          attachment preview (thumbnail for images, chip for PDFs), and a
          bottom toolbar, all inside one rounded card. Drag-and-drop anywhere
          on it attaches a file the same way the picker button does. */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-8 -top-10 h-40 -z-10 bg-grid-dots opacity-70 [mask-image:radial-gradient(ellipse_55%_100%_at_50%_0%,black,transparent)]"
        />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-3xl border bg-surface-1 transition-colors ${
            dragOver ? "border-accent bg-accent-tint/20" : "border-line"
          }`}
        >
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the wedding day…"
            className="w-full resize-none rounded-t-3xl bg-transparent px-4 pt-4 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES.join(",")}
            className="hidden"
            onChange={(e) => attachFile(e.target.files?.[0])}
          />

          {file && (
            <div className="px-4 pb-1">
              {isImageFile ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${file.mediaType};base64,${file.data}`}
                    alt={file.name}
                    className="h-16 w-16 rounded-xl border border-line object-cover"
                  />
                  <button
                    onClick={removeFile}
                    aria-label="Remove attachment"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white hover:bg-danger"
                  >
                    <Cancel01Icon size={11} />
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                  <File01Icon size={16} className="shrink-0 text-ink-faint" />
                  <span className="max-w-[12rem] truncate text-[13px] text-ink-soft">{file.name}</span>
                  <button
                    onClick={removeFile}
                    aria-label="Remove attachment"
                    className="shrink-0 rounded-md p-0.5 text-ink-faint hover:bg-danger-tint hover:text-danger"
                  >
                    <Cancel01Icon size={13} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1.5">
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={fileBusy}
                title="Attach a PDF or photo of the schedule"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-surface-2 hover:text-ink disabled:opacity-50"
              >
                <Attachment01Icon size={18} />
              </button>
              {!description && !file && (
                <button
                  type="button"
                  onClick={() => setDescription(EXAMPLE)}
                  className="truncate text-[12.5px] text-ink-faint hover:text-accent-ink hover:underline underline-offset-2"
                >
                  Try an example
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={generate}
              disabled={!canGenerate}
              title={drafts ? "Regenerate" : "Generate timeline"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-accent to-accent-strong text-white hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none"
            >
              {busy ? <Spinner className="text-white" /> : <ArrowUp01Icon size={18} />}
            </button>
          </div>
        </div>

        {error === "MISSING_API_KEY" ? (
          <div className="mt-3 rounded-xl bg-surface-2 p-4 outline outline-2 outline-accent">
            <h3 className="font-semibold text-accent-ink">API Key Required</h3>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              The AI timeline builder requires an Anthropic API key to function. Add{" "}
              <code className="rounded bg-surface-3 px-1 py-0.5 text-[12px] text-ink">
                ANTHROPIC_API_KEY=sk-ant-...
              </code>{" "}
              to your{" "}
              <code className="rounded bg-surface-3 px-1 py-0.5 text-[12px] text-ink">
                .env.local
              </code>{" "}
              file and restart the server.
            </p>
          </div>
        ) : error ? (
          <p className="mt-3 rounded-xl bg-danger-tint px-3 py-2 text-[13px] text-danger">
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
              <li key={i} className="rounded-xl bg-surface-1 border border-line p-3.5">
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
                    className="ml-auto shrink-0 rounded-lg px-2 py-1 text-[13px] text-ink-faint hover:bg-danger-tint hover:text-danger"
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
