"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Field, Input, Modal, Select } from "@/components/ui";
import type { MemberRole, MemberRow } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  team: "Team",
  vendor: "Vendor",
};

const MEMBER_COLORS = ["#5B5BD6", "#12A594", "#E5484D", "#FFB224", "#8E4EC6"];

type MemberWithProfile = MemberRow & {
  profile: { full_name: string | null } | null;
};

export function InviteDialog({
  eventId,
  open,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("team");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from("members")
      .select("*, profile:profiles(full_name)")
      .eq("event_id", eventId)
      .order("created_at");
    setMembers((data ?? []) as MemberWithProfile[]);
  }, [supabase, eventId]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("members")
      .select("*, profile:profiles(full_name)")
      .eq("event_id", eventId)
      .order("created_at")
      .then(({ data }) => setMembers((data ?? []) as MemberWithProfile[]));
  }, [open, supabase, eventId]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        email: email.trim().toLowerCase(),
        role,
        color: MEMBER_COLORS[members.length % MEMBER_COLORS.length],
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Failed to invite member.");
    } else {
      setEmail("");
      await loadMembers();
    }
    setBusy(false);
  }

  async function remove(id: string) {
    await supabase.from("members").delete().eq("id", id);
    await loadMembers();
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite to this event">
      <form onSubmit={invite} className="space-y-3">
        <Field
          label="Email"
          hint="They'll see the timeline, live board, and any shots you share — never your private shot list."
        >
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="second-shooter@studio.com"
          />
        </Field>
        <Field label="Role">
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
          >
            <option value="team">Team member (second shooter)</option>
            <option value="vendor">Vendor</option>
          </Select>
        </Field>
        {error && (
          <p className="rounded-md bg-danger-tint px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Inviting…" : "Send invite"}
        </Button>
      </form>

      {members.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-ink-faint">
            Team &amp; vendors
          </p>
          <ul className="space-y-1.5">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: m.color }}
                  />
                  <span className="min-w-0 truncate text-[14px]">
                    {m.profile?.full_name || m.invited_email}
                    {m.profile?.full_name && (
                      <span className="ml-1.5 text-[12.5px] text-ink-faint">
                        {m.invited_email}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {ROLE_LABELS[m.role] && (
                    <Badge tone="accent">{ROLE_LABELS[m.role]}</Badge>
                  )}
                  <Badge tone={m.status === "active" ? "ok" : "neutral"}>
                    {m.status === "active" ? "Joined" : "Invited"}
                  </Badge>
                  <button
                    onClick={() => remove(m.id)}
                    className="text-[13px] text-ink-faint hover:text-danger"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
            Invited members join automatically when they sign up with this
            email — an invitation email has been sent.
          </p>
        </div>
      )}
    </Modal>
  );
}
