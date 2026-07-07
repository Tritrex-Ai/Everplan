import { getEventContext } from "@/lib/data";
import { TimelineEditor } from "@/components/TimelineEditor";
import type { BlockRow } from "@/lib/types";

export default async function EventTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, event, isOwner } = await getEventContext(id);

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
        isOwner={isOwner}
      />
    </div>
  );
}
