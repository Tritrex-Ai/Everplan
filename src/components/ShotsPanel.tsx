"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/time";
import { Badge, Button, EmptyState, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { ShotDetailModal } from "@/components/ShotDetailModal";
import type { BlockRow, ShotRow } from "@/lib/types";

type ShotDraft = {
  blockId: string;
  title: string;
  description: string;
  priority: "low" | "normal" | "high";
};

export function ShotsPanel({
  eventId,
  blocks,
  initialShots,
  isOwner,
  userId,
}: {
  eventId: string;
  blocks: BlockRow[];
  initialShots: ShotRow[];
  isOwner: boolean;
  userId: string;
}) {
  const supabase = createClient();
  const [shots, setShots] = useState(initialShots);
  const [draft, setDraft] = useState<ShotDraft | null>(null);
  const [detailShotId, setDetailShotId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const detailShot = shots.find((s) => s.id === detailShotId) ?? null;

  const sorted = useMemo(
    () => [...blocks].sort((a, b) => a.position - b.position),
    [blocks]
  );
  const byBlock = useMemo(() => {
    const map = new Map<string, ShotRow[]>();
    for (const s of shots) {
      map.set(s.block_id, [...(map.get(s.block_id) ?? []), s]);
    }
    return map;
  }, [shots]);

  async function toggleShot(shot: ShotRow) {
    const nextStatus = shot.status === "captured" ? "planned" : "captured";
    const patch =
      nextStatus === "captured"
        ? {
            status: nextStatus,
            captured_by: userId,
            captured_at: new Date().toISOString(),
          }
        : { status: nextStatus, captured_by: null, captured_at: null };

    setShots((prev) =>
      prev.map((s) => (s.id === shot.id ? { ...s, ...patch } as ShotRow : s))
    );
    await supabase.from("shots").update(patch).eq("id", shot.id);
  }

  async function setVisibility(shot: ShotRow, visibility: "private" | "shared") {
    setShots((prev) =>
      prev.map((s) => (s.id === shot.id ? { ...s, visibility } : s))
    );
    await supabase.from("shots").update({ visibility }).eq("id", shot.id);
  }

  async function shareBlock(blockId: string, visibility: "private" | "shared") {
    setShots((prev) =>
      prev.map((s) => (s.block_id === blockId ? { ...s, visibility } : s))
    );
    await supabase
      .from("shots")
      .update({ visibility })
      .eq("block_id", blockId)
      .eq("event_id", eventId);
  }

  async function shareAll(visibility: "private" | "shared") {
    setShots((prev) => prev.map((s) => ({ ...s, visibility })));
    await supabase.from("shots").update({ visibility }).eq("event_id", eventId);
  }

  async function deleteShot(id: string) {
    setShots((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("shots").delete().eq("id", id);
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);

    const { data } = await supabase
      .from("shots")
      .insert({
        event_id: eventId,
        block_id: draft.blockId,
        title: draft.title,
        description: draft.description || null,
        priority: draft.priority,
      })
      .select("*")
      .single();

    if (data) setShots((prev) => [...prev, data as ShotRow]);
    setBusy(false);
    setDraft(null);
  }

  const sharedCount = shots.filter((s) => s.visibility === "shared").length;

  return (
    <section>
      {isOwner ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent-tint px-4 py-3">
          <p className="text-[13.5px] font-medium text-accent-ink">
            🔒 Private by default — only you see these
          </p>
          {shots.length > 0 && (
            <button
              onClick={() => shareAll(sharedCount === shots.length ? "private" : "shared")}
              className="text-[13px] font-medium text-accent-ink underline-offset-2 hover:underline"
            >
              {sharedCount === shots.length ? "Make all private" : "Share all with team"}
            </button>
          )}
        </div>
      ) : (
        <div className="mb-4 rounded-lg bg-surface-2 px-4 py-3">
          <p className="text-[13.5px] text-ink-soft">
            You are seeing the shots the photographer shared with the team.
          </p>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          title="Build the timeline first"
          body="Shots attach to timeline blocks. Add blocks on the Timeline tab, then build your list here."
        />
      ) : (
        <div className="space-y-5">
          {sorted.map((block) => {
            const blockShots = byBlock.get(block.id) ?? [];
            const allShared =
              blockShots.length > 0 &&
              blockShots.every((s) => s.visibility === "shared");
            return (
              <div key={block.id}>
                <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                  <p className="min-w-0 truncate text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                    {block.title} · {formatTime(block.start_time)}
                  </p>
                  {isOwner && blockShots.length > 0 && (
                    <button
                      onClick={() => shareBlock(block.id, allShared ? "private" : "shared")}
                      className="shrink-0 text-[12.5px] font-medium text-accent-ink hover:underline"
                    >
                      {allShared ? "Unshare block" : "Share block"}
                    </button>
                  )}
                </div>

                <div className="overflow-hidden rounded-lg bg-surface-1">
                  {blockShots.length === 0 ? (
                    <p className="px-4 py-3.5 text-[14px] text-ink-faint">
                      {isOwner ? "No shots yet." : "Nothing shared for this block."}
                    </p>
                  ) : (
                    <ul>
                      {blockShots.map((shot) => (
                        <li
                          key={shot.id}
                          className="group flex items-center gap-3 px-4 py-3 not-last:border-b not-last:border-line/60"
                        >
                          <button
                            onClick={() => toggleShot(shot)}
                            aria-label={
                              shot.status === "captured" ? "Mark planned" : "Mark captured"
                            }
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[13px] transition-colors ${
                              shot.status === "captured"
                                ? "bg-ok text-white"
                                : "bg-surface-2 text-transparent hover:text-ink-faint"
                            }`}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setDetailShotId(shot.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`truncate text-[14.5px] ${
                                  shot.status === "captured"
                                    ? "text-ink-faint line-through"
                                    : ""
                                }`}
                              >
                                {shot.title}
                              </span>
                              {shot.reference_images.length > 0 && (
                                <span className="shrink-0 text-[11.5px] text-ink-faint">
                                  📷{shot.reference_images.length}
                                </span>
                              )}
                            </span>
                            {shot.description && (
                              <span className="block truncate text-[12.5px] text-ink-faint">
                                {shot.description}
                              </span>
                            )}
                          </button>
                          {shot.priority === "high" && <Badge tone="warn">High</Badge>}
                          {isOwner && (
                            <>
                              <button
                                onClick={() =>
                                  setVisibility(
                                    shot,
                                    shot.visibility === "shared" ? "private" : "shared"
                                  )
                                }
                                title={
                                  shot.visibility === "shared"
                                    ? "Shared with team — click to make private"
                                    : "Private — click to share with team"
                                }
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${
                                  shot.visibility === "shared"
                                    ? "bg-accent-tint text-accent-ink"
                                    : "bg-surface-2 text-ink-faint"
                                }`}
                              >
                                {shot.visibility === "shared" ? "Shared" : "🔒"}
                              </button>
                              <button
                                onClick={() => deleteShot(shot.id)}
                                aria-label="Delete shot"
                                className="shrink-0 text-[13px] text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isOwner && (
                    <button
                      onClick={() =>
                        setDraft({
                          blockId: block.id,
                          title: "",
                          description: "",
                          priority: "normal",
                        })
                      }
                      className="block w-full bg-surface-2/50 px-4 py-2.5 text-left text-[13.5px] font-medium text-accent-ink hover:bg-accent-tint/50"
                    >
                      + Add shot
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={draft !== null} onClose={() => setDraft(null)} title="Add shot">
        {draft && (
          <form onSubmit={saveDraft} className="space-y-3">
            <Field label="Shot">
              <Input
                required
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Bride with grandmother, window light"
              />
            </Field>
            <Field label="Details">
              <Textarea
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Pose reference, lens, reminder…"
              />
            </Field>
            <Field label="Priority">
              <Select
                value={draft.priority}
                onChange={(e) =>
                  setDraft({ ...draft, priority: e.target.value as ShotDraft["priority"] })
                }
              >
                <option value="normal">Normal</option>
                <option value="high">Must-get</option>
                <option value="low">Nice to have</option>
              </Select>
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Adding…" : "Add shot"}
            </Button>
          </form>
        )}
      </Modal>

      {detailShot && (
        <ShotDetailModal
          shot={detailShot}
          isOwner={isOwner}
          onClose={() => setDetailShotId(null)}
          onChange={(updated) =>
            setShots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
          }
        />
      )}
    </section>
  );
}
