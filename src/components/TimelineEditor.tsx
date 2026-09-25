"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { blockTimes, durationLabel, toTimeInput } from "@/lib/time";
import { FormattedTime } from "@/components/FormattedTime";
import { Button, EmptyState, Field, Input, Modal, Textarea, FloatingActionButton } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import {
  StarsIcon,
  DragDropVerticalIcon,
  Scissor01Icon,
  Diamond01Icon,
  UserGroupIcon,
  Camera01Icon,
  Activity01Icon,
  Home01Icon,
  SquareIcon,
  BookmarkAdd01Icon,
  Copy01Icon,
  Delete02Icon,
  Add01Icon,
  Search01Icon,
  Clock01Icon,
} from "hugeicons-react";
import type { BlockRow, EventRow, TemplateRow, TemplateBlockRow } from "@/lib/types";

type TemplateWithCount = TemplateRow & { blockCount: number };

type BlockDraft = {
  id?: string;
  title: string;
  start: string;
  end: string;
  location: string;
  notes: string;
};

const EMPTY_DRAFT: BlockDraft = {
  title: "",
  start: "10:00",
  end: "11:00",
  location: "",
  notes: "",
};

// Each branch renders its own statically-named icon tag rather than
// selecting a component reference into a variable — the latter trips the
// "no components created during render" lint rule, since static analysis
// can't tell a fixed set of hoisted icon components from a dynamically
// created one.
function BlockIcon({ title, className }: { title: string; className?: string }) {
  const t = title.toLowerCase();
  if (t.includes("hair") || t.includes("makeup") || t.includes("prep"))
    return <Scissor01Icon size={20} className={className} />;
  if (t.includes("dress") || t.includes("ring") || t.includes("detail"))
    return <Diamond01Icon size={20} className={className} />;
  if (t.includes("family") || t.includes("party") || t.includes("group"))
    return <UserGroupIcon size={20} className={className} />;
  if (t.includes("photo") || t.includes("portrait") || t.includes("shot"))
    return <Camera01Icon size={20} className={className} />;
  if (t.includes("ceremony") || t.includes("venue") || t.includes("arrive"))
    return <Home01Icon size={20} className={className} />;
  if (t.includes("dance") || t.includes("party") || t.includes("cocktail"))
    return <Activity01Icon size={20} className={className} />;
  return <SquareIcon size={20} className={className} />;
}

function getBlockColor(title: string) {
  const t = title.toLowerCase();
  if (t.includes("ceremony") || t.includes("vow")) return { dot: "bg-amber-400", border: "border-l-amber-400 text-amber-500" };
  if (t.includes("hair") || t.includes("prep") || t.includes("makeup")) return { dot: "bg-emerald-400", border: "border-l-emerald-400 text-emerald-500" };
  if (t.includes("photo") || t.includes("portrait") || t.includes("shot")) return { dot: "bg-purple-400", border: "border-l-purple-400 text-purple-400" };
  if (t.includes("dance") || t.includes("party") || t.includes("dj")) return { dot: "bg-rose-400", border: "border-l-rose-400 text-rose-400" };
  if (t.includes("dinner") || t.includes("cake") || t.includes("cocktail")) return { dot: "bg-cyan-400", border: "border-l-cyan-400 text-cyan-400" };
  return { dot: "bg-accent", border: "border-l-accent text-accent" };
}

export function TimelineEditor({
  event,
  initialBlocks,
  isOwner,
}: {
  event: EventRow;
  initialBlocks: BlockRow[];
  isOwner: boolean;
}) {
  const supabase = createClient();
  const [blocks, setBlocks] = useState(
    [...initialBlocks].sort((a, b) => a.position - b.position)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateWithCount[] | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);

  // Unlike LiveBoard/GuestLiveBoard, this tab had no realtime subscription
  // at all — one owner reordering or editing blocks never reached anyone
  // else's Timeline tab until they refreshed. Position isn't just a field
  // on the changed row here, it's the array's own order, so every branch
  // re-sorts by position after merging the change in.
  useEffect(() => {
    const channel = supabase
      .channel(`timeline-${event.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocks", filter: `event_id=eq.${event.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as BlockRow;
            setBlocks((prev) =>
              prev.some((b) => b.id === row.id)
                ? prev
                : [...prev, row].sort((a, b) => a.position - b.position)
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as BlockRow;
            setBlocks((prev) =>
              prev.map((b) => (b.id === row.id ? row : b)).sort((a, b) => a.position - b.position)
            );
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setBlocks((prev) => prev.filter((b) => b.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, event.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
  );

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const previous = blocks;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);

    // Clock times stay attached to the slot, not the block — dragging a
    // block into a new position gives it that slot's start time, same as
    // reordering entries in a fixed schedule. The block keeps its own
    // duration; only when it starts moves. Without this, a dragged block
    // keeps its old time and the list order and the clock times drift
    // apart from each other.
    const slotStarts = [...blocks]
      .sort((a, b) => a.position - b.position)
      .map((b) => b.start_time);

    const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, i) => {
      const ownDurationMs = new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
      const slotStart = new Date(slotStarts[i]);
      return {
        ...b,
        position: i,
        start_time: slotStart.toISOString(),
        end_time: new Date(slotStart.getTime() + ownDurationMs).toISOString(),
      };
    });
    setError(null);
    setBlocks(reordered);

    const results = await Promise.all(
      reordered.map((b) =>
        supabase
          .from("blocks")
          .update({ position: b.position, start_time: b.start_time, end_time: b.end_time })
          .eq("id", b.id)
      )
    );
    if (results.some((r) => r.error)) {
      setBlocks(previous);
      setError("Couldn't save the new order — please try again.");
    }
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError(null);

    const times = blockTimes(event.date, draft.start, draft.end);
    const payload = {
      title: draft.title,
      ...times,
      location: draft.location || null,
      notes: draft.notes || null,
    };

    if (draft.id) {
      const { data, error: saveError } = await supabase
        .from("blocks")
        .update(payload)
        .eq("id", draft.id)
        .select("*")
        .single();
      if (saveError || !data) {
        setError(saveError?.message ?? "Couldn't save this block — please try again.");
        setBusy(false);
        return;
      }
      setBlocks((prev) => prev.map((b) => (b.id === draft.id ? (data as BlockRow) : b)));
    } else {
      const { data, error: saveError } = await supabase
        .from("blocks")
        .insert({ ...payload, event_id: event.id, position: blocks.length })
        .select("*")
        .single();
      if (saveError || !data) {
        setError(saveError?.message ?? "Couldn't create this block — please try again.");
        setBusy(false);
        return;
      }
      setBlocks((prev) => [...prev, data as BlockRow]);
    }

    setBusy(false);
    setDraft(null);
  }

  async function deleteBlock(id: string) {
    if (!confirm("Delete this block and its shots?")) return;
    const previous = blocks;
    setError(null);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setDraft(null);
    const { error: deleteError } = await supabase.from("blocks").delete().eq("id", id);
    if (deleteError) {
      setBlocks(previous);
      setError("Couldn't delete this block — please try again.");
    }
  }

  async function toggleGuestVisible(block: BlockRow) {
    const guest_visible = !block.guest_visible;
    setError(null);
    setBlocks((prev) =>
      prev.map((b) => (b.id === block.id ? { ...b, guest_visible } : b))
    );
    const { error: toggleError } = await supabase
      .from("blocks")
      .update({ guest_visible })
      .eq("id", block.id);
    if (toggleError) {
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, guest_visible: !guest_visible } : b))
      );
      setError("Couldn't update guest visibility — please try again.");
    }
  }

  async function saveAsTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (blocks.length === 0) return;
    setSavingTemplate(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Lost connection to your account. Please try again.");
      setSavingTemplate(false);
      return;
    }

    const { data: template, error: templateError } = await supabase
      .from("templates")
      .insert({ name: templateName, owner_id: user.id })
      .select("id")
      .single();
    if (templateError || !template) {
      setError(templateError?.message ?? "Couldn't save this template — please try again.");
      setSavingTemplate(false);
      return;
    }

    const rows = blocks.map((b, i) => ({
      template_id: template.id,
      title: b.title,
      start_time: toTimeInput(b.start_time),
      end_time: toTimeInput(b.end_time),
      location: b.location,
      notes: b.notes,
      position: i,
    }));
    const { error: blocksError } = await supabase.from("template_blocks").insert(rows);
    if (blocksError) {
      // Clean up the now-empty template rather than leaving an orphan
      // that would later show up in the list with zero blocks.
      await supabase.from("templates").delete().eq("id", template.id);
      setError("Couldn't save this template — please try again.");
      setSavingTemplate(false);
      return;
    }

    setTemplates(null); // stale — refetch next time the apply modal opens
    setSavingTemplate(false);
    setSaveTemplateOpen(false);
    setTemplateName("");
  }

  async function openApplyTemplate() {
    setApplyTemplateOpen(true);
    if (templates !== null) return;
    setTemplatesLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("templates")
      .select("*, template_blocks(count)")
      .order("created_at", { ascending: false });
    setTemplatesLoading(false);
    if (fetchError || !data) {
      setError("Couldn't load your templates — please try again.");
      return;
    }
    setTemplates(
      data.map((t) => {
        const row = t as TemplateRow & { template_blocks: { count: number }[] };
        return { ...row, blockCount: row.template_blocks[0]?.count ?? 0 };
      })
    );
  }

  async function applyTemplate(templateId: string) {
    if (blocks.length > 0 && !confirm("Replace the current timeline with this template?")) return;
    setApplyingTemplateId(templateId);
    setError(null);

    const { data: templateBlocks, error: fetchError } = await supabase
      .from("template_blocks")
      .select("*")
      .eq("template_id", templateId)
      .order("position");
    if (fetchError || !templateBlocks || templateBlocks.length === 0) {
      setError("Couldn't load this template — please try again.");
      setApplyingTemplateId(null);
      return;
    }

    const rows = (templateBlocks as TemplateBlockRow[]).map((tb, i) => ({
      event_id: event.id,
      title: tb.title,
      ...blockTimes(event.date, tb.start_time, tb.end_time),
      location: tb.location,
      notes: tb.notes,
      position: i,
    }));

    // Same order as the AI builder's save: insert the new blocks before
    // removing the old ones, so a failed insert leaves the existing
    // timeline untouched instead of already gone.
    const oldBlockIds = blocks.map((b) => b.id);
    const { data: inserted, error: insertError } = await supabase
      .from("blocks")
      .insert(rows)
      .select("*");
    if (insertError || !inserted) {
      setError(insertError?.message ?? "Couldn't apply this template — please try again.");
      setApplyingTemplateId(null);
      return;
    }

    if (oldBlockIds.length > 0) {
      const { error: deleteError } = await supabase.from("blocks").delete().in("id", oldBlockIds);
      if (deleteError) {
        setError(
          "Applied the template, but couldn't clear the old timeline — you may see duplicate blocks. Please refresh and remove them by hand."
        );
        setApplyingTemplateId(null);
        setBlocks((prev) =>
          [...prev, ...(inserted as BlockRow[])].sort((a, b) => a.position - b.position)
        );
        setApplyTemplateOpen(false);
        return;
      }
    }

    setBlocks((inserted as BlockRow[]).sort((a, b) => a.position - b.position));
    setApplyingTemplateId(null);
    setApplyTemplateOpen(false);
  }

  async function deleteTemplate(templateId: string) {
    if (!confirm("Delete this template?")) return;
    const previous = templates;
    setTemplates((prev) => (prev ? prev.filter((t) => t.id !== templateId) : prev));
    const { error: deleteError } = await supabase.from("templates").delete().eq("id", templateId);
    if (deleteError) {
      setTemplates(previous);
      setError("Couldn't delete this template — please try again.");
    }
  }

  const filteredBlocks = searchQuery.trim()
    ? blocks.filter(
        (b) =>
          b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (b.location && b.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : blocks;

  return (
    <section className="relative pb-12">
      {error && (
        <p className="mb-4 rounded-xl bg-danger-tint border border-danger/20 px-3.5 py-2.5 text-[13px] text-danger">
          {error}
        </p>
      )}

      {/* Top Search & Actions Bar */}
      <div className="mb-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search01Icon
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timeline events…"
              className="h-11 w-full rounded-xl bg-surface-2/70 border border-line pl-10 pr-12 text-[14px] text-ink placeholder:text-ink-faint focus:border-accent focus:bg-surface-1 focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-faint hover:text-ink px-1.5 py-0.5 rounded bg-surface-3"
              >
                Clear
              </button>
            )}
          </div>
          <Link
            href={`/events/${event.id}/generate`}
            title="AI Timeline Builder"
            className="flex h-11 items-center gap-1.5 px-3.5 rounded-xl bg-accent-tint text-accent-ink border border-accent/30 font-semibold text-[13.5px] hover:bg-accent-tint-strong hover:border-accent transition-all shrink-0"
          >
            <StarsIcon size={17} className="text-accent" />
            <span className="hidden sm:inline">AI Builder</span>
            <span className="sm:hidden">AI</span>
          </Link>
        </div>

        {isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button onClick={() => setDraft(EMPTY_DRAFT)} size="sm">
                <Add01Icon size={16} /> Add block
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {blocks.length > 0 && (
                <button
                  onClick={() => setSaveTemplateOpen(true)}
                  className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-faint hover:text-accent transition-colors"
                >
                  <BookmarkAdd01Icon size={14} /> Save as template
                </button>
              )}
              <button
                onClick={openApplyTemplate}
                className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-faint hover:text-accent transition-colors"
              >
                <Copy01Icon size={14} /> Use a template
              </button>
            </div>
          </div>
        )}
      </div>

      {blocks.length === 0 ? (
        <EmptyState
          icon={<Clock01Icon size={30} className="text-accent" />}
          title="No timeline events yet"
          body={
            isOwner
              ? "Tap + to add your first event, or let the AI builder draft the entire wedding day in seconds."
              : "The photographer hasn't built the timeline yet."
          }
          action={
            isOwner ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => setDraft(EMPTY_DRAFT)}>
                  <Add01Icon size={18} /> Add block
                </Button>
                <Link
                  href={`/events/${event.id}/generate`}
                  className="inline-flex items-center justify-center gap-2 font-medium rounded-xl h-11 px-4 text-[14.5px] bg-gradient-to-r from-purple-600 via-indigo-600 to-accent text-white shadow-md hover:shadow-lg transition-all"
                >
                  <StarsIcon size={18} /> Generate with AI
                </Link>
              </div>
            ) : null
          }
        />
      ) : filteredBlocks.length === 0 ? (
        <EmptyState
          icon={<Search01Icon size={30} className="text-ink-faint" />}
          title="No events found"
          body={`No timeline blocks found matching “${searchQuery}”.`}
          action={
            <Button variant="tonal" onClick={() => setSearchQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <DndContext
          id={`timeline-dnd-${event.id}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={filteredBlocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <motion.ul
              className="relative space-y-2.5"
              initial="hidden"
              animate="show"
              variants={{
                show: { transition: { staggerChildren: 0.04 } }
              }}
            >
              <AnimatePresence mode="popLayout">
                {filteredBlocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    canEdit={isOwner}
                    onEdit={() =>
                      setDraft({
                        id: block.id,
                        title: block.title,
                        start: toTimeInput(block.start_time),
                        end: toTimeInput(block.end_time),
                        location: block.location ?? "",
                        notes: block.notes ?? "",
                      })
                    }
                    onToggleGuestVisible={() => toggleGuestVisible(block)}
                  />
                ))}
              </AnimatePresence>
            </motion.ul>
          </SortableContext>
        </DndContext>
      )}

      {/* Floating Action Button for mobile */}
      {isOwner && (
        <FloatingActionButton
          onClick={() => setDraft(EMPTY_DRAFT)}
          icon={<Add01Icon size={22} />}
          label="Add block"
        />
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit block" : "Add block"}
      >
        {draft && (
          <form onSubmit={saveDraft} className="space-y-3">
            {error && (
              <p className="rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            )}
            <Field label="Title">
              <Input
                required
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Bridal prep"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts">
                <Input
                  type="time"
                  required
                  value={draft.start}
                  onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                />
              </Field>
              <Field label="Ends">
                <Input
                  type="time"
                  required
                  value={draft.end}
                  onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Location">
              <Input
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="Bridal suite"
              />
            </Field>
            <Field label="Notes">
              <Textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Details, reminders, vendor contacts…"
              />
            </Field>
            <div className="flex gap-2 pt-1">
              {draft.id && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => deleteBlock(draft.id!)}
                >
                  Delete
                </Button>
              )}
              <Button type="submit" disabled={busy} className="flex-1">
                {busy ? "Saving…" : "Save block"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        title="Save as template"
      >
        <form onSubmit={saveAsTemplate} className="space-y-3">
          {error && (
            <p className="rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">{error}</p>
          )}
          <Field label="Template name">
            <Input
              required
              autoFocus
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Classic wedding day"
            />
          </Field>
          <p className="text-[12.5px] text-ink-faint">
            Saves the {blocks.length} block{blocks.length === 1 ? "" : "s"} on this timeline —
            titles, times, locations, and notes — as a reusable template.
          </p>
          <Button
            type="submit"
            disabled={savingTemplate || templateName.trim().length === 0}
            className="w-full"
          >
            {savingTemplate ? "Saving…" : "Save template"}
          </Button>
        </form>
      </Modal>

      <Modal
        open={applyTemplateOpen}
        onClose={() => setApplyTemplateOpen(false)}
        title="Use a template"
      >
        <div className="space-y-3">
          {error && (
            <p className="rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">{error}</p>
          )}
          {templatesLoading ? (
            <p className="py-6 text-center text-[13.5px] text-ink-faint">Loading…</p>
          ) : !templates || templates.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-ink-faint">
              No saved templates yet — build a timeline, then &ldquo;Save as template&rdquo; to
              reuse it later.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{t.name}</p>
                    <p className="text-[12px] text-ink-faint">
                      {t.blockCount} block{t.blockCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    onClick={() => applyTemplate(t.id)}
                    disabled={applyingTemplateId !== null}
                    className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
                  >
                    {applyingTemplateId === t.id ? "Applying…" : "Apply"}
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    aria-label="Delete template"
                    disabled={applyingTemplateId !== null}
                    className="shrink-0 rounded-md p-1.5 text-ink-faint hover:bg-danger-tint hover:text-danger disabled:opacity-60"
                  >
                    <Delete02Icon size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </section>
  );
}

function SortableBlock({
  block,
  canEdit,
  onEdit,
  onToggleGuestVisible,
}: {
  block: BlockRow;
  canEdit: boolean;
  onEdit: () => void;
  onToggleGuestVisible: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id, disabled: !canEdit });
  const colorInfo = getBlockColor(block.title);

  return (
    <motion.li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      variants={{
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
      }}
      layout="position"
      whileHover={isDragging ? {} : { scale: 1.008 }}
      whileDrag={{ scale: 1.02 }}
      className={`group relative z-[1] flex items-stretch rounded-2xl bg-surface-1 border border-line hover:border-accent/40 shadow-sm transition-all overflow-hidden ${
        isDragging ? "z-10 bg-surface-2 ring-2 ring-accent shadow-xl" : ""
      }`}
    >
      {/* Category Left Rail Indicator */}
      <div className={`w-1.5 shrink-0 ${colorInfo.dot}`} />

      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Reorder"
          className="flex w-9 shrink-0 cursor-grab touch-none items-center justify-center text-ink-faint active:cursor-grabbing hover:text-ink"
        >
          <DragDropVerticalIcon size={20} />
        </button>
      )}
      <button
        onClick={canEdit ? onEdit : undefined}
        className={`flex min-w-0 flex-1 items-center gap-3 py-3 pr-3 text-left ${
          canEdit ? "" : "pl-4"
        }`}
      >
        <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-surface-2 text-ink-soft group-hover:bg-accent-tint group-hover:text-accent transition-colors border border-line">
          <BlockIcon title={block.title} className="transition-colors" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 font-mono text-[13px] font-semibold text-accent-ink">
              <FormattedTime iso={block.start_time} />
            </span>
            <span className="truncate text-[15px] font-semibold text-ink">{block.title}</span>
          </div>
          {(block.location || block.notes) && (
            <p className="mt-0.5 truncate text-[13px] text-ink-soft">
              {[block.location, block.notes].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-2 pr-3">
        <span className="rounded-full bg-surface-2 border border-line px-2.5 py-0.5 text-[12px] font-medium text-ink-soft">
          {durationLabel(block.start_time, block.end_time)}
        </span>
        {canEdit && (
          <button
            onClick={onToggleGuestVisible}
            aria-label={block.guest_visible ? "Hide from guests" : "Show to guests"}
            title={
              block.guest_visible
                ? "Visible to guests — click to hide"
                : "Hidden from guests — click to show"
            }
            className={`flex shrink-0 items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              block.guest_visible
                ? "bg-ok-tint text-ok-ink hover:bg-ok-tint/80 border border-ok/20"
                : "bg-surface-2 text-ink-faint hover:bg-surface-3 border border-line"
            }`}
          >
            {block.guest_visible ? "Visible" : "Hidden"}
          </button>
        )}
      </div>
    </motion.li>
  );
}
