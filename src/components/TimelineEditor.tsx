"use client";

import { useState } from "react";
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
import { Button, EmptyState, Field, Input, Modal, Textarea } from "@/components/ui";
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
} from "hugeicons-react";
import type { BlockRow, EventRow } from "@/lib/types";

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
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section>
      {error && (
        <p className="mb-4 rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}
      {isOwner && (
        <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button onClick={() => setDraft(EMPTY_DRAFT)} className="w-full sm:flex-1">
            + Add block
          </Button>
          <Link
            href={`/events/${event.id}/generate`}
            className="group flex h-11 w-full sm:flex-1 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-accent to-amber-500/80 px-4 text-[15px] font-bold text-white shadow-md hover:shadow-lg hover:from-accent-strong hover:to-amber-500 transition-all"
          >
            <StarsIcon size={18} className="transition-transform group-hover:scale-110 group-hover:rotate-12" /> AI Timeline Builder
          </Link>
        </div>
      )}

      {blocks.length === 0 ? (
        <EmptyState
          title="No timeline yet"
          body={
            isOwner
              ? "Add blocks by hand, or describe the day and let the AI builder draft it for you."
              : "The photographer hasn't built the timeline yet."
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <motion.ul 
              className="space-y-2"
              initial="hidden"
              animate="show"
              variants={{
                show: { transition: { staggerChildren: 0.05 } }
              }}
            >
              <AnimatePresence mode="popLayout">
                {blocks.map((block) => (
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

  return (
    <motion.li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      variants={{
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
      }}
      layout="position"
      whileHover={isDragging ? {} : { scale: 1.01, boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}
      whileDrag={{ scale: 1.03, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
      className={`group flex items-stretch rounded-lg bg-surface-1 shadow-sm ring-1 ring-line/50 transition-colors ${
        isDragging ? "z-10 bg-surface-0 ring-accent" : ""
      }`}
    >
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
        className={`flex min-w-0 flex-1 items-center justify-between gap-4 py-3 pr-4 text-left ${
          canEdit ? "" : "pl-4"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-surface-2 text-ink-soft group-hover:bg-accent-tint group-hover:text-accent transition-colors">
            <BlockIcon title={block.title} className="group-hover:drop-shadow-[0_0_8px_rgba(110,40,210,0.4)] transition-all" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 font-mono text-[13px] font-medium text-accent-ink">
                <FormattedTime iso={block.start_time} />
              </span>
              <span className="truncate text-[15px] font-semibold">{block.title}</span>
            </div>
          {(block.location || block.notes) && (
            <p className="mt-0.5 truncate text-[13px] text-ink-soft">
              {[block.location, block.notes].filter(Boolean).join(" · ")}
            </p>
          )}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium text-ink-soft">
          {durationLabel(block.start_time, block.end_time)}
        </span>
      </button>
      {canEdit && (
        <div className="flex items-center pr-3">
          <button
            onClick={onToggleGuestVisible}
            aria-label={block.guest_visible ? "Hide from guests" : "Show to guests"}
            title={
              block.guest_visible
                ? "Visible to guests — click to hide"
                : "Hidden from guests — click to show"
            }
            className={`flex shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              block.guest_visible
                ? "bg-ok-tint text-ok-ink ring-1 ring-ok-tint/50 shadow-sm hover:bg-ok-tint/80"
                : "bg-surface-2 text-ink-faint hover:bg-surface-3"
            }`}
          >
            {block.guest_visible ? "Visible" : "Hidden"}
          </button>
        </div>
      )}
    </motion.li>
  );
}
