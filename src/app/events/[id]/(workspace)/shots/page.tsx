import { getEventContext } from "@/lib/data";
import { ShotsPanel } from "@/components/ShotsPanel";
import type { BlockRow, ShotRow } from "@/lib/types";

export default async function ShotsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, isOwner, user } = await getEventContext(id);

  const [{ data: blocks }, { data: shots }] = await Promise.all([
    supabase.from("blocks").select("*").eq("event_id", id).order("position"),
    // RLS keeps private shots owner-only; members receive shared shots only.
    supabase.from("shots").select("*").eq("event_id", id).order("created_at"),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ShotsPanel
        eventId={id}
        blocks={(blocks ?? []) as BlockRow[]}
        initialShots={(shots ?? []) as ShotRow[]}
        isOwner={isOwner}
        userId={user.id}
      />
    </div>
  );
}
