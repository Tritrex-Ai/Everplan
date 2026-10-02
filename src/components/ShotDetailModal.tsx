"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { LinkList } from "@/components/ShotReferenceInputs";
import { uploadShotPhotos } from "@/lib/shot-photos";
import { Cancel01Icon, LockKeyIcon } from "hugeicons-react";
import { motion, useDragControls } from "framer-motion";
import type { ShotRow } from "@/lib/types";

type Photo = { path: string; url: string };

export function ShotDetailModal({
  shot,
  canEdit,
  onClose,
  onChange,
}: {
  shot: ShotRow;
  canEdit: boolean;
  onClose: () => void;
  onChange: (shot: ShotRow) => void;
}) {
  const supabase = createClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(shot.title);
  const [description, setDescription] = useState(shot.description ?? "");
  const [priority, setPriority] = useState(shot.priority);
  const [durationMinutes, setDurationMinutes] = useState(shot.duration_minutes);
  const [saving, setSaving] = useState(false);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [savingLinks, setSavingLinks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (shot.reference_images.length === 0) {
        if (!cancelled) {
          setPhotos([]);
          setLoadingPhotos(false);
        }
        return;
      }
      const entries = await Promise.all(
        shot.reference_images.map(async (path) => {
          const { data, error } = await supabase.storage
            .from("shot-photos")
            .createSignedUrl(path, 3600);
          if (error && (error.message.includes("Bucket not found") || error.message.includes("row-level security"))) {
             setError("Storage bucket 'shot-photos' is not configured. Run the storage_setup.sql migration.");
          }
          return { path, url: data?.signedUrl ?? "" };
        })
      );
      if (!cancelled) {
        setPhotos(entries.filter((p) => p.url));
        setLoadingPhotos(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shot.reference_images, supabase]);

  async function saveDetails() {
    setSaving(true);
    setError(null);
    const { data, error } = await supabase
      .from("shots")
      .update({ title, description: description || null, priority, duration_minutes: durationMinutes })
      .eq("id", shot.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onChange(data as ShotRow);
  }

  async function uploadPhotos(files: FileList) {
    setUploading(true);
    setError(null);

    const { paths: newPaths, error: uploadError } = await uploadShotPhotos(
      supabase,
      shot.event_id,
      shot.id,
      Array.from(files)
    );
    if (uploadError) setError(uploadError);

    if (newPaths.length > 0) {
      const updated = [...shot.reference_images, ...newPaths];
      const { data, error } = await supabase
        .from("shots")
        .update({ reference_images: updated })
        .eq("id", shot.id)
        .select("*")
        .single();
      if (!error && data) onChange(data as ShotRow);
    }

    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function removePhoto(path: string) {
    setDeletingPath(path);
    setError(null);

    const { error: storageError } = await supabase.storage
      .from("shot-photos")
      .remove([path]);
    if (storageError) {
      setError(storageError.message);
      setDeletingPath(null);
      return;
    }

    const updated = shot.reference_images.filter((p) => p !== path);
    const { data, error } = await supabase
      .from("shots")
      .update({ reference_images: updated })
      .eq("id", shot.id)
      .select("*")
      .single();

    setDeletingPath(null);
    if (error) {
      setError(error.message);
      return;
    }
    // Only drop it from the visible grid once both the storage object and
    // the DB row are confirmed gone — an optimistic removal here would show
    // a photo as deleted even if either call actually failed.
    setPhotos((prev) => prev.filter((p) => p.path !== path));
    onChange(data as ShotRow);
  }

  async function saveLinks(next: string[]) {
    setSavingLinks(true);
    setError(null);
    const { data, error } = await supabase
      .from("shots")
      .update({ reference_links: next })
      .eq("id", shot.id)
      .select("*")
      .single();
    setSavingLinks(false);
    if (error) {
      setError(error.message);
      return;
    }
    onChange(data as ShotRow);
  }

  async function toggleShare() {
    const next = shot.visibility === "shared" ? "private" : "shared";
    setError(null);
    const { data, error } = await supabase
      .from("shots")
      .update({ visibility: next })
      .eq("id", shot.id)
      .select("*")
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    onChange(data as ShotRow);
  }

  const dragControls = useDragControls();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) onClose();
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border-t border-line bg-surface-1 p-5 sm:max-w-lg sm:rounded-2xl sm:border"
      >
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="-mt-2 mb-1 flex cursor-grab touch-none justify-center py-2 active:cursor-grabbing sm:hidden"
        >
          <div className="h-1.5 w-12 rounded-full bg-ink-faint/30" />
        </div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Shot detail</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-faint hover:bg-surface-2 hover:text-ink"
          >
            <Cancel01Icon size={16} />
          </button>
        </div>

        {canEdit ? (
          <div className="space-y-3">
            <Field label="Shot">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Details">
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ShotRow["priority"])}
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
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value) || 1)}
                />
              </Field>
            </div>
            <Button size="sm" variant="tonal" onClick={saveDetails} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-[16px] font-semibold">{shot.title}</p>
            {shot.description && (
              <p className="mt-1 text-[14px] text-ink-soft">{shot.description}</p>
            )}
            {shot.priority === "high" && (
              <Badge tone="warn" className="mt-2">
                Must-get
              </Badge>
            )}
          </div>
        )}

        {canEdit && (
          <button
            onClick={toggleShare}
            className={`mt-4 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left ${
              shot.visibility === "shared" ? "bg-accent-tint" : "bg-surface-2"
            }`}
          >
            <LockKeyIcon
              size={16}
              className={shot.visibility === "shared" ? "text-accent-ink" : "text-ink-faint"}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-ink">
                {shot.visibility === "shared" ? "Shared with the event" : "Private to you"}
              </span>
              <span className="block text-[12.5px] text-ink-soft">
                {shot.visibility === "shared"
                  ? "Everyone on this event can see this shot, its photos and links. Tap to make it private."
                  : "Only you can see this shot. Tap to share it with everyone on the event."}
              </span>
            </span>
          </button>
        )}

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
              Reference images
            </p>
            {canEdit && (
              <button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="text-[13px] font-medium text-accent-ink hover:underline disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "+ Add photo"}
              </button>
            )}
            {canEdit && (
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => e.target.files && uploadPhotos(e.target.files)}
              />
            )}
          </div>

          {loadingPhotos ? (
            <div className="flex h-20 items-center justify-center text-ink-faint">
              <Spinner />
            </div>
          ) : photos.length === 0 ? (
            <p className="rounded-xl bg-surface-2 px-4 py-6 text-center text-[13.5px] text-ink-faint">
              {canEdit
                ? "No reference photos yet — add a pose reference or reminder shot."
                : "No reference photos on this shot."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.path} className="group relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt=""
                    className="h-full w-full rounded-xl object-cover"
                  />
                  {canEdit && (
                    <button
                      onClick={() => removePhoto(photo.path)}
                      disabled={deletingPath === photo.path}
                      aria-label="Remove photo"
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-[12px] text-white opacity-80 transition-opacity hover:opacity-100 disabled:opacity-50"
                    >
                      {deletingPath === photo.path ? "…" : <Cancel01Icon size={14} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {(canEdit || (shot.reference_links ?? []).length > 0) && (
            <div className="mt-5">
              <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                Reference links
              </p>
              <LinkList
                links={shot.reference_links ?? []}
                canEdit={canEdit}
                disabled={savingLinks}
                onChange={saveLinks}
              />
            </div>
          )}

          {error && (
            <p className="mt-2 rounded-xl bg-danger-tint px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
