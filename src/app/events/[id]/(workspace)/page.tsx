import { getEventContext } from "@/lib/data";
import { TimelineEditor } from "@/components/TimelineEditor";
import type { BlockRow } from "@/lib/types";

export default async function EventTimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ previewAs?: string }>;
}) {
  const { id } = await params;
  const { previewAs } = await searchParams;
  const { supabase, event, isOwner } = await getEventContext(id);

  // Owner-only "preview as" simulation — see EventWorkspaceChrome.
  const effectiveIsOwner =
    isOwner && (previewAs === "team" || previewAs === "readonly") ? false : isOwner;

  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("event_id", id)
    .order("position");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <TimelineEditor
        event={event}
        initialBlocks={(blocks ?? []) as BlockRow[]}
        isOwner={effectiveIsOwner}
      />
    </div>
  );
}
