"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { Tick02Icon, Cancel01Icon, Delete02Icon } from "hugeicons-react";
import type { EventImageRow } from "@/lib/types";

type Photo = EventImageRow & { url: string };

/** Owner moderation queue + published gallery for guest-uploaded photos.
 * Team members see the published gallery only — approve/reject/delete are
 * owner-only, enforced both here and by RLS ("owners moderate event
 * images" / "owners delete event images"). */
export function GuestPhotosPanel({
  eventId,
  initialImages,
  isOwner,
}: {
  eventId: string;
  initialImages: EventImageRow[];
  isOwner: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [images, setImages] = useState(initialImages);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        images.map(async (img) => {
          const { data } = await supabase.storage
            .from("guest-photos")
            .createSignedUrl(img.storage_path, 3600);
          return { ...img, url: data?.signedUrl ?? "" };
        })
      );
      if (!cancelled) {
        setPhotos(entries.filter((p) => p.url));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [images, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`event-images-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_images", filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as EventImageRow;
            setImages((prev) => (prev.some((i) => i.id === row.id) ? prev : [row, ...prev]));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as EventImageRow;
            setImages((prev) => prev.map((img) => (img.id === row.id ? row : img)));
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setImages((prev) => prev.filter((img) => img.id !== oldId));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, eventId]);

  async function approve(photo: Photo) {
    setBusyId(photo.id);
    setError(null);
    const { error } = await supabase
      .from("event_images")
      .update({ approved: true })
      .eq("id", photo.id);
    setBusyId(null);
    if (error) setError(error.message);
  }

  async function remove(photo: Photo) {
    setBusyId(photo.id);
    setError(null);
    const { error: storageError } = await supabase.storage
      .from("guest-photos")
      .remove([photo.storage_path]);
    if (storageError) {
      setError(storageError.message);
      setBusyId(null);
      return;
    }
    const { error: deleteError } = await supabase
      .from("event_images")
      .delete()
      .eq("id", photo.id);
    setBusyId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setImages((prev) => prev.filter((img) => img.id !== photo.id));
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-ink-faint">
        <Spinner />
      </div>
    );
  }

  const pending = isOwner ? photos.filter((p) => !p.approved) : [];
  const approvedPhotos = photos.filter((p) => p.approved);

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
            Pending approval ({pending.length})
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pending.map((photo) => (
              <div key={photo.id} className="group relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  className="h-full w-full rounded-xl object-cover opacity-80"
                />
                {photo.guest_name && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] text-white">
                    {photo.guest_name}
                  </span>
                )}
                <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1.5">
                  <button
                    onClick={() => approve(photo)}
                    disabled={busyId === photo.id}
                    aria-label="Approve photo"
                    className="flex h-8 flex-1 items-center justify-center rounded-lg bg-ok text-white disabled:opacity-50"
                  >
                    <Tick02Icon size={16} />
                  </button>
                  <button
                    onClick={() => remove(photo)}
                    disabled={busyId === photo.id}
                    aria-label="Reject photo"
                    className="flex h-8 flex-1 items-center justify-center rounded-lg bg-danger text-white disabled:opacity-50"
                  >
                    <Cancel01Icon size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
          Gallery ({approvedPhotos.length})
        </p>
        {approvedPhotos.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-4 py-8 text-center text-[13.5px] text-ink-faint">
            No approved guest photos yet — share the guest link to start collecting them.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {approvedPhotos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="h-full w-full rounded-xl object-cover" />
                {isOwner && (
                  <button
                    onClick={() => remove(photo)}
                    disabled={busyId === photo.id}
                    aria-label="Delete photo"
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                  >
                    {busyId === photo.id ? "…" : <Delete02Icon size={13} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-xl bg-danger-tint px-3 py-2 text-[13px] text-danger">{error}</p>
      )}
    </div>
  );
}
