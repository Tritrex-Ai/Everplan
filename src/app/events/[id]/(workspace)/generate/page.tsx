import { redirect } from "next/navigation";
import { getEventContext } from "@/lib/data";
import { GenerateClient } from "@/components/GenerateClient";

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, event, isOwner } = await getEventContext(id);

  if (!isOwner) redirect(`/events/${id}`);

  const { count } = await supabase
    .from("blocks")
    .select("id", { count: "exact", head: true })
    .eq("event_id", id);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h2 className="mb-1 font-serif text-[22px] italic leading-tight">
        AI timeline builder
      </h2>
      <p className="mb-5 text-[14px] text-ink-soft">
        Type the day in plain words — you get a structured timeline you can
        edit before saving.
      </p>
      <GenerateClient event={event} hasBlocks={(count ?? 0) > 0} />
    </div>
  );
}
