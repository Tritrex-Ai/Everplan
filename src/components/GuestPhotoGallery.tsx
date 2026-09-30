"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import { ImageAdd02Icon } from "hugeicons-react";

type GuestPhoto = { id: string; url: string; caption: string | null; guestName: string | null };

/** Upload + gallery for the no-login guest link. Uploads land pending owner
 * approval (see /api/g/[token]/photos), so a fresh upload never shows up in
 * this same gallery right away — that's expected, not a bug. */
export function GuestPhotoGallery({ token }: { token: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<GuestPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem("everplan-guest-name") ?? "";
    } catch {
      // localStorage can throw in private/locked-down browsers — fine to skip.
      return "";
    }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/g/${token}/photos`);
      const body = await res.json().catch(() => null);
      if (!cancelled && res.ok && body?.photos) setPhotos(body.photos);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function upload(files: FileList) {
    setUploading(true);
    setError(null);
    setJustUploaded(false);

    let anySucceeded = false;
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      if (guestName.trim()) formData.append("guestName", guestName.trim());
      const res = await fetch(`/api/g/${token}/photos`, { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Upload failed — please try again.");
        continue;
      }
      anySucceeded = true;
    }

    if (anySucceeded) {
      setJustUploaded(true);
      try {
        if (guestName.trim()) localStorage.setItem("everplan-guest-name", guestName.trim());
      } catch {
        // Non-essential convenience — fine if it can't persist.
      }
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-night-1 p-4">
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Your name (optional)"
          maxLength={80}
          className="mb-3 w-full rounded-lg bg-night-2 px-3 py-2 text-[14px] text-night-ink placeholder:text-night-ink-soft focus:outline-none"
        />
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-night-accent px-4 py-3 text-[14px] font-semibold text-night-0 disabled:opacity-60"
        >
          <ImageAdd02Icon size={18} />
          {uploading ? "Uploading…" : "Share a photo"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
        {justUploaded && (
          <p className="mt-2 text-center text-[12.5px] text-night-ink-soft">
            Thanks! Your photo is waiting for the couple to approve it.
          </p>
        )}
        {error && <p className="mt-2 text-center text-[12.5px] text-danger">{error}</p>}
      </div>

      {loading ? (
        <div className="flex h-20 items-center justify-center text-night-ink-soft">
          <Spinner />
        </div>
      ) : photos.length === 0 ? (
        <p className="rounded-lg bg-night-1 px-5 py-10 text-center text-[14px] text-night-ink-soft">
          No photos yet — be the first to share one.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.id}
              src={photo.url}
              alt={photo.caption ?? ""}
              className="aspect-square w-full rounded-xl object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}
