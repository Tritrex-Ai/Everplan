import { getEventContext } from "@/lib/data";
import { EventWorkspaceChrome } from "@/components/EventWorkspaceChrome";

export default async function EventWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event, isOwner } = await getEventContext(id);

  return (
    <EventWorkspaceChrome event={event} isOwner={isOwner}>
      {children}
    </EventWorkspaceChrome>
  );
}
