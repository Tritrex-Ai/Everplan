import { getEventContext } from "@/lib/data";
import { LiveBoard } from "@/components/LiveBoard";
import type { ViewerRole } from "@/lib/roles";
import type { BlockRow, ShotRow } from "@/lib/types";

export default async function LiveBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ previewAs?: string }>;
}) {
  const { id } = await params;
  const { previewAs } = await searchParams;
  const { supabase, event, user, viewerRole, isOwner } = await getEventContext(id);

  const effectiveRole: ViewerRole =
    isOwner && (previewAs === "team" || previewAs === "readonly")
      ? previewAs
      : viewerRole;
  const isPreview = effectiveRole !== viewerRole;

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
      viewerRole={effectiveRole}
      isPreview={isPreview}
    />
  );
}
