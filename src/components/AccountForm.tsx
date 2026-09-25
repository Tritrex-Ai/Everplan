"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input } from "@/components/ui";
import { PROFESSIONS, PROFESSION_LABELS, type Profession, type Profile } from "@/lib/types";
import { Camera01Icon, Delete02Icon, Tick01Icon } from "hugeicons-react";

const TEAM_SIZES: { value: "solo" | "team"; label: string; desc: string }[] = [
  { value: "solo", label: "Solo practitioner", desc: "Just me coordinating or shooting" },
  { value: "team", label: "Studio / Team", desc: "Multiple crew members or partners" },
];

export function AccountForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [professions, setProfessions] = useState<Profession[]>(profile.professions ?? []);
  const [teamSize, setTeamSize] = useState<"solo" | "team" | null>(profile.team_size);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const initial = (fullName?.trim()?.[0] || profile.email[0] || "?").toUpperCase();

  // Load avatar from current user metadata
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const url = data.user?.user_metadata?.avatar_url;
      if (url) setAvatarUrl(url);
    });
  }, []);

  function toggleProfession(p: Profession) {
    setProfessions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
    setSaved(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image must be smaller than 5MB.");
      return;
    }

    setPhotoError(null);
    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/account/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload photo");
      }

      setAvatarUrl(data.avatarUrl);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setPhotoError(msg);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRemovePhoto() {
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const res = await fetch("/api/account/avatar", {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove photo");
      }
      setAvatarUrl(null);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove photo";
      setPhotoError(msg);
    } finally {
      setUploadingPhoto(false);
    }
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
    <div className="space-y-6">
      {/* Profile Photo Section */}
      <div className="rounded-2xl border border-line bg-surface-1 p-6 shadow-sm">
        <h2 className="text-[16px] font-semibold text-ink">Profile photo</h2>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          This will be displayed on your events, shared timelines, and account menu.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName || profile.email}
                className="h-20 w-20 rounded-full border-2 border-surface-0 bg-surface-2 object-cover shadow-md"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-surface-0 bg-gradient-to-tr from-accent to-purple-600 text-[26px] font-bold text-white shadow-md">
                {initial}
              </div>
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white text-[12px] font-medium backdrop-blur-xs">
                Uploading…
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent px-4 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-accent-strong active:scale-95 disabled:opacity-50"
              >
                <Camera01Icon size={16} />
                {avatarUrl ? "Change photo" : "Upload photo"}
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-danger/30 hover:bg-danger-tint hover:text-danger active:scale-95 disabled:opacity-50"
                >
                  <Delete02Icon size={15} />
                  Remove
                </button>
              )}
            </div>
            <p className="text-[12px] text-ink-faint">
              JPEG, PNG, WebP or GIF up to 5MB. Recommended square 400×400px.
            </p>
            {photoError && (
              <p className="rounded-lg bg-danger-tint px-3 py-1.5 text-[12.5px] text-danger">
                {photoError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details Form */}
      <form onSubmit={submit} className="space-y-6 rounded-2xl border border-line bg-surface-1 p-6 shadow-sm">
        <div className="space-y-4">
          <Field label="Email address" hint="Your login email cannot be changed here.">
            <Input value={profile.email} disabled readOnly className="opacity-75 cursor-not-allowed bg-surface-2/40" />
          </Field>

          <Field label="Full name" hint="Your display name visible to clients and collaborators.">
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
        </div>

        {/* Profession Section */}
        <div className="pt-2 border-t border-line/60">
          <label className="block">
            <span className="block text-[13.5px] font-medium text-ink">
              Your roles & professions
            </span>
            <span className="mt-0.5 block text-[13px] text-ink-soft">
              Shown as context when you&apos;re invited to an event or sharing a timeline. Select all that apply.
            </span>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {PROFESSIONS.map((p) => {
              const active = professions.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleProfession(p)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[13.5px] font-medium transition-all active:scale-95 ${
                    active
                      ? "bg-accent text-white shadow-sm ring-1 ring-accent"
                      : "border border-line bg-surface-2/80 text-ink-soft hover:bg-surface-3 hover:text-ink"
                  }`}
                >
                  {active && <Tick01Icon size={14} className="text-white" />}
                  {PROFESSION_LABELS[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Team Size Section */}
        <div className="pt-2 border-t border-line/60">
          <label className="block">
            <span className="block text-[13.5px] font-medium text-ink">
              Team setup
            </span>
            <span className="mt-0.5 block text-[13px] text-ink-soft">
              Helps Everplan optimize member invites and timeline defaults.
            </span>
          </label>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEAM_SIZES.map((t) => {
              const active = teamSize === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setTeamSize(t.value);
                    setSaved(false);
                  }}
                  className={`flex flex-col items-start rounded-xl p-3.5 text-left border transition-all active:scale-[0.99] ${
                    active
                      ? "border-accent bg-accent-tint/40 shadow-xs ring-1 ring-accent"
                      : "border-line bg-surface-2/50 text-ink-soft hover:bg-surface-2 hover:border-line/80"
                  }`}
                >
                  <span className={`text-[14px] font-semibold ${active ? "text-accent-ink" : "text-ink"}`}>
                    {t.label}
                  </span>
                  <span className="mt-0.5 text-[12.5px] text-ink-soft">
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-danger/20 bg-danger-tint px-4 py-2.5 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
        {saved && !error && (
          <div className="flex items-center gap-2 rounded-xl border border-ok/20 bg-ok-tint px-4 py-2.5 text-[13.5px] font-medium text-ok-ink">
            <Tick01Icon size={16} className="text-ok" />
            Changes saved successfully.
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" disabled={busy} className="w-full h-11 text-[14.5px] font-semibold">
            {busy ? "Saving changes…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
