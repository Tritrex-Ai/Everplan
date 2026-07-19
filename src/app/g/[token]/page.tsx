import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestLiveBoard } from "@/components/GuestLiveBoard";
import type { BlockRow } from "@/lib/types";

/** Public, no-login route: a guest scans a QR code or opens a shared link
 * and lands straight on a read-only Now/Next/Later view — never the shot
 * list. Row access is governed by RLS (see the
 * 20260707000000_vendor_role_and_guest_sharing.sql migration), but the
 * "members can view blocks" policy (authenticated role) has no
 * guest_visible check — it exists for the owner's own timeline editor, not
 * this page. If the visitor happens to be logged in as a member of this
 * event (e.g. the owner testing their own guest link), RLS alone would let
 * hidden blocks through via that policy. The explicit filter below makes
 * this page's own guest_visible enforcement independent of who's viewing. */
export default async function GuestLivePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: rows } = await supabase.rpc("get_guest_event", {
    p_token: token,
  });
  const event = rows?.[0];
  if (!event) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-0 px-5 text-center">
        <h1 className="font-serif text-[26px] italic leading-tight text-ink">
          Link inactive
        </h1>
        <p className="mt-2 text-[15px] text-ink-soft max-w-sm">
          This guest link is no longer active or has been revoked by the event owner.
        </p>
      </div>
    );
  }

  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("event_id", event.id)
    .eq("guest_visible", true)
    .order("position");

  return (
    <GuestLiveBoard event={event} initialBlocks={(blocks ?? []) as BlockRow[]} />
  );
}
