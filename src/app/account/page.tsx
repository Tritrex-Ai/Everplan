import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/AccountForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Profile } from "@/lib/types";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-dvh bg-surface-0">
      <main className="mx-auto w-full max-w-xl px-5 pb-20 pt-8 sm:px-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink -ml-2.5"
            >
              ← Back to events
            </Link>
            <ThemeToggle />
          </div>
          <h1 className="mt-4 font-sans text-[28px] font-bold tracking-tight text-ink">
            Account Settings
          </h1>
          <p className="mt-1 text-[14.5px] text-ink-soft">
            Manage your personal profile, picture, and event workspace preferences.
          </p>
        </header>

        <AccountForm profile={profile as Profile} />
      </main>
    </div>
  );
}
