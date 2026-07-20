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
                <div key={event.id} className="group relative flex flex-col overflow-hidden rounded-[20px] bg-surface-1 border border-black/[0.04] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
                  <Link href={`/events/${event.id}`} className="absolute inset-0 z-10">
                    <span className="sr-only">View event {event.title}</span>
                  </Link>
                  
                  {/* Card Header (Image Placeholder) */}
                  <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-accent/20 via-[#FDFBF7] to-[#FFE5D9] flex flex-col justify-end p-4">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]"></div>
                    
                    <div className="relative z-10 flex justify-start items-center gap-2">
                      <span className="inline-flex rounded-full bg-white/40 px-3 py-1.5 text-[12px] font-semibold text-ink backdrop-blur-md border border-white/40 shadow-sm">
                        {event.event_type || "Event"}
                      </span>
                      {!isOwner && (
                        <span className="inline-flex rounded-full bg-white/40 px-3 py-1.5 text-[12px] font-semibold text-ink backdrop-blur-md border border-white/40 shadow-sm">
                          Team
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="flex flex-col p-5">
                    <h3 className="truncate font-sans text-[19px] font-extrabold text-ink mb-0.5 group-hover:text-accent transition-colors">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[14px] text-ink-soft mb-5">
                      <Location01Icon size={15} strokeWidth={2.5} />
                      <span className="truncate">{event.location || "No location set"}</span>
                    </div>
                    
                    <div className="mt-auto border-t border-line/30 pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
                        <Calendar01Icon size={15} strokeWidth={2} />
                        <FormattedDate date={event.date} />
                      </div>
                      
                      <div className="flex -space-x-2">
                        {/* Placeholder avatars for guests/team */}
                        <img 
                          src={`https://api.dicebear.com/9.x/notionists/png?seed=${encodeURIComponent(event.title)}`}
                          alt="Team avatar"
                          className="h-7 w-7 rounded-full border border-surface-1 bg-surface-2 object-cover"
                        />
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
