"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input, Select } from "@/components/ui";
import type { EventRow } from "@/lib/types";

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

export function EventForm({ event }: { event?: EventRow }) {
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
      const { data, error } = await supabase
        .from("events")
        .insert({ ...payload, owner_id: user!.id })
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
    <form onSubmit={submit} className="space-y-4 rounded-xl bg-surface-1 p-5">
      <Field label="Event title">
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tolu & Deji — Lagos"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>

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
        <span className="mb-1.5 block text-[13px] font-medium uppercase tracking-wide text-ink-faint">
          Coverage
        </span>
        <div className="flex gap-2">
          {["photo", "video"].map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => toggleCoverage(kind)}
              className={`h-9 rounded-md px-4 text-[14px] font-medium capitalize transition-colors ${
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
        <p className="rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Saving…" : event ? "Save changes" : "Create event"}
      </Button>
    </form>
  );
}
