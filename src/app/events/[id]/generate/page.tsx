import Link from "next/link";
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
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-6">
      <header className="mb-6">
        <Link
          href={`/events/${id}`}
          className="text-[14px] text-ink-soft hover:text-ink"
        >
          ← {event.title}
        </Link>
        <h1 className="mt-2 text-[20px] font-semibold tracking-tight">
          AI timeline builder
        </h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          Type the day in plain words — you get a structured timeline you can
          edit before saving.
        </p>
      </header>
      <GenerateClient event={event} hasBlocks={(count ?? 0) > 0} />
    </main>
  );
}
