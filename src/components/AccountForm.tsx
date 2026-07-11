"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input } from "@/components/ui";
import { PROFESSIONS, PROFESSION_LABELS, type Profession, type Profile } from "@/lib/types";

const TEAM_SIZES: { value: "solo" | "team"; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "team", label: "Team" },
];

export function AccountForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [professions, setProfessions] = useState<Profession[]>(profile.professions ?? []);
  const [teamSize, setTeamSize] = useState<"solo" | "team" | null>(profile.team_size);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleProfession(p: Profession) {
    setProfessions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName || null, professions, team_size: teamSize })
      .eq("id", profile.id);

    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl bg-surface-1 p-5">
      <Field label="Email">
        <Input value={profile.email} disabled readOnly />
      </Field>
      <Field label="Your name">
        <Input
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            setSaved(false);
          }}
          placeholder="Ade Balogun"
          autoComplete="name"
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-[13px] font-medium uppercase tracking-wide text-ink-faint">
          Profession
        </span>
        <p className="mb-2 text-[13px] text-ink-faint">
          Shown as context when you&apos;re invited to an event. Pick as many as apply.
        </p>
        <div className="flex flex-wrap gap-2">
          {PROFESSIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggleProfession(p)}
              className={`h-9 rounded-md px-4 text-[14px] font-medium transition-colors ${
                professions.includes(p)
                  ? "bg-accent-tint text-accent-ink"
                  : "bg-surface-2 text-ink-faint hover:text-ink-soft"
              }`}
            >
              {PROFESSION_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-[13px] font-medium uppercase tracking-wide text-ink-faint">
          Working solo or with a team?
        </span>
        <div className="flex gap-2">
          {TEAM_SIZES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setTeamSize(t.value);
                setSaved(false);
              }}
              className={`h-9 rounded-md px-4 text-[14px] font-medium transition-colors ${
                teamSize === t.value
                  ? "bg-accent-tint text-accent-ink"
                  : "bg-surface-2 text-ink-faint hover:text-ink-soft"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-md bg-ok-tint px-3 py-2 text-[13px] text-ok-ink">
          Saved.
        </p>
      )}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
