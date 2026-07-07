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
    <div className="mx-auto w-full max-w-lg">
      <h2 className="mb-5 font-serif text-[22px] italic leading-tight">Edit event</h2>
      <EventForm event={event} />
    </div>
  );
}
