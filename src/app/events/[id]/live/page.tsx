import { getEventContext } from "@/lib/data";
import { LiveBoard } from "@/components/LiveBoard";
import type { BlockRow, ShotRow } from "@/lib/types";

export default async function LiveBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, event, user } = await getEventContext(id);

  const [{ data: blocks }, { data: shots }] = await Promise.all([
    supabase.from("blocks").select("*").eq("event_id", id),
    supabase.from("shots").select("*").eq("event_id", id).order("created_at"),
  ]);

  return (
    <LiveBoard
      event={event}
      initialBlocks={(blocks ?? []) as BlockRow[]}
      initialShots={(shots ?? []) as ShotRow[]}
      userId={user.id}
    />
  );
}
