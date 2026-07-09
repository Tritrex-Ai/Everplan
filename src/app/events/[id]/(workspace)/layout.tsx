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
  const { supabase, event, user, isOwner } = await getEventContext(id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <EventWorkspaceChrome
      event={event}
      isOwner={isOwner}
      fullName={profile?.full_name ?? null}
      email={user.email ?? ""}
    >
      {children}
    </EventWorkspaceChrome>
  );
}
