import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestLiveBoard } from "@/components/GuestLiveBoard";
import type { BlockRow } from "@/lib/types";

/** Public, no-login route: a guest scans a QR code or opens a shared link
 * and lands straight on a read-only Now/Next/Later view — never the shot
 * list. Access is entirely governed by RLS (see the
 * 20260707000000_vendor_role_and_guest_sharing.sql migration), not by
 * anything in this page. */
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
  if (!event) notFound();

  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("event_id", event.id)
    .order("position");

  return (
    <GuestLiveBoard event={event} initialBlocks={(blocks ?? []) as BlockRow[]} />
  );
}
