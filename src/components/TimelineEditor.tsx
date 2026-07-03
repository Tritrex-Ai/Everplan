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
import { blockTimes, durationLabel, formatTime, toTimeInput } from "@/lib/time";
import { Button, EmptyState, Field, Input, Modal, Textarea } from "@/components/ui";
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } })
  );

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({
      ...b,
      position: i,
    }));
    setBlocks(reordered);

    await Promise.all(
      reordered.map((b) =>
        supabase.from("blocks").update({ position: b.position }).eq("id", b.id)
      )
    );
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);

    const times = blockTimes(event.date, draft.start, draft.end);
    const payload = {
      title: draft.title,
      ...times,
      location: draft.location || null,
      notes: draft.notes || null,
    };

    if (draft.id) {
      const { data } = await supabase
        .from("blocks")
        .update(payload)
        .eq("id", draft.id)
        .select("*")
        .single();
      if (data) {
        setBlocks((prev) => prev.map((b) => (b.id === draft.id ? (data as BlockRow) : b)));
      }
    } else {
      const { data } = await supabase
        .from("blocks")
        .insert({ ...payload, event_id: event.id, position: blocks.length })
        .select("*")
        .single();
      if (data) setBlocks((prev) => [...prev, data as BlockRow]);
    }

    setBusy(false);
    setDraft(null);
  }

  async function deleteBlock(id: string) {
    if (!confirm("Delete this block and its shots?")) return;
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setDraft(null);
    await supabase.from("blocks").delete().eq("id", id);
  }

  return (
    <section>
      {isOwner && (
        <div className="mb-4 flex gap-2">
          <Button onClick={() => setDraft(EMPTY_DRAFT)} className="flex-1">
            + Add block
          </Button>
          <Link
            href={`/events/${event.id}/generate`}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md bg-accent-tint px-4 text-[15px] font-medium text-accent-ink hover:bg-accent-tint-strong"
          >
            ✦ AI builder
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
            <ul className="space-y-2">
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
                />
              ))}
            </ul>
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
}: {
  block: BlockRow;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id, disabled: !canEdit });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-stretch rounded-lg bg-surface-1 ${
        isDragging ? "z-10 bg-accent-tint" : ""
      }`}
    >
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Reorder"
          className="flex w-9 shrink-0 cursor-grab touch-none items-center justify-center text-ink-faint active:cursor-grabbing"
        >
          ⠿
        </button>
      )}
      <button
        onClick={canEdit ? onEdit : undefined}
        className={`flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pr-4 text-left ${
          canEdit ? "" : "pl-4"
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 font-mono text-[13px] font-medium text-accent-ink">
              {formatTime(block.start_time)}
            </span>
            <span className="truncate text-[15px] font-semibold">{block.title}</span>
          </div>
          {(block.location || block.notes) && (
            <p className="mt-0.5 truncate text-[13px] text-ink-soft">
              {[block.location, block.notes].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium text-ink-soft">
          {durationLabel(block.start_time, block.end_time)}
        </span>
      </button>
    </li>
  );
}
