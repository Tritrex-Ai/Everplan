import Link from "next/link";
import { redirect } from "next/navigation";
import { getEventContext } from "@/lib/data";
import { EventForm } from "@/components/EventForm";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event, isOwner } = await getEventContext(id);

  if (!isOwner) redirect(`/events/${id}`);

  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-16 pt-6">
      <header className="mb-6">
        <Link
          href={`/events/${id}`}
          className="text-[14px] text-ink-soft hover:text-ink"
        >
          ← {event.title}
        </Link>
        <h1 className="mt-2 text-[20px] font-semibold tracking-tight">Edit event</h1>
      </header>
      <EventForm event={event} />
    </main>
  );
}
