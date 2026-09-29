"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input, Select } from "@/components/ui";
import { DatePicker } from "@/components/DatePicker";
import { Image01Icon, Delete02Icon } from "hugeicons-react";
import type { EventRow } from "@/lib/types";

const ACCEPTED_COVER_TYPES = "image/jpeg,image/png,image/webp,image/gif";

/** Cover photo upload — only shown when editing an existing event, since a
 * new one has no id yet to attach the upload to. Uploads immediately on
 * pick (like AccountForm's avatar photo) rather than waiting for the rest
 * of the form to save. */
function EventCoverUpload({ event }: { event: EventRow }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverUrl, setCoverUrl] = useState(event.cover_image_url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/events/${event.id}/cover`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload cover photo");
      setCoverUrl(data.coverImageUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${event.id}/cover`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove cover photo");
      }
      setCoverUrl(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove cover photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">Cover photo</span>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_COVER_TYPES}
        onChange={handleUpload}
        className="hidden"
      />
      <div className="relative h-36 w-full overflow-hidden rounded-2xl border border-line bg-surface-2">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/20 via-surface-2 to-surface-1 text-ink-faint">
            <Image01Icon size={28} />
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[12px] font-medium text-white">
            {coverUrl ? "Uploading…" : "Removing…"}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-black/40 p-2.5 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="rounded-lg bg-white/90 px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-white disabled:opacity-50"
          >
            {coverUrl ? "Change photo" : "Upload photo"}
          </button>
          {coverUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              aria-label="Remove cover photo"
              className="rounded-lg bg-white/20 p-1.5 text-white hover:bg-danger disabled:opacity-50"
            >
              <Delete02Icon size={15} />
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-1.5 text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

const EVENT_TYPES = [
  "Wedding",
  "Yoruba Traditional Wedding",
  "Hindu Wedding",
  "Christian Wedding",
  "Muslim Wedding",
  "Civil Ceremony",
  "Engagement",
  "Other event",
];

export function EventForm({ event, bare = false }: { event?: EventRow; bare?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(event?.title ?? "");
  const [eventType, setEventType] = useState(event?.event_type ?? "Wedding");
  const [date, setDate] = useState(event?.date ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [coupleNames, setCoupleNames] = useState(event?.couple_names ?? "");
  const [guestCount, setGuestCount] = useState(
    event?.guest_count ? String(event.guest_count) : ""
  );
  const [coverage, setCoverage] = useState<string[]>(
    event?.coverage_needed ?? ["photo"]
  );

  function toggleCoverage(kind: string) {
    setCoverage((prev) =>
      prev.includes(kind) ? prev.filter((c) => c !== kind) : [...prev, kind]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setError("Please select an event date.");
      return;
    }
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const payload = {
      title,
      event_type: eventType,
      date,
      location: location || null,
      couple_names: coupleNames || null,
      guest_count: guestCount ? Number(guestCount) : null,
      coverage_needed: coverage.length ? coverage : ["photo"],
    };

    if (event) {
      const { error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", event.id);
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      router.push(`/events/${event.id}`);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Lost connection to your account. Please try again.");
        setBusy(false);
        return;
      }
      const { data, error } = await supabase
        .from("events")
        .insert({ ...payload, owner_id: user.id })
        .select("id")
        .single();
      if (error || !data) {
        setError(error?.message ?? "Could not create the event.");
        setBusy(false);
        return;
      }
      // Straight into the AI builder — describing the day is the natural
      // next step right after creating the event, not a separate errand.
      router.push(`/events/${data.id}/generate`);
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className={bare ? "space-y-4" : "space-y-4 rounded-xl bg-surface-1 p-5"}>
      {event && <EventCoverUpload event={event} />}

      <Field label="Event title">
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tolu & Deji — Lagos"
        />
      </Field>

      <Field label="Type">
        <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>

      {/* Its own full-width row — the calendar popover needs real width to
          render without clipping inside a narrower 2-column grid slot. */}
      <Field label="Date">
        <DatePicker value={date} onChange={setDate} />
      </Field>

      <Field label="Location">
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="The Monarch Event Centre"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Couple">
          <Input
            value={coupleNames}
            onChange={(e) => setCoupleNames(e.target.value)}
            placeholder="Tolu & Deji"
          />
        </Field>
        <Field label="Guests (approx.)">
          <Input
            type="number"
            min={0}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="200"
          />
        </Field>
      </div>

      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">
          Coverage
        </span>
        <div className="flex gap-2">
          {["photo", "video"].map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => toggleCoverage(kind)}
              className={`h-9 rounded-xl px-4 text-[14px] font-medium capitalize transition-colors ${
                coverage.includes(kind)
                  ? "bg-accent-tint text-accent-ink"
                  : "bg-surface-2 text-ink-faint hover:text-ink-soft"
              }`}
            >
              {kind}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-danger-tint px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Saving…" : event ? "Save changes" : "Create event"}
      </Button>
    </form>
  );
}
