"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/Wordmark";
import {
  Camera01Icon,
  Video02Icon,
  ClipboardIcon,
  FavouriteIcon,
  UserIcon,
  UserGroupIcon,
} from "hugeicons-react";
import type { Profession } from "@/lib/types";

const ROLES: {
  value: Profession;
  label: string;
  description: string;
  icon: typeof Camera01Icon;
}[] = [
  { value: "photographer", label: "Photographer", description: "Capture the day's photos", icon: Camera01Icon },
  { value: "videographer", label: "Videographer", description: "Capture the day on video", icon: Video02Icon },
  { value: "coordinator", label: "Wedding planner", description: "Coordinate the whole event", icon: ClipboardIcon },
  { value: "bride_couple", label: "Couple", description: "Planning your own event", icon: FavouriteIcon },
];

// Everyone except a couple planning their own event gets the follow-up
// "solo or team?" question.
const ASKS_TEAM_SIZE = new Set<Profession>(["photographer", "videographer", "coordinator"]);

export function OnboardingFlow({ userId }: { userId: string }) {
  const supabase = createClient();
  const [step, setStep] = useState<"role" | "team">("role");
  const [role, setRole] = useState<Profession | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Hard-navigate once the profile update settles, mirroring the
  // login page's post-auth navigation (a fresh request so /events re-reads
  // the just-written profile instead of relying on client-router cache).
  useEffect(() => {
    if (done) window.location.href = "/events";
  }, [done]);

  async function finish(profession: Profession, teamSize: "solo" | "team" | null) {
    setBusy(true);
    await supabase
      .from("profiles")
      .update({
        professions: [profession],
        team_size: teamSize,
        onboarding_completed: true,
      })
      .eq("id", userId);
    setDone(true);
  }

  function chooseRole(value: Profession) {
    setRole(value);
    if (ASKS_TEAM_SIZE.has(value)) {
      setStep("team");
    } else {
      finish(value, null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <Wordmark className="mb-8" />

      {step === "role" ? (
        <>
          <h1 className="font-serif text-[30px] italic leading-tight">Who are you?</h1>
          <p className="mt-2 text-[15px] text-ink-soft">Select your role to get started.</p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {ROLES.map((r) => (
              <button
                key={r.value}
                onClick={() => chooseRole(r.value)}
                disabled={busy}
                className="flex flex-col items-start gap-2 rounded-xl bg-surface-1 p-5 text-left transition-colors hover:bg-surface-2 disabled:opacity-50"
              >
                <r.icon size={22} className="text-accent-ink" />
                <span className="text-[15px] font-semibold text-ink">{r.label}</span>
                <span className="text-[13px] text-ink-soft">{r.description}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="font-serif text-[30px] italic leading-tight">Do you have a team?</h1>
          <p className="mt-2 text-[15px] text-ink-soft">Are you working solo or with a team?</p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              onClick={() => finish(role!, "solo")}
              disabled={busy}
              className="flex flex-col items-start gap-2 rounded-xl bg-surface-1 p-5 text-left transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              <UserIcon size={22} className="text-accent-ink" />
              <span className="text-[15px] font-semibold text-ink">Solo</span>
              <span className="text-[13px] text-ink-soft">Working independently</span>
            </button>
            <button
              onClick={() => finish(role!, "team")}
              disabled={busy}
              className="flex flex-col items-start gap-2 rounded-xl bg-surface-1 p-5 text-left transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              <UserGroupIcon size={22} className="text-accent-ink" />
              <span className="text-[15px] font-semibold text-ink">Team</span>
              <span className="text-[13px] text-ink-soft">Working with others</span>
            </button>
          </div>

          <button
            onClick={() => setStep("role")}
            disabled={busy}
            className="mt-5 self-start text-[14px] font-medium text-ink-soft hover:text-ink disabled:opacity-50"
          >
            ← Back
          </button>
        </>
      )}
    </main>
  );
}
