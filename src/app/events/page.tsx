import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, EmptyState } from "@/components/ui";
import { FormattedDate } from "@/components/FormattedTime";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { AccountMenu } from "@/components/AccountMenu";
import { Wordmark } from "@/components/Wordmark";
import { Location01Icon, Calendar01Icon } from "hugeicons-react";
import type { EventRow } from "@/lib/types";

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: events }, { data: profile }] = await Promise.all([
    supabase.from("events").select("*").order("date", { ascending: true }),
    user
      ? supabase
          .from("profiles")
          .select("full_name, onboarding_completed")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (profile && !profile.onboarding_completed) redirect("/onboarding");

  const list = (events ?? []) as EventRow[];
  const fullName = profile?.full_name ?? null;
  const email = user?.email ?? "";

  // Using surface-2 as a neutral image placeholder that fits the color system
  const bgPlaceholder = "bg-surface-2";

  return (
    <div className="flex min-h-dvh bg-surface-0/50">
      <DashboardSidebar fullName={fullName} email={email} />

      <main className="flex-1 px-5 py-6 sm:px-8 sm:py-10 overflow-y-auto">
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <Wordmark />
          <AccountMenu fullName={fullName} email={email} compact />
        </div>

        <header className="mb-10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-sans text-[28px] font-bold tracking-tight text-ink">Events</h1>
            <p className="mt-1 text-[15px] text-ink-soft">Manage all your upcoming and past events.</p>
          </div>
          <Link
            href="/events/new"
            className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-accent px-5 text-[14.5px] font-semibold text-white transition-transform hover:scale-[1.02] hover:bg-accent-strong"
          >
            + Add Event
          </Link>
        </header>

        {list.length === 0 ? (
          <EmptyState
            title="No events yet"
            body="Create your first event to start building its timeline and shot list."
            action={
              <Link
                href="/events/new"
                className="inline-flex h-11 items-center rounded-xl bg-accent px-5 text-[15px] font-medium text-white hover:bg-accent-strong"
              >
                Create your first event
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {list.map((event, index) => {
              const isOwner = event.owner_id === user?.id;
              return (
                <div key={event.id} className="group relative flex flex-col overflow-hidden rounded-2xl bg-surface-1 ring-1 ring-line/40 transition-all hover:-translate-y-1">
                  <Link href={`/events/${event.id}`} className="absolute inset-0 z-10">
                    <span className="sr-only">View event {event.title}</span>
                  </Link>
                  
                  {/* Card Header (Image Placeholder) */}
                  <div className={`h-40 w-full ${bgPlaceholder} p-4 flex flex-col justify-between`}>
                    <div className="flex justify-between items-start">
                      <span className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-ink backdrop-blur-md">
                        {event.event_type || "Event"}
                      </span>
                      {!isOwner && (
                        <span className="inline-flex rounded-full bg-surface-1/90 px-2.5 py-1 text-[12px] font-semibold text-ink backdrop-blur-md">
                          Team
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="flex flex-col p-5">
                    <h3 className="truncate font-sans text-[18px] font-bold text-ink mb-1 group-hover:text-accent transition-colors">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[14px] text-ink-soft mb-4">
                      <Location01Icon size={16} strokeWidth={2} />
                      <span className="truncate">{event.location || "No location set"}</span>
                    </div>
                    
                    <div className="mt-auto border-t border-line/50 pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
                        <Calendar01Icon size={16} strokeWidth={2} />
                        <FormattedDate date={event.date} />
                      </div>
                      
                      <div className="flex -space-x-2">
                        {/* Placeholder avatars for guests/team */}
                        <div className="h-7 w-7 rounded-full border-2 border-surface-1 bg-surface-2 flex items-center justify-center text-[10px] font-bold text-ink-soft">?</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
