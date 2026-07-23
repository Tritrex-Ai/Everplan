import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata = {
  title: "Everplan — Run the wedding day, live",
  description:
    "Everplan is a real-time event-day timeline for wedding photographers, videographers, and planners. Build the timeline, budget every shot, and run the day live from your phone.",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/events");

  return <LandingPage />;
}
