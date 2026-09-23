"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormattedTime } from "@/components/FormattedTime";
import { Badge, Button, EmptyState, Field, Input, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { ShotDetailModal } from "@/components/ShotDetailModal";
import { canCreateShots, canEditShot, canToggleShotStatus, type ViewerRole } from "@/lib/roles";
import { durationMinutes } from "@/lib/time";
import { LockKeyIcon, Camera01Icon, Cancel01Icon, Tick01Icon, StarsIcon } from "hugeicons-react";
import type { BlockRow, ShotRow } from "@/lib/types";

const DEFAULT_SHOT_MINUTES = 5;
const SHOTLIST_EXAMPLE =
  "Bride's parents (John & Mary), 2 siblings; groom's parents (divorced — don't group together) Femi & Rita; both sets of grandparents; bridal party of 6; extended family group of ~20";

type ShotDraft = {
  blockId: string;
  title: string;
  description: string;
  priority: "low" | "normal" | "high";
  durationMinutes: number;
};

type ShotlistDraft = { title: string; description: string; duration_minutes: number };

export function ShotsPanel({
  eventId,
  blocks,
  initialShots,
  viewerRole,
  userId,
  isPreview = false,
}: {
  eventId: string;
  blocks: BlockRow[];
  initialShots: ShotRow[];
  viewerRole: ViewerRole;
  userId: string;
  isPreview?: boolean;
}) {
  const supabase = createClient();
  const [shots, setShots] = useState(initialShots);
  const [draft, setDraft] = useState<ShotDraft | null>(null);
  const [detailShotId, setDetailShotId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shotlistBlock, setShotlistBlock] = useState<{ id: string; title: string } | null>(null);
  const [shotlistDescription, setShotlistDescription] = useState("");
  const [shotlistDrafts, setShotlistDrafts] = useState<ShotlistDraft[] | null>(null);
  const [shotlistBusy, setShotlistBusy] = useState(false);
  const [shotlistSaving, setShotlistSaving] = useState(false);
  const [shotlistError, setShotlistError] = useState<string | null>(null);

  // No realtime here meant a teammate checking a shot off, or the owner
  // sharing/unsharing one, never reached anyone else's Shots tab without a
  // refresh — same gap as the Timeline tab. RLS already scopes which rows a
  // given viewer's subscription receives (private shots stay private over
  // this channel too), so this only ever merges in rows this viewer could
  // already legitimately fetch.
  useEffect(() => {
    const channel = supabase
      .channel(`shots-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shots", filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as ShotRow;
            setShots((prev) => (prev.some((s) => s.id === row.id) ? prev : [...prev, row]));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as ShotRow;
            setShots((prev) => prev.map((s) => (s.id === row.id ? row : s)));
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setShots((prev) => prev.filter((s) => s.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, eventId]);

  // Owner data fetches include every shot (private + shared, any creator) so
  // realtime + "preview as" simulation both work off one full list — filter
  // here to what this viewer would actually be allowed to see, mirroring
  // the RLS select policy rather than re-fetching for a simulated role.
  // A real team member's own shots (any visibility) count as visible; a
  // simulated preview has no real person behind it, so "own shots" isn't a
  // thing — only what's actually been shared should show, or an owner's
  // "preview as Read-only" would incorrectly keep showing their own
  // private shots (created_by matches the real owner, not a hypothetical
  // team member).
  const visibleShots = useMemo(
    () =>
      viewerRole === "owner"
        ? shots
        : shots.filter((s) =>
            isPreview
              ? s.visibility === "shared"
              : s.created_by === userId || s.visibility === "shared"
          ),
    [shots, viewerRole, userId, isPreview]
  );

  const detailShot = visibleShots.find((s) => s.id === detailShotId) ?? null;
  const isOwner = viewerRole === "owner";

  const sorted = useMemo(
    () => [...blocks].sort((a, b) => a.position - b.position),
    [blocks]
  );
  const byBlock = useMemo(() => {
    const map = new Map<string, ShotRow[]>();
    for (const s of visibleShots) {
      map.set(s.block_id, [...(map.get(s.block_id) ?? []), s]);
    }
    return map;
  }, [visibleShots]);

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

    setError(null);
    setShots((prev) =>
      prev.map((s) => (s.id === shot.id ? { ...s, ...patch } as ShotRow : s))
    );
    const { error: updateError } = await supabase.from("shots").update(patch).eq("id", shot.id);
    if (updateError) {
      setShots((prev) => prev.map((s) => (s.id === shot.id ? shot : s)));
      setError("Couldn't update that shot — please try again.");
    }
  }

  async function setVisibility(shot: ShotRow, visibility: "private" | "shared") {
    const previous = shot.visibility;
    setError(null);
    setShots((prev) =>
      prev.map((s) => (s.id === shot.id ? { ...s, visibility } : s))
    );
    const { error: updateError } = await supabase
      .from("shots")
      .update({ visibility })
      .eq("id", shot.id);
    if (updateError) {
      setShots((prev) =>
        prev.map((s) => (s.id === shot.id ? { ...s, visibility: previous } : s))
      );
      setError("Couldn't update sharing for that shot — please try again.");
    }
  }

  async function shareBlock(blockId: string, visibility: "private" | "shared") {
    const previous = shots;
    setError(null);
    setShots((prev) =>
      prev.map((s) => (s.block_id === blockId ? { ...s, visibility } : s))
    );
    const { error: updateError } = await supabase
      .from("shots")
      .update({ visibility })
      .eq("block_id", blockId)
      .eq("event_id", eventId);
    if (updateError) {
      setShots(previous);
      setError("Couldn't update sharing for this block's shots — please try again.");
    }
  }

  async function shareAll(visibility: "private" | "shared") {
    const previous = shots;
    setError(null);
    setShots((prev) => prev.map((s) => ({ ...s, visibility })));
    const { error: updateError } = await supabase
      .from("shots")
      .update({ visibility })
      .eq("event_id", eventId);
    if (updateError) {
      setShots(previous);
      setError("Couldn't update sharing for all shots — please try again.");
    }
  }

  async function deleteShot(id: string) {
    const previous = shots;
    setError(null);
    setShots((prev) => prev.filter((s) => s.id !== id));
    const { error: deleteError } = await supabase.from("shots").delete().eq("id", id);
    if (deleteError) {
      setShots(previous);
      setError("Couldn't delete that shot — please try again.");
    }
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError(null);

    const { data, error: saveError } = await supabase
      .from("shots")
      .insert({
        event_id: eventId,
        block_id: draft.blockId,
        title: draft.title,
        description: draft.description || null,
        priority: draft.priority,
        duration_minutes: draft.durationMinutes,
      })
      .select("*")
      .single();

    if (saveError || !data) {
      setError(saveError?.message ?? "Couldn't create this shot — please try again.");
      setBusy(false);
      return;
    }
    setShots((prev) => [...prev, data as ShotRow]);
    setBusy(false);
    setDraft(null);
  }

  function openShotlist(block: BlockRow) {
    setShotlistBlock({ id: block.id, title: block.title });
    setShotlistDescription("");
    setShotlistDrafts(null);
    setShotlistError(null);
  }

  function closeShotlist() {
    setShotlistBlock(null);
  }

  async function generateShotlist() {
    if (!shotlistBlock) return;
    setShotlistBusy(true);
    setShotlistError(null);
    try {
      const res = await fetch("/api/generate-shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          blockId: shotlistBlock.id,
          description: shotlistDescription,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setShotlistError(json.code === "MISSING_API_KEY" ? "MISSING_API_KEY" : json.error ?? "Generation failed — try again.");
      } else {
        setShotlistDrafts(json.shots as ShotlistDraft[]);
      }
    } catch {
      setShotlistError("Couldn't reach the server — check your connection.");
    }
    setShotlistBusy(false);
  }

  function updateShotlistDraft(index: number, patch: Partial<ShotlistDraft>) {
    setShotlistDrafts((prev) =>
      prev ? prev.map((d, i) => (i === index ? { ...d, ...patch } : d)) : prev
    );
  }

  function removeShotlistDraft(index: number) {
    setShotlistDrafts((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  async function saveShotlist() {
    if (!shotlistBlock || !shotlistDrafts || shotlistDrafts.length === 0) return;
    setShotlistSaving(true);
    setShotlistError(null);

    const rows = shotlistDrafts.map((d) => ({
      event_id: eventId,
      block_id: shotlistBlock.id,
      title: d.title,
      description: d.description || null,
      duration_minutes: d.duration_minutes,
    }));

    const { data, error: insertError } = await supabase.from("shots").insert(rows).select("*");
    if (insertError || !data) {
      setShotlistError(insertError?.message ?? "Couldn't save the shot list — try again.");
      setShotlistSaving(false);
      return;
    }
    setShots((prev) => [...prev, ...(data as ShotRow[])]);
    setShotlistSaving(false);
    closeShotlist();
  }

  const sharedCount = shots.filter((s) => s.visibility === "shared").length;
  const canCreate = canCreateShots(viewerRole);
  const canToggle = canToggleShotStatus(viewerRole);

  return (
    <section>
      {error && (
        <p className="mb-4 rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}
      {isOwner ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent-tint px-4 py-3">
          <p className="text-[13.5px] font-medium text-accent-ink">
            <LockKeyIcon size={14} className="inline mr-1 -mt-0.5" /> Private by default — only you see these
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
      ) : viewerRole === "team" ? (
        <div className="mb-4 rounded-lg bg-accent-tint px-4 py-3">
          <p className="text-[13.5px] font-medium text-accent-ink">
            <LockKeyIcon size={14} className="inline mr-1 -mt-0.5" /> Your shots are private until you share them — plus anything others have shared with you.
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-lg bg-surface-2 px-4 py-3">
          <p className="text-[13.5px] text-ink-soft">
            You are seeing the shots that have been shared with you.
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
            const plannedMinutes = blockShots.reduce((sum, s) => sum + s.duration_minutes, 0);
            const allottedMinutes = durationMinutes(block.start_time, block.end_time);
            const overBudget = plannedMinutes > allottedMinutes;
            return (
              <div key={block.id}>
                <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                  <p className="min-w-0 truncate text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                    {block.title} · <FormattedTime iso={block.start_time} />
                  </p>
                  <div className="flex shrink-0 items-center gap-3">
                    {blockShots.length > 0 && (
                      <span
                        className={`text-[12px] font-medium ${
                          overBudget ? "text-warn-ink" : "text-ink-faint"
                        }`}
                      >
                        {plannedMinutes} of {allottedMinutes} min planned
                      </span>
                    )}
                    {isOwner && blockShots.length > 0 && (
                      <button
                        onClick={() => shareBlock(block.id, allShared ? "private" : "shared")}
                        className="text-[12.5px] font-medium text-accent-ink hover:underline"
                      >
                        {allShared ? "Unshare block" : "Share block"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg bg-surface-1">
                  {blockShots.length === 0 ? (
                    <p className="px-4 py-3.5 text-[14px] text-ink-faint">
                      {canCreate ? "No shots yet." : "Nothing shared for this block."}
                    </p>
                  ) : (
                    <ul>
                      {blockShots.map((shot) => {
                        const editable = canEditShot(viewerRole, shot, userId);
                        return (
                        <li
                          key={shot.id}
                          className="group flex items-center gap-3 px-4 py-3 not-last:border-b not-last:border-line/60"
                        >
                          {canToggle ? (
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
                              <Tick01Icon size={14} />
                            </button>
                          ) : (
                            <span
                              aria-hidden
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[13px] ${
                                shot.status === "captured"
                                  ? "bg-ok text-white"
                                  : "bg-surface-2 text-transparent"
                              }`}
                            >
                              <Tick01Icon size={14} />
                            </span>
                          )}
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
                                <span className="shrink-0 flex items-center gap-0.5 text-[11.5px] text-ink-faint">
                                  <Camera01Icon size={14} className="-mt-0.5" />{shot.reference_images.length}
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
                          {editable && (
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
                                    ? "Shared — click to make private"
                                    : "Private — click to share"
                                }
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${
                                  shot.visibility === "shared"
                                    ? "bg-accent-tint text-accent-ink"
                                    : "bg-surface-2 text-ink-faint"
                                }`}
                              >
                                {shot.visibility === "shared" ? "Shared" : <LockKeyIcon size={12} className="inline" />}
                              </button>
                              <button
                                onClick={() => deleteShot(shot.id)}
                                aria-label="Delete shot"
                                className="shrink-0 text-[13px] text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                              >
                                <Cancel01Icon size={14} />
                              </button>
                            </>
                          )}
                        </li>
                        );
                      })}
                    </ul>
                  )}
                  {canCreate && (
                    <div className="flex">
                      <button
                        onClick={() =>
                          setDraft({
                            blockId: block.id,
                            title: "",
                            description: "",
                            priority: "normal",
                            durationMinutes: DEFAULT_SHOT_MINUTES,
                          })
                        }
                        className="flex-1 bg-surface-2/50 px-4 py-2.5 text-left text-[13.5px] font-medium text-accent-ink hover:bg-accent-tint/50"
                      >
                        + Add shot
                      </button>
                      <button
                        onClick={() => openShotlist(block)}
                        className="flex-1 border-l border-line/60 bg-surface-2/50 px-4 py-2.5 text-left text-[13.5px] font-medium text-accent-ink hover:bg-accent-tint/50"
                      >
                        <StarsIcon size={13} className="inline mr-1 -mt-0.5" /> Generate list
                      </button>
                    </div>
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
            {error && (
              <p className="rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            )}
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
            <div className="grid grid-cols-2 gap-3">
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
              <Field label="Minutes needed">
                <Input
                  type="number"
                  min={1}
                  value={draft.durationMinutes}
                  onChange={(e) =>
                    setDraft({ ...draft, durationMinutes: Number(e.target.value) || 1 })
                  }
                />
              </Field>
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Adding…" : "Add shot"}
            </Button>
          </form>
        )}
      </Modal>

      <Modal
        open={shotlistBlock !== null}
        onClose={closeShotlist}
        title={shotlistBlock ? `Generate shots for "${shotlistBlock.title}"` : "Generate shot list"}
      >
        {shotlistBlock && (
          <div className="space-y-3">
            {shotlistError === "MISSING_API_KEY" ? (
              <div className="rounded-lg bg-surface-2 p-4 outline outline-2 outline-accent">
                <h3 className="font-semibold text-accent-ink">API Key Required</h3>
                <p className="mt-1 text-[13.5px] text-ink-soft">
                  The AI shot list builder requires an Anthropic API key. Add{" "}
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
            ) : shotlistError ? (
              <p className="rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">
                {shotlistError}
              </p>
            ) : null}

            {!shotlistDrafts ? (
              <>
                <Field label="Who needs group or family photos?">
                  <Textarea
                    rows={5}
                    autoFocus
                    value={shotlistDescription}
                    onChange={(e) => setShotlistDescription(e.target.value)}
                    placeholder={SHOTLIST_EXAMPLE}
                  />
                </Field>
                <Button
                  onClick={generateShotlist}
                  disabled={shotlistBusy || shotlistDescription.trim().length < 10}
                  className="w-full"
                >
                  {shotlistBusy ? (
                    <>
                      <Spinner /> Building your shot list…
                    </>
                  ) : (
                    <>
                      <StarsIcon size={16} className="inline mr-1 -mt-0.5" /> Generate shot list
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between px-1">
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                    Generated · editable
                  </p>
                  <p className="text-[13px] text-ink-faint">{shotlistDrafts.length} shots</p>
                </div>
                <ul className="max-h-[45dvh] space-y-2 overflow-y-auto">
                  {shotlistDrafts.map((d, i) => (
                    <li key={i} className="rounded-lg bg-surface-2 p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={d.title}
                          onChange={(e) => updateShotlistDraft(i, { title: e.target.value })}
                          className="!h-9 flex-1 font-semibold !text-[13.5px]"
                        />
                        <Input
                          type="number"
                          min={1}
                          value={d.duration_minutes}
                          onChange={(e) =>
                            updateShotlistDraft(i, {
                              duration_minutes: Number(e.target.value) || 1,
                            })
                          }
                          className="!h-9 !w-16 shrink-0 !text-[13px]"
                        />
                        <button
                          onClick={() => removeShotlistDraft(i)}
                          aria-label="Remove shot"
                          className="shrink-0 rounded-md p-1.5 text-ink-faint hover:bg-danger-tint hover:text-danger"
                        >
                          <Cancel01Icon size={14} />
                        </button>
                      </div>
                      {d.description ? (
                        <p className="mt-1.5 px-1 text-[12.5px] text-ink-soft">{d.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShotlistDrafts(null)}
                    className="flex-1 rounded-md px-3 py-2.5 text-[13.5px] font-medium text-ink-faint hover:bg-surface-2"
                  >
                    Back
                  </button>
                  <Button
                    onClick={saveShotlist}
                    disabled={shotlistSaving || shotlistDrafts.length === 0}
                    className="flex-[2]"
                  >
                    {shotlistSaving
                      ? "Adding…"
                      : `Add ${shotlistDrafts.length} shot${shotlistDrafts.length === 1 ? "" : "s"}`}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {detailShot && (
        <ShotDetailModal
          shot={detailShot}
          canEdit={canEditShot(viewerRole, detailShot, userId)}
          onClose={() => setDetailShotId(null)}
          onChange={(updated) =>
            setShots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
          }
        />
      )}
    </section>
  );
}
