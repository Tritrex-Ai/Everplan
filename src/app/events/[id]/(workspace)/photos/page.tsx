import { getEventContext } from "@/lib/data";
import { GuestPhotosPanel } from "@/components/GuestPhotosPanel";
import type { EventImageRow } from "@/lib/types";

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, isOwner } = await getEventContext(id);

  const { data: images } = await supabase
    .from("event_images")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-2xl">
      <GuestPhotosPanel
        eventId={id}
        initialImages={(images ?? []) as EventImageRow[]}
        isOwner={isOwner}
      />
    </div>
  );
}
