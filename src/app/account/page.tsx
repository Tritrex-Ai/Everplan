import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/AccountForm";
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
    <main className="mx-auto w-full max-w-lg px-5 pb-16 pt-6">
      <header className="mb-6">
        <Link href="/events" className="text-[14px] text-ink-soft hover:text-ink">
          ← My events
        </Link>
        <h1 className="mt-2 font-serif text-[26px] italic leading-none">Account</h1>
      </header>
      <AccountForm profile={profile as Profile} />
    </main>
  );
}
