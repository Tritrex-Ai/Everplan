"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { Cancel01Icon } from "hugeicons-react";
import type { ShotRow } from "@/lib/types";

type Photo = { path: string; url: string };

export function ShotDetailModal({
  shot,
  isOwner,
  onClose,
  onChange,
}: {
  shot: ShotRow;
  isOwner: boolean;
  onClose: () => void;
  onChange: (shot: ShotRow) => void;
}) {
  const supabase = createClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(shot.title);
  const [description, setDescription] = useState(shot.description ?? "");
  const [priority, setPriority] = useState(shot.priority);
  const [saving, setSaving] = useState(false);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
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
          const { data } = await supabase.storage
            .from("shot-photos")
            .createSignedUrl(path, 3600);
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
      .update({ title, description: description || null, priority })
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

    const newPaths: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${shot.event_id}/${shot.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("shot-photos").upload(path, file);
      if (error) {
        setError(error.message);
        continue;
      }
      newPaths.push(path);
    }

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-xl bg-surface-1 p-5 sm:max-w-lg sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Shot detail</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-surface-2 hover:text-ink"
          >
            <Cancel01Icon size={16} />
          </button>
        </div>

        {isOwner ? (
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

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
              Reference images
            </p>
            {isOwner && (
              <button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="text-[13px] font-medium text-accent-ink hover:underline disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "+ Add photo"}
              </button>
            )}
            {isOwner && (
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
            <p className="rounded-md bg-surface-2 px-4 py-6 text-center text-[13.5px] text-ink-faint">
              {isOwner
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
                    className="h-full w-full rounded-md object-cover"
                  />
                  {isOwner && (
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

          {error && (
            <p className="mt-2 rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
