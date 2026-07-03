"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="h-9 rounded-md px-3 text-[14px] font-medium text-ink-soft hover:bg-surface-2"
    >
      Sign out
    </button>
  );
}
