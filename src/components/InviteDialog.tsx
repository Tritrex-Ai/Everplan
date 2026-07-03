"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Field, Input, Modal, Select } from "@/components/ui";
import type { MemberRow } from "@/lib/types";

const MEMBER_COLORS = ["#5B5BD6", "#12A594", "#E5484D", "#FFB224", "#8E4EC6"];

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
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("team");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at");
    setMembers((data ?? []) as MemberRow[]);
  }, [supabase, eventId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    supabase
      .from("members")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at")
      .then(({ data }) => {
        if (!cancelled) setMembers((data ?? []) as MemberRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, supabase, eventId]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await supabase.from("members").insert({
      event_id: eventId,
      invited_email: email.trim().toLowerCase(),
      role,
      color: MEMBER_COLORS[members.length % MEMBER_COLORS.length],
    });

    if (error) {
      setError(
        error.code === "23505"
          ? "That email is already on this event."
          : error.message
      );
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
    <Modal open={open} onClose={onClose} title="Invite a team member">
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
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="team">Team member (second shooter)</option>
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
            Team
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
                  <span className="truncate text-[14px]">{m.invited_email}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
            email — the prototype does not send emails yet.
          </p>
        </div>
      )}
    </Modal>
  );
}
