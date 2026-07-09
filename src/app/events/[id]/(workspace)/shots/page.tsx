import { getEventContext } from "@/lib/data";
import { ShotsPanel } from "@/components/ShotsPanel";
import type { ViewerRole } from "@/lib/roles";
import type { BlockRow, ShotRow } from "@/lib/types";

export default async function ShotsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ previewAs?: string }>;
}) {
  const { id } = await params;
  const { previewAs } = await searchParams;
  const { supabase, viewerRole, isOwner, user } = await getEventContext(id);

  // Owner-only "preview as" simulation — see EventWorkspaceChrome. Real
  // data fetch below is still the owner's; ShotsPanel does the filtering.
  const effectiveRole: ViewerRole =
    isOwner && (previewAs === "team" || previewAs === "readonly")
      ? previewAs
      : viewerRole;

  const [{ data: blocks }, { data: shots }] = await Promise.all([
    supabase.from("blocks").select("*").eq("event_id", id).order("position"),
    // RLS scopes this per-role already (owner sees all, creator sees own,
    // others see shared) — ShotsPanel filters again client-side so an
    // owner's "preview as" simulation renders correctly too.
    supabase.from("shots").select("*").eq("event_id", id).order("created_at"),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ShotsPanel
        eventId={id}
        blocks={(blocks ?? []) as BlockRow[]}
        initialShots={(shots ?? []) as ShotRow[]}
        viewerRole={effectiveRole}
        userId={user.id}
      />
    </div>
  );
}
