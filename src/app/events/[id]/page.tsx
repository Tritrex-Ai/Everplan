import { getEventContext } from "@/lib/data";
import { EventHeader } from "@/components/EventHeader";
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
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-6">
      <EventHeader event={event} isOwner={isOwner} />
      <TimelineEditor
        event={event}
        initialBlocks={(blocks ?? []) as BlockRow[]}
        isOwner={isOwner}
      />
    </main>
  );
}
