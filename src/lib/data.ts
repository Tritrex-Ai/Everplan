import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/types";

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

  return {
    supabase,
    user,
    event: event as EventRow,
    isOwner: event.owner_id === user.id,
  };
});
