import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveViewerRole } from "@/lib/roles";
import type { EventRow, MemberRole } from "@/lib/types";

/** Fetch an event the current user can see (RLS scoped), with their role.
 * Wrapped in React's cache() so the workspace layout and each page can both
 * call this for the same event id within one request without a duplicate
 * round-trip. */
export const getEventContext = cache(async function getEventContext(
  eventId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) notFound();

  const isOwner = event.owner_id === user.id;

  let dbRole: MemberRole | null = null;
  if (!isOwner) {
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    dbRole = member?.role ?? null;
  }

  return {
    supabase,
    user,
    event: event as EventRow,
    isOwner,
    dbRole,
    viewerRole: resolveViewerRole(isOwner, dbRole),
  };
});
